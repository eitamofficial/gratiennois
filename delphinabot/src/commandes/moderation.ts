/**
 * Commandes de modération.
 *
 * Chacune est courte et fait une seule chose ; l'application effective vit
 * dans `modules/moderation/sanction.ts`, partagée avec la modération
 * automatique. C'est ce qui garantit qu'un délai posé à la main et un délai
 * posé par la détection de flood leaving la même trace.
 */

import { ChannelType, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import type { Commande } from "../core/types.js";
import { commande, confirmation, executer, estSalonTextuel, repondre } from "./outils.js";
import { attention, erreur, or, succes } from "../lib/embres.js";
import { analyserDuree, formaterDuree } from "../lib/duree.js";
import { journaliser } from "../db/journal.js";
import { enregistrerSanction, leverToutes, type TypeSanction } from "../db/sanctions.js";
import { revoquer as revoquerSanction, resumeSanction, sanctionner } from "../modules/moderation/sanction.js";
import { deposerSignalement, listerOuverts, resoudreSignalement } from "../db/signalements.js";

/** Résout la cible d'une commande, en expliquant l'échec le plus probable. */
async function cible(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) return { guild: null, membre: null, message: "Cette commande exige un serveur." };

  const utilisateur = interaction.options.getUser("membre", true);
  const membre = await guild.members.fetch(utilisateur.id).catch(() => null);
  if (!membre) {
    return { guild, membre: null, message: "Ce membre n'est pas sur le serveur." };
  }
  return { guild, membre, message: null };
}

const cmdAvertir: Commande = {
  nom: "avertir",
  categorie: "moderation",
  niveau: "moderation",
  usage: "/avertir <membre> [motif]",
  resume: "Enregistre un avertissement et en informe le membre.",
  donnees: commande("avertir", "Enregistre un avertissement.")
    .addUserOption((option) =>
      option.setName("membre").setDescription("Membre à avertir.").setRequired(true),
    )
    .addStringOption((option) => option.setName("motif").setDescription("Motif de l'avertissement.")),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const { guild, membre, message } = await cible(interaction);
      if (!guild || !membre) return repondre(interaction, erreur(message ?? "Cible introuvable."));

      const motif = interaction.options.getString("motif") ?? "";
      const resultat = await sanctionner(guild, {
        type: "avertissement",
        cible: membre,
        auteurId: interaction.user.id,
        raison: motif,
      });
      if (!resultat.ok) return repondre(interaction, erreur(resultat.raison ?? "Sanction impossible."));

      await repondre(
        interaction,
        resumeSanction(membre, "avertissement", motif, null, resultat.sanctionsActives),
      );
    });
  },
};

const cmdDelai: Commande = {
  nom: "delai",
  categorie: "moderation",
  niveau: "moderation",
  usage: "/delai <membre> <durée> [motif]",
  resume: "Met un membre en sourdine pour une durée donnée (ex. 30m, 2h, 1j).",
  donnees: commande("delai", "Met un membre en sourdine temporairement.")
    .addUserOption((option) => option.setName("membre").setDescription("Membre à sanctionner.").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("duree")
        .setDescription("Durée, par exemple 30m, 2h ou 1j 12h.")
        .setRequired(true),
    )
    .addStringOption((option) => option.setName("motif").setDescription("Motif de la sanction.")),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const duree = analyserDuree(interaction.options.getString("duree", true));
      if (!duree) {
        return repondre(
          interaction,
          erreur("Durée illisible. Exemples acceptés : `30m`, `2h`, `1h30`, `1j 12h`."),
        );
      }
      if (duree > 28 * 86_400_000) {
        return repondre(
          interaction,
          erreur("Discord n'autorise pas un délai de plus de 28 jours. Utilisez un bannissement."),
        );
      }

      const { guild, membre, message } = await cible(interaction);
      if (!guild || !membre) return repondre(interaction, erreur(message ?? "Cible introuvable."));

      const motif = interaction.options.getString("motif") ?? "";
      const resultat = await sanctionner(guild, {
        type: "delai",
        cible: membre,
        auteurId: interaction.user.id,
        raison: motif,
        dureeMs: duree,
      });
      if (!resultat.ok) return repondre(interaction, erreur(resultat.raison ?? "Sanction impossible."));

      await repondre(
        interaction,
        resumeSanction(membre, "delai", motif, duree, resultat.sanctionsActives),
      );
    });
  },
};

