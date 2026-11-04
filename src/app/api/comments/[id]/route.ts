import { NextResponse } from "next/server";
import { getServerSession, hasFullAccess } from "@/lib/auth";
import { deleteComment, getComment } from "@/lib/comments-store";
import { clientIp } from "@/lib/rate-limit";
import { auditFromRequest } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/comments/[id] — retirer un commentaire.
 *
 * Deux personnes peuvent le faire : celle qui l'a écrit, et le Dauphin. Le
 * premier cas est une évidence (on retire sa propre phrase) ; le second applique
 * l'article P-1, qui donne au Dauphin le droit de véto — sans lui, un message
 * injurieux resterait en ligne jusqu'à ce que son auteur veuille bien l'effacer.
 */
export async function DELETE(request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { id } = await params;
  const comment = await getComment(id);
  if (!comment) {
    return NextResponse.json({ error: "Commentaire introuvable." }, { status: 404 });
  }

  const auteur = comment.author === session.username;
  if (!auteur && !hasFullAccess(session)) {
    return NextResponse.json(
      { error: "Seul l'auteur du commentaire, le Dauphin ou le Premier Ministre peut le supprimer." },
      { status: 403 },
    );
  }

  const deleted = await deleteComment(id);
  if (!deleted) {
    return NextResponse.json({ error: "Commentaire introuvable." }, { status: 404 });
  }

  await auditFromRequest(request, {
    event: "commentaire-supprime",
    username: session.username,
    provider: session.provider,
    role: session.role,
    detail: `Sur ${comment.slug} — auteur du message : ${comment.displayName}`,
  });

  return NextResponse.json({ ok: true });
}
