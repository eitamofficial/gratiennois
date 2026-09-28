/**
 * Commandes de musique.
 *
 * Toutes exigent que le bot soit **dans le salon vocal où vous êtes**. Le
 * membre n'a donc jamais à répéter où il est : la commande se déduit de sa
 * position. C'est le seul moyen d'éviter l'erreur la plus fréquente en
 * matière de bot musical — jouer dans le mauvais salon.
 *
 * Le rôle de DJ n'est pas un privilège de quelques initiés : c'est une
 * garde-fou. `/configurer roles dj` désigne qui peut piloter la musique.
 */

import { EmbedBuilder, type ChatInputCommandInteraction, type VoiceChannel } from "discord.js";
import type { Commande } from "../core/types.js";
import { commande, confirmation, executer, repondre } from "./outils.js";
import { attention, erreur, or, succes } from "../lib/embres.js";
import { LecteurAudio } from "../modules/musique/lecteur.js";
import { journaliser } from "../db/journal.js";

/** Salon vocal où se trouve l'auteur, ou message d'explication. */
async function salonDeLAuthor(interaction: ChatInputCommandInteraction): Promise<{
  salon: VoiceChannel | null;
  message: string | null;
}> {
  const guild = interaction.guild;
  if (!guild) {
    return { salon: null, message: "Cette commande ne fonctionne pas en message privé." };
  }

  // La fiche de membre de l'interaction peut être une donnée brute, sans
  // l'état vocal : on relit donc la fiche complète, que le bot garde en cache.
  const membre = await guild.members.fetch(interaction.user.id).catch(() => null);
  const salon = membre?.voice?.channel;
  if (!salon || !salon.isVoiceBased()) {
    return { salon: null, message: "Rejoignez d'abord un salon vocal." };
  }
  return { salon: salon as VoiceChannel, message: null };
}

const cmdJouer: Commande = {
  nom: "jouer",
  categorie: "musique",
  niveau: "dj",
  usage: "/jouer <recherche ou lien> [nombre]",
  resume: "Joue un morceau dans votre salon vocal.",
  donnees: commande("jouer", "Joue un morceau dans votre salon vocal.")
    .addStringOption((option) =>
      option
        .setName("recherche")
        .setDescription("Titre, artiste ou lien YouTube.")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("nombre")
        .setDescription("Nombre de morceaux à ajouter (1 à 10).")
        .setMinValue(1)
        .setMaxValue(10),
    ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      if (!serveur.musiqueAutorisee) {
        return repondre(interaction, attention("La musique est désactivée sur ce serveur."));
      }
      const { salon, message } = await salonDeLAuthor(interaction);
      if (!salon || message) return repondre(interaction, erreur(message ?? "Salon introuvable."));

      const cible = interaction.options.getString("recherche", true);
      const nombre = interaction.options.getInteger("nombre") ?? 1;

      await interaction.deferReply();
      const rejoint = await bot.lecteur.rejoindre(salon.guildId, salon.id);
      if (!rejoint.ok) return repondre(interaction, erreur(rejoint.raison ?? "Connexion impossible."));

      try {
        const pistes = await bot.lecteur.ajouterResultats(salon.guildId, cible, interaction.user.id, nombre);
        if (pistes.length === 0) return repondre(interaction, erreur("Aucun résultat."));

        const embed = new EmbedBuilder()
          .setColor(0xd4a63a)
          .setTitle(pistes.length === 1 ? pistes[0].titre : `${pistes.length} morceaux ajoutés`)
          .setDescription(
            pistes
              .map(
                (piste, index) =>
                  `${pistes.length > 1 ? `${index + 1}. ` : ""}**${piste.titre}** — ${piste.auteur}\n${piste.page}`,
              )
              .join("\n"),
          )
          .setFooter({ text: `Demandé par ${interaction.user.username}` });
        if (pistes[0]?.vignette) embed.setThumbnail(pistes[0].vignette);

        await journaliser({
          serveurId: salon.guildId,
          type: "musique",
          utilisateurId: interaction.user.id,
          cibleId: null,
          details: { piste: pistes[0]?.titre, salon: salon.id },
        });

        await interaction.editReply({ embeds: [embed] });
      } catch (erreurReçue) {
        await repondre(interaction, LecteurAudio.messageErreur(erreurReçue));
      }
    });
  },
};

const cmdPause: Commande = {
  nom: "pause",
  categorie: "musique",
  niveau: "dj",
  usage: "/pause",
  resume: "Met la lecture en pause.",
  donnees: commande("pause", "Met la lecture en pause."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      if (!bot.lecteur.pause(interaction.guildId ?? "")) {
        return repondre(interaction, attention("Aucune musique en cours, ou lecture déjà en pause."));
      }
      await confirmation({ bot, interaction, serveur }, "Lecture en pause.");
    });
  },
};

const cmdReprendre: Commande = {
  nom: "reprendre",
  categorie: "musique",
  niveau: "dj",
  usage: "/reprendre",
  resume: "Reprend la lecture après une pause.",
  donnees: commande("reprendre", "Reprend la lecture."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      if (!bot.lecteur.reprendre(interaction.guildId ?? "")) {
        return repondre(interaction, attention("La lecture n'était pas en pause."));
      }
      await confirmation({ bot, interaction, serveur }, "Lecture reprise.");
    });
  },
};

const cmdSuivant: Commande = {
  nom: "suivant",
  categorie: "musique",
  niveau: "dj",
  usage: "/suivant",
  resume: "Passe au morceau suivant.",
  donnees: commande("suivant", "Passe au morceau suivant."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const suivante = await bot.lecteur.suivant(interaction.guildId ?? "");
      if (!suivante) {
        return confirmation({ bot, interaction, serveur }, "La file d'attente est vide : le bot a quitté le salon.");
      }
      await repondre(
        interaction,
        or(`**${suivante.piste.titre}** — ${suivante.piste.auteur}\n${suivante.piste.page}`),
      );
    });
  },
};

