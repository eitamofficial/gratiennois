/**
 * Modération.
 *
 * Chaque sanction est appliquée **puis** journalisée : le salon de journal
 * configuré reçoit qui a fait quoi, à qui, et pourquoi. Une sanction sans
 * trace écrite est une sanction qu'on ne peut plus expliquer.
 *
 * Les permissions Discord sont demandées explicitement (`Bannir` exige
 * `BanMembers`, etc.) : le bot refuse avant d'agir, plutôt que d'échouer avec
 * une erreur technique.
 */

import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { attention, information, succes } from "../lib/embres.js";
import { analyserDuree, formaterDuree, horodatage } from "../lib/duree.js";
import { ErreurUtilisateur } from "./erreurs.js";
import { deposerAlerte, nomDe, repondre } from "./outils.js";
import { SEUIL_ESCALADE } from "../stockage.js";

/** Écrit une ligne dans le salon de journal, s'il est configuré. */
export async function journaliser(contexte, interaction, embed) {
  const reglages = contexte.stockage.serveur(interaction.guildId);
  if (!reglages.journal) return false;
  const salon = await interaction.guild.channels.fetch(reglages.journal).catch(() => null);
  if (!salon?.isTextBased()) return false;
  await salon.send({ embeds: [embed] }).catch(() => {});
  return true;
}

/** Vérifie que le bot peut agir sur ce membre (hiérarchie des rôles). */
function peutSanctionner(interaction, cible) {
  const auteur = interaction.member;
  if (!cible) throw new ErreurUtilisateur("Ce membre n'est pas sur le serveur.");
  if (cible.id === interaction.client.user.id) {
    throw new ErreurUtilisateur("Je ne peux pas me sanctionner moi-même.");
  }
  if (cible.id === interaction.guild.ownerId) {
    throw new ErreurUtilisateur("Le propriétaire du serveur ne peut pas être sanctionné.");
  }
  if (cible.roles.highest.position >= auteur.roles.highest.position && auteur.id !== interaction.guild.ownerId) {
    throw new ErreurUtilisateur("Ce membre a un rôle supérieur ou égal au vôtre.");
  }
  const moi = interaction.guild.members.me;
  if (cible.roles.highest.position >= moi.roles.highest.position) {
    throw new ErreurUtilisateur(
      "Mon rôle est trop bas dans la hiérarchie pour agir sur ce membre : remontez le rôle du bot.",
    );
  }
  return cible;
}

const cmdBannir = {
  nom: "bannir",
  categorie: "modération",
  resume: "Bannit un membre du serveur.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.BanMembers,
  donnees: new SlashCommandBuilder()
    .setName("bannir")
    .setDescription("Bannit un membre du serveur.")
    .addUserOption((option) => option.setName("membre").setDescription("Le membre à bannir").setRequired(true))
    .addStringOption((option) => option.setName("raison").setDescription("Raison du bannissement").setMaxLength(400))
    .addBooleanOption((option) =>
      option.setName("supprimer-messages").setDescription("Supprimer les messages des 7 derniers jours").setRequired(false),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply();
    const cible = peutSanctionner(interaction, interaction.options.getMember("membre"));
    const raison = interaction.options.getString("raison") ?? "aucune raison fournie";
    const supprimer = interaction.options.getBoolean("supprimer-messages") ?? false;

    try {
      await cible.send({
        embeds: [
          attention(
            `Vous avez été banni du serveur **${interaction.guild.name}**.\n**Raison :** ${raison}`,
            "Sanction",
          ),
        ],
      });
    } catch {
      // Boîte privée fermée : ce n'est pas une raison d'annuler la sanction.
    }

    await cible.ban({ reason: `${interaction.user.tag} : ${raison}`, deleteMessageSeconds: supprimer ? 604_800 : 0 });

    await interaction.editReply({
      embeds: [succes(`**${nomDe(cible)}** a été banni.\n**Raison :** ${raison}`, "Bannissement appliqué")],
    });
    await journaliser(
      contexte,
      interaction,
      attention(
        `**Membre :** ${cible.user.tag} (\`${cible.id}\`)\n**Modérateur :** ${interaction.user.tag}\n**Raison :** ${raison}`,
        "Bannissement",
      ),
    );
  },
};

