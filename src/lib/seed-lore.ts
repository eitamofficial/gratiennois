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
      "Créateur du wiki et du bot Discord du Delphinat, membre fondateur du Ier Delphinat, fondateur du Parti Révolutionnaire Socialiste Gratiennois et **Premier Ministre de Gratianopolis**.",
    tags: [
      "eitam",
      "fondateur",
      "wiki",
      "bot discord",
      "prsg",
      "premier ministre",
      "titulaire",
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
          label: "Fonction actuelle",
          value: "Premier Ministre de Gratianopolis",
        },
        {
          label: "Sécurité du wiki",
          value: "A2F par MP Discord, HTTPS/HSTS, sauvegardes chiffrées, filtrage des entrées",
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

## La sécurité du wiki

Eitam est aussi l'auteur de l'architecture de sécurité du wiki. C'est un choix
éditorial autant que technique : une encyclopédie qui raconte l'histoire d'un
Delphinat doit être aussi difficile à falsifier qu'à consulter.

Quatre dispositions la structurent :

- **double authentification** — les comptes d'édition ne s'ouvrent qu'après un
  code à six chiffres envoyé en message privé Discord par le bot du wiki. Un mot
  de passe volé ne suffit donc pas : il faut aussi accéder au compte Discord.
  Les codes expirent au bout de cinq minutes, ne servent qu'une fois, et le défi
  est détruit après cinq tentatives ;
- **chiffrement du transport** — le site n'est servi qu'en HTTPS, avec un
  certificat renouvelé automatiquement et une politique HSTS qui interdit au
  navigateur de revenir au HTTP ;
- **sauvegardes chiffrées** — le contenu, les comptes et la configuration sont
  archivés chaque jour en AES-256, vérifiés par relecture, puis recopiés sur une
  seconde machine. Une archive volée reste illisible ;
- **filtrage des entrées** — le Markdown des articles est échappé avant d'être
  converti, jamais interprété ; les liens à schéma actif et les redirections
  vers un domaine tiers sont refusés ; les champs d'article sont bornés en
  longueur.

Le wiki est en outre tenu à jour : les dépendances sont auditées à chaque
version, et l'API d'optimisation d'images de Next.js — que le site n'utilise
pas — est désactivée plutôt que laissée exposée.

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

## Premier Ministre de Gratianopolis

Eitam est devenu **Premier Ministre de Gratianopolis**, sous l'étiquette du
[[parti-revolutionnaire-socialiste-gratiennois|Parti Révolutionnaire Socialiste
Gratiennois]], à l'issue de la
[[crise-politique-contemporaine|crise politique contemporaine]].

## Départs et retours

La rédaction insiste sur les **départs fréquents et les retours** d'Eitam sur
Discord. Le motif n'est pas donné. En revanche, le récit lui prête un
**retour en force lors de la Grande Guerre de Sécession Delphinale**, où il
serait venu au secours du camp pro-Esto.

C'est le seul moment où ses « disparitions » sont interpretées comme ayant
une raison : le retour d'Eitam est associé à la [[grande-guerre-de-secession-delphinal|GDEL]],
conflit lors duquel il a soutenu le camp d'[[esto|Esto]] contre la
[[regence-gratiennoise|Régence Gratiennoise]].

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
[[bougre|Bougre]] qui a porté les couleurs de ce parti : Selios est resté
derrière le candidat, comme derrière la Dauphinie.

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
      "Dauphin en titre du IIIe Delphinat, tenu pour le principal responsable de la chute du IIe Delphinat. Le camp pro-Esto a été trahi de l'intérieur par Baron, Swaylo et Stanislas, qui ont formé une alliance nulle contre le Delphinat. Eitam est devenu Premier Ministre de Gratianopolis.",
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
        { label: "Bannis par Esto", value: "Baron, Swaylo et Stanislas de Neustrie (alliance nulle)" },
        { label: "Premier Ministre", value: "Eitam" },
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
Delphinat]].

## La trahison de Baron, Swaylo et Stanislas

Sous le **IIIe Delphinat**, le Delphinat a été trahi de l'intérieur par
**Baron**, **Swaylo** et **Stanislas de Neustrie**, qui ont formé une
**alliance nulle** contre Gratianopolis.

Le Dauphin Esto **bannit les trois**. Le bannissement est la réponse du
souverain à une alliance qui n'avait aucune légitimité : elle n'a servi qu'à
affaiblir le Delphinat pour des intérêts personnels et étrangers.

Il faut souligner la chronologie, parce qu'elle est souvent confondue : cette
alliance appartient au **IIIe** Delphinat. Sous le [[2e-delphinat|IIe
Delphinat]], [[stanislas|Stanislas]] avait déjà été banni par
[[selios|Selios]], mais pour un tout autre motif — et à cette époque
[[baron|Baron]] était encore en bons termes avec le Delphinat, autorisé à
rester sur le serveur. Les deux bannissements n'ont ni la même date, ni le
même auteur, ni la même cause.

## Le camp pro-Esto

