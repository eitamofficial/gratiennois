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
}

export const ROLE_INFO: Record<UserRole, RoleInfo> = {
  dauphin: {
    label: "Dauphin",
    basis: "« Le Dauphin possède tous les pouvoirs et également le droit de véto. »",
    canWrite: true,
    isDauphin: true,
  },
  regent: {
    label: "Régent",
    basis: "« Sa participation est obligatoire dans la création, la modification et la suppression de lois au conseil. »",
    canWrite: true,
    isDauphin: false,
  },
  conseil: {
    label: "Conseil Delphinal",
    basis: "« Ils sont les suppléants du Dauphin, ils disposent du droit d'administration du serveur. »",
    canWrite: true,
    isDauphin: false,
  },
  baillit: {
    label: "Baillit",
    basis: "« Ce sont les modérateurs, ils assurent une surveillance permanente du serveur. »",
    canWrite: true,
    isDauphin: false,
  },
  "premier-ministre": {
    label: "Premier Ministre",
    basis: "« Le Premier Ministre peut nommer un Gouvernement. »",
    canWrite: false,
    isDauphin: false,
  },
  ministre: {
    label: "Ministre",
    basis: "« Le Ministère est nommé par le Premier Ministre. »",
    canWrite: false,
    isDauphin: false,
  },
  representant: {
    label: "Représentant de l'Assemblée",
    basis: "« Le Représentant de l'Assemblée représente l'assemblée de Gratianopolis. »",
    canWrite: false,
    isDauphin: false,
  },
  depute: {
    label: "Député",
    basis: "« L'objectif des députés est de discuter des problème de Gratianopolis… »",
    canWrite: false,
    isDauphin: false,
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
}

/** Version publique d'un article (sans le corps, pour les listes). */
export type ArticleListItem = Omit<Article, "content">;

export interface Session {
  username: string;
  role: UserRole;
  expiresAt: Date;
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
