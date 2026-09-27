import type { Article } from "./types";

/**
 * Chapitres de récit et entités géopolitiques.
 *
 * Ce module complète `seed-history.ts`, qui couvre déjà les trois règnes et la
 * chute du IIe Delphinat. Il rassemble ici ce que le récit appelle
 * explicitement : les deux guerres, la République qui les a suivies, la
 * [[grande-repression]], la [[regence-gratiennoise]], la crise politique
 * contemporaine, les micronations voisines et les deux partis en lice.
 *
 * **Même règle éditoriale que ailleurs** : ces pages relatent ce que la
 * rédaction a transmis. Elles sont attribuées, et ce qui n'est pas documenté
 * est écrit « non renseigné ». Aucune date n'est inventée : le récit n'en
 * donne aucune, et l'ordre des événements est établi par la configuration
 * partagée (`shared/roster.json`).
 */

/** Mention de source des pages de récit historique. */
const HISTORY_SOURCE =
  "> Source : récit de la rédaction du wiki. Aucune date n'est établie par une " +
  "source écrite : les périodes sont ordonnées, pas datées.";

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

export const SEED_CHAPTER_ARTICLES: Article[] = [
  // =====================================================================
  // Guerres et régimes intermédiaires
  // =====================================================================
  {
    slug: "1ere-guerre-delphinal",
    title: "La première Guerre Delphinal",
    category: "histoire",
    summary:
      "Guerre civile de Gratianopolis dont l'issue fut l'imposition de la République, et à laquelle participèrent Voytec, Capy, Baron, Bougre et Style.",
    tags: ["1ère guerre delphinal", "guerre civile", "république"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Événement",
      fields: [
        { label: "Type", value: "Guerre civile" },
        { label: "Lieu", value: "Gratianopolis" },
        { label: "Issue", value: "Imposition de la République de Gratianopolis" },
        {
          label: "Principaux acteurs",
          value: "Voytec, Capy, Baron, Bougre et Style",
        },
        { label: "Dates", value: "Non renseignées" },
        { label: "Victimes", value: "Non renseignées" },
      ],
      footer: "Récit de la rédaction du wiki.",
    },
    content: `# La première Guerre Delphinal

${HISTORY_SOURCE}

La **première Guerre Delphinal** est le premier conflit de l'histoire de
Gratianopolis. Son issue est l'**imposition de la
[[republique-de-gratianopolis|République de Gratianopolis]]**.

## Les acteurs

La rédaction nomme **cinq** figures de cette guerre :

- [[voytec|Voytec]] ;
- [[capy|Capy]] ;
- [[baron|Baron]], **chef du Conseil** pendant le conflit ;
- [[bougre|Bougre]] ;
- [[style|Style]], **ministre** aux côtés de Baron et de Bougre.

Baron est donc à la tête du Conseil, et Style ministre : la guerre a un
**état-major** et un **gouvernement**, ce qui explique qu'elle ait pu produire
un régime et pas seulement une victoire.

## L'issue

L'issue de la guerre est l'**imposition de la République**. Voir
[[republique-de-gratianopolis]].

## Une guerre, puis une dictature

La première Guerre Delphinal est suivie d'une période plus dure :
la [[la-junte-militaire|Junte Militaire]] de [[bougre|Bougre]]. La lecture
d'ensemble est celle d'une instabilité persistante : une guerre civile, puis
une dictature, puis le retour du régime delphinal avec le
[[2e-delphinat|IIe Delphinat]].

## Ce que le récit ne dit pas

La rédaction ne précise ni la durée de la guerre, ni ses causes, ni son
déroulement, ni les camps, ni les treatises. Ces éléments sont **non
renseignés**. La page est donc volontairement courte : elle décrit ce que le
récit établit, et signale le reste.

## Voir aussi

- [[republique-de-gratianopolis]]
- [[baron]]
- [[bougre]]
- [[style]]
- [[voytec]]
- [[capy]]
- [[la-junte-militaire]]`,
  },

  {
    slug: "republique-de-gratianopolis",
    title: "République de Gratianopolis",
    category: "histoire",
    summary:
      "République imposée à l'issue de la première Guerre Delphinal, dans laquelle Style fut ministre aux côtés de Baron et de Bougre.",
    tags: ["république", "1ère guerre delphinal", "régime historique"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Régime historique",
      fields: [
        { label: "Nature", value: "République" },
        { label: "Origine", value: "Imposée à l'issue de la première Guerre Delphinal" },
        { label: "Ministre", value: "Style, aux côtés de Baron et de Bougre" },
        { label: "Durée", value: "Non renseignée" },
        { label: "Texte fondateur", value: "Non renseigné" },
      ],
      footer: "Récit de la rédaction du wiki.",
    },
    content: `# République de Gratianopolis

${HISTORY_SOURCE}

La **République de Gratianopolis** est le régime qui a été **imposé** à
l'issue de la [[1ere-guerre-delphinal|première Guerre Delphinal]]. Elle
succède au régime delphinal du [[ier-delphinat|Ier Delphinat]] et précède la
[[la-junte-militaire|Junte Militaire]].

## Un régime imposé, pas fondé

La formule du récit est « imposer la République » : la République ne naît pas
d'un vote constituant, elle est **le résultat d'une guerre**. C'est ce qui la
distingue des deux autres formes de gouvernement qu'a connues Gratianopolis —
le pouvoir delphinal, héréditaire et ritualisé, et la Junte, militaire.

## Le gouvernement de la République

La rédaction situe [[style|Style]] comme **ministre** de cette République,
« aux côtés de [[baron|Baron]] et de [[bougre|Bougre]] ».

C'est le seul élément documenté sur la structure de ce gouvernement. Le
récit ne précise ni la composition du gouvernement, ni le mandat de Style,
ni la manière dont la République a pris fin. Ces éléments sont **non
renseignés**.

## La fin de la République

La République cède la place à la [[la-junte-militaire|Junte Militaire]] de
[[bougre|Bougre]]. Le récit ne dit pas si cette transition s'est faite par
élection, par coup de force ou par simple évolution interne : c'est
**non renseigné**.

## Voir aussi

- [[1ere-guerre-delphinal]]
- [[style]]
- [[baron]]
- [[bougre]]
- [[la-junte-militaire]]
- [[ier-delphinat]]`,
  },

  {
    slug: "grande-repression",
    title: "La Grande Répression",
    category: "histoire",
    summary:
      "Opération de répression instiguée par Selios depuis le sommet de l'État, dans le contexte du IIe Delphinat.",
    tags: ["grande répression", "selios", "2e delphinat", "répression"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Événement",
      fields: [
        { label: "Type", value: "Répression d'État" },
        { label: "Instigateur", value: "Selios" },
        { label: "Contexte", value: "IIe Delphinat" },
        { label: "Périodes", value: "Non renseignée" },
        { label: "Cibles", value: "Non renseignées" },
        { label: "Bilan", value: "Non renseigné" },
      ],
      footer: "Récit de la rédaction du wiki.",
    },
    content: `# La Grande Répression

${HISTORY_SOURCE}

La **Grande Répression** est une opération de répression dont l'
**instigateur** est [[selios|Selios]], Dauphin du [[2e-delphinat|IIe
Delphinat]].

## Un acte décidé depuis le sommet

La rédaction emploie un terme juridique précis : Selios en est
l'**instigateur**. Cela le distingue de ceux qui l'ont exécutée, et en fait
le décideur.

Le récit ne précise ni la date, ni la durée, ni les personnes visées, ni les
actes commis, ni le bilan. Tous ces éléments sont **non renseignés**.

## Son lien avec la chute du IIe Delphinat

La Grande Répression appartient au récit de la
[[la-chute-du-2e-delphinat|chute du IIe Delphinat]]. Selios est en effet
mis en cause dans cette chute à travers deux actes : la Grande Répression et
le **bannissement de [[stanislas|Stanislas]]**, Roi de [[neustrie|Neustrie]].

Le second de ces actes est celui qui a des conséquences internationales
directes, puisqu'il déclenche « un raid fatal ».

## Ce qui manque à cette page

Cette page est **volontairement courte**. La rédaction a transmis l'existence
et l'auteur de la Grande Répression, mais pas son contenu. Compléter une
école de répression à partir d'un récit de communauté sans source reviendrait à
inventer : c'est pourquoi les champs non documentés sont laissés
« non renseignés » plutôt que comblés.

## Voir aussi

- [[selios]]
- [[2e-delphinat]]
- [[la-chute-du-2e-delphinat]]
- [[stanislas]]
- [[neustrie]]`,
  },

  {
    slug: "grande-guerre-de-secession-delphinal",
    title: "La Grande Guerre de Sécession Delphinal",
    category: "histoire",
    summary:
      "Conflit final entre le camp pro-Esto, soutenu par Eitam, Baron et Swaylo, et la Régence Gratiennoise de Selios, soldé par un armistice qui fait du IIIe Delphinat l'unique vainqueur.",
    tags: ["guerre de sécession", "armistice", "régence", "3e delphinat"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Événement",
      fields: [
        { label: "Type", value: "Guerre de sécession" },
        { label: "Camp pro-Esto", value: "Esto, avec Eitam, Baron et Swaylo" },
        { label: "Camp adverse", value: "La Régence Gratiennoise de Selios" },
        { label: "Issue", value: "Armistice" },
        { label: "Résultat", value: "Le IIIe Delphinat est l'unique vainqueur" },
        { label: "Dates", value: "Non renseignées" },
      ],
      footer: "Récit de la rédaction du wiki.",
    },
    content: `# La Grande Guerre de Sécession Delphinal

${HISTORY_SOURCE}

La **Grande Guerre de Sécession Delphinal** est le conflit final de
l'histoire de Gratianopolis. Elle oppose le **camp pro-Esto** à la
**[[regence-gratiennoise|Régence Gratiennoise]]** de [[selios|Selios]], et se
termine par un **armistice**.

## Les deux camps

### Le camp pro-Esto

Il est mené par [[esto|Esto]] et réunit :

- [[eitam|Eitam]], qui revient « en force » ;
- [[baron|Baron]] ;
- [[swaylo|Swaylo]], Empereur de l'[[norlot|Empire parlementaire de
  Norlot]].

### La Régence Gratiennoise

Elle est menée par [[selios|Selios]], qui dirige la
[[regence-gratiennoise|Régence Gratiennoise]] en parallèle d'un
[[2e-delphinat|IIe Delphinat]] dont il est Dauphin.

## Le rôle d'Eitam

La rédaction prête à [[eitam|Eitam]] un **retour triomphal** : il revient
avec force au secours du camp pro-Esto.

C'est le seul moment du récit où ses départs et retours legendary trouvent
une raison. Voir [[eitam]].

## L'armistice

La guerre **s'achève par un armistice** qui « consacre définitivement le
**IIIe Delphinat comme la seule et unique entité souveraine** ».

La formule est remarquable, et il faut la lire exactement : l'armistice ne
dissout pas la Régence, il proclame la souveraineté exclusive du
IIIe Delphinat. Le IIIe Delphinat est donc **l'unique vainqueur**, et la
Régence n'est pas vaincue : elle est écartée.

## Ce que le récit ne dit pas

La durée, les dates, les opérations, les pertes, le contenu exact de
l'armistice et le sort de la Régence après sa signature ne sont pas
documentés. Ces éléments sont **non renseignés**.

## Voir aussi

- [[esto]]
- [[selios]]
- [[eitam]]
- [[baron]]
- [[swaylo]]
- [[regence-gratiennoise]]
- [[les-trois-delphinats]]`,
  },

  {
    slug: "regence-gratiennoise",
    title: "La Régence Gratiennoise",
    category: "histoire",
    summary:
      "Gouvernement parallèle dirigé par Selios, établi face à l'installation du IIIe Delphinat et vaincu à l'armistice de la Grande Guerre de Sécession Delphinal.",
    tags: ["régence", "selios", "guerre de sécession", "régime rival"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Régime rival",
      fields: [
        { label: "Nature", value: "Gouvernement parallèle" },
        { label: "Chef", value: "Selios" },
        { label: "Rival", value: "Le IIIe Delphinat" },
        { label: "Fin", value: "Armistice de la Grande Guerre de Sécession Delphinal" },
        { label: "Composition", value: "Non renseignée" },
        { label: "Reprise en main", value: "Tentative de Selios, non aboutie" },
      ],
      footer: "Récit de la rédaction du wiki.",
    },
    content: `# La Régence Gratiennoise

${HISTORY_SOURCE}

La **Régence Gratiennoise** est le gouvernement rival dirigé par
[[selios|Selios]], établi **pendant** l'installation du
[[histoire-du-delphinat|IIIe Delphinat]].

## Deux pouvoirs en parallèle

La Régence est la forme exacte du « deux en même temps » que le récit
attribue à Selios : il reste le Dauphin d'un [[2e-delphinat|IIe Delphinat]]
disparu, tout en dirigeant un gouvernement parallèle pendant que le IIIe
Delphinat s'installe.

C'est ce qui rend sa situation unique : [[selios|Selios]] est
**simultanément** le Dauphin d'un régime disparu et le chef d'un régime
qui ne l'est pas.

## La tentative de Selios de la maintenir

La rédaction indique que Selios a tenté de **maintenir une Régence
Gratiennoise rivale pendant que s'établit le IIIe Delphinat**. La
formulation est importante : il s'agit d'une **tentative**, dont l'issue
n'est pas donnée ici.

## La défaite

La Régence est le camp adverse de la
[[grande-guerre-de-secession-delphinal|Grande Guerre de Sécession
Delphinal]]. L'armistice qui suit « consacre définitivement le IIIe Delphinat
comme la seule et unique entité souveraine ».

Autrement dit, la Régence ne perd pas une guerre : elle perd la
reconnaissance de la souveraineté. Voir
[[grande-guerre-de-secession-delphinal]].

## Voir aussi

- [[selios]]
- [[2e-delphinat]]
- [[grande-guerre-de-secession-delphinal]]
- [[les-trois-delphinats]]`,
  },

  {
    slug: "crise-politique-contemporaine",
    title: "La crise politique contemporaine",
    category: "histoire",
    summary:
      "Crise ouverte par la destitution unanime du Premier Ministre Frenchserbian, et qui oppose aujourd'hui Eitam et Bougre dans une campagne électorale sous haute tension.",
    tags: ["crise politique", "élections", "premier ministre", "frenchserbian"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Crise en cours",
      fields: [
        { label: "Origine", value: "Destitution unanime du Premier Ministre Frenchserbian" },
        { label: "Vote", value: "100 % contre" },
        { label: "Camp A", value: "Eitam, Parti Révolutionnaire Socialiste Gratiennois" },
        { label: "Camp B", value: "Bougre, Parti Union de Premier Régime de Selios" },
        { label: "Enjeu", value: "Le poste de Premier Ministre" },
        { label: "Issue", value: "Non renseignée — scrutin en cours" },
      ],
      footer: "Récit de la rédaction du wiki. Page mise à jour par la rédaction.",
    },
    content: `# La crise politique contemporaine

${HISTORY_SOURCE}

La **crise politique contemporaine** est la situation dans laquelle se trouve
le [[histoire-du-delphinat|IIIe Delphinat]]. Elle a une cause précise, et une
conséquence : une campagne électorale.

## La cause : une destitution à 100 %

Le Premier Ministre [[frenchserbian|Frenchserbian]] a été **destitué à 100 %**
lors d'un vote qualifié d'**historique** par la rédaction.

Un vote à 100 % ne laisse pas de majorité de reproche : il constate un
désaccord complet. La rédaction ne précise ni qui a voté, ni par quel
procédé la destitution a été prononcée, ni le motif. Ces éléments sont **non
renseignés**. Voir [[frenchserbian]] et [[le-premier-ministre]].

## La conséquence : la vacance

Sans Premier Ministre, le [[le-premier-ministre|gouvernement]] est vacance. Le
récit présente cette vacance comme l'ouverture d'une campagne, et non comme
une simple querelle administrative.

## La campagne : deux candidats, deux partis

La campagne oppose **deux** candidats, chacun associé à un parti.

### Eitam — Parti Révolutionnaire Socialiste Gratiennois

[[eitam|Eitam]] se présente sous l'étiquette du
[[parti-revolutionnaire-socialiste-gratiennois|Parti Révolutionnaire Socialiste
Gratiennois]], qu'il a lui-même fondé, présenté par la rédaction comme **le
tout premier parti du serveur**. Voir [[eitam]].

### Bougre — Parti Union de Premier Régime

[[bougre|Bougre]] se présente sous les couleurs du
[[parti-union-de-premier-regime|Parti Union de Premier Régime]], le parti de
[[selios|Selios]]. Voir [[bougre]].

## Une campagne sous haute tension

La rédaction décrit la campagne comme se déroulant « **sous haute
tension** ».

Trois éléments expliquent cette tension, et tous sont internes à
l'histoire du Delphinat :

1. l'un des deux candidats est l'**ancien dictateur** de la
   [[la-junte-militaire|Junte Militaire]] ;
2. l'autre est le **Dauphin actuel**, dont le bilan est entaché par la
   [[la-chute-du-2e-delphinat|chute du IIe Delphinat]] dont il est tenu
   responsable ;
3. le scrutin porte sur le poste qui a justement vacanté par une destitution
   unanime.

## Un obstacle juridique pour Swaylo

La campagne se déroule sous l'article P-14 de la
[[constitution-du-2e-delphinat|Constitution du IIe Delphinat]] : un **chef
de micronation étrangère** ne peut pas se présenter au poste de Premier
Ministre. Cette règle maintient donc [[swaylo|Swaylo]] hors du combat, malgré
son poids dans la
[[grande-guerre-de-secession-delphinal|guerre de sécession]].

## L'issue

Le récit ne donne pas le résultat du scrutin. L'issue est **non renseignée** :
la campagne est en cours.

## Voir aussi

- [[frenchserbian]]
- [[eitam]]
- [[bougre]]
- [[selios]]
- [[parti-revolutionnaire-socialiste-gratiennois]]
- [[parti-union-de-premier-regime]]
- [[le-premier-ministre]]`,
  },

  // =====================================================================
  // Micronations voisines
  // =====================================================================
  {
    slug: "neustrie",
    title: "Neustrie",
    category: "geographie",
    summary:
      "Micronation monarchique voisine de Gratianopolis, gouvernée par Stanislas, dont le souverain a été banni par Selios.",
    tags: ["neustrie", "stanislas", "monarchie", "micronation"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Micronation",
      fields: [
        { label: "Nature", value: "Monarchie" },
        { label: "Souverain", value: "Stanislas, Roi de Neustrie" },
        { label: "Lien avec Gratianopolis", value: "Bannissement du souverain par Selios" },
        { label: "Fonctionnaire connu", value: "Baron, ancien gardien des lois" },
        { label: "Localisation", value: "Non renseignée" },
        { label: "Population", value: "Non renseignée" },
      ],
      footer: "Récit de la rédaction du wiki.",
    },
    content: `# Neustrie

${HISTORY_SOURCE}

**Neustrie** est une micronation **monarchique** voisine de Gratianopolis.
Son souverain est [[stanislas|Stanislas]], **Roi de Neustrie**.

## Un royaume, et non une république

La qualification est nette : Neustrie est une monarchie, là où
[[massivie|Massivie]] est une [[massivie|république]] et
[[norlot|Norlot]] un empire parlementaire. Les trois régimes voisins sont
donc de natures différentes.

## Le bannissement de son souverain

La [[neustrie|Neustrie]] est une micronation dont le souverain a été
**banni de Gratianopolis** par [[selios|Selios]].

Ce bannissement a des conséquences directes : il provoque « un **raid
fatal** » et **sonne le glas du [[2e-delphinat|IIe Delphinat]]**. Voir
[[stanislas]] et [[la-chute-du-2e-delphinat]].

## Un lien institutionnel : le gardien des lois

[[baron|Baron]] a été **gardien des lois neustrien** : il a donc exercé une
fonction de l'État de [[stanislas|Stanislas]], avant d'être un acteur de la
politique de Gratianopolis. Voir [[baron]].

## Ce qui n'est pas documenté

La localisation, la population, l'histoire propre de Neustrie, la nature de la
fonction de « gardien des lois » et les conséquences du bannissement du roi
du côté neustrien ne sont pas documentées. Ces éléments sont **non
renseignés**.

## Voir aussi

- [[stanislas]]
- [[selios]]
- [[baron]]
- [[2e-delphinat]]
- [[la-chute-du-2e-delphinat]]`,
  },

  {
    slug: "massivie",
    title: "République de Massivie",
    category: "geographie",
    summary:
      "Micronation voisine de Gratianopolis, de forme républicaine, dont [[baron|Baron]] fut président.",
    tags: ["massivie", "république", "micronation", "baron"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Micronation",
      fields: [
        { label: "Nature", value: "République" },
        { label: "Ancien président", value: "Baron" },
        { label: "Lien avec Gratianopolis", value: "Aucun documenté" },
        { label: "Localisation", value: "Non renseignée" },
        { label: "Population", value: "Non renseignée" },
      ],
      footer: "Récit de la rédaction du wiki.",
    },
    content: `# République de Massivie

${HISTORY_SOURCE}

La **République de Massivie** est une micronation voisine de Gratianopolis. Sa
forme est **républicaine**, et son ancien président est [[baron|Baron]].

## La présidence de Baron

Baron a été **président de la République de Massivie**. C'est la fonction la
plus élevée qu'il ait occupée, et elle précède dans sa carrière ses fonctions
à [[neustrie|Neustrie]] et à [[norlot|Norlot]]. Voir [[baron]].

## Un contraste instructif

Le parcours de Baron est un résumé de la géopolitique de la région :

| Micronation | Régime | Fonction de Baron |
| --- | --- | --- |
| [[massivie|Massivie]] | République | Président |
| [[neustrie|Neustrie]] | Monarchie | Gardien des lois |
| [[norlot|Norlot]] | Empire parlementaire | Ministre |
| Gratianopolis | Délphinat | Chef du Conseil, puis acteur du IIIe Delphinat |

Baron a donc exercé le **plus haut pouvoir civil** d'une république, avant de
servir des monarchies et un empire.

## Ce qui n'est pas documenté

La localisation, la population, l'histoire de Massivie, la durée du mandat de
Baron et la raison pour laquelle il l'a quitté ne sont pas documentées. Ces
éléments sont **non renseignés**.

## Voir aussi

- [[baron]]
- [[neustrie]]
- [[norlot]]`,
  },

  // =====================================================================
  // Partis politiques
  // =====================================================================
  {
    slug: "le-premier-ministre",
    title: "Le Premier Ministre",
    category: "institutions",
    summary:
      "Charge gouvernementale élue par la Nation, actuellement vacante depuis la destitution unanime de Frenchserbian : c'est l'enjeu de la campagne opposant Eitam et Bougre.",
    tags: ["premier ministre", "gouvernement", "élections", "motion de censure"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Charge gouvernementale",
      fields: [
        { label: "Nature", value: "Charge gouvernementale élue" },
        { label: "Élection", value: "Vote démocratique de l'ensemble de la Nation" },
        { label: "Mandat", value: "2 mois (1 mois sous le Règlement du Ier Delphinat)" },
        { label: "Pouvoirs", value: "Nommer un Gouvernement" },
        { label: "Censure", value: "Par le Dauphin, sur motion du Conseil" },
        { label: "Titulaire actuel", value: "Aucun — poste vacant" },
        { label: "Dernier titulaire", value: "Frenchserbian, destitué à 100 %" },
        { label: "Candidats", value: "Eitam et Bougre" },
      ],
      footer:
        "Cadre juridique : Constitution en vigueur et Constitution du IIe Delphinat. " +
        "État de la fonction : récit de la rédaction.",
    },
    content: `# Le Premier Ministre

${HISTORY_SOURCE}

Le **Premier Ministre** est la charge gouvernementale du Delphinat. Il est
**élu par un vote démocratique de l'ensemble de la Nation**, et non nommé
par le Dauphin : c'est ce qui distingue cette charge de toutes les autres.

## Le cadre juridique

D'après la [[constitution-du-2e-delphinat|Constitution du IIe Delphinat]] et la
[[la-constitution|Constitution en vigueur]] :

- le **Premier Ministre est élu** par un vote démocratique de l'ensemble de la
  Nation ;
- son **mandat dure deux mois** ;
- il doit donc présenter un **programme de deux mois** ;
- s'il n'a pas terminé son programme, le Premier Ministre suivant peut reprendre
  ce qui n'a pas été terminé ;
- il peut **nommer un Gouvernement** et inviter d'autres membres à le
  remplir ;
- le [[le-dauphin|Dauphin]] peut prononcer une **motion de censure** s'il
  n'est pas conforme à la Constitution ;
- le [[le-conseil-delphinal|Conseil delphinal]] peut **demander** une motion
  de censure, mais le Dauphin doit l'approuver.

Sous le [[reglement-du-ier-delphinat|Règlement du Ier Delphinat]], le mandat
était d'**un mois** et le Premier Ministre était **membre observateur** du
Conseil delphinal. La fonction diffère sur deux points de celle du Règlement du Ier : le mandat passe d'un mois à deux, et le Premier Ministre cesse d'être un simple membre observateur du Conseil pour disposer du pouvoir de nommer un Gouvernement.

## Un siège actuellement vacant

Le poste est **vacant**. [[frenchserbian|Frenchserbian]], dernier titulaire, a
été **destitué à 100 %** par un vote historique.

Le récit ne précise pas si la destitution a été prononcée par la voie du
Dauphin ou par celle du Conseil. C'est **non renseigné**. Voir
[[frenchserbian]].

## L'élection en cours

La vacance ouvre la [[crise-politique-contemporaine|crise politique
contemporaine]] et une campagne pour le poste. Deux candidats sont en lice :

- [[eitam|Eitam]], sous l'étiquette du
  [[parti-revolutionnaire-socialiste-gratiennois|Parti Révolutionnaire Socialiste
  Gratiennois]] ;
- [[bougre|Bougre]], sous celle du
  [[parti-union-de-premier-regime|Parti Union de Premier Régime]].

L'issue du scrutin est **non renseignée**.

## L'interdiction de l'article P-14

L'article P-14 de la [[constitution-du-2e-delphinat|Constitution du IIe
Delphinat]] interdit à **les chefs de micronation étrangère** de se présenter
à l'élection du Premier Ministre, « pour éviter des influences ou du contrôle
sur Gratianopolis ».

Cette règle écarte [[swaylo|Swaylo]] du scrutin, alors même qu'il a été
l'allié décisif de la
[[grande-guerre-de-secession-delphinal|guerre de sécession]]. Voir
[[swaylo]] et [[norlot]].

## Voir aussi

- [[le-dauphin]]
- [[le-conseil-delphinal]]
- [[frenchserbian]]
- [[crise-politique-contemporaine]]
- [[eitam]]
- [[bougre]]
- [[la-constitution]]`,
  },

  {
    slug: "parti-revolutionnaire-socialiste-gratiennois",
    title: "Parti Révolutionnaire Socialiste Gratiennois",
    category: "institutions",
    summary:
      "Premier parti fondé sur le serveur de Gratianopolis, créé par Eitam, et qui porte sa candidature au poste de Premier Ministre.",
    tags: ["prsg", "parti politique", "eitam", "élections"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Parti politique",
      fields: [
        { label: "Nom", value: "Parti Révolutionnaire Socialiste Gratiennois" },
        { label: "Sigle", value: "PRSG" },
        { label: "Fondateur", value: "Eitam" },
        { label: "Distinction", value: "Premier parti fondé sur le serveur" },
        { label: "Candidat", value: "Eitam, au poste de Premier Ministre" },
        { label: "Programme", value: "Non renseigné" },
      ],
      footer: "Récit de la rédaction du wiki.",
    },
    content: `# Parti Révolutionnaire Socialiste Gratiennois

${HISTORY_SOURCE}

Le **Parti Révolutionnaire Socialiste Gratiennois** est un parti politique
fondé par [[eitam|Eitam]], que la rédaction présente comme **le tout premier
parti fondé sur le serveur** de Gratianopolis.

## Un parti fondateur

Créer un parti est un acte institutionnel, pas un acte de gouvernement :
le premier parti n'appartient à personne en particulier, il précède les
autres. C'est ce que souligne la rédaction en le décrivant comme le premier.

## Le candidat

Le parti porte la candidature d'[[eitam|Eitam]] au poste de
[[le-premier-ministre|Premier Ministre]] dans le cadre de la
[[crise-politique-contemporaine|crise politique contemporaine]]. Le
programme du parti est **non renseigné**.

## L'adversaire

Le PRSG s'oppose au
[[parti-union-de-premier-regime|Parti Union de Premier Régime]], qui porte
la candidature de [[bougre|Bougre]]. Voir [[crise-politique-contemporaine]].

## Voir aussi

- [[eitam]]
- [[parti-union-de-premier-regime]]
- [[bougre]]
- [[crise-politique-contemporaine]]`,
  },

  {
    slug: "analyse-automatique",
    title: "L'analyse automatique du wiki",
    category: "institutions",
    summary:
      "Dispositif par lequel une intelligence artificielle lit les salons de parti et rédige des propositions de mise à jour, toujours validées par un humain avant publication.",
    tags: ["analyse automatique", "intelligence artificielle", "salons de parti", "rédaction"],
    author: "Rédaction du wiki",
    createdAt: iso(0),
    updatedAt: iso(0),
    infobox: {
      caption: "Dispositif",
      fields: [
        { label: "Nature", value: "Aide à la rédaction, supervisée" },
        { label: "Source", value: "Les trois salons de parti du serveur Discord" },
        { label: "Sortie", value: "Propositions d'articles, en attente de relecture" },
        { label: "Publication", value: "Uniquement après validation d'un rédacteur" },
        { label: "Modèle", value: "Gemini (Google Generative AI)" },
      ],
      footer:
        "Une intelligence automatique prépare ; la rédaction décide. " +
        "Aucun texte qu'elle propose n'est public avant validation.",
    },
    content: `# L'analyse automatique du wiki

> Source : description technique du dispositif, rédigée par la rédaction du wiki.

Le wiki dispose d'un dispositif d'**analyse automatique** : une intelligence
artificielle lit les débats des **salons de parti** et rédige des propositions
de mise à jour des pages.

## Ce que l'IA fait

Elle lit les messages de ces trois salons :

- [[parti-revolutionnaire-socialiste-gratiennois|Parti Socialiste Révolutionnaire
  Gratiennois]] ;
- [[parti-union-de-premier-regime|Parti Union de Premier Régime]] ;
- [[parti-liberaux-democrates-de-frenchserbian|Parti Les Libéraux Démocrates de
  Frenchserbian]].

Elle en tire une proposition de mise à jour pour la page du parti concerné :
un résumé, une section, des étiquettes, et surtout les **citations** des
messages qui justifient chaque affirmation.

## Ce que l'IA ne fait pas

Elle ne publie rien. Chaque proposition est enregistrée comme une page
distincte, invisible du site, qui attend une décision : **publier**, **corriger**
ou **rejeter**. Le rôle se trouve dans l'espace d'édition, à la rubrique
*Analyse automatique*.

Ce partage n'est pas une précaution de façade. Un modèle qui écrirait
directement dans les pages pourrait, sur la foi d'un message trompeur, y faire
figurer une accusation comme un fait établi. On lui impose donc de ne rien
déduire qui ne figure dans les messages, de citer ses sources, et de distinguer
ce qui est **avéré** de ce qu'un membre **affirme**. Quand elle n'a rien de neuf
à dire, son silence est une réponse valide.

## Les pages concernées

| Salon | Page alimentée |
| --- | --- |
| Parti Socialiste Révolutionnaire Gratiennois | [[parti-revolutionnaire-socialiste-gratiennois]] |
| Parti Union de Premier Régime | [[parti-union-de-premier-regime]] |
| Parti Les Libéraux Démocrates de Frenchserbian | [[parti-liberaux-democrates-de-frenchserbian]] |

L'analyse peut aussi porter sur la [[crise-politique-contemporaine|crise
politique contemporaine]] et sur l'[[histoire-du-delphinat|histoire récente du
Delphinat]].

## Voir aussi

- [[crise-politique-contemporaine]]
- [[parti-revolutionnaire-socialiste-gratiennois]]
- [[parti-union-de-premier-regime]]
- [[parti-liberaux-democrates-de-frenchserbian]]`,
  },

  {
    slug: "parti-liberaux-democrates-de-frenchserbian",
    title: "Parti Les Libéraux Démocrates de Frenchserbian",
    category: "institutions",
    summary:
      "Parti politique fondé par Frenchserbian, dont le titre renvoie à l'ancien Premier Ministre destitué qui a ouvert la campagne électorale du IIIe Delphinat.",
    tags: ["frenchserbian", "parti politique", "libéraux", "élections"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Parti politique",
      fields: [
        { label: "Nom", value: "Parti Les Libéraux Démocrates de Frenchserbian" },
        { label: "Fondateur", value: "Frenchserbian" },
        { label: "Salon Discord", value: "Parti Les Libéraux Démocrates de Frenchserbian" },
        { label: "Candidat", value: "Non renseigné" },
        { label: "Programme", value: "Non renseigné" },
      ],
      footer: "Récit de la rédaction du wiki.",
    },
    content: `# Parti Les Libéraux Démocrates de Frenchserbian

${HISTORY_SOURCE}

Le **Parti Les Libéraux Démocrates de Frenchserbian** est un parti politique
fondé par [[frenchserbian|Frenchserbian]], ancien
[[le-premier-ministre|Premier Ministre]] du
[[histoire-du-delphinat|IIIe Delphinat]].

## Un parti fondé par un destitué

La fondation du parti est directement liée à la
[[crise-politique-contemporaine|crise politique contemporaine]] :
[[frenchserbian|Frenchserbian]] a été **destitué à 100 %** lors d'un vote
historique, et le parti qui porte son nom se constitue dans le sillage de
cette destitution. Voir [[frenchserbian]].

## Les autres forces en lice

Le parti dispute la campagne aux deux autres formations déclarées :

- le [[parti-revolutionnaire-socialiste-gratiennois|Parti Révolutionnaire
  Socialiste Gratiennois]] de [[eitam|Eitam]] ;
- le [[parti-union-de-premier-regime|Parti Union de Premier Régime]] de
  [[selios|Selios]], porté par [[bougre|Bougre]].

## Un programme à documenter

La rédaction n'a pas encore transmis le programme de ce parti, ni le nom d'un
candidat, ni l'orientation détaillée de ses travaux. Ces éléments sont **non
renseignés** et la page est volontairement brève sur ce point.

C'est précisément l'une des pages que l'[[analyse-automatique|analyse
automatique]] des salons de parti propose de mettre à jour : le contenu
actuellement public de cette page est un point de départ, pas un point final.

## Voir aussi

- [[frenchserbian]]
- [[crise-politique-contemporaine]]
- [[le-premier-ministre]]
- [[parti-revolutionnaire-socialiste-gratiennois]]
- [[parti-union-de-premier-regime]]`,
  },

  {
    slug: "parti-union-de-premier-regime",
    title: "Parti Union de Premier Régime",
    category: "institutions",
    summary:
      "Parti politique fondé par Selios, qui porte la candidature de Bougre au poste de Premier Ministre face au PRSG.",
    tags: ["pr", "parti politique", "selios", "bougre", "élections"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Parti politique",
      fields: [
        { label: "Nom", value: "Parti Union de Premier Régime" },
        { label: "Sigle", value: "PR" },
        { label: "Fondateur", value: "Selios" },
        { label: "Candidat", value: "Bougre, au poste de Premier Ministre" },
        { label: "Programme", value: "Non renseigné" },
      ],
      footer: "Récit de la rédaction du wiki.",
    },
    content: `# Parti Union de Premier Régime

${HISTORY_SOURCE}

Le **Parti Union de Premier Régime** est un parti politique fondé par
[[selios|Selios]]. Son sigle est **PR**.

## Un parti au nom de régent

Le nom du parti renvoie au **« Premier Régime »**, c'est-à-dire au
[[2e-delphinat|IIe Delphinat]] — celui que Selios a présidé, et dont la
[[grande-repression|Grande Répression]] et le bannissement de
[[stanislas|Stanislas]] restent les deux actes les plus cités du récit.

Porter ce nom en 2026 est donc un acte politique : le parti se réclame de la
continuité du IIe Delphinat, précisément le régime qui s'est effondré. Voir
[[la-chute-du-2e-delphinat]].

## Le candidat

Le parti porte la candidature de [[bougre|Bougre]] au poste de
[[le-premier-ministre|Premier Ministre]]. Bougre est l'**ancien chef de la
[[la-junte-militaire|Junte Militaire]]** : le PR associates donc l'ancien
dictateur au fondateur du IIe Delphinat.

Le programme du parti est **non renseigné**.

## L'adversaire

Le PR s'oppose au
[[parti-revolutionnaire-socialiste-gratiennois|Parti Révolutionnaire Socialiste
Gratiennois]], qui porte la candidature d'[[eitam|Eitam]]. Voir
[[crise-politique-contemporaine]].

## Voir aussi

- [[selios]]
- [[bougre]]
- [[parti-revolutionnaire-socialiste-gratiennois]]
- [[2e-delphinat]]
- [[crise-politique-contemporaine]]`,
  },
];
