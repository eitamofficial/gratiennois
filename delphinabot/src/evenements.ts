/**
 * Événements.
 *
 * Les cinq moments où le bot réagit sans qu'on lui demande : connexion,
 * arrivée d'un membre, message, état vocal, et la ronde de fond qui lève les
 * sanctions expirées. Chacun tient dans une fonction, et toutes sont
 * raccordées ici.
 */

import { type GuildMember, type Message, type VoiceState } from "discord.js";
import type { Delphinabot } from "./client.js";
import { lireReglages } from "./db/serveur.js";
import { journal } from "./logger.js";
import { journaliser } from "./db/journal.js";
import { surArrivee } from "./modules/antiraid.js";
import { verifierMessage } from "./modules/protection.js";
import { or, succes } from "./lib/embres.js";
import { estSalonTextuel } from "./commandes/outils.js";
import { leverSanction, sanctionsExpirees, type Sanction } from "./db/sanctions.js";
import { horodatage } from "./lib/duree.js";

/** Raccorde tous les événements. À appeler une fois, au démarrage. */
export function installerEvenements(bot: Delphinabot): void {
  bot.once("ready", () => void pret(bot));
  bot.on("guildCreate", (guild) => void nouveauServeur(bot, guild.id));
  bot.on("guildMemberAdd", (membre) => void arrivee(bot, membre));
  bot.on("messageCreate", (message) => void surMessage(bot, message));
  bot.on("voiceStateUpdate", (avant, apres) => void surVoix(bot, avant, apres));

  // Ronde de fond : toutes les minutes, on lève ce qui est expiré et on purge
  // les temporisations mortes. Une minute suffit : un délai de sourdine se
  // mesure en heures, pas en secondes.
  const ronde = setInterval(() => void rond(bot), 60_000);
  // `unref` empêche ce minuteur de maintenir le processus en vie à l'arrêt.
  ronde.unref();
}

/** Bot connecté. */
async function pret(bot: Delphinabot): Promise<void> {
  journal.info(`DelphinaBot connecté : ${bot.commandes.size} commandes, ${bot.guilds.cache.size} serveur(s).`);

  if (bot.user) {
    await bot.user.setPresence({
      status: "online",
      activities: [{ name: "le IIIe Delphinat", type: 3 }],
    });
  }

  // Prépare les réglages de tous les serveurs connus : c'est aussi le moment
  // où le bot découvre les serveurs où l'administration ne l'a jamais réglé.
  for (const guild of bot.guilds.cache.values()) {
    try {
      await lireReglages(guild.id);
    } catch (erreurRevue) {
      journal.error(`Réglages illisibles pour ${guild.id} : ${(erreurRevue as Error).message}`);
    }
  }

  await journaliser({
    serveurId: "",
    type: "connexion",
    utilisateurId: null,
    cibleId: null,
    details: { serveurs: bot.guilds.cache.size, version: process.version },
  }).catch(() => undefined);
}

/** Le bot vient d'être invité sur un serveur. */
async function nouveauServeur(bot: Delphinabot, guildId: string): Promise<void> {
  const reglages = await lireReglages(guildId).catch(() => null);
  if (!reglages) return;

  const salon = guildId
    ? bot.guilds.cache.get(guildId)?.systemChannel
    : null;
  if (salon && estSalonTextuel(salon)) {
    await salon
      .send({
        embeds: [
          or(
            [
              "DelphinaBot est arrivé. Avant toute chose : **`/configurer`**.",
              "Commencez par les salons d'alerte et le rôle de modération : sans eux, le bot ne peut prévenir personne.",
              "Un serveur bien réglé tient en cinq commandes : `/aide` liste tout le reste.",
            ].join("\n"),
            "Bienvenue — configuration requise",
          ),
        ],
      })
      .catch(() => undefined);
  }
}