const cmdExclure = {
  nom: "exclure",
  categorie: "modération",
  resume: "Expulse un membre du serveur.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.KickMembers,
  donnees: new SlashCommandBuilder()
    .setName("exclure")
    .setDescription("Expulse un membre du serveur.")
    .addUserOption((option) => option.setName("membre").setDescription("Le membre à expulser").setRequired(true))
    .addStringOption((option) => option.setName("raison").setDescription("Raison de l'expulsion").setMaxLength(400)),
  async executer(interaction, contexte) {
    await interaction.deferReply();
    const cible = peutSanctionner(interaction, interaction.options.getMember("membre"));
    const raison = interaction.options.getString("raison") ?? "aucune raison fournie";

    await cible.kick(`${interaction.user.tag} : ${raison}`);

    await interaction.editReply({
      embeds: [succes(`**${nomDe(cible)}** a été expulsé.\n**Raison :** ${raison}`, "Expulsion appliquée")],
    });
    await journaliser(
      contexte,
      interaction,
      attention(
        `**Membre :** ${cible.user.tag} (\`${cible.id}\`)\n**Modérateur :** ${interaction.user.tag}\n**Raison :** ${raison}`,
        "Expulsion",
      ),
    );
  },
};

const cmdPurger = {
  nom: "purger",
  categorie: "modération",
  resume: "Supprime des messages dans le salon courant.",
  detail: "Entre 1 et 100 messages. L'option `membre` ne supprime que ceux de cette personne.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ManageMessages,
  donnees: new SlashCommandBuilder()
    .setName("purger")
    .setDescription("Supprime des messages du salon.")
    .addIntegerOption((option) =>
      option.setName("nombre").setDescription("Nombre de messages (1 à 100)").setRequired(true).setMinValue(1).setMaxValue(100),
    )
    .addUserOption((option) =>
      option.setName("membre").setDescription("Ne supprimer que les messages de ce membre").setRequired(false),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply({ flags: 64 });
    const nombre = interaction.options.getInteger("nombre", true);
    const filtre = interaction.options.getMember("membre");

    const messages = await interaction.channel.messages.fetch({ limit: nombre });
    const cibles = filtre ? messages.filter((message) => message.author.id === filtre.id) : messages;

    if (cibles.size === 0) throw new ErreurUtilisateur("Aucun message à supprimer ne correspond.");

    // Discord refuse la suppression groupée au-delà de 14 jours : les plus
    // anciens sont retirés un par un.
    const recents = cibles.filter((message) => Date.now() - message.createdTimestamp < 14 * 86_400_000);
    const anciens = cibles.filter((message) => !recents.has(message.id));

    const supprimes = recents.size > 0 ? (await interaction.channel.bulkDelete(recents, true)).size : 0;
    for (const message of anciens.values()) {
      await message.delete().catch(() => {});
    }

    await interaction.editReply({
      embeds: [
        succes(
          `${supprimes + anciens.size} message(s) supprimé(s)${filtre ? ` (de ${filtre.displayName})` : ""} dans <#${interaction.channelId}>.`,
          "Purge effectuée",
        ),
      ],
    });
    await journaliser(
      contexte,
      interaction,
      information(
        `**Salon :** <#${interaction.channelId}>\n**Modérateur :** ${interaction.user.tag}\n**Messages supprimés :** ${
          supprimes + anciens.size
        }${filtre ? `\n**Auteur filtré :** ${filtre.user.tag}` : ""}`,
        "Purge",
      ),
    );
  },
};

