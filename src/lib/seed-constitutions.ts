import type { Article } from "./types";

/**
 * Textes fondateurs des deux premiers Delphinats.
 *
 * **Règle éditoriale de ce fichier** : ce sont des *transcriptions intégrales*
 * de documents officiels. Elles occupent donc le plus haut niveau de la
 * hiérarchie des sources du wiki, juste après la Constitution en vigueur : ce
 * qui y est écrit est la parole du document lui-même, et non une
 * interprétation. Rien n'est attribué à la rédaction.
 *
 * Les deux PDF sont servis dans `public/` et retranscrits par
 * `scripts/extract_pdf_text.py`, qui reconstitue les accents à partir des
 * tables ToUnicode des polices incorporées.
 */

/** Drapeau commun au Ier et au IIe Delphinat, avant celui du IIIe. */
const HISTORICAL_FLAG = "/drapeau-Ier-IIe-Delphinat.webp";

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

export const SEED_CONSTITUTION_ARTICLES: Article[] = [
  // =====================================================================
  // Ier Delphinat — le Règlement du serveur
  // =====================================================================
  {
    slug: "reglement-du-ier-delphinat",
    title: "Règlement du serveur du Ier Delphinat",
    category: "lois",
    summary:
      "Texte intégral du Règlement officiel ayant fondé le Ier Delphinat : hiérarchie institutionnelle et articles P-5 à P-21, avec l'Assemblée Gratiennoise et les Fils de Gratianopolis.",
    tags: [
      "ier delphinat",
      "constitution",
      "règlement",
      "assemblée gratiennoise",
      "fils de gratianopolis",
    ],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Texte fondateur",
      imageUrl: HISTORICAL_FLAG,
      imageAlt:
        "Drapeau du Ier et du IIe Delphinat de Gratianopolis",
      imageCaption:
        "Drapeau commun au Ier et au IIe Delphinat, distinct de celui du IIIe",
      fields: [
        { label: "Nature", value: "Règlement officiel du serveur" },
        { label: "Règne", value: "Ier Delphinat" },
        { label: "Document", value: "Règlement et organisation institutionnelle" },
        {
          label: "Partie I",
          value: "Hiérarchie et organisation",
        },
        {
          label: "Partie II",
          value: "Articles P-5 à P-21",
        },
        { label: "Source", value: "Document officiel, transcription intégrale" },
      ],
      footer:
        "Document officiel consultable : Reglement-Ier-Delphinat.pdf. Transcription intégrale.",
    },
    content: `# Règlement du serveur du Ier Delphinat

> Source officielle : [Règlement du Ier Delphinat](/Reglement-Ier-Delphinat.pdf) — document de référence intitulé « Règlement et organisation institutionnelle du serveur : hiérarchie, pouvoirs, justice et règles de vie communautaire ».

Le **Ier Delphinat** est l'ère fondatrice de Gratianopolis. Le document qui l'a
organisé ne s'appelle pas « Constitution » mais **Règlement du serveur** : la
difference de nom importe, car elle dit déjà la nature du pouvoir — celui
d'une communauté qui se donne des règles, et non d'un État qui se constitue.

Le texte comporte deux parties : la **hiérarchie et l'organisation**, puis les
**articles du Règlement**.

## I. Hiérarchie et organisation

### Dauphin

> « Dispose de tous les pouvoirs, y compris le droit de veto en toutes circonstances. Le Dauphin est en capacité de créer ainsi que de supprimer des lois. Les lois instaurées se doivent d'être appliquées par leur auteur. »

### Régent

> « Ils possèdent le pouvoir de refuser une personne en staff. Le Dauphin propose les staffs (baillits) et autres rangs supérieurs, mais sans l'approbation du Régent, la décision du Conseil delphinal sera caduque. Ils sont éligibles au rôle de Dauphin dans le cadre de l'article P-21. La participation du Régent est obligatoire dans la création, la modification et la suppression de lois au Conseil. »

### Conseil delphinal

> « Les membres du Conseil delphinal disposent du droit d'administration du serveur. Ils peuvent participer aux votes de lois, mais leur participation n'est pas obligatoire. Les sangs delphinaux sont constitués des membres nommés pour leur dévouement et des membres nommés pour leurs faits d'armes. »

### Modération

> « Ce sont les modérateurs. Ils assurent une surveillance permanente du serveur. »

### Élus du peuple

> « Ils constituent l'Assemblée Gratiennoise. Ils ont la possibilité d'élire à la majorité absolue le Premier ministre, de proposer le rank ou le derank des membres du Conseil delphinal (sauf Fils de France et Dauphin), ainsi que de proposer et de voter la création, la modification et la suppression de lois. Pour le derank des Fils de France, l'unanimité est requise. Cas exceptionnel : si l'un des concernés par le derank a la capacité de voter, son vote ne sera pas comptabilisé pour sa sanction. »

### Premier ministre

> « Le Premier ministre est membre observateur du Conseil delphinal. Le Premier ministre détient la possibilité d'élire son gouvernement. La durée d'un mandat de Premier ministre est de 1 mois. »

## II. Articles du Règlement

### Article P-5

> « Les personnes possédant des titres de noblesse possèdent des avantages judiciaires. En revanche, ces titres de noblesse doivent avoir été financés par eux-mêmes de manière indépendante. Cette facilité se détériore pour les récidivistes, mais ne se consomme que par décision d'un juge (minimum 2 récidives). »

### Article P-6

> « Les Conseillers du Dauphin sont les garants de la Constitution et veillent à son application de manière impartiale. Ils sont nommés par le chef et fondateur de la ligue. »

### Article P-7

> « Certaines idéologies extrémistes sont interdites : le Stalinisme, le Polpotisme, le Maoïsme, le sionisme, l'islamisme, le satanisme, l'afrocentrisme. Cette liste est exhaustive. »

### Article P-8

> « Les modérateurs ne peuvent pas bannir sans l'accord spécifique de la justice. Ils peuvent cependant muter un membre en attendant son jugement. S'ils enfreignent cette règle, ils devront eux-mêmes comparaître devant la justice. »

### Article P-9

> « Il est déconseillé d'insulter la croyance d'autrui. »

### Article P-10

> « Il est déconseillé d'insulter autrui sur ses appartenances communautaires. »

### Article P-11

> « Il est interdit de dévoiler des informations sur autrui (nom, position, IP, etc.). »

### Article P-12

> « Il est interdit de discriminer autrui, quelles qu'en soient les raisons. »

### Article P-13

> « Les propos nuisant à l'ambiance du serveur sont sanctionnables. »

### Article P-14

> « Le harcèlement envers autrui est également interdit. »

### Article P-15

> « Il est interdit de répandre des fake news ou des rumeurs. »

### Article P-16

> « Les pings incluant des personnes non consentantes de manière abusive et sans justification sont à proscrire. »

### Article P-17

> « Les Fils de Gratianopolis se doivent de consulter les autres avant d'appliquer une sanction de type : ban, mute, kick, etc., sauf en cas de menace directe pour le serveur. »

### Article P-18

> « Si un membre a un doute ou une ambiguïté sur une règle, qu'il aille voir un supérieur afin de lui expliquer la situation. »

### Article P-19

> « Tout membre ayant la capacité d'infliger des sanctions subira lui-même des sanctions en cas d'abus. »

### Article P-20

> « En cas de procès, un Fils de Gratianopolis ou le Dauphin sera juge. Il peut y avoir des avocats. L'article P-5 est appliqué s'il est invoqué par l'un des participants. Le verdict du juge lui est libre, mais le Conseil delphinal peut annuler la sanction si le refus est unanime au sein du Conseil. »

### Article P-21 — Procédure de changement de Dauphin

> « Seuls les Fils de Gratianopolis peuvent prétendre à ce titre selon la démarche suivante :
> 1. La personne prétendant au titre absolu doit d'abord attester sa réclamation au Conseil.
> 2. S'ensuivra un vote composé des Fils de Gratianopolis et des sangs delphinaux.
> 3. Si ce premier vote est positif, un second vote sera effectué, mais il concernera tous les citoyens.
> 4. En cas de victoire, ce dernier devient Dauphin de jure et le Dauphin de facto doit lui céder ses pouvoirs. »

## Ce que ce règlement possède de plus tard

Trois institutions de ce Règlement n'existent plus dans la
[[la-constitution|Constitution du IIIe Delphinat]] : l'**Assemblée
Gratiennoise** (remplacée par le Représentant de l'Assemblée et les
députés), les **Élus du peuple** en tant que corps distinct, et les **Fils de
Gratianopolis** comme condition d'accès à la Dauphinie. L'article P-21, qui
organisait la succession par un double vote des Fils puis de tous les citoyens,
a été remplacé par l'article P-15 de la Constitution en vigueur, où les
Dauphins votables sont nommément désignés.

Le Règlement est également le texte qui institue la **noblesse** (article P-5) :
des titres doivent être financés par leurs porteurs, et leurs avantages
judiciaires se consomment par récidive. Le [[2e-delphinat|IIe Delphinat]] puis
le IIIe ont successivement abandonné la noblesse, la Junte Militaire, puis
rétabli une hiérarchie de charges elective.

*Cette page est la transcription intégrale du document officiel. Elle ne
contient aucun commentaire de la rédaction.*
`,
  },

  // =====================================================================
  // IIe Delphinat — la Constitution et la hiérarchie
  // =====================================================================
  {
    slug: "constitution-du-2e-delphinat",
    title: "Constitution et Hiérarchie du IIe Delphinat Gratiennois",
    category: "lois",
    summary:
      "Texte intégral de la Constitution du IIe Delphinat : hiérarchie des charges, inéligibilité des chefs de micronations étrangères, motion de censure et articles P-1 à P-15.",
    tags: ["2e delphinat", "constitution", "hiérarchie", "motion de censure", "dauphin"],
    author: "Rédaction du wiki",
    createdAt: iso(6),
    updatedAt: iso(0),
    infobox: {
      caption: "Texte fondateur",
      imageUrl: HISTORICAL_FLAG,
      imageAlt: "Drapeau du Ier et du IIe Delphinat de Gratianopolis",
      imageCaption:
        "Drapeau commun au Ier et au IIe Delphinat, distinct de celui du IIIe",
      fields: [
        { label: "Nature", value: "Constitution et hiérarchie" },
        { label: "Règne", value: "IIe Delphinat" },
        { label: "Article central", value: "Article P-1, la hiérarchie" },
        { label: "Portée", value: "Articles P-1 à P-15" },
        {
          label: "Dauphins votables",
          value: "Esto, Sélios et Math",
        },
        {
          label: "Innovation notable",
          value: "Inéligibilité des chefs de micronations étrangères",
        },
        { label: "Source", value: "Document officiel, transcription intégrale" },
      ],
      footer:
        "Document officiel consultable : Constitution-IIe-Delphinat.pdf. Transcription intégrale.",
    },
    content: `# Constitution et Hiérarchie du IIe Delphinat Gratiennois

> Source officielle : [Constitution et Hiérarchie du IIe Delphinat](/Constitution-IIe-Delphinat.pdf) — créé par Yume, Sèlios, lotharingiaball et Marwan le 20/09/2025, modifié par Qtn de M trg le 08/03/2026, réécriture par Esto le 09/09/2026. Version finale éditée le 09/09/26.

La Constitution du **IIe Delphinat** est le texte qui a rétabli le régime
delphinal après la [[la-junte-militaire|Junte Militaire]]. C'est le premier
texte de Gratianopolis à distinguer nettement **la hiérarchie des charges**
de la **règle de vie communautaire** : l'article P-1 décrit l'État, les articles
P-2 à P-15 la société.

## Article P-1 — La hiérarchie

> « Gratianopolis est représentée et gérée selon cette hiérarchie. »

### Dauphin

> « Le Dauphin possède tous les pouvoirs et également le droit de véto. Ce dernier doit changer chaque mois via un vote et les seuls autorisés légalement à participer à ce vote sont Esto, Sélios et Math. Si un Dauphin est au pouvoir puis que son mandat se termine et qu'aucun des deux autres Dauphins se présente alors le Dauphin actuel reprend règne jusqu'au prochain élection. Puisque le Dauphin a les pleins pouvoirs il peut ajouter, réécrire ou supprimer des lois de la constitution mais il devra montrer les changement effectué au Conseil Delphinal. Si le changement est approuvé par 50% de cette dernière alors les modifications seront effectuées. »

### Régent

> « Ils possèdent le pouvoir de refuser une personne en staff. Le Dauphin propose les staffs (baillit) et autres rangs supérieurs mais sans l'approbation du régent, la décision du conseil delphinal sera caduque. Sa participation est obligatoire dans la création, la modification et la suppression de lois au conseil. »

### Conseil Delphinal

> « Ils sont les suppléants du Dauphin, ils disposent du droit d'administration du serveur. Ils peuvent participer aux votes de lois mais leur participation n'est pas obligatoire. Les sangs delphinaux sont constitués des Géniteurs, nommés pour leur dévouement et des Agellids, nommés pour leurs faits d'armes. Le Conseil peut demander une Motion de Censure au Dauphin pour le Premier Ministre mais faut que le Dauphin approuve cette dernière. Le Dauphin fait lui-même partie du Conseil et il peut lui-même mettre une motion de censure et passer par lui-même pour la valider. »

### Baillit

> « Ce sont les modérateurs, ils assurent une surveillance permanente du serveur. Ils sont également choisis par le Dauphin et devraient être validés par le Régent. »

### Premier Ministre

> « Le Premier Ministre est élu par un vote démocratique qui est voté par l'ensemble de la Nation. Le mandat de ce dernier dure 2 mois, donc il doit être sûr de faire un programme qui dure 2 mois ; par contre, s'il n'a pas terminé son programme le prochain Premier Ministre peut prendre les choses qui n'ont pas été terminées. Le Dauphin peut faire une Motion de Censure sur le Premier Ministre si ce dernier ne respecte pas la Constitution. Le Premier Ministre peut nommer un Gouvernement (il peut inviter d'autres membres pour remplir son gouvernement). »

### Ministre

> « Les Ministères sont nommés par le Premier Ministre à des postes précis et professionnels. Les ministres restent au Gouvernement jusqu'à la fin du gouvernement du Premier Ministre. »

### Représentant de l'Assemblée

> « Le Représentant de l'Assemblée est choisi par le Dauphin ou le Premier Ministre. Le Représentant de l'Assemblée représente l'assemblée de Gratianopolis. S'il n'y a pas d'Assemblée, ni de Premier Ministre, alors le Dauphin devient Représentant de l'Assemblée. »

### Député

> « Les députés sont nommés par le Représentant de l'Assemblée ; un nombre limité de députés est fixé à 10 Députés. Les députés peuvent être de partis politiques ou sans. L'objectif des députés est de discuter des problèmes de Gratianopolis comme l'international, l'activité, le Dauphin ou autre. »

## Les articles

### Article P-2

> « Aucune forme de harcèlement, de discrimination ou autre sera toléré et finira au tribunal de Gratianopolis. »

### Article P-3

> « Certaines idéologies extrémistes sont interdites comme le Néonazisme, le Fascisme révolutionnaire, le Suprémacisme raciale, le Stalinisme, le Djihadisme, le Sionisme. Cette liste est à respecter. »

### Article P-4

> « Les contenus ou discussions à connotation pornographique (incluent la Zoophilie, la Nécrophilie et Pédophilie) ne doivent pas être publics. »

### Article P-5

> « Toute action qui nuira à la souveraineté de Gratianopolis sera sanctionnée. S'il s'agit d'un état, alors l'état de guerre sera lancé. »

### Article P-6

> « Il est déconseillé d'insulter la croyance d'autrui. »

### Article P-7

> « Les modérateurs ne peuvent pas bannir sans l'accord spécifique de la justice. Ils peuvent cependant muter un membre en attendant son jugement. Si ils enfreignent cette règle, ils devront eux-mêmes comparaître devant la justice. »

### Article P-8

> « Les Conseillers du dauphin sont les garants de la constitution et veillent à son application de manière impartiale. Ils sont nommés par le chef et fondateur de la ligue. »

### Article P-9

> « Il est interdit de leak les informations personnelles d'une personne sans son accord, pareille pour la promotion de site OSINT. »

### Article P-10

> « Les pings incluant des personnes non consentantes de manière abusive sans justification sont à proscrire. »

### Article P-11

> « Le staff se doit de consulter les autres avant d'appliquer une sanction type : ban, mute, kick, etc., sauf en cas de menace directe pour le serveur. »

### Article P-12

> « Si un membre ne comprend pas un article de la constitution, il est conseillé à ce dernier de faire un ticket pour demander de l'aider à comprendre. »

### Article P-13

> « Si un procès a lieu, les juges seront juge du procès ; mais s'ils ne sont pas présents alors le Dauphin sera juge. »

### Article P-14

> « Les chefs de Micronation étrangère ne peuvent pas se présenter aux élections de Premier Ministre pour éviter des influences ou du contrôle sur Gratianopolis. »

### Article P-15

> « 1 : Le changement de dauphin se fait à chaque fin de mandat d'un des dauphins au trône. 2 : Les dauphins que l'on peut voter sont Esto, Sélios et Math. »

## Deux dispositions à retenir

**L'article P-14** est la seule règle du texte qui mentionne les **micronations
étrangères** : elle interdit à leurs chefs de se présenter au gouvernement de
Gratianopolis, « pour éviter des influences ou du contrôle ». C'est une
disposition anti-impérialiste, qui explique qu'un [[swaylo|Empereur de
Norlot]] ne puisse diriger le gouvernement de [[esto|Esto]] : le conquérant
d'hier reste à la porte du pouvoir.

**L'article P-15** nominalise les Dauphins votables : *Esto*, *Sélios* et
*Math*. Le Trône n'est donc pas une abstraction — c'est une liste fermée de
trois noms, ce qui explique la persistence du conflit entre eux, et pourquoi le
[[math|coup d'État de Math]] et le [[selios|retour de Sélios]] se jouent tous
deux sur ce même article.

*Cette page est la transcription intégrale du document officiel. Elle ne
contient aucun commentaire de la rédaction.*
`,
  },
];
