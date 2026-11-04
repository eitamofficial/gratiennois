/**
 * Accueil des membres.
 *
 * `/bienvenue` présente les quatre étapes de l'accueil — salon d'arrivée,
 * message, rôle automatique, message de départ — et permet de les régler.
 * `/simuler` les relit tels qu'un nouveau membre les verrait : un message
 * d'accueil se règle en le voyant, pas en l'imaginant.
 */

import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { attention, information, or, succes } from "../lib/embres.js";
import { remplir } from "../lib/texte.js";
import { ErreurUtilisateur } from "./erreurs.js";
import { mentionnerSalon } from "./outils.js";

const MESSAGE_ARRIVEE = "Bienvenue {membre} sur **{serveur}** ! Nous sommes désormais {nombre}.";
const MESSAGE_DEPART = "{membre} a quitté le serveur. Il reste {nombre} membres.";

/** Rend un modèle avec des valeurs d'exemple, pour la simulation. */
function rendre(modele, interaction) {
  return remplir(modele, {
    membre: `<@${interaction.user.id}>`,
    serveur: interaction.guild.name,
    nombre: String(interaction.guild.memberCount),
    nom: interaction.user.username,
  });
}

const cmdBienvenue = {
  nom: "bienvenue",
  categorie: "configuration",
  resume: "Règle l'accueil des nouveaux membres.",
  detail:
    "Quatre étapes : salon d'arrivée, message d'accueil, rôle automatique, message de départ. Les variables `{membre}`, `{serveur}`, `{nombre}` et `{nom}` sont remplacées à l'envoi.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ManageGuild,
  donnees: new SlashCommandBuilder()
    .setName("bienvenue")
    .setDescription("Règle l'accueil des nouveaux membres.")
    .addChannelOption((option) =>
      option
        .setName("salon")
        .setDescription("Salon des arrivées")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Message d'accueil (variables {membre}, {serveur}, {nombre})")
        .setMaxLength(1500),
    )
    .addRoleOption((option) => option.setName("role").setDescription("Rôle donné à l'arrivée").setRequired(false)),
  async executer(interaction, contexte) {
    const salon = interaction.options.getChannel("salon");
    const message = interaction.options.getString("message");
    const role = interaction.options.getRole("role");

    if (salon || message || role) {
      const reglages = contexte.stockage.serveur(interaction.guildId);
      contexte.stockage.regler(interaction.guildId, {
        bienvenue: { salon: salon?.id ?? reglages.bienvenue.salon, message: message ?? reglages.bienvenue.message },
        autorole: role?.id ?? reglages.autorole,
      });

      if (role && role.position >= interaction.guild.members.me.roles.highest.position) {
        throw new ErreurUtilisateur(
          `Mon rôle est plus bas que **${role.name}** : je ne pourrai pas l'attribuer. Remontez mon rôle, puis réessayez.`,
        );
      }
    }

    const reglages = contexte.stockage.serveur(interaction.guildId);
    const etapes = [
      `**1. Salon d'arrivée :** ${mentionnerSalon(reglages.bienvenue.salon ? { id: reglages.bienvenue.salon } : null)}`,
      `**2. Message d'accueil :** ${reglages.bienvenue.message ? "personnalisé" : "par défaut (voir plus bas)"}`,
      `**3. Rôle à l'arrivée :** ${reglages.autorole ? `<@&${reglages.autorole}>` : "aucun"}`,
      `**4. Message de départ :** ${mentionnerSalon(reglages.depart.salon ? { id: reglages.depart.salon } : null)}`,
      "",
      "**Message d'accueil :**",
      rendre(reglages.bienvenue.message ?? MESSAGE_ARRIVEE, interaction),
      "",
      "**Message de départ :**",
      rendre(reglages.depart.message ?? MESSAGE_DEPART, interaction),
    ];

    await interaction.reply({
      embeds: [information(etapes.join("\n"), "Accueil")],
      flags: 64,
    });
  },
};

const cmdSimuler = {
  nom: "simuler",
  categorie: "configuration",
  resume: "Affiche les messages d'accueil tels quels.",
  detail: "Utile avant de valider un message : on voit exactement ce que le bot enverra.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ManageGuild,
  donnees: new SlashCommandBuilder()
    .setName("simuler")
    .setDescription("Relit les messages d'accueil et de départ."),
  async executer(interaction, contexte) {
    const reglages = contexte.stockage.serveur(interaction.guildId);

    const blocs = [
      or(rendre(reglages.bienvenue.message ?? MESSAGE_ARRIVEE, interaction), "Simulation — arrivée"),
      or(rendre(reglages.depart.message ?? MESSAGE_DEPART, interaction), "Simulation — départ"),
    ];

    if (!reglages.bienvenue.salon) {
      await interaction.reply({
        embeds: [
          attention(
            "Aucun salon d'arrivée n'est configuré : ces messages ne seraient envoyés nulle part. Réglez-le avec `/bienvenue salon:…`.",
            "Simulation incomplète",
          ),
          ...blocs,
        ],
        flags: 64,
      });
      return;
    }

    await interaction.reply({
      embeds: [
        succes(`Ces messages partiraient dans <#${reglages.bienvenue.salon}>.`, "Simulation"),
        ...blocs,
      ],
      flags: 64,
    });
  },
};

export const COMMANDES_ACCUEIL = [cmdBienvenue, cmdSimuler];
