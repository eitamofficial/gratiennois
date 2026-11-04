import { COLLECTIONS, add, find, list, remove, update, upsert } from "./collections";

/**
 * Fonctionnalités collaboratives et d'administration.
 *
 * Chaque domaine tient en une collection JSON et quelques fonctions. Le choix
 * de tout regrouper ici plutôt qu'en dix fichiers : ces structures partagent la
 * même forme (`id`, `createdAt`, un ou deux champs métier) et se lisent mieux
 * côte à côte. Ce qui a une vraie logique propre — analyse, recherche
 * sémantique, exports — vit dans son propre module.
 */

// ---------------------------------------------------------------------------
// Réglages généraux
// ---------------------------------------------------------------------------

export interface Settings {
  id: "global";
  /** Mode lecture seule : plus aucune écriture, quel que soit le rôle. */
  readOnly?: boolean;
  readOnlyReason?: string;
  /** Message affiché en bandeau sur tout le site. */
  banner?: string;
  updatedAt: string;
  updatedBy?: string;
}

const SETTINGS_ID = "global";

export async function getSettings(): Promise<Settings> {
  const found = await find<Settings>(COLLECTIONS.settings, (item) => item.id === SETTINGS_ID);
  return found ?? { id: SETTINGS_ID, updatedAt: new Date(0).toISOString() };
}

export async function saveSettings(patch: Partial<Omit<Settings, "id">>, by: string): Promise<Settings> {
  const current = await getSettings();
  return upsert<Settings>(
    COLLECTIONS.settings,
    { ...current, ...patch, id: SETTINGS_ID, updatedAt: new Date().toISOString(), updatedBy: by },
    (item) => item.id === SETTINGS_ID,
  );
}

export async function isReadOnly(): Promise<boolean> {
  return (await getSettings()).readOnly === true;
}

// ---------------------------------------------------------------------------
// Liste de suivi
// ---------------------------------------------------------------------------

export interface WatchEntry {
  id: string;
  username: string;
  slug: string;
  createdAt: string;
}

export async function watch(username: string, slug: string): Promise<void> {
  const existing = await find<WatchEntry>(
    COLLECTIONS.watchlist,
    (item) => item.username === username && item.slug === slug,
  );
  if (existing) return;
  await add<WatchEntry>(COLLECTIONS.watchlist, {
    username,
    slug,
    createdAt: new Date().toISOString(),
  });
}

export async function unwatch(username: string, slug: string): Promise<void> {
  const existing = await find<WatchEntry>(
    COLLECTIONS.watchlist,
    (item) => item.username === username && item.slug === slug,
  );
  if (existing) await remove(COLLECTIONS.watchlist, existing.id);
}

export async function isWatched(username: string, slug: string): Promise<boolean> {
  return Boolean(
    await find<WatchEntry>(
      COLLECTIONS.watchlist,
      (item) => item.username === username && item.slug === slug,
    ),
  );
}

export async function watchedSlugs(username: string): Promise<string[]> {
  const entries = await list<WatchEntry>(COLLECTIONS.watchlist);
  return entries.filter((entry) => entry.username === username).map((entry) => entry.slug);
}

export async function watchersOf(slug: string): Promise<string[]> {
  const entries = await list<WatchEntry>(COLLECTIONS.watchlist);
  return [...new Set(entries.filter((entry) => entry.slug === slug).map((entry) => entry.username))];
}

// ---------------------------------------------------------------------------
// Brouillons serveur
// ---------------------------------------------------------------------------

export interface Draft {
  id: string;
  username: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  tags: string[];
  updatedAt: string;
}

export async function saveDraft(
  username: string,
  draft: Omit<Draft, "id" | "username" | "updatedAt">,
): Promise<Draft> {
  return upsert<Draft>(
    COLLECTIONS.drafts,
    { ...draft, id: `${username}:${draft.slug}`, username, updatedAt: new Date().toISOString() },
    (item) => item.username === username && item.slug === draft.slug,
  );
}

export async function getDraft(username: string, slug: string): Promise<Draft | null> {
  return find<Draft>(
    COLLECTIONS.drafts,
    (item) => item.username === username && item.slug === slug,
  );
}

