/**
 * Diff de texte sans dépendance externe (plus longue sous-séquence commune).
 * Utilisé pour comparer deux révisions d'un article.
 */

export type DiffKind = "equal" | "added" | "removed";

export interface DiffChunk {
  kind: DiffKind;
  text: string;
}

/** Au-delà de cette taille, on renonce au diff fin et on affiche un remplacement brut. */
const MAX_MATRIX_CELLS = 400_000;

function coreDiff(a: string[], b: string[], joiner: string): DiffChunk[] {
  const chunks: DiffChunk[] = [];

  // Recadrage des parties identiques en tête et en queue : réduit la matrice.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let end = 0;
  while (
    end < a.length - start &&
    end < b.length - start &&
    a[a.length - 1 - end] === b[b.length - 1 - end]
  ) {
    end++;
  }

  if (start > 0) chunks.push({ kind: "equal", text: a.slice(0, start).join(joiner) });

  const midA = a.slice(start, a.length - end);
  const midB = b.slice(start, b.length - end);

  if (midA.length > 0 || midB.length > 0) {
    if (midA.length * midB.length > MAX_MATRIX_CELLS) {
      if (midA.length) chunks.push({ kind: "removed", text: midA.join(joiner) });
      if (midB.length) chunks.push({ kind: "added", text: midB.join(joiner) });
    } else {
      const n = midA.length;
      const m = midB.length;
      const table: Uint32Array[] = Array.from(
        { length: n + 1 },
        () => new Uint32Array(m + 1),
      );
      for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
          table[i][j] =
            midA[i] === midB[j]
              ? table[i + 1][j + 1] + 1
              : Math.max(table[i + 1][j], table[i][j + 1]);
        }
      }

      let i = 0;
      let j = 0;
      while (i < n && j < m) {
        if (midA[i] === midB[j]) {
          chunks.push({ kind: "equal", text: midA[i] });
          i++;
          j++;
        } else if (table[i + 1][j] >= table[i][j + 1]) {
          chunks.push({ kind: "removed", text: midA[i] });
          i++;
        } else {
          chunks.push({ kind: "added", text: midB[j] });
          j++;
        }
      }
      while (i < n) chunks.push({ kind: "removed", text: midA[i++] });
      while (j < m) chunks.push({ kind: "added", text: midB[j++] });
    }
  }

  if (end > 0) chunks.push({ kind: "equal", text: a.slice(a.length - end).join(joiner) });

  // Fusion des chunks consécutifs de même nature.
  const merged: DiffChunk[] = [];
  for (const chunk of chunks) {
    const last = merged[merged.length - 1];
    if (last && last.kind === chunk.kind) last.text += joiner + chunk.text;
    else merged.push({ ...chunk });
  }
  return merged;
}

/** Diff ligne à ligne (le plus lisible pour des documents structurés). */
export function diffLines(oldText: string, newText: string): DiffChunk[] {
  return coreDiff(oldText.replace(/\r\n/g, "\n").split("\n"), newText.replace(/\r\n/g, "\n").split("\n"), "\n");
}

/** Diff mot à mot (séances dans les zones modifiées). */
export function diffWords(oldText: string, newText: string): DiffChunk[] {
  const tokenize = (text: string) => text.split(/(\s+)/).filter((token) => token !== "");
  return coreDiff(tokenize(oldText), tokenize(newText), "");
}

export interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
}

export function diffStats(chunks: DiffChunk[]): DiffStats {
  return chunks.reduce<DiffStats>(
    (stats, chunk) => {
      const count = chunk.text.split("\n").filter((line) => line.length > 0).length;
      if (chunk.kind === "added") stats.added += count;
      else if (chunk.kind === "removed") stats.removed += count;
      else stats.unchanged += count;
      return stats;
    },
    { added: 0, removed: 0, unchanged: 0 },
  );
}

/**
 * Regroupe les ajouts et suppressions consécutifs afin d'appliquer un diff
 * mot à mot à l'intérieur de chaque zone modifiée.
 */
export interface DiffGroup {
  kind: "equal" | "change";
  chunks: DiffChunk[];
  wordChunks: DiffChunk[];
}

export function groupDiff(chunks: DiffChunk[]): DiffGroup[] {
  const groups: DiffGroup[] = [];

  for (const chunk of chunks) {
    const isChange = chunk.kind !== "equal";
    const last = groups[groups.length - 1];

    if (last && ((isChange && last.kind === "change") || (!isChange && last.kind === "equal"))) {
      last.chunks.push(chunk);
    } else {
      groups.push({ kind: isChange ? "change" : "equal", chunks: [chunk], wordChunks: [] });
    }
  }

  for (const group of groups) {
    if (group.kind !== "change") continue;
    const removed = group.chunks
      .filter((chunk) => chunk.kind === "removed")
      .map((chunk) => chunk.text)
      .join("\n");
    const added = group.chunks
      .filter((chunk) => chunk.kind === "added")
      .map((chunk) => chunk.text)
      .join("\n");
    group.wordChunks = diffWords(removed, added);
  }

  return groups;
}
