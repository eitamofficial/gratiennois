/**
 * Commandes de base.
 *
 * Cinq commandes qui répondent aux questions qu'on se pose sur un bot :
 * est-il vivant, que sait-il faire, où l'inviter, à qui se plaindre.
 */

import { SlashCommandBuilder, version as versionDiscord } from "discord.js";
import { information, or, succes } from "../lib/embres.js";
import { formaterDuree, horodatage } from "../lib/duree.js";
import { niveauPourXp } from "../niveaux.js";

const cmdPing = {
  nom: "ping",
  categorie: "système",
  resume: "Vérifie que le bot répond et mesure sa latence.",
  donnees: new SlashCommandBuilder().setName("ping").setDescription("Vérifie que le bot répond."),
  async executer(interaction, contexte) {
    const debut = Date.now();
    await interaction.reply({ embeds: [information("Mesure en cours…", "Ping")] });
    const aller = Date.now() - debut;

    await interaction.editReply({
      embeds: [
        succes(
          `Réponse en **${aller} ms**.\nPasserelle Discord : **${Math.round(contexte.client.ws.ping)} ms**.\nEn ligne depuis **${formaterDuree(contexte.client.uptime ?? 0)}**.`,
          "DelphinaBot est en ligne",
        ),
      ],
    });
  },
};

