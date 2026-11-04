import type { Category } from "@/lib/types";

/**
 * Modèles de création de page.
 *
 * ## Pourquoi des modèles plutôt qu'une page blanche
 *
 * Une encyclopédie ne se construit pas avec des pages libres : elle se construit
 * avec des **structures** qui se répètent. Une fiche de personnalité a toujours
 * les mêmes rubriques, un texte de loi toujours les mêmes avertissements. Un
 * rédacteur qui part d'une page blanche réinvente cette structure à chaque
 * fois — et finit par l'oublier.
 *
 * Chaque modèle fournit donc : une catégorie, un squelette de rubriques, une
 * infobox pré-remplie et des étiquettes. Le rédacteur remplace, il ne reconstruit
 * pas.
 *
 * ## La règle éditoriale est dans le squelette
 *
 * Le wiki écrit « non renseigné » là où il ne sait pas. Les modèles appliquent
 * cette règle dès le départ : chaque rubrique contient cette mention plutôt
 * qu'un texte vide, pour qu'une page incomplète reste **honnête** au lieu de
 * paraître lacunaire. Une page qui dit qu'elle ne sait pas vaut mieux qu'une
 * page qui laisse croire qu'elle sait.
 */

export interface PageTemplate {
  id: string;
  name: string;
  /** Affiché dans la galerie : à quoi sert ce modèle, et quand ne pas l'utiliser. */
  description: string;
  icon: string;
  category: Category;
  tags: string[];
  summary: string;
  infobox?: {
    caption?: string;
    fields: Array<{ label: string; value: string }>;
    footer?: string;
  };
  content: string;
}

const SOURCE =
  "> Source : récit de la rédaction du wiki. Les faits juridiques et les portraits " +
  "proviennent respectivement des documents officiels et de l'API Discord.";

