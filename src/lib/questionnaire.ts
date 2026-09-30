// Source unique du questionnaire : le formulaire, les fiches, le CSV et le
// dashboard lisent tous cette configuration. Modifier une question ici suffit.

export type Segment = 'textile' | 'cosmetique'
export type AnswerValue = string | number | boolean | string[]
export type Answers = Record<string, AnswerValue>

export interface Option {
  value: string
  label: string
}

export type QuestionType =
  | 'text'
  | 'tel'
  | 'number'
  | 'date'
  | 'textarea'
  | 'single'
  | 'multi'
  | 'consent'

export interface Question {
  id: string
  label: string
  type: QuestionType
  options?: Option[]
  required?: boolean
  hint?: string
  suffix?: string
  placeholder?: string
  // Affichée seulement si la réponse à `question` figure dans `anyOf`.
  showIf?: { question: string; anyOf: string[] }
}

export interface Section {
  id: string
  title: string
  hint?: string
  segment?: Segment
  questions: Question[]
}

export const SEGMENT_LABEL: Record<Segment, string> = {
  textile: 'Textile',
  cosmetique: 'Cosmétiques',
}

const opts = (pairs: ReadonlyArray<readonly [string, string]>): Option[] =>
  pairs.map(([value, label]) => ({ value, label }))

const LOSS = opts([
  ['none', 'Rien / presque rien'],
  ['lt20', 'Moins de 20 000'],
  ['20_100', '20 000 – 100 000'],
  ['100_500', '100 000 – 500 000'],
  ['gt500', 'Plus de 500 000'],
])

const DEBT = opts([
  ['none', 'Aucune'],
  ['lt100', 'Moins de 100 000'],
  ['100_1m', '100 000 – 1 million'],
  ['1m_5m', '1 – 5 millions'],
  ['gt5m', 'Plus de 5 millions'],
])

const SPEND = opts([
  ['none', 'Rien'],
  ['lt10', 'Moins de 10 000'],
  ['10_30', '10 000 – 30 000'],
  ['gt30', 'Plus de 30 000'],
])