Pendant la [[grande-guerre-de-secession-delphinal|Grande Guerre de Sécession
Delphinal]], Esto est le chef du **camp pro-Esto**, opposé à la
[[regence-gratiennoise|Régence Gratiennoise]] de [[selios|Selios]].

C'est le second acte de sa fiche : il est celui que la
[[grande-guerre-de-secession-delphinal|GDEL]] désigne comme camps, et son
victoire rend le IIIe Delphinat **l'unique vainqueur** de l'armistice. Voir
[[grande-guerre-de-secession-delphinal]] et [[crise-politique-contemporaine]].

## Le soutien d'Eitam, devenu Premier Ministre

La rédaction indique qu'Esto est **soutenu par [[eitam|Eitam]]**, fondateur du
[[parti-revolutionnaire-socialiste-gratiennois|Parti Révolutionnaire Socialiste
Gratiennois]], qui est depuis devenu **Premier Ministre de Gratianopolis**.

Ce soutien est doublement significatif : il lie le Dauphin en exercice au
plus ancien membre de la communauté, et il associe le pouvoir à un parti qui
n'est pas le sien. Voir [[eitam]].

## Voir aussi

- [[la-constitution]]
- [[constitution-du-2e-delphinat]]
- [[la-chute-du-2e-delphinat]]
- [[grande-guerre-de-secession-delphinal]]
- [[regence-gratiennoise]]
- [[eitam]]`,
  },

  // =====================================================================
  // Bougre
  // =====================================================================
  {
    slug: "bougre",
    title: "Bougre",
    category: "personnalites",
    summary:
      "Ancien président devenu chef de la Junte Militaire, la dictature qui a gouverné Gratianopolis entre le Ier et le IIe Delphinat, renversée par le coup d'État de Math. Candidat malheureux au poste de Premier Ministre sous les couleurs du parti de Selios, battu par Eitam.",
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
        { label: "Candidature", value: "Premier Ministre — battu par Eitam" },
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
Delphinal]], aux côtés de [[voytec|Voytec]], [[capy|Capy]] et
[[style|Style]].

Le récit précise que [[style|Style]] a été ministre **aux côtés de Bougre**
pour imposer la [[republique-de-gratianopolis|République de
Gratianopolis]]. Bougre est donc un acteur de la première guerre civile, avant
d'être le dictateur de la Junte.

## Candidat malheureux au poste de Premier Ministre

Bougre a été **candidat au poste de Premier Ministre** sous les couleurs du
[[parti-union-de-premier-regime|Parti Union de Premier Régime]], le parti de
[[selios|Selios]]. Il a été **battu par [[eitam|Eitam]]**, devenu Premier
Ministre de Gratianopolis.

La candidature était politiquement parlante : l'ancien dictateur revenait dans
le jeu démocratique, et le parti qu'il portait est celui du fondateur
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
  // Swaylo — TRAÎTRE AU DELPHINAT
  // =====================================================================
  {
    slug: "swaylo",
    title: "Swaylo",
    category: "personnalites",
    summary:
      "Empereur de l'Empire parlementaire de Norlot. Sous le IIIe Delphinat, Swaylo a formé avec Baron et Stanislas de Neustrie une alliance nulle contre Gratianopolis : le Dauphin Esto l'a banni.",
    tags: ["swaylo", "norlot", "empereur", "bannissement", "alliance nulle", "IIIe delphinat"],
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
        { label: "Alliance", value: "Nulle, formée avec Baron et Stanislas sous le IIIe Delphinat" },
        { label: "Bannissement", value: "Par Esto, Dauphin du IIIe Delphinat" },
        { label: "Limite légale", value: "Inéligible au poste de Premier Ministre (article P-14)" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki.",
    },
    content: `# Swaylo

${LORE_SOURCE}

Swaylo est l'**Empereur de l'Empire parlementaire de Norlot**. Il est
principalement connu dans l'histoire du Delphinat pour avoir formé, **sous le
IIIe Delphinat**, une **alliance nulle** avec Baron et Stanislas de Neustrie
contre Gratianopolis — alliance que le Dauphin [[esto|Esto]] a sanctionnée par
le bannissement.

## Un traître au Delphinat

Swaylo a trahi le Delphinat de Gratianopolis. Son alliance avec Baron et
Stanislas de Neustrie était une **alliance nulle**, dénuée de toute
légitimité, qui n'a servi qu'à affaiblir le Delphinat pour des intérêts
étrangers et personnels.

La trahison de Swaylo est d'autant plus grave qu'il était l'Empereur d'une
micronation voisine : il a abusé de sa position internationale pour nuire
aux institutions delphinales.

## L'alliance nulle

L'alliance entre Swaylo, Baron et Stanislas de Neustrie est qualifiée de
**nulle** par la rédaction du wiki. Elle n'avait aucune base légitime, aucun
mandat populaire, et n'a produit que le chaos et l'affaiblissement du
Delphinat.

Elle appartient au **IIIe Delphinat**. C'est une précision de chronologie, pas
un détail : sous le [[2e-delphinat|IIe Delphinat]], Stanislas avait déjà été
banni par [[selios|Selios]] pour un motif non renseigné, et
[[baron|Baron]] était alors encore autorisé sur le serveur. L'alliance est
postérieure à cette période.

