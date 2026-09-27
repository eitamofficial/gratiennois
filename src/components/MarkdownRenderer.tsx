import {
  createHeadingIdAllocator,
  headingId,
  isListItem,
  listIndent,
  stripListMarker,
} from "@/lib/markdown";
import type { WikiLink } from "@/lib/link-graph";

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Rendu Markdown minimaliste et **sûr** : tout le texte est d'abord échappé
 * (aucun HTML ne peut passer), puis seules les constructions reconnues sont
 * converties en balises : titres, listes, citations, blocs de code, tableaux,
 * gras, italique, code en ligne et liens internes/externes.
 *
 * L'habillage visuel (polices, filets, listes) n'est **pas** porté par ces
 * classes : il est défini une seule fois dans `.markdown` (globals.css). C'est
 * ce qui permet à tout un article — titres, tableaux, citations, listes — de
 * partager la même identité typographique, celle d'une encyclopédie.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Retire les Entities HTML : sert à reconstruire une URL de recherche à
 *  partir d'un texte déjà échappé (sinon « & » deviendrait « &amp; » dans la
 *  requête, et la recherche ne trouverait rien). */
function unescapeHtml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function renderInline(escaped: string, linkMap?: Map<string, WikiLink>): string {
  // Liens wiki [[Titre]] ou [[Titre|texte affiché]] : résolus via linkMap.
  // Sans libellé explicite, on affiche le **titre** de l'article et non le slug
  // écrit dans le texte (`[[la-hierarchie-delphinale]]` → « La hiérarchie
  // delphinale ») : les identifiants techniques ne doivent jamais fuiter à
  // l'écran.
  const withWikiLinks = linkMap
    ? escaped.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, label?: string) => {
        const key = target.trim().toLowerCase();
        const found = linkMap.get(key) ?? linkMap.get(normalizeKey(key));
        const text = (label ?? found?.title ?? target).trim();
        // Convention des encyclopédies : un **lien rouge** désigne un article qui
        // n'existe pas encore. Il reste cliquable et mène à la recherche sur ce
        // titre — donc vers une page qui existe — plutôt qu'à une 404.
        if (!found) {
          const safeText = text.replace(/"/g, "&quot;");
          const query = encodeURIComponent(unescapeHtml(text));
          return `<a href="/recherche?q=${query}" class="link-red" title="Article pas encore rédigé — rechercher « ${safeText} »">${text}</a>`;
        }
        return `<a href="/wiki/${found.slug}">${text}</a>`;
      })
    : escaped;

  return withWikiLinks
    // Liens [texte](url) — seuls http(s), mailto, /, # et /wiki sont autorisés.
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_match, text: string, href: string) => {
        const isSafe =
          /^(https?:\/\/|mailto:|\/|#)/i.test(href) && !/[\s"']/.test(href);
        if (!isSafe) return text;
        const external = /^https?:\/\//i.test(href);
        const attrs = external
          ? ' target="_blank" rel="noopener noreferrer"'
          : "";
        return `<a href="${href}"${attrs}>${text}</a>`;
      },
    )
    // Gras italique `***texte***` **avant** le gras simple : sans cet ordre,
    // `**` capturait le `***` et laissait un `*` parasite à l'écran.
    .replace(/\*\*\*([^\s*][^*]*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^\s*][^*]*?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Un tube échappé redevient un caractère ordinaire. Doit intervenir **après**
    // les remplacements ci-dessus, qui introduisent leurs propres balises.
    .replace(/\\\|/g, "|");
}

interface Block {
  type: "h1" | "h2" | "h3" | "p" | "ul" | "ol" | "blockquote" | "code" | "hr" | "table";
  lines: string[];
}

/**
 * Découpe une ligne de tableau en cellules, **sans couper à l'intérieur** des
 * constructions qui contiennent legitimement un `|`.
 *
 * Le découpage naïf (`split("|")`) était le bug le plus visible du moteur :
 * un lien `[[massivie|Massivie]]` — c'est-à-dire la forme même des liens
 * internes du wiki — se retrouvait coupé en deux. La cellule affichait le
 * texte brut `[[massivie`, une colonne parasite apparaissait, et l'en-tête ne
 * correspondait plus au corps du tableau.
 *
 * Sont donc traités comme du texte ordinaire, jamais comme des séparateurs :
 *   - `\|`                     → un caractère « | » littéral ;
 *   - `` `code | inline` ``    → le tube fait partie du code ;
 *   - `[[cible|libellé]]`      → le tube sépare la cible du libellé ;
 *   - `[texte](url)`            → une URL peut contenir un tube.
 */
function splitTableRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inCode = false;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === "\\" && line[i + 1] === "|") {
      // Tube échappé : on le garde, le rendu le remettra à `|`.
      current += "\\|";
      i += 1;
      continue;
    }
    if (char === "`") {
      inCode = !inCode;
      current += char;
      continue;
    }
    if (!inCode) {
      if (char === "[") bracketDepth += 1;
      else if (char === "]") bracketDepth = Math.max(0, bracketDepth - 1);
      else if (char === "(") parenDepth += 1;
      else if (char === ")") parenDepth = Math.max(0, parenDepth - 1);
    }
    if (char === "|" && !inCode && bracketDepth === 0 && parenDepth === 0) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);

  // Les barres de bord sont facultatives : `a | b` et `| a | b |` sont
  // équivalents. On retire la cellule vide qu'elles produisent, sans jamais
  // sacrifier une cellule réellement vide au milieu d'une ligne.
  const bord = cells[0].trim() === "" ? cells.slice(1) : cells;
  const dernier = bord.length > 0 && bord[bord.length - 1].trim() === "" ? bord.slice(0, -1) : bord;
  return dernier.map((cell) => cell.trim());
}

/** Vrai si une ligne est une rangée de séparation (`---`, `:--:`…). */
function isTableSeparator(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell.trim()));
}

function groupBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  let inCode = false;

  const startBlock = (type: Block["type"], firstLine: string) => {
    const block: Block = { type, lines: [firstLine] };
    blocks.push(block);
    return block;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trimStart().startsWith("```")) {
      if (inCode && current?.type === "code") {
        current = null;
      } else {
        current = startBlock("code", line);
      }
      inCode = !inCode;
      continue;
    }
    if (inCode && current?.type === "code") {
      current.lines.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      current = null;
      continue;
    }

    // Un tableau Markdown n'est reconnu que s'il possède sa ligne de
    // séparation. Sans elle, une ligne_commence par | et finit par | est
    // simplement un paragraphe qui contient des barres verticales — l'ancien
    // code en faisait un tableau, découpé n'importe comment.
    if (looksLikeTableRow(trimmed)) {
      const suite = lines[index + 1]?.trim() ?? "";
      if (isTableSeparator(suite)) {
        const table: Block = { type: "table", lines: [trimmed, suite] };
        blocks.push(table);
        index += 1;
        let suivant = index + 1;
        while (suivant < lines.length && looksLikeTableRow(lines[suivant].trim())) {
          table.lines.push(lines[suivant].trim());
          suivant += 1;
        }
        index = suivant - 1;
        current = table;
        continue;
      }
    }

    const type: Block["type"] | null = /^###\s/.test(trimmed)
      ? "h3"
      : /^##\s/.test(trimmed)
        ? "h2"
        : /^#\s/.test(trimmed)
          ? "h1"
          : isListItem(trimmed)
            ? /^\s*\d+[.)]\s/.test(line)
              ? "ol"
              : "ul"
            : /^>\s?/.test(trimmed)
              ? "blockquote"
              : /^(---|\*\*\*|\*\*\*\*|___)$/.test(trimmed)
                ? "hr"
                : null;

    if (type && current?.type === type && (type === "ul" || type === "ol" || type === "blockquote")) {
      // L'**indentation** est conservée pour les listes : c'est la seule
      // information qui dit qu'un élément est un sous-élément. La retirer
      // ici aplatissait toute liste imbriquée avant même qu'elle soit rendue.
      current.lines.push(type === "blockquote" ? trimmed : line.trimEnd());
      continue;
    }
    if (type) {
      current = startBlock(type, line.trimEnd());
      continue;
    }

    // **Continuation paresseuse** : une ligne de texte à la suite d'une
    // citation appartient à cette citation. Sans cela, `> première ligne`
    // suivi d'une phrase non préfixée produisait deux blocs séparés et la
    // citation s'arrêtait net au milieu d'une phrase.
    if (current?.type === "blockquote" && !/^[-*#>|]/.test(trimmed) && !/^\d+[.)]\s/.test(trimmed)) {
      current.lines.push(`> ${trimmed}`);
      continue;
    }

    if (current?.type === "p") {
      current.lines.push(trimmed);
    } else {
      current = startBlock("p", trimmed);
    }
  }

  return blocks;
}

