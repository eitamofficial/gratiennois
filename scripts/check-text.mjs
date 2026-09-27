/**
 * Détecte les caractères et les mots corrompus dans les fichiers de contenu.
 *
 * Écrire de longs textes français en passant par des appels d'outils fait
 * glisser des mots anglais (« loved », « rarely ») et des défauts de ponctuation
 * française (« **mot**une »). Ce script est le garde-fou de cette écriture.
 *
 * Usage : node scripts/check-text.mjs [fichiers…]
 *
 * Par défaut il inspecte les fichiers contenant du **texte rédigé** : les
 * modules de contenu (`src/lib/seed-*.ts`), le moteur d'intelligence
 * artificielle (`src/lib/ai/`, `src/lib/gemini.ts`) et la configuration
 * partagée. D'autres fichiers peuvent être passés en argument.
 */
import { readFileSync, globSync } from "node:fs";

/**
 * Fichiers inspectés par défaut : ceux qui contiennent du **texte rédigé**.
 *
 * Le contrôle vise la prose, pas le code. L'appliquer à toute la base produit
 * des faux positifs sur des identifiants (`word`, `create`, `update`…), ce qui
 * le rendrait bruyant et donc inutile. Pour inspecter un autre fichier, on le
 * passe en argument.
 */
const targets =
  process.argv.length > 2
    ? process.argv.slice(2)
    : [
        ...globSync("src/lib/seed-*.ts"),
        ...globSync("src/lib/ai/*.ts"),
        ...globSync("src/lib/gemini.ts"),
        ...globSync("shared/*.json"),
      ];

/** Caractères hors alphabet latin : cyrillique, CJK, remplacement, NUL. */
const FOREIGN = /[\u0400-\u04FF\u4E00-\u9FFF\uFFFD\u0000]/u;

/**
 * Mots anglais sans équivalent français usuel. La liste évite volontairement
 * les faux positifs (date, base, note, plan, vive…) et les mots français
 * homographes.
 */
const ANGLAIS = [
  "loved", "loves", "loving", "rarely", "beloved", "ineffective", "inevitably",
  "noteworthy", "reminder", "clearly", "obviously", "simply", "currently",
  "overall", "despite", "although", "however", "therefore", "moreover",
  "indeed", "perhaps", "maybe", "likely", "unlikely", "recent", "recently",
  "keeping", "destined", "tightening", "narrowing", "enhance", "improve",
  "update", "updated", "create", "write", "draft", "review", "approve",
  "the", "and", "with", "which", "yesterday", "possessed", "there", "their",
  "would", "could", "should", "have", "been", "cannot", "this", "that", "these",
  "those", "very", "more", "than", "into", "over", "under", "between", "during",
  "about", "from", "ruling", "rally", "rider", "shift", "some", "then", "when",
  "what", "while", "will", "were", "such", "them", "they", "his", "her", "him",
  "she", "been", "also", "both", "each", "here", "just", "like", "make", "many",
  "much", "must", "only", "other", "same", "seem", "through", "too", "upon",
  "very", "well", "your", "their", "there", "after", "again",  "before",
  "because", "below", "being", "give", "given", "going", "gone", "have",
  "having", "know", "known", "leave", "less", "like", "look", "made", "make",
  "mean", "might", "move", "much", "need", "never", "next", "now", "once",
  "only", "open", "people", "said", "same",
  "sees", "shall", "since", "still", "take", "tell", "them", "then", "thing",
  "think", "this", "those", "time", "upon", "want", "well", "went",
  "were", "whole", "with", "word", "work", "world", "year", "young",
  "remains", "remains", "holds", "holds", "reads", "shows", "gives", "makes",
];

/**
 * Noms de technologies et de formats : ce sont des mots anglais, mais ils
 * doivent rester en anglais. On les retire de la prose avant la recherche, sinon
 * « Next.js » serait signalé comme un anglicisme.
 */
