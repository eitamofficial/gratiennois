/**
 * Vérification des commandes avant envoi.
 *
 * Discord refuse un lot de commandes entier dès qu'une seule est mal formée :
 * descriptions trop longues, nom d'option en majuscules, plus de vingt-cinq
 * options, doublons. L'erreur est renvoyée telle quelle par l'API, sans
 * numéro de ligne, et il faut la deviner.
 *
 * Ce script fait le même travail **avant** l'envoi, et nomme la commande fautive.
 * Il ne remplace pas l'API : il évite seulement qu'un refus inexplicable
 * interrompe l'installation.
 *
 *     node dist/scripts/verifier-commandes.js
 */

import { TOUTES_LES_COMMANDES } from "../commandes/index.js";

interface Probleme {
  commande: string;
  message: string;
}

const problemes: Probleme[] = [];
const noms = new Set<string>();

/** Vérifie une chaîne selon les règles de longueur de Discord. */
function longueur(valeur: string | undefined, maximum: number, commande: string, quoi: string): void {
  if (valeur && valeur.length > maximum) {
    problemes.push({
      commande,
      message: `${quoi} dépasse ${maximum} caractères (${valeur.length}).`,
    });
  }
}

/** Discord n'accepte ni majuscule ni espace dans un nom d'option. */
function nomOption(valeur: string, commande: string): void {
  if (!/^[-_\p{L}\p{N}]+$/u.test(valeur)) {
    problemes.push({ commande, message: `Nom d'option invalide : « ${valeur} ».` });
  }
}

for (const element of TOUTES_LES_COMMANDES) {
  const donnees = element.donnees.toJSON() as {
    name: string;
    description: string;
    options?: { name: string; description: string; type?: number; options?: unknown[] }[];
  };

  const nom = element.nom;

  if (noms.has(nom)) {
    problemes.push({ commande: nom, message: "Nom de commande déjà utilisé." });
  }
  noms.add(nom);

  if (nom !== donnees.name) {
    problemes.push({
      commande: nom,
      message: `La clé interne (${element.nom}) ne correspond pas au nom Discord (${donnees.name}).`,
    });
  }
  longueur(donnees.name, 32, nom, "Le nom de la commande");
  longueur(donnees.description, 100, nom, "La description");

  const options = donnees.options ?? [];
  if (options.length > 25) {
    problemes.push({ commande: nom, message: `${options.length} options : maximum 25.` });
  }

  for (const option of options) {
    longueur(option.name, 32, nom, `Le nom de l'option « ${option.name} »`);
    longueur(option.description, 100, nom, `La description de « ${option.name} »`);
    nomOption(option.name, nom);
    if (option.options && option.options.length > 25) {
      problemes.push({
        commande: nom,
        message: `L'option « ${option.name} » a ${option.options.length} sous-options : maximum 25.`,
      });
    }
  }

  if (!element.resume) {
    problemes.push({ commande: nom, message: "Aucun résumé : la commande n'apparaîtra pas correctement dans /aide." });
  }
  if (!element.usage) {
    problemes.push({ commande: nom, message: "Aucun usage indiqué." });
  }
}

if (problemes.length > 0) {
  console.error(`\n${problemes.length} problème(s) dans les commandes :\n`);
  for (const probleme of problemes) {
    console.error(`  /${probleme.commande} — ${probleme.message}`);
  }
  console.error("");
  process.exit(1);
}

console.log(
  `${TOUTES_LES_COMMANDES.length} commandes vérifiées, aucune anomalie. Prêtes à être envoyées.`,
);
