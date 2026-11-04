/**
 * Sécurité du serveur.
 *
 * Six commandes qui répondent à trois besoins distincts :
 *
 *  - **agir vite** : `/verrouiller`, `/deverrouiller`, `/ralentir` ;
 *  - **comprendre** : `/audit` passe le serveur au crible et liste ce qui
 *    mérite un regard humain, sans rien modifier ;
 *  - **se souvenir** : `/alertes` et `/historique` montrent ce qui s'est passé.
 *
 * Le verrouillage mémorise l'état **antérieur** du salon : déverrouiller
 * restaure ce qui existait, au lieu d'effacer un réglage qu'on n'a pas posé.
 */

import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { attention, information, or, succes } from "../lib/embres.js";
import { horodatage } from "../lib/duree.js";
import { ErreurUtilisateur } from "./erreurs.js";
import { journaliser } from "./moderation.js";
import { nomDe } from "./outils.js";

/** Le salon où déposer les alertes : le salon d'alertes, sinon le journal. */
function salonDalertes(contexte, serveurId) {
  const reglages = contexte.stockage.serveur(serveurId);
  return reglages.alertes ?? reglages.journal ?? null;
}

const cmdVerrouiller = {
  nom: "verrouiller",
  categorie: "sécurité",
  resume: "Ferme un salon à l'écriture.",
  detail:
    "Déverrouillez avec `/deverrouiller`. L'état antérieur du salon est mémorisé : la levée restaure le réglage d'origine.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ManageChannels,
  donnees: new SlashCommandBuilder()
    .setName("verrouiller")
    .setDescription("Ferme l'écriture dans ce salon.")
    .addStringOption((option) =>
      option.setName("raison").setDescription("Raison du verrouillage").setMaxLength(300),
    )
    .addChannelOption((option) =>
      option
        .setName("salon")
        .setDescription("Salon à verrouiller (celui-ci par défaut)")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply();
    const salon = interaction.options.getChannel("salon") ?? interaction.channel;
    const raison = interaction.options.getString("raison") ?? "aucune raison fournie";

    const deja = contexte.stockage.verrou(interaction.guildId, salon.id);
    if (deja) throw new ErreurUtilisateur(`<#${salon.id}> est déjà verrouillé (${deja.raison}).`);

    const overwrite = salon.permissionOverwrites.cache.get(interaction.guildId);
    contexte.stockage.verrouiller(interaction.guildId, salon.id, raison, interaction.user.id);

    await salon.permissionOverwrites.edit(
      interaction.guildId,
      { SendMessages: false, AddReactions: false, CreatePublicThreads: false },
      { reason: `Verrouillage par ${interaction.user.tag} : ${raison}` },
    );

    await interaction.editReply({
      embeds: [
        succes(
          `<#${salon.id}> est désormais fermé à l'écriture.\n**Raison :** ${raison}`,
          "Salon verrouillé",
        ),
      ],
    });

    const cible = salonDalertes(contexte, interaction.guildId);
    if (cible && cible !== salon.id) {
      const depot = await interaction.guild.channels.fetch(cible).catch(() => null);
      await depot
        ?.send({
          embeds: [
            attention(
              `**Salon :** <#${salon.id}>\n**Par :** <@${interaction.user.id}>\n**Raison :** ${raison}\n\n*\`/deverrouiller\` pour lever.*`,
              "Verrouillage",
            ),
          ],
        })
        .catch(() => {});
    }

    await journaliser(
      contexte,
      interaction,
      attention(
        `**Salon :** <#${salon.id}>\n**Par :** ${interaction.user.tag}\n**Raison :** ${raison}${overwrite ? "" : "\n*(aucun réglage antérieur pour @everyone)*"}`,
        "Verrouillage",
      ),
    );
  },
};

