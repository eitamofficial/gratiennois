/**
 * Types du noyau.
 *
 * Le bot est organisé en modules, mais tous obéissent au même contrat : une
 * commande déclare ses permissions, expose ses données Discord, et reçoit un
 * contexte. Rien d'autre n'est commun — ce qui permet d'ajouter un module sans
 * toucher au reste.
 */

import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Guild,
  GuildMember,
} from "discord.js";
import type { Delphinabot } from "../client.js";
import type { ReglagesServeur } from "../db/serveur.js";

/** Modules du bot, dans l'ordre d'affichage de l'aide. */
export type Categorie = "securite" | "moderation" | "fun" | "economie" | "musique" | "systeme";

/** Libellés français des catégories. */
export const LIBELLES_CATEGORIE: Record<Categorie, string> = {
  securite: "Sécurité",
  moderation: "Modération",
  fun: "Divertissement",
  economie: "Économie",
  musique: "Musique",
  systeme: "Système",
};

export type Niveau = "proprietaire" | "admin" | "moderation" | "membre" | "dj";

/** Ce que chaque niveau autorise, en clair, pour l'aide. */
export const LIBELLES_NIVEAU: Record<Niveau, string> = {
  proprietaire: "propriétaire du bot",
  admin: "administration du serveur",
  moderation: "équipe de modération",
  membre: "tout membre",
  dj: "rôle DJ",
};

export interface Contexte {
  bot: Delphinabot;
  interaction: ChatInputCommandInteraction;
  serveur: ReglagesServeur;
}

/** Identifiants d'un bouton personnalisé, suffixe de la commande qui le gère. */
export const Boutons = {
  verrouiller: "delphi:verrou",
  deverrouiller: "delphi:deverrou",
  raid: "delphi:raid",
  sanction: "delphi:sanction",
  signalement: "delphi:signalement",
  lien: "delphi:lien",
  piece: "delphi:piece",
  achat: "delphi:achat",
  confirmation: "delphi:confirmation",
} as const;

export interface Commande {
  /**
   * Définition Discord : nom, description, options.
   *
   * Le type est volontairement minimal : `addStringOption` renvoie un
   * constructeur plus étroit que `SlashCommandBuilder`, et une commande
   * n'a pas besoin d'être un constructeur complet pour être déployée.
   */
  donnees: { toJSON(): object };
  categorie: Categorie;
  /** Permission minimale requise. */
  niveau: Niveau;
  /** Nom court, repris dans l'aide et les journaux. */
  nom: string;
  /** Usage mesuré, affiché dans l'aide. */
  usage: string;
  /** Explication en une phrase, affichée dans l'aide. */
  resume: string;
  /** Exécute la commande. */
  executer(contexte: Contexte): Promise<void>;
  /** Alimente l'autocomplétion, si la commande en a. */
  autocompletion?(
    interaction: AutocompleteInteraction,
    serveur: ReglagesServeur,
    bot: Delphinabot,
  ): Promise<void>;
  /** Rend la réponse visible de tout le serveur (par défaut : éphémère). */
  publique?: boolean;
  /** Commande utilisable en message privé. */
  prive?: boolean;
}

/**
 * Résout un membre à partir de son identifiant.
 *
 * Discord peut refuser l'accès à la fiche d'un membre que le bot ne voit pas
 * (rôle non partagé, cache expiré). Dans ce cas on renvoie `null` et
 * l'appelant formule son message : mieux vaut une réponse honnête qu'une
 * sanction qui semble avoir échoué sans raison.
 */
export async function resoudreMembre(
  guild: Guild,
  identifiant: string,
): Promise<GuildMember | null> {
  return guild.members.fetch(identifiant).catch(() => null);
}
