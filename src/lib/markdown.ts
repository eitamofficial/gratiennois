/**
 * Utilitaires Markdown partagés entre le renderer (composant) et la
 * génération du sommaire, afin que les ancres restent cohérentes.
 */

export function headingId(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "section";
}

/**
 * Attribution d'identifiants **uniques** aux titres d'un même document.
 *
 * Deux titres identiques (« Histoire » puis « Histoire ») produisaient la même
 * ancre : les deux entrées du sommaire pointaient alors sur le premier titre, et
 * la seconde était inatteignable. C'est aussi un identifiant HTML dupliqué, ce
 * que le validateur signale comme erreur.
 *
 * Le suffixe est numérique et croissant (`histoire`, `histoire-2`,
 * `histoire-3`) : stable d'un rendu à l'autre, donc les liens profonds vers un
 * titre restent valides tant que les titres qui le précèdent ne changent pas.
 */
export function createHeadingIdAllocator() {
  const vus = new Set<string>();
  return function allocate(text: string): string {
    const base = headingId(text);
    if (!vus.has(base)) {
      vus.add(base);
      return base;
    }
    let suffixe = 2;
    while (vus.has(`${base}-${suffixe}`)) suffixe += 1;
    const id = `${base}-${suffixe}`;
    vus.add(id);
    return id;
  };
}

export interface Heading {
  id: string;
  text: string;
  /** 2 = `##`, 3 = `###` */
  level: 2 | 3;
}

/** Extrait les titres ## et ### d'un document Markdown pour construire le sommaire. */
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const allocate = createHeadingIdAllocator();
  let inCodeBlock = false;

  for (const line of markdown.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) {
      const text = match[2].trim();
      // Même allocation que le renderer : c'est cette fonction qui garantit
      // que l'ancre du sommaire et celle du titre coïncident.
      headings.push({ id: allocate(text), text, level: match[1].length as 2 | 3 });
    }
  }
  return headings;
}

/**
 * Indentation d'une ligne de liste, en espaces (0 = premier niveau).
 */
export function listIndent(line: string): number {
  const match = /^(\s*)[-*]\s|^(\s*)\d+[.)]\s/.exec(line);
  if (!match) return 0;
  return (match[1] ?? match[2] ?? "").replace(/\t/g, "  ").length;
}

/** Vrai si la ligne est un élément de liste, à quelque niveau que ce soit. */
export function isListItem(line: string): boolean {
  return /^(\s*)[-*]\s|^(\s*)\d+[.)]\s/.test(line);
}

/** Retrait le marqueur de liste et l'indentation, en gardant le texte. */
export function stripListMarker(line: string): string {
  return line.replace(/^(\s*)[-*]\s+/, "").replace(/^(\s*)\d+[.)]\s+/, "").trim();
}