const cmdDeverrouiller = {
  nom: "deverrouiller",
  categorie: "sécurité",
  resume: "Rouvre un salon fermé.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ManageChannels,
  donnees: new SlashCommandBuilder()
    .setName("deverrouiller")
    .setDescription("Rouvre l'écriture dans ce salon.")
    .addChannelOption((option) =>
      option
        .setName("salon")
        .setDescription("Salon à rouvrir (celui-ci par défaut)")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply();
    const salon = interaction.options.getChannel("salon") ?? interaction.channel;

    const verrou = contexte.stockage.verrou(interaction.guildId, salon.id);
    if (!verrou) throw new ErreurUtilisateur(`<#${salon.id}> n'était pas verrouillé par le bot.`);

    contexte.stockage.deverrouiller(interaction.guildId, salon.id);

    // On rend la main au réglage hérité plutôt que d'imposer `true` : le salon
    // retrouve exactement ce qu'il avait avant si le bot n'avait rien changé.
    await salon.permissionOverwrites
      .edit(
        interaction.guildId,
        { SendMessages: null, AddReactions: null, CreatePublicThreads: null },
        { reason: `Levée du verrouillage par ${interaction.user.tag}` },
      )
      .catch(() => {});

    await interaction.editReply({
      embeds: [
        succes(
          `<#${salon.id}> est de nouveau ouvert.\n*Verrouillé ${horodatage(verrou.date)} pour : ${verrou.raison}*`,
          "Salon rouvert",
        ),
      ],
    });

    await journaliser(
      contexte,
      interaction,
      information(`**Salon :** <#${salon.id}>\n**Par :** ${interaction.user.tag}`, "Levée du verrouillage"),
    );
  },
};

const cmdRalentir = {
  nom: "ralentir",
  categorie: "sécurité",
  resume: "Règle le mode lent du salon.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ManageChannels,
  donnees: new SlashCommandBuilder()
    .setName("ralentir")
    .setDescription("Règle le mode lent de ce salon.")
    .addIntegerOption((option) =>
      option.setName("secondes").setDescription("Délai entre deux messages (0 pour désactiver)").setRequired(true).setMinValue(0).setMaxValue(21_600),
    ),
  async executer(interaction, contexte) {
    const secondes = interaction.options.getInteger("secondes", true);
    await interaction.channel.setRateLimitPerUser(secondes, `Mode lent réglé par ${interaction.user.tag}`);

    await interaction.reply({
      embeds: [
        succes(
          secondes === 0
            ? "Le mode lent est désactivé dans ce salon."
            : `Un délai de **${secondes} seconde(s)** s'applique désormais entre deux messages.`,
          "Mode lent",
        ),
      ],
    });

    await journaliser(
      contexte,
      interaction,
      information(
        `**Salon :** <#${interaction.channelId}>\n**Mode lent :** ${secondes} s\n**Par :** ${interaction.user.tag}`,
        "Ralentissement",
      ),
    );
  },
};

/** Permissions qui méritent un regard humain sur un rôle. */
const PERMISSIONS_SENSIBLES = [
  [PermissionFlagsBits.Administrator, "Administrateur (contourne tout le reste)"],
  [PermissionFlagsBits.ManageRoles, "Gérer les rôles"],
  [PermissionFlagsBits.ManageChannels, "Gérer les salons"],
  [PermissionFlagsBits.ManageGuild, "Gérer le serveur"],
  [PermissionFlagsBits.ManageWebhooks, "Gérer les webhooks"],
  [PermissionFlagsBits.BanMembers, "Bannir"],
  [PermissionFlagsBits.KickMembers, "Expulser"],
  [PermissionFlagsBits.MentionEveryone, "Mentionner tout le monde"],
];

