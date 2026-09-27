import type { Article } from "./types";

/**
 * Lore du IIIe Delphinat de Gratianopolis — fiches des figures majeures.
 *
 * **Règle éditoriale de ce fichier** : il ne contient que des informations
 * fournies par la rédaction du wiki. Chaque énoncé sur une personne ou un
 * événement est donc **attribué** — « la rédaction tient… », « selon le récit
 * de la rédaction… » — et suivi d'une mention de source explicite. On ne trouve
 * ici aucune date, aucun chiffre et aucun fait que la rédaction n'ait pas
 * donné : ce qui n'est pas documenté est écrit « non renseigné ».
 *
 * Les pages juridiques restent, elles, des transcriptions intégrales de
 * documents officiels (`seed-data.ts`, `seed-constitutions.ts`). Les portraits
 * affichés dans les encadrés proviennent de l'API Discord, jamais d'ici.
 */

/** Mention de source commune aux pages de récit. */
const LORE_SOURCE =
  "> Source : récit de la rédaction du wiki. Les faits juridiques et les portraits " +
  "proviennent respectivement des documents officiels et de l'API Discord.";

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

export const SEED_LORE_ARTICLES: Article[] = [
  // =====================================================================
  // Eitam
  // =====================================================================
  {
    slug: "eitam",
    title: "Eitam",
    category: "personnalites",
    summary:
      "Créateur du wiki et du bot Discord du Delphinat, membre fondateur du Ier Delphinat, fondateur du Parti Révolutionnaire Socialiste Gratiennois et candidat au poste de Premier Ministre.",
    tags: [
      "eitam",
      "fondateur",
      "wiki",
      "bot discord",
      "prsg",
      "premier ministre",
    ],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Personnalité",
      imageAlt: "Photo de profil Discord de Eitam",
      imageCaption: "Portrait issu de l'API Discord du serveur officiel",
      fields: [
        { label: "Nom", value: "Eitam" },
        { label: "Activité", value: "Créateur du wiki et du bot Discord" },
        {
          label: "Ancienneté",
          value: "Membre des plus anciens, depuis le Ier Delphinat",
        },
        { label: "Fondation", value: "Parti Révolutionnaire Socialiste Gratiennois" },
        {
          label: "Candidature",
          value: "Candidat au poste de Premier Ministre",
        },
        {
          label: "Distinction rapportée",
          value: "Seul membre à avoir porté les boosts au niveau 3 (14 boosts)",
        },
        { label: "Activités citées", value: "Rappeur ; fan de Shakira" },
        { label: "Anecdotes rapportées", value: "A déjà raided le serveur ; départs et retours répétés" },
        { label: "Serveur", value: "discord.gg/gratianopolis" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki.",
    },
    content: `# Eitam

${LORE_SOURCE}

Eitam est, selon la rédaction du wiki, le **créateur du wiki et du bot
Discord** du IIIe Delphinat de Gratianopolis. Il occupe une place à part dans
la communauté : celle du membre qui a **construit les outils** avant d'avoir
occupé les institutions.

## Ancienneté

La rédaction le présente comme l'un des **membres les plus anciens** de la
communauté, présent depuis la **création du Ier Delphinat** — c'est-à-dire
depuis l'origine même de Gratianopolis.

Il est donc présent sur toute la chronologie : le [[ier-delphinat]],
la [[1ere-guerre-delphinal|première Guerre Delphinal]], la
[[la-junte-militaire|Junte Militaire]], le [[2e-delphinat]] et le
[[grande-guerre-de-secession-delphinal|GDEL]]. Son ancienneté n'est donc pas
un titre, c'est un **témoin**.

## Le wiki et le bot

C'est à Eitam que le Delphinat doit ses deux outils techniques. Le présent wiki
est le résultat de ce travail : c'est précisément parce qu'il en est
l'auteur qu'il est tenu d'en documenter la provenance — d'où la règle
éditoriale appliquée à chaque page, qui distingue un fait documenté d'un
récit de communauté.

## Le Parti Révolutionnaire Socialiste Gratiennois

Eitam est le fondateur du **Parti Révolutionnaire Socialiste Gratiennois**, que
la rédaction présente comme **le tout premier parti du serveur**. Il n'est
donc pas un effet de récupération : il a créé l'instrument
politique avant que la politique ne se structure autour de lui.

Ce parti est aujourd'hui l'une des deux forces de la campagne
électionnelle en cours, face au
[[parti-union-de-premier-regime|Parti Union de Premier Régime]] de
[[selios|Selios]], porté par [[bougre|Bougre]].

## Le niveau 3 de boosts

C'est le fait d'armes le plus concret que la rédaction lui attribue :
**Eitam est le seul homme de l'histoire de Gratianopolis à avoir poussé le
serveur jusqu'au niveau 3 de boosts**, soit **14 boosts** à son actif.

Le contraste est saisissant, et c'est la rédaction qui le souligne : le membre
le plus ancien de la communauté est aussi celui qui a le plus contribué
financièrement à sa croissance. Ramer, discuter des listes, et payer pour que
le serveur ait plus de monde : les trois gestes ne décrivent pas le même
Eitam.

## Candidat au poste de Premier Ministre

Eitam est **candidat au poste de Premier Ministre** sous l'étiquette du
[[parti-revolutionnaire-socialiste-gratiennois|Parti Révolutionnaire Socialiste
Gratiennois]], dans le cadre de la
[[crise-politique-contemporaine|crise politique contemporaine]].

Reste à noter un obstacle juridique, et il n'est pas anecdotique : l'article
P-14 de la [[constitution-du-2e-delphinat|Constitution du IIe Delphinat]]
interdit à **les chefs de micronation étrangère** de se présenter à l'élection
du Premier Ministre. La rédaction ne précise pas si cette disposition
s'applique encore, ni si Eitam est concerné : le point est **non renseigné**.

## Départs et retours

La rédaction insiste sur les **départs fréquents et les retours** d'Eitam sur
Discord. Le motif n'est pas donné. En revanche, le récit lui prête un
**retour en force lors de la Grande Guerre de Sécession Delphinale**, où il
serait venu au secours du camp pro-Esto.

C'est le seul moment où ses « disparitions » sont interpretées comme ayant
une raison : le retour d'Eitam est associé à la [[grande-guerre-de-secession-delphinal|GDEL]],
à laquelle [[esto|Esto]], [[baron|Baron]] et [[swaylo|Swaylo]] luttent
contre la [[regence-gratiennoise|Régence Gratiennoise]].

## Le raid

Eitam est rapporté comme ayant **raid le serveur** par le passé. La rédaction
ne précise ni la date, ni le motif, ni le contenu du raid.

## Easter eggs

Deux détails purement anecdotiques : la rédaction le décrit comme
**rappeur** et comme un **fan absolu de Shakira**. Ces deux éléments sont
récurrents dans les anecdotes de la communauté ; ils n'ont aucune valeur
institutionnelle et le wiki les consigne comme tels.

## Son rôle dans la fin du IIe Delphinat

La rédaction indique qu'Esto est **soutenu par Eitam**. Eitam apparaît donc
dans le [[2e-delphinat|IIe Delphinat]] non comme un dirigeant, mais comme un
**soutien du Dauphin en exercice**.

## Voir aussi

- [[esto]]
- [[selios]]
- [[bougre]]
- [[parti-revolutionnaire-socialiste-gratiennois]]
- [[crise-politique-contemporaine]]`,
  },

  // =====================================================================
  // Selios
  // =====================================================================
  {
    slug: "selios",
    title: "Selios",
    category: "personnalites",
    summary:
      "Dauphin fondateur du Ier Delphinat, aimé par le peuple mais rarement perçu comme un dirigeant fort : il récupère la couronne après le coup d'État de Math, puis sa Grande Répression et le bannissement de Stanislas provoquent la chute du IIe Delphinat.",
    tags: ["selios", "dauphin fondateur", "grande répression", "régence", "ier delphinat"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Personnalité",
      imageAlt: "Photo de profil Discord de Selios",
      imageCaption: "Portrait issu de l'API Discord du serveur officiel",
      fields: [
        { label: "Nom", value: "Selios" },
        { label: "Titre", value: "Dauphin fondateur du Ier Delphinat" },
        { label: "Règne", value: "Ier Delphinat, puis IIe Delphinat" },
        { label: "Popularité", value: "Aimé du peuple, mais rarement perçu comme dirigeant fort" },
        { label: "Régence", value: "Chef de la Régence Gratiennoise" },
        { label: "Actes rapportés", value: "Instigateur de la Grande Répression ; bannissement de Stanislas" },
        { label: "Parti", value: "Parti Union de Premier Régime" },
        { label: "Succession", value: "Reprend la couronne après le coup d'État de Math" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki.",
    },
    content: `# Selios

${LORE_SOURCE}

Selios est le **Dauphin fondateur** de Gratianopolis : il a présidé au
[[ier-delphinat|Ier Delphinat]], l'ère qui a donné son nom au serveur. Son
parcours est aussi celui du personnage qui traverse tous les règnes sans en
posséder aucun en entier.

## Un fondateur aimé, mais peu autoritaire

La rédaction insiste sur un contraste qui fait tout le personnage : Selios est
**aimé du peuple**, mais **rarement perçu comme un véritable dirigeant fort**.

C'est la formulation la plus révélatrice du récit, parce qu'elle n'est pas
flatteuse. Selios n'est pas présenté comme un tyran, mais comme un Dauphin
manquant d'autorité — un fondateur que l'on aime précisément parce qu'il ne
pèse pas. Cette faiblesse lui sera reprochée plus tard : un souverain très
aimé, mais sans poids réel.

## Le retour après le coup d'État de Math

Selios **récupère la couronne après le coup d'état de [[math|Math]]**, qui avait
renversé la [[la-junte-militaire|Junte Militaire]] de [[bougre|Bougre]].

La formule est remarquable : Math renverse un dictateur, et c'est **Selios**
qui récupère le trône. Selios n'a donc pas pris le pouvoir par la force — il
l'a **reçu** de celui qui l'avait pris à un autre. Le récit n'explique pas
pourquoi, et cette zone reste **non renseignée**.

## La Grande Répression

Selios est l'**instigateur de la Grande Répression**, une opération
délibérée de répression menée depuis le sommet de l'État.

Le récit est formel : il en est l'instigateur, ce qui le distingue
nettement des exécutants. La [[grande-repression|page dédiée]] détaille
l'affaire ; Selios y est nommé comme le décideur.

## Le bannissement de Stanislas

C'est l'acte le plus lourdement chargé du récit. Selios **bannit
[[stanislas|Stanislas]], Roi de [[neustrie|Neustrie]]**.

Cet acte provoque, selon la rédaction, **un raid fatal** qui « sonne le glas
du Second Delphinat ». Selios est donc, dans la causalité du récit, à
l'origine de la chute du [[2e-delphinat|IIe Delphinat]] : l'acte de
souveraineté (bannir un roi étranger) a déclenché la guerre (le raid), et la
guerre a détruit le régime (l'armistice).

## La Régence Gratiennoise

Selios devient **chef de la Régence Gratiennoise**, un gouvernement parallèle
qui se maintient face à l'installation du
[[grande-guerre-de-secession-delphinal|IIIe Delphinat]] pendant la
[[grande-guerre-de-secession-delphinal|GDEL]].

La Régence est le paradoxe final de Selios : il est Dauphin d'un régime
disparu, et chef d'un régime qui n'a jamais été reconnu par l'autre. Voir
[[regence-gratiennoise]].

## Le Parti Union de Premier Régime

Selios est le fondateur du
[[parti-union-de-premier-regime|Parti Union de Premier Régime]], qui porte son
nom — « Union de Premier Régime » étant la formule même du
[[2e-delphinat|IIe Delphinat]].

Aux élections du [[crise-politique-contemporaine|premier ministère]], c'est
[[bougre|Bougre]] qui porte les couleurs de ce parti : Selios reste derrière
le candidat, comme derrière le Dauphinie.

## Voir aussi

- [[ier-delphinat]]
- [[la-junte-militaire]]
- [[2e-delphinat]]
- [[grande-repression]]
- [[regence-gratiennoise]]
- [[math]]
- [[stanislas]]
- [[bougre]]`,
  },

  // =====================================================================
  // Esto
  // =====================================================================
  {
    slug: "esto",
    title: "Esto",
    category: "personnalites",
    summary:
      "Dauphin en titre du IIIe Delphinat, tenu pour le principal responsable de la chute du IIe Delphinat aux côtés de Baron et de Swaylo, et soutenu par Eitam.",
    tags: ["esto", "dauphin", "chute du 2e delphinat", "guerre de sécession"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Personnalité",
      imageAlt: "Photo de profil Discord de Esto",
      imageCaption: "Portrait issu de l'API Discord du serveur officiel",
      fields: [
        { label: "Nom", value: "Esto" },
        { label: "Titre", value: "Dauphin du IIIe Delphinat" },
        { label: "Règne", value: "IIIe Delphinat" },
        { label: "Daulphins votables", value: "L'un des trois, avec Sélios et Math" },
        {
          label: "Mise en cause",
          value: "Principal responsable de la chute du IIe Delphinat",
        },
        { label: "Aux côtés de", value: "Baron et Swaylo" },
        { label: "Soutenu par", value: "Eitam" },
        { label: "Rôle dans la GDEL", value: "Camp pro-Esto, contre la Régence" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki.",
    },
    content: `# Esto

${LORE_SOURCE}

Esto est le **Dauphin en titre du IIIe Delphinat**. Son importance tient moins à
ce qu'il fait qu'à ce qu'on lui impute : c'est lui que la rédaction désigne
comme le **principal responsable de la chute du IIe Delphinat**.

## Dauphin

La charge d'Esto est inscrite dans les textes : il est l'un des **trois
Dauphins votables** que l'article P-15 de la
[[constitution-du-2e-delphinat|Constitution du IIe Delphinat]] nomme
nominément — *Esto*, *Sélios* et [[math|Math]] — et que l'article P-15 de la
[[la-constitution|Constitution en vigueur]] reconduit.

Le Trône n'est donc pas une fonction ouverte : c'est une liste fermée de trois
noms, ce qui rend la concurrence entre eux permanente et structure toute la
[[crise-politique-contemporaine|vie politique contemporaine]].

## Principal responsable de la chute du IIe Delphinat

C'est l'énoncé le plus lourd de sa fiche. Selon la rédaction, Esto est le
**principal responsable** de la [[la-chute-du-2e-delphinat|chute du IIe
Delphinat]], **aux côtés de [[baron|Baron]] et de [[swaylo|Swaylo]]**.

Trois personnes sont donc mises en cause, dont l'une est aujourd'hui
[[norlot|Empereur d'une autre micronation]]. La formulation « aux côtés de »
est collective : elle n'établit pas de hiérarchie entre les trois, et le récit
ne précise pas lequel des trois a Commencé. Ce point reste **non renseigné**.

## Le camp pro-Esto

Pendant la [[grande-guerre-de-secession-delphinal|Grande Guerre de Sécession
Delphinal]], Esto est le chef du **camp pro-Esto**, opposé à la
[[regence-gratiennoise|Régence Gratiennoise]] de [[selios|Selios]].

C'est le second acte de sa fiche : il est celui que la
[[grande-guerre-de-secession-delphinal|GDEL]] désigne comme camps, et son
victoire rend le IIIe Delphinat **l'unique vainqueur** de l'armistice. Voir
[[grande-guerre-de-secession-delphinal]] et [[crise-politique-contemporaine]].

## Le soutien d'Eitam

La rédaction indique qu'Esto est **soutenu par [[eitam|Eitam]]**, fondateur du
[[parti-revolutionnaire-socialiste-gratiennois|Parti Révolutionnaire Socialiste
Gratiennois]].

Ce soutien est doublement significatif : il lie le Dauphin en exercice au
plus ancien membre de la communauté, et il associe le pouvoir à un parti qui
n'est pas le sien. Voir [[eitam]].

## Voir aussi

- [[la-constitution]]
- [[constitution-du-2e-delphinat]]
- [[la-chute-du-2e-delphinat]]
- [[grande-guerre-de-secession-delphinal]]
- [[regence-gratiennoise]]
- [[eitam]]
- [[baron]]
- [[swaylo]]`,
  },

  // =====================================================================
  // Bougre
  // =====================================================================
  {
    slug: "bougre",
    title: "Bougre",
    category: "personnalites",
    summary:
      "Ancien président devenu chef de la Junte Militaire, la dictature qui a gouverné Gratianopolis entre le Ier et le IIe Delphinat, renversée par le coup d'État de Math. Candidat au poste de Premier Ministre sous les couleurs du parti de Selios.",
    tags: ["bougre", "junte militaire", "dictature", "premier ministre", "pr"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Personnalité",
      imageAlt: "Photo de profil Discord de Bougre",
      imageCaption: "Portrait issu de l'API Discord du serveur officiel",
      fields: [
        { label: "Nom", value: "Bougre" },
        { label: "Fonction", value: "Ancien président" },
        { label: "Pouvoir", value: "Chef de la Junte Militaire" },
        { label: "Règne", value: "Dictature entre le Ier et le IIe Delphinat" },
        { label: "Fin de règne", value: "Renversé par le coup d'État de Math" },
        { label: "Candidature", value: "Premier Ministre, sous les couleurs du PR" },
        { label: "Parti", value: "Parti Union de Premier Régime de Selios" },
        { label: "Rôle militaire", value: "Combattant de la première Guerre Delphinal" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki.",
    },
    content: `# Bougre

${LORE_SOURCE}

Bougre est **l'ancien président** de Gratianopolis devenu **chef de la Junte
Militaire**. Son nom désigne la dictature qui a gouverné la nation **entre le
[[ier-delphinat|Ier Delphinat]] et le [[2e-delphinat|IIe Delphinat]]**.

## La Junte Militaire

La [[la-junte-militaire|Junte Militaire]] est la période la plus sombre du récit :
une dictature dont la rédaction décrit le caractère **brutal**. Bougre en est le
chef, et son titre est celui d'un chef de junte — une forme de gouvernement
militaire qui n'appartient pas à la tradition constitutionnelle de Gratianopolis.

La Junte interrompt la continuité delphinale : entre deux règnes issus du
[[reglement-du-ier-delphinat|Règlement du Ier Delphinat]], elle n'est couverte
par aucun des deux textes fondateurs.

## Le renversement par Math

Bougre est **renversé par le coup d'État de [[math|Math]]**. L'acte est
présenté par la rédaction comme un acte de bravoure et de force, et il a une
conséquence juridique : il rend Math **éligible de droit au statut de Dauphin**.

Voir [[la-junte-militaire]] et [[math]].

## La première Guerre Delphinal

Bougre est l'une des figures de la [[1ere-guerre-delphinal|première Guerre
Delphinal]], aux côtés de [[voytec|Voytec]], [[capy|Capy]], [[baron|Baron]] et
[[style|Style]].

Le récit précise que [[style|Style]] a été ministre **aux côtés de Baron et
Bougre** pour imposer la [[republique-de-gratianopolis|République de
Gratianopolis]]. Bougre est donc un acteur de la première guerre civile, avant
d'être le dictateur de la Junte.

## Candidat au poste de Premier Ministre

Bougre est aujourd'hui **candidat au poste de Premier Ministre** sous les
couleurs du [[parti-union-de-premier-regime|Parti Union de Premier Régime]],
le parti de [[selios|Selios]].

La candidature est politiquement parlante : l'ancien dictateur revient dans
le jeu démocratique, et le parti qu'il porte est celui du fondateur
[[selios|Selios]] — c'est-à-dire du régime qui a succédé à sa dictature. La
rédaction ne précise ni son programme, ni sa position sur la
[[grande-repression|Grande Répression]]. Ces éléments sont **non renseignés**.

## Voir aussi

- [[la-junte-militaire]]
- [[1ere-guerre-delphinal]]
- [[republique-de-gratianopolis]]
- [[math]]
- [[selios]]
- [[parti-union-de-premier-regime]]
- [[crise-politique-contemporaine]]`,
  },

  // =====================================================================
  // Swaylo
  // =====================================================================
  {
    slug: "swaylo",
    title: "Swaylo",
    category: "personnalites",
    summary:
      "Empereur de l'Empire parlementaire de Norlot, allié stratégique de Gratianopolis et putting en cause aux côtés d'Esto et de Baron dans la chute du IIe Delphinat.",
    tags: ["swaylo", "empereur", "norlot", "allié", "guerre de sécession"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Personnalité",
      imageAlt: "Photo de profil Discord de Swaylo",
      imageCaption: "Portrait issu de l'API Discord du serveur officiel",
      fields: [
        { label: "Nom", value: "Swaylo" },
        { label: "Titre", value: "Empereur de l'Empire parlementaire de Norlot" },
        { label: "Micronation", value: "Empire parlementaire de Norlot" },
        { label: "Mise en cause", value: "Aux côtés d'Esto et de Baron" },
        { label: "Rôle", value: "Allié stratégique dans les grands conflits" },
        { label: "Limite légale", value: "Inéligible à la présidence de Gratianopolis (article P-14)" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki.",
    },
    content: `# Swaylo

${LORE_SOURCE}

Swaylo est l'**Empereur de l'Empire parlementaire de
[[norlot|Norlot]]**. C'est la seule personnalité du wiki à diriger une autre
micronation, ce qui fait de son alliance un enjeu de politique internationale
autant que de politique intérieure.

## L'Empire parlementaire de Norlot

Le titre d'Empereur est remarquable : il coexiste avec la qualification
**parlementaire** de l'Empire. Norlot n'est donc pas une monarchie absolue, et
la rédaction ne dit rien de plus sur son régime. Voir [[norlot]].

## Allié stratégique

La rédaction le présente comme un **allié stratégique dans les grands
conflits**. Il combat aux côtés du camp pro-Esto pendant la
[[grande-guerre-de-secession-delphinal|Grande Guerre de Sécession Delphinal]],
aux côtés de [[esto|Esto]] et [[baron|Baron]].

## Mise en cause dans la chute du IIe Delphinat

Swaylo est mis en cause, **aux côtés d'Esto et de Baron**, dans la
[[la-chute-du-2e-delphinat|chute du IIe Delphinat]].

C'est la contrainte la plus lourde de sa fiche, et
celle qui a le plus de conséquences dans le texte : l'article P-14 de la
[[constitution-du-2e-delphinat|Constitution du IIe Delphinat]] interdit à
**les chefs de micronation étrangère** de se présenter à l'élection du
[[le-premier-ministre|Premier Ministre]] de Gratianopolis.

Un Empereur qui participe à la chute d'un régime ne peut donc pas, ensuite,
gouverner celui qui lui succède. La [[crise-politique-contemporaine|crise
politique contemporaine]] se déroule précisément sous cette règle.

## Voir aussi

- [[norlot]]
- [[esto]]
- [[baron]]
- [[la-chute-du-2e-delphinat]]
- [[grande-guerre-de-secession-delphinal]]`,
  },

  // =====================================================================
  // Baron
  // =====================================================================
  {
    slug: "baron",
    title: "Baron",
    category: "personnalites",
    summary:
      "Ancien président de la République de Massivie, ancien gardien des lois neustrien, ancien ministre à Norlot et chef du Conseil pendant la première Guerre Delphinal : un stratège, allié d'Esto et co-responsable de la chute du IIe Delphinat.",
    tags: ["baron", "massivie", "neustrie", "norlot", "stratège"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Personnalité",
      imageAlt: "Photo de profil Discord de Baron",
      imageCaption: "Portrait issu de l'API Discord du serveur officiel",
      fields: [
        { label: "Nom", value: "Baron" },
        { label: "Massivie", value: "Ancien président de la République de Massivie" },
        { label: "Neustrie", value: "Ancien gardien des lois" },
        { label: "Norlot", value: "Ancien ministre" },
        { label: "Delphinat", value: "Chef du Conseil pendant la première Guerre Delphinal" },
        { label: "Mise en cause", value: "Aux côtés d'Esto et de Swaylo" },
        { label: "Nature", value: "Stratège et allié d'Esto" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki.",
    },
    content: `# Baron

${LORE_SOURCE}

Baron est le personnage à la carrière la plus longue du wiki : ses fonctions
successives l'exercent dans **trois micronations** et dans un rôle militaire.
La rédaction le qualifie de **stratège majeur**.

## Un parcours dans trois micronations

### République de Massivie

Baron a été **président de la République de Massivie**. C'est la fonction la
plus haute de sa carrière, dans une [[massivie|république étrangère]] de
Gratianopolis. Voir [[massivie]].

### Neustrie

Baron a été **gardien des lois neustrien** — une charge de [[neustrie|Neustrie]],
la monarchie de [[stanislas|Stanislas]]. Il a donc servi le roi que
[[selios|Selios]] a banni.

Ce détail est l'un des plus parlants du récit : Baron a exercé une fonction
judiciaire dans l'État même dont le bannissement ultérieur a provoqué la chute
du [[2e-delphinat|IIe Delphinat]].

### Norlot

Baron a été **ministre** dans l'[[norlot|Empire parlementaire de Norlot]], la
micronation de [[swaylo|Swaylo]]. Il a donc également servi sous
l'Empereur avec lequel il est ensuite mis en cause.

## Chef du Conseil pendant la première Guerre Delphinal

Baron est **chef du Conseil** pendant la [[1ere-guerre-delphinal|première Guerre
Delphinal]], aux côtés de [[voytec|Voytec]], [[capy|Capy]], [[bougre|Bougre]] et
[[style|Style]].

La rédaction précise que [[style|Style]] a été ministre **aux côtés de Baron et
de Bougre** pour imposer la [[republique-de-gratianopolis|République de
Gratianopolis]]. Baron a donc dirigé le Conseil pendant la guerre civile qui a
produit ce régime.

## Mise en cause dans la chute du IIe Delphinat

Baron est mis en cause, **aux côtés d'[[esto|Esto]] et de
[[swaylo|Swaylo]]**, dans la [[la-chute-du-2e-delphinat|chute du IIe
Delphinat]]. Voir cette page pour la formulation complète et sa source.

## Le lien avec Norlot

La rédaction ne dit pas si Baron a quitté le gouvernement de Norlot avant ou
après la [[grande-guerre-de-secession-delphinal|Grande Guerre de Sécession
Delphinal]], pendant laquelle il combat dans le camp pro-Esto. Ce point est
**non renseigné**.

## Voir aussi

- [[massivie]]
- [[neustrie]]
- [[norlot]]
- [[1ere-guerre-delphinal]]
- [[republique-de-gratianopolis]]
- [[esto]]
- [[swaylo]]
- [[stanislas]]`,
  },
];
