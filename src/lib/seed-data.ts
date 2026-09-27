import { SEED_CHAPTER_ARTICLES } from "./seed-chapitres";
import { SEED_CONSTITUTION_ARTICLES } from "./seed-constitutions";
import { SEED_HISTORY_ARTICLES } from "./seed-history";
import { SEED_FIGURE_ARTICLES } from "./seed-lore-figures";
import { SEED_LORE_ARTICLES } from "./seed-lore";
import type { Article } from "./types";

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

/**
 * Version du contenu officiel.
 *
 * Incrémentez-la à chaque modification de `SEED_ARTICLES`. C'est ce numéro qui
 * autorise « Mettre à niveau » à rafraîchir le texte des articles **que personne
 * n'a retouchés** (voir `installSeedArticles`). Sans cet incrément, une
 * installation ne fait qu'ajouter les articles manquants.
 *
 * L'empreinte utilisée pour savoir si un article a été retouché est calculée
 * par `src/lib/fingerprint.ts` — un module unique, partagé avec le magasin, pour
 * que les deux comparaisons ne puissent pas diverger.
 */
export const SEED_VERSION = 10;

/**
 * Contenu de lancement du wiki.
 *
 * Règle éditoriale, par ordre de préséance des sources :
 *   1. **Constitution.pdf** — texte juridique intégral, orthographe d'origine ;
 *   2. **API Discord** — photos de profil, rôles, ancienneté (rien d'autre) ;
 *   3. **récit de la rédaction** — pages historiques et fiches de
 *      personnalités, rédigées à partir des informations fournies par la
 *      rédaction du wiki. Chaque énoncé y est **attribué** (« la rédaction
 *      tient… », « selon le récit de la rédaction… ») et suivi d'une mention de
 *      source, afin qu'on distingue toujours un fait documenté d'un souvenir
 *      de communauté. Ce qui n'est pas documenté est écrit « non renseigné ».
 */
const CONSTITUTION_SOURCE = "> Source officielle : [Constitution.pdf](/Constitution.pdf) — Créé par Esto le 26/09/26, version finale éditée le 26/09/26.";