export async function deleteDraft(username: string, slug: string): Promise<void> {
  const draft = await getDraft(username, slug);
  if (draft) await remove(COLLECTIONS.drafts, draft.id);
}

// ---------------------------------------------------------------------------
// Redirections
// ---------------------------------------------------------------------------

export interface Redirect {
  id: string;
  from: string;
  to: string;
  createdAt: string;
  createdBy: string;
}

export async function listRedirects(): Promise<Redirect[]> {
  const redirects = await list<Redirect>(COLLECTIONS.redirects);
  return redirects.sort((a, b) => a.from.localeCompare(b.from, "fr"));
}

export async function resolveRedirect(slug: string): Promise<string | null> {
  const redirect = await find<Redirect>(COLLECTIONS.redirects, (item) => item.from === slug);
  return redirect?.to ?? null;
}

export async function addRedirect(from: string, to: string, by: string): Promise<Redirect> {
  return add<Redirect>(COLLECTIONS.redirects, {
    from,
    to,
    createdBy: by,
    createdAt: new Date().toISOString(),
  });
}

export async function deleteRedirect(id: string): Promise<boolean> {
  return remove(COLLECTIONS.redirects, id);
}

// ---------------------------------------------------------------------------
// Votes (suppression, label de qualité)
// ---------------------------------------------------------------------------

export type VoteKind = "suppression" | "qualite";
export type VoteChoice = "pour" | "contre" | "neutre";

export interface VoteEntry {
  id: string;
  kind: VoteKind;
  slug: string;
  username: string;
  choice: VoteChoice;
  reason?: string;
  createdAt: string;
}

export async function castVote(
  kind: VoteKind,
  slug: string,
  username: string,
  choice: VoteChoice,
  reason?: string,
): Promise<VoteEntry> {
  return upsert<VoteEntry>(
    COLLECTIONS.votes,
    {
      id: `${kind}:${slug}:${username}`,
      kind,
      slug,
      username,
      choice,
      reason,
      createdAt: new Date().toISOString(),
    },
    (item) => item.kind === kind && item.slug === slug && item.username === username,
  );
}

export interface VoteTally {
  pour: number;
  contre: number;
  neutre: number;
  total: number;
  entries: VoteEntry[];
}

export async function tally(kind: VoteKind, slug: string): Promise<VoteTally> {
  const entries = (await list<VoteEntry>(COLLECTIONS.votes)).filter(
    (entry) => entry.kind === kind && entry.slug === slug,
  );
  return {
    pour: entries.filter((entry) => entry.choice === "pour").length,
    contre: entries.filter((entry) => entry.choice === "contre").length,
    neutre: entries.filter((entry) => entry.choice === "neutre").length,
    total: entries.length,
    entries,
  };
}

