/**
 * Niveaux.
 *
 * L'expérience se gagne en parlant (voir `evenements.js`), et se consulte ici.
 * La progression est toujours affichée avec le chiffre exact *et* une barre :
 * le chiffre sert à comprendre, la barre à voir d'un coup d'œil.
 */

import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { attention, champs, information, succes } from "../lib/embres.js";
import { barre, niveauPourXp, progression } from "../niveaux.js";
import { ErreurUtilisateur } from "./erreurs.js";
import { nomDe } from "./outils.js";

const cmdNiveau = {
  nom: "niveau",
  categorie: "niveaux",
  resume: "Affiche le niveau et l'expérience d'un membre.",
  donnees: new SlashCommandBuilder()
    .setName("niveau")
    .setDescription("Affiche votre niveau, ou celui d'un autre membre.")
    .addUserOption((option) =>
      option.setName("membre").setDescription("Le membre concerné (vous par défaut)").setRequired(false),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply();
    const membre = interaction.options.getMember("membre") ?? interaction.member;

    const fiche = contexte.stockage.membre(interaction.guildId, membre.id);
    const palier = contexte.configuration.niveaux.palier;
    const etat = progression(fiche.xp, palier);
    const rang = contexte.stockage.rang(interaction.guildId, membre.id);

    await interaction.editReply({
      embeds: [
        information(
          [
            `${barre(etat.ratio)} **${Math.round(etat.ratio * 100)} %**`,
            "",
            `**Niveau :** ${etat.niveau}`,
            `**Expérience :** ${fiche.xp} points (encore ${etat.restant} pour le niveau ${etat.niveau + 1})`,
            `**Classement :** ${rang.position}${rang.position === 1 ? "er" : "e"} sur ${rang.total} membres classés`,
            `**Messages comptés :** ${fiche.messages}`,
          ].join("\n"),
          `${nomDe(membre)}`,
        ).setThumbnail(membre.displayAvatarURL?.({ size: 128 }) ?? null),
      ],
    });
  },
};

const cmdClassement = {
  nom: "classement",
  categorie: "niveaux",
  resume: "Affiche les membres les plus actifs.",
  donnees: new SlashCommandBuilder()
    .setName("classement")
    .setDescription("Affiche les dix membres les plus actifs du serveur."),
  async executer(interaction, contexte) {
    await interaction.deferReply();
    const palier = contexte.configuration.niveaux.palier;
    const premiers = contexte.stockage.classement(interaction.guildId, 10);

    if (premiers.length === 0) {
      await interaction.editReply({
        embeds: [attention("Aucune expérience n'a encore été distribuée sur ce serveur.", "Classement vide")],
      });
      return;
    }

    const medailles = ["🥇", "🥈", "🥉"];
    const lignes = premiers.map(
      (element, index) =>
        `${medailles[index] ?? `**${index + 1}.**`} <@${element.membreId}> — niveau **${niveauPourXp(element.xp, palier)}** (${element.xp} XP)`,
    );

    await interaction.editReply({
      embeds: [information(lignes.join("\n"), "Les plus actifs")],
    });
  },
};

const cmdXp = {
  nom: "xp",
  categorie: "niveaux",
  resume: "Modifie l'expérience d'un membre.",
  detail: "Trois sous-commandes : `ajouter`, `retirer`, `definir`. L'expérience ne descend jamais sous zéro.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ManageRoles,
  donnees: new SlashCommandBuilder()
    .setName("xp")
    .setDescription("Modifie l'expérience d'un membre.")
    .addSubcommand((sous) =>
      sous
        .setName("ajouter")
        .setDescription("Ajoute de l'expérience")
        .addUserOption((option) => option.setName("membre").setDescription("Le membre").setRequired(true))
        .addIntegerOption((option) =>
          option.setName("points").setDescription("Points à ajouter").setRequired(true).setMinValue(1).setMaxValue(1_000_000),
        ),
    )
    .addSubcommand((sous) =>
      sous
        .setName("retirer")
        .setDescription("Retire de l'expérience")
        .addUserOption((option) => option.setName("membre").setDescription("Le membre").setRequired(true))
        .addIntegerOption((option) =>
          option.setName("points").setDescription("Points à retirer").setRequired(true).setMinValue(1).setMaxValue(1_000_000),
        ),
    )
    .addSubcommand((sous) =>
      sous
        .setName("definir")
        .setDescription("Fixe l'expérience à une valeur exacte")
        .addUserOption((option) => option.setName("membre").setDescription("Le membre").setRequired(true))
        .addIntegerOption((option) =>
          option.setName("points").setDescription("Valeur exacte").setRequired(true).setMinValue(0).setMaxValue(100_000_000),
        ),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply({ flags: 64 });
    const sous = interaction.options.getSubcommand();
    const membre = interaction.options.getMember("membre");
    if (!membre) throw new ErreurUtilisateur("Ce membre n'est pas sur le serveur.");

    const fiche = contexte.stockage.membre(interaction.guildId, membre.id);
    const points = interaction.options.getInteger("points", true);

    if (sous === "ajouter") fiche.xp += points;
    else if (sous === "retirer") fiche.xp = Math.max(0, fiche.xp - points);
    else fiche.xp = points;

    fiche.niveau = niveauPourXp(fiche.xp, contexte.configuration.niveaux.palier);
    contexte.stockage.enregistrerMembre(interaction.guildId, membre.id, fiche);

    await interaction.editReply({
      embeds: [
        succes(
          champs([
            ["Membre", `${nomDe(membre)} (<@${membre.id}>)`],
            ["Expérience", `${fiche.xp} points`],
            ["Niveau", String(fiche.niveau)],
          ]).map((champ) => `**${champ.name} :** ${champ.value}`).join("\n"),
          "Expérience mise à jour",
        ),
      ],
    });
  },
};

export const COMMANDES_NIVEAUX = [cmdNiveau, cmdClassement, cmdXp];
