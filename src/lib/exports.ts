import type { Article, Revision } from "./types";

/**
 * Exports.
 *
 * Le wiki ne doit pas être un piège : tout ce qui y est écrit doit pouvoir en
 * sortir dans un format lisible ailleurs. Trois formats, trois usages :
 *   - JSON : sauvegarde et réimport ;
 *   - XML MediaWiki : portabilité vers un vrai MediaWiki ;
 *   - EPUB : lecture hors ligne, sur liseuse.
 */

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

export function toJsonDump(
  articles: Article[],
  revisions: Revision[],
  meta: Record<string, unknown> = {},
): string {
  return JSON.stringify(
    {
      format: "wiki-gratiannois/dump",
      version: 1,
      exportedAt: new Date().toISOString(),
      ...meta,
      articles,
      revisions,
    },
    null,
    2,
  );
}

// ---------------------------------------------------------------------------
// MediaWiki
// ---------------------------------------------------------------------------

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Convertit les liens internes `[[slug]]` en syntaxe MediaWiki `[[Titre]]`.
 * Le slug seul ne veut rien dire dans MediaWiki, qui indexe par titre.
 */
function toMediaWikiText(content: string, titles: Map<string, string>): string {
  return content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, label?: string) => {
    const titre = titles.get(target.trim().toLowerCase()) ?? target.trim();
    return label ? `[[${titre}|${label}]]` : `[[${titre}]]`;
  });
}

export function toMediaWikiXml(articles: Article[], revisions: Revision[]): string {
  const titles = new Map(articles.map((article) => [article.slug, article.title]));
  const pages = articles
    .map((article) => {
      const history = revisions
        .filter((revision) => revision.articleSlug === article.slug)
        .slice(0, 20)
        .map(
          (revision) => `      <revision>
        <timestamp>${xml(revision.createdAt)}</timestamp>
        <contributor><username>${xml(revision.author)}</username></contributor>
        <comment>${xml(revision.comment ?? "")}</comment>
        <text xml:space="preserve">${xml(toMediaWikiText(revision.snapshot.content, titles))}</text>
      </revision>`,
        )
        .join("\n");

      return `  <page>
    <title>${xml(article.title)}</title>
    <ns>0</ns>
    <id>${xml(article.slug)}</id>
    <revision>
      <timestamp>${xml(article.updatedAt)}</timestamp>
      <contributor><username>${xml(article.author)}</username></contributor>
      <text xml:space="preserve">${xml(toMediaWikiText(article.content, titles))}</text>
    </revision>
${history}
  </page>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<mediawiki xmlns="http://www.mediawiki.org/xml/export-0.11/" version="0.11" xml:lang="fr">
  <siteinfo>
    <sitename>Wiki de Gratianopolis</sitename>
    <dbname>gratianopolis</dbname>
    <base>https://wiki-gratiennois.duckdns.org/wiki/</base>
    <generator>wiki-gratiannois</generator>
    <case>first-letter</case>
  </siteinfo>
${pages}
</mediawiki>`;
}

// ---------------------------------------------------------------------------
// ZIP minimal (méthode « stored », sans compression)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const octet of data) crc = CRC_TABLE[(crc ^ octet) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
  /** `mimetype` doit être stocké sans compression et en premier (norme EPUB). */
  store?: boolean;
}

function zip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true); // version nécessaire
    view.setUint16(6, 0, true); // drapeaux
    view.setUint16(8, entry.store ? 0 : 0, true); // méthode : stored
    view.setUint16(10, 0, true); // heure
    view.setUint16(12, 0x21, true); // date (1980-01-01)
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, name.length, true);
    view.setUint16(28, 0, true);
    local.set(name, 30);

    parts.push(local, entry.data);

    const header = new Uint8Array(46 + name.length);
    const headerView = new DataView(header.buffer);
    headerView.setUint32(0, 0x02014b50, true);
    headerView.setUint16(4, 20, true);
    headerView.setUint16(6, 20, true);
    headerView.setUint16(8, 0, true);
    headerView.setUint16(10, 0, true);
    headerView.setUint16(12, 0, true);
    headerView.setUint16(14, 0x21, true);
    headerView.setUint32(16, crc, true);
    headerView.setUint32(20, size, true);
    headerView.setUint32(24, size, true);
    headerView.setUint16(28, name.length, true);
    headerView.setUint16(30, 0, true);
    headerView.setUint16(32, 0, true);
    headerView.setUint16(34, 0, true);
    headerView.setUint16(36, 0, true);
    headerView.setUint32(38, 0, true);
    headerView.setUint32(42, offset, true);
    header.set(name, 46);
    central.push(header);

    offset += local.length + size;
  }

  const centralSize = central.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  const total = parts.reduce((sum, part) => sum + part.length, 0) + centralSize + end.length;
  const output = new Uint8Array(total);
  let cursor = 0;
  for (const part of [...parts, ...central, end]) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}

