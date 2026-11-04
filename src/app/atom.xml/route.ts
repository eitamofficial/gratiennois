import { getRecentRevisions } from "@/lib/articles-store";
import { siteUrl } from "@/lib/site-url";

/**
 * Flux Atom des modifications.
 *
 * Il expose les révisions, pas les articles : un lecteur abonné veut savoir
 * *ce qui a changé*, et c'est exactement ce que l'historique contient déjà.
 */

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const base = siteUrl();
  const revisions = await getRecentRevisions(40);

  const entries = revisions
    .map((revision) => {
      const lien = `${base}/wiki/${revision.articleSlug}`;
      const titre = `${revision.snapshot.title} — ${revision.action === "create" ? "création" : revision.action === "delete" ? "suppression" : "modification"}`;
      return `  <entry>
    <title>${xml(titre)}</title>
    <link href="${xml(lien)}"/>
    <id>urn:wiki:${xml(revision.id)}</id>
    <updated>${xml(revision.createdAt)}</updated>
    <author><name>${xml(revision.author)}</name></author>
    <summary>${xml(revision.comment ?? "Sans résumé de modification")}</summary>
  </entry>`;
    })
    .join("\n");

  const updated = revisions[0]?.createdAt ?? new Date().toISOString();

  return new Response(`<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Wiki de Gratianopolis — modifications</title>
  <link href="${xml(base)}/atom.xml" rel="self"/>
  <link href="${xml(base)}/recent"/>
  <id>urn:wiki:gratianopolis:recent</id>
  <updated>${xml(updated)}</updated>
${entries}
</feed>`, {
    headers: {
      "content-type": "application/atom+xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
