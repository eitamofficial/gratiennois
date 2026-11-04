export const CATEGORIES = [
  "histoire",
  "institutions",
  "geographie",
  "culture",
  "lois",
  "personnalites",
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Rôles d'édition : ce sont exactement les charges définies par la
 * Constitution (article P-1) du IIIe Delphinat. Aucun rôle n'est inventé.
 *   - dauphin : « possède tous les pouvoirs et également le droit de véto »
 *   - regent / conseil / baillit : création, modification, restauration
 *   - les charges représentatives n'ont pas de pouvoir d'édition sur le wiki
 */
export const USER_ROLES = [
  "dauphin",
  "regent",
  "conseil",
  "baillit",
  "premier-ministre",
  "ministre",
  "representant",
  "depute",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface RoleInfo {
  /** Intitulé officiel de la charge. */
  label: string;
  /** Extrait de la Constitution justifiant les droits sur le wiki. */
  basis: string;
  /** Peut créer, modifier et restaurer des articles. */
  canWrite: boolean;
  /** Peut en outre supprimer un article et lancer la synchronisation Discord. */
  isDauphin: boolean;
  /**
   * Accès complet : suppression, synchronisation Discord, jeu de données et
   * modération des commentaires. Porté par le Dauphin et le Premier Ministre.
   *
   * Doublonne `isDauphin` volontairement : le nom historique est conservé pour
   * les routes existantes, et `fullAccess` décrit mieux ce qu'il recouvre
   * désormais (les commentaires n'existaient pas quand il a été nommé).
   */
  fullAccess: boolean;
}

export const ROLE_INFO: Record<UserRole, RoleInfo> = {
  dauphin: {
    label: "Dauphin",
    basis: "« Le Dauphin possède tous les pouvoirs et également le droit de véto. »",
    canWrite: true,
    isDauphin: true,
    fullAccess: true,
  },
  regent: {
    label: "Régent",
    basis: "« Sa participation est obligatoire dans la création, la modification et la suppression de lois au conseil. »",
    canWrite: true,
    isDauphin: false,
    fullAccess: false,
  },
  conseil: {
    label: "Conseil Delphinal",
    basis: "« Ils sont les suppléants du Dauphin, ils disposent du droit d'administration du serveur. »",
    canWrite: true,
    isDauphin: false,
    fullAccess: false,
  },
  baillit: {
    label: "Baillit",
    basis: "« Ce sont les modérateurs, ils assurent une surveillance permanente du serveur. »",
    canWrite: true,
    isDauphin: false,
    fullAccess: false,
  },
  "premier-ministre": {
    label: "Premier Ministre",
    basis: "« Le Premier Ministre peut nommer un Gouvernement. »",
    // Le Premier Ministre écrit : sans cela, le chef du Gouvernement ne peut
    // pas ouvrir l'espace d'édition du wiki qu'il administre, ce qui rendait la
    // fonction inutilisable pour son titulaire. Il conserve en outre l'accès
    // complet (suppression, synchronisation, modération des commentaires).
    canWrite: true,
    isDauphin: false,
    fullAccess: true,
  },
  ministre: {
    label: "Ministre",
    basis: "« Le Ministère est nommé par le Premier Ministre. »",
    canWrite: false,
    isDauphin: false,
    fullAccess: false,
  },
  representant: {
    label: "Représentant de l'Assemblée",
    basis: "« Le Représentant de l'Assemblée représente l'assemblée de Gratianopolis. »",
    canWrite: false,
    isDauphin: false,
    fullAccess: false,
  },
  depute: {
    label: "Député",
    basis: "« L'objectif des députés est de discuter des problème de Gratianopolis… »",
    canWrite: false,
    isDauphin: false,
    fullAccess: false,
  },
};

// ---------------------------------------------------------------------------
// Boîte d'informations (infobox)
// ---------------------------------------------------------------------------

/** Une ligne « libellé → valeur » de la boîte d'informations. */
export interface InfoboxField {
  label: string;
  value: string;
}

/**
 * Encadré de synthèse affiché à droite de l'article, dans l'esprit de
 * Wikipédia : titre, illustration, données clés, mention de source.
 *
 * Les valeurs sont de simples chaînes : le composant les rend comme du texte
 * React (échappement garanti) et la validation serveur les borne en taille.
 */
export interface ArticleInfobox {
  /** Sous-titre de l'encadré (ex. « Texte fondateur », « Institution »). */
  caption?: string;
  /** Illustration : chemin interne uniquement (`/flag.webp`), jamais d'URL externe. */
  imageUrl?: string;
  /** Texte alternatif de l'illustration (obligatoire pour l'accessibilité). */
  imageAlt?: string;
  /** Légende affichée sous l'illustration. */
  imageCaption?: string;
  /** Données clés, dans l'ordre d'affichage. */
  fields: InfoboxField[];
  /** Mention de bas d'encadré (source, statut, avertissement). */
  footer?: string;
}

export interface Article {
  slug: string;
  title: string;
  category: Category;
  /** Court résumé affiché dans les cartes et la balise meta description. */
  summary: string;
  /** Corps de l'article en Markdown. */
  content: string;
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  /** ID utilisateur Discord (personnalités) résolu par la synchronisation ou saisi par l'admin. */
  discordUserId?: string;
  /** Données clés de l'article ; complétées automatiquement si absent. */
  infobox?: ArticleInfobox;
  /**
   * État de publication. `publie` est la valeur normale ; `proposition` désigne
   * une page **rédigée par l'IA** et en attente de validation humaine.
   *
   * Le choix est délibéré : l'intelligence automatique peut bien rédiger seule,
   * elle ne publie pas seule. Une proposition n'apparaît nulle part sur le site
   * public et n'est appliquée qu'après relecture dans l'espace d'édition.
   * Absent = `publie`, pour que les articles existants restent inchangés.
   */
  status?: ArticleStatus;
  /** Origine de la rédaction : saisie humaine, ou proposition de l'IA. */
  origin?: ArticleOrigin;
}

export const ARTICLE_STATUSES = ["publie", "proposition"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const ARTICLE_ORIGINS = ["relecture", "ia"] as const;
export type ArticleOrigin = (typeof ARTICLE_ORIGINS)[number];

/** Une proposition est-elle en attente de validation ? */
export function isProposal(article: Article): boolean {
  return article.status === "proposition";
}

/** Données envoyées par le formulaire d'administration (création / édition). */
export interface ArticleInput {
  title: string;
  category: Category;
  summary: string;
  content: string;
  tags: string[];
  /** Auteur : rempli automatiquement avec la session admin côté API. */
  author?: string;
  /** ID utilisateur Discord pour les profils de personnalités. */
  discordUserId?: string;
  /** Boîte d'informations ; `undefined` = infobox automatique (notice de l'article). */
  infobox?: ArticleInfobox;
  /**
   * Slug explicite. Réservé à la synchronisation Discord, qui doit rattacher
   * une fiche au pseudo exact du membre et non à un slug deviné depuis le
   * titre. Absent, le slug est déduit du titre comme d'habitude.
   */
  slug?: string;
  /**
   * État de publication demandé. `proposition` crée un **brouillon** invisible
   * du public : utile pour préparer un texte à faire relire, et c'est ainsi
   * que sont déposées les propositions de l'analyse automatique.
   */
  status?: ArticleStatus;
  /** Origine déclarée de la rédaction. */
  origin?: ArticleOrigin;
  /** Résumé de modification, conservé dans la révision produite par l'écriture. */
  comment?: string;
  /** Modification mineure (forme, orthographe) — indicateur d'historique. */
  minor?: boolean;
}

/** Version publique d'un article (sans le corps, pour les listes). */
export type ArticleListItem = Omit<Article, "content">;

export interface Session {
  username: string;
  role: UserRole;
  expiresAt: Date;
  /**
   * Origine de l'identité : compte local (`WIKI_USERS`) ou connexion Discord.
   * Les champs suivants ne sont renseignés que dans le second cas, et restent
   * facultatifs pour que les comptes locaux continuent de fonctionner.
   */
  provider?: string;
  displayName?: string;
  avatarUrl?: string;
  discordUserId?: string;
}

/**
 * Nom à afficher pour une session.
 *
 * Le pseudo Discord quand il existe, l'identifiant de compte sinon. On ne
 * renvoie jamais une chaîne vide : un commentaire ou une entrée d'audit sans
 * auteur serait plus gênant qu'un identifiant technique.
 */
export function sessionLabel(session: Session): string {
  const nom = session.displayName?.trim();
  return nom || session.username;
}

// ---------------------------------------------------------------------------
// Historique des révisions
// ---------------------------------------------------------------------------

export type RevisionAction = "create" | "update" | "delete" | "restore";

export interface RevisionSnapshot {
  title: string;
  category: Category;
  summary: string;
  content: string;
  tags: string[];
  /** Conservé dans l'historique : restaurer une version restaure aussi l'infobox. */
  infobox?: ArticleInfobox;
}

export interface Revision {
  id: string;
  articleSlug: string;
  action: RevisionAction;
  author: string;
  createdAt: string;
  snapshot: RevisionSnapshot;
  /**
   * Résumé de modification saisi par le rédacteur — la « boîte de résumé » de
   * Wikipédia. Facultatif : une correction faite à la volée n'a pas toujours
   * de quoi se décrire, et l'imposer pousserait à écrire « maj ».
   */
  comment?: string;
  /**
   * Modification mineure : correction de forme, orthographe, mise en page.
   * Sert à filtrer l'historique, comme le « m » des historiques de Wikipédia.
   */
  minor?: boolean;
}

// ---------------------------------------------------------------------------
// Entités Discord (synchronisation via l'API officielle)
// ---------------------------------------------------------------------------

export interface DiscordGuild {
  id: string;
  name: string;
  iconUrl: string | null;
  memberCount: number | null;
  onlineCount: number | null;
}

export interface DiscordRole {
  id: string;
  name: string;
  /** Couleur CSS (#rrggbb) ou null si couleur par défaut. */
  color: string | null;
  position: number;
}

export interface DiscordMember {
  id: string;
  username: string;
  globalName: string | null;
  nickname: string | null;
  displayName: string;
  avatarUrl: string | null;
  roleIds: string[];
  joinedAt: string | null;
  /** Compte automatique signalé par l'API Discord. Exclu des personnalités et des citoyens. */
  isBot: boolean;
}

export type DiscordSyncSource = "bot" | "widget" | "none";

export interface DiscordSnapshot {
  source: DiscordSyncSource;
  fetchedAt: string;
  guild: DiscordGuild | null;
  members: DiscordMember[];
  roles: DiscordRole[];
  errors: string[];
}