export const PAGE_TEMPLATES: PageTemplate[] = [
  // =========================================================================
  // Personnalités
  // =========================================================================
  {
    id: "personnalite-souverain",
    name: "Personnalité — souverain",
    description:
      "Dauphin, roi ou empereur. Le modèle insiste sur le règne, les actes de souveraineté et la postérité, plutôt que sur la biographie.",
    icon: "👑",
    category: "personnalites",
    tags: ["personnalité", "souverain"],
    summary: "Souverain du Delphinat : règne, actes rapportés et postérité.",
    infobox: {
      caption: "Personnalité",
      fields: [
        { label: "Nom", value: "" },
        { label: "Titre", value: "" },
        { label: "Règne", value: "" },
        { label: "Prédécesseur", value: "Non renseigné" },
        { label: "Successeur", value: "Non renseigné" },
        { label: "Actes rapportés", value: "Non renseigné" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki.",
    },
    content: `# Nom du souverain

${SOURCE}

Présentation en deux ou trois phrases : qui est cette personne, quel titre
porte-t-elle, et par quoi son règne est-il connu dans le récit du Delphinat.

## Le règne

Dates, durée, contexte d'accession. Ce qui n'est pas documenté s'écrit
**non renseigné** — jamais une date approximative.

## Les actes de souveraineté

Les décisions qui relèvent du pouvoir : bannissements, promulgations,
nominations, traités. Un acte de souveraineté se distingue d'un acte
d'administration : il engage le Delphinat lui-même.

## Le regard de la rédaction

Ce que le récit retient du personnage — y compris ce qui n'est pas flatteur.
Une encyclopédie rapporte l'évaluation, elle ne la corrige pas.

## Postérité

Ce qui reste : un texte portant son nom, une charge transformée, un conflit
prolongé.

## Voir aussi

- [[histoire-du-delphinat]]
- [[la-constitution]]`,
  },
  {
    id: "personnalite-dirigeant",
    name: "Personnalité — dirigeant",
    description:
      "Premier Ministre, ministre, chef de parti. Met en avant la charge, le mandat et les décisions, plutôt que la personne.",
    icon: "🎖️",
    category: "personnalites",
    tags: ["personnalité", "gouvernement"],
    summary: "Dirigeant du Delphinat : charge, mandat et décisions.",
    infobox: {
      caption: "Personnalité",
      fields: [
        { label: "Nom", value: "" },
        { label: "Charge", value: "" },
        { label: "Mandat", value: "Non renseigné" },
        { label: "Parti", value: "Non renseigné" },
        { label: "Prédécesseur", value: "Non renseigné" },
        { label: "Faits marquants", value: "Non renseigné" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki.",
    },
    content: `# Nom du dirigeant

${SOURCE}

Qui est cette personne, quelle charge occupe-t-elle, et dans quel contexte
politique.

## La charge

Ce que la Constitution dit de cette charge (article P-1), et ce que le
titulaire en a fait. Distinguez la fonction de son exercice.

## Le mandat

Durée, élection ou nomination, programme annoncé, programme réalisé. Le récit
ne documente souvent que le premier : écrivez **non renseigné** pour le reste.

## Les décisions

Les actes rattachés à la personne, avec leur portée. Un décret, une motion, un
vote : dites ce que cela a changé, pas seulement que cela a eu lieu.

## Vie politique

Parti, alliances, ruptures. Une affiliation se documente, elle ne se suppose
pas.

## Voir aussi

- [[le-premier-ministre]]
- [[la-hierarchie-delphinale]]`,
  },
  {
    id: "personnalite-membre",
    name: "Personnalité — membre",
    description:
      "Membre du serveur sans charge constitutionnelle. Sert aux figures citées par le récit sans fonction officielle documentée.",
    icon: "🧑",
    category: "personnalites",
    tags: ["personnalité"],
    summary: "Membre du Delphinat cité par le récit.",
    infobox: {
      caption: "Personnalité",
      fields: [
        { label: "Nom", value: "" },
        { label: "Rôle documenté", value: "" },
        { label: "Ancienneté", value: "Non renseignée" },
        { label: "Fonction", value: "Non renseignée" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki. " +
        "La rédaction ne documente, à ce jour, que le rôle ci-dessus.",
    },
    content: `# Nom du membre

${SOURCE}

Rôle documenté par le récit, en une phrase. Si le récit ne dit qu'une chose,
cette page ne doit dire qu'une chose.

## Ce que le récit rapporte

Le ou les faits attribués à cette personne, avec leur contexte.

## Ce qui n'est pas documenté

Le récit ne précise ni la fonction, ni l'ancienneté, ni le parcours. Ces
éléments sont **non renseignés**.

Une page courte et exacte vaut mieux qu'une page longue et supposée.

## Voir aussi

- [[les-trois-delphinats]]`,
  },

  // =========================================================================
  // Institutions et lois
  // =========================================================================
  {
    id: "institution",
    name: "Institution ou charge",
    description:
      "Une des huit charges de l'article P-1, ou une institution dérivée. Le modèle impose de citer l'article qui la fonde.",
    icon: "🏛️",
    category: "institutions",
    tags: ["institution", "charge"],
    summary: "Institution du Delphinat : fondement constitutionnel, pouvoirs et limites.",
    infobox: {
      caption: "Institution",
      fields: [
        { label: "Institution", value: "" },
        { label: "Fondement", value: "Article P-1 de la Constitution" },
        { label: "Titulaire", value: "Non renseigné" },
        { label: "Pouvoirs", value: "" },
        { label: "Limites", value: "" },
      ],
      footer: "Source : Constitution.pdf, article P-1.",
    },
    content: `# Nom de l'institution

> Source officielle : [Constitution.pdf](/Constitution.pdf) — transcription intégrale.

## Fondement

L'article de la Constitution qui institue cette charge, cité entre guillemets
et **sans reformulation**. Le texte opposable prime sur le commentaire.

## Pouvoirs

Ce que l'institution peut faire, tel que le texte l'écrit.

## Limites et contre-pouvoirs

Ce qu'elle ne peut pas faire, et qui la contrôle. Une charge sans limite
documentée est un fait à signaler, pas à combler.

## Exercice

Qui l'a portée, quand, et ce qui en est résulté. **Non renseigné** si le récit
ne le dit pas.

## Voir aussi

- [[la-hierarchie-delphinale]]
- [[les-lois-du-delphinat]]`,
  },
  {
    id: "texte-fondateur",
    name: "Texte fondateur",
    description:
      "Constitution ou règlement. Page de transcription : aucune reformulation, orthographe d'origine conservée.",
    icon: "📜",
    category: "lois",
    tags: ["loi", "texte fondateur"],
    summary: "Texte fondateur du Delphinat, transcrit intégralement.",
    infobox: {
      caption: "Texte fondateur",
      fields: [
        { label: "Nature", value: "" },
        { label: "Règne", value: "" },
        { label: "Créé par", value: "" },
        { label: "Version en vigueur", value: "" },
        { label: "Articles", value: "" },
        { label: "Source", value: "Document officiel, transcription intégrale" },
      ],
      footer:
        "Document officiel consultable dans public/. Transcription intégrale, " +
        "orthographe d'origine conservée.",
    },
    content: `# Titre officiel du texte

> Source officielle : [Nom du document](/fichier.pdf) — créé par …, version finale éditée le …

Présentation en une phrase : quel régime ce texte institue, et à quelle date.

## Article P-1

> « Texte exact de l'article, entre guillemets. »

### Première charge

> « Texte exact. »

### Seconde charge

> « Texte exact. »

## Les articles

### Article P-2

> « Texte exact. »

## Ce que ce texte change

Deux ou trois phrases de commentaire, **clairement séparées** de la
transcription : ce qui est nouveau par rapport au texte précédent.

*Cette page est la transcription intégrale du document officiel. Elle ne
contient aucun commentaire de la rédaction.*`,
  },
  {
    id: "article-de-loi",
    name: "Article de loi",
    description:
      "Une page consacrée à un article précis du code constitutionnel. Utile quand un article mérite son propre développement.",
    icon: "⚖️",
    category: "lois",
    tags: ["loi", "article"],
    summary: "Étude d'un article de la Constitution : texte, portée et application.",
    infobox: {
      caption: "Article de loi",
      fields: [
        { label: "Article", value: "" },
        { label: "Texte", value: "" },
        { label: "Portée", value: "" },
        { label: "Application", value: "Non renseignée" },
      ],
      footer: "Source : Constitution.pdf.",
    },
    content: `# Article P-x

> Source officielle : [Constitution.pdf](/Constitution.pdf).

## Texte

> « Reproduction exacte de l'article. »

## Portée

Ce que l'article autorise, interdit ou organise. Dites-le avec les mots du
texte quand c'est possible : la paraphrase est la première source d'erreur
juridique.

## Application

Les cas où l'article a été invoqué. **Non renseigné** si aucun.

## Débats

Les critiques ou interprétations rapportées, attribuées à leurs auteurs.

## Voir aussi

- [[la-constitution]]
- [[les-lois-du-delphinat]]`,
  },

  // =========================================================================
  // Histoire
  // =========================================================================
  {
    id: "evenement-guerre",
    name: "Événement — guerre ou conflit",
    description:
      "Guerre civile, sécession, intervention. Le modèle sépare les camps, le déroulement et l'issue — trois choses souvent confondues.",
    icon: "⚔️",
    category: "histoire",
    tags: ["histoire", "guerre", "conflit"],
    summary: "Conflit du Delphinat : camps, déroulement et issue.",
    infobox: {
      caption: "Événement",
      fields: [
        { label: "Type", value: "Guerre" },
        { label: "Lieu", value: "Gratianopolis" },
        { label: "Camps", value: "" },
        { label: "Issue", value: "" },
        { label: "Dates", value: "Non renseignées" },
        { label: "Victimes", value: "Non renseignées" },
      ],
      footer: "Récit de la rédaction du wiki.",
    },
    content: `# Nom du conflit

> Source : récit de la rédaction du wiki. Aucune date n'est établie par une
> source écrite : les périodes sont ordonnées, pas datées.

## Origines

Ce qui déclenche le conflit, et ce qui l'a rendu possible. Distinguez la cause
immédiate du contexte.

## Les camps

Qui combat qui, et au nom de quoi. Nommez les personnes, pas seulement les
blocs.

## Déroulement

Les étapes documentées. Ce qui n'est pas raconté s'écrit **non renseigné** —
une encyclopédie n'invente pas de batailles.

## Issue

Armistice, victoire, statu quo. Précisez ce que l'issue change concrètement :
une souveraineté reconnue n'est pas une reddition.

## Voir aussi

- [[les-trois-delphinats]]
- [[histoire-du-delphinat]]`,
  },
  {
    id: "evenement-crise",
    name: "Événement — crise politique",
    description:
      "Destitution, vacance, campagne électorale. Le modèle impose de séparer la cause, la crise et la résolution.",
    icon: "🔥",
    category: "histoire",
    tags: ["histoire", "crise politique"],
    summary: "Crise politique du Delphinat : cause, déroulement et résolution.",
    infobox: {
      caption: "Crise",
      fields: [
        { label: "Origine", value: "" },
        { label: "Déclencheur", value: "" },
        { label: "Durée", value: "Non renseignée" },
        { label: "Issue", value: "Non renseignée" },
      ],
      footer: "Récit de la rédaction du wiki.",
    },
    content: `# Nom de la crise

> Source : récit de la rédaction du wiki.

## La cause

Le fait qui ouvre la crise. Un seul fait, nommé précisément.

## Le déroulement

Les étapes, dans l'ordre. Une crise se raconte comme une chaîne : chaque
maillon doit être documenté, sinon la chaîne est une hypothèse.

## Les acteurs

Qui intervient, à quel titre, et ce qu'il décide.

## La résolution

Comment la crise se termine — ou qu'elle ne se termine pas. **Non renseigné**
si le récit s'arrête avant.

## Voir aussi

- [[le-premier-ministre]]
- [[crise-politique-contemporaine]]`,
  },
  {
    id: "periode-historique",
    name: "Période historique",
    description:
      "Un règne, un interrègne, une république. Le modèle est centré sur la nature du régime et ses transitions.",
    icon: "🗓️",
    category: "histoire",
    tags: ["histoire", "période"],
    summary: "Période de l'histoire du Delphinat : nature du régime et transitions.",
    infobox: {
      caption: "Période historique",
      fields: [
        { label: "Règne", value: "" },
        { label: "Nature", value: "" },
        { label: "Souverain", value: "" },
        { label: "Précédé par", value: "" },
        { label: "Suivi par", value: "" },
        { label: "Dates", value: "Non renseignées" },
      ],
      footer: "Ordre des périodes : shared/roster.json.",
    },
    content: `# Nom de la période

> Source : récit de la rédaction du wiki. Aucune date n'est établie par une
> source écrite : les périodes sont ordonnées, pas datées.

## Nature du régime

Ce qui distingue cette période des autres : delphinat, dictature, république.
La qualification n'est pas neutre — elle vient du récit, citez-la.

## Souveraineté

Qui détient le pouvoir, et à quel titre.

## Transitions

Comment la période commence, comment elle finit. Une transition non documentée
s'écrit **non renseignée**.

## Ce que la période a produit

Textes, institutions, conflits qui lui survivent.

## Voir aussi

- [[les-trois-delphinats]]`,
  },

  // =========================================================================
  // Géographie et politique
  // =========================================================================
  {
    id: "micronation",
    name: "Micronation voisine",
    description:
      "État étranger cité par le récit. Le modèle rappelle de ne documenter que ce que la rédaction a fourni.",
    icon: "🌍",
    category: "geographie",
    tags: ["micronation", "géographie"],
    summary: "Micronation voisine du Delphinat : nature, souverain et relations.",
    infobox: {
      caption: "Micronation",
      fields: [
        { label: "Nom officiel", value: "" },
        { label: "Nature", value: "" },
        { label: "Souverain", value: "" },
        { label: "Lien avec le Delphinat", value: "" },
        { label: "Localisation", value: "Non renseignée" },
        { label: "Population", value: "Non renseignée" },
      ],
      footer: "Récit de la rédaction du wiki.",
    },
    content: `# Nom de la micronation

> Source : récit de la rédaction du wiki.

## Nature du régime

Monarchie, république, empire parlementaire. La qualification vient du récit.

## Souverain

Qui dirige, à quel titre.

## Relations avec le Delphinat

Le ou les événements qui relient cet État à Gratianopolis, avec leur date
relative (avant ou après tel règne) — jamais une date absolue non documentée.

## Ce qui n'est pas documenté

Localisation, population, histoire propre, symboles. Ces éléments sont **non
renseignés** : une encyclopédie indique une lacune, elle ne la comble pas par
déduction.

## Voir aussi

- [[geographie-du-delphinat]]`,
  },
  {
    id: "parti-politique",
    name: "Parti politique",
    description:
      "Formation politique du serveur. Le modèle distingue le fondateur, le candidat et le programme.",
    icon: "🗳️",
    category: "institutions",
    tags: ["parti politique", "élections"],
    summary: "Parti politique du Delphinat : fondation, candidat et programme.",
    infobox: {
      caption: "Parti politique",
      fields: [
        { label: "Nom", value: "" },
        { label: "Sigle", value: "" },
        { label: "Fondateur", value: "" },
        { label: "Candidat", value: "Non renseigné" },
        { label: "Programme", value: "Non renseigné" },
      ],
      footer: "Récit de la rédaction du wiki.",
    },
    content: `# Nom du parti

> Source : récit de la rédaction du wiki.

## Fondation

Qui l'a créé, quand, et pourquoi. Un parti fondé « le premier » ne l'est pas
par hasard : dites ce que cela change.

## Positionnement

Ce que le parti revendique. Le nom d'un parti est déjà un programme : lisez-le.

## Le candidat

Qui porte ses couleurs, à quelle élection, avec quel résultat.

## Le programme

Ce qui est documenté. **Non renseigné** est une réponse valable, et plus
honnête qu'un programme reconstitué.

## Voir aussi

- [[crise-politique-contemporaine]]
- [[le-premier-ministre]]`,
  },
  {
    id: "election",
    name: "Élection ou scrutin",
    description:
      "Un vote, une campagne, une destitution. Le modèle impose de distinguer le corps électoral, les candidats et le résultat.",
    icon: "📊",
    category: "histoire",
    tags: ["élection", "vote"],
    summary: "Scrutin du Delphinat : corps électoral, candidats et résultat.",
    infobox: {
      caption: "Scrutin",
      fields: [
        { label: "Objet", value: "" },
        { label: "Corps électoral", value: "Les citoyens (article P-15)" },
        { label: "Candidats", value: "" },
        { label: "Résultat", value: "Non renseigné" },
        { label: "Date", value: "Non renseignée" },
      ],
      footer: "Récit de la rédaction du wiki.",
    },
    content: `# Nom du scrutin

> Source : récit de la rédaction du wiki.

## Objet

Ce sur quoi porte le vote : une charge, une destitution, une loi.

## Corps électoral

Qui vote, et à quel titre. L'article P-15 réserve le vote aux citoyens ;
précisez si le scrutin s'en écarte.

## Candidats et positions

Qui se présente, sous quelle étiquette, avec quel argument.

## Résultat

Le résultat documenté, avec sa formulation exacte (« destitué à 100 % » n'est
pas « largement rejeté »).

## Voir aussi

- [[crise-politique-contemporaine]]
- [[les-lois-du-delphinat]]`,
  },
  {
    id: "page-libre",
    name: "Page libre",
    description:
      "Squelette minimal : un titre, un chapeau, trois rubriques. À utiliser quand aucun modèle ne correspond — et à ne pas utiliser par confort.",
    icon: "📄",
    category: "histoire",
    tags: [],
    summary: "",
    content: `# Titre de la page

> Source : à préciser (récit de la rédaction, document officiel, API Discord).

Chapeau : deux ou trois phrases qui résument le sujet et disent pourquoi il
figure dans cette encyclopédie.

## Première rubrique

Contenu documenté.

## Deuxième rubrique

Contenu documenté. Ce qui n'est pas documenté s'écrit **non renseigné**.

## Voir aussi

- [[histoire-du-delphinat]]`,
  },
];

/** Modèle par défaut quand aucun identifiant n'est fourni. */
export function templateById(id: string | null | undefined): PageTemplate | null {
  if (!id) return null;
  return PAGE_TEMPLATES.find((modele) => modele.id === id) ?? null;
}