const cmdAvertir = {
  nom: "avertir",
  categorie: "modération",
  resume: "Avertit un membre (et conserve la trace).",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ModerateMembers,
  donnees: new SlashCommandBuilder()
    .setName("avertir")
    .setDescription("Avertit un membre et enregistre l'avertissement.")
    .addUserOption((option) => option.setName("membre").setDescription("Le membre à avertir").setRequired(true))
    .addStringOption((option) => option.setName("raison").setDescription("Raison de l'avertissement").setRequired(true).setMaxLength(400)),
  async executer(interaction, contexte) {
    await interaction.deferReply();
    const cible = peutSanctionner(interaction, interaction.options.getMember("membre"));
    const raison = interaction.options.getString("raison", true);

    const fiche = contexte.stockage.avertir(interaction.guildId, cible.id, interaction.user.id, raison);
    const total = contexte.stockage.avertissements(interaction.guildId, cible.id).length;

    try {
      await cible.send({
        embeds: [
          attention(
            `Vous avez reçu un avertissement sur **${interaction.guild.name}**.\n**Raison :** ${raison}\n**Total :** ${total}`,
            "Avertissement",
          ),
        ],
      });
    } catch {
      // Boîte privée fermée : l'avertissement est tout de même enregistré.
    }

    await interaction.editReply({
      embeds: [
        succes(
          `**${nomDe(cible)}** a été averti (${total} avertissement${total > 1 ? "s" : ""} au total).\n**Raison :** ${raison}`,
          "Avertissement enregistré",
        ),
      ],
    });
    await journaliser(
      contexte,
      interaction,
      attention(
        `**Membre :** ${cible.user.tag} (\`${cible.id}\`)\n**Modérateur :** ${interaction.user.tag}\n**Raison :** ${raison}\n**Identifiant :** \`${fiche.id}\``,
        "Avertissement",
      ),
    );

    // Au-delà du seuil, le bot alerte : c'est un signal d'escalade pour la
    // modération, jamais une sanction automatique.
    if (total >= SEUIL_ESCALADE) {
      const message = `**${cible.user.tag}** atteint ${total} sanctions actives. Dernière raison : ${raison}.`;
      contexte.stockage.alerter(interaction.guildId, "Escalade", message, { cibleId: cible.id });
      await deposerAlerte(
        contexte,
        interaction,
        attention(`${message}\n\n*Dossier : \`/historique membre:@${cible.user.username}\`*`, "Seuil d'escalade atteint"),
      );
    }
  },
};

const cmdAvertissements = {
  nom: "avertissements",
  categorie: "modération",
  resume: "Liste les avertissements d'un membre.",
  donnees: new SlashCommandBuilder()
    .setName("avertissements")
    .setDescription("Affiche les avertissements d'un membre.")
    .addUserOption((option) =>
      option.setName("membre").setDescription("Le membre concerné (vous par défaut)").setRequired(false),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply({ flags: 64 });
    const membre = interaction.options.getMember("membre") ?? interaction.member;
    const liste = contexte.stockage.avertissements(interaction.guildId, membre.id);

    if (liste.length === 0) {
      await interaction.editReply({
        embeds: [succes(`Aucun avertissement enregistré pour **${nomDe(membre)}**.`, "Dossier vierge")],
      });
      return;
    }

    const lignes = liste
      .slice(0, 15)
      .map(
        (element, index) =>
          `**${index + 1}.** ${element.raison}\n   *${horodatage(element.date)} · par <@${element.auteurId}> · \`${element.id}\`*`,
      );

    await interaction.editReply({
      embeds: [
        attention(
          [`${liste.length} avertissement(s) pour **${nomDe(membre)}** :`, "", ...lignes].join("\n"),
          "Dossier de modération",
        ),
      ],
    });
  },
};