export const SECTIONS: Section[] = [
  {
    id: 'identification',
    title: 'Identification',
    hint: 'À remplir par l’enquêteur, sans poser de question.',
    questions: [
      { id: 'interviewer', label: 'Nom de l’enquêteur', type: 'text', required: true },
      {
        id: 'segment',
        label: 'Type de boutique',
        type: 'single',
        required: true,
        options: opts([
          ['textile', 'Textile'],
          ['cosmetique', 'Cosmétiques'],
        ]),
      },
      { id: 'shop_name', label: 'Nom de la boutique', type: 'text', required: true },
      { id: 'contact_name', label: 'Nom de la personne rencontrée', type: 'text' },
      {
        id: 'phone',
        label: 'Téléphone / WhatsApp',
        type: 'tel',
        hint: 'Indispensable pour la relance.',
        placeholder: '77 000 00 00',
      },
      { id: 'location', label: 'Marché / quartier / ville', type: 'text' },
      {
        id: 'role',
        label: 'Sa fonction',
        type: 'single',
        required: true,
        options: opts([
          ['owner', 'Propriétaire'],
          ['manager', 'Gérant'],
          ['seller', 'Vendeur (ne décide pas)'],
        ]),
      },
      {
        id: 'sale_mode',
        label: 'Vend en',
        type: 'single',
        required: true,
        options: opts([
          ['wholesale', 'Gros'],
          ['retail', 'Détail'],
          ['both', 'Gros et détail'],
        ]),
      },
    ],
  },
  {
    id: 'activite',
    title: 'Activité',
    hint: 'Taille de la boutique.',
    questions: [
      {
        id: 'employees',
        label: 'Combien de personnes travaillent dans la boutique (vous compris) ?',
        type: 'single',
        options: opts([
          ['solo', 'Seul(e)'],
          ['2_3', '2 à 3'],
          ['4_10', '4 à 10'],
          ['gt10', 'Plus de 10'],
        ]),
      },
      {
        id: 'outlets',
        label: 'Combien de boutiques et dépôts ?',
        type: 'single',
        options: opts([
          ['one', '1 boutique'],
          ['one_depot', '1 boutique + dépôt'],
          ['2_3', '2 à 3 boutiques'],
          ['gt4', '4 et plus'],
        ]),
      },
      {
        id: 'daily_sales',
        label: 'Ventes d’une journée normale (FCFA)',
        type: 'single',
        options: opts([
          ['lt50', 'Moins de 50 000'],
          ['50_150', '50 000 – 150 000'],
          ['150_500', '150 000 – 500 000'],
          ['gt500', 'Plus de 500 000'],
        ]),
      },
      {
        id: 'sku_count',
        label: 'Combien de produits différents (références) environ ?',
        type: 'single',
        options: opts([
          ['lt100', 'Moins de 100'],
          ['100_500', '100 – 500'],
          ['500_2000', '500 – 2 000'],
          ['gt2000', 'Plus de 2 000'],
        ]),
      },
    ],
  },
  {
    id: 'gestion',
    title: 'Gestion actuelle',
    hint: 'Posez des questions sur le passé : « la dernière fois que… ».',
    questions: [
      {
        id: 'tools',
        label: 'Comment suivez-vous le stock et les ventes aujourd’hui ?',
        type: 'multi',
        options: opts([
          ['notebook', 'Cahier'],
          ['excel', 'Excel / tableur'],
          ['software', 'Logiciel / application'],
          ['phone', 'Notes téléphone / WhatsApp'],
          ['memory', 'De tête, rien d’écrit'],
          ['accountant', 'Comptable / personne dédiée'],
        ]),
      },
      {
        id: 'current_software',
        label: 'Quel logiciel, et combien ça coûte ?',
        type: 'text',
        showIf: { question: 'tools', anyOf: ['software'] },
      },
      {
        id: 'stock_gap',
        label: 'Écart entre le stock noté et le stock réel ?',
        type: 'single',
        options: opts([
          ['never', 'Jamais'],
          ['sometimes', 'Parfois (1 fois par mois ou moins)'],
          ['often', 'Souvent (chaque semaine)'],
          ['nocount', 'Je ne compte jamais'],
        ]),
      },
      {
        id: 'stock_loss',
        label: 'Pertes par mois (écarts, vols, produits abîmés ou périmés), en FCFA ?',
        type: 'single',
        options: LOSS,
      },
      {
        id: 'credit',
        label: 'Vente à crédit ?',
        type: 'single',
        options: opts([
          ['none', 'Jamais'],
          ['some', 'Un peu (quelques clients)'],
          ['lot', 'Beaucoup (clients réguliers)'],
        ]),
      },
      {
        id: 'debt',
        label: 'Dettes clients en cours (FCFA) ?',
        type: 'single',
        options: DEBT,
        showIf: { question: 'credit', anyOf: ['some', 'lot'] },
      },
      {
        id: 'payments',
        label: 'Moyens de paiement reçus',
        type: 'multi',
        options: opts([
          ['cash', 'Espèces'],
          ['wave', 'Wave'],
          ['om', 'Orange Money'],
          ['transfer', 'Virement'],
          ['cheque', 'Chèque'],
        ]),
      },
      {
        id: 'margin_knowledge',
        label: 'Connaissez-vous votre bénéfice du mois ?',
        type: 'single',
        options: opts([
          ['exact', 'Oui, précisément'],
          ['approx', 'À peu près'],
          ['no', 'Non'],
        ]),
      },
      {
        id: 'time_lost',
        label: 'Ce qui vous prend le plus de temps',
        type: 'multi',
        options: opts([
          ['inventory', 'Inventaire / comptage'],
          ['invoices', 'Factures et devis'],
          ['debts', 'Relances et dettes clients'],
          ['margins', 'Calcul des prix et marges'],
          ['supplier', 'Commandes fournisseurs'],
          ['staff', 'Contrôler les vendeurs'],
        ]),
      },
      {
        id: 'main_pain',
        label: 'Votre plus gros problème dans la boutique ?',
        type: 'textarea',
        hint: 'Notez ses propres mots.',
      },
    ],
  },
  {
    id: 'textile',
    title: 'Spécifique textile',
    segment: 'textile',
    questions: [
      {
        id: 'fabric_types',
        label: 'Types de tissus vendus',
        type: 'multi',
        options: opts([
          ['wax', 'Wax'],
          ['bazin', 'Bazin / Getzner'],
          ['lace', 'Dentelle / voile'],
          ['deco', 'Ameublement / rideaux'],
          ['plain', 'Unis / doublure'],
          ['other', 'Autre'],
        ]),
      },
      {
        id: 'sold_units',
        label: 'Vendu au…',
        type: 'multi',
        options: opts([
          ['meter', 'Mètre'],
          ['piece', 'Pièce / coupon'],
          ['roll', 'Rouleau / balle'],
          ['kg', 'Kilo'],
          ['carton', 'Carton'],
        ]),
      },
      {
        id: 'sourcing',
        label: 'Où achetez-vous ?',
        type: 'multi',
        options: opts([
          ['local', 'Grossistes à Dakar'],
          ['china', 'Import Chine'],
          ['dubai', 'Import Dubaï / Turquie'],
          ['westafrica', 'Nigeria / Mali / autre Afrique'],
          ['other', 'Autre'],
        ]),
      },
      {
        id: 'leftovers',
        label: 'Restes de rouleaux (coupons, chutes) ?',
        type: 'single',
        options: opts([
          ['tracked', 'Je les suis un par un'],
          ['sold', 'Je les vends sans les suivre'],
          ['lost', 'Ils se perdent / je ne sais pas'],
          ['na', 'Pas concerné'],
        ]),
      },
      {
        id: 'tailor_clients',
        label: 'Clients tailleurs / couturiers réguliers ?',
        type: 'single',
        options: opts([
          ['many', 'Beaucoup'],
          ['few', 'Quelques-uns'],
          ['none', 'Aucun'],
        ]),
      },
      {
        id: 'multi_price',
        label: 'Prix différent selon le client (gros, détail, tailleur) ?',
        type: 'single',
        options: opts([
          ['yes', 'Oui, plusieurs prix'],
          ['no', 'Non, un seul prix'],
        ]),
      },
      {
        id: 'seller_control',
        label: 'Quand vous êtes absent, comment savez-vous ce que vos vendeurs ont vendu ?',
        type: 'single',
        showIf: { question: 'employees', anyOf: ['2_3', '4_10', 'gt10'] },
        options: opts([
          ['evening', 'Je vérifie le stock ou la caisse le soir'],
          ['trust', 'J’appelle / je fais confiance'],
          ['unknown', 'Je ne peux pas vraiment savoir'],
        ]),
      },
    ],
  },
  {
    id: 'cosmetique',
    title: 'Spécifique cosmétiques',
    segment: 'cosmetique',
    questions: [
      {
        id: 'categories',
        label: 'Catégories vendues',
        type: 'multi',
        options: opts([
          ['face', 'Soins visage'],
          ['body', 'Soins corps / karité'],
          ['hair', 'Cheveux (soins, mèches, perruques)'],
          ['makeup', 'Maquillage'],
          ['perfume', 'Parfums / déodorants'],
          ['hygiene', 'Hygiène / bébé'],
          ['other', 'Autre'],
        ]),
      },
      {
        id: 'variants',
        label: 'Gérer marques, teintes et contenances',
        type: 'single',
        options: opts([
          ['easy', 'Facile'],
          ['hard', 'Compliqué'],
          ['verybad', 'Très compliqué, je m’y perds'],
        ]),
      },
      {
        id: 'expiry_tracking',
        label: 'Suivi des dates de péremption',
        type: 'single',
        options: opts([
          ['eye', 'À l’œil, de temps en temps'],
          ['notebook', 'Noté (cahier, Excel)'],
          ['software', 'Dans un logiciel'],
          ['none', 'Je ne suis pas'],
        ]),
      },
      {
        id: 'expiry_loss',
        label: 'Produits perdus (périmés, abîmés, invendus) sur 3 mois, en FCFA ?',
        type: 'single',
        options: LOSS,
      },
      {
        id: 'barcode',
        label: 'Codes-barres sur les produits',
        type: 'single',
        options: opts([
          ['scan', 'Oui, je scanne à la caisse'],
          ['noscan', 'Oui, mais je ne scanne pas'],
          ['none', 'Pas de codes-barres'],
        ]),
      },
      {
        id: 'online_sales',
        label: 'Vente en ligne',
        type: 'multi',
        options: opts([
          ['instagram', 'Instagram'],
          ['tiktok', 'TikTok'],
          ['whatsapp', 'WhatsApp (statut, catalogue)'],
          ['facebook', 'Facebook'],
          ['website', 'Site web'],
          ['none', 'Non, boutique uniquement'],
        ]),
      },
      {
        id: 'reorder_method',
        label: 'Comment décidez-vous quoi recommander ?',
        type: 'multi',
        options: opts([
          ['feeling', 'Mon intuition'],
          ['requests', 'Demandes des clients'],
          ['social', 'Réseaux sociaux / tendances'],
          ['suppliers', 'Conseils des fournisseurs'],
          ['sales', 'Les chiffres de vente'],
        ]),
      },
    ],
  },
  {
    id: 'digital',
    title: 'Outils et budget',
    hint: 'Posez les questions de prix après avoir fait parler des problèmes.',
    questions: [
      {
        id: 'devices',
        label: 'Appareils utilisés au travail',
        type: 'multi',
        options: opts([
          ['android', 'Smartphone Android'],
          ['iphone', 'iPhone'],
          ['computer', 'Ordinateur'],
          ['tablet', 'Tablette'],
        ]),
      },
      {
        id: 'internet',
        label: 'Connexion internet en boutique',
        type: 'single',
        options: opts([
          ['good', 'Stable'],
          ['mobile', 'Data mobile seulement'],
          ['poor', 'Souvent coupée'],
        ]),
      },
      {
        id: 'tried_before',
        label: 'Déjà essayé un logiciel ou une application de gestion ?',
        type: 'single',
        options: opts([
          ['never', 'Jamais'],
          ['using', 'Oui, je l’utilise encore'],
          ['stopped', 'Oui, j’ai arrêté'],
        ]),
      },
      {
        id: 'spend_current',
        label: 'Dépense actuelle par mois pour se faire aider (comptable, logiciel, saisie), en FCFA ?',
        type: 'single',
        options: SPEND,
      },
      {
        id: 'payment_model',
        label: 'Formule de paiement préférée',
        type: 'single',
        options: opts([
          ['monthly', 'Abonnement mensuel'],
          ['quarterly', 'Trimestriel'],
          ['yearly', 'Annuel'],
          ['once', 'Achat unique'],
        ]),
      },
      {
        id: 'price_ok',
        label: 'Quel prix par mois vous semblerait correct pour un outil qui règle ces problèmes ?',
        type: 'number',
        suffix: 'FCFA / mois',
      },
      {
        id: 'price_max',
        label: 'À partir de quel prix par mois ce serait trop cher ?',
        type: 'number',
        suffix: 'FCFA / mois',
      },
      {
        id: 'one_time_price',
        label: 'Prix maximum pour un achat unique',
        type: 'number',
        suffix: 'FCFA',
        showIf: { question: 'payment_model', anyOf: ['once'] },
      },
    ],
  },
  {
    id: 'conclusion',
    title: 'Conclusion',
    hint: 'À remplir par l’enquêteur après l’échange.',
    questions: [
      {
        id: 'next_step',
        label: 'Suite donnée',
        type: 'single',
        required: true,
        options: opts([
          ['demo', 'Démo prévue'],
          ['trial', 'Essai gratuit accepté'],
          ['callback', 'À rappeler'],
          ['no', 'Pas intéressé'],
        ]),
      },
      {
        id: 'temperature',
        label: 'Température du prospect',
        type: 'single',
        required: true,
        options: opts([
          ['hot', 'Chaud'],
          ['warm', 'Tiède'],
          ['cold', 'Froid'],
        ]),
      },
      {
        id: 'followup_date',
        label: 'Date de relance',
        type: 'date',
        showIf: { question: 'next_step', anyOf: ['demo', 'trial', 'callback'] },
      },
      { id: 'notes', label: 'Notes de l’enquêteur', type: 'textarea' },
      {
        id: 'consent',
        label: 'Le commerçant accepte d’être recontacté et que ses réponses soient conservées.',
        type: 'consent',
        required: true,
      },
    ],
  },
]

