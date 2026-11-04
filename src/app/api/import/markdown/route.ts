import { NextResponse } from "next/server";
import { canWrite, getServerSession } from "@/lib/auth";
import { createArticle, getArticleBySlug } from "@/lib/articles-store";
import { checkWriteRequest } from "@/lib/request-security";
import { rateLimit } from "@/lib/rate-limit";
import { isReadOnly } from "@/lib/features";
import { CATEGORIES, type Category } from "@/lib/types";
import { slugify } from "@/lib/slug";
import { auditFromRequest } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/import/markdown — reprendre un texte écrit ailleurs.
 *
 * Un contributeur qui arrive avec un fichier Markdown ne devrait pas avoir à
 * recopier son texte dans un formulaire. La route accepte deux formes :
 *
 *   - avec en-tête `---` (title, category, tags, summary) ;
 *   - sans en-tête, auquel cas le premier titre `# …` donne le titre et le
 *     premier paragraphe le chapeau.
 *
 * L'import **ne remplace jamais** un article existant : il refuse. Écraser une
 * page par un import est le genre d'action qu'on ne peut pas défaire sans
 * s'en apercevoir trop tard.
 */

interface Entete {
  title?: string;
  category?: string;
  tags?: string;
  summary?: string;
}

function decouper(source: string): { entete: Entete; corps: string } {
  const normalise = source.replace(/\r\n/g, "\n");
  const correspondance = normalise.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!correspondance) return { entete: {}, corps: normalise };

  const entete: Entete = {};
  for (const ligne of correspondance[1].split("\n")) {
    const champ = ligne.match(/^([a-zA-Z]+)\s*:\s*(.*)$/);
    if (!champ) continue;
    const cle = champ[1].toLowerCase() as keyof Entete;
    if (["title", "category", "tags", "summary"].includes(cle)) {
      entete[cle] = champ[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return { entete, corps: normalise.slice(correspondance[0].length) };
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  if (!canWrite(session)) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  if (await isReadOnly()) {
    return NextResponse.json({ error: "Le wiki est en lecture seule." }, { status: 503 });
  }

  const formatError = checkWriteRequest(request);
  if (formatError) return NextResponse.json({ error: formatError }, { status: 415 });

  const quota = rateLimit(`import:${session.username}`, 20, 15 * 60_000);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "Trop d'imports en peu de temps." },
      { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  const source = typeof (body as { markdown?: unknown })?.markdown === "string"
    ? ((body as { markdown: string }).markdown as string)
    : "";
  if (source.trim().length < 20) {
    return NextResponse.json({ error: "Texte trop court pour être importé." }, { status: 400 });
  }
  if (source.length > 200_000) {
    return NextResponse.json({ error: "Texte trop long (200 000 caractères)." }, { status: 413 });
  }

  const { entete, corps } = decouper(source);

  // Sans en-tête, on déduit : premier titre de niveau 1, premier paragraphe.
  const titreTrouve = corps.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
  const titre = (entete.title || titreTrouve).trim();
  if (titre.length < 3) {
    return NextResponse.json(
      { error: "Titre introuvable : ajoutez un en-tête `title:` ou un titre `# …`." },
      { status: 400 },
    );
  }

  const sansTitre = corps.replace(/^#\s+.+$/m, "").trim();
  const premierParagraphe =
    sansTitre
      .split(/\n{2,}/)
      .map((bloc) => bloc.trim())
      .find((bloc) => bloc && !bloc.startsWith("#") && !bloc.startsWith("-")) ?? "";
  const resume = (entete.summary || premierParagraphe.replace(/[*_`\[\]]/g, "")).slice(0, 400);

  const categorieDemandee = (entete.category ?? "").toLowerCase();
  const categorie: Category = (CATEGORIES as readonly string[]).includes(categorieDemandee)
    ? (categorieDemandee as Category)
    : "histoire";

  const tags = (entete.tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);

  const slug = slugify(titre);
  const existant = await getArticleBySlug(slug);
  if (existant) {
    return NextResponse.json(
      { error: `Un article « ${existant.title} » existe déjà à cette adresse. Renommez ou modifiez-le.` },
      { status: 409 },
    );
  }

  try {
    const article = await createArticle({
      title: titre.slice(0, 200),
      category: categorie,
      summary: resume,
      content: sansTitre,
      tags,
      author: session.username,
    });

    await auditFromRequest(request, {
      event: "article-cree",
      username: session.username,
      role: session.role,
      article: article.title,
      detail: "Import Markdown",
    }).catch(() => undefined);

    return NextResponse.json({ article: { slug: article.slug, title: article.title } }, { status: 201 });
  } catch (erreur) {
    return NextResponse.json(
      { error: erreur instanceof Error ? erreur.message : "Import impossible." },
      { status: 400 },
    );
  }
}
