import { NextResponse } from "next/server";
import { canWrite, getServerSession, hasFullAccess } from "@/lib/auth";
import { requestContext } from "@/lib/request-context";
import { checkWriteRequest } from "@/lib/request-security";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { auditFromRequest } from "@/lib/audit";
import {
  activeBan,
  addEntity,
  addEvent,
  addRedirect,
  addWebhook,
  ban,
  castVote,
  clearPresence,
  createPoll,
  deleteDraft,
  deleteEntity,
  deleteEvent,
  deleteRedirect,
  deleteWebhook,
  getDraft,
  getSettings,
  isReadOnly,
  isWatched,
  listBans,
  listEntities,
  listEvents,
  listPolls,
  listRedirects,
  listSessions,
  listWebhooks,
  loginHistory,
  moderationQueue,
  openVotes,
  pollResults,
  queueComment,
  decideModeration,
  recordSession,
  revokeSession,
  saveDraft,
  saveSettings,
  tally,
  touchPresence,
  unban,
  unwatch,
  votePoll,
  watch,
  watchedSlugs,
  watchersOf,
  whoIsEditing,
  type VoteChoice,
  type VoteKind,
} from "@/lib/features";

/**
 * Routeur des fonctionnalités collaboratives.
 *
 * Un seul point d'entrée plutôt que dix-huit routes : les contrôles d'accès,
 * le refus en lecture seule et le format d'erreur sont écrits **une fois**.
 * Dix-huit fichiers auraient voulu dire dix-huit occasions d'oublier un
 * `if (!canWrite(...))`.
 *
 * Convention : `/api/features/<domaine>`, avec `?id=` pour les suppressions.
 */

type Contexte = { params: Promise<{ kind: string }> };

const DOMAINES_LECTURE = new Set([
  "watch",
  "draft",
  "votes",
  "polls",
  "calendar",
  "sessions",
  "moderation",
  "bans",
  "entities",
  "webhooks",
  "presence",
  "settings",
  "login-history",
]);

