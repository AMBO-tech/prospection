-- ============================================================================
-- Prospection terrain - schéma Supabase
-- À coller UNE fois dans Supabase > SQL Editor > Run.
-- Ré-exécutable sans danger (create if not exists / create or replace).
--
-- Sécurité : les tables sont fermées (RLS activé, aucune policy, aucun droit
-- pour anon). Toute lecture/écriture passe par les fonctions ci-dessous, qui
-- exigent le code d'accès partagé. Aucune fonction ne supprime réellement une
-- fiche : "archive_prospect" ne fait qu'un masquage (deleted_at).
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- code d'accès
create table if not exists public.app_secret (
  id        int primary key default 1 check (id = 1),
  code_hash text not null
);
alter table public.app_secret enable row level security;
revoke all on public.app_secret from anon, authenticated;

-- ---------------------------------------------------------------- prospects
create table if not exists public.prospects (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null unique,               -- généré par l'app : évite les doublons si renvoi
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  segment      text not null check (segment in ('textile', 'cosmetique')),
  shop_name    text not null,
  contact_name text,
  phone        text,
  location     text,
  interviewer  text,
  status       text not null default 'nouveau'
               check (status in ('nouveau', 'contacte', 'demo', 'gagne', 'perdu')),
  answers      jsonb not null default '{}'::jsonb, -- toutes les réponses du questionnaire
  deleted_at   timestamptz                          -- archivage (jamais de DELETE)
);
alter table public.prospects enable row level security;
revoke all on public.prospects from anon, authenticated;

create index if not exists prospects_created_idx on public.prospects (created_at desc);
create index if not exists prospects_segment_idx on public.prospects (segment);

-- Filet de sécurité : interdit tout DELETE, même depuis l'éditeur SQL.
-- (Pour nettoyer des fiches de test : drop trigger prospects_no_delete on public.prospects;)
create or replace function public.prospects_block_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'Suppression interdite : utilisez l''archivage (deleted_at).';
end $$;

revoke all on function public.prospects_block_delete() from public;

drop trigger if exists prospects_no_delete on public.prospects;
create trigger prospects_no_delete before delete on public.prospects
  for each row execute function public.prospects_block_delete();

-- ---------------------------------------------------------------- garde du code
create or replace function public._assert_code(p_code text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_code is null or not exists (
    select 1 from public.app_secret s where s.code_hash = crypt(p_code, s.code_hash)
  ) then
    perform pg_sleep(0.5);                          -- ralentit les essais en série
    raise exception 'invalid_code' using errcode = '28000';
  end if;
end $$;
revoke all on function public._assert_code(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- API (RPC)
create or replace function public.check_code(p_code text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public._assert_code(p_code);
  return true;
end $$;

create or replace function public.submit_prospect(
  p_code text, p_client_id uuid, p_answers jsonb
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id       uuid;
  v_segment  text;
  v_shop     text;
  v_captured timestamptz;
begin
  perform public._assert_code(p_code);

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'invalid_payload';
  end if;
  if length(p_answers::text) > 50000 then
    raise exception 'payload_too_large';
  end if;

  v_segment := p_answers ->> 'segment';
  v_shop    := btrim(coalesce(p_answers ->> 'shop_name', ''));
  if v_segment is null or v_segment not in ('textile', 'cosmetique') then
    raise exception 'invalid_segment';
  end if;
  if v_shop = '' then
    raise exception 'shop_name_required';
  end if;

  -- Heure de saisie sur le terrain (fiche envoyée plus tard, hors ligne) :
  -- acceptée si valide, pas dans le futur et pas plus vieille de 7 jours.
  begin
    v_captured := (p_answers ->> 'captured_at')::timestamptz;
  exception when others then
    v_captured := null;
  end;
  if v_captured is null or v_captured > now() or v_captured < now() - interval '7 days' then
    v_captured := now();
  end if;

  insert into public.prospects
    (client_id, created_at, segment, shop_name, contact_name, phone, location, interviewer, answers)
  values (
    p_client_id, v_captured, v_segment, v_shop,
    nullif(btrim(p_answers ->> 'contact_name'), ''),
    nullif(btrim(p_answers ->> 'phone'), ''),
    nullif(btrim(p_answers ->> 'location'), ''),
    nullif(btrim(p_answers ->> 'interviewer'), ''),
    p_answers
  )
  on conflict (client_id) do nothing
  returning id into v_id;

  if v_id is null then                               -- renvoi d'une fiche déjà reçue
    select id into v_id from public.prospects where client_id = p_client_id;
  end if;
  return v_id;
end $$;

create or replace function public.list_prospects(p_code text) returns setof public.prospects
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public._assert_code(p_code);
  return query
    select * from public.prospects
    where deleted_at is null
    order by created_at desc
    limit 5000;
end $$;

-- Suivi après la visite : statut + champs de relance uniquement (liste blanche).
create or replace function public.update_prospect(
  p_code text, p_id uuid, p_status text default null, p_answers jsonb default null
) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_patch jsonb := '{}'::jsonb;
begin
  perform public._assert_code(p_code);

  if p_status is not null and p_status not in ('nouveau', 'contacte', 'demo', 'gagne', 'perdu') then
    raise exception 'invalid_status';
  end if;

  if p_answers is not null and jsonb_typeof(p_answers) = 'object' then
    select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_patch
    from jsonb_each(p_answers) as e
    where e.key in ('temperature', 'next_step', 'followup_date', 'followup_notes', 'notes');
  end if;

  update public.prospects
     set status     = coalesce(p_status, status),
         answers    = answers || v_patch,
         updated_at = now()
   where id = p_id and deleted_at is null;
end $$;

create or replace function public.archive_prospect(p_code text, p_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public._assert_code(p_code);
  update public.prospects set deleted_at = now(), updated_at = now() where id = p_id;
end $$;

grant execute on function public.check_code(text)                          to anon;
grant execute on function public.submit_prospect(text, uuid, jsonb)        to anon;
grant execute on function public.list_prospects(text)                      to anon;
grant execute on function public.update_prospect(text, uuid, text, jsonb)  to anon;
grant execute on function public.archive_prospect(text, uuid)              to anon;

-- ============================================================================
-- ÉTAPE 2 - Définir le code d'accès (à exécuter séparément, UNE fois).
-- Remplacez VOTRE-CODE (8 caractères minimum recommandé), puis Run.
-- Le code est stocké haché : personne ne peut le relire, seulement le remplacer.
--
-- insert into public.app_secret (id, code_hash)
-- values (1, extensions.crypt('VOTRE-CODE', extensions.gen_salt('bf')))
-- on conflict (id) do update set code_hash = excluded.code_hash;
-- ============================================================================