const TERMES_TECHNIQUES = [
  "Next\\.js", "Node\\.js", "App Router", "React", "Tailwind(?: CSS)?",
  "TypeScript", "JavaScript", "PostgreSQL", "SQLite", "JSON", "PDF", "HTML",
  "CSS", "Markdown", "Discord", "Gemini", "OpenAI", "GitHub", "Next\\.js",
  "\\bPNG\\b", "\\bJPEG\\b", "\\bJPG\\b", "\\bGIF\\b", "\\bWebP\\b", "\\bSVG\\b",
  "\\bHTTP\\b", "\\bAPI\\b", "\\bHMAC\\b", "\\bRSS\\b", "\\bCDN\\b", "\\bSEO\\b",
];

/**
 * Défauts de typographie française. En français, une virgule, un point-virgule
 * ou un deux-points est toujours suivi d'une espace : sa violation trahit
 * presque toujours une couture ratée dans la chaîne.
 */
const DEBRIS = [
  [/{:\s*\.\s*\}/, "classe Tailwind orpheline"],
  // En français, une virgule ou un point-virgule est toujours suivi d'une
  // espace : une lettre minuscule collée à la suite trahit une couture ratée.
  [/[,;]\p{Ll}/u, "espace manquante après , ou ;"],
  // Un mot entre parenthèses precedé d'une espace (`une *(variable)`) trahit
  // la meme catégorie de couture ratée.
  [/\s\*\(/u, "astérisque parasite avant une parenthèse"],
  // `**gras**` est correct ; c'est le **fermetant** collé au mot suivant qui
  // ne l'est pas. Un fermant est nécessairement précédé d'une lettre ou d'un
  // chiffre ; un ouvrant suit un espace ou une ponctuation ouvrante.
  [/(?<=[\p{L}\p{N}])\*\*(?=[\p{Ll}])/u, "espace manquante après un ** fermant"],
  [/[a-zà-ÿ]' +\p{Ll}\]/u, "espace parasite apres l'apostrophe"],
  [/(?<=\S)\](?=\p{Ll})/u, "espace manquante après ]"],
];

/** Une ligne de code, de commentaire ou de syntaxe Markdown : jamais inspectée. */
function estCode(ligne) {
  return (
    /^\s*(import|export|const|let|var|function|type|interface|\/\/|\/\*|\*|\})/.test(
      ligne,
    ) ||
    /^\s*(while|for|if|else|switch|return|throw|await|async)\b/.test(ligne) ||
    /\bfrom\s+"[^"]*"\s*;?\s*$/.test(ligne) ||
    /\[\[|\]\(|\]\[/.test(ligne) ||
    // appels et expressions JavaScripttypicalement sur une seule ligne
    /^\s*(return|const|let)\b.*;\s*$/.test(ligne) ||
    /\b(Date\.now|console\.|process\.)\b/.test(ligne) ||
    // `this.x = …`, `super(…)` : code JavaScript, pas de la prose
    /\b(this|this\.[A-Za-z_]+|super)\b\s*[.=(]/.test(ligne) ||
    // appels de méthodes d'API : client.on(…), hmac.update(…), Buffer.from(…)
    /\.(on|once|update|emit|set|get|has|use|log|end|write|send|add|delete|test|slice|filter|map|join|parse|stringify|randomBytes|from|charCodeAt|subarray|getUint\d+|startsWith|includes|replace|split|push|toString)\s*\(/.test(
      ligne,
    ) ||
    // requêtes SQL : le vocabulaire anglais y est normal. On couvre aussi
    // DDL (CREATE, ALTER) et les lignes de continuation (SET, AND, OR, NOT).
    /\b(SELECT|INSERT\s+INTO|DELETE\s+FROM|WHERE|VALUES|ORDER\s+BY|LIMIT|CREATE\s+(TABLE|INDEX|UNIQUE)|ALTER\s+TABLE|DROP\s+TABLE)\b/i.test(
      ligne,
    ) ||
    // `UPDATE articles` ouvre souvent une requête sur plusieurs lignes : le
    // `SET` n'est pas forcément sur la même ligne.
    /^\s*`?UPDATE\s+[a-z_]+`?\s*$/i.test(ligne) ||
    /^\s*`?UPDATE\s+[a-z_]+\s+SET\b/i.test(ligne) ||
    /^\s*(SET|AND|OR|NOT|PRIMARY\s+KEY|REFERENCES|ON\s+CONFLICT|WITH)\b/i.test(ligne) ||
    // lignes de continuation d'une requête : colonnes, types, espaceurs
    /\$(?:\d+)|\b(TIMESTAMPTZ|JSONB|ON CONFLICT|EXCLUDED|updated_at|created_at|discord_user_id|article_slug|wiki_meta|setval|bigserial|COALESCE)\b/i.test(
      ligne,
    ) ||
    // Attributs JSX : `onChange={(e) => update({ x: e.target.value })}` est du
    // code, meme si `update` et `value` sont des mots anglais.
    /\bon[A-Z][A-Za-z]*=\{/.test(ligne) ||
    // Noms d'options d'API Web : `about:blank`, `addEventListener("open")`,
    // `{ once: true }` : ce sont des mots anglais par contrat de la plateforme.
    /"about:blank"/.test(ligne) ||
    /addEventListener\(/.test(ligne) ||
    /\{[^}]*\bonce:\s*true/.test(ligne) ||
    /^\s*(className|style|key|ref|placeholder|type|htmlFor|id|rows|cols)=\{/.test(ligne) ||
    // Exemples de configuration : une ligne d'assignation `.env` ou de JSON
    // porte des virgules séparant des valeurs, pas des clauses de prose.
    /^\s*[A-Z][A-Z0-9_]*\s*=/.test(ligne) ||
    /^\s*"?[A-Za-z0-9_-]+"?\s*[:=]\s*".*"\s*,/.test(ligne)
  );
}

let problemes = 0;

for (const fichier of targets) {
  let texte;
  try {
    texte = readFileSync(fichier, "utf8");
  } catch {
    continue;
  }
  texte.split("\n").forEach((ligne, index) => {
    const numero = index + 1;
    const apercu = ligne.trim().slice(0, 110);

    const etranger = ligne.match(FOREIGN);
    if (etranger) {
      console.log(
        `CARACTÈRE  ${fichier}:${numero}  ${JSON.stringify(etranger[0])}  ${apercu}`,
      );
      problemes += 1;
    }

    if (estCode(ligne) || !ligne.trim()) return;

    // On masque liens wiki, liens Markdown, code et URL avant toute recherche.
    const prose = ligne
      // Les entités HTML/JSX (`&apos;`, `&nbsp;`) ne sont pas de la prose : sans
      // ce retrait, leur point-virgule ou leur apostrophe déclenche à tort la
      // règle « espace manquante après , ou ; ».
      .replace(/&(?:[a-z]+|#\d+|#x[0-9a-f]+);/gi, " ")
      .replace(/\[\[[^\]]*\]\]/g, "")
      .replace(/\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/`[^`]*`/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\/\S+/g, "")
      // Les noms de technologies sont des anglicismes légitimes.
      .replace(new RegExp(TERMES_TECHNIQUES.join("|"), "gi"), " ");

    for (const mot of ANGLAIS) {
      if (new RegExp(`(?<![\\p{L}-])${mot}(?![\\p{L}-])`, "iu").test(prose)) {
        console.log(`ANGLAIS    ${fichier}:${numero}  « ${mot} »  ${apercu}`);
        problemes += 1;
      }
    }
    for (const [motif, libelle] of DEBRIS) {
      if (motif.test(prose)) {
        console.log(`DÉBRIS     ${fichier}:${numero}  ${libelle}  ${apercu}`);
        problemes += 1;
      }
    }
  });
}

console.log(
  problemes === 0
    ? `\nAucun défaut de texte détecté (${targets.length} fichiers).`
    : `\n${problemes} défaut(s) de texte détecté(s).`,
);
process.exit(problemes === 0 ? 0 : 1);