function erreur(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Le corps JSON, ou `null` si la requête n'en porte pas un valide. */
async function corps(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await request.json();
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function texte(value: unknown, maximum = 500): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function identifiant(value: unknown): string | null {
  const brut = texte(value, 120);
  // Slugs, identifiants de collection : lettres, chiffres, tirets, soulignés.
  return /^[A-Za-z0-9:_-]{1,120}$/.test(brut) ? brut : null;
}

export async function GET(request: Request, { params }: Contexte) {
  const { kind } = await params;
  if (!DOMAINES_LECTURE.has(kind)) return erreur("Domaine inconnu.", 404);

  const session = await getServerSession();
  const url = new URL(request.url);
  const slug = identifiant(url.searchParams.get("slug"));

  switch (kind) {
    case "settings":
      return NextResponse.json(await getSettings());

    case "presence": {
      if (!slug) return erreur("Paramètre `slug` requis.");
      return NextResponse.json({ editors: await whoIsEditing(slug) });
    }

    case "watch": {
      if (!session) return NextResponse.json({ watched: false, slugs: [] });
      if (slug) {
        return NextResponse.json({
          watched: await isWatched(session.username, slug),
          watchers: (await watchersOf(slug)).length,
        });
      }
      return NextResponse.json({ slugs: await watchedSlugs(session.username) });
    }

    case "draft": {
      if (!session || !canWrite(session)) return erreur("Authentification requise.", 401);
      if (!slug) return erreur("Paramètre `slug` requis.");
      return NextResponse.json({ draft: await getDraft(session.username, slug) });
    }

    case "votes": {
      const kindVote = (url.searchParams.get("type") ?? "suppression") as VoteKind;
      if (!slug) return erreur("Paramètre `slug` requis.");
      return NextResponse.json(await tally(kindVote, slug));
    }

    case "polls": {
      if (slug) {
        return NextResponse.json({
          polls: (await listPolls()).filter((poll) => poll.id === slug),
          results: await pollResults(slug),
        });
      }
      return NextResponse.json({ polls: await listPolls() });
    }

    case "calendar":
      return NextResponse.json({ events: await listEvents() });

    case "entities":
      return NextResponse.json({ entities: await listEntities() });

    case "webhooks":
      if (!session || !hasFullAccess(session)) return erreur("Accès refusé.", 403);
      return NextResponse.json({ webhooks: await listWebhooks() });

    case "sessions":
      if (!session || !hasFullAccess(session)) return erreur("Accès refusé.", 403);
      return NextResponse.json({
        sessions: await listSessions(),
        logins: await loginHistory(50),
      });

    case "moderation":
      if (!session || !canWrite(session)) return erreur("Accès refusé.", 403);
      return NextResponse.json({ queue: await moderationQueue() });

    case "bans":
      if (!session || !hasFullAccess(session)) return erreur("Accès refusé.", 403);
      return NextResponse.json({ bans: await listBans() });

    case "login-history":
      if (!session || !hasFullAccess(session)) return erreur("Accès refusé.", 403);
      return NextResponse.json({ logins: await loginHistory(200) });

    default:
      return NextResponse.json({ votes: await openVotes() });
  }
}

export async function POST(request: Request, { params }: Contexte) {
  const { kind } = await params;
  const session = await getServerSession();
  if (!session) return erreur("Authentification requise.", 401);
  if (!canWrite(session)) return erreur("Votre charge ne permet pas d'écrire.", 403);

  // Le mode lecture seule prime sur le rôle : c'est un interrupteur d'urgence.
  if ((await isReadOnly()) && kind !== "settings") {
    return erreur("Le wiki est en lecture seule.", 503);
  }

  if (await activeBan(session.username)) {
    return erreur("Ce compte est suspendu.", 403);
  }
  // Même garde que les routes d'articles : JSON obligatoire (ce qui bloque
  // les formulaires tiers), taille plafonnée, et quota par compte pour qu'une
  // session volée ne puisse pas saturer le disque.
  const formatError = checkWriteRequest(request);
  if (formatError) return erreur(formatError, 415);

  const quota = rateLimit(`features:${session.username}`, 120, 15 * 60_000);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "Trop d'écritures en peu de temps. Réessayez dans quelques minutes." },
      { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds) } },
    );
  }

  const body = await corps(request);
  if (!body) return erreur("Corps de requête invalide.");

  switch (kind) {
    case "watch": {
      const slug = identifiant(body.slug);
      if (!slug) return erreur("Slug invalide.");
      if (body.watch === false) await unwatch(session.username, slug);
      else await watch(session.username, slug);
      return NextResponse.json({ watched: await isWatched(session.username, slug) });
    }

    case "draft": {
      const slug = identifiant(body.slug);
      if (!slug) return erreur("Slug invalide.");
      const draft = await saveDraft(session.username, {
        slug,
        title: texte(body.title, 200),
        category: texte(body.category, 40) || "histoire",
        summary: texte(body.summary, 800),
        content: texte(body.content, 200_000),
        tags: Array.isArray(body.tags) ? body.tags.map((tag) => texte(tag, 60)).slice(0, 40) : [],
      });
      return NextResponse.json({ draft });
    }

    case "presence": {
      const slug = identifiant(body.slug);
      if (!slug) return erreur("Slug invalide.");
      if (body.leave === true) await clearPresence(slug, session.username);
      else await touchPresence(slug, session.username);
      return NextResponse.json({ editors: await whoIsEditing(slug) });
    }

    case "votes": {
      const slug = identifiant(body.slug);
      const kindVote = body.type === "qualite" ? "qualite" : "suppression";
      const choice = body.choice;
      if (!slug) return erreur("Slug invalide.");
      if (choice !== "pour" && choice !== "contre" && choice !== "neutre") {
        return erreur("Vote invalide.");
      }
      await castVote(kindVote, slug, session.username, choice as VoteChoice, texte(body.reason, 500));
      return NextResponse.json(await tally(kindVote, slug));
    }

    case "polls": {
      if (body.pollId) {
        const pollId = identifiant(body.pollId);
        const option = texte(body.option, 120);
        if (!pollId || !option) return erreur("Sondage ou option invalide.");
        await votePoll(pollId, session.username, option);
        return NextResponse.json({ results: await pollResults(pollId) });
      }
      const question = texte(body.question, 300);
      const options = Array.isArray(body.options)
        ? body.options.map((option) => texte(option, 120)).filter(Boolean).slice(0, 8)
        : [];
      if (question.length < 5 || options.length < 2) {
        return erreur("Un sondage demande une question et au moins deux options.");
      }
      const poll = await createPoll(question, options, session.username, texte(body.closesAt, 40) || undefined);
      return NextResponse.json({ poll });
    }

    case "calendar": {
      if (!hasFullAccess(session)) return erreur("Accès refusé.", 403);
      const date = texte(body.date, 10);
      const title = texte(body.title, 200);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || title.length < 2) {
        return erreur("Date (AAAA-MM-JJ) et intitulé requis.");
      }
      const event = await addEvent({
        date,
        title,
        description: texte(body.description, 800) || undefined,
        kind: ["institution", "election", "traite", "culture", "autre"].includes(String(body.kind))
          ? (String(body.kind) as "institution" | "election" | "traite" | "culture" | "autre")
          : "autre",
        createdBy: session.username,
      });
      return NextResponse.json({ event });
    }

    case "redirects": {
      if (!hasFullAccess(session)) return erreur("Accès refusé.", 403);
      const from = identifiant(body.from);
      const to = identifiant(body.to);
      if (!from || !to || from === to) return erreur("Redirection invalide.");
      const redirect = await addRedirect(from, to, session.username);
      return NextResponse.json({ redirect });
    }

    case "entities": {
      if (!hasFullAccess(session)) return erreur("Accès refusé.", 403);
      const name = texte(body.name, 200);
      if (name.length < 2) return erreur("Nom requis.");
      const entity = await addEntity({
        name,
        kind: ["personne", "lieu", "institution", "evenement", "autre"].includes(String(body.kind))
          ? (String(body.kind) as "personne" | "lieu" | "institution" | "evenement" | "autre")
          : "autre",
        articleSlug: identifiant(body.articleSlug) ?? undefined,
        data:
          typeof body.data === "object" && body.data !== null
            ? Object.fromEntries(
                Object.entries(body.data as Record<string, unknown>)
                  .slice(0, 20)
                  .map(([cle, valeur]) => [texte(cle, 40), texte(valeur, 300)]),
              )
            : {},
      });
      return NextResponse.json({ entity });
    }

    case "webhooks": {
      if (!hasFullAccess(session)) return erreur("Accès refusé.", 403);
      const url = texte(body.url, 500);
      if (!/^https:\/\//i.test(url)) return erreur("Seules les URL HTTPS sont acceptées.");
      const hook = await addWebhook(url, ["publication"]);
      return NextResponse.json({ webhook: hook });
    }

    case "sessions": {
      if (!hasFullAccess(session)) return erreur("Accès refusé.", 403);
      const context = requestContext(request);
      const entry = await recordSession(session.username, session.role, context.ip, context.userAgent);
      return NextResponse.json({ session: entry });
    }

    case "moderation": {
      if (!hasFullAccess(session)) return erreur("Accès refusé.", 403);
      const id = identifiant(body.id);
      const decision = body.status === "approuve" || body.status === "rejete" ? body.status : null;
      if (!id || !decision) return erreur("Décision invalide.");
      await decideModeration(id, decision, session.username);
      return NextResponse.json({ ok: true });
    }

    case "queue": {
      // Signalement d'un commentaire par un lecteur : accessible à toute session.
      const commentId = identifiant(body.commentId);
      const slug = identifiant(body.slug);
      if (!commentId || !slug) return erreur("Signalement invalide.");
      await queueComment(commentId, slug, texte(body.reason, 300) || "signalé");
      return NextResponse.json({ ok: true });
    }

    case "bans": {
      if (!hasFullAccess(session)) return erreur("Accès refusé.", 403);
      const username = texte(body.username, 80);
      if (!username) return erreur("Compte requis.");
      const entry = await ban(username, texte(body.reason, 300) || "non précisé", session.username, texte(body.until, 40) || undefined);
      await auditFromRequest(request, {
        event: "article-supprime",
        username: session.username,
        role: session.role,
        detail: `Suspension de ${username}`,
      }).catch(() => undefined);
      return NextResponse.json({ ban: entry });
    }

    case "settings": {
      if (!hasFullAccess(session)) return erreur("Accès refusé.", 403);
      const patch: Record<string, unknown> = {};
      if (typeof body.readOnly === "boolean") patch.readOnly = body.readOnly;
      if (typeof body.readOnlyReason === "string") patch.readOnlyReason = texte(body.readOnlyReason, 300);
      if (typeof body.banner === "string") patch.banner = texte(body.banner, 300);
      const settings = await saveSettings(patch, session.username);
      return NextResponse.json({ settings });
    }

    default:
      return erreur("Domaine inconnu.", 404);
  }
}

