/**
 * Épreuve de l'œuf.
 *
 * La détection du mot secret est la seule partie du déverrouillage qui puisse
 * se tromper, et une erreur y est doublement coûteuse : trop permissif, la
 * cache s'ouvre à quiconque ; trop strict, le fan qui a trouvé la bonne réponse
 * repart sans rien.
 *
 * Ces cas sont donc éprouvés sur le module réel du projet, pas sur une copie.
 * Le module est transpilé puis évalué, comme le fait l'épreuve Markdown.
 *
 *   node scripts/check-oeuf.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function chargerModule(chemin) {
  const source = readFileSync(path.join(racine, chemin), "utf8");
  const transpile = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  // Le module des resume rien : ses dependances sont vides.
  const charger = () => ({ __esModule: true, default: undefined });
  new Function("require", "module", "exports", transpile)(charger, mod, mod.exports);
  return mod.exports;
}

const Perception = chargerModule("src/lib/oeufs.ts");
const source = readFileSync(path.join(racine, "src/lib/oeuf.ts"), "utf8");
const transpile = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

const module_ = { exports: {} };
const charger = (demande) => (demande.includes("oeufs") ? Perception : { __esModule: true, default: undefined });
new Function("require", "module", "exports", transpile)(charger, module_, module_.exports);

const { OEUFS, NOMBRE_OEUFS, trouverOeuf } = Perception;
const {
  CODE_KONAMI,
  MOTS_DE_PASSE,
  MOT_DU_SECOND_NIVEAU,
  detecterKonami,
  detecterMotSecret,
  detecterOeuf,
  normaliserSaisie,
} = module_.exports;

let echecs = 0;
let total = 0;

function verifie(nom, obtenu, attendu) {
  total += 1;
  const ok = JSON.stringify(obtenu) === JSON.stringify(attendu);
  if (ok) {
    console.log(`OK     ${nom}`);
  } else {
    echecs += 1;
    console.log(
      `ECHEC  ${nom}\n         attendu : ${JSON.stringify(attendu)}\n         obtenu  : ${JSON.stringify(obtenu)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Le mot secret doit s'ouvrir
// ---------------------------------------------------------------------------

for (const mot of MOTS_DE_PASSE) {
  verifie(`« ${mot} » ouvre la porte`, detecterMotSecret(mot), true);
}

verifie("majuscules acceptées", detecterMotSecret("ESHEP"), true);
verifie("accentuation ignorée", detecterMotSecret("Wáka Waka"), true);
verifie("trouvé au milieu d'une phrase", detecterMotSecret("je pense a eshep"), true);
verifie("trouvé après des espaces superflus", detecterMotSecret("   eshep  "), true);

// ---------------------------------------------------------------------------
// …et rien d'autre ne doit l'ouvrir
// ---------------------------------------------------------------------------

const refus = [
  ["le titre du morceau", "shewolf"],
  ["un mot approchant", "esheps"],
  ["un préfixe incomplet", "eshe"],
  ["le nom de l'artiste", "shakira"],
  ["une page de contenu", "d 如何où vient le nom"],
  ["rien du tout", "bonjour"],
  ["vide", ""],
];

for (const [nom, saisie] of refus) {
  verifie(`${nom} n'ouvre pas la porte`, detecterMotSecret(saisie), false);
}

// Le nom de l'artiste est le mot que tout le monde taperait : c'est
// précisément pour cela qu'il ne doit rien déclencher.
verifie(
  "« shakira » seul n'ouvre rien",
  detecterMotSecret("shakira"),
  false,
);

// ---------------------------------------------------------------------------
// La normalisation
// ---------------------------------------------------------------------------

verifie("les accents sont transcrits", normaliserSaisie("éàçù"), "eacu");
verifie("les espaces de bord disparaissent", normaliserSaisie("  loba  "), "loba");
verifie("la casse est abaissée", normaliserSaisie("EsHeP"), "eshep");
verifie("les espaces sont regroupés", normaliserSaisie("waka   waka"), "waka waka");
verifie("la ponctuation est retirée", normaliserSaisie("loba."), "loba");

// ---------------------------------------------------------------------------
// Le code Konami
// ---------------------------------------------------------------------------

verifie("la suite complète est reconnue", detecterKonami([...CODE_KONAMI]), true);
verifie(
  "reconnue même précédée d'autres touches",
  detecterKonami(["z", "z", ...CODE_KONAMI]),
  true,
);
// Une touche frappee apres la suite doit au contraire la faire echouer : sinon
// la porte resterait ouverte en boucle.
verifie(
  "refusee dès qu'une touche suit la suite",
  detecterKonami([...CODE_KONAMI, "z"]),
  false,
);
verifie("une suite incomplète est refusée", detecterKonami(CODE_KONAMI.slice(1)), false);
verifie(
  "une suite dans le désordre est refusée",
  detecterKonami([...CODE_KONAMI].reverse()),
  false,
);
verifie("une suite trop courte est refusée", detecterKonami(["b"]), false);
verifie("rien n'est reconnu dans le vide", detecterKonami([]), false);

// ---------------------------------------------------------------------------
// Le second niveau
// ---------------------------------------------------------------------------

verifie(
  "le mot du second niveau est animal",
  /^[a-z]{4}$/.test(MOT_DU_SECOND_NIVEAU),
  true,
);
verifie(
  "le mot du second niveau est bien distinct",
  !MOTS_DE_PASSE.includes(MOT_DU_SECOND_NIVEAU),
  true,
);


// ---------------------------------------------------------------------------
// Le registre des quinze
// ---------------------------------------------------------------------------

verifie("le registre compte quinze œufs", NOMBRE_OEUFS, 15);
verifie("le compte annoncé correspond", OEUFS.length, NOMBRE_OEUFS);

const identifiants = OEUFS.map((o) => o.id);
verifie(
  "les identifiants sont uniques",
  new Set(identifiants).size,
  OEUFS.length,
);
verifie(
  "les identifiants sont des segments d'URL valides",
  identifiants.every((id) => /^[a-z0-9-]+$/.test(id)),
  true,
);

// Deux œufs ne doivent pas se déclencher sur la même frappe : sans cela, le
// premier du registre volerait toujours la vedette, et deux pages
// resteraient inatteignables.
const empreintes = OEUFS.map((o) =>
  o.verrou.genre === "mot"
    ? `mot:${o.verrou.valeur}`
    : `touches:${o.verrou.valeur.join(",")}`,
);
verifie(
  "aucun verrou n'est partagé",
  new Set(empreintes).size,
  OEUFS.length,
);

// Aucun ne doit être une suite vide, ou une simple lettre que l'on tape sans
// y penser.
verifie(
  "aucun verrou n'est trivial",
  OEUFS.every(
    (o) =>
      o.verrou.genre !== "touches" ||
      (o.verrou.valeur.length >= 2 && o.verrou.valeur.length <= 9),
  ),
  true,
);

verifie(
  "chaque œuf a un titre, une année, un résumé et du contenu",
  OEUFS.every(
    (o) =>
      o.titre.length > 0 &&
      o.annee.length > 0 &&
      o.teaser.length > 10 &&
      o.contenu.length >= 3 &&
      o.contenu.every((p) => p.length > 40),
  ),
  true,
);

verifie("un identifiant inconnu ne donne rien", trouverOeuf("inexistant"), undefined);
verifie("un identifiant connu est trouvé", trouverOeuf(OEUFS[0].id).id, OEUFS[0].id);

// ---------------------------------------------------------------------------
// Chaque verrou ouvre bien le bon œuf
// ---------------------------------------------------------------------------

for (const oeuf of OEUFS) {
  const entree =
    oeuf.verrou.genre === "mot"
      ? { normalise: normaliserSaisie(oeuf.verrou.valeur), brut: oeuf.verrou.valeur, touches: [] }
      : { normalise: "", brut: "", touches: [...oeuf.verrou.valeur] };
  const trouve = detecterOeuf(entree);
  verifie(`« ${oeuf.id} » s'ouvre avec son propre verrou`, trouve?.id, oeuf.id);
}

// Un œuf trouvé par un mot doit aussi s'ouvrir après d'autres mots. La
// reconnaissance a lieu à la frappe de la dernière lettre : le tampon contient
// donc ce qui précède, jamais ce qui suivra.
for (const oeuf of OEUFS.filter((o) => o.verrou.genre === "mot" && /^[a-z ]+$/.test(o.verrou.valeur))) {
  const prefixe = `bonjour ${oeuf.verrou.valeur}`;
  verifie(
    `« ${oeuf.id} » s'ouvre après d'autres mots`,
    detecterOeuf({ normalise: normaliserSaisie(prefixe), brut: prefixe, touches: [] })?.id,
    oeuf.id,
  );
}

// Rien d'autre ne doit ouvrir quoi que ce soit.
for (const bruit of ["bonjour", "administration", "x", "1234", "eshep"]) {
  verifie(
    `« ${bruit} » n'ouvre aucun œuf`,
    detecterOeuf({ normalise: bruit, brut: bruit, touches: bruit.split("") }),
    null,
  );
}

// Le mot arabe ne doit pas être vidé par la normalisation, sinon son œuf serait
// inatteignable.
const arabe = OEUFS.find((o) => o.id === "chq");
if (arabe && arabe.verrou.genre === "mot") {
  verifie("le mot arabe survit à la normalisation", normaliserSaisie(arabe.verrou.valeur), "");
  verifie(
    "l'œuf arabe s'ouvre malgré la normalisation",
    detecterOeuf({ normalise: "", brut: arabe.verrou.valeur, touches: [] })?.id,
    "chq",
  );
} else {
  echecs += 1;
  console.log("ECHEC  l'œuf arabe est introuvable dans le registre");
}

// Une suite peut être précédée d'autres touches : c'est même souhaitable, taper
// « zhuesos » doit ouvrir « huesos ». En revanche une touche frappée après la
// suite doit la faire échouer, sinon la page resterait ouverte en boucle.
for (const oeuf of OEUFS.filter((o) => o.verrou.genre === "touches")) {
  verifie(
    `« ${oeuf.id} » tolère une touche avant la suite`,
    detecterOeuf({ normalise: "", brut: "", touches: ["z", ...oeuf.verrou.valeur] })?.id,
    oeuf.id,
  );
  verifie(
    `« ${oeuf.id} » refuse une touche après la suite`,
    detecterOeuf({ normalise: "", brut: "", touches: [...oeuf.verrou.valeur, "z"] }),
    null,
  );
}

// ---------------------------------------------------------------------------


// La detection du "hors alphabet latin" commande quelle des deux saisies est
// comparee. Un drapeau inverse ne casse rien de visible : les deux saisies
// portent le meme mot quand la frappe est simple. Il casse en revanche tout ce
// qui repose sur la normalisation, comme un mot accentue. Cette epreuve verifie
// donc que chaque chemin est bien celui qui doit l'etre.
verifie(
  "un mot latin se lit dans la saisie normalisee",
  detecterOeuf({ normalise: "fenix", brut: "fénix", touches: [] })?.id,
  "fenix",
);
verifie(
  "un mot latin accentue est accepte grace a la normalisation",
  detecterOeuf({ normalise: "feniz", brut: "fénix", touches: [] })?.id,
  undefined,
);
verifie(
  "un mot hors alphabet latin se lit dans la saisie brute",
  detecterOeuf({ normalise: "", brut: "شكرا", touches: [] })?.id,
  "chq",
);

console.log("");
if (echecs > 0) {
  console.log(`✗ ${echecs} échec(s) sur ${total} épreuves.`);
  process.exit(1);
}
console.log(`${total} épreuves de l'œuf passent.`);
