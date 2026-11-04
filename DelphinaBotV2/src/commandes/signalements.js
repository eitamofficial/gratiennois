/**
 * Signalements.
 *
 * Un membre signale un autre membre ; la modération traite le dossier et le
 * clôt avec une décision — « résolu » ou « rejeté ». Le numéro est propre au
 * serveur et croissant : c'est ce qui permet d'en parler dans le salon
 * (« le signalement 12 ») sans ambiguïté.
 *
 * Rien n'est automatisé ici : un signalement n'entraîne aucune sanction. C'est
 * une pièce versée au dossier, pas un jugement.
 */

import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { attention, information, or, succes } from "../lib/embres.js";
import { horodatage } from "../lib/duree.js";
import { ErreurUtilisateur } from "./erreurs.js";
import { journaliser } from "./moderation.js";
import { nomDe } from "./outils.js";

/** Salon où déposer l'avis : le journal, ou les alertes si elles existent. */
async function prevenir(interaction, contexte, embed) {
  const reglages = contexte.stockage.serveur(interaction.guildId);
  const salonId = reglages.alertes ?? reglages.journal;
  if (!salonId) return;

  const salon = await interaction.guild.channels.fetch(salonId).catch(() => null);
  if (salon?.isTextBased()) await salon.send({ embeds: [embed] }).catch(() => {});
}

const cmdSignaler = {
  nom: "signaler",
  categorie: "modération",
  resume: "Signale un membre à la modération.",
  detail: "Le signalement est numéroté ; la modération le clôt par `/resoudre-signalement`.",
  donnees: new SlashCommandBuilder()
    .setName("signaler")
    .setDescription("Signale un membre à la modération.")
    .addUserOption((option) => option.setName("membre").setDescription("Le membre signalé").setRequired(true))
    .addStringOption((option) =>
      option.setName("motif").setDescription("Ce qui est reproché, avec le plus de précision possible").setRequired(true).setMaxLength(600),
    ),
  async executer(interaction, contexte) {
    const cible = interaction.options.getUser("membre", true);
    const motif = interaction.options.getString("motif", true);

    if (cible.id === interaction.user.id) throw new ErreurUtilisateur("Se signaler soi-même ne mènerait à rien.");
    if (cible.bot) throw new ErreurUtilisateur("Les bots ne se signalent pas : parlez-en à l'administration.");

    const fiche = contexte.stockage.signaler(interaction.guildId, interaction.user.id, cible.id, motif);

    await prevenir(
      interaction,
      contexte,
      attention(
        `**Signalement n° ${fiche.numero}**\n**Signalé par :** <@${interaction.user.id}>\n**Membre visé :** <@${cible.id}>\n**Salon :** <#${interaction.channelId}>\n\n${motif}`,
        "Nouveau signalement",
      ),
    );

    await interaction.reply({
      embeds: [
        succes(
          `Votre signalement porte le numéro **${fiche.numero}**.\nLa modération le lira et le clôturera. Vous n'avez rien d'autre à faire.`,
          "Signalement enregistré",
        ),
      ],
      flags: 64,
    });
  },
};

const cmdSignalements = {
  nom: "signalements",
  categorie: "modération",
  resume: "Liste les signalements du serveur.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ModerateMembers,
  donnees: new SlashCommandBuilder()
    .setName("signalements")
    .setDescription("Liste les signalements.")
    .addStringOption((option) =>
      option.setName("statut").setDescription("Filtrer par état").addChoices(
        { name: "Ouverts", value: "ouvert" },
        { name: "Résolus", value: "resolu" },
        { name: "Rejetés", value: "rejete" },
        { name: "Tous", value: "tous" },
      ),
    ),
  async executer(interaction, contexte) {
    const statut = interaction.options.getString("statut") ?? "ouvert";
    const liste = contexte.stockage.signalements(
      interaction.guildId,
      statut === "tous" ? null : statut,
    );

    if (liste.length === 0) {
      await interaction.reply({
        embeds: [succes(`Aucun signalement ${statut === "tous" ? "" : `« ${statut} » `}enregistré.`, "Dossiers vides")],
        flags: 64,
      });
      return;
    }

    const lignes = liste.slice(0, 15).map(
      (element) =>
        `**n° ${element.numero}** — <@${element.cibleId}> *(${element.statut})*\n   signalé par <@${element.auteurId}> le ${horodatage(element.date)}\n   ${element.motif.slice(0, 200)}`,
    );

    await interaction.reply({
      embeds: [
        information(
          [`${liste.length} signalement(s) ${statut === "tous" ? "" : `« ${statut} » `}:`, "", ...lignes].join("\n"),
          "Dossiers de signalement",
        ),
      ],
      flags: 64,
    });
  },
};

const cmdResoudreSignalement = {
  nom: "resoudre-signalement",
  categorie: "modération",
  resume: "Clôt un signalement.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ModerateMembers,
  donnees: new SlashCommandBuilder()
    .setName("resoudre-signalement")
    .setDescription("Clôt un signalement.")
    .addIntegerOption((option) =>
      option.setName("numero").setDescription("Numéro du signalement").setRequired(true).setMinValue(1),
    )
    .addStringOption((option) =>
      option.setName("decision").setDescription("Décision rendue").addChoices(
        { name: "Résolu (fondé)", value: "resolu" },
        { name: "Rejeté (non fondé)", value: "rejete" },
      ),
    ),
  async executer(interaction, contexte) {
    const numero = interaction.options.getInteger("numero", true);
    const decision = interaction.options.getString("decision") ?? "resolu";

    const fiche = contexte.stockage.resoudreSignalement(
      interaction.guildId,
      numero,
      decision,
      interaction.user.id,
    );

    if (!fiche) throw new ErreurUtilisateur(`Aucun signalement n° ${numero} sur ce serveur.`);

    await interaction.reply({
      embeds: [
        succes(
          `Signalement **n° ${numero}** — ${decision === "resolu" ? "résolu" : "rejeté"} par <@${interaction.user.id}>.\n\n**Rappel :** <@${fiche.cibleId}> était visé, pour « ${fiche.motif.slice(0, 200)} ».`,
          "Dossier clos",
        ),
      ],
      flags: 64,
    });

    await journaliser(
      contexte,
      interaction,
      information(
        `**Signalement n° ${numero}** : ${decision}\n**Membre visé :** <@${fiche.cibleId}>\n**Par :** ${interaction.user.tag}`,
        "Signalement clos",
      ),
    );

    // L'auteur du signalement apprend la décision, sans avoir à la demander.
    const auteur = await interaction.guild.members.fetch(fiche.auteurId).catch(() => null);
    await auteur
      ?.send({
        embeds: [
          or(
            `Votre signalement **n° ${numero}** a été ${decision === "resolu" ? "retenu" : "rejeté"} par la modération.`,
            "Suite donnée à votre signalement",
          ),
        ],
      })
      .catch(() => {});
  },
};

export const COMMANDES_SIGNALEMENTS = [cmdSignaler, cmdSignalements, cmdResoudreSignalement];