const cmdSourdine: Commande = {
  nom: "sourdine",
  categorie: "moderation",
  niveau: "moderation",
  usage: "/sourdine <membre> [motif]",
  resume: "Retire le rôle de sourdine, jusqu'à levée manuelle.",
  donnees: commande("sourdine", "Met un membre en sourdine.").addUserOption((option) =>
    option.setName("membre").setDescription("Membre à sanctionner.").setRequired(true),
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const { guild, membre, message } = await cible(interaction);
      if (!guild || !membre) return repondre(interaction, erreur(message ?? "Cible introuvable."));

      const motif = interaction.options.getString("motif") ?? "";
      const resultat = await sanctionner(guild, {
        type: "sourdine",
        cible: membre,
        auteurId: interaction.user.id,
        raison: motif,
      });
      if (!resultat.ok) return repondre(interaction, erreur(resultat.raison ?? "Sanction impossible."));
      await repondre(interaction, resumeSanction(membre, "sourdine", motif, null, resultat.sanctionsActives));
    });
  },
};

const cmdExclure: Commande = {
  nom: "exclure",
  categorie: "moderation",
  niveau: "moderation",
  usage: "/exclure <membre> [motif]",
  resume: "Exclut un membre du serveur.",
  donnees: commande("exclure", "Exclut un membre du serveur.")
    .addUserOption((option) => option.setName("membre").setDescription("Membre à exclure.").setRequired(true))
    .addStringOption((option) => option.setName("motif").setDescription("Motif de l'exclusion.")),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const { guild, membre, message } = await cible(interaction);
      if (!guild || !membre) return repondre(interaction, erreur(message ?? "Cible introuvable."));

      const motif = interaction.options.getString("motif") ?? "";
      const resultat = await sanctionner(guild, {
        type: "exclusion",
        cible: membre,
        auteurId: interaction.user.id,
        raison: motif,
      });
      if (!resultat.ok) return repondre(interaction, erreur(resultat.raison ?? "Exclusion impossible."));

      await journaliser({
        serveurId: guild.id,
        type: "exclusion",
        utilisateurId: interaction.user.id,
        cibleId: membre.id,
        details: { motif },
      });
      await repondre(
        interaction,
        succes(`**${membre.user.tag}** a été exclu du serveur. Motif : ${motif || "aucun"}.`),
      );
    });
  },
};

const cmdBannir: Commande = {
  nom: "bannir",
  categorie: "moderation",
  niveau: "moderation",
  usage: "/bannir <identifiant> [motif]",
  resume: "Bannit un compte, même s'il a quitté le serveur.",
  donnees: commande("bannir", "Bannit un compte du serveur.")
    .addStringOption((option) =>
      option
        .setName("identifiant")
        .setDescription("Identifiant numérique du compte.")
        .setRequired(true),
    )
    .addStringOption((option) => option.setName("motif").setDescription("Motif du bannissement.")),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;

      const identifiant = interaction.options.getString("identifiant", true).trim();
      if (!/^\d{15,22}$/.test(identifiant)) {
        return repondre(
          interaction,
          erreur("Identifiant invalide : activez le mode développeur sur le profil et copiez l'identifiant."),
        );
      }

      const motif = interaction.options.getString("motif") ?? "";
      const dejaBanni = await guild.bans.fetch(identifiant).catch(() => null);
      if (dejaBanni) return repondre(interaction, attention("Ce compte est déjà banni."));

      try {
        await guild.bans.create(identifiant, { reason: `DelphinaBot : ${motif}` });
      } catch (erreurRevue) {
        return repondre(
          interaction,
          erreur(`Bannissement refusé : ${(erreurRevue as Error).message}`),
        );
      }

      await enregistrerSanction({
        serveurId: guild.id,
        utilisateurId: identifiant,
        type: "bannissement",
        raison: motif,
        auteurId: interaction.user.id,
      });
      await journaliser({
        serveurId: guild.id,
        type: "bannissement",
        utilisateurId: interaction.user.id,
        cibleId: identifiant,
        details: { motif },
      });
      await repondre(interaction, succes(`Compte \`${identifiant}\` banni. Motif : ${motif || "aucun"}.`));
    });
  },
};