const cmdRetirerAvertissement = {
  nom: "retirer-avertissement",
  categorie: "modération",
  resume: "Retire un avertissement par son identifiant.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ModerateMembers,
  donnees: new SlashCommandBuilder()
    .setName("retirer-avertissement")
    .setDescription("Retire un avertissement enregistré.")
    .addUserOption((option) =>
      option.setName("membre").setDescription("Le membre concerné").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("identifiant").setDescription("Identifiant affiché dans /avertissements").setRequired(true),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply({ flags: 64 });
    const membre = interaction.options.getMember("membre");
    if (!membre) throw new ErreurUtilisateur("Ce membre n'est pas sur le serveur.");
    const id = interaction.options.getString("identifiant", true).trim();

    const fiche = contexte.stockage.avertissements(interaction.guildId, membre.id).find((element) => element.id === id);
    if (!fiche) throw new ErreurUtilisateur("Aucun avertissement ne porte cet identifiant pour ce membre.");

    contexte.stockage.retirerAvertissement(interaction.guildId, id);

    await interaction.editReply({
      embeds: [
        succes(
          `L'avertissement « ${fiche.raison} » de **${nomDe(membre)}** a été retiré.`,
          "Avertissement levé",
        ),
      ],
    });
    await journaliser(
      contexte,
      interaction,
      information(
        `**Membre :** ${membre.user.tag}\n**Modérateur :** ${interaction.user.tag}\n**Avertissement retiré :** ${fiche.raison}`,
        "Avertissement levé",
      ),
    );
  },
};

const cmdDelai = {
  nom: "delai",
  categorie: "modération",
  resume: "Rend un membre muet pendant une durée.",
  detail:
    "Sanction temporaire, levée automatiquement par Discord à l'échéance. La durée s'écrit en français : `10m`, `2h`, `1 j 4 h` (28 jours au maximum).",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ModerateMembers,
  donnees: new SlashCommandBuilder()
    .setName("delai")
    .setDescription("Exclusion temporaire (timeout) d'un membre.")
    .addUserOption((option) => option.setName("membre").setDescription("Le membre à rendre muet").setRequired(true))
    .addStringOption((option) => option.setName("duree").setDescription("Durée, par exemple 10m ou 2h").setRequired(true))
    .addStringOption((option) => option.setName("raison").setDescription("Raison").setMaxLength(400)),
  async executer(interaction, contexte) {
    await interaction.deferReply();
    const cible = peutSanctionner(interaction, interaction.options.getMember("membre"));
    const dureeTexte = interaction.options.getString("duree", true);
    const raison = interaction.options.getString("raison") ?? "aucune raison fournie";

    const duree = analyserDuree(dureeTexte);
    if (!duree) throw new ErreurUtilisateur(`Durée illisible : « ${dureeTexte} ». Essayez \`10m\`, \`2h\` ou \`1 j\`.`);
    if (duree > 28 * 86_400_000) throw new ErreurUtilisateur("Discord n'accepte pas plus de 28 jours de silence.");

    await cible.timeout(duree, `${interaction.user.tag} : ${raison}`);

    await interaction.editReply({
      embeds: [
        succes(
          `**${nomDe(cible)}** est muet pendant **${formaterDuree(duree)}**.\n**Raison :** ${raison}`,
          "Silence appliqué",
        ),
      ],
    });
    await journaliser(
      contexte,
      interaction,
      attention(
        `**Membre :** ${cible.user.tag}\n**Modérateur :** ${interaction.user.tag}\n**Durée :** ${formaterDuree(duree)}\n**Raison :** ${raison}`,
        "Silence",
      ),
    );
  },
};