const cmdAide = {
  nom: "aide",
  categorie: "système",
  resume: "Liste les commandes disponibles.",
  detail:
    "Sans argument, affiche toutes les commandes rangées par catégorie. Avec un nom de commande, affiche son usage exact.",
  donnees: new SlashCommandBuilder()
    .setName("aide")
    .setDescription("Liste les commandes du bot.")
    .addStringOption((option) =>
      option.setName("commande").setDescription("Une commande précise à détailler").setRequired(false),
    ),
  async executer(interaction, contexte) {
    const demandee = interaction.options.getString("commande");

    // Les commandes viennent du contexte, jamais d'un import du registre :
    // c'est ce qui évite un cycle d'import entre `/aide` et le registre.
    const table = new Map();
    for (const commande of contexte.commandes) {
      if (!table.has(commande.categorie)) table.set(commande.categorie, []);
      table.get(commande.categorie).push(commande);
    }
    const toutes = [...table.entries()];

    if (demandee) {
      const nom = demandee.trim().toLowerCase().replace(/^\//, "");
      const trouvee = toutes.flatMap(([, liste]) => liste).find((element) => element.nom === nom);
      if (!trouvee) {
        return interaction.reply({
          embeds: [or("Cette commande n'existe pas. Utilisez `/aide` pour la liste complète.")],
          flags: 64,
        });
      }
      return interaction.reply({
        embeds: [
          or(
            `**Catégorie :** ${trouvee.categorie}\n**Accès :** ${trouvee.niveau ?? "membre"}\n**Usage :** \`/${trouvee.nom}\`\n\n${trouvee.detail ?? trouvee.resume}`,
            `/${trouvee.nom}`,
          ),
        ],
      });
    }

    const description = toutes
      .filter(([, liste]) => liste.length > 0)
      .map(([categorie, liste]) => {
        const lignes = liste.map((commande) => `\`/${commande.nom}\` — ${commande.resume}`).join("\n");
        return `### ${categorie.charAt(0).toUpperCase()}${categorie.slice(1)}\n${lignes}`;
      })
      .join("\n\n");

    const limite = 3800;
    const texte =
      description.length > limite
        ? `${description.slice(0, limite - 40)}\n\n… (liste tronquée, utilisez \`/aide commande\`)`
        : description;

    await interaction.reply({ embeds: [or(texte, "Commandes de DelphinaBot")] });
  },
};

const cmdBotInfo = {
  nom: "botinfo",
  categorie: "système",
  resume: "État technique du bot.",
  donnees: new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription("Affiche l'état technique du bot."),
  async executer(interaction, contexte) {
    const memoire = process.memoryUsage();
    const mo = (octets) => `${(octets / 1024 / 1024).toFixed(1)} Mo`;
    const membres = contexte.client.guilds.cache.reduce(
      (total, guilde) => total + (guilde.memberCount ?? 0),
      0,
    );

    const lignes = [
      `**Serveurs :** ${contexte.client.guilds.cache.size} · **Membres vus :** ${membres}`,
      `**Commandes enregistrées :** ${contexte.commandes.length}`,
      `**Node.js :** ${process.version} · **discord.js :** ${versionDiscord}`,
      `**Mémoire :** ${mo(memoire.heapUsed)} utilisés pour ${mo(memoire.rss)} réservés`,
      `**En ligne depuis :** ${formaterDuree(contexte.client.uptime ?? 0)}`,
      `**Wiki :** ${contexte.configuration.wikiUrl || "non configuré"}`,
      `**Synchronisation des rôles :** ${contexte.configuration.secretSync ? "signée (HMAC-SHA256)" : "désactivée (secret absent)"}`,
      `**Fiches partagées :** ${contexte.roster.personnages.length} personnages, ${contexte.roster.roleMapping.length} rôles institutionnels`,
    ];

    await interaction.reply({ embeds: [information(lignes.join("\n"), "État de DelphinaBot")] });
  },
};

const cmdInvite = {
  nom: "invite",
  categorie: "système",
  resume: "Liens d'invitation du bot et du serveur.",
  donnees: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Liens d'invitation du bot et du serveur."),
  async executer(interaction, contexte) {
    // Masque des permissions du rôle du bot : celles qu'utilisent réellement
    // les commandes, sans la permission Administrateur — qui contournerait
    // toutes les permissions de salon. Il est documenté en toutes lettres dans
    // `deploy/windows/README.md`, section « DelphinaBot ».
    const permissions = "1099938786310";
    const lienBot = contexte.configuration.clientId
      ? `https://discord.com/api/oauth2/authorize?client_id=${contexte.configuration.clientId}&permissions=${permissions}&scope=bot%20applications.commands`
      : "identifiant d'application inconnu — renseignez DISCORD_CLIENT_ID.";

    await interaction.reply({
      embeds: [
        or(
          [
            `**Inviter le bot :** ${lienBot}`,
            contexte.roster.invite ? `**Rejoindre le serveur :** ${contexte.roster.invite}` : null,
            contexte.configuration.wikiUrl ? `**Le wiki :** ${contexte.configuration.wikiUrl}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          "Invitations",
        ),
      ],
    });
  },
};

const cmdSupport = {
  nom: "support",
  categorie: "système",
  resume: "Où demander de l'aide et signaler un problème.",
  detail:
    "Décrit où demander de l'aide. Avec l'option `probleme`, le message est aussi transmis au salon de journal configuré.",
  donnees: new SlashCommandBuilder()
    .setName("support")
    .setDescription("Comment obtenir de l'aide.")
    .addStringOption((option) =>
      option
        .setName("probleme")
        .setDescription("Décrivez brièvement le problème rencontré")
        .setRequired(false)
        .setMaxLength(500),
    ),
  async executer(interaction, contexte) {
    const probleme = interaction.options.getString("probleme");
    const reglages = contexte.stockage.serveur(interaction.guildId);

    const embeds = [
      or(
        [
          "**Un bug ou une idée ?** Écrivez-le dans le salon d'assistance du serveur : la demande sera lue.",
          contexte.configuration.wikiUrl
            ? `**Le wiki est-il en panne ?** Sa santé est publique : ${contexte.configuration.wikiUrl}/api/health`
            : null,
          "**Une sanction vous semble injuste ?** Contactez la modération, en citant la raison affichée par le bot.",
        ]
          .filter(Boolean)
          .join("\n"),
        "Assistance",
      ),
    ];

    // Un problème décrit est transmis dans le salon de journal, s'il existe :
    // la personne n'a pas à chercher où l'écrire.
    if (probleme && reglages.journal) {
      const salon = await interaction.guild.channels.fetch(reglages.journal).catch(() => null);
      if (salon?.isTextBased()) {
        await salon
          .send({
            embeds: [
              or(
                `**Signalé par :** <@${interaction.user.id}> (${interaction.user.tag})\n**Salon :** <#${interaction.channelId}>\n\n${probleme}`,
                "Nouveau signalement",
              ),
            ],
          })
          .catch(() => {});
        embeds.push(succes("Votre message a été transmis à la modération.", "Signalement envoyé"));
      }
    }

    await interaction.reply({
      embeds,
      flags: probleme && reglages.journal ? 64 : undefined,
    });
  },
};

