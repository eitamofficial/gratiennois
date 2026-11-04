/**
 * Configuration du serveur.
 *
 * Une seule commande, `/configurer`, et des sous-commandes : c'est le point
 * d'entrée unique des réglages. Tout ce qui se règle vit dans le stockage du
 * bot, jamais dans le code, et `/configurer voir` montre toujours l'état réel
 * — pas ce que le bot croit avoir enregistré.
 */

import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { attention, information, or, succes } from "../lib/embres.js";
import { mentionnerSalon } from "./outils.js";

/** Présente les réglages d'un serveur sous forme lisible. */
function decrire(reglages, guild) {
  const nomSalon = (identifiant) => {
    if (!identifiant) return "non configuré";
    const salon = guild.channels.cache.get(identifiant);
    return salon ? `<#${identifiant}>` : `salon supprimé (\`${identifiant}\`)`;
  };
  const nomRole = (identifiant) => {
    if (!identifiant) return "aucun";
    const role = guild.roles.cache.get(identifiant);
    return role ? `<@&${identifiant}>` : `rôle supprimé (\`${identifiant}\`)`;
  };

  return [
    `**Salon de journal :** ${nomSalon(reglages.journal)}`,
    `**Salon d'alertes :** ${nomSalon(reglages.alertes)}`,
    `**Bienvenue :** ${nomSalon(reglages.bienvenue.salon)}${reglages.bienvenue.message ? " (message personnalisé)" : ""}`,
    `**Départs :** ${nomSalon(reglages.depart.salon)}${reglages.depart.message ? " (message personnalisé)" : ""}`,
    `**Rôle automatique :** ${nomRole(reglages.autorole)}`,
    `**Rôle de sourdine :** ${nomRole(reglages.roleSilence)}`,
    `**Rôle de vérification :** ${nomRole(reglages.roleVerifie)}`,
    `**Niveaux :** ${reglages.niveaux.actif ? "activés" : "désactivés"} · annonce : ${nomSalon(reglages.niveaux.annonce)}`,
    `**Récompenses de niveau :** ${
      reglages.niveaux.recompenses.length > 0
        ? reglages.niveaux.recompenses
            .sort((a, b) => a.niveau - b.niveau)
            .map((element) => `niveau ${element.niveau} → ${nomRole(element.roleId)}`)
            .join(", ")
        : "aucune"
    }`,
  ].join("\n");
}

