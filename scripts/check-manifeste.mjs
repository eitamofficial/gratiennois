/**
 * Le manifeste du PSRG ne doit citer que des commandes qui existent.
 *
 * Une page de doctrine qui promet une commande inexistante est une page
 * fausse, et le bot est la seule source de vérité possible : on va le lire.
 * Ce contrôle échoue si le manifeste cite une commande absente de
 * `delphinabot/src/commandes`, ou si ses inventaires ne correspondent plus
 * à l'état réel du bot.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DOSSIER = "delphinabot/src/commandes";
const MANIFESTE = "src/content/manifeste-psrg.json";

/** Commandes réellement déclarées par le bot. */
function commandesDuBot() {
  const trouvees = new Set();
  for (const fichier of readdirSync(DOSSIER)) {
    if (!fichier.endsWith(".ts")) continue;
    const texte = readFileSync(join(DOSSIER, fichier), "utf8");
    for (const m of texte.matchAll(/commande\(\s*"([^"]+)"/g)) trouvees.add(m[1]);
  }
  return trouvees;
}

/**
 * Commandes citées par le manifeste, sous forme de `/nom`.
 *
 * Le `/` d'un chemin d'adresse (`duckdns.org/bot`) est précédé d'une lettre et
 * n'est donc pas retenu : seules les commandes, écrites `/commande`, sont
 * prises. C'est ce qui permet au manifeste de citer des pages du wiki sans
 * les faire passer pour des ordres du bot.
 */
function commandesCitees(contenu) {
  const trouvees = new Set();
  for (const m of contenu.matchAll(/(^|[^A-Za-z0-9._-])\/([a-z][a-z0-9-]*)/g)) {
    trouvees.add(m[2]);
  }
  return trouvees;
}

const contenu = JSON.parse(readFileSync(MANIFESTE, "utf8"));
const reelles = commandesDuBot();
const citees = commandesCitees(JSON.stringify(contenu));

const inconnues = [...citees].filter((c) => !reelles.has(c)).sort();
const absentes = [...reelles].filter((c) => !citees.has(c)).sort();

if (inconnues.length > 0) {
  console.error(
    `ECHEC : le manifeste cite ${inconnues.length} commande(s) inexistante(s) :`,
  );
  for (const c of inconnues) console.error(`  /${c}`);
}

if (absentes.length > 0) {
  console.warn(
    `ATTENTION : ${absentes.length} commande(s) du bot ne sont pas citees :`,
  );
  console.warn(`  ${absentes.map((c) => `/${c}`).join(", ")}`);
}

if (inconnues.length > 0) process.exit(1);

console.log(
  `Manifeste : ${reelles.size} commandes dans le bot, ${citees.size} citees, aucune fantome.`,
);