export async function DELETE(request: Request, { params }: Contexte) {
  const { kind } = await params;
  const session = await getServerSession();
  if (!session || !canWrite(session)) return erreur("Accès refusé.", 401);

  const url = new URL(request.url);
  const id = identifiant(url.searchParams.get("id"));
  const slug = identifiant(url.searchParams.get("slug"));

  switch (kind) {
    case "draft":
      if (!slug) return erreur("Slug requis.");
      await deleteDraft(session.username, slug);
      return NextResponse.json({ ok: true });

    case "redirects":
      if (!hasFullAccess(session)) return erreur("Accès refusé.", 403);
      if (!id) return erreur("Identifiant requis.");
      return NextResponse.json({ ok: await deleteRedirect(id) });

    case "calendar":
      if (!hasFullAccess(session)) return erreur("Accès refusé.", 403);
      if (!id) return erreur("Identifiant requis.");
      return NextResponse.json({ ok: await deleteEvent(id) });

    case "entities":
      if (!hasFullAccess(session)) return erreur("Accès refusé.", 403);
      if (!id) return erreur("Identifiant requis.");
      return NextResponse.json({ ok: await deleteEntity(id) });

    case "webhooks":
      if (!hasFullAccess(session)) return erreur("Accès refusé.", 403);
      if (!id) return erreur("Identifiant requis.");
      return NextResponse.json({ ok: await deleteWebhook(id) });

    case "sessions":
      if (!hasFullAccess(session)) return erreur("Accès refusé.", 403);
      if (!id) return erreur("Identifiant requis.");
      await revokeSession(id);
      return NextResponse.json({ ok: true });

    case "bans":
      if (!hasFullAccess(session)) return erreur("Accès refusé.", 403);
      if (!id) return erreur("Identifiant requis.");
      return NextResponse.json({ ok: await unban(id) });

    default:
      return erreur("Domaine inconnu.", 404);
  }
}
