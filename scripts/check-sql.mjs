/**
 * Contrôle les requêtes SQL du dépôt : les placeholders `$1`, `$2`… doivent
 * être contigus et tous couverts par le tableau de paramètres.
 *
 * PostgreSQL ne dit pas « paramètre manquant » : il dit « could not determine
 * data type of parameter $N » — à l'exécution, sur la première requête
 * réellement utilisée, donc en production et jamais au démarrage. C'est un
 * défaut coûteux précisément parce qu'il reste invisible. Le vérifier à la
 * lecture du code coûte une seconde.
 *
 *   npm run check:sql
 *
 * Seul le wiki (`src/`) écrit du SQL. Le bot Discord (`DelphinaBotV2/`) range
 * ses données dans un fichier JSON : il n'a aucune requête à vérifier ici.
 * Seules les requêtes écrites en clair sont retenues : un SQL assemblé par
 * concaténation n'est pas vérifiable statiquement, et le script le dit plutôt
 * que de prétendre avoir tout couvert.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const RACINES = ["src"];
const EXTENSIONS = [".ts", ".tsx", ".js", ".mjs"];
const APPELS = /\b(requete|ligne|executer|query)\s*(<[^>]*>)?\s*\(/g;

function fichiers(racine) {
  const trouves = [];
  const parcourir = (dossier) => {
    let entrees;
    try {
      entrees = readdirSync(dossier);
    } catch {
      return;
    }
    for (const entree of entrees) {
      if (entree === "node_modules" || entree === ".next" || entree === "dist") continue;
      const chemin = join(dossier, entree);
      if (statSync(chemin).isDirectory()) parcourir(chemin);
      else if (EXTENSIONS.some((ext) => entree.endsWith(ext))) trouves.push(chemin);
    }
  };
  parcourir(racine);
  return trouves;
}

/**
 * Lit les arguments d'un appel, du code source.
 *
 * Une seule passe, avec une pile de profondeur : c'est ce qui permet de
 * découper sur les virgules de premier niveau sans être induit en erreur par
 * une virgule située dans une chaîne SQL. Les chaînes et les gabarits sont
 * recopiés tels quels, le contenu n'est pasInterpreté.
 */
function lireArguments(source, ouverture) {
  const args = [];
  let courant = "";
  let profondeur = 0;
  let i = ouverture + 1;

  while (i < source.length) {
    const c = source[i];

    if (c === "'" || c === '"' || c === "`") {
      const debut = i;
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === c) break;
        // Expression interpolée d'un gabarit : on la saute telle quelle.
        if (c === "`" && source[i] === "$" && source[i + 1] === "{") {
          let niveau = 1;
          i += 2;
          while (i < source.length && niveau > 0) {
            if (source[i] === "{") niveau += 1;
            else if (source[i] === "}") niveau -= 1;
            i += 1;
          }
          continue;
        }
        i += 1;
      }
      i += 1;
      courant += source.slice(debut, i);
      continue;
    }

    // La parenthese qui ferme l'appel elle-meme : on rend la main avant de
    // l'absorber. Le test precede la mise a jour de profondeur, sinon la
    // fermeture vient d'etre decrementee et la condition n'est jamais vraie —
    // le lecteur partirait alors jusqu'a la fin du fichier.
    if (c === ")" && profondeur === 0) break;

    if ("([{".includes(c)) profondeur += 1;
    else if (")]}".includes(c)) profondeur -= 1;

    if (c === "," && profondeur === 0) {
      args.push(courant);
      courant = "";
      i += 1;
      continue;
    }

    courant += c;
    i += 1;
  }

  if (courant.trim()) args.push(courant);
  return args;
}

/** Nombre d'éléments de premier niveau d'un littéral de tableau. */
function tailleTableau(litteral) {
  const t = litteral.trim();
  if (!t.startsWith("[")) return null;
  let profondeur = 0;
  let elements = 0;
  let contenu = false;

  for (let i = 0; i < t.length; i += 1) {
    const c = t[i];
    if (c === "'" || c === '"' || c === "`") {
      const delimiteur = c;
      i += 1;
      while (i < t.length && t[i] !== delimiteur) {
        // Un antislash echappe le caractere suivant : avancer de deux, sinon
        // le curseur reste planté sur une chaine qui ne se termine jamais.
        i += t[i] === "\\" ? 2 : 1;
      }
      contenu = true;
      continue;
    }
    if ("([{".includes(c)) profondeur += 1;
    else if (")]}".includes(c)) profondeur -= 1;
    else if (c === "," && profondeur === 1) elements += 1;
    if (profondeur === 1 && !",".includes(c) && c.trim() !== "") contenu = true;
  }
  return contenu ? elements + 1 : 0;
}

const ANOMALIES = [];
let requetesAnalysees = 0;

for (const racine of RACINES) {
  for (const fichier of fichiers(racine)) {
    const source = readFileSync(fichier, "utf8");
    let match;
    APPELS.lastIndex = 0;

    while ((match = APPELS.exec(source)) !== null) {
      const nomAppel = match[1];
      const ouverture = match.index + match[0].length - 1;
      const args = lireArguments(source, ouverture);
      if (args.length < 2) continue;

      const sql = args[0].trim().replace(/^`|`$/g, "");
      if (!/^(SELECT|INSERT|UPDATE|DELETE|WITH)\b/i.test(sql)) continue;

      const utilises = [...sql.matchAll(/(?<![$\\])\$(\d+)/g)].map((m) => Number(m[1]));
      if (utilises.length === 0) continue;

      // Le tableau de parametres n'est pas toujours le dernier argument : une
      // option peut suivre. On cherche le dernier littéral de tableau.
      let taille = null;
      for (let i = args.length - 1; i >= 0 && taille === null; i -= 1) {
        taille = tailleTableau(args[i]);
      }
      if (taille === null) continue;
      requetesAnalysees += 1;

      const maxi = Math.max(...utilises);
      const manquants = [];
      for (let n = 1; n <= maxi; n += 1) {
        if (!utilises.includes(n)) manquants.push(n);
      }

      const numeroLigne = source.slice(0, match.index).split("\n").length;
      if (manquants.length > 0) {
        ANOMALIES.push({
          fichier,
          ligne: numeroLigne,
          appel: nomAppel,
          texte: `placeholder inutilise dans la requete : ${manquants.map((n) => `$${n}`).join(", ")} (${maxi} utilises, ${taille} fournis)`,
        });
      } else if (maxi > taille) {
        ANOMALIES.push({
          fichier,
          ligne: numeroLigne,
          appel: nomAppel,
          texte: `${maxi} placeholder(s) references pour ${taille} parametre(s) fourni(s)`,
        });
      }
    }
  }
}

if (ANOMALIES.length > 0) {
  console.error(`ECHEC : ${ANOMALIES.length} requete(s) SQL mal parametree(s) :\n`);
  for (const a of ANOMALIES) {
    console.error(`  ${a.fichier}:${a.ligne}  (${a.appel})`);
    console.error(`    ${a.texte}`);
  }
  console.error("");
  console.error("  PostgreSQL echoue a l'execution, pas au demarrage : le premier");
  console.error("  message reel d'un membre revele l'erreur, en production.");
  process.exit(1);
}

console.log(
  `SQL : ${requetesAnalysees} requete(s) parametree(s) a plat, aucun decalage.`,
);
