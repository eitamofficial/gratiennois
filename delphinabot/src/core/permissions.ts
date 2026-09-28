/**
 * Permissions.
 *
 * Deux questions distinctes, souvent confondues :
 *
 * 1. **Qui peut appeler la commande ?** Un niveau, déduit des rôles du serveur
 *    et des permissions Discord, jamais d'une liste codée en dur.
 * 2. **Le bot peut-il agir sur cette cible ?** Discord impose lui-même la
 *    hiérarchie ; mieux vaut le dire clairement que laisser Discord renvoyer
 *    une erreur technique au modérateur.
 */

import { PermissionFlagsBits, type Guild, type GuildMember } from "discord.js";
import type { Configuration } from "../config.js";
import type { ReglagesServeur } from "../db/serveur.js";
import type { Niveau } from "./types.js";

/** Ordre d'autorité : plus le rang est élevé, plus il ouvre de portes. */
const RANG: Record<Niveau, number> = {
  membre: 0,
  dj: 0,
  moderation: 1,
  admin: 2,
  proprietaire: 3,
};

/** Niveau atteint par un membre sur un serveur. */
export async function niveauDe(
  guild: Guild,
  membre: GuildMember,
  serveur: ReglagesServeur,
  configuration: Configuration,
): Promise<Niveau> {
  if (configuration.proprietaires.has(membre.id)) return "proprietaire";
  if (membre.id === guild.ownerId) return "proprietaire";
  if (membre.permissions.has(PermissionFlagsBits.Administrator)) return "admin";

  const rolesAdmin = [serveur.roleAdmin, configuration.roles.admin].filter(Boolean) as string[];
  if (rolesAdmin.some((role) => membre.roles.cache.has(role))) return "admin";

  const rolesMod = [serveur.roleModeration, configuration.roles.moderation].filter(
    Boolean,
  ) as string[];
  if (rolesMod.some((role) => membre.roles.cache.has(role))) return "moderation";

  return "membre";
}

/** Le membre porte-t-il un rôle de DJ (ou l'autorité d'un niveau supérieur) ? */
export function estDj(
  membre: GuildMember,
  serveur: ReglagesServeur,
  configuration: Configuration,
): boolean {
  const rolesDj = [serveur.roleDj, configuration.roles.dj].filter(Boolean) as string[];
  if (rolesDj.some((role) => membre.roles.cache.has(role))) return true;
  return membre.permissions.has(PermissionFlagsBits.ManageChannels);
}

/** Le niveau atteint ouvre-t-il la porte au niveau demandé ? */
export function autorise(obtenu: Niveau, requis: Niveau): boolean {
  if (requis === "dj") return true; // traité à part : orthogonal aux autres
  if (requis === "membre") return true;
  return RANG[obtenu] >= RANG[requis];
}

/**
 * Le bot peut-il administrer ce membre ?
 *
 * Discord refuse qu'un membre agisse sur quelqu'un qui le dépasse, le bot
 * compris. Deux cas reviennent sans cesse : la cible est plus haute que le
 * bot, ou la cible est le propriétaire du serveur.
 */
export function peutAgir(guild: Guild, cible: GuildMember): { ok: boolean; raison: string | null } {
  if (cible.id === guild.ownerId) {
    return { ok: false, raison: "Le propriétaire du serveur ne peut pas être sanctionné." };
  }
  const positionDuBot = guild.members.me?.roles.highest.position ?? 0;
  if (cible.roles.highest.position >= positionDuBot) {
    return {
      ok: false,
      raison:
        "Ce membre a un rôle au-dessus de DelphinaBot : remontez le rôle du bot pour pouvoir agir sur lui.",
    };
  }
  if (!cible.kickable) {
    return { ok: false, raison: "Ce membre ne peut pas être retiré du serveur." };
  }
  if (!cible.bannable) {
    return { ok: false, raison: "Ce membre ne peut pas être banni de ce serveur." };
  }
  if (!cible.moderatable) {
    return { ok: false, raison: "Ce membre ne peut pas être mis en sourdine par le bot." };
  }
  return { ok: true, raison: null };
}