export async function openVotes(): Promise<VoteEntry[]> {
  return (await list<VoteEntry>(COLLECTIONS.votes)).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

// ---------------------------------------------------------------------------
// Sondages
// ---------------------------------------------------------------------------

export interface Poll {
  id: string;
  question: string;
  options: string[];
  createdBy: string;
  createdAt: string;
  closesAt?: string;
  closed?: boolean;
}

export interface Ballot {
  id: string;
  pollId: string;
  username: string;
  option: string;
  createdAt: string;
}

export async function createPoll(
  question: string,
  options: string[],
  by: string,
  closesAt?: string,
): Promise<Poll> {
  return add<Poll>(COLLECTIONS.polls, {
    question,
    options,
    createdBy: by,
    createdAt: new Date().toISOString(),
    closesAt,
  });
}

export async function listPolls(): Promise<Poll[]> {
  return (await list<Poll>(COLLECTIONS.polls)).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function votePoll(pollId: string, username: string, option: string): Promise<Ballot> {
  return upsert<Ballot>(
    COLLECTIONS.ballots,
    {
      id: `${pollId}:${username}`,
      pollId,
      username,
      option,
      createdAt: new Date().toISOString(),
    },
    (item) => item.pollId === pollId && item.username === username,
  );
}

export async function pollResults(pollId: string): Promise<Record<string, number>> {
  const ballots = (await list<Ballot>(COLLECTIONS.ballots)).filter(
    (ballot) => ballot.pollId === pollId,
  );
  const results: Record<string, number> = {};
  for (const ballot of ballots) results[ballot.option] = (results[ballot.option] ?? 0) + 1;
  return results;
}

// ---------------------------------------------------------------------------
// Calendrier
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  kind: "institution" | "election" | "traite" | "culture" | "autre";
  createdBy: string;
  createdAt: string;
}

export async function listEvents(): Promise<CalendarEvent[]> {
  return (await list<CalendarEvent>(COLLECTIONS.calendar)).sort((a, b) => a.date.localeCompare(b.date));
}

export async function addEvent(
  event: Omit<CalendarEvent, "id" | "createdAt">,
): Promise<CalendarEvent> {
  return add<CalendarEvent>(COLLECTIONS.calendar, {
    ...event,
    createdAt: new Date().toISOString(),
  });
}

export async function deleteEvent(id: string): Promise<boolean> {
  return remove(COLLECTIONS.calendar, id);
}

// ---------------------------------------------------------------------------
// Sessions et journal de connexion
// ---------------------------------------------------------------------------

export interface SessionEntry {
  id: string;
  username: string;
  role: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastSeen: string;
  revokedAt?: string;
}

export async function recordSession(
  username: string,
  role: string,
  ip: string,
  userAgent: string,
): Promise<SessionEntry> {
  return add<SessionEntry>(COLLECTIONS.sessions, {
    username,
    role,
    ip,
    userAgent: userAgent.slice(0, 300),
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  });
}

export async function listSessions(): Promise<SessionEntry[]> {
  return (await list<SessionEntry>(COLLECTIONS.sessions)).sort((a, b) =>
    b.lastSeen.localeCompare(a.lastSeen),
  );
}

export async function revokeSession(id: string): Promise<void> {
  await update<SessionEntry>(COLLECTIONS.sessions, id, { revokedAt: new Date().toISOString() });
}

export interface LoginAttempt {
  id: string;
  username: string;
  ok: boolean;
  ip: string;
  userAgent: string;
  at: string;
  reason?: string;
}

export async function recordLogin(
  username: string,
  ok: boolean,
  ip: string,
  userAgent: string,
  reason?: string,
): Promise<void> {
  await add<LoginAttempt>(COLLECTIONS.loginLog, {
    username,
    ok,
    ip,
    userAgent: userAgent.slice(0, 300),
    at: new Date().toISOString(),
    reason,
  });
}

export async function loginHistory(limit = 100): Promise<LoginAttempt[]> {
  return (await list<LoginAttempt>(COLLECTIONS.loginLog))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

/** Une connexion réussie depuis une adresse jamais vue mérite une alerte. */
export async function isNewDevice(username: string, ip: string): Promise<boolean> {
  const history = await list<LoginAttempt>(COLLECTIONS.loginLog);
  return !history.some((entry) => entry.username === username && entry.ok && entry.ip === ip);
}

// ---------------------------------------------------------------------------
// Bannissements
// ---------------------------------------------------------------------------

export interface Ban {
  id: string;
  username: string;
  reason: string;
  by: string;
  createdAt: string;
  until?: string;
}

export async function listBans(): Promise<Ban[]> {
  return (await list<Ban>(COLLECTIONS.bans)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function ban(
  username: string,
  reason: string,
  by: string,
  until?: string,
): Promise<Ban> {
  return add<Ban>(COLLECTIONS.bans, {
    username,
    reason,
    by,
    until,
    createdAt: new Date().toISOString(),
  });
}

export async function unban(id: string): Promise<boolean> {
  return remove(COLLECTIONS.bans, id);
}

export async function activeBan(username: string): Promise<Ban | null> {
  const bans = await listBans();
  const now = Date.now();
  return (
    bans.find(
      (entry) =>
        entry.username === username && (!entry.until || new Date(entry.until).getTime() > now),
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// Présence (édition en cours)
// ---------------------------------------------------------------------------

export interface Presence {
  id: string;
  slug: string;
  username: string;
  at: string;
}

const PRESENCE_WINDOW_MS = 90_000;

export async function touchPresence(slug: string, username: string): Promise<void> {
  await upsert<Presence>(
    COLLECTIONS.presence,
    { id: `${slug}:${username}`, slug, username, at: new Date().toISOString() },
    (item) => item.slug === slug && item.username === username,
  );
}

export async function whoIsEditing(slug: string): Promise<string[]> {
  const entries = await list<Presence>(COLLECTIONS.presence);
  const cutoff = Date.now() - PRESENCE_WINDOW_MS;
  return entries
    .filter((entry) => entry.slug === slug && new Date(entry.at).getTime() > cutoff)
    .map((entry) => entry.username);
}

export async function clearPresence(slug: string, username: string): Promise<void> {
  const entry = await find<Presence>(
    COLLECTIONS.presence,
    (item) => item.slug === slug && item.username === username,
  );
  if (entry) await remove(COLLECTIONS.presence, entry.id);
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  lastStatus?: number;
  lastAt?: string;
}

export async function listWebhooks(): Promise<Webhook[]> {
  return list<Webhook>(COLLECTIONS.webhooks);
}

export async function addWebhook(url: string, events: string[]): Promise<Webhook> {
  return add<Webhook>(COLLECTIONS.webhooks, {
    url,
    events,
    active: true,
    createdAt: new Date().toISOString(),
  });
}

export async function deleteWebhook(id: string): Promise<boolean> {
  return remove(COLLECTIONS.webhooks, id);
}

/** Notifie les abonnés. Les échecs sont enregistrés, jamais propagés. */
export async function fireWebhooks(event: string, payload: unknown): Promise<void> {
  const hooks = (await list<Webhook>(COLLECTIONS.webhooks)).filter(
    (hook) => hook.active && hook.events.includes(event),
  );
  await Promise.all(
    hooks.map(async (hook) => {
      try {
        const response = await fetch(hook.url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ event, at: new Date().toISOString(), payload }),
          signal: AbortSignal.timeout(5_000),
        });
        await update<Webhook>(COLLECTIONS.webhooks, hook.id, {
          lastStatus: response.status,
          lastAt: new Date().toISOString(),
        });
      } catch {
        await update<Webhook>(COLLECTIONS.webhooks, hook.id, {
          lastStatus: 0,
          lastAt: new Date().toISOString(),
        });
      }
    }),
  );
}

// ---------------------------------------------------------------------------
// Entités structurées
// ---------------------------------------------------------------------------

export interface Entity {
  id: string;
  name: string;
  kind: "personne" | "lieu" | "institution" | "evenement" | "autre";
  articleSlug?: string;
  data: Record<string, string>;
  createdAt: string;
}

export async function listEntities(): Promise<Entity[]> {
  return (await list<Entity>(COLLECTIONS.entities)).sort((a, b) =>
    a.name.localeCompare(b.name, "fr"),
  );
}

export async function addEntity(
  entity: Omit<Entity, "id" | "createdAt">,
): Promise<Entity> {
  return add<Entity>(COLLECTIONS.entities, {
    ...entity,
    createdAt: new Date().toISOString(),
  });
}

export async function deleteEntity(id: string): Promise<boolean> {
  return remove(COLLECTIONS.entities, id);
}

// ---------------------------------------------------------------------------
// Modération des commentaires
// ---------------------------------------------------------------------------

export interface ModerationItem {
  id: string;
  commentId: string;
  slug: string;
  reason: string;
  status: "attente" | "approuve" | "rejete";
  createdAt: string;
  by?: string;
}

export async function queueComment(
  commentId: string,
  slug: string,
  reason: string,
): Promise<ModerationItem> {
  return add<ModerationItem>(COLLECTIONS.commentsModeration, {
    commentId,
    slug,
    reason,
    status: "attente",
    createdAt: new Date().toISOString(),
  });
}

export async function moderationQueue(): Promise<ModerationItem[]> {
  return (await list<ModerationItem>(COLLECTIONS.commentsModeration)).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function decideModeration(
  id: string,
  status: "approuve" | "rejete",
  by: string,
): Promise<void> {
  await update<ModerationItem>(COLLECTIONS.commentsModeration, id, { status, by });
}
