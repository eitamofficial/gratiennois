import { NextResponse } from "next/server";
import { getServerSession, hasFullAccess } from "@/lib/auth";
import { getAllArticles, getRecentRevisions } from "@/lib/articles-store";
import { toEpub, toJsonDump, toMediaWikiXml } from "@/lib/exports";
import { SEED_VERSION } from "@/lib/seed-data";

/**
 * Export du wiki.
 *
 * `dump` est réservé à l'accès complet : il contient l'historique des
 * révisions, y compris les versions supprimées. Les deux autres formats ne
 * portent que le texte publié, déjà public.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ format: string }> },
) {
  const { format } = await params;
  const articles = await getAllArticles();

  if (format === "dump") {
    const session = await getServerSession();
    if (!session || !hasFullAccess(session)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
    const revisions = await getRecentRevisions(5000);
    const body = toJsonDump(articles, revisions, { seedVersion: SEED_VERSION });
    return new NextResponse(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="wiki-gratianopolis-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }

  if (format === "mediawiki") {
    const revisions = await getRecentRevisions(5000);
    return new NextResponse(toMediaWikiXml(articles, revisions), {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "content-disposition": 'attachment; filename="wiki-gratianopolis.xml"',
      },
    });
  }

  if (format === "epub") {
    const epub = toEpub(articles);
    return new NextResponse(epub as unknown as BodyInit, {
      headers: {
        "content-type": "application/epub+zip",
        "content-disposition": 'attachment; filename="wiki-gratianopolis.epub"',
      },
    });
  }

  return NextResponse.json({ error: "Format inconnu." }, { status: 404 });
}