/** Vrai si une ligne a la forme d'une rangée de tableau (avec ou sans bords). */
function looksLikeTableRow(line: string): boolean {
  if (!line) return false;
  if (/^!\[/.test(line)) return false;
  return line.includes("|");
}

/** Ancre de rubrique : le « § » de Wikipédia, cliquable et toujours visible. */
function headingAnchor(id: string): string {
  return `<a href="#${id}" class="heading-anchor" aria-hidden="true" tabindex="-1">§</a>`;
}

/**
 * Construit les `<li>` d'une liste en respectant l'**imbrication**.
 *
 * L'ancien rendu aplatissait tout : un sous-élément indenté devenait un
 * `<li>` de même niveau que son parent, et surtout un second `<ul>` — un HTML
 * invalide, que le navigateur corrige en_METTANT les listes à plat, avec des
 * consequences variables selon le moteur.
 *
 * On reconstruit donc l'arbre à partir de l'indentation, avec une pile de
 * niveaux. Le contenu d'un élément est son texte suivi de ses sous-listes.
 */
function buildListItems(lines: string[], render: (value: string) => string): string {
  interface Niveau {
    indent: number;
    tag: "ul" | "ol";
    /** Contenu **interne** de chaque element, sans le `<li>` : c'est ce qui
     *  permet d'y accrocher une sous-liste avant de l'envelopper. */
    elements: string[];
  }

  const pile: Niveau[] = [];
  let racine = "";

  const fermerNiveau = (): void => {
    const niveau = pile.pop();
    if (!niveau) return;
    const tag = niveau.tag;
    const classe = tag === "ol" ? "list-decimal" : "list-disc";
    const liste = `<${tag} class="${classe}">${niveau.elements
      .map((element) => `<li>${element}</li>`)
      .join("")}</${tag}>`;
    const parent = pile[pile.length - 1];
    if (parent && parent.elements.length > 0) {
      // La sous-liste se referme dans le dernier element du niveau parent.
      parent.elements[parent.elements.length - 1] += liste;
    } else {
      racine = liste;
    }
  };

  for (const line of lines) {
    const indent = listIndent(line);
    const tag: "ul" | "ol" = /^\s*\d+[.)]\s/.test(line) ? "ol" : "ul";
    const texte = stripListMarker(line);

    // Remonter jusqu'au niveau correspondant, en refermant les niveaux trop
    // profonds : c'est ce qui produit `</ul><ul>` au bon endroit.
    while (pile.length > 1 && pile[pile.length - 1].indent > indent) {
      fermerNiveau();
    }

    const sommet = pile[pile.length - 1];
    if (!sommet) {
      pile.push({ indent, tag, elements: [render(texte)] });
      continue;
    }
    if (sommet.indent < indent) {
      // Descente d'un niveau : la nouvelle liste est enfant de l'element
      // courant, qu'elle rejoindra a la fermeture.
      pile.push({ indent, tag, elements: [] });
    }
    pile[pile.length - 1].elements.push(render(texte));
  }

  while (pile.length > 0) fermerNiveau();
  return racine;
}