const cmdStatistiques = {
  nom: "statistiques",
  categorie: "système",
  resume: "Affiche les chiffres du serveur et du bot.",
  donnees: new SlashCommandBuilder()
    .setName("statistiques")
    .setDescription("Affiche les statistiques du serveur et de la vie du bot."),
  async executer(interaction, contexte) {
    const serveur = interaction.guild;
    // On lit le stockage brut : c'est un comptage, rien n'est modifié.
    const membres = Object.entries(contexte.stockage.donnees.membres[serveur.id] ?? {});
    const palier = contexte.configuration.niveaux.palier;

    const totalXp = membres.reduce((somme, [, element]) => somme + (element.xp ?? 0), 0);
    const totalDucats = membres.reduce(
      (somme, [, element]) => somme + (element.ducats ?? 0) + (element.epargne ?? 0),
      0,
    );
    const messages = membres.reduce((somme, [, element]) => somme + (element.messages ?? 0), 0);
    const meilleur = membres
      .map(([id, element]) => ({ id, xp: element.xp ?? 0 }))
      .sort((a, b) => b.xp - a.xp)[0];

    const avertissements = contexte.stockage.donnees.avertissements.filter(
      (element) => element.serveurId === serveur.id,
    ).length;
    const signalements = contexte.stockage.signalements(serveur.id).length;
    const liens = Object.keys(contexte.stockage.donnees.liens).filter((cle) =>
      cle.startsWith(`${serveur.id}:`),
    ).length;

    await interaction.reply({
      embeds: [
        information(
          [
            `**Membres :** ${serveur.memberCount} · **Salons :** ${serveur.channels.cache.size} · **Rôles :** ${serveur.roles.cache.size}`,
            `**Boosts :** ${serveur.premiumSubscriptionCount ?? 0} (niveau ${serveur.premiumTier})`,
            `**Créé le :** ${horodatage(serveur.createdAt)}`,
            "",
            `**Membres suivis par le bot :** ${membres.length}`,
            `**Messages comptés :** ${messages}`,
            `**Expérience distribuée :** ${totalXp} points`,
            meilleur
              ? `**Premier du classement :** <@${meilleur.id}> — niveau ${niveauPourXp(meilleur.xp, palier)} (${meilleur.xp} XP)`
              : null,
            `**Ducats en circulation :** ${totalDucats}`,
            "",
            `**Avertissements enregistrés :** ${avertissements}`,
            `**Signalements :** ${signalements}`,
            `**Fiches rattachées au wiki :** ${liens}`,
          ]
            .filter((ligne) => ligne !== null)
            .join("\n"),
          `Statistiques de ${serveur.name}`,
        ),
      ],
    });
  },
};

const cmdJournal = {
  nom: "journal",
  categorie: "système",
  resume: "Montre où le bot écrit ses traces.",
  detail:
    "Quatre destinations : le journal d'activité, les alertes, les signalements et les sanctions. Une trace n'existe que si le salon correspondant est configuré.",
  niveau: "moderateur",
  permissions: null,
  donnees: new SlashCommandBuilder().setName("journal").setDescription("Affiche la configuration des traces du bot."),
  async executer(interaction, contexte) {
    const reglages = contexte.stockage.serveur(interaction.guildId);
    const salon = (identifiant) => (identifiant ? `<#${identifiant}>` : "*non configuré*");

    const avertissements = contexte.stockage.donnees.avertissements.filter(
      (element) => element.serveurId === interaction.guildId,
    );
    const signalements = contexte.stockage.signalements(interaction.guildId);
    const alertes = contexte.stockage.alertes(interaction.guildId, 5);

    await interaction.reply({
      embeds: [
        information(
          [
            `**Journal d'activité :** ${salon(reglages.journal)}`,
            `**Alertes :** ${salon(reglages.alertes)}`,
            `**Sanctions enregistrées :** ${avertissements.length}`,
            `**Signalements :** ${signalements.length} (dont ${signalements.filter((element) => element.statut === "ouvert").length} ouverts)`,
            "",
            alertes.length > 0
              ? `**Cinq dernières alertes :**\n${alertes
                  .map((element) => `- ${element.type} — ${horodatage(element.date)}`)
                  .join("\n")}`
              : "**Aucune alerte enregistrée.**",
          ].join("\n"),
          "Traces du bot",
        ),
      ],
      flags: 64,
    });
  },
};

export const COMMANDES_SYSTEME = [
  cmdPing,
  cmdAide,
  cmdBotInfo,
  cmdInvite,
  cmdSupport,
  cmdStatistiques,
  cmdJournal,
];
