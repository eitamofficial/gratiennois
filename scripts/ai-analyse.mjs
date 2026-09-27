/**
 * Lance une analyse automatique des salons de parti, sans passer par
 * l'interface.
 *
 * Pensé pour une **tâche planifiée** (cron, GitHub Actions, Task Scheduler) :
 * le wiki reçoit ainsi des propositions sans que personne n'ait à cliquer.
 *
 * Le script ne publie rien : il appelle `POST /api/ai/analyse`, qui ne dépose
 * que des propositions en attente de relecture. Il faut un jeton de session
 * valide, passé par `WIKI_SESSION` (cookie `gratianopolis_session`).
 *
 * Usage :
 *   WIKI_SESSION=… node scripts/ai-analyse.mjs              # dépose les propositions
 *   WIKI_SESSION=… node scripts/ai-analyse.mjs --simulation  # n'enregistre rien
 *   WIKI_URL=http://localhost:3000 WIKI_SESSION=… node scripts/ai-analyse.mjs
 */
import { readFileSync } from "node:fs";

/** Charge le .env sans dépendance (aucun dotenv dans ce projet). */
function chargerEnv() {
  try {
    for (const ligne of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const correspondance = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(ligne);
      if (!correspondance) continue;
      const [, cle, valeur] = correspondance;
      if (process.env[cle] === undefined) {
        process.env[cle] = valeur.replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Pas de .env : on continue avec l'environnement du processus.
  }
}

chargerEnv();

const BASE = (process.env.WIKI_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SESSION = (process.env.WIKI_SESSION ?? "").trim();
const simulation = process.argv.includes("--simulation");

if (!SESSION) {
  console.error("WIKI_SESSION est requis : le cookie de session d'un rédacteur.");
  console.error("");
  console.error("Obtenez-le en vous connectant à /connexion, puis :");
  console.error("  WIKI_SESSION='<valeur du cookie gratianopolis_session>' \\");
  console.error("  node scripts/ai-analyse.mjs");
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY est absent de l'environnement : analyse impossible.");
  process.exit(1);
}

const reponse = await fetch(`${BASE}/api/ai/analyse`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: `gratianopolis_session=${SESSION}`,
  },
  body: JSON.stringify({ enregistrer: !simulation }),
});

const donnees = await reponse.json().catch(() => ({}));

if (!reponse.ok) {
  console.error(`Échec ${reponse.status} : ${donnees.error ?? "réponse illisible"}`);
  process.exit(1);
}

const rapport = donnees.rapport ?? {};

console.log(
  simulation
    ? "\nSimulation terminée — rien n'a été enregistré.\n"
    : "\nAnalyse terminée.\n",
);

console.log(`Salons lus : ${rapport.salons?.length ?? 0}`);
for (const salon of rapport.salons ?? []) {
  const etat = salon.lisible
    ? `${salon.messages} messages`
    : `illisible — ${salon.erreur ?? "raison inconnue"}`;
  console.log(`  · ${salon.libelle} : ${etat}`);
}

console.log(`\nVolume total : ${rapport.volume ?? 0} messages`);

for (const proposition of rapport.propositions ?? []) {
  const verdict = proposition.pertinent
    ? `PERTINENT (confiance ${Math.round((proposition.confiance ?? 0) * 100)} %, ${proposition.citations?.length ?? 0} citations)`
    : `sans apport — ${proposition.note ?? "aucun apport vérifiable"}`;
  console.log(`\n  ${proposition.slug}\n    ${verdict}`);
  if (proposition.pertinent) {
    console.log(`    ${proposition.resume}`);
  }
}

if (donnees.deposees?.length) {
  console.log(`\nPropositions déposées : ${donnees.deposees.length}`);
  for (const deposee of donnees.deposees) {
    console.log(`  · ${deposee.slug}${deposee.creee ? " (nouvelle)" : " (mise à jour)"}`);
  }
  console.log("\nRelisez-les dans /admin/ia : rien n'est publié sans validation.");
} else if (!simulation) {
  console.log("\nAucune proposition déposée : les discussions n'apportent rien de neuf.");
}
