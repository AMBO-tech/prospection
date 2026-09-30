# Prospection terrain

Mini application pour enquêter auprès des boutiques de **textile** et de **cosmétiques**, garder chaque réponse
définitivement et suivre les prospects.

- **Saisie terrain** : questionnaire de 10 à 15 minutes, un module par segment, chronomètre intégré.
- **Fiches prospects** : recherche, filtres, WhatsApp / appel en un tap, suivi commercial, impression.
- **Dashboard** : budget que les commerçants jugent correct, douleurs, outils actuels, avancement, activité.
- **Base de données** : Supabase (PostgreSQL). Aucune fiche n'est jamais supprimée : « archiver » ne fait que la masquer.
- **Export CSV** (ouvrable dans Excel) depuis la liste et le dashboard.

Pile : Vite + React + TypeScript + Tailwind, Supabase, déploiement Vercel.

---

## Déployer en 15 minutes

### 1. Supabase (la base)

1. Créez un projet sur [supabase.com](https://supabase.com) et choisissez une région proche (Europe).
2. **SQL Editor** > New query > collez tout [supabase/schema.sql](supabase/schema.sql) > **Run**.
3. Nouvelle requête pour définir le code d'accès de l'équipe (choisissez 12 caractères ou plus) :

   ```sql
   insert into public.app_secret (id, code_hash)
   values (1, extensions.crypt('VOTRE-CODE-ICI', extensions.gen_salt('bf')))
   on conflict (id) do update set code_hash = excluded.code_hash;
   ```

   Le code est stocké haché. Pour le changer plus tard, relancez la même requête avec un autre code.
4. **Project Settings > API** : copiez l'**URL du projet** et la clé **anon public**.

### 2. Vercel (le site)

Avec le dépôt Git (recommandé) :

1. Poussez ce dossier sur GitHub.
2. Sur [vercel.com](https://vercel.com) : **Add New > Project**, importez le dépôt. Vercel détecte Vite tout seul.
3. **Environment Variables** :

   | Nom | Valeur |
   | --- | --- |
   | `VITE_SUPABASE_URL` | l'URL du projet Supabase |
   | `VITE_SUPABASE_ANON_KEY` | la clé anon public |

4. **Deploy**. Vous obtenez une adresse `https://…vercel.app`.

Sans Git : `npm install -g vercel`, puis `vercel` dans ce dossier, puis
`vercel env add VITE_SUPABASE_URL` et `vercel env add VITE_SUPABASE_ANON_KEY`, puis `vercel --prod`.

Les variables `VITE_*` sont lues au moment du **build** : après les avoir ajoutées ou modifiées, redéployez.

### 3. Vérifier

Ouvrez l'adresse, entrez le code, remplissez une fiche de test, puis contrôlez qu'elle apparaît dans **Fiches** et dans
le **Dashboard**. Vous pouvez aussi la voir dans Supabase > Table Editor > `prospects`.

---

## Sur le terrain

- **Installer sur le téléphone** : Chrome > menu > « Ajouter à l'écran d'accueil ».
- **Ouvrez l'application avec du réseau avant de partir** et gardez-la ouverte.
- **Sans réseau** : la fiche est enregistrée sur le téléphone (bandeau « 1 à envoyer ») et part toute seule au retour
  de la connexion. Ne vidangez pas les données du navigateur avant l'envoi.
- **Limite connue** : l'application n'a pas de service worker. Fermer complètement l'onglet puis le rouvrir
  **sans aucun réseau** ne charge pas la page. Si vous en avez besoin, on peut ajouter un mode installable hors ligne.
- Un brouillon est sauvegardé à chaque réponse : une fiche interrompue se reprend là où elle s'est arrêtée.
- Une fiche sans numéro de téléphone ne pourra pas être relancée : demandez-le.

## Conserver les données

- Les fiches restent en base tant que le projet Supabase existe.
- **Exportez le CSV chaque soir** (Fiches > CSV). C'est votre sauvegarde simple.
- Sur l'offre gratuite de Supabase, vérifiez les conditions actuelles : les projets inactifs peuvent être mis en pause
  et les sauvegardes automatiques ne sont pas garanties ([supabase.com/pricing](https://supabase.com/pricing)).
  Un projet en pause se réactive depuis le tableau de bord, sans perte de données.

## Personnaliser

| Je veux… | Fichier |
| --- | --- |
| changer une question, une option, ajouter un module | [src/lib/questionnaire.ts](src/lib/questionnaire.ts) |
| régler le score de qualification (chaud, tiède, froid) | [src/lib/scoring.ts](src/lib/scoring.ts) |
| changer les tranches de budget du dashboard | [src/lib/analytics.ts](src/lib/analytics.ts) |
| changer les couleurs | [src/index.css](src/index.css) |

Le formulaire, les fiches, le CSV et le dashboard lisent tous `questionnaire.ts` : une question ajoutée apparaît partout.
Les réponses sont stockées en JSON : ajouter une question ne demande **aucune migration** de la base.

## Développer en local

```bash
npm install
cp .env.example .env.local   # puis renseignez les deux variables
npm run dev                  # http://localhost:5173
npm test                     # tests unitaires
npm run build                # build de production
```

## Sécurité, en bref

- Les tables sont fermées (RLS activé, aucun droit pour le rôle anonyme). Toute lecture ou écriture passe par cinq
  fonctions SQL qui vérifient le code d'accès.
- La clé `anon` visible dans le navigateur ne donne donc accès à rien sans le code.
- Le code est partagé par toute l'équipe et mémorisé sur chaque téléphone : **changez-le** si un téléphone est perdu
  ou si quelqu'un quitte l'équipe (requête de l'étape 1.3), puis redonnez le nouveau code aux enquêteurs.
- Il n'y a **pas de comptes individuels** : impossible de savoir qui a modifié quoi. Le nom de l'enquêteur saisi sur
  chaque fiche sert de repère, pas de preuve.
- Les fiches contiennent des données personnelles (nom, téléphone) : le consentement est demandé à chaque fiche.
  Limitez le partage du CSV.