function blockToHtml(
  block: Block,
  linkMap?: Map<string, WikiLink>,
  isLead = false,
  allocateHeadingId?: (text: string) => string,
): string {
  const inline = (value: string) => renderInline(escapeHtml(value), linkMap);
  // L'allocateur n'est fourni que si le document entier est traité en une passe ;
  // le repli garde le comportement historique pour un usage isolé.
  const idFor = allocateHeadingId ?? ((text: string) => headingId(text));
  switch (block.type) {
    case "h1":
      // La page affiche déjà le titre de l'article en <h1> : le titre Markdown
      // est rendu en <h2> pour ne pas produire deux <h1> sur la même page.
      return `<h2 id="${idFor(block.lines[0].replace(/^#\s+/, ""))}">${inline(block.lines[0].replace(/^#\s+/, ""))}</h2>`;
    case "h2": {
      const text = block.lines[0].replace(/^##\s+/, "");
      const id = idFor(text);
      // L'ancre « § » reste visible en permanence (discret mais lisible) : la
      // masquer au survol la rendait introuvable au doigt et au clavier.
      return `<h2 id="${id}" class="mt-10 scroll-mt-28 border-b border-night-600 pb-2">${headingAnchor(id)}${inline(text)}</h2>`;
    }
    case "h3": {
      const text = block.lines[0].replace(/^###\s+/, "");
      return `<h3 id="${idFor(text)}" class="mt-8 scroll-mt-28">${inline(text)}</h3>`;
    }
    case "p":
      // Le tout premier paragraphe devient le « chapeau » : c'est lui qui donne
      // au lecteur l'envie de continuer, l'encyclopédie le met donc en avant.
      //
      // Les lignes sont réunies **avant** le rendu inline, et non apres. C'est
      // la condition pour qu'une construction Manning sur plusieurs lignes soit
      // reconnue : un lien `[[cible|libellé\nlibellé]]`, très fréquent dès qu'on
      // replie les lignes à 80 colonnes, restait affiché tel quel parce que
      // l'ouverture et la fermeture tombaient dans deux appels séparés.
      return `<p${isLead ? ' class="lead"' : ""}>${inline(block.lines.join(" "))}</p>`;
    case "ul":
    case "ol": {
      // `inline` est passé en callback : le texte de chaque element doit
      // subir le meme traitement que le reste du document (liens, gras…), sinon
      // un `[[lien]]` resterait affiché tel quel dans une liste.
      return buildListItems(block.lines, inline);
    }
    case "blockquote":
      // Une citation repliée sur plusieurs lignes est **un seul** paragraphe :
      // le traiter ligne par ligne créait des paragraphes vides et coupait les
      // liens à cheval sur un changement de ligne.
      return `<blockquote class="my-6"><p>${inline(
        block.lines.map((line) => line.replace(/^>\s?/, "")).join(" "),
      )}</p></blockquote>`;
    case "code": {
      const code = block.lines.slice(1).join("\n");
      return `<pre class="my-6 overflow-x-auto rounded-lg p-4"><code>${escapeHtml(code)}</code></pre>`;
    }
    case "hr":
      return "<hr />";
    case "table": {
      // La ligne de séparation a été consommée par le détecteur : on ne garde
      // que l'en-tête et le corps.
      const rows = block.lines
        .filter((line) => !isTableSeparator(line))
        .map(splitTableRow);
      const [head, ...body] = rows;
      if (!head) return "";
      // Toutes les lignes sont alignées sur la largeur de l'en-tête : une
      // cellule manquante est complétée, une cellule en trop est ignorée. Sans
      // cela, une seule ligne courte déformait le tableau entier.
      const colonnes = head.length;
      // `scope="col"` uniquement sur les en-têtes : un `scope="row"` sur chaque
      // cellule de corps n'est pas valide — la portée d'une ligne s'applique à
      // la ligne entière, pas à chaque cellule prise isolément.
      const cellule = (contenu: string, tag: "th" | "td") =>
        tag === "th"
          ? `<th scope="col">${inline(contenu)}</th>`
          : `<td>${inline(contenu)}</td>`;
      const corps = body
        .map(
          (cells) =>
            `<tr>${Array.from({ length: colonnes }, (_unused, i) => cellule(cells[i] ?? "", "td")).join("")}</tr>`,
        )
        .join("");
      return `<div class="my-6 overflow-x-auto"><table><thead><tr>${head
        .map((cell) => cellule(cell, "th"))
        .join("")}</tr></thead><tbody>${corps}</tbody></table></div>`;
    }
    default:
      return "";
  }
}

/**
 * Rendu complet d'un document Markdown en HTML.
 *
 * Fonction **pure** et séparée du composant React : c'est elle que le banc
 * d'essai `scripts/check-markdown.mjs` vérifie, de sorte que les tests
 * portent sur le code réellement livré.
 */
export function renderMarkdown(
  markdown: string,
  linkMap?: Map<string, WikiLink>,
): string {
  const blocks = groupBlocks(markdown.split("\n"));
  // Un allocateur par document : les titres identiques reçoivent des ancres
  // distinctes, et le même algorithme tourne dans `extractHeadings` pour le
  // sommaire. Les deux ne peuvent donc pas diverger.
  const allocateHeadingId = createHeadingIdAllocator();
  // Le chapeau est le premier paragraphe **de texte** : un titre ou une liste
  // qui le précèderait ne doit pas priver l'article de son accroche.
  const firstParagraph = blocks.findIndex((block) => block.type === "p");
  return blocks
    .map((block, index) =>
      blockToHtml(block, linkMap, index === firstParagraph, allocateHeadingId),
    )
    .join("\n");
}

export default function MarkdownRenderer({
  markdown,
  linkMap,
}: {
  markdown: string;
  /** Table de résolution des liens [[…]] (titre ou slug → article cible). */
  linkMap?: Map<string, WikiLink>;
}) {
  const html = renderMarkdown(markdown, linkMap);
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