const cmdDeplacer = {
  nom: "deplacer",
  categorie: "modération",
  resume: "Déplace un ou plusieurs membres vers votre salon vocal.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.MoveMembers,
  donnees: new SlashCommandBuilder()
    .setName("deplacer")
    .setDescription("Déplace des membres vers votre salon vocal.")
    .addStringOption((option) =>
      option
        .setName("membres")
        .setDescription("Mentions ou identifiants, séparés par des espaces")
        .setRequired(true),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply({ flags: 64 });
    const salon = interaction.member?.voice?.channel;
    if (!salon) throw new ErreurUtilisateur("Vous devez d'abord rejoindre un salon vocal.");

    const identifiants = [...new Set(interaction.options.getString("membres", true).match(/\d{5,25}/g) ?? [])];
    if (identifiants.length === 0) throw new ErreurUtilisateur("Aucun identifiant de membre reconnu.");

    const deplaces = [];
    const echecs = [];
    for (const identifiant of identifiants.slice(0, 25)) {
      const membre = await interaction.guild.members.fetch(identifiant).catch(() => null);
      if (!membre?.voice?.channel) {
        echecs.push(`<@${identifiant}> n'est pas en vocal`);
        continue;
      }
      const ok = await membre.voice.setChannel(salon, `Déplacement demandé par ${interaction.user.tag}`).then(() => true).catch(() => false);
      if (ok) deplaces.push(`<@${identifiant}>`);
      else echecs.push(`<@${identifiant}> (permission refusée)`);
    }

    await interaction.editReply({
      embeds: [
        (echecs.length === 0 ? succes : attention)(
          [
            deplaces.length > 0 ? `**Déplacés vers ${salon.name} :** ${deplaces.join(", ")}` : "Aucun membre déplacé.",
            echecs.length > 0 ? `**Non déplacés :** ${echecs.join(", ")}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          "Déplacement",
        ),
      ],
    });
  },
};

const cmdSourdine = {
  nom: "sourdine",
  categorie: "modération",
  resume: "Retire la parole à un membre jusqu'à levée manuelle.",
  detail:
    "Contrairement à `/delai`, qui expire seul, la sourdine ne se lève que par `/revoquer`. Elle demande un rôle de sourdine configuré (`/configurer silence role:…`).",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ModerateMembers,
  donnees: new SlashCommandBuilder()
    .setName("sourdine")
    .setDescription("Retire la parole à un membre jusqu'à lever la sanction.")
    .addUserOption((option) => option.setName("membre").setDescription("Le membre à sanctionner").setRequired(true))
    .addStringOption((option) => option.setName("motif").setDescription("Motif de la sanction").setMaxLength(400)),
  async executer(interaction, contexte) {
    await interaction.deferReply();
    const cible = peutSanctionner(interaction, interaction.options.getMember("membre"));
    const motif = interaction.options.getString("motif") ?? "aucun motif fourni";
    const reglages = contexte.stockage.serveur(interaction.guildId);

    if (!reglages.roleSilence) {
      throw new ErreurUtilisateur(
        "Aucun rôle de sourdine n'est configuré : `/configurer silence role:@…`. Sans lui, il n'y a rien à retirer au membre.",
      );
    }

    const ajout = await cible.roles
      .add(reglages.roleSilence, `${interaction.user.tag} : ${motif}`)
      .then(() => true)
      .catch(() => false);
    if (!ajout) {
      throw new ErreurUtilisateur(
        "Le rôle de sourdine est plus haut que le rôle du bot dans la hiérarchie : remontez le rôle du bot.",
      );
    }

    await interaction.editReply({
      embeds: [
        succes(
          `**${nomDe(cible)}** est en sourdine, sans échéance.\n**Motif :** ${motif}\n*Levée avec \`/revoquer\`.*`,
          "Sourdine appliquée",
        ),
      ],
    });
    await journaliser(
      contexte,
      interaction,
      attention(
        `**Membre :** ${cible.user.tag}\n**Modérateur :** ${interaction.user.tag}\n**Motif :** ${motif}`,
        "Sourdine",
      ),
    );
  },
};

const cmdDebannir = {
  nom: "debannir",
  categorie: "modération",
  resume: "Révoque un bannissement.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.BanMembers,
  donnees: new SlashCommandBuilder()
    .setName("debannir")
    .setDescription("Révoque le bannissement d'un membre.")
    .addStringOption((option) =>
      option.setName("identifiant").setDescription("Identifiant Discord du membre banni").setRequired(true),
    )
    .addStringOption((option) => option.setName("motif").setDescription("Motif de la levée").setMaxLength(400)),
  async executer(interaction, contexte) {
    await interaction.deferReply();
    const identifiant = interaction.options.getString("identifiant", true).trim();
    const motif = interaction.options.getString("motif") ?? "aucun motif fourni";

    if (!/^\d{5,25}$/.test(identifiant)) throw new ErreurUtilisateur("Cet identifiant Discord n'est pas valide.");

    const bannissement = await interaction.guild.bans.fetch(identifiant).catch(() => null);
    if (!bannissement) throw new ErreurUtilisateur("Cette personne n'est pas bannie de ce serveur.");

    await interaction.guild.bans.remove(identifiant, `${interaction.user.tag} : ${motif}`);

    await interaction.editReply({
      embeds: [succes(`<@${identifiant}> peut de nouveau rejoindre le serveur.\n**Motif :** ${motif}`, "Bannissement levé")],
    });
    await journaliser(
      contexte,
      interaction,
      information(`**Membre :** ${bannissement.user.tag}\n**Par :** ${interaction.user.tag}\n**Motif :** ${motif}`, "Levée de bannissement"),
    );
  },
};

const cmdRevoquer = {
  nom: "revoquer",
  categorie: "modération",
  resume: "Lève les sanctions d'un membre.",
  detail: "Trois types : `delai` (timeout Discord), `sourdine` (rôle retiré), `avertissement` (dossier apuré).",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ModerateMembers,
  donnees: new SlashCommandBuilder()
    .setName("revoquer")
    .setDescription("Lève les sanctions d'un membre.")
    .addUserOption((option) => option.setName("membre").setDescription("Le membre concerné").setRequired(true))
    .addStringOption((option) =>
      option.setName("type").setDescription("Sanction à lever").addChoices(
        { name: "Toutes", value: "toutes" },
        { name: "Délai (timeout)", value: "delai" },
        { name: "Sourdine", value: "sourdine" },
        { name: "Avertissements", value: "avertissement" },
      ),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply();
    const cible = interaction.options.getMember("membre");
    if (!cible) throw new ErreurUtilisateur("Ce membre n'est pas sur le serveur.");
    const type = interaction.options.getString("type") ?? "toutes";
    const reglages = contexte.stockage.serveur(interaction.guildId);
    const levees = [];

    if ((type === "toutes" || type === "delai") && cible.communicationDisabledUntilTimestamp) {
      const ok = await cible.timeout(null, `Levée par ${interaction.user.tag}`).then(() => true).catch(() => false);
      if (ok) levees.push("délai");
    }

    if ((type === "toutes" || type === "sourdine") && reglages.roleSilence && cible.roles.cache.has(reglages.roleSilence)) {
      const ok = await cible.roles.remove(reglages.roleSilence, `Levée par ${interaction.user.tag}`).then(() => true).catch(() => false);
      if (ok) levees.push("sourdine");
    }

    if (type === "toutes" || type === "avertissement") {
      const dossier = contexte.stockage.avertissements(interaction.guildId, cible.id);
      for (const element of dossier) contexte.stockage.retirerAvertissement(interaction.guildId, element.id);
      if (dossier.length > 0) levees.push(`${dossier.length} avertissement(s)`);
    }

    if (levees.length === 0) {
      await interaction.editReply({
        embeds: [attention(`Rien à lever pour **${nomDe(cible)}** (type demandé : ${type}).`, "Aucune sanction active")],
      });
      return;
    }

    await interaction.editReply({
      embeds: [succes(`**${nomDe(cible)}** : ${levees.join(", ")} levé(s).`, "Sanctions levées")],
    });
    await journaliser(
      contexte,
      interaction,
      information(
        `**Membre :** ${cible.user.tag}\n**Par :** ${interaction.user.tag}\n**Levées :** ${levees.join(", ")}`,
        "Levée de sanctions",
      ),
    );
  },
};

export const COMMANDES_MODERATION = [
  cmdBannir,
  cmdExclure,
  cmdPurger,
  cmdAvertir,
  cmdAvertissements,
  cmdRetirerAvertissement,
  cmdDelai,
  cmdSourdine,
  cmdDebannir,
  cmdRevoquer,
  cmdDeplacer,
];
