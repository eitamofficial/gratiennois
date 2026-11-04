/**
 * Registre des commandes.
 *
 * Une commande est un objet : un nom, une catégorie, et une fonction
 * `executer`. Le routeur ne connaît que cette forme, ce qui permet d'ajouter
 * une commande sans toucher au reste du bot — il suffit de l'ajouter au
 * tableau de son module.
 *
 * Le routeur fait trois choses, dans cet ordre : retrouver la commande,
 * vérifier le droit d'y accéder, exécuter. Une erreur imprévue est journalisée
 * et transformée en message compréhensible : un membre ne doit jamais voir
 * une trace de pile, et l'incident doit rester dans le journal.
 */

import { journal } from "../logger.js";
import { erreur } from "../lib/embres.js";
import { peutModerer, repondre } from "./outils.js";
import { ErreurUtilisateur } from "./erreurs.js";
import { COMMANDES_SYSTEME } from "./systeme.js";
import { COMMANDES_WIKI } from "./wiki.js";
import { COMMANDES_MODERATION } from "./moderation.js";
import { COMMANDES_NIVEAUX } from "./niveaux.js";
import { COMMANDES_CONFIGURATION } from "./configuration.js";
import { COMMANDES_UTILITAIRES } from "./utilitaire.js";
import { COMMANDES_FUN } from "./fun.js";
import { COMMANDES_MUSIQUE } from "./musique.js";
import { COMMANDES_FICHIER } from "./fichier.js";
import { COMMANDES_INTERACTION } from "./interaction.js";
import { COMMANDES_ECONOMIE } from "./economie.js";
import { COMMANDES_SECURITE } from "./securite.js";
import { COMMANDES_SIGNALEMENTS } from "./signalements.js";
import { COMMANDES_ACCUEIL } from "./accueil.js";

/** Toutes les commandes du bot, dans l'ordre d'affichage de l'aide. */
export const COMMANDES = [
  ...COMMANDES_SYSTEME,
  ...COMMANDES_WIKI,
  ...COMMANDES_MODERATION,
  ...COMMANDES_SIGNALEMENTS,
  ...COMMANDES_SECURITE,
  ...COMMANDES_NIVEAUX,
  ...COMMANDES_ECONOMIE,
  ...COMMANDES_CONFIGURATION,
  ...COMMANDES_ACCUEIL,
  ...COMMANDES_UTILITAIRES,
  ...COMMANDES_FUN,
  ...COMMANDES_MUSIQUE,
  ...COMMANDES_FICHIER,
  ...COMMANDES_INTERACTION,
];

/** Commandes indexées par nom, pour le routage. */
export const PAR_NOM = new Map(COMMANDES.map((commande) => [commande.nom, commande]));

/** Catégories, dans l'ordre où elles apparaissent dans `/aide`. */
export const CATEGORIES = [
  "système",
  "wiki",
  "modération",
  "sécurité",
  "niveaux",
  "économie",
  "configuration",
  "utilitaires",
  "fun",
  "musique",
  "interaction",
];

/** Vérifie que la commande est utilisable ici, par cette personne. */
function verifierAcces(commande, interaction, contexte) {
  if (!interaction.guild && commande.niveau !== "membre") {
    return "Cette commande n'est utilisable que sur le serveur.";
  }

  if (interaction.guild && commande.permissions) {
    const permis = interaction.memberPermissions?.has(commande.permissions);
    if (!permis) {
      return "Il vous manque une permission Discord pour cette commande.";
    }
  }

  if (commande.niveau === "proprietaire") {
    const membre = interaction.member;
    const autorise =
      contexte.configuration.proprietaires.includes(interaction.user.id) ||
      interaction.guild?.ownerId === interaction.user.id ||
      membre?.permissions?.has("Administrator");
    if (!autorise) return "Cette commande est réservée à l'administration du serveur.";
  }

  if (commande.niveau === "moderateur" && !peutModerer(interaction, contexte.configuration)) {
    return "Cette commande est réservée à la modération.";
  }

  return null;
}

/** Traite une interaction de commande. Appelé depuis les événements. */
export async function traiterCommande(interaction, contexte) {
  const commande = PAR_NOM.get(interaction.commandName);
  if (!commande) {
    journal.warn(`Commande inconnue reçue : ${interaction.commandName}`);
    await repondre(interaction, erreur("Cette commande n'existe plus. Essayez `/aide`."), {
      ephemere: true,
    }).catch(() => {});
    return;
  }

  const refus = verifierAcces(commande, interaction, contexte);
  if (refus) {
    await repondre(interaction, erreur(refus, "Accès refusé"), { ephemere: true }).catch(() => {});
    return;
  }

  try {
    await commande.executer(interaction, contexte);
  } catch (erreurRecue) {
    journal.error(
      `/${interaction.commandName} a échoué : ${erreurRecue?.stack ?? erreurRecue?.message ?? erreurRecue}`,
    );
    const message =
      erreurRecue?.utilisateur === true
        ? erreurRecue.message
        : "Une erreur inattendue est survenue. L'incident a été journalisé.";
    await repondre(interaction, erreur(message), { ephemere: true }).catch(() => {});
  }
}

/** Réexporté pour que les appelants aient un seul point d'entrée. */
export { ErreurUtilisateur };

/** Répertoire des commandes par catégorie, pour `/aide`. */
export function parCategorie() {
  const table = new Map(CATEGORIES.map((categorie) => [categorie, []]));
  for (const commande of COMMANDES) {
    if (!table.has(commande.categorie)) table.set(commande.categorie, []);
    table.get(commande.categorie).push(commande);
  }
  return table;
}
