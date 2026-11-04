import { NextResponse } from "next/server";
import { canWrite, getServerSession } from "@/lib/auth";
import { isReadOnly } from "@/lib/features";
import {
  createArticle,
  getAllArticles,
  listArticleSummaries,
  parseArticleInput,
  ValidationError,
} from "@/lib/articles-store";
import { checkWriteRequest } from "@/lib/request-security";
import { rateLimit } from "@/lib/rate-limit";
import { storageErrorResponse } from "@/lib/store/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/articles — liste publique (sans le corps des articles). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const withContent = searchParams.get("content") === "true";
  const articles = withContent ? await getAllArticles() : await listArticleSummaries();
  return NextResponse.json({ articles });
}

/** POST /api/articles — création, réservée aux charges ayant pouvoir d'écriture (Dauphin, Régent, Conseil, Baillit). */
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!canWrite(session)) {
    return NextResponse.json(
      { error: "Votre charge ne permet pas l'édition du wiki." },
      { status: 403 },
    );
  }

  // Interrupteur d'urgence : il prime sur le rôle. Couper l'écriture sans
  // redéployer est ce qui distingue une réponse à incident d'une maintenance.
  if (await isReadOnly()) {
    return NextResponse.json(
      { error: "Le wiki est en lecture seule." },
      { status: 503 },
    );
  }

  const formatError = checkWriteRequest(request);
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 415 });
  }

  // Plafond d'écriture par compte. Une session volée pouvait jusqu'ici créer
  // des articles en boucle : chaque écriture produit une révision, et le disque
  // se remplit avant que quiconque s'en aperçoive. 60 écritures par quart
  // d'heure laissent largement de quoi rédiger, sans permettre l'inondation.
  const limite = rateLimit(`write:${session.username}`, 60, 15 * 60 * 1000);
  if (!limite.allowed) {
    return NextResponse.json(
      { error: "Trop d'enregistrements en peu de temps. Réessayez dans quelques minutes." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  try {
    const input = parseArticleInput(body);
    const article = await createArticle({ ...input, author: session.username });
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[POST /api/articles]", error);
    const { body, status } = storageErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