const cmdAudit = {
  nom: "audit",
  categorie: "sécurité",
  resume: "Passe le serveur au crible et liste ce qui mérite un regard.",
  detail:
    "Rien n'est modifié : l'audit observe les rôles, les permissions sensibles, les webhooks et la configuration du bot, puis présente ses constats classés par gravité.",
  niveau: "proprietaire",
  permissions: PermissionFlagsBits.ManageGuild,
  donnees: new SlashCommandBuilder().setName("audit").setDescription("Audite la configuration et les permissions du serveur."),
  async executer(interaction, contexte) {
    await interaction.deferReply({ flags: 64 });
    const serveur = interaction.guild;
    const reglages = contexte.stockage.serveur(serveur.id);

    const graves = [];
    const remarques = [];

    // Rôles : qui peut tout ?
    const administrateurs = serveur.roles.cache.filter(
      (role) => role.permissions.has(PermissionFlagsBits.Administrator) && !role.managed,
    );
    for (const role of administrateurs.values()) {
      if (role.id === serveur.id) {
        const membresAvecAdministrateur = serveur.members.cache.filter((membre) =>
          membre.permissions.has(PermissionFlagsBits.Administrator),
        );
        if (membresAvecAdministrateur.size > 2) {
          graves.push(`${membresAvecAdministrateur.size} membres ont l'Administrateur par le rôle @everyone — c'est le signe d'un rôle trop permissif.`);
        }
        continue;
      }
      graves.push(`Le rôle **${role.name}** porte la permission Administrateur : il contourne toutes les permissions de salon.`);
    }

    for (const role of serveur.roles.cache.values()) {
      if (role.managed || role.permissions.has(PermissionFlagsBits.Administrator)) continue;
      const sensibles = PERMISSIONS_SENSIBLES.filter(
        ([permission]) => permission !== PermissionFlagsBits.Administrator && role.permissions.has(permission),
      ).map(([, nom]) => nom);
      if (sensibles.length >= 3) {
        remarques.push(`**${role.name}** cumule ${sensibles.length} permissions sensibles : ${sensibles.join(", ")}.`);
      }
    }

    // Le bot lui-même.
    const moi = serveur.members.me;
    if (moi.permissions.has(PermissionFlagsBits.Administrator)) {
      graves.push(
        "**Le rôle du bot porte Administrateur.** Le bot peut alors contourner les permissions de salon : c'est inutile et cela masque ses propres erreurs.",
      );
    }
    if (!moi.permissions.has(PermissionFlagsBits.ManageRoles)) {
      remarques.push("Il me manque `Gérer les rôles` : l'autorôle et les récompenses de niveau échoueront.");
    }
    if (!moi.permissions.has(PermissionFlagsBits.ManageChannels)) {
      remarques.push("Il me manque `Gérer les salons` : `/verrouiller` et `/ralentir` échoueront.");
    }
    if (!reglages.journal) remarques.push("Aucun salon de journal n'est configuré : les sanctions ne laissent pas de trace (`/configurer journal`).");
    if (!reglages.bienvenue.salon) remarques.push("Aucun salon de bienvenue n'est configuré (`/bienvenue`).");
    if (!reglages.autorole) remarques.push("Aucun rôle automatique à l'arrivée (`/configurer autorole`).");

    // Webhooks : un webhook oublié est une porte d'entrée.
    const webhooks = await serveur.fetchWebhooks().catch(() => null);
    if (webhooks && webhooks.size > 0) {
      remarques.push(`${webhooks.size} webhook(s) actif(s) — vérifiez qu'ils sont tous voulus.`);
    }

    // Wiki.
    if (!contexte.configuration.wikiUrl || !contexte.configuration.secretSync) {
      remarques.push("La liaison au wiki est incomplète : sans `WIKI_URL` et `BOT_SYNC_SECRET`, aucune fiche n'est rattachée.");
    }

    const verrous = contexte.stockage.verrous(serveur.id);
    if (verrous.length > 0) {
      remarques.push(`${verrous.length} salon(s) actuellement verrouillé(s) : ${verrous.map((element) => `<#${element.salonId}>`).join(", ")}.`);
    }

    const lignes = [
      `**Serveur :** ${serveur.name} (${serveur.memberCount} membres, ${serveur.roles.cache.size} rôles, ${serveur.channels.cache.size} salons)`,
      "",
      graves.length > 0 ? `### À corriger (${graves.length})\n${graves.map((element) => `- ${element}`).join("\n")}` : "### Aucun défaut grave",
      "",
      remarques.length > 0 ? `### À surveiller (${remarques.length})\n${remarques.map((element) => `- ${element}`).join("\n")}` : "### Rien à signaler",
    ];

    await interaction.editReply({
      embeds: [
        (graves.length > 0 ? attention : information)(lignes.join("\n"), "Audit du serveur").setFooter({
          text: "DelphinaBot · audit en lecture seule, rien n'a été modifié",
        }),
      ],
    });
  },
};

const cmdAlertes = {
  nom: "alertes",
  categorie: "sécurité",
  resume: "Affiche les alertes récentes du bot.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ModerateMembers,
  donnees: new SlashCommandBuilder().setName("alertes").setDescription("Affiche les alertes récentes."),
  async executer(interaction, contexte) {
    const liste = contexte.stockage.alertes(interaction.guildId, 15);

    if (liste.length === 0) {
      await interaction.reply({
        embeds: [succes("Aucune alerte enregistrée. C'est une bonne nouvelle.", "Calme plat")],
        flags: 64,
      });
      return;
    }

    await interaction.reply({
      embeds: [
        information(
          liste
            .map(
              (element) =>
                `**${element.type}** — ${horodatage(element.date)}\n${element.message}${element.cibleId ? `\n*Membre : <@${element.cibleId}>*` : ""}`,
            )
            .join("\n\n"),
          `Alertes (${liste.length})`,
        ),
      ],
      flags: 64,
    });
  },
};

const cmdHistorique = {
  nom: "historique",
  categorie: "sécurité",
  resume: "Montre le passé de modération d'un membre.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ModerateMembers,
  donnees: new SlashCommandBuilder()
    .setName("historique")
    .setDescription("Affiche le dossier de modération d'un membre.")
    .addUserOption((option) =>
      option.setName("membre").setDescription("Le membre concerné (vous par défaut)").setRequired(false),
    ),
  async executer(interaction, contexte) {
    const membre = interaction.options.getMember("membre") ?? interaction.member;
    const avertissements = contexte.stockage.avertissements(interaction.guildId, membre.id);
    const signalements = contexte.stockage
      .signalements(interaction.guildId)
      .filter((element) => element.cibleId === membre.id);
    const alertes = contexte.stockage
      .alertes(interaction.guildId, 200)
      .filter((element) => element.cibleId === membre.id);

    const lignes = [
      `**Membre :** ${nomDe(membre)} (\`${membre.id}\`)`,
      `**Sanctions actives :** ${avertissements.length}`,
      `**Signalements le visant :** ${signalements.length}`,
      `**Alertes le concernant :** ${alertes.length}`,
      "",
      avertissements.length > 0
        ? `### Avertissements\n${avertissements
            .slice(0, 10)
            .map((element) => `- ${horodatage(element.date)} — ${element.raison} *(\`${element.id}\`)*`)
            .join("\n")}`
        : "### Aucun avertissement",
    ];

    if (signalements.length > 0) {
      lignes.push(
        "",
        `### Signalements\n${signalements
          .slice(0, 10)
          .map((element) => `- n° ${element.numero} (${element.statut}) — ${element.motif.slice(0, 120)}`)
          .join("\n")}`,
      );
    }

    const escalade = avertissements.length >= 3;
    if (escalade) {
      lignes.push("", "**Trois sanctions ou plus : ce dossier appelle une décision humaine, pas une sanction automatique.**");
    }

    await interaction.reply({
      embeds: [(escalade ? attention : information)(lignes.join("\n"), "Dossier de modération")],
      flags: 64,
    });
  },
};

export const COMMANDES_SECURITE = [
  cmdVerrouiller,
  cmdDeverrouiller,
  cmdRalentir,
  cmdAudit,
  cmdAlertes,
  cmdHistorique,
];
