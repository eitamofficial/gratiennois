/**
 * Ressources éditoriales du Delphinat.
 *
 * Citations, décrets, boutique et quiz vivent en JSON dans `ressources/` :
 * ce sont des textes, pas de la logique. Les modifier ne demande donc jamais
 * de toucher au code. Un fichier absent est signalé une fois, et la commande
 * qui en dépend s'explique au lieu de planter.
 */

import { existsSync, readFileSync, watch } from "node:fs";
import { join } from "node:path";
import { journal } from "../logger.js";
import { choisir, entier, melanger, remplir } from "./texte.js";

const cache = new Map();

/** Lit (et met en cache) un fichier de ressources. */
function lire(racine, nom) {
  if (cache.has(nom)) return cache.get(nom);

  const chemin = join(racine, `${nom}.json`);
  if (!existsSync(chemin)) {
    journal.warn(`Ressource absente : ${chemin}`);
    cache.set(nom, null);
    return null;
  }

  try {
    const donnees = JSON.parse(readFileSync(chemin, "utf8"));
    cache.set(nom, donnees);
    return donnees;
  } catch (erreur) {
    journal.warn(`Ressource illisible (${nom}.json) : ${erreur.message}`);
    cache.set(nom, null);
    return null;
  }
}

/** Vérifie que les fichiers attendus sont là, et prévient dans le journal. */
export function verifierRessources(racine) {
  for (const nom of ["citations", "decrets", "marche", "quiz"]) lire(racine, nom);
}

/** Une citation, ou `null`. */
export function citation(racine) {
  const donnees = lire(racine, "citations");
  return choisir(donnees?.citations ?? []);
}

/** Une question de quiz : `{ question, reponses, reponse }`. */
export function questionQuiz(racine) {
  return choisir(lire(racine, "quiz")?.questions ?? []);
}

/** Un décret ridicule, tiré au sort dans les modèles disponibles. */
export function genererDecret(racine) {
  const donnees = lire(racine, "decrets");
  if (!donnees) return null;

  const modele = choisir(donnees.modeles ?? []);
  if (!modele) return null;

  const mot = (cle) => choisir(donnees[cle] ?? []) ?? "quelque chose";

  return remplir(modele, {
    numero: entier(1, 999),
    date: new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date()),
    interdit: mot("interdits"),
    peine: mot("peines"),
    objet: mot("objets"),
  });
}

/** Alias conservé pour la lecture des commandes : un décret se génère. */
export const decret = genererDecret;

/** Les articles de la boutique. */
export function boutique(racine) {
  const donnees = lire(racine, "marche");
  return donnees?.boutique ?? null;
}

/** Un article de la boutique, par identifiant. */
export function article(racine, id) {
  const articles = boutique(racine)?.articles ?? [];
  const cherche = String(id ?? "").toLowerCase();
  return articles.find((element) => element.id?.toLowerCase() === cherche) ?? null;
}

/** Options de quiz mélangées, en gardant la bonne réponse. */
export function optionsQuiz(question) {
  const reponses = question?.reponses ?? [];
  const bonne = reponses[question.reponse];
  return { bonne, proposees: melanger(reponses) };
}

/** Recharge le cache : utile après une modification à chaud des fichiers. */
export function viderCache() {
  cache.clear();
}

/** Surveille le dossier et vide le cache à chaque écriture. */
export function surveillerRessources(racine) {
  try {
    watch(racine, { persistent: false }, () => {
      viderCache();
      journal.debug("Ressources rechargées depuis le disque.");
    });
  } catch {
    // La surveillance est un confort : son absence ne change rien au service.
  }
}