## Le bannissement par Esto

Le Dauphin [[esto|Esto]] **bannit les trois membres de l'alliance** : Swaylo,
Baron et Stanislas. C'est la sanction propre au IIIe Delphinat, et elle ne se
confond pas avec le bannissement antérieur de Stanislas par Selios.

## La sanction juridique

L'article P-14 de la [[constitution-du-2e-delphinat|Constitution du IIe
Delphinat]] interdit à **les chefs de micronation étrangère** de se présenter
à l'élection du [[le-premier-ministre|Premier Ministre]] de Gratianopolis.
Cette disposition anti-impérialiste maintient donc Swaylo **hors du pouvoir**
de Gratianopolis, à jamais.

Un Empereur qui a trahi le Delphinat ne peut donc pas, ensuite, gouverner
celui qu'il a trahi. La [[crise-politique-contemporaine|crise politique
contemporaine]] se déroule précisément sous cette règle.

## Voir aussi

- [[la-chute-du-2e-delphinat]]
- [[grande-guerre-de-secession-delphinal]]`,
  },

  // =====================================================================
  // Baron — TRAÎTRE AU DELPHINAT
  // =====================================================================
  {
    slug: "baron",
    title: "Baron",
    category: "personnalites",
    summary:
      "Ancien président de la République de Massivie, gardien des lois neustrien et ministre à Norlot. Sous le IIIe Delphinat, il a formé avec Swaylo et Stanislas une alliance nulle contre Gratianopolis : le Dauphin Esto l'a banni. Sous le IIe Delphinat, il était encore en bons termes avec le Delphinat.",
    tags: ["baron", "massivie", "neustrie", "norlot", "bannissement", "alliance nulle", "IIIe delphinat"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Personnalité",
      imageAlt: "Photo de profil Discord de Baron",
      imageCaption: "Portrait issu de l'API Discord du serveur officiel",
      fields: [
        { label: "Nom", value: "Baron" },
        {
          label: "Parcours",
          value: "Président de Massivie ; gardien des lois neustrien ; ministre à Norlot",
        },
        { label: "IIe Delphinat", value: "En bons termes avec le Delphinat, autorisé sur le serveur" },
        { label: "IIIe Delphinat", value: "Alliance nulle avec Swaylo et Stanislas" },
        { label: "Bannissement", value: "Par Esto, Dauphin du IIIe Delphinat" },
        { label: "Rôle militaire", value: "Chef du Conseil pendant la première Guerre Delphinal" },
      ],
      footer:
        "Photographie : API Discord. Biographie : récit de la rédaction du wiki.",
    },
    content: `# Baron

${LORE_SOURCE}

Baron a exercé des fonctions dans **trois micronations** avant de diriger le
Conseil du Delphinat. Son parcours est long, et il ne se réduit pas à sa
trahison : c'est précisément ce qui la rend lourde.

## Un parcours dans trois micronations

### République de Massivie

Baron a été **président de la République de Massivie** — la fonction la plus
haute de sa carrière civile.

### Neustrie

Baron a été **gardien des lois neustrien**, charge judiciaire de la monarchie
de [[stanislas|Stanislas]].

### Norlot

Baron a été **ministre** dans l'Empire parlementaire de Norlot, sous
[[swaylo|Swaylo]].

## Chef du Conseil pendant la première Guerre Delphinal

Baron est **chef du Conseil** pendant la [[1ere-guerre-delphinal|première
Guerre Delphinal]], aux côtés de [[voytec|Voytec]], [[capy|Capy]],
[[bougre|Bougre]] et [[style|Style]].

## Sous le IIe Delphinat, il était en bons termes

Point de chronologie souvent confondu : sous le [[2e-delphinat|IIe Delphinat]],
Baron **n'est pas un adversaire du Delphinat**. Il est encore en bons termes
avec lui et **autorisé à rester sur le serveur**. La rédaction ne lui impute
rien dans la [[la-chute-du-2e-delphinat|chute du IIe Delphinat]].

Le bannissement de [[stanislas|Stanislas]] par [[selios|Selios]] appartient à
cette période, mais il ne vise que Stanislas, et pour un motif non renseigné.

## L'alliance nulle, sous le IIIe Delphinat

C'est **plus tard**, sous le [[histoire-du-delphinat|IIIe Delphinat]], que
Baron forme avec Swaylo et Stanislas une **alliance nulle** contre
Gratianopolis. Elle n'avait aucune base légitime, aucun mandat populaire, et
n'a produit que l'affaiblissement du Delphinat.

## Le bannissement par Esto

Le Dauphin [[esto|Esto]] **bannit les trois membres de l'alliance** : Baron,
Swaylo et Stanislas. C'est la sanction du IIIe Delphinat, et elle ne se
confond pas avec le bannissement antérieur de Stanislas par Selios.

## Voir aussi

- [[esto]]
- [[swaylo]]
- [[stanislas]]
- [[1ere-guerre-delphinal]]
- [[histoire-du-delphinat]]`,
  },
];