const cmdArreter: Commande = {
  nom: "arreter",
  categorie: "musique",
  niveau: "dj",
  usage: "/arreter",
  resume: "Arrête la musique et vide la file.",
  donnees: commande("arreter", "Arrête la musique et quitte le salon."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      bot.lecteur.quitter(interaction.guildId ?? "");
      await confirmation({ bot, interaction, serveur }, " Musique arrêtée, file vidée.");
    });
  },
};

const cmdFile: Commande = {
  nom: "file",
  categorie: "musique",
  niveau: "membre",
  usage: "/file",
  resume: "Affiche la file d'attente en cours.",
  donnees: commande("file", "Affiche la file d'attente."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const serveurId = interaction.guildId ?? "";
      const resume = bot.lecteur.resume(serveurId);
      const attente = bot.lecteur.file(serveurId);

      await repondre(
        interaction,
        or(
          [
            resume,
            "",
            attente.length > 0
              ? `**À suivre (${attente.length})**\n${attente.join("\n")}`
              : "La file d'attente est vide.",
          ].join("\n"),
          "File d'attente",
        ),
      );
    });
  },
};

const cmdRetirer: Commande = {
  nom: "retirer",
  categorie: "musique",
  niveau: "dj",
  usage: "/retirer <position>",
  resume: "Retire un morceau de la file d'attente.",
  donnees: commande("retirer", "Retire un morceau de la file.").addIntegerOption((option) =>
    option
      .setName("position")
      .setDescription("Numéro du morceau dans la file, à partir de 1.")
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(true),
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const position = interaction.options.getInteger("position", true);
      const retire = bot.lecteur.retirer(interaction.guildId ?? "", position - 1);
      if (!retire) {
        return repondre(interaction, erreur("Aucune piste à cette position."));
      }
      await confirmation(
        { bot, interaction, serveur },
        `Retiré de la file : **${retire.piste.titre}** — ${retire.piste.auteur}.`,
      );
    });
  },
};

const cmdDeplacer: Commande = {
  nom: "deplacer",
  categorie: "musique",
  niveau: "dj",
  usage: "/deplacer <position>",
  resume: "Passe un morceau de la file en première position.",
  donnees: commande("deplacer", "Passe un morceau de la file en tête.").addIntegerOption((option) =>
    option
      .setName("position")
      .setDescription("Numéro du morceau dans la file, à partir de 1.")
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(true),
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const position = interaction.options.getInteger("position", true);
      const deplace = bot.lecteur.deplacer(interaction.guildId ?? "", position - 1);
      if (!deplace) {
        return repondre(interaction, erreur("Aucune piste à cette position."));
      }
      await confirmation(
        { bot, interaction, serveur },
        `Passé en tête de file : **${deplace.piste.titre}**.`,
      );
    });
  },
};

const cmdVolume: Commande = {
  nom: "volume",
  categorie: "musique",
  niveau: "dj",
  usage: "/volume <0-100>",
  resume: "Règle le volume de la musique.",
  donnees: commande("volume", "Règle le volume de la musique.").addIntegerOption((option) =>
    option
      .setName("niveau")
      .setDescription("Volume, de 0 à 100.")
      .setMinValue(0)
      .setMaxValue(100)
      .setRequired(true),
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const niveau = interaction.options.getInteger("niveau", true);
      const applique = bot.lecteur.volume(interaction.guildId ?? "", niveau);
      if (applique < 0) {
        return repondre(interaction, erreur("Aucune musique en cours : rejoignez d'abord un salon vocal."));
      }
      await confirmation({ bot, interaction, serveur }, `Volume réglé à ${applique} %.`);
    });
  },
};

const cmdBoucle: Commande = {
  nom: "boucle",
  categorie: "musique",
  niveau: "dj",
  usage: "/boucle [aucune|piste|file]",
  resume: "Active la répétition du morceau ou de la file entière.",
  donnees: commande("boucle", "Règle la répétition.").addStringOption((option) =>
    option
      .setName("mode")
      .setDescription("Mode de répétition")
      .addChoices(
        { name: "Aucune", value: "aucune" },
        { name: "Répéter le morceau", value: "piste" },
        { name: "Répéter la file", value: "file" },
      ),
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const salle = bot.lecteur.obtenir(interaction.guildId ?? "");
      if (!salle) {
        return repondre(interaction, erreur("Aucune musique en cours."));
      }
      const mode = (interaction.options.getString("mode") ?? "aucune") as "aucune" | "piste" | "file";
      salle.boucle = mode;
      await confirmation(
        { bot, interaction, serveur },
        mode === "aucune" ? "Répétition désactivée." : `Répétition activée : ${mode}.`,
      );
    });
  },
};

const cmdNowPlaying: Commande = {
  nom: "en-cours",
  categorie: "musique",
  niveau: "membre",
  usage: "/en-cours",
  resume: "Affiche le morceau en cours de lecture.",
  donnees: commande("en-cours", "Morceau en cours de lecture."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      await repondre(
        interaction,
        succes(bot.lecteur.resume(interaction.guildId ?? ""), "En cours de lecture"),
      );
    });
  },
};

export const COMMANDES_MUSIQUE: Commande[] = [
  cmdJouer,
  cmdPause,
  cmdReprendre,
  cmdSuivant,
  cmdArreter,
  cmdFile,
  cmdRetirer,
  cmdDeplacer,
  cmdVolume,
  cmdBoucle,
  cmdNowPlaying,
];
