import type { Article } from "./types";

/**
 * Fiches des figures de second rang du récit.
 *
 * Elles complètent `seed-lore.ts`, qui réunit les six personnalités
 * principales. La **règle éditoriale est la même** : rien n'est inventé.
 *
 * Cas particulier de [[voytec]] et [[capy]] : le récit ne les situe que comme
 * « figures de la première Guerre Delphinal ». Leurs fiches disent donc
 * exactement cela, et écrivent « non renseigné » partout ailleurs. C'est
 * volontaire — une fiche volontairement pauvre vaut mieux qu'une fiche
 *_flatteuse et fausse. Dès que la rédaction pourra documenter leur parcours,
 * il suffira de compléter ces pages depuis l'espace d'édition.
 */

/** Mention de source commune aux pages de récit. */
const LORE_SOURCE =
  "> Source : récit de la rédaction du wiki. Les faits juridiques et les portraits " +
  "proviennent respectivement des documents officiels et de l'API Discord.";

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

export const SEED_FIGURE_ARTICLES: Article[] = [
  // =====================================================================
  // Math
  // =====================================================================
  {
    slug: "math",
    title: "Math",
    category: "personnalites",
    summary:
      "Membre très ancien du Delphinat, auteur du coup d'État éclair qui a renversé la Junte Militaire de Bougre, et de ce fait éligible de droit au statut de Dauphin.",
    tags: ["math", "coup d'état", "junte militaire", "dauphin", "éligibilité"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Personnalité",
      imageAlt: "Photo de profil Discord de Math",
      imageCaption: "Portrait issu de l'API Discord du serveur officiel",
      fields: [
        { label: "Nom", value: "Math" },
        { label: "Ancienneté", value: "Membre très ancien du Delphinat" },
        { label: "Acte fondateur", value: "Coup d'État éclair contre la Junte Militaire" },
        { label: "Conséquence", value: "Renversement de la Junte de Bougre" },
        { label: "Droit reconnu", value: "Éligible de droit au statut de Dauphin" },
        { label: "Dauphins votables", value: "L'un des trois, avec Esto et Sélios" },
        { label: "Porte à paradoxale", value: "C'est Selios qui récupère la couronne" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki.",
    },
    content: `# Math

${LORE_SOURCE}

Math est un **membre très ancien du Delphinat** et l'auteur de l'acte qui a
mis fin à la dictature : le **coup d'État éclair qui a renversé la
[[la-junte-militaire|Junte Militaire]] de [[bougre|Bougre]]**.

## Le coup d'État

Le récit qualifie cet acte de **bravoure et de force**, et le décrit comme un
coup d'État **éclair** — c'est-à-dire rapide, sans transition, sans période de
transition observable entre les deux pouvoirs.

C'est l'acte fondateur de Math dans le récit. Voir [[la-junte-militaire]].

## Éligible de droit au statut de Dauphin

La conséquence la plus lourde du coup d'État est **juridique** : Math est
**éligible de droit au statut de Dauphin**.

Le mot « de droit » est important. Math ne briguerait pas la Dauphinie — il
y aurait droit, du seul fait d'avoir renversé une dictature. Ce statut
n'est donc ni une récompense politique, ni une élection : c'est une
qualification attachée à l'acte.

## L'un des trois Dauphins

Math figure parmi les trois Dauphins votables que nomment les articles P-15 de
la [[constitution-du-2e-delphinat|Constitution du IIe Delphinat]] et de la
[[la-constitution|Constitution en vigueur]] : *Esto*, *Sélios* et *Math*.

Math est donc le troisième terme d'une trisémie où les deux autres sont
[[selios|Selios]] et [[esto|Esto]] — les deux camps de la
[[grande-guerre-de-secession-delphinal|Grande Guerre de Sécession Delphinal]].

## Le paradoxe de la couronne

Le récit rapporte que c'est **[[selios|Selios]] qui récupère la couronne** après
le coup d'État de Math.

Autrement dit, celui qui a le droit au Trône ne l'occupe pas : celui qui le
possède sans y avoir droit l'exerce. Le récit n'explique pas cette
attribution, et le motif reste **non renseigné**. Voir [[selios]].

## Fonction sous le IIIe Delphinat

La fonction effectivement tenue par Math au sein du
[[histoire-du-delphinat|IIIe Delphinat]] n'est pas documentée par la
rédaction. Elle est **non renseignée**.

## Voir aussi

- [[la-junte-militaire]]
- [[bougre]]
- [[selios]]
- [[esto]]
- [[constitution-du-2e-delphinat]]`,
  },

  // =====================================================================
  // Voytec
  // =====================================================================
  {
    slug: "voytec",
    title: "Voytec",
    category: "personnalites",
    summary:
      "Figure de la première Guerre Delphinal, aux côtés de Capy, Baron, Bougre et Style. Le récit ne documente pas d'autre fonction : les éléments manquants sont signalés comme non renseignés.",
    tags: ["voytec", "1ère guerre delphinal", "république"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Personnalité",
      imageAlt: "Photo de profil Discord de Voytec",
      imageCaption: "Portrait issu de l'API Discord du serveur officiel",
      fields: [
        { label: "Nom", value: "Voytec" },
        { label: "Rôle documenté", value: "Figure de la première Guerre Delphinal" },
        { label: "Contexte", value: "Conflit ayant abouti à la République de Gratianopolis" },
        { label: "Fonction", value: "Non renseignée" },
        { label: "Ancienneté", value: "Non renseignée" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki. " +
        "La rédaction ne documente, à ce jour, que le rôle ci-dessus.",
    },
    content: `# Voytec

${LORE_SOURCE}

Voytec est l'une des **figures de la première Guerre Delphinal**. La rédaction
le place aux côtés de [[capy|Capy]], [[baron|Baron]], [[bougre|Bougre]] et
[[style|Style]].

## La première Guerre Delphinal

La [[1ere-guerre-delphinal|première Guerre Delphinal]] est le conflit qui a
conduit à l imposition de la [[republique-de-gratianopolis|République de
Gratianopolis]]. Voytec en est un acteur.

## Ce qui n'est pas documenté

Le récit ne précise pas la fonction de Voytec pendant la guerre, ni son sort
après l'imposition de la République, ni son éventuelle activité au
[[2e-delphinat|IIe Delphinat]] ou au [[histoire-du-delphinat|IIIe
Delphinat]]. Ces éléments sont **non renseignés**.

Cette page est volontairement courte : la rédaction n'a, à ce jour, qu'un seul
élément le concernant. Les lecteurs sont invités à la compléter depuis
l'espace d'édition plutôt que de voir une page remplie de suppositions.

## Voir aussi

- [[1ere-guerre-delphinal]]
- [[republique-de-gratianopolis]]
- [[capy]]
- [[baron]]
- [[bougre]]
- [[style]]`,
  },

  // =====================================================================
  // Capy
  // =====================================================================
  {
    slug: "capy",
    title: "Capy",
    category: "personnalites",
    summary:
      "Figure de la première Guerre Delphinal, aux côtés de Voytec, Baron, Bougre et Style. Le récit ne documente pas d'autre fonction : les éléments manquants sont signalés comme non renseignés.",
    tags: ["capy", "1ère guerre delphinal", "république"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Personnalité",
      imageAlt: "Photo de profil Discord de Capy",
      imageCaption: "Portrait issu de l'API Discord du serveur officiel",
      fields: [
        { label: "Nom", value: "Capy" },
        { label: "Rôle documenté", value: "Figure de la première Guerre Delphinal" },
        { label: "Contexte", value: "Conflit ayant abouti à la République de Gratianopolis" },
        { label: "Fonction", value: "Non renseignée" },
        { label: "Ancienneté", value: "Non renseignée" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki. " +
        "La rédaction ne documente, à ce jour, que le rôle ci-dessus.",
    },
    content: `# Capy

${LORE_SOURCE}

Capy est l'une des **figures de la première Guerre Delphinal**. La rédaction
le place aux côtés de [[voytec|Voytec]], [[baron|Baron]], [[bougre|Bougre]] et
[[style|Style]].

## La première Guerre Delphinal

La [[1ere-guerre-delphinal|première Guerre Delphinal]] est le conflit qui a
conduit à l'imposition de la [[republique-de-gratianopolis|République de
Gratianopolis]]. Capy en est un acteur.

## Ce qui n'est pas documenté

Le récit ne précise pas la fonction de Capy pendant la guerre, ni son sort
après l'imposition de la République, ni son éventuelle activité au
[[2e-delphinat|IIe Delphinat]] ou au [[histoire-du-delphinat|IIIe
Delphinat]]. Ces éléments sont **non renseignés**.

Cette page est volontairement courte, pour la même raison que celle de
[[voytec]] : mieux vaut une page pauvre et exacte qu'une page riche et fausse.
Elle se complète depuis l'espace d'édition.

## Voir aussi

- [[1ere-guerre-delphinal]]
- [[republique-de-gratianopolis]]
- [[voytec]]
- [[baron]]
- [[bougre]]
- [[style]]`,
  },

  // =====================================================================
  // Style
  // =====================================================================
  {
    slug: "style",
    title: "Style",
    category: "personnalites",
    summary:
      "Ancien ministre de la République de Gratianopolis et figure de la première Guerre Delphinal : il a été ministre aux côtés de Baron et de Bougre pour imposer la République.",
    tags: ["style", "ministre", "république de gratianopolis", "1ère guerre delphinal"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Personnalité",
      imageAlt: "Photo de profil Discord de Style",
      imageCaption: "Portrait issu de l'API Discord du serveur officiel",
      fields: [
        { label: "Nom", value: "Style" },
        { label: "Fonction", value: "Ancien ministre de la République de Gratianopolis" },
        { label: "Rôle", value: "Ministre aux côtés de Baron et de Bougre" },
        { label: "Contexte", value: "Imposition de la République" },
        { label: "Camp", value: "1ère Guerre Delphinal" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki.",
    },
    content: `# Style

${LORE_SOURCE}

Style est un **ancien ministre de la République de Gratianopolis** et l'une des
figures de la [[1ere-guerre-delphinal|première Guerre Delphinal]].

## L'imposition de la République

La rédaction est précise sur ce point : Style a été **ministre aux côtés de
[[baron|Baron]] et de [[bougre|Bougre]] pour imposer la
[[republique-de-gratianopolis|République de Gratianopolis]]**.

Style est donc un **ministre d'un régime qui n'existait pas encore** : il
appartient au gouvernement qui a fait naître la République, et non à celui qu'il
a remplacé.

## Un ministère pendant la guerre

Ce qui rend la fonction singulière, c'est qu'elle se situe pendant la
[[1ere-guerre-delphinal|guerre]] : Style participe à l'exercioire du pouvoir
alors même que ce pouvoir est contesté. Le récit ne précise ni la durée de
son ministère, ni le portefeuille détenu, ni la composition du gouvernement.
Ces éléments sont **non renseignés**.

## Après la République

Le sort de Style après l'imposition de la République n'est pas documenté par
la rédaction : il est **non renseigné**, y compris pour la période de la
[[la-junte-militaire|Junte Militaire]].

## Voir aussi

- [[1ere-guerre-delphinal]]
- [[republique-de-gratianopolis]]
- [[baron]]
- [[bougre]]`,
  },

  // =====================================================================
  // Frenchserbian
  // =====================================================================
  {
    slug: "frenchserbian",
    title: "Frenchserbian",
    category: "personnalites",
    summary:
      "Ancien Premier Ministre du IIIe Delphinat, destitué à 100 % lors d'un vote historique qui a ouvert la crise politique contemporaine.",
    tags: ["frenchserbian", "premier ministre", "destitution", "crise politique"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Personnalité",
      imageAlt: "Photo de profil Discord de Frenchserbian",
      imageCaption: "Portrait issu de l'API Discord du serveur officiel",
      fields: [
        { label: "Nom", value: "Frenchserbian" },
        { label: "Fonction", value: "Ancien Premier Ministre du IIIe Delphinat" },
        { label: "Fin de fonction", value: "Destitution par un vote unanime" },
        { label: "Vote", value: "100 % contre" },
        { label: "Conséquence", value: "Ouverture de la crise politique contemporaine" },
        { label: "Mandat", value: "Non renseigné" },
        { label: "Motif de la destitution", value: "Non renseigné" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki.",
    },
    content: `# Frenchserbian

${LORE_SOURCE}

Frenchserbian est l'**ancien Premier Ministre du IIIe Delphinat**. Il est le
personnage autour duquel s'est ouverte la
[[crise-politique-contemporaine|crise politique contemporaine]].

## Une destitution à 100 %

La rédaction indique que Frenchserbian a été **destitué à 100 % lors d'un vote
historique**.

Le chiffre est à prendre au mot : la destitution a été prononcée à
**l'unanimité**, sans une seule voix favorable. Le récit qualifie le vote de
**historique** — c'est-à-dire qu'il n'a pas de précédent dans l'histoire du
Delphinat.

## Un vote Dauphin ou un vote populaire ?

La Constitution en vigueur offre deux voies de censure du Premier Ministre
(voir [[le-premier-ministre|la page du Premier Ministre]] et
[[la-constitution|l'article P-1]]) : le Dauphin peut imposer une motion de
censure, et le Conseil delphinal peut en demander une. La rédaction **ne
précise pas** laquelle a été employée, ni qui a voté. Ce point est **non
renseigné**, et il est déterminant pour comprendre la suite.

## Les conséquences

La destitution de Frenchserbian a **mené à la crise politique actuelle** : sans
 Premier Ministre, le [[le-premier-ministre|gouvernement]] est vacance, et c'est
cette vacance qui rend possible la campagne
électionnelle opposant [[eitam|Eitam]] et [[bougre|Bougre]].

Le récit est explicite sur la chaîne causale :

1. destitution de Frenchserbian ;
2. crise politique ;
3. campagne électorale pour le poste de Premier Ministre.

## Mandat et programme

Le récit ne documente ni la date de la destitution, ni la durée du mandat de
Frenchserbian, ni le contenu de son programme, ni le motif de la destitution.
Tous ces éléments sont **non renseignés**.

## Voir aussi

- [[le-premier-ministre]]
- [[crise-politique-contemporaine]]
- [[eitam]]
- [[bougre]]
- [[parti-revolutionnaire-socialiste-gratiennois]]
- [[parti-union-de-premier-regime]]`,
  },

  // =====================================================================
  // Stanislas
  // =====================================================================
  {
    slug: "stanislas",
    title: "Stanislas",
    category: "personnalites",
    summary:
      "Roi de Neustrie, banni par Selios : ce bannissement a provoqué un raid fatal et a sonné le glas du IIe Delphinat.",
    tags: ["stanislas", "neustrie", "roi", "bannissement", "chute du 2e delphinat"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Personnalité",
      imageAlt: "Photo de profil Discord de Stanislas",
      imageCaption: "Portrait issu de l'API Discord du serveur officiel",
      fields: [
        { label: "Nom", value: "Stanislas" },
        { label: "Titre", value: "Roi de Neustrie" },
        { label: "Micronation", value: "Neustrie" },
        { label: "Sort", value: "Banni par Selios" },
        { label: "Conséquence", value: "Un raid fatal, puis la chute du IIe Delphinat" },
        { label: "Cause", value: "Motif du bannissement non renseigné" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki.",
    },
    content: `# Stanislas

${LORE_SOURCE}

Stanislas est le **Roi de [[neustrie|Neustrie]]**. Son sort — le bannissement —
est l'un des deux événements qui expliquent la disappearance du
[[2e-delphinat|IIe Delphinat]].

## Le bannissement par Selios

Stanislas est **banni par [[selios|Selios]]**, Dauphin du IIe Delphinat.

Le bannissement d'un chef d'État étranger par le Dauphin en exercice est un
acte de souveraineté : il ne relève pas de la justice intérieure, mais de la
politique extérieure. Le motif n'est pas documenté par la rédaction : il est
**non renseigné**.

Un élément de contexte est en revanche documenté : [[baron|Baron]] a été
**gardien des lois neustrien**, c'est-à-dire fonctionnaire de l'État de
Stanislas. Voir [[neustrie]].

## Le raid fatal

Le bannissement **provoque un raid fatal** et **sonne le glas du
[[2e-delphinat|IIe Delphinat]]**.

La causalité du récit est donc limpide, et c'est l'un des enchaînements les
mieux établis du wiki :

1. [[selios|Selios]] bannit [[stanislas|Stanislas]] ;
2. un raid fatal a lieu ;
3. le IIe Delphinat s'effondre.

Le récit ne précise pas qui a organisé le raid, ni son ampleur, ni sa date.
Ces éléments sont **non renseignés**.

## Roi, mais un titre de plus

Après le IIe Delphinat, le sort de Stanislas n'est pas documenté par la
rédaction : il est **non renseigné**. Le titre de Roi de Neustrie n'est pas
rapporté comme ayant été supprimé.

## Voir aussi

- [[neustrie]]
- [[selios]]
- [[2e-delphinat]]
- [[la-chute-du-2e-delphinat]]
- [[baron]]`,
  },
];
