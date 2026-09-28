/**
 * Routage des interactions.
 *
 * Point d'entrée unique pour tout ce que Discord envoie : commandes,
 * autocomplétions et boutons. Chaque chemin commence par la même question —
 * « cette personne a-t-il le droit ? » — et se termine de la même manière :
 * une réponse, quelle qu'elle soit. Une commande qui ne répond jamais est
 * pire qu'une commande absente : Discord affiche « l'application ne répond
 * pas » pendant deux minutes.
 */

import {
  type AutocompleteInteraction,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Interaction,
} from "discord.js";
import type { Delphinabot } from "../client.js";
import { Boutons, type Contexte } from "./types.js";
import { autorise, estDj, niveauDe } from "./permissions.js";
import { lireReglages } from "../db/serveur.js";
import { erreur, or } from "../lib/embres.js";
import { journal } from "../logger.js";
import { deverrouiller } from "../modules/securite/verrou.js";
import { boutonsPiece, relancerPiece } from "../commandes/fun.js";

/** Délai minimum entre deux usages d'une même commande, par membre. */
const DELAI_COMMANDES = 2_500;

export function installerRouteur(bot: Delphinabot): void {
  bot.on("interactionCreate", (interaction) => {
    void traiter(bot, interaction);
  });
}

async function traiter(bot: Delphinabot, interaction: Interaction): Promise<void> {
  try {
    if (interaction.isAutocomplete()) return await autocompletion(bot, interaction);
    if (interaction.isButton()) return await bouton(bot, interaction);
    if (interaction.isChatInputCommand()) return await commande(bot, interaction);
  } catch (erreurRevue) {
    journal.error(`Interaction non traitée : ${(erreurRevue as Error).message}`);
  }
}

async function commande(bot: Delphinabot, interaction: ChatInputCommandInteraction): Promise<void> {
  const element = bot.commandes.get(interaction.commandName);
  if (!element) {
    await interaction.reply({
      embeds: [erreur("Cette commande n'existe plus. Rechargez Discord, puis réessayez.")],
      ephemeral: true,
    });
    return;
  }

  // En message privé, seules les commandes marquées comme telles ont un sens.
  if (!interaction.inGuild() && !element.prive) {
    await interaction.reply({
      embeds: [erreur("Cette commande ne fonctionne que sur un serveur.")],
      ephemeral: true,
    });
    return;
  }

  if (!interaction.inGuild() || !interaction.guild || !interaction.member) {
    return;
  }

  const serveur = await lireReglages(interaction.guild.id);
  const membre = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!membre) {
    await interaction.reply({
      embeds: [erreur("Impossible de lire votre profil sur ce serveur.")],
      ephemeral: true,
    });
    return;
  }

  // --- Autorisation -------------------------------------------------------
  const niveau = await niveauDe(interaction.guild, membre, serveur, bot.configuration);
  if (!autorise(niveau, element.niveau)) {
    await interaction.reply({
      embeds: [
        erreur(
          `Cette commande est réservée à : ${element.niveau === "dj" ? "un rôle DJ" : element.niveau}.`,
        ),
      ],
      ephemeral: true,
    });
    return;
  }
  if (element.niveau === "dj" && !estDj(membre, serveur, bot.configuration)) {
    await interaction.reply({
      embeds: [
        erreur(
          "Seuls un rôle DJ et l'administration peuvent piloter la musique. Utilisez `/configurer roles dj` pour désigner qui l'est.",
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  // --- Temporisation ------------------------------------------------------
  const cle = `${interaction.commandName}:${interaction.user.id}`;
  if (!bot.temporisations.reserver(cle, DELAI_COMMANDES)) {
    const restant = Math.ceil(bot.temporisations.restant(cle) / 1000);
    await interaction.reply({
      embeds: [or(`Patientez encore ${restant} seconde(s) avant de réessayer.`)],
      ephemeral: true,
    });
    return;
  }

  // --- Exécution ----------------------------------------------------------
  try {
    const contexte: Contexte = { bot, interaction, serveur };
    await element.executer(contexte);
  } finally {
    // La temporisation est rendue même en cas d'échec : sans cela, un membre
    // qui provoke une erreur resterait bloqué.
    bot.temporisations.liberer(cle);
  }
}

async function autocompletion(
  bot: Delphinabot,
  interaction: AutocompleteInteraction,
): Promise<void> {
  const element = bot.commandes.get(interaction.commandName);
  if (!element?.autocompletion) {
    await interaction.respond([]).catch(() => undefined);
    return;
  }

  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.respond([]).catch(() => undefined);
    return;
  }

  const serveur = await lireReglages(interaction.guild.id);
  try {
    await element.autocompletion(interaction, serveur, bot);
  } catch (erreurRevue) {
    journal.error(`Autocomplétion /${element.nom} : ${(erreurRevue as Error).message}`);
    await interaction.respond([]).catch(() => undefined);
  }
}

async function bouton(bot: Delphinabot, interaction: ButtonInteraction): Promise<void> {
  if (interaction.customId === Boutons.deverrouiller) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ embeds: [erreur("Action impossible hors d'un serveur.")], ephemeral: true });
      return;
    }

    const serveur = await lireReglages(guild.id);
    const membre = await guild.members.fetch(interaction.user.id).catch(() => null);
    if (!membre) {
      await interaction.reply({ embeds: [erreur("Profil introuvable.")], ephemeral: true });
      return;
    }

    const niveau = await niveauDe(guild, membre, serveur, bot.configuration);
    if (!autorise(niveau, "admin")) {
      await interaction.reply({
        embeds: [erreur("Seul un membre de l'administration peut lever le verrou.")],
        ephemeral: true,
      });
      return;
    }

    const resultat = await deverrouiller(guild, interaction.user.id);
    await interaction.reply({
      embeds: [
        resultat.ok
          ? or("Serveur déverrouillé. Les arrivées reprennent normalement.")
          : erreur(resultat.raison ?? "Le serveur n'est pas verrouillé."),
      ],
      ephemeral: true,
    });
    // Le bouton a été traité : le message d'origine n'en a plus besoin.
    const message = interaction.message;
    if (message && "edit" in message) {
      await message.edit({ components: [] }).catch(() => undefined);
    }
    return;
  }

  if (interaction.customId === Boutons.piece) {
    const boutonRelance = boutonsPiece();
    await interaction.update({ embeds: [relancerPiece()], components: [boutonRelance] });
  }
}
