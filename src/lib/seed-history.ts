import type { Article } from "./types";

/**
 * Histoire du Delphinat : les trois règnes, l'interrègne de la Junte et la
 * chute du IIe.
 *
 * Comme `seed-lore.ts`, ces pages ne rapportent **que** ce que la rédaction a
 * fourni, et l'attribuent explicitement. L'ordre des périodes est établi (il
 * est dans la configuration partagée, `shared/roster.json`) ; les **dates** ne
 * le sont pas, et la Constitution n'en contient aucune : elles restent donc
 * « non renseignées » partout.
 */

const HISTORY_SOURCE =
  "> Source : récit de la rédaction du wiki, ordre des périodes issu de la " +
  "configuration partagée (`shared/roster.json`). **Aucune date n'est établie** : " +
  "la Constitution en vigueur ne comporte aucune chronologie.";

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

export const SEED_HISTORY_ARTICLES: Article[] = [
  {
    slug: "les-trois-delphinats",
    title: "Les trois Delphinats",
    category: "histoire",
    summary:
      "Chronologie d'ensemble du Delphinat : le Ier, l'interrègne de la Junte Militaire, le IIe, puis le IIIe aujourd'hui en vigueur.",
    tags: ["histoire", "chronologie", "delphinats"],
    author: "Rédaction du wiki",
    createdAt: iso(5),
    updatedAt: iso(0),
    infobox: {
      caption: "Chronologie",
      imageUrl: "/flag.webp",
      imageAlt: "Drapeau du IIIe Delphinat de Gratianopolis",
      imageCaption: "Drapeau officiel du IIIe Delphinat",
      fields: [
        { label: "Règnes", value: "Ier, IIe et IIIe Delphinat" },
        { label: "Interrègne", value: "Junte Militaire (dictature)" },
        { label: "Règne en cours", value: "IIIe Delphinat" },
        { label: "Fondateur", value: "Selios (Ier Delphinat)" },
        { label: "Dauphin actuel", value: "Esto (IIIe Delphinat)" },
        { label: "Texte fondateur actuel", value: "Constitution du 26/09/26" },
        { label: "Dates", value: "Non renseignées (aucune source écrite)" },
      ],
      footer:
        "L'ordre des périodes est certain ; leur datation ne l'est pas. Voir chaque " +
        "article pour le détail et la mention de source.",
    },
    content: `# Les trois Delphinats

${HISTORY_SOURCE}

## Ordre des périodes

L'histoire du Delphinat se lit en quatre séquences. Leur **ordre** est établi — il est inscrit dans la configuration partagée du projet (\`shared/roster.json\`) et reprend le récit de la rédaction — mais leur **durée** ne l'est pas.

1. **[[ier-delphinat|Ier Delphinat]]** — fondation de Gratianopolis par [[selios|Selios]], premier Dauphin.
2. **[[la-junte-militaire|Junte Militaire]]** — dictature de [[bougre|Bougre]] à la tête de la Junte, « brutale » selon la rédaction.
3. **[[2e-delphinat|IIe Delphinat]]** — deuxième règne delphinal.
4. **[[histoire-du-delphinat|IIIe Delphinat]]** — règne en cours, celui du wiki que vous consultez.

## De l'un à l'autre

Les transitions ne sont pas documentées. On sait seulement :

- que la Junte s'est installée **après** le Ier Delphinat et **avant** le IIe ;
- que le IIe s'est terminé par la [[la-chute-du-2e-delphinat|chute du IIe Delphinat]] ;
- que le IIIe a été fondé sur une [[la-constitution|Constitution]] dont la version finale a été éditée le **26/09/26**, date la seule établie par une source écrite.

## Personnes citées

Les fiches de personnages reliées à ces périodes :

- [[selios]] — Dauphin fondateur, Ier Delphinat.
- [[bougre]] — chef de la Junte Militaire.
- [[esto]] — Dauphin du IIIe Delphinat, auteur de la Constitution, mis en cause dans la chute du IIe.
- [[baron]] et [[swaylo]] — personalities citées dans la chute du IIe.
- [[eitam]] — membre des plus anciens depuis le Ier Delphinat, créateur du wiki et du bot Discord.

## Voir aussi

- [[histoire-du-delphinat]]
- [[la-constitution]]`,
  },

  {
    slug: "ier-delphinat",
    title: "Ier Delphinat",
    category: "histoire",
    summary:
      "Première règne delphinal, fondé par Selios : la fondation même de Gratianopolis.",
    tags: ["histoire", "1er delphinat", "fondation", "selios"],
    author: "Rédaction du wiki",
    createdAt: iso(5),
    updatedAt: iso(0),
    infobox: {
      caption: "Période historique",
      imageUrl: "/flag.webp",
      imageAlt: "Drapeau du IIIe Delphinat de Gratianopolis",
      imageCaption: "Drapeau actuel du IIIe Delphinat",
      fields: [
        { label: "Règne", value: "Ier Delphinat" },
        { label: "Souverain", value: "Selios, Dauphin fondateur" },
        { label: "Événement", value: "Fondation de Gratianopolis" },
        { label: "Popularité du souverain", value: "Aimé du peuple" },
        { label: "Évaluation de la rédaction", value: "Rarement perçu comme un dirigeant fort" },
        { label: "Dates", value: "Non renseignées" },
        { label: "Suivi par", value: "Junte Militaire" },
      ],
      footer:
        "Le drapeau affiché est celui du IIIe Delphinat : il n'existe pas de " +
        "drapeau documenté du Ier. Ordre des périodes : `shared/roster.json`.",
    },
    content: `# Ier Delphinat

${HISTORY_SOURCE}

Le **Ier Delphinat** est la première règne delphinal de Gratianopolis : celle qui **fonde** la nation.

## Le Dauphin fondateur

La rédaction attribue la fondation à [[selios|Selios]], **Dauphin fondateur**. Il est le premier à porter la charge de Dauphin sous le nom de Delphinat.

Sa fiche est sur [[selios]] ; la charge elle-même est définie par l'article P-1 de la [[la-constitution|Constitution en vigueur]].

## Un souverain populaire mais peu considéré

La rédaction décrit Selios comme **aimé du peuple**, mais **rarement perçu comme un véritable dirigeant fort**.

Ces deux propositions ne se contredisent pas : elles décrivent un souverain populaire et un pouvoir politique faible. C'est ce second point qui rend le passage du Ier Delphinat à la Junte Militaire intelligible — la Junte ne s'oppose pas à un Dauphin redoutable, elle comble un vide.

## Les plus anciens membres

[[eitam]] est présenté par la rédaction comme l'un des **membres les plus anciens** de la communauté, présent depuis la **création du Ier Delphinat**. Sa présence couvre donc toute la chronologie du Delphinat.

## Après le Ier Delphinat

Le Ier Delphinat est suivi de la [[la-junte-militaire|Junte Militaire]], la dictature de [[bougre|Bougre]], puis du [[2e-delphinat|IIe Delphinat]].

## Ce que cette période ne documente pas

Aucun événement daté, aucune institution propre au Ier Delphinat, aucune loi. La [[la-constitution|Constitution]] en vigueur est celle du **IIIe** Delphinat : elle ne décrit pas cette période. Tout ce qui n'est pas ci-dessus est **non renseigné**.

## Voir aussi

- [[selios]]
- [[la-junte-militaire]]
- [[les-trois-delphinats]]
- [[eitam]]`,
  },

  {
    slug: "la-junte-militaire",
    title: "Junte Militaire",
    category: "histoire",
    summary:
      "Dictature brutale établie entre le Ier et le IIe Delphinat, dirigée par Bougre.",
    tags: ["histoire", "junte militaire", "dictature", "bougre"],
    author: "Rédaction du wiki",
    createdAt: iso(5),
    updatedAt: iso(0),
    infobox: {
      caption: "Période historique",
      fields: [
        { label: "Nature", value: "Dictature" },
        { label: "Chef", value: "Bougre" },
        { label: "Période", value: "Entre le Ier et le IIe Delphinat" },
        { label: "Description de la rédaction", value: "Dictature brutale" },
        { label: "Durée", value: "Non renseignée" },
        { label: "Cadre constitutionnel", value: "Aucun : la Junte ne figure pas dans la Constitution en vigueur" },
      ],
      footer:
        "Aucune source écrite ne documente cette période. La Constitution du IIIe " +
        "Delphinat ne la mentionne pas.",
    },
    content: `# Junte Militaire

${HISTORY_SOURCE}

La **Junte Militaire** est la dictature qui s'est installée **entre le [[ier-delphinat|Ier Delphinat]] et le [[2e-delphinat|IIe Delphinat]]**.

## Un régime brutal

La rédaction du wiki décrit cette période comme une **dictature brutale**. Le terme est consigné tel quel : il n'est ni atténué, ni complété par des détails que la rédaction n'a pas fournis — durée, événements marquants, nombre de personnes concernées : tout cela est **non renseigné**.

## Bougre à la tête de la Junte

Le chef de la Junte est [[bougre|Bougre]]. Sa fiche est sur [[bougre]].

## Une période hors Constitution

Point important : la [[la-constitution|Constitution]] en vigueur est celle du **IIIe Delphinat**, fondé après la Junte. Elle ne mentionne ni la Junte, ni aucune période de dictature.

L'article P-1 organise le pouvoir autour de huit charges — [[le-dauphin|Dauphin]], Régent, [[le-conseil-delphinal|Conseil Delphinal]], [[les-baillits|Baillits]], [[le-gouvernement|Premier Ministre et ministres]], [[lassemblee|Assemblée]] — et la Junte Militaire **ne correspond à aucune d'entre elles**.

C'est la raison pour laquelle cette page est un article de récit et non une page institutionnelle : la Constitution n'a pas de rubrique pour ce qui s'est passé avant elle.

## Fin de la dictature

La rédaction n'indique pas comment la Junte s'est terminée. On sait seulement qu'elle a été suivie du [[2e-delphinat|IIe Delphinat]].

## Voir aussi

- [[bougre]]
- [[ier-delphinat]]
- [[2e-delphinat]]
- [[les-trois-delphinats]]`,
  },

  {
    slug: "2e-delphinat",
    title: "IIe Delphinat",
    category: "histoire",
    summary:
      "Deuxième règne delphinal, terminé par la chute du IIe Delphinat.",
    tags: ["histoire", "2e delphinat", "chute"],
    author: "Rédaction du wiki",
    createdAt: iso(5),
    updatedAt: iso(0),
    infobox: {
      caption: "Période historique",
      fields: [
        { label: "Règne", value: "IIe Delphinat" },
        { label: "Précède", value: "Junte Militaire" },
        { label: "Suivi de", value: "IIIe Delphinat" },
        { label: "Fin", value: "Chute du IIe Delphinat" },
        { label: "Personnalités citées", value: "Baron ; mise en cause : Esto, Swaylo, Baron" },
        { label: "Dates", value: "Non renseignées" },
      ],
      footer:
        "Le récit de la chute est attribué à la rédaction du wiki ; il n'est étayé " +
        "par aucune source écrite.",
    },
    content: `# IIe Delphinat

${HISTORY_SOURCE}

Le **IIe Delphinat** est la deuxième règne delphinal de Gratianopolis. Il suit la [[la-junte-militaire|Junte Militaire]] et précède le [[histoire-du-delphinat|IIIe Delphinat]].

## Le retour du pouvoir delphinal

Après la dictature de [[bougre|Bougre]], le pouvoir revient à la forme qu'il avait sous le [[ier-delphinat|Ier Delphinat]] : le Delphinat. La rédaction ne précise ni comment cette transition s'est faite, ni qui a exercé la charge pendant ce règne.

## Personnalités de cette période

La rédaction cite [[baron|Baron]] comme personnalité du IIe Delphinat. Sa fonction au sein de ce règne n'est **pas documentée** : elle reste non renseignée.

## La fin du IIe Delphinat

Le IIe Delphinat se termine par la [[la-chute-du-2e-delphinat|chute du IIe Delphinat]], que la rédaction impute principalement à [[esto|Esto]], aux côtés de [[baron|Baron]] et de [[swaylo|Swaylo]].

## Après le IIe Delphinat

Le [[histoire-du-delphinat|IIIe Delphinat]] s'ouvre sur la Constitution dont la version finale a été éditée le **26/09/26** — la seule date de l'histoire du Delphinat qui repose sur une source écrite.

## Voir aussi

- [[la-chute-du-2e-delphinat]]
- [[la-junte-militaire]]
- [[baron]]
- [[les-trois-delphinats]]`,
  },

  {
    slug: "la-chute-du-2e-delphinat",
    title: "Chute du IIe Delphinat",
    category: "histoire",
    summary:
      "Fin du IIe Delphinat, que la rédaction du wiki impute principalement à Esto, aux côtés de Baron et de Swaylo.",
    tags: ["histoire", "2e delphinat", "chute", "esto", "swaylo", "baron"],
    author: "Rédaction du wiki",
    createdAt: iso(5),
    updatedAt: iso(0),
    infobox: {
      caption: "Événement",
      fields: [
        { label: "Événement", value: "Chute du IIe Delphinat" },
        { label: "Victime", value: "IIe Delphinat" },
        {
          label: "Responsables selon la rédaction",
          value: "Esto (principal), Baron, Swaylo",
        },
        { label: "Origine de Swaylo", value: "Empire parlementaire de Norlot" },
        { label: "Date", value: "Non renseignée" },
        { label: "Source", value: "Récit de la rédaction du wiki — aucune source écrite" },
      ],
      footer:
        "Mise en cause attribuée à la rédaction du wiki. Elle est consignée telle " +
        "qu'elle a été fournie, sans extension ni commentaire.",
    },
    content: `# Chute du IIe Delphinat

${HISTORY_SOURCE}

La **chute du IIe Delphinat** est l'événement par lequel s'achève le [[2e-delphinat|IIe Delphinat]].

## Responsables, selon la rédaction

La rédaction du wiki tient **Esto pour le principal responsable** de cette chute, aux côtés de **[[baron|Baron]]** et de **[[swaylo|Swaylo]]**.

- [[esto|Esto]] — le « principal responsable ». Il est depuis le Dauphin du [[histoire-du-delphinat|IIIe Delphinat]] et l'auteur de la [[la-constitution|Constitution]].
- [[baron|Baron]] — personnalité du IIe Delphinat, dont la fonction n'est pas documentée.
- [[swaylo|Swaylo]] — Empereur de l'[[norlot|Empire parlementaire de Norlot]], extérieur au Delphinat.

## Une implication extérieure

La présence de [[swaylo|Swaylo]] est le seul élément qui relie cet événement à une autre nation : la rédaction mentionne donc, implicitement, une implication extérieure au Delphinat. Elle ne précise ni la nature de cette intervention, ni les accords ou conflits qui l'ont accompagnée — **non renseigné**.

## Statut de ce récit

Cet article consigne une **mise en cause formulée par la rédaction du wiki**. Elle n'est étayée par aucune source écrite : ni document, ni procès-verbal, ni datation. Elle est publiée ici parce qu'elle fait partie de l'histoire telle que la communauté la raconte, et parce qu'une encyclopédie omet bien moins une attribution incertaine qu'elle ne l'affirme comme un fait établi.

## Ce que la chute a produit

La chute du IIe Delphinat a conduit au **IIIe Delphinat**, le règne en cours, ouvert sur une Constitution dont la version finale a été éditée le **26/09/26** — la seule date établie par une source écrite dans toute l'histoire du Delphinat.

## Voir aussi

- [[2e-delphinat]]
- [[esto]]
- [[baron]]
- [[swaylo]]
- [[norlot]]`,
  },

  {
    slug: "norlot",
    title: "Empire parlementaire de Norlot",
    category: "histoire",
    summary:
      "Micronation distincte du Delphinat, régie par l'Empereur Swaylo, impliquée dans la chute du IIe Delphinat.",
    tags: ["histoire", "norlot", "empire", "swaylo", "micronation"],
    author: "Rédaction du wiki",
    createdAt: iso(5),
    updatedAt: iso(0),
    infobox: {
      caption: "Micronation",
      fields: [
        { label: "Nom officiel", value: "Empire parlementaire de Norlot" },
        { label: "Nature", value: "Micronation" },
        { label: "Souverain", value: "Swaylo, Empereur" },
        { label: "Lien avec le Delphinat", value: "Implication dans la chute du IIe Delphinat" },
        { label: "Drapeau", value: "Non documenté" },
        { label: "Constitution", value: "Non documentée" },
        { label: "Dates", value: "Non renseignées" },
      ],
      footer:
        "La rédaction n'a fourni aucun élément sur Norlot en dehors du nom de l'État, " +
        "du titre de son souverain et de son implication dans la chute du IIe Delphinat.",
    },
    content: `# Empire parlementaire de Norlot

${HISTORY_SOURCE}

L'**Empire parlementaire de Norlot** est une micronation, **distincte du Delphinat** mais liée à son histoire.

## Souverain

L'Empire est régi par **[[swaylo|Swaylo]]**, **Empereur**. Sa fiche est sur [[swaylo]].

## Le lien avec le Delphinat

Norlot apparaît dans l'histoire du Delphinat à un seul endroit : la [[la-chute-du-2e-delphinat|chute du IIe Delphinat]], que la rédaction impute à [[esto|Esto]], [[baron|Baron]] et [[swaylo|Swaylo]].

La présence de l'Empereur de Norlot parmi les responsables d'un événement intérieur au Delphinat constitue, selon la rédaction, une **implication extérieure**. Aucune autre relation n'est documentée.

## Ce que la rédaction n'a pas fourni

Au-delà du nom de l'État, du titre de son souverain et de cette implication, tout reste **non renseigné** :

- la forme exacte du « régime parlementaire » et le partage des pouvoirs ;
- les institutions, les charges et le mode de désignation de l'Empereur ;
- la chronologie, la fondation et l'existence actuelle de Norlot ;
- tout drapeau, emblème ou texte officiel.

Ces éléments ne sont pas reconstitués : une encyclopédie indique une lacune, elle ne la comble pas par déduction.

## Voir aussi

- [[swaylo]]
- [[la-chute-du-2e-delphinat]]
- [[2e-delphinat]]`,
  },
];
