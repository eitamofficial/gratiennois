/**
 * Vérificateur de commandes.
 *
 * Contrôle ce que Discord refusera ou affichera de travers : un nom trop long,
 * une description absente, un doublon, une option sans texte. Ces erreurs ne
 * se voient qu'au moment du déploiement — autant les trouver ici, hors ligne.
 *
 *     npm run commandes:verifier
 */

import { COMMANDES, CATEGORIES } from "./commandes/index.js";

const PROBLEMES = [];
const ANOMALIES = [];

function signaler(commande, message) {
  PROBLEMES.push(`/${commande.nom} : ${message}`);
}

function anomaly(commande, message) {
  ANOMALIES.push(`/${commande.nom} : ${message}`);
}

/** Répertoire des options récursif (sous-commandes comprises). */
function optionsDe(option) {
  const enfants = option.options ?? [];
  return [option, ...enfants.flatMap(optionsDe)];
}

const vus = new Set();

for (const commande of COMMANDES) {
  if (vus.has(commande.nom)) signaler(commande, "nom en double");
  vus.add(commande.nom);

  if (!/^[-a-z0-9]{1,32}$/.test(commande.nom)) {
    signaler(commande, "nom invalide (minuscules, chiffres et tirets uniquement, 32 caractères au plus)");
  }

  if (!commande.resume || commande.resume.length < 8) {
    signaler(commande, "résumé absent ou trop court");
  }

  if (!CATEGORIES.includes(commande.categorie)) {
    signaler(commande, `catégorie inconnue « ${commande.categorie} »`);
  }

  if (typeof commande.executer !== "function") {
    signaler(commande, "fonction `executer` absente");
  }

  let json = null;
  try {
    json = commande.donnees.toJSON();
  } catch (erreur) {
    signaler(commande, `définition illisible : ${erreur.message}`);
    continue;
  }

  if (json.name !== commande.nom) {
    signaler(commande, `le nom déclaré (${commande.nom}) diffère de la définition (${json.name})`);
  }

  if (!json.description || json.description.length > 100) {
    signaler(commande, "description absente ou supérieure à 100 caractères");
  }

  const options = (json.options ?? []).flatMap(optionsDe);
  for (const option of options) {
    if (option.type === 1 || option.type === 2) {
      if (!option.description) signaler(commande, `sous-commande « ${option.name} » sans description`);
      continue;
    }
    if (!option.description) signaler(commande, `option « ${option.name} » sans description`);
    if (option.description && option.description.length > 100) {
      signaler(commande, `description de « ${option.name} » supérieure à 100 caractères`);
    }
    if (option.required && option.options) {
      anomaly(commande, `« ${option.name} » est requise et a des sous-options`);
    }
  }
}

// Contrôles de cohérence entre le nom déclaré et le builder : une commande
// dont le nom et la définition divergent s'affiche différemment selon qu'on
// l'appelle ou qu'on la liste.
const parCategorie = new Map(CATEGORIES.map((categorie) => [categorie, 0]));
for (const commande of COMMANDES) {
  parCategorie.set(commande.categorie, (parCategorie.get(commande.categorie) ?? 0) + 1);
}

console.log(`Commandes déclarées : ${COMMANDES.length}`);
console.log("");
for (const [categorie, nombre] of parCategorie) {
  console.log(`  ${categorie.padEnd(16)} ${nombre}`);
}
console.log("");

for (const commande of COMMANDES) {
  const options = (commande.donnees.toJSON().options ?? []).length;
  const acces = commande.niveau ?? "membre";
  console.log(
    `  /${commande.nom.padEnd(22)} ${acces.padEnd(12)} ${options} option(s)  ${commande.resume}`,
  );
}

console.log("");
if (ANOMALIES.length > 0) {
  console.log(`${ANOMALIES.length} point(s) à surveiller :`);
  for (const element of ANOMALIES) console.log(`  - ${element}`);
  console.log("");
}

if (PROBLEMES.length > 0) {
  console.error(`${PROBLEMES.length} anomalie(s) bloquante(s) :`);
  for (const probleme of PROBLEMES) console.error(`  - ${probleme}`);
  process.exit(1);
}

console.log("Aucune anomalie bloquante.");
