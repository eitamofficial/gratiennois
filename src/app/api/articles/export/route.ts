import { NextResponse } from "next/server";
import { canWrite, getServerSession } from "@/lib/auth";
import { getAllArticles, getRecentRevisions } from "@/lib/articles-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/articles/export — sauvegarde complète (articles + révisions) au format JSON. */
export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!canWrite(session)) {
    return NextResponse.json({ error: "Votre charge ne permet pas l'export." }, { status: 403 });
  }

  const [articles, revisions] = await Promise.all([
    getAllArticles(),
    getRecentRevisions(1000),
  ]);

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        exportedBy: session.username,
        role: session.role,
        articles,
        revisions,
      },
      null,
      2,
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="wiki-gratianopolis-${date}.json"`,
      },
    },
  );
}