const cmdDebannir: Commande = {
  nom: "debannir",
  categorie: "moderation",
  niveau: "moderation",
  usage: "/debannir <identifiant>",
  resume: "Lève un bannissement.",
  donnees: commande("debannir", "Lève un bannissement.").addStringOption((option) =>
    option.setName("identifiant").setDescription("Identifiant numérique du compte.").setRequired(true),
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      const identifiant = interaction.options.getString("identifiant", true).trim();

      const bannissement = await guild.bans.fetch(identifiant).catch(() => null);
      if (!bannissement) return repondre(interaction, attention("Ce compte n'est pas banni."));

      await guild.bans.remove(identifiant, `Levée par DelphinaBot (${interaction.user.id})`);
      await leverToutes(guild.id, identifiant, "bannissement", interaction.user.id);
      await repondre(interaction, succes(`Compte \`${identifiant}\` débanni.`));
    });
  },
};

const cmdRevoquer: Commande = {
  nom: "revoquer",
  categorie: "moderation",
  niveau: "moderation",
  usage: "/revoquer <membre> [type]",
  resume: "Lève une sanction : délai, sourdine, bannissement.",
  donnees: commande("revoquer", "Lève les sanctions d'un membre.")
    .addUserOption((option) => option.setName("membre").setDescription("Membre concerné.").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Type de sanction à lever (toutes par défaut).")
        .addChoices(
          { name: "Toutes", value: "toutes" },
          { name: "Délai", value: "delai" },
          { name: "Sourdine", value: "sourdine" },
          { name: "Bannissement", value: "bannissement" },
        ),
    ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const { guild, membre, message } = await cible(interaction);
      if (!guild || !membre) return repondre(interaction, erreur(message ?? "Cible introuvable."));

      const type = (interaction.options.getString("type") ?? "toutes") as TypeSanction | "toutes";
      const resultat = await revoquerSanction(guild, membre, type, interaction.user.id);
      if (!resultat.ok) return repondre(interaction, attention(resultat.raison ?? "Rien à lever."));

      await repondre(
        interaction,
        succes(
          `${resultat.levees} sanction(s) levée(s) pour **${membre.user.tag}**.` +
            (type === "toutes"
              ? "\nUne exclusion ne peut pas être annulée : le membre devra être invité de nouveau."
              : ""),
        ),
      );
    });
  },
};

const cmdPurger: Commande = {
  nom: "purger",
  categorie: "moderation",
  niveau: "moderation",
  usage: "/purger [nombre]",
  resume: "Supprime en bloc les derniers messages d'un salon (100 maximum).",
  donnees: commande("purger", "Supprime les derniers messages d'un salon.")
    .addIntegerOption((option) =>
      option
        .setName("nombre")
        .setDescription("Nombre de messages à supprimer (1 à 100).")
        .setMinValue(1)
        .setMaxValue(100),
    ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const salon = interaction.channel;
      if (!salon || !salon.isTextBased() || !estSalonTextuel(salon)) {
        return repondre(interaction, erreur("Cette commande ne fonctionne que dans un salon textuel."));
      }

      const nombre = interaction.options.getInteger("nombre") ?? 10;
      const supprimes = await salon.bulkDelete(nombre, true).catch(() => null);
      if (!supprimes) {
        return repondre(
          interaction,
          erreur(
            "Suppression impossible : un message de plus de quatorze jours ne peut pas être effacé en bloc.",
          ),
        );
      }

      await journaliser({
        serveurId: salon.guild?.id ?? "",
        type: "purge",
        utilisateurId: interaction.user.id,
        cibleId: null,
        details: { salon: salon.id, nombre: supprimes.size },
      });

      // Le message de confirmation est envoyé après la suppression, pour ne
      // pas être effacé lui-même.
      await interaction
        .reply({ content: `🧹 ${supprimes.size} message(s) supprimé(s).`, ephemeral: true })
        .catch(() => undefined);
    });
  },
};