/** Arrivée d'un membre. */
async function arrivee(bot: Delphinabot, membre: GuildMember): Promise<void> {
  if (membre.user.bot) return;

  const reglages = await lireReglages(membre.guild.id).catch(() => null);
  if (!reglages) return;

  const verdict = await surArrivee(bot, membre, reglages);

  if (verdict.verrouillage) {
    journal.warn(`Raid probable sur ${membre.guild.id} : ${verdict.arrivees} arrivées. Serveur verrouillé.`);
  }

  if (reglages.salonBienvenue) {
    const salon = membre.guild.channels.cache.get(reglages.salonBienvenue);
    if (salon && estSalonTextuel(salon)) {
      const ageJours = Math.round((Date.now() - membre.user.createdTimestamp) / 86_400_000);
      const embed = succes(
        [
          `Bienvenue **${membre.user.username}** sur ${membre.guild.name}.`,
          `Compte créé il y a ${ageJours} jour(s).`,
          verdict.quarantaine
            ? "Le serveur est verrouillé : votre accès sera validé par l'administration."
            : "Lisez le règlement, puis présentez-vous.",
        ].join("\n"),
      );
      await salon.send({ embeds: [embed] }).catch(() => undefined);
    }
  }

  await journaliser({
    serveurId: membre.guild.id,
    type: "arrivee",
    utilisateurId: membre.id,
    cibleId: null,
    details: { arrivees: verdict.arrivees, quarantaine: verdict.quarantaine },
  }).catch(() => undefined);
}

/** Message envoyé. */
async function surMessage(bot: Delphinabot, message: Message): Promise<void> {
  if (message.author.bot || !message.inGuild() || !message.guild) return;

  const reglages = await lireReglages(message.guild.id).catch(() => null);
  if (!reglages) return;

  // Commande textuelle d'aide : le seul cas où le bot parle sans qu'on le
  // demande. Tout le reste passe par les commandes Discord, qui sont
  // découvrables et vérifiables.
  const prefixe = bot.configuration.prefixe;
  if (message.content.startsWith(`${prefixe}aide`)) {
    const commandeAide = bot.commandes.get("aide");
    if (commandeAide) {
      await message
        .reply({
          embeds: [
            or(
              [
                "Les commandes de DelphinaBot sont des commandes Discord : tapez `/` dans la zone de texte pour les voir.",
                "`/aide` liste tout, `/aide nom` explique une commande en détail.",
                "Les commandes à préfixe restent réservées à l'administration.",
              ].join("\n"),
            ),
          ],
        })
        .catch(() => undefined);
    }
    return;
  }

  try {
    await verifierMessage(bot, message, reglages);
  } catch (erreurRevue) {
    journal.error(`Protection : ${(erreurRevue as Error).message}`);
  }
}

/**
 * Départ ou arrivée dans un salon vocal.
 *
 * Un bot seul dans un salon vocal occupe une connexion et empêche le client de
 * dormir. On le fait sortir trente secondes après que le dernier humain est
 * parti — le délai évite de le faire sortir entre deux phrases.
 */
function surVoix(bot: Delphinabot, avant: VoiceState, apres: VoiceState): void {
  const guildId = apres.guild?.id;
  if (!guildId) return;

  const salle = bot.lecteur.obtenir(guildId);
  if (!salle) return;

  const salonDuBot = salle.connexion.joinConfig.channelId;
  const salonApres = apres.channel;
  if (!salonApres || salonApres.id !== salonDuBot) return;
  if (avant.channel?.id === salonDuBot) return;

  const presents = salonApres.members.filter((membre) => !membre.user.bot).size;
  if (presents > 0) return;

  setTimeout(() => {
    const encore = salonApres.members.filter((membre) => !membre.user.bot).size;
    if (encore === 0) bot.lecteur.quitter(guildId);
  }, 30_000);
}

/** Ronde de fond. */
async function rond(bot: Delphinabot): Promise<void> {
  bot.temporisations.purger();

  const expirant = await sanctionsExpirees().catch(() => [] as Sanction[]);
  for (const sanction of expirant) {
    if (sanction.type !== "delai") continue;
    const guild = bot.guilds.cache.get(sanction.serveurId);
    if (!guild) continue;
    const membre = await guild.members.fetch(sanction.utilisateurId).catch(() => null);
    if (membre?.isCommunicationDisabled()) {
      await membre.timeout(null, "Fin de la sanction de DelphinaBot").catch(() => undefined);
    }
    const levee = await leverSanction(sanction.id, bot.user?.id ?? "delphinabot").catch(() => undefined);
    void levee;
    await journaliser({
      serveurId: sanction.serveurId,
      type: "sanction-expiree",
      utilisateurId: null,
      cibleId: sanction.utilisateurId,
      details: { type: sanction.type, fin: horodatage(Date.now()) },
    }).catch(() => undefined);
  }
}