const cmdConfigurer = {
  nom: "configurer",
  categorie: "configuration",
  resume: "Règle le bot pour ce serveur.",
  detail:
    "Sous-commandes : `voir`, `journal`, `alertes`, `bienvenue`, `depart`, `autorole`, `niveaux`, `recompense`, `silence`, `verifie`. Rien n'est écrit dans le code : ces réglages vivent dans `data/delphinabot.json`.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ManageGuild,
  donnees: new SlashCommandBuilder()
    .setName("configurer")
    .setDescription("Règle le bot pour ce serveur.")
    .addSubcommand((sous) => sous.setName("voir").setDescription("Affiche tous les réglages actuels"))
    .addSubcommand((sous) =>
      sous
        .setName("journal")
        .setDescription("Salon où sont journalisées les sanctions et les rattachements")
        .addChannelOption((option) =>
          option
            .setName("salon")
            .setDescription("Salon de journal (laisser vide pour désactiver)")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false),
        )
        .addBooleanOption((option) =>
          option.setName("desactiver").setDescription("Désactiver le journal").setRequired(false),
        ),
    )
    .addSubcommand((sous) =>
      sous
        .setName("bienvenue")
        .setDescription("Message d'arrivée des nouveaux membres")
        .addChannelOption((option) =>
          option
            .setName("salon")
            .setDescription("Salon de bienvenue")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Texte d'accueil — {membre}, {serveur}, {nombre} sont remplacés")
            .setMaxLength(1500),
        ),
    )
    .addSubcommand((sous) =>
      sous
        .setName("depart")
        .setDescription("Message de départ des membres")
        .addChannelOption((option) =>
          option
            .setName("salon")
            .setDescription("Salon des départs")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Texte de départ — {membre}, {serveur}, {nombre} sont remplacés")
            .setMaxLength(1500),
        ),
    )
    .addSubcommand((sous) =>
      sous
        .setName("alertes")
        .setDescription("Salon où le bot dépose ses alertes de modération")
        .addChannelOption((option) =>
          option
            .setName("salon")
            .setDescription("Salon des alertes (laisser vide pour désactiver)")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false),
        ),
    )
    .addSubcommand((sous) =>
      sous
        .setName("silence")
        .setDescription("Rôle attribué par la sourdine")
        .addRoleOption((option) => option.setName("role").setDescription("Rôle de sourdine").setRequired(false)),
    )
    .addSubcommand((sous) =>
      sous
        .setName("verifie")
        .setDescription("Rôle attribué à l'achat de « Membre vérifié »")
        .addRoleOption((option) => option.setName("role").setDescription("Rôle de vérification").setRequired(false)),
    )
    .addSubcommand((sous) =>
      sous
        .setName("autorole")
        .setDescription("Rôle donné automatiquement aux nouveaux membres")
        .addRoleOption((option) => option.setName("role").setDescription("Rôle à donner").setRequired(false))
        .addBooleanOption((option) =>
          option.setName("desactiver").setDescription("Ne plus donner de rôle automatique").setRequired(false),
        ),
    )
    .addSubcommand((sous) =>
      sous
        .setName("niveaux")
        .setDescription("Active ou désactive l'expérience, et choisit le salon des annonces")
        .addBooleanOption((option) =>
          option.setName("activer").setDescription("Activer le gain d'expérience").setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("annonces")
            .setDescription("Salon des passages de niveau")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false),
        ),
    )
    .addSubcommand((sous) =>
      sous
        .setName("recompense")
        .setDescription("Rôle donné à partir d'un certain niveau")
        .addIntegerOption((option) =>
          option.setName("niveau").setDescription("Niveau déclencheur").setRequired(true).setMinValue(1).setMaxValue(500),
        )
        .addRoleOption((option) => option.setName("role").setDescription("Rôle à attribuer").setRequired(true))
        .addBooleanOption((option) =>
          option.setName("retirer").setDescription("Retirer cette récompense").setRequired(false),
        ),
    ),
  async executer(interaction, contexte) {
    const sous = interaction.options.getSubcommand();
    const serveurId = interaction.guildId;
    const reglages = contexte.stockage.serveur(serveurId);

    if (sous === "voir") {
      return interaction.reply({
        embeds: [
          information(decrire(reglages, interaction.guild), `Configuration de ${interaction.guild.name}`),
        ],
        flags: 64,
      });
    }

    if (sous === "journal") {
      const desactiver = interaction.options.getBoolean("desactiver") ?? false;
      const salon = interaction.options.getChannel("salon");
      if (!desactiver && !salon) {
        return interaction.reply({
          embeds: [attention("Choisissez un salon, ou utilisez `desactiver: true`.", "Rien à changer")],
          flags: 64,
        });
      }
      contexte.stockage.regler(serveurId, { journal: desactiver ? null : salon.id });
      return interaction.reply({
        embeds: [
          succes(
            desactiver ? "Le journal est désactivé." : `Le journal est désormais tenu dans <#${salon.id}>.`,
            "Journal",
          ),
        ],
        flags: 64,
      });
    }

    if (sous === "bienvenue" || sous === "depart") {
      const salon = interaction.options.getChannel("salon", true);
      const message = interaction.options.getString("message");
      const actuel = reglages[sous];
      contexte.stockage.regler(serveurId, {
        [sous]: { salon: salon.id, message: message ?? actuel.message },
      });
      return interaction.reply({
        embeds: [
          succes(
            `Les ${sous === "bienvenue" ? "arrivées" : "départs"} seront annoncés dans <#${salon.id}>.${
              message ? `\n\n**Message :** ${message}` : ""
            }`,
            sous === "bienvenue" ? "Bienvenue" : "Départs",
          ),
        ],
        flags: 64,
      });
    }

    if (sous === "alertes") {
      const salon = interaction.options.getChannel("salon");
      contexte.stockage.regler(serveurId, { alertes: salon ? salon.id : null });
      return interaction.reply({
        embeds: [
          succes(
            salon
              ? `Les alertes de modération seront déposées dans <#${salon.id}>.`
              : "Les alertes de modération ne seront plus déposées dans un salon.",
            "Alertes",
          ),
        ],
        flags: 64,
      });
    }

    if (sous === "silence" || sous === "verifie") {
      const role = interaction.options.getRole("role");
      const champ = sous === "silence" ? "roleSilence" : "roleVerifie";

      if (role && role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({
          embeds: [
            attention(
              `Mon rôle (**${interaction.guild.members.me.roles.highest.name}**) est plus bas que **${role.name}** : je ne pourrai pas l'attribuer.`,
              "Rôle inattribuable",
            ),
          ],
          flags: 64,
        });
      }

      contexte.stockage.regler(serveurId, { [champ]: role ? role.id : null });
      return interaction.reply({
        embeds: [
          succes(
            role
              ? `<@&${role.id}> est désormais le rôle utilisé par ${sous === "silence" ? "la sourdine" : "la vérification"}.`
              : `Le rôle de ${sous === "silence" ? "sourdine" : "vérification"} est retiré de la configuration.`,
            sous === "silence" ? "Sourdine" : "Vérification",
          ),
        ],
        flags: 64,
      });
    }

    if (sous === "autorole") {
      const desactiver = interaction.options.getBoolean("desactiver") ?? false;
      const role = interaction.options.getRole("role");
      if (!desactiver && !role) {
        return interaction.reply({
          embeds: [attention("Choisissez un rôle, ou utilisez `desactiver: true`.", "Rien à changer")],
          flags: 64,
        });
      }

      if (!desactiver) {
        const moi = interaction.guild.members.me;
        if (role.position >= moi.roles.highest.position) {
          return interaction.reply({
            embeds: [
              attention(
                `Mon rôle (**${moi.roles.highest.name}**) est plus bas que **${role.name}** : je ne pourrai pas l'attribuer. Remontez mon rôle.`,
                "Rôle inattribuable",
              ),
            ],
            flags: 64,
          });
        }
      }

      contexte.stockage.regler(serveurId, { autorole: desactiver ? null : role.id });
      return interaction.reply({
        embeds: [
          succes(desactiver ? "Aucun rôle ne sera plus donné automatiquement." : `<@&${role.id}> sera donné à chaque arrivée.`, "Rôle automatique"),
        ],
        flags: 64,
      });
    }

    if (sous === "niveaux") {
      const activer = interaction.options.getBoolean("activer", true);
      const annonces = interaction.options.getChannel("annonces");
      contexte.stockage.regler(serveurId, {
        niveaux: {
          ...reglages.niveaux,
          actif: activer,
          annonce: annonces ? annonces.id : reglages.niveaux.annonce,
        },
      });
      return interaction.reply({
        embeds: [
          succes(
            `L'expérience est ${activer ? "activée" : "désactivée"}.${
              annonces ? ` Les passages de niveau seront annoncés dans <#${annonces.id}>.` : ""
            }`,
            "Niveaux",
          ),
        ],
        flags: 64,
      });
    }

    // recompense
    const niveau = interaction.options.getInteger("niveau", true);
    const role = interaction.options.getRole("role", true);
    const retirer = interaction.options.getBoolean("retirer") ?? false;

    const recompenses = reglages.niveaux.recompenses.filter((element) => element.niveau !== niveau);
    if (!retirer) recompenses.push({ niveau, roleId: role.id });

    contexte.stockage.regler(serveurId, { niveaux: { ...reglages.niveaux, recompenses } });

    return interaction.reply({
      embeds: [
        succes(
          retirer
            ? `La récompense du niveau ${niveau} a été retirée.`
            : `Le niveau ${niveau} donnera désormais <@&${role.id}>.`,
          "Récompense de niveau",
        ),
      ],
      flags: 64,
    });
  },
};

export const COMMANDES_CONFIGURATION = [cmdConfigurer];