export const SEED_ARTICLES: Article[] = composeSeedArticles(
  // Le corpus de récit (personnalités, histoire des trois règnes) vient en tête :
  // ce sont les pages d'entrée du wiki. Vient ensuite le texte constitutionnel,
  // transcrit de `Constitution.pdf`.
  SEED_LORE_ARTICLES,
  SEED_FIGURE_ARTICLES,
  SEED_HISTORY_ARTICLES,
  SEED_CHAPTER_ARTICLES,
  SEED_CONSTITUTION_ARTICLES,
  [
  {
    slug: "la-constitution",
    title: "Constitution et Hiérarchie du IIIe Delphinat Gratiennois",
    category: "lois",
    summary:
      "Texte intégral et officiel de la Constitution du IIIe Delphinat : hiérarchie des institutions et articles P-1 à P-17.",
    tags: ["constitution", "loi fondamentale", "texte officiel"],
    author: "Esto",
    createdAt: iso(1),
    updatedAt: iso(0),
    infobox: {
      caption: "Texte fondateur",
      imageUrl: "/flag.webp",
      imageAlt: "Drapeau du IIIe Delphinat de Gratianopolis",
      imageCaption: "Drapeau officiel du IIIe Delphinat de Gratianopolis",
      fields: [
        { label: "Nature", value: "Constitution (texte fondateur)" },
        { label: "Créé par", value: "Esto" },
        { label: "Date de création", value: "26/09/26" },
        { label: "Version finale", value: "Éditée le 26/09/26" },
        { label: "Articles", value: "P-1 à P-17 (dont P-15.1)" },
        { label: "Souveraineté", value: "Le Dauphin (article P-16)" },
        {
          label: "Révision",
          value: "Conseil Delphinal puis Dauphin pour une loi proposée par un citoyen (P-17)",
        },
        { label: "Fichier", value: "/Constitution.pdf" },
      ],
      footer: "Source : Constitution.pdf — transcription intégrale, orthographe d'origine conservée.",
    },
    content: `# Constitution et Hiérarchie du IIIe Delphinat Gratiennois

${CONSTITUTION_SOURCE}

## Article P-1

Gratianopolis est représentée et gérée selon cette hiérarchie.

### Dauphin

Le Dauphin possède tous les pouvoirs et également le droit de véto.

Puisque le Dauphin a les pleins pouvoirs il peut ajouter, réécrire ou supprimer des lois de la constitution mais il devra montrer les changement effectué au Conseil Delphinal si le changement est approuvé par 50% de cette dernière alors les modifications seront effectuées.

### Régent

Ils possèdent le pouvoir de refuser une personne en staff : Le dauphin propose les staffs (baillit) et autres rangs supérieurs mais sans l'approbation du régent, la décision du conseil delphinal sera caduque.

Sa participation est obligatoire dans la création, la modification et la suppression de lois au conseil.

### Conseil Delphinal

Ils sont les suppléants du Dauphin, ils disposent du droit d'administration du serveur.

Ils peuvent participer aux votes de lois mais leur participation n'est pas obligatoire.

Les sangs delphinaux sont constitués des Géniteurs, nommés pour leur dévouement et des Agellids, nommés pour leurs faits d'armes.

Le Conseil peut demander une Motion de Censure au Dauphin pour le Premier Ministre mais faut que le Dauphin approuve cette dernière.

Le Dauphin fait lui-même partie du Conseil et il peut lui-même mettre une motion de censure et passer par lui-même pour la valider.

### Baillit

Ce sont les modérateurs, ils assurent une surveillance permanente du serveur.

Ils sont également choisis par le Dauphin et devraient être validés par le Régent.

### Premier Ministre

Le Premier Ministre est élu par un vote démocratique qui est voté par l'ensemble de la Nation.

Le mandat de ce dernier dure 4 mois, donc il doit être sûr de faire un programme qui dure 4 mois par contre, si il a pas terminé son programme le prochain Premier Ministre peut prendre les choses qui on pas terminé.

Le Dauphin peut faire une Motion de Censure sur le Premier Ministre si ce dernier ne respecte pas la Constitution.

Le Premier Ministre peut nommer un Gouvernement (il peut inviter d'autres membres pour remplir son gouvernement).

### Ministre

Le Ministère est nommé par le Premier Ministre a des postes précis et professionnels.

Les ministres restent au Gouvernement jusqu'à la fin du gouvernement du Premier Ministre. mais il peut les virer s'ils ne font pas leur travail.

### Représentant de l'Assemblée

Le Représentant de l'Assemblée est choisi par le Dauphin ou le Premier Ministre.

Le Représentant de l'Assemblée, représente l'assemblée de Gratianopolis.

Si il y a pas d'Assemblée, ni de Premier Ministre, alors le Dauphin devient Représentant de l'Assemblée.

### Député

les députés sont nommé par le Représentant de l'Assemblée un nombre limité de députés est fixé à 10 Députés

Les députés peuvent être de partis politiques ou sans.

l'objectif des députés est de discuter des problème de Gratianopolis comme l'international, l'activité, le Dauphin ou autre

il peuvent être choisis par leur chef de parti s'ils font partie d'un parti.

## Article P-2

Aucune forme de Harcèlement, de discrimination ou autre sera toléré et finira au tribunal de Gratianopolis.

## Article P-3

Certaines idéologies extrémistes sont interdites comme le Néonazisme le Fascisme révolutionnaire le Suprémacisme raciale le Stalinisme le Djihadisme le Sionisme Cette liste est à respecter.

## Article P-4

les contenues ou discussion à connotation Pornographique (incluent la Zoophilie, la Nécrophilie et Pédophilie) ne dois pas être publique.

## Article P-5

Toute action qui nuira à la souveraineté de Gratianopolis sera sanctionné Si il s'agit d'un état, alors l'état de guerre sera lancé.

## Article P-6

Il est déconseillé d'insulter la croyance d'autrui.

## Article P-7

Les modérateurs ne peuvent pas bannir sans l'accord spécifique de la justice.

Ils peuvent cependant mute un membre en attendant son jugement.

Si ils enfreignent cette règle ils devront eux-mêmes comparaître devant la justice.

## Article P-8

Les Conseillers du dauphin sont les garants de la constitution et veillent à son application de manière impartiale.

Ils sont nommés par le chef et fondateur de la ligue.

## Article P-9

Il est interdit de leak les informations personnelles d'une personne sans son accord, pareille pour la promotion de site OSINT.

## Article P-10

Les pings incluant des personnes non consentante de manière abusive sans justification sont à proscrire

## Article P-11

Le staff se doit de consulter les autres avant d'appliquer une sanction type : Ban, mute, kick, etc. sauf en cas de menace directe pour le serveur.

## Article P-12

Si un membre ne comprend pas un article de la constitution, il est conseillé à ce dernier de faire un ticket pour demander de l'aider à comprendre.

## Article P-13

Si un procès à lieu, les juges seront juge du procès mais s'ils ne sont pas présents alors le Dauphin sera juge.

## Article P-14

Les chefs de Micronation étrangère ne peuvent pas se présenter au élection de Premier Ministre pour éviter des influences ou du contrôle sur Gratianopolis.

## Article P-15

Les Citoyens sont les seul a pouvoir voter

## Article P-15.1

Tout vote se fait librement et anonymement

## Article P-16

Nul ne peut modifier la constitution sans le dauphin, si cette règle est enfreint cette dernière passe devant la Justice

## Article P-17

Si une lois est proposé par un citoyen, elle doit être accepté par le Conseil Delphinal puis par le Dauphin, si la lois est accepté alors elle sera ajouté à la Constitution`,
  },
  {
    slug: "la-hierarchie-delphinale",
    title: "La hiérarchie delphinale",
    category: "institutions",
    summary:
      "Les huit charges de la Constitution : Dauphin, Régent, Conseil Delphinal, Baillit, Premier Ministre, Ministre, Représentant de l'Assemblée, Député.",
    tags: ["institutions", "hiérarchie"],
    author: "Esto",
    createdAt: iso(1),
    updatedAt: iso(1),
    infobox: {
      caption: "Institution",
      imageUrl: "/flag.webp",
      imageAlt: "Drapeau du IIIe Delphinat de Gratianopolis",
      fields: [
        { label: "Charges", value: "8 (Dauphin, Régent, Conseil, Baillit, Premier Ministre, Ministre, Représentant, Député)" },
        { label: "Règlement", value: "Article P-1 de la Constitution" },
        { label: "Autorité supreme", value: "Le Dauphin" },
        { label: "Sangs delphinaux", value: "Géniteurs et Agellids" },
      ],
      footer: "Source : Constitution.pdf, article P-1.",
    },
    content: `# La hiérarchie delphinale

${CONSTITUTION_SOURCE}

Gratianopolis est représentée et gérée selon la hiérarchie définie à l'article P-1 de la Constitution.

## Les charges

| Charge | Rôle selon la Constitution |
| --- | --- |
| **Dauphin** | Possède tous les pouvoirs et le droit de véto ; modifie la constitution sous réserve d'approbation à 50% du Conseil Delphinal. |
| **Régent** | Peut refuser une personne en staff ; participation obligatoire aux créations, modifications et suppressions de lois. |
| **Conseil Delphinal** | Suppléants du Dauphin, dispose du droit d'administration du serveur ; participation facultative aux votes de lois. |
| **Baillit** | Modérateurs assurant une surveillance permanente du serveur ; choisis par le Dauphin, validés par le Régent. |
| **Premier Ministre** | Élu par vote démocratique pour un mandat de 4 mois ; nomme le Gouvernement. |
| **Ministre** | Nommé par le Premier Ministre à des postes précis et professionnels. |
| **Représentant de l'Assemblée** | Représente l'assemblée de Gratianopolis ; choisi par le Dauphin ou le Premier Ministre. |
| **Député** | Nommé par le Représentant de l'Assemblée ; 10 députés maximum. |

## Sangs delphinaux

Les sangs delphinaux sont constitués des **Géniteurs**, nommés pour leur dévouement, et des **Agellids**, nommés pour leurs faits d'armes.

## Texte intégral

La version complète et opposable se trouve dans l'article [Constitution et Hiérarchie](/wiki/la-constitution).`,
  },
  {
    slug: "le-dauphin",
    title: "Le Dauphin",
    category: "institutions",
    summary:
      "Chef de l'État delphinal : pouvoirs pleins, droit de véto et procédure de modification de la Constitution.",
    tags: ["dauphin", "pouvoirs"],
    author: "Esto",
    createdAt: iso(1),
    updatedAt: iso(1),
    infobox: {
      caption: "Charge",
      fields: [
        { label: "Charge", value: "Dauphin" },
        { label: "Rang", value: "Premier — chef de l'État delphinal" },
        { label: "Pouvoirs", value: "Tous les pouvoirs, avec droit de véto" },
        { label: "Article", value: "P-1" },
        {
          label: "Compétences",
          value:
            "Supervision du Conseil Delphinal, motion de censure, nomination du Premier Ministre et des baillits",
        },
        { label: "Présidence", value: "Membre du Conseil Delphinal" },
      ],
      footer: "Source : Constitution.pdf, articles P-1 et P-16.",
    },
    content: `# Le Dauphin

${CONSTITUTION_SOURCE}

## Pouvoirs

Le Dauphin possède **tous les pouvoirs** et également le **droit de véto**.

## Modification de la Constitution

Puisque le Dauphin a les pleins pouvoirs il peut ajouter, réécrire ou supprimer des lois de la constitution mais il devra montrer les changement effectué au Conseil Delphinal si le changement est approuvé par 50% de cette dernière alors les modifications seront effectuées.

> Nul ne peut modifier la constitution sans le dauphin, si cette règle est enfreint cette dernière passe devant la Justice. — *Article P-16*

## Place dans la hiérarchie

Le Dauphin fait lui-même partie du Conseil Delphinal et il peut lui-même mettre une motion de censure et passer par lui-même pour la valider.

Il peut faire une Motion de Censure sur le Premier Ministre si ce dernier ne respecte pas la Constitution.`,
  },
  {
    slug: "le-conseil-delphinal",
    title: "Le Conseil Delphinal",
    category: "institutions",
    summary:
      "Suppléants du Dauphin : administration du serveur, votes de lois, motion de censure et validation des staffs.",
    tags: ["conseil delphinal", "assemblée"],
    author: "Esto",
    createdAt: iso(1),
    updatedAt: iso(1),
    infobox: {
      caption: "Institution",
      fields: [
        { label: "Institution", value: "Conseil Delphinal" },
        { label: "Composition", value: "Les Conseillers du Dauphin, y compris le Dauphin lui-même" },
        { label: "Rôle", value: "Suppléants du Dauphin" },
        { label: "Droits", value: "Droit d'administration du serveur" },
        { label: "Vote des lois", value: "Facultatif" },
        { label: "Seuils", value: "50 % d'approbation pour valider une modification de la Constitution" },
        { label: "Article", value: "P-1" },
      ],
      footer: "Source : Constitution.pdf, articles P-1 et P-8.",
    },
    content: `# Le Conseil Delphinal

${CONSTITUTION_SOURCE}

## Rôle

Ils sont les **suppléants du Dauphin**, ils disposent du **droit d'administration du serveur**.

Ils peuvent participer aux votes de lois mais leur participation n'est pas obligatoire.

## Validation des staffs

Le dauphin propose les staffs (baillit) et autres rangs supérieurs mais sans l'approbation du régent, la décision du conseil delphinal sera caduque.

## Motion de Censure

Le Conseil peut demander une Motion de Censure au Dauphin pour le Premier Ministre mais faut que le Dauphin approuve cette dernière.

## Sangs delphinaux

Les sangs delphinaux sont constitués des Géniteurs, nommés pour leur dévouement et des Agellids, nommés pour leurs faits d'armes.

## Création de lois

Si une lois est proposé par un citoyen, elle doit être accepté par le Conseil Delphinal puis par le Dauphin, si la lois est accepté alors elle sera ajouté à la Constitution. — *Article P-17*`,
  },
  {
    slug: "le-gouvernement",
    title: "Le Gouvernement",
    category: "institutions",
    summary:
      "Premier Ministre, ministres, Représentant de l'Assemblée et députés : mandats et rôles prévus par la Constitution.",
    tags: ["gouvernement", "premier ministre", "députés"],
    author: "Esto",
    createdAt: iso(1),
    updatedAt: iso(1),
    infobox: {
      caption: "Institution",
      fields: [
        { label: "Institution", value: "Le Gouvernement" },
        { label: "Chef", value: "Le Premier Ministre" },
        { label: "Mode d'accès", value: "Élection démocratique votée par l'ensemble de la Nation" },
        { label: "Mandat", value: "4 mois" },
        { label: "Candidature", value: "Réservée aux citoyens (P-14, P-15)" },
        { label: "Composition", value: "Ministres nommés par le Premier Ministre" },
        { label: "Contrôle", value: "Motion de censure du Dauphin ou du Conseil Delphinal" },
        { label: "Article", value: "P-1" },
      ],
      footer: "Source : Constitution.pdf, articles P-1, P-14 et P-15.",
    },
    content: `# Le Gouvernement

${CONSTITUTION_SOURCE}

## Premier Ministre

Le Premier Ministre est élu par un vote démocratique qui est voté par l'ensemble de la Nation.

Le mandat de ce dernier dure **4 mois**, donc il doit être sûr de faire un programme qui dure 4 mois par contre, si il a pas terminé son programme le prochain Premier Ministre peut prendre les choses qui on pas terminé.

Le Dauphin peut faire une Motion de Censure sur le Premier Ministre si ce dernier ne respecte pas la Constitution.

Le Premier Ministre peut nommer un Gouvernement (il peut inviter d'autres membres pour remplir son gouvernement).

> Les chefs de Micronation étrangère ne peuvent pas se présenter au élection de Premier Ministre pour éviter des influences ou du contrôle sur Gratianopolis. — *Article P-14*

## Ministre

Le Ministère est nommé par le Premier Ministre a des postes précis et professionnels.

Les ministres restent au Gouvernement jusqu'à la fin du gouvernement du Premier Ministre. mais il peut les virer s'ils ne font pas leur travail.

## Représentant de l'Assemblée

Le Représentant de l'Assemblée est choisi par le Dauphin ou le Premier Ministre.

Le Représentant de l'Assemblée, représente l'assemblée de Gratianopolis.

Si il y a pas d'Assemblée, ni de Premier Ministre, alors le Dauphin devient Représentant de l'Assemblée.

## Député

les députés sont nommé par le Représentant de l'Assemblée un nombre limité de députés est fixé à **10 Députés**

Les députés peuvent être de partis politiques ou sans.

l'objectif des députés est de discuter des problème de Gratianopolis comme l'international, l'activité, le Dauphin ou autre

il peuvent être choisis par leur chef de parti s'ils font partie d'un parti.`,
  },

  // ------------------------------------------------------------------
  // Lois — index de la Constitution. Reformulation « objet de l'article »
  // uniquement : le texte opposable reste la page [[la-constitution]].
  // ------------------------------------------------------------------
  {
    slug: "les-lois-du-delphinat",
    title: "Les lois du IIIe Delphinat",
    category: "lois",
    summary:
      "Index des 18 articles de la Constitution (P-1 à P-17, dont P-15.1) : objet de chaque article et règles de révision du texte.",
    tags: ["loi", "constitution", "index", "articles"],
    author: "Rédaction du wiki",
    createdAt: iso(2),
    updatedAt: iso(0),
    infobox: {
      caption: "Code constitutionnel",
      imageUrl: "/flag.webp",
      imageAlt: "Drapeau du IIIe Delphinat de Gratianopolis",
      fields: [
        { label: "Instrument", value: "Constitution du IIIe Delphinat de Gratianopolis" },
        { label: "Nombre d'articles", value: "18 (P-1 à P-17, dont P-15.1)" },
        { label: "Créé par", value: "Esto" },
        { label: "Version finale", value: "Éditée le 26/09/26" },
        { label: "Version en vigueur", value: "26/09/26" },
        { label: "Révision", value: "Dauphin uniquement (P-16)" },
        { label: "Voie d'adoption", value: "Conseil Delphinal puis Dauphin (P-17)" },
        { label: "Juridiction", value: "Tribunal de Gratianopolis (P-2, P-16)" },
      ],
      footer: "Index de lecture. Le texte opposable est la Constitution intégrale.",
    },
    content: `# Les lois du IIIe Delphinat

${CONSTITUTION_SOURCE}

## Comment se lit ce code

La Constitution est la seule source écrite du Delphinat. Elle compte **18 articles** numérotés de P-1 à P-17, avec un article intermédiaire P-15.1. Le tableau ci-dessous résume l'objet de chaque article ; le texte exact, seul opposable, est celui de la page [[la-constitution]].

## Index des articles

| Article | Objet |
| --- | --- |
| **P-1** | Hiérarchie du Delphinat : Dauphin, Régent, Conseil Delphinal, Baillit, Premier Ministre, Ministre, Représentant de l'Assemblée, Député |
| **P-2** | Le harcèlement, la discrimination et toute forme équivalente ne sont pas tolérés et relèvent du tribunal de Gratianopolis |
| **P-3** | Sont interdites les idéologies extrémistes : néonazisme, fascisme révolutionnaire, suprémacisme racial, stalinisme, djihadisme, sionisme |
| **P-4** | Les contenus et discussions à connotation pornographique ne doivent pas être publics |
| **P-5** | Toute action nuisant à la souveraineté est sanctionnée ; s'il s'agit d'un État, l'état de guerre est lancé |
| **P-6** | Il est déconseillé d'insulter la croyance d'autrui |
| **P-7** | Les modérateurs ne peuvent pas bannir sans l'accord de la justice ; ils peuvent en revanche mute un membre en attendant son jugement |
| **P-8** | Les Conseillers du Dauphin garantissent la Constitution et son application impartiale |
| **P-9** | Il est interdit de diffuser les informations personnelles d'une personne sans son accord, et de faire la promotion de sites OSINT |
| **P-10** | Les pings visant abusivement des personnes non consentantes, sans justification, sont à proscrire |
| **P-11** | L'équipe de modération se doit de consulter les autres avant une sanction (ban, mute, kick…), sauf menace directe pour le serveur |
| **P-12** | Un membre qui ne comprend pas un article est invité à faire un ticket pour demander de l'aide |
| **P-13** | Lors d'un procès, les juges sont juge du procès ; s'ils ne sont pas présents, le Dauphin est juge |
| **P-14** | Les chefs de micronation étrangère ne peuvent pas se présenter à l'élection du Premier Ministre |
| **P-15** | Les citoyens sont les seuls à pouvoir voter |
| **P-15.1** | Tout vote se fait librement et anonymement |
| **P-16** | Nul ne peut modifier la Constitution sans le Dauphin ; sinon, elle passe devant la Justice |
| **P-17** | Une loi proposée par un citoyen doit être acceptée par le Conseil Delphinal puis par le Dauphin pour être ajoutée à la Constitution |

## Modifier la Constitution

Trois articles encadrent la révision du texte :

- **P-16** — seul le Dauphin peut modifier la Constitution ; une modification faite sans lui expose son auteur à la Justice ;
- **P-1** — le Dauphin peut ajouter, réécrire ou supprimer des lois, mais il doit montrer les changements au Conseil Delphinal : la modification n'est effectuée qu'avec **50 % d'approbation** du Conseil ;
- **P-17** — une loi proposée par un citoyen suit la voie institutionnelle : Conseil Delphinal, puis Dauphin.

## Voir aussi

- [[la-constitution]] — texte intégral
- [[la-hierarchie-delphinale]] — les charges de l'article P-1`,
  },

  // ------------------------------------------------------------------
  // Histoire — uniquement des faits documentés par la Constitution.
  // ------------------------------------------------------------------
  {
    slug: "histoire-du-delphinat",
    title: "Histoire du IIIe Delphinat",
    category: "histoire",
    summary:
      "Les dates et les événements vérifiables du Delphinat : création le 26/09/26 par Esto et version finale de la Constitution le même jour.",
    tags: ["histoire", "chronologie", "origines"],
    author: "Rédaction du wiki",
    createdAt: iso(3),
    updatedAt: iso(0),
    infobox: {
      caption: "Micronation",
      imageUrl: "/flag.webp",
      imageAlt: "Drapeau du IIIe Delphinat de Gratianopolis",
      imageCaption: "Drapeau officiel",
      fields: [
        { label: "Nom officiel", value: "IIIe Delphinat de Gratianopolis" },
        { label: "Nature", value: "Micronation Discord" },
        { label: "Naissance", value: "26/09/26" },
        { label: "Fondateur", value: "Esto" },
        { label: "Texte fondateur", value: "Constitution, version finale du 26/09/26" },
        { label: "Organisation", value: "Voir la hiérarchie delphinale" },
        { label: "Serveur", value: "discord.gg/gratianopolis" },
      ],
      footer: "Sources : Constitution.pdf et serveur Discord officiel. Aucun élément n'est inventé.",
    },
    content: `# Histoire du IIIe Delphinat

${CONSTITUTION_SOURCE}

## Origines

Le IIIe Delphinat de Gratianopolis est une micronation Discord dont le texte fondateur, la Constitution, a été **créé par Esto le 26/09/26**.

Le nom officiel comporte l'ordinal « IIIe » : il identifie le troisième Delphinat de Gratianopolis.

## 26/09/26 — la Constitution

Le même jour, la **version finale** de la Constitution a été éditée. C'est la seule date établie par une source écrite : elle fait référence à la version encore en vigueur de ce wiki.

Le texte organise la micronation autour de huit charges (voir [[la-hierarchie-delphinale]]) et de dix-huit articles, de P-1 à P-17 (voir [[les-lois-du-delphinat]]).

## Ce que la Constitution établit

- une souveraineté exercée par le **Dauphin**, qui possède tous les pouvoirs et le droit de véto ;
- une **Assemblée** représentée par le Représentant de l'Assemblée, avec un maximum de 10 députés ;
- un **Gouvernement** dirigé par un Premier Ministre élu pour 4 mois ;
- une **modération** assurée par les baillits, soumis au cadre des articles P-7 et P-11.

## Les deux règnes précédentes

Le IIIe Delphinat est le troisième du nom. Les deux règnes qui l'ont précédé sont racontées sur leurs pages propres :

- le [[ier-delphinat|Ier Delphinat]], fondé par [[selios|Selios]] ;
- la [[la-junte-militaire|Junte Militaire]], la dictature de [[bougre|Bougre]] ;
- le [[2e-delphinat|IIe Delphinat]], terminé par la [[la-chute-du-2e-delphinat|chute du IIe Delphinat]].

L'ensemble est résumé sur [[les-trois-delphinats]]. Ces pages relèvent du **récit de la rédaction** : elles disent l'ordre des périodes, pas leurs dates.

## Ce que l'histoire ne documente pas encore

La Constitution ne comporte aucune chronologie. Les sources disponibles ne permettent donc pas encore de dater :

- les élections de Premier Ministre et les gouvernements qui se sont succédé ;
- les motions de censure et les jugements du tribunal de Gratianopolis ;
- l'évolution du Conseil Delphinal et de ses membres ;
- les durées exactes des trois règnes et de la dictature.

Ces éléments sont à compléter par la rédaction du wiki, à partir de sources vérifiables, et non par supposition.

## Voir aussi

- [[les-trois-delphinats]]
- [[la-constitution]]
- [[geographie-du-delphinat]]
- [[le-conseil-delphinal]]`,
  },

  // ------------------------------------------------------------------
  // Géographie — le Delphinat est une micronation Discord : la page
  // décrit son territoire réel (le serveur) sans inventer de lieux.
  // ------------------------------------------------------------------
  {
    slug: "geographie-du-delphinat",
    title: "Géographie du IIIe Delphinat",
    category: "geographie",
    summary:
      "Le territoire du IIIe Delphinat est son serveur Discord officiel ; cette page décrit les espaces qui le composent et ce qui reste à documenter.",
    tags: ["géographie", "territoire", "serveur"],
    author: "Rédaction du wiki",
    createdAt: iso(4),
    updatedAt: iso(0),
    infobox: {
      caption: "Micronation",
      fields: [
        { label: "Entité", value: "IIIe Delphinat de Gratianopolis" },
        { label: "Nature", value: "Micronation Discord" },
        { label: "Territoire", value: "Le serveur Discord officiel" },
        { label: "Invitation", value: "discord.gg/gratianopolis" },
        { label: "Administration", value: "Le Conseil Delphinal a le droit d'administration du serveur (P-1)" },
        { label: "Capitale", value: "Non définie par la Constitution" },
        { label: "Frontières", value: "Non documentées à ce jour" },
      ],
      footer: "Aucune donnée géographique n'est inventée : la Constitution ne décrit aucun lieu physique.",
    },
    content: `# Géographie du IIIe Delphinat

${CONSTITUTION_SOURCE}

## Un territoire numérique

Le IIIe Delphinat de Gratianopolis est une **micronation Discord** : son territoire est le serveur Discord officiel, accessible via l'invitation [discord.gg/gratianopolis](https://discord.gg/gratianopolis).

La Constitution ne décrit aucun territoire physique, aucune ville, aucune frontière. Cette page ne comble donc pas ce vide par des suppositions : elle décrit ce qui existe et signale ce qui reste à documenter.

## Les espaces du Delphinat

| Espace | Rôle | Source |
| --- | --- | --- |
| Serveur Discord officiel | Territoire du Delphinat, administré par le Conseil Delphinal | Constitution, P-1 |
| Ce wiki | Encyclopédie publique du Delphinat : histoire, institutions, lois, personnalités | — |
| Canal de la Constitution | Diffusion du texte fondateur et de ses versions | Constitution.pdf |

## Administration du territoire

L'article P-1 confie aux **Conseillers du Dauphin** le « droit d'administration du serveur ». C'est la seule disposition de la Constitution qui rattache explicitement une compétence à un territoire.

## Ce qui reste à documenter

Aucune source disponible ne décrit :

- de chef-lieu ni de capitale ;
- de découpage territorial (provinces, districts) ;
- de frontières, de superficie ou de population ;
- de fuseau horaire de référence.

Ces rubriques seront renseignées par la rédaction du wiki dès qu'une source officielle existera. En attendant, l'infobox les affiche explicitement comme non définies plutôt que de les remplir.

## Voir aussi

- [[histoire-du-delphinat]]
- [[le-conseil-delphinal]]`,
  },

  // ------------------------------------------------------------------
  // Institutions — l'Assemblée et les baillits, deux parties de P-1.
  // ------------------------------------------------------------------
  {
    slug: "lassemblee",
    title: "L'Assemblée de Gratianopolis",
    category: "institutions",
    summary:
      "Représentant de l'Assemblée et députés : qui choisit l'assemblée, ce qu'elle représente et les règles d'accès au mandat de député.",
    tags: ["assemblée", "députés", "institutions"],
    author: "Rédaction du wiki",
    createdAt: iso(3),
    updatedAt: iso(0),
    infobox: {
      caption: "Institution",
      fields: [
        { label: "Institution", value: "Assemblée de Gratianopolis" },
        { label: "Représente", value: "L'assemblée de Gratianopolis" },
        { label: "Représente par", value: "Le Représentant de l'Assemblée" },
        { label: "Choisi par", value: "Le Dauphin ou le Premier Ministre" },
        { label: "Députés", value: "10 au maximum" },
        { label: "Nommés par", value: "Le Représentant de l'Assemblée" },
        { label: "Article", value: "P-1" },
      ],
      footer: "Source : Constitution.pdf, article P-1.",
    },
    content: `# L'Assemblée de Gratianopolis

${CONSTITUTION_SOURCE}

## Le Représentant de l'Assemblée

Le Représentant de l'Assemblée est **choisi par le Dauphin ou le Premier Ministre**.

Il **représente l'assemblée de Gratianopolis**.

Si il n'y a pas d'Assemblée, ni de Premier Ministre, alors le **Dauphin devient Représentant de l'Assemblée**.

## Les députés

- les députés sont nommés par le Représentant de l'Assemblée ;
- un nombre limité de députés est fixé à **10 députés** ;
- les députés peuvent être de partis politiques ou sans ;
- l'objectif des députés est de discuter des problèmes de Gratianopolis : l'international, l'activité, le Dauphin, ou autre ;
- ils peuvent être choisis par leur chef de parti s'ils font partie d'un parti.

## Portée

La Constitution confie à l'Assemblée une fonction de discussion et de représentation ; elle ne lui attribue pas de pouvoir exécutif. Le pouvoir exécutif appartient au Gouvernement, le pouvoir de véto au Dauphin.

> Les citoyens sont les seuls à pouvoir voter. Tout vote se fait librement et anonymement. — *Articles P-15 et P-15.1*

## Voir aussi

- [[le-gouvernement]]
- [[la-hierarchie-delphinale]]`,
  },
  {
    slug: "les-baillits",
    title: "Les baillits",
    category: "institutions",
    summary:
      "Les baillits sont les modérateurs du Delphinat : surveillance permanente du serveur, nomination par le Dauphin, validation par le Régent.",
    tags: ["baillit", "modération", "institutions"],
    author: "Rédaction du wiki",
    createdAt: iso(4),
    updatedAt: iso(0),
    infobox: {
      caption: "Charge",
      fields: [
        { label: "Charge", value: "Baillit" },
        { label: "Rôle", value: "Modérateur du serveur" },
        { label: "Mission", value: "Surveillance permanente du serveur" },
        { label: "Proposé par", value: "Le Dauphin" },
        { label: "Validé par", value: "Le Régent" },
        { label: "Pouvoir", value: "Mute d'un membre en attendant son jugement (P-7)" },
        { label: "Interdiction", value: "Bannir sans l'accord spécifique de la justice (P-7)" },
        { label: "Article", value: "P-1, P-7, P-11" },
      ],
      footer: "Source : Constitution.pdf, articles P-1, P-7 et P-11.",
    },
    content: `# Les baillits

${CONSTITUTION_SOURCE}

## Rôle

Ce sont les **modérateurs** : ils assurent une **surveillance permanente du serveur**.

Ils sont également choisis par le **Dauphin** et devraient être validés par le **Régent**.

## Pouvoirs et limites

L'article P-7 encadre directement leur action :

- les modérateurs **ne peuvent pas bannir** sans l'accord spécifique de la justice ;
- ils peuvent en revanche **mute** un membre en attendant son jugement ;
- s'ils enfreignent cette règle, ils doivent eux-mêmes comparaître devant la justice.

L'article P-11 complète le cadre : le staff se doit de **consulter les autres** avant d'appliquer une sanction (ban, mute, kick…), sauf en cas de **menace directe** pour le serveur.

Le Conseil Delphinal et le Régent jouent un rôle de contrôle : le Dauphin propose les staffs, mais sans l'approbation du Régent, la décision du Conseil Delphinal est caduque.

## Voir aussi

- [[la-hierarchie-delphinale]]
- [[les-lois-du-delphinat]]`,
  },

  // ------------------------------------------------------------------
  // Personnalités : les fiches de Eitam, Selios, Esto, Bougre, Swaylo et
  // Baron ne sont **pas** définies ici mais dans `seed-lore.ts`, qui porte le
  // récit de la rédaction. Ne pas les régénérer : deux définitions de même
  // slug font que la seconde écrase silencieusement la première.
  // ------------------------------------------------------------------
  ],
);

/**
 * Compose le jeu de données initial et **refuse les doublons de slug**.
 *
 * Un doublon est une erreur de programmation, pas un cas d'usage : il ferait
 * appliquer deux fois la même page, la seconde version écrasant silencieusement
 * la première. On le signale donc bruyamment, et on ne conserve que la
 * **dernière** définition (corriger consiste à réordonner, pas à chercher).
 */
function composeSeedArticles(...groups: Article[][]): Article[] {
  const bySlug = new Map<string, Article>();
  for (const article of groups.flat()) {
    if (bySlug.has(article.slug)) {
      console.error(
        `[seed] Doublon de slug « ${article.slug} » : la dernière définition est retenue. ` +
          "Corrigez src/lib/seed-data.ts avant de publier.",
      );
    }
    bySlug.set(article.slug, article);
  }
  return [...bySlug.values()];
}