const cmdRalentir: Commande = {
  nom: "ralentir",
  categorie: "moderation",
  niveau: "moderation",
  usage: "/ralentir <secondes>",
  resume: "Impose un délai entre deux messages dans ce salon.",
  donnees: commande("ralentir", "Impose un délai entre deux messages.")
    .addIntegerOption((option) =>
      option
        .setName("secondes")
        .setDescription("Délai en secondes (0 pour lever).")
        .setMinValue(0)
        .setMaxValue(21_600),
    ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const salon = interaction.channel;
      if (!salon || !salon.isTextBased() || !estSalonTextuel(salon)) {
        return repondre(interaction, erreur("Cette commande ne fonctionne que dans un salon textuel."));
      }

      const secondes = interaction.options.getInteger("secondes", true);
      await salon.setRateLimitPerUser(secondes, `DelphinaBot (${interaction.user.tag})`);

      await confirmation(
        { bot, interaction, serveur },
        secondes === 0
          ? "Le délai entre messages est levé dans ce salon."
          : `Les membres devront attendre ${formaterDuree(secondes * 1000)} entre deux messages dans ce salon.`,
      );
    });
  },
};

const cmdSignaler: Commande = {
  nom: "signaler",
  categorie: "moderation",
  niveau: "membre",
  usage: "/signaler <membre> [motif]",
  resume: "Signale un membre à la modération, à partir de son dernier message ici.",
  donnees: commande("signaler", "Signale un membre à la modération.")
    .addUserOption((option) => option.setName("membre").setDescription("Membre à signaler.").setRequired(true))
    .addStringOption((option) => option.setName("motif").setDescription("Pourquoi ce message pose problème.")),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      if (interaction.options.getUser("membre", true).id === interaction.user.id) {
        return repondre(interaction, erreur("On ne se signale pas soi-même."));
      }

      const salon = interaction.channel;
      if (!salon || !salon.isTextBased() || !estSalonTextuel(salon)) {
        return repondre(interaction, erreur("Cette commande ne fonctionne que dans un salon textuel."));
      }

      const messages = await salon.messages.fetch({ limit: 50 }).catch(() => null);
      if (!messages) return repondre(interaction, erreur("Historique inaccessible dans ce salon."));

      const cibleId = interaction.options.getUser("membre", true).id;
      const dernier = [...messages.values()]
        .reverse()
        .find((message) => message.author.id === cibleId && !message.author.bot);

      const signalement = await deposerSignalement({
        serveurId: guild.id,
        salonId: interaction.channelId,
        auteurId: interaction.user.id,
        cibleId,
        raison: interaction.options.getString("motif") ?? "sans motif",
        extrait: dernier?.content ?? "(aucun message récent de ce membre dans ce salon)",
        messageId: dernier?.id ?? null,
      });

      const salonSignalements = serveur.salonSignalements
        ? guild.channels.cache.get(serveur.salonSignalements)
        : serveur.salonAlertes
          ? guild.channels.cache.get(serveur.salonAlertes)
          : null;

      if (salonSignalements && estSalonTextuel(salonSignalements)) {
        await salonSignalements
          .send({
            embeds: [
              attention(
                [
                  `**Signalement n° ${signalement.id}**`,
                  `Signalé par <@${interaction.user.id}>`,
                  `Membre concerné : <@${cibleId}>`,
                  `Salon : <#${interaction.channelId}>`,
                  `Motif : ${signalement.raison}`,
                  dernier ? `Message : « ${(dernier.content || "(vide)").slice(0, 200)} »` : "",
                  dernier ? `Lien : ${dernier.url}` : "",
                ]
                  .filter(Boolean)
                  .join("\n"),
                "Nouveau signalement",
              ),
            ],
          })
          .catch(() => undefined);
      }

      await confirmation(
        { bot, interaction, serveur },
        salonSignalements
          ? `Signalement n° ${signalement.id} transmis à la modération. Merci.`
          : `Signalement n° ${signalement.id} enregistré, mais aucun salon de signalement n'est configuré. Voyez la modération en direct.`,
      );
    });
  },
};

