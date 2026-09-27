import type { Article, Revision, RevisionAction } from "../types";

/** Filtres et pagination appliqués à une recherche dans l'historique. */
export interface RevisionQuery {
  /** Restreint à un article ; absent = tous les articles confondus. */
  slug?: string;
  /** Recherche sur le titre et le contenu de la révision (insensible à la casse). */
  q?: string;
  action?: RevisionAction;
  /** Filtrage exact sur l'auteur de la révision. */
  author?: string;
  limit: number;
  offset: number;
}

export interface RevisionPage {
  /** Révisions de la page demandée, de la plus récente à la plus ancienne. */
  revisions: Revision[];
  /** Nombre total de révisions correspondant aux filtres (indépendant de la page). */
  total: number;
}

/**
 * Contrat commun aux pilotes de stockage. L'application ne parle qu'à cette
 * interface : remplacer JSON par PostgreSQL (ou autre) ne touche à aucune page.
 */
export interface StorageDriver {
  readonly name: "json" | "postgres";
  /** Prépare le schéma / les fichiers et insère les articles de lancement si le magasin est vide. */
  init(seed: Article[]): Promise<void>;
  countArticles(): Promise<number>;
  getAllArticles(): Promise<Article[]>;
  getArticleBySlug(slug: string): Promise<Article | null>;
  createArticle(article: Article): Promise<void>;
  updateArticle(article: Article): Promise<void>;
  deleteArticle(slug: string): Promise<boolean>;
  /** Met à jour les IDs Discord de plusieurs articles en une passe (synchronisation). */
  setDiscordUserIds(mapping: Record<string, string>): Promise<void>;
  addRevision(revision: Revision): Promise<void>;
  getRevisionsBySlug(slug: string): Promise<Revision[]>;
  getRevision(slug: string, revisionId: string): Promise<Revision | null>;
  /** Flux d'activité global (tous articles confondus), pour l'administration. */
  getRecentRevisions(limit: number): Promise<Revision[]>;
  /** Historique paginé et filtré : l'implémentation SQL limite au niveau de la base. */
  queryRevisions(query: RevisionQuery): Promise<RevisionPage>;
  /**
   * Métadonnées techniques du wiki (clé/valeur) — par exemple l'empreinte du
   * dernier contenu officiel publié, qui permet de savoir si un article a été
   * retouché par un rédacteur ou est encore exactement celui du jeu de données
   * initial. Séparé des articles : ces clés ne sont jamais exposées au public.
   */
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
}