// ---------------------------------------------------------------------------
// EPUB
// ---------------------------------------------------------------------------

function xhtml(title: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="fr">
<head><meta charset="utf-8"/><title>${xml(title)}</title>
<style>body{font-family:Georgia,serif;line-height:1.6;margin:1.2em}h1{font-size:1.5em}h2{font-size:1.15em;margin-top:1.4em}.meta{color:#666;font-size:.85em}</style>
</head><body>${body}</body></html>`;
}

/**
 * Transforme le Markdown en XHTML lisible par une liseuse. Volontairement
 * simple : les titres, les paragraphes, les listes et le gras. Un EPUB n'est
 * pas une page web — chercher à reproduire la mise en page du site donnerait
 * un fichier illisible sur une liseuse.
 */
function markdownToXhtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inList = false;

  const inline = (text: string) =>
    xml(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, _t: string, label?: string) => label ?? _t);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      continue;
    }
    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      const level = Math.min(3, heading[1].length + 1);
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    const item = trimmed.match(/^[-*]\s+(.*)$/);
    if (item) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inline(item[1])}</li>`);
      continue;
    }
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
    html.push(`<p>${inline(trimmed)}</p>`);
  }
  if (inList) html.push("</ul>");
  return html.join("\n");
}

export function toEpub(articles: Article[], title = "Wiki de Gratianopolis"): Uint8Array {
  const encoder = new TextEncoder();
  const ordered = [...articles].sort((a, b) => a.title.localeCompare(b.title, "fr"));

  const chapters = ordered.map((article, index) => ({
    id: `chapitre-${index + 1}`,
    href: `texte-${index + 1}.xhtml`,
    article,
  }));

  const entries: ZipEntry[] = [
    { name: "mimetype", data: encoder.encode("application/epub+zip"), store: true },
    {
      name: "META-INF/container.xml",
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`),
    },
    {
      name: "OEBPS/content.opf",
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="id">urn:uuid:wiki-gratianopolis</dc:identifier>
    <dc:title>${xml(title)}</dc:title>
    <dc:language>fr</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
${chapters.map((chapitre) => `    <item id="${chapitre.id}" href="${chapitre.href}" media-type="application/xhtml+xml"/>`).join("\n")}
  </manifest>
  <spine>
${chapters.map((chapitre) => `    <itemref idref="${chapitre.id}"/>`).join("\n")}
  </spine>
</package>`),
    },
    {
      name: "OEBPS/nav.xhtml",
      data: encoder.encode(
        xhtml(
          title,
          `<h1>${xml(title)}</h1><nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops"><ol>${chapters
            .map((chapitre) => `<li><a href="${chapitre.href}">${xml(chapitre.article.title)}</a></li>`)
            .join("")}</ol></nav>`,
        ),
      ),
    },
  ];

  for (const chapitre of chapters) {
    entries.push({
      name: `OEBPS/${chapitre.href}`,
      data: encoder.encode(
        xhtml(
          chapitre.article.title,
          `<h1>${xml(chapitre.article.title)}</h1>
<p class="meta">${xml(chapitre.article.summary)}</p>
${markdownToXhtml(chapitre.article.content)}`,
        ),
      ),
    });
  }

  return zip(entries);
}