const cmdSignalements: Commande = {
  nom: "signalements",
  categorie: "moderation",
  niveau: "moderation",
  usage: "/signalements",
  resume: "Liste les signalements en attente.",
  donnees: commande("signalements", "Liste les signalements ouverts.").setDefaultMemberPermissions(
    PermissionFlagsBits.ManageMessages,
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      const ouverts = await listerOuverts(guild.id, 10);

      if (ouverts.length === 0) {
        return repondre(interaction, succes("Aucun signalement en attente."));
      }

      const embed = new EmbedBuilder()
        .setColor(0xb8871f)
        .setTitle("Signalements en attente")
        .setDescription(
          ouverts
            .map(
              (element) =>
                `**n° ${element.id}** — <@${element.cibleId}> signalé par <@${element.auteurId}>\n` +
                `Motif : ${element.raison}\n<#${element.salonId}>`,
            )
            .join("\n\n"),
        )
        .setFooter({ text: "Fermez un signalement avec /resoudre-signalement" });
      await repondre(interaction, embed);
    });
  },
};

const cmdResoudreSignalement: Commande = {
  nom: "resoudre-signalement",
  categorie: "moderation",
  niveau: "moderation",
  usage: "/resoudre-signalement <numéro> [résolu|rejeté]",
  resume: "Clôture un signalement.",
  donnees: commande("resoudre-signalement", "Clôt un signalement.")
    .addIntegerOption((option) =>
      option.setName("numero").setDescription("Numéro du signalement.").setMinValue(1).setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("issue")
        .setDescription("Conclusion de la modération.")
        .addChoices({ name: "Traité", value: "traite" }, { name: "Rejeté", value: "rejete" }),
    ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      const numero = interaction.options.getInteger("numero", true);
      const issue = (interaction.options.getString("issue") ?? "traite") as "traite" | "rejete";

      await resoudreSignalement(numero, issue, interaction.user.id);
      await journaliser({
        serveurId: guild.id,
        type: "signalement-resolu",
        utilisateurId: interaction.user.id,
        cibleId: null,
        details: { numero, issue },
      });
      await confirmation({ bot, interaction, serveur }, `Signalement n° ${numero} clôturé (${issue}).`);
    });
  },
};

const cmdRegles: Commande = {
  nom: "regles",
  categorie: "moderation",
  niveau: "membre",
  usage: "/regles",
  resume: "Rappelle les règles de modération que le bot applique.",
  publique: true,
  donnees: commande("regles", "Rappelle les règles appliquées par la modération."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const embed = or(
        [
          "**1.** On cite, on n'accuse pas. Un désaccord se formule, il ne s'injurie pas.",
          "**2.** Le spam, les liens non autorisés et les mentions en masse sont retirés automatiquement.",
          `**3.** Trois sanctions actives déclenchent une alerte : la décision reste humaine.`,
          "**4.** Une sanction est toujours motivée, et le membre en reçoit un message privé.",
          "**5.** Une sanction est levée, jamais effacée : le dossier reste consultable.",
          "**6.** En cas de désaccord, `/signalement` ou la mention de l'équipe de modération suffisent.",
        ].join("\n"),
        "Règles de modération",
      );
      await repondre(interaction, embed, true);
    });
  },
};

export const COMMANDES_MODERATION: Commande[] = [
  cmdAvertir,
  cmdDelai,
  cmdSourdine,
  cmdExclure,
  cmdBannir,
  cmdDebannir,
  cmdRevoquer,
  cmdPurger,
  cmdRalentir,
  cmdSignaler,
  cmdSignalements,
  cmdResoudreSignalement,
  cmdRegles,
];