export const STATUSES = [
  { value: 'nouveau', label: 'Nouveau' },
  { value: 'contacte', label: 'Contacté' },
  { value: 'demo', label: 'Démo faite' },
  { value: 'gagne', label: 'Gagné' },
  { value: 'perdu', label: 'Perdu' },
] as const

export type ProspectStatus = (typeof STATUSES)[number]['value']

export function isSegment(value: unknown): value is Segment {
  return value === 'textile' || value === 'cosmetique'
}

export function sectionsFor(segment: Segment | undefined): Section[] {
  return SECTIONS.filter((s) => !s.segment || s.segment === segment)
}

export function allQuestions(): Question[] {
  return SECTIONS.flatMap((s) => s.questions)
}

export function questionById(id: string): Question | undefined {
  return allQuestions().find((q) => q.id === id)
}

export function questionSegment(questionId: string): Segment | undefined {
  return SECTIONS.find((s) => s.questions.some((q) => q.id === questionId))?.segment
}

export function isEmpty(value: AnswerValue | undefined): boolean {
  if (value === undefined || value === false) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

export function isQuestionVisible(q: Question, answers: Answers): boolean {
  if (!q.showIf) return true
  const current = answers[q.showIf.question]
  const selected = Array.isArray(current) ? current : typeof current === 'string' ? [current] : []
  return selected.some((v) => q.showIf!.anyOf.includes(v))
}

export function visibleQuestions(section: Section, answers: Answers): Question[] {
  return section.questions.filter((q) => isQuestionVisible(q, answers))
}

export function missingRequired(section: Section, answers: Answers): Question[] {
  return visibleQuestions(section, answers).filter((q) => q.required && isEmpty(answers[q.id]))
}

// Nettoie les réponses avant envoi : retire les questions masquées ou vides et
// convertit les champs numériques. Ne conserve que les questions du segment.
export function normalizeAnswers(answers: Answers): Answers {
  const segment = isSegment(answers.segment) ? answers.segment : undefined
  const result: Answers = {}
  for (const section of sectionsFor(segment)) {
    for (const q of visibleQuestions(section, answers)) {
      const value = answers[q.id]
      if (isEmpty(value)) continue
      if (q.type === 'number') {
        const n = Number(String(value).replace(/[\s ]/g, ''))
        if (Number.isFinite(n) && n >= 0) result[q.id] = n
      } else if (typeof value === 'string') {
        result[q.id] = value.trim()
      } else {
        result[q.id] = value as AnswerValue
      }
    }
  }
  return result
}

export function optionLabel(q: Question, value: string): string {
  return q.options?.find((o) => o.value === value)?.label ?? value
}

export function formatAnswer(q: Question, value: AnswerValue | undefined): string {
  if (value === undefined || isEmpty(value)) return ''
  if (Array.isArray(value)) return value.map((v) => optionLabel(q, v)).join(', ')
  if (typeof value === 'number') return `${value.toLocaleString('fr-FR')}${q.suffix ? ` ${q.suffix}` : ''}`
  if (typeof value === 'boolean') return 'Oui'
  return q.type === 'single' ? optionLabel(q, value) : value
}
