import { randomUUID } from "node:crypto";
import { clearStorageError, getDriver, getStorageName, recordStorageError } from "./store";
import type { RevisionPage, RevisionQuery } from "./store/types";
import { articleFingerprint, seedFingerprint } from "./fingerprint";
import { SEED_ARTICLES, SEED_VERSION } from "./seed-data";
import { InfoboxValidationError, normalizeInfobox } from "./infobox";
import { slugify } from "./slug";
import {
  ARTICLE_STATUSES,
  CATEGORIES,
  type Article,
  type ArticleInput,
  type ArticleOrigin,
  type ArticleStatus,
  type Category,
  type Revision,
  type RevisionAction,
} from "./types";
import { parseCategory } from "./constants";

/** Nom du pilote actif ("json" ou "postgres") — affiché dans l'admin. */
export function storageName(): "json" | "postgres" {
  return getStorageName();
}

/** Garantit que le magasin est prêt (schéma PG ou fichiers JSON + seed). */
async function ensureReady() {
  const driver = getDriver();
  try {
    await driver.init(SEED_ARTICLES);
    clearStorageError();
    return driver;
  } catch (error) {
    // On conserve le message pour l'afficher dans /admin et /api/health.
    recordStorageError(error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

/** Renvoie tous les articles, triés par date de mise à jour (plus récent d'abord). */
export async function getAllArticles(): Promise<Article[]> {
  const driver = await ensureReady();
  const articles = await driver.getAllArticles();
  return articles.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const driver = await ensureReady();
  return driver.getArticleBySlug(slug);
}

/**
 * Articles **publiés**, c'est-à-dire tout sauf les propositions de l'IA.
 *
 * C'est la seule fonction que doivent appeler les pages publiques. Une
 * proposition est un brouillon : la montrer equiviendrait à laisser un modèle
 * écrire le site tout seul, ce que l'architecture interdit.
 */
export async function getPublishedArticles(): Promise<Article[]> {
  return (await getAllArticles()).filter((article) => article.status !== "proposition");
}

/** Article publié, ou `null` s'il n'existe pas ou s'il est en proposition. */
export async function getPublishedArticleBySlug(
  slug: string,
): Promise<Article | null> {
  const article = await getArticleBySlug(slug);
  if (!article || article.status === "proposition") return null;
  return article;
}

/** Les propositions en attente de relecture, les plus récentes d'abord. */
export async function getProposals(): Promise<Article[]> {
  return (await getAllArticles()).filter((article) => article.status === "proposition");
}

export async function getArticlesByCategory(category: Category): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles.filter((article) => article.category === category);
}

/** Liste sans le corps des articles (pour les cartes, les listes et l'accueil). */
export async function listArticleSummaries(): Promise<Omit<Article, "content">[]> {
  const articles = await getAllArticles();
  return articles.map(({ content: _content, ...rest }) => rest);
}

// ---------------------------------------------------------------------------
// Historique des révisions
// ---------------------------------------------------------------------------

function toSnapshot(article: Article) {
  return {
    title: article.title,
    category: article.category,
    summary: article.summary,
    content: article.content,
    tags: article.tags,
    infobox: article.infobox,
  };
}

async function recordRevision(
  article: Article,
  action: Revision["action"],
  author: string,
): Promise<void> {
  const driver = await ensureReady();
  await driver.addRevision({
    id: randomUUID(),
    articleSlug: article.slug,
    action,
    author,
    createdAt: new Date().toISOString(),
    snapshot: toSnapshot(article),
  });
}

/** Historique d'un article (du plus récent au plus ancien, plafonné à 50 entrées). */
export async function getRevisionsBySlug(slug: string): Promise<Revision[]> {
  const driver = await ensureReady();
  return driver.getRevisionsBySlug(slug);
}

/** Flux d'activité global, pour le tableau de bord d'administration. */
export async function getRecentRevisions(limit = 40): Promise<Revision[]> {
  const driver = await ensureReady();
  return driver.getRecentRevisions(limit);
}

export const REVISION_ACTIONS: RevisionAction[] = ["create", "update", "delete", "restore"];

/** Nombre de révisions affichées par page dans l'historique. */
export const REVISIONS_PER_PAGE = 20;

/** Plafond dur, pour qu'un `?perPage=100000` ne charge pas tout l'historique. */
const MAX_PER_PAGE = 100;

export interface ParsedRevisionQuery extends RevisionQuery {
  /** Page demandée, à partir de 1 (bornée). */
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * Traduit les paramètres d'URL (`page`, `perPage`, `q`, `action`, `author`) en
 * requête de stockage valide. Les valeurs aberrantes retombent sur les
 * défauts plutôt que de faire échouer la page.
 */
export function parseRevisionQuery(
  params: URLSearchParams,
  options: { slug?: string } = {},
): ParsedRevisionQuery {
  const toPositiveInt = (raw: string | null, fallback: number, max: number) => {
    const value = Number.parseInt(raw ?? "", 10);
    if (!Number.isFinite(value) || value < 1) return fallback;
    return Math.min(value, max);
  };

  const page = toPositiveInt(params.get("page"), 1, 100_000);
  const perPage = toPositiveInt(params.get("perPage"), REVISIONS_PER_PAGE, MAX_PER_PAGE);
  const action = params.get("action");
  const q = params.get("q")?.trim();
  const author = params.get("author")?.trim();

  return {
    slug: options.slug,
    q: q ? q.slice(0, 200) : undefined,
    action: action && (REVISION_ACTIONS as string[]).includes(action) ? (action as RevisionAction) : undefined,
    author: author ? author.slice(0, 64) : undefined,
    limit: perPage,
    page,
    perPage,
    offset: (page - 1) * perPage,
    totalPages: 1,
  };
}

/** Historique paginé et filtré, avec le nombre total de révisions correspondantes. */
export async function queryRevisions(query: RevisionQuery): Promise<RevisionPage> {
  const driver = await ensureReady();
  return driver.queryRevisions(query);
}

export interface RevisionPageResult extends RevisionPage {
  query: ParsedRevisionQuery;
  /** Nombre de pages (au moins 1), recalculé sur le total réel. */
  totalPages: number;
}

/**
 * Point d'entrée unique des pages et API d'historique : analyse l'URL, interroge
 * le magasin et renvoie une page cohérente (la page demandée est ramenée dans
 * l'intervalle réel si l'URL pointe au-delà de la fin).
 */
export async function getRevisionPage(
  params: URLSearchParams,
  options: { slug?: string } = {},
): Promise<RevisionPageResult> {
  const query = parseRevisionQuery(params, options);
  const driver = await ensureReady();
  const first = await driver.queryRevisions({ ...query, limit: 1, offset: 0 });
  const totalPages = Math.max(1, Math.ceil(first.total / query.perPage));
  const page = Math.min(query.page, totalPages);
  const offset = (page - 1) * query.perPage;
  const result = await driver.queryRevisions({ ...query, offset });
  return {
    query: { ...query, page, offset, totalPages },
    revisions: result.revisions,
    total: result.total,
    totalPages,
  };
}

/** Liste des auteurs ayant au moins une révision (pour le filtre du formulaire). */
export async function listRevisionAuthors(): Promise<string[]> {
  const driver = await ensureReady();
  // Échantillon des révisions les plus récentes : suffisant pour proposer des
  // auteurs pertinents sans parcourir tout l'historique.
  const revisions = await driver.getRecentRevisions(MAX_PER_PAGE);
  const authors = new Set<string>();
  for (const revision of revisions) authors.add(revision.author);
  return [...authors].sort((a, b) => a.localeCompare(b, "fr"));
}

/**
 * Restaure le contenu d'une révision : écrase l'article existant ou le
 * recrée s'il avait été supprimé. L'auteur de la restauration est enregistré.
 */
export async function restoreRevision(
  slug: string,
  revisionId: string,
  author: string,
): Promise<Article | null> {
  const driver = await ensureReady();
  const revision = await driver.getRevision(slug, revisionId);
  if (!revision) return null;

  const existing = await driver.getArticleBySlug(slug);
  const now = new Date().toISOString();

  if (existing) {
    const restored: Article = {
      ...existing,
      ...revision.snapshot,
      updatedAt: now,
    };
    await driver.updateArticle(restored);
    await recordRevision(restored, "restore", author);
    return restored;
  }

  const recreated: Article = {
    slug,
    ...revision.snapshot,
    author: revision.author || author,
    createdAt: revision.createdAt,
    updatedAt: now,
  };
  await driver.createArticle(recreated);
  await recordRevision(recreated, "restore", author);
  return recreated;
}

// ---------------------------------------------------------------------------
// Écritures — toujours protégées par la session admin (middleware + routes API)
// ---------------------------------------------------------------------------

export class ValidationError extends Error {}

function assertValidInput(input: ArticleInput): void {
  if (!input.title?.trim()) throw new ValidationError("Le titre est obligatoire.");
  if (input.title.trim().length > 120)
    throw new ValidationError("Le titre est trop long (120 caractères max).");
  if (!input.summary?.trim()) throw new ValidationError("Le résumé est obligatoire.");
  if (!input.content?.trim()) throw new ValidationError("Le contenu est obligatoire.");
  if (!CATEGORIES.includes(input.category)) throw new ValidationError("Catégorie invalide.");
}

function sanitizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 8);
}

export async function createArticle(input: ArticleInput): Promise<Article> {
  assertValidInput(input);
  const driver = await ensureReady();

  const existing = await driver.getAllArticles();
  let slug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title);
  if (!slug) throw new ValidationError("Impossible de générer un slug depuis ce titre.");
  if (existing.some((article) => article.slug === slug)) {
    // Un slug demandé explicitement doit rester stable : la synchronisation
    // Discord s'en sert comme clé de rattachement au membre. On ne le suffixe
    // donc pas en silence, on le refuse.
    if (input.slug?.trim()) {
      throw new ValidationError(`Un article existe déjà avec le slug « ${slug} ».`);
    }
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const now = new Date().toISOString();
  const article: Article = {
    slug,
    title: input.title.trim(),
    category: input.category,
    summary: input.summary.trim(),
    content: input.content,
    tags: sanitizeTags(input.tags),
    author: input.author?.trim() || "Rédaction du wiki",
    discordUserId: input.discordUserId?.trim() || undefined,
    infobox: input.infobox,
    status: input.status,
    origin: input.origin,
    createdAt: now,
    updatedAt: now,
  };

  await driver.createArticle(article);
  await recordRevision(article, "create", article.author);
  return article;
}

export async function updateArticle(slug: string, input: ArticleInput): Promise<Article> {
  assertValidInput(input);
  const driver = await ensureReady();

  const existing = await driver.getArticleBySlug(slug);
  if (!existing) throw new ValidationError(`Aucun article avec le slug « ${slug} ».`);

  const updated: Article = {
    ...existing,
    title: input.title.trim(),
    category: input.category,
    summary: input.summary.trim(),
    content: input.content,
    tags: sanitizeTags(input.tags),
    author: existing.author,
    discordUserId:
      input.discordUserId !== undefined
        ? input.discordUserId.trim() || undefined
        : existing.discordUserId,
    // `infobox: undefined` explicite = la rédaction veut l'infobox automatique.
    infobox: input.infobox,
    updatedAt: new Date().toISOString(),
  };

  await driver.updateArticle(updated);
  await recordRevision(updated, "update", input.author?.trim() || updated.author);
  return updated;
}

export async function deleteArticle(slug: string, author: string): Promise<boolean> {
  const driver = await ensureReady();
  const existing = await driver.getArticleBySlug(slug);
  if (!existing) return false;

  const deleted = await driver.deleteArticle(slug);
  if (!deleted) return false;
  await recordRevision(existing, "delete", author);
  return true;
}

/** Résolution automatique des IDs Discord (synchronisation des personnalités). */
export async function setDiscordUserIds(mapping: Record<string, string>): Promise<void> {
  if (Object.keys(mapping).length === 0) return;
  const driver = await ensureReady();
  await driver.setDiscordUserIds(mapping);
}

// ---------------------------------------------------------------------------
// Jeu de données initial
// ---------------------------------------------------------------------------

export interface SeedInstallReport {
  /** Slugs des articles absents, désormais publiés. */
  created: string[];
  /** Slugs des articles dont le texte a été mis à jour vers la version officielle. */
  refreshed: string[];
  /** Slugs des articles qui ont reçu l'infobox du jeu de données initial. */
  enriched: string[];
  /** Slugs des articles retouchés par un rédacteur : jamais écrasés. */
  protected: string[];
  /** Articles déjà à jour (rien n'a été touché). */
  unchanged: string[];
  /** Version du contenu officiel publiée à l'issue de l'opération. */
  version: number;
}

/**
 * Installe le jeu de données initial dans un wiki déjà peuplé.
 *
 * Principe : **rien n'est écrasé**. Seuls les articles totalement absents sont
 * créés ; pour un article déjà présent, seule l'infobox du jeu de données est
 * posée, et uniquement si l'article n'en a pas. Le texte, le titre, les tags et
 * les dates d'un article existant ne sont jamais modifiés par cette fonction.
 *
 * Chaque opération est journalisée dans l'historique des révisions.
 */
/** Clé de métadonnée où l'on note l'empreinte du contenu officiel publié. */
const SEED_MANIFEST_KEY = "seed-manifest";

interface SeedManifest {
  version: number;
  /** slug → empreinte du texte officiel au moment de la dernière publication. */
  fingerprints: Record<string, string>;
}

async function readManifest(driver: Awaited<ReturnType<typeof ensureReady>>): Promise<SeedManifest> {
  const raw = await driver.getMeta(SEED_MANIFEST_KEY);
  if (!raw) return { version: 0, fingerprints: {} };
  try {
    const parsed = JSON.parse(raw) as SeedManifest;
    return { version: parsed.version ?? 0, fingerprints: parsed.fingerprints ?? {} };
  } catch {
    return { version: 0, fingerprints: {} };
  }
}

export interface InstallOptions {
  /**
   * Met à jour le texte des articles du jeu de données initial **uniquement**
   * s'ils n'ont jamais été retouchés depuis leur publication (voir le manifeste).
   * Un article que la rédaction a modifié reste protégé, même si le contenu
   * officiel a changé depuis.
   */
  refresh?: boolean;
}

/**
 * Publie le contenu officiel du wiki (jeu de données initial).
 *
 * Deux garanties :
 *   1. **rien n'est perdu** — un article existant n'est jamais écrasé s'il a
 *      été retouché par un rédacteur ; il est seulement signalé comme protégé ;
 *   2. **tout est tracé** — chaque création, mise à jour ou enrichissement
 *      produit une révision, consultable et restaurable comme les autres.
 *
 * L'opération est idempotente : la rejouer sans changement ne touche à rien.
 */
export async function installSeedArticles(
  author: string,
  options: InstallOptions = {},
): Promise<SeedInstallReport> {
  const driver = await ensureReady();
  const existing = await driver.getAllArticles();
  const manifest = await readManifest(driver);
  const report: SeedInstallReport = {
    created: [],
    refreshed: [],
    enriched: [],
    protected: [],
    unchanged: [],
    version: SEED_VERSION,
  };
  const fingerprints = { ...manifest.fingerprints };

  for (const seed of SEED_ARTICLES) {
    const current = existing.find((article) => article.slug === seed.slug);
    const seedInfobox = normalizeInfobox(seed.infobox);
    const officialFingerprint = seedFingerprint(seed);

    if (!current) {
      const article: Article = {
        ...seed,
        tags: [...seed.tags],
        createdAt: new Date(seed.createdAt).toISOString(),
        updatedAt: new Date(seed.updatedAt).toISOString(),
      };
      await driver.createArticle(article);
      await recordRevision(article, "create", author);
      fingerprints[seed.slug] = officialFingerprint;
      report.created.push(article.slug);
      continue;
    }

    // Un article n'est considéré « intact » que si son contenu est exactement
    // celui que nous avions publié, **et** qu'il a bien été publié par nous
    // (présence dans le manifeste). Un article écrit à la main n'y est pas.
    const currentFingerprint = articleFingerprint(current);
    const isUntouched =
      manifest.fingerprints[seed.slug] !== undefined &&
      manifest.fingerprints[seed.slug] === currentFingerprint;
    // Déjà identique au contenu officiel : rien à réécrire, donc aucune révision
    // inutile dans l'historique.
    const needsUpdate = currentFingerprint !== officialFingerprint;
    const refreshing = options.refresh && manifest.version < SEED_VERSION && needsUpdate;

    if (refreshing && !isUntouched) {
      // La rédaction a retouché cet article : il est laissé intact, et signalé
      // pour que le choix de le mettre à jour reste humain. On s'arrête là —
      // sinon il serait aussi compté comme « inchangé », et le rapport
      // compterait deux fois le même article.
      report.protected.push(current.slug);
      fingerprints[seed.slug] = currentFingerprint;
      continue;
    }

    if (refreshing) {
      const refreshed: Article = {
        ...current,
        title: seed.title,
        category: seed.category,
        summary: seed.summary,
        content: seed.content,
        tags: [...seed.tags],
        infobox: seedInfobox ?? current.infobox,
        updatedAt: new Date().toISOString(),
      };
      await driver.updateArticle(refreshed);
      await recordRevision(refreshed, "update", author);
      fingerprints[seed.slug] = officialFingerprint;
      report.refreshed.push(current.slug);
      continue;
    }

    if (seedInfobox && !current.infobox) {
      const enriched: Article = { ...current, infobox: seedInfobox };
      await driver.updateArticle(enriched);
      await recordRevision(enriched, "update", author);
      report.enriched.push(current.slug);
      // L'enrichissement modifie le contenu : l'article n'est plus « intact ».
      fingerprints[seed.slug] = articleFingerprint(enriched);
      continue;
    }

    // Rien à faire : on aligne tout de même l'empreinte, pour qu'un article déjà
    // à jour soit reconnu intact au prochain lancement.
    if (manifest.fingerprints[seed.slug] === undefined) {
      fingerprints[seed.slug] = currentFingerprint;
    }
    report.unchanged.push(current.slug);
  }

  await driver.setMeta(SEED_MANIFEST_KEY, JSON.stringify({ version: SEED_VERSION, fingerprints }));
  return report;
}

/** Parse et normalise un payload JSON en ArticleInput ; lance ValidationError si invalide. */
export function parseArticleInput(body: unknown): ArticleInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Corps de requête invalide.");
  }
  const raw = body as Record<string, unknown>;

  const tags = Array.isArray(raw.tags) ? raw.tags.map(String) : [];

  let infobox: ArticleInput["infobox"];
  try {
    infobox = normalizeInfobox(raw.infobox);
  } catch (error) {
    if (error instanceof InfoboxValidationError) throw new ValidationError(error.message);
    throw error;
  }

  // Un état de publication demandé est validé, jamais recopié tel quel : un
  // client ne peut pas enregistrer un statut inventé pour contourner la relecture.
  let status: ArticleInput["status"];
  if (raw.status !== undefined && raw.status !== null && raw.status !== "") {
    const candidat = String(raw.status);
    if (!ARTICLE_STATUSES.includes(candidat as ArticleStatus)) {
      throw new ValidationError(
        `État de publication inconnu : « ${candidat} ». Valeurs acceptées : ${ARTICLE_STATUSES.join(", ")}.`,
      );
    }
    status = candidat as ArticleStatus;
  }

  return {
    title: String(raw.title ?? ""),
    category: parseCategory(String(raw.category ?? "")),
    summary: String(raw.summary ?? ""),
    content: String(raw.content ?? ""),
    tags,
    discordUserId: typeof raw.discordUserId === "string" ? raw.discordUserId : undefined,
    infobox,
    status,
  };
}
