/**
 * Liste complète des commandes.
 *
 * Un seul endroit déclare ce que le bot sait faire. Le déploiement vers Discord
 * et l'aide `/aide` lisent cette liste : il est impossible qu'une commande
 * existe sans être connue, ou qu'elle soit annoncée sans exister.
 */

import type { Commande } from "../core/types.js";
import { COMMANDES_SECURITE } from "./securite.js";
import { COMMANDES_MODERATION } from "./moderation.js";
import { COMMANDES_FUN } from "./fun.js";
import { COMMANDES_ECONOMIE } from "./economie.js";
import { COMMANDES_MUSIQUE } from "./musique.js";
import { COMMANDES_SYSTEME } from "./systeme.js";

/** Toutes les commandes, dans l'ordre d'affichage de l'aide. */
export const TOUTES_LES_COMMANDES: Commande[] = [
  ...COMMANDES_SYSTEME,
  ...COMMANDES_SECURITE,
  ...COMMANDES_MODERATION,
  ...COMMANDES_ECONOMIE,
  ...COMMANDES_FUN,
  ...COMMANDES_MUSIQUE,
];

export { COMMANDES_SECURITE, COMMANDES_MODERATION, COMMANDES_ECONOMIE, COMMANDES_FUN, COMMANDES_MUSIQUE, COMMANDES_SYSTEME };
