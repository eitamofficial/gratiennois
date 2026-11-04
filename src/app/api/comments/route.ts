import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getArticleBySlug } from "@/lib/articles-store";
import { addComment, listComments, MAX_COMMENT_LENGTH } from "@/lib/comments-store";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { checkWriteRequest } from "@/lib/request-security";
import { auditFromRequest } from "@/lib/audit";
import { sessionLabel } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Délai minimal entre deux commentaires d'une même personne. */
const DELAI_ENTRE_COMMENTAIRES_MS = 20_000;

/** Plafond horaire, toutes pages confondues. */
const MAX_PAR_HEURE = 40;

/** GET /api/comments?slug=… — fil public d'un article. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "Paramètre « slug » manquant." }, { status: 400 });
  }

  const comments = await listComments(slug);
  return NextResponse.json({ comments, total: comments.length });
}

/**
 * POST /api/comments — publier un commentaire.
 *
 * Il faut être connecté, mais **aucune charge n'est exigée** : commenter est le
 * seul geste d'écriture ouvert à tous les citoyens. La modération reste
 * possible (l'auteur, et le Dauphin, peuvent supprimer).
 */
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Connectez-vous pour commenter." }, { status: 401 });
  }

  const formatError = checkWriteRequest(request);
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 415 });
  }

  const limit = rateLimit(
    `comment:${session.username}`,
    MAX_PAR_HEURE,
    60 * 60 * 1000,
  );
  if (!limit.allowed) {
    await auditFromRequest(request, {
      event: "quota-depasse",
      username: session.username,
      provider: session.provider,
      role: session.role,
      detail: "Trop de commentaires en une heure",
    });
    return NextResponse.json(
      { error: "Vous avez beaucoup commenté récemment. Réessayez dans un moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  // Anti-flood : le quota horaire laisse passer quarante messages d'un coup,
  // ce qui suffit à noyer un fil. Un délai minimal entre deux envois rend le
  // martèlement inintéressant sans gêner une conversation normale.
  const flood = rateLimit(`comment-delai:${session.username}`, 1, DELAI_ENTRE_COMMENTAIRES_MS);
  if (!flood.allowed) {
    return NextResponse.json(
      { error: "Patientez quelques secondes avant d'envoyer un autre commentaire." },
      { status: 429, headers: { "Retry-After": String(flood.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
  const content = typeof payload.content === "string" ? payload.content : "";

  if (!slug) {
    return NextResponse.json({ error: "Article non précisé." }, { status: 400 });
  }
  if (!content.trim()) {
    return NextResponse.json({ error: "Le commentaire est vide." }, { status: 400 });
  }
  if (content.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { error: `Commentaire trop long (${MAX_COMMENT_LENGTH} caractères maximum).` },
      { status: 400 },
    );
  }

  // On ne commente qu'une page qui existe et qui est publiée : sinon on
  // obtiendrait des fils accrochés à des propositions de l'IA, invisibles du
  // public et impossibles à modérer depuis l'article.
  const article = await getArticleBySlug(slug);
  if (!article || article.status === "proposition") {
    return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  }

  const comment = await addComment({
    slug,
    author: session.username,
    displayName: sessionLabel(session),
    avatarUrl: session.avatarUrl ?? "",
    role: session.role,
    content,
  });

  await auditFromRequest(request, {
    event: "commentaire-publie",
    username: sessionLabel(session),
    provider: session.provider,
    role: session.role,
    article: article.title,
    detail: content.slice(0, 300),
  });

  return NextResponse.json({ comment }, { status: 201 });
}
