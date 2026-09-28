/**
 * Outils communs aux commandes.
 *
 * Réponses, options répétées, conversion d'erreur : ce que chaque commande
 * ferait autrement de la même manière. L'objectif est qu'une commande se lise
 * comme sa documentation — le code ne fait que ce qu'elle promet.
 */

import {
  ChannelType,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type GuildTextBasedChannel,
  SlashCommandBuilder,
} from "discord.js";
import type { Contexte } from "../core/types.js";
import { erreur, or, succes } from "../lib/embres.js";
import { journal } from "../logger.js";

/** Constructeur de commande en français, pour ne pas répéter la chaîne vide. */
export function commande(nom: string, description: string): SlashCommandBuilder {
  return new SlashCommandBuilder().setName(nom).setDescription(description);
}

/** Répond à l'interaction, visible de tous ou non. */
export async function repondre(
  interaction: ChatInputCommandInteraction,
  embed: EmbedBuilder,
  publique = false,
): Promise<void> {
  if (interaction.replied || interaction.deferred) {
    await interaction
      .followUp({ embeds: [embed], ephemeral: !publique })
      .catch(() => undefined);
    return;
  }
  await interaction.reply({ embeds: [embed], ephemeral: !publique });
}

/** Répond par un échec, toujours en privé. */
export async function echec(contexte: Contexte, message: string): Promise<void> {
  await repondre(contexte.interaction, erreur(message));
}

/** Répond par une confirmation, toujours en privé. */
export async function confirmation(contexte: Contexte, message: string): Promise<void> {
  await repondre(contexte.interaction, succes(message));
}

/** Salon textuel dans lequel le bot peut écrire. */
export function estSalonTextuel(canal: unknown): canal is GuildTextBasedChannel {
  const type = (canal as { type?: ChannelType } | null)?.type;
  if (type === undefined) return false;
  return (
    type === ChannelType.GuildText ||
    type === ChannelType.GuildAnnouncement ||
    type === ChannelType.PublicThread ||
    type === ChannelType.PrivateThread ||
    type === ChannelType.AnnouncementThread
  );
}

/**
 * Exécute une commande en transformant toute exception en message lisible.
 *
 * Le bot ne doit jamais renvoyer une pile d'appels à un membre : un module qui
 * échoue est un bug à corriger, pas un incident public de l'utilisateur. Le
 * détail technique part dans le journal, l'utilisateur reçoit une phrase.
 */
export async function executer(contexte: Contexte, action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (erreurRecee) {
    const message =
      erreurRecee instanceof Error ? erreurRecee.message : String(erreurRecee);
    journal.error(`/${contexte.interaction.commandName} : ${message}`);

    const contenu = erreur("La commande a échoué. L'incident a été journalisé.");
    if (contexte.interaction.replied || contexte.interaction.deferred) {
      await contexte.interaction
        .followUp({ embeds: [contenu], ephemeral: true })
        .catch(() => undefined);
    } else {
      await repondre(contexte.interaction, erreur(`La commande a échoué : ${message}`));
    }
  }
}

/** Embed neutre réutilisable. */
export function note(description: string): EmbedBuilder {
  return or(description);
}
