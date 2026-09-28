/**
 * Commandes de sécurité.
 *
 * `/configurer` regroupe tous les réglages d'un serveur : c'est la seule
 * commande que l'administration est amenée à retenir. `/audit` fait le
 * contrepoint, en montrant ce qui est exposé. Entre les deux, un serveur se
 * règle en cinq minutes et se vérifie en une seule commande.
 */

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import type { Commande } from "../core/types.js";
import { Boutons } from "../core/types.js";
import { commande, confirmation, executer, repondre } from "./outils.js";
import { enregistrerReglages, lireReglages, type ReglagesServeur } from "../db/serveur.js";
import { journaliser } from "../db/journal.js";
import { attention, champs, erreur, or, succes } from "../lib/embres.js";
import { normaliser } from "../lib/texte.js";
import { deverrouiller, verrouiller } from "../modules/securite/verrou.js";
import { demanderLien, lireLien, validerLien } from "../db/liens.js";
import { listerSanctions } from "../db/sanctions.js";

/** Rôle du salon choisi dans `/configurer salons`. */
const EMPLOIS_SALON: Record<string, keyof ReglagesServeur> = {
  "journal": "salonLogs",
  "alertes": "salonAlertes",
  "accueil": "salonBienvenue",
  "signalements": "salonSignalements",
  "punitions": "salonPunitions",
};

/** Rôle du rôle choisi dans `/configurer roles`. */
const EMPLOIS_ROLE: Record<string, keyof ReglagesServeur> = {
  "administration": "roleAdmin",
  "moderation": "roleModeration",
  "sourdine": "roleMute",
  "dj": "roleDj",
  "quarantaine": "roleQuarantaine",
  "accueil": "roleBienvenue",
  "verification": "roleVerification",
  "automatique": "roleAutomatique",
};

const LIBELLES_SALON: Record<string, string> = {
  journal: "journal d'activité",
  alertes: "alertes de sécurité",
  accueil: "salon d'accueil",
  signalements: "signalements",
  punitions: "sanctions",
};

const LIBELLES_ROLE: Record<string, string> = {
  administration: "administration",
  moderation: "équipe de modération",
  sourdine: "sourdine",
  dj: "DJ",
  quarantaine: "quarantaine",
  accueil: "accueil",
  verification: "vérification",
  automatique: "rôle automatique",
};

/** Noms lisibles des réglages techniques, pour les confirmations. */
const LIBELLES_PROTECTION: Record<string, string> = {
  antiRaid: "anti-raid",
  raidSeuil: "seuil de raid",
  raidFenetreSecondes: "fenêtre de raid",
  protectionMentions: "anti-mentions",
  mentionsMax: "mentions maximum",
  protectionFlood: "anti-flood",
  floodMax: "flood maximum",
  protectionLiens: "anti-liens",
  protectionMots: "anti-mots",
  xpActif: "XP",
  xpMultiplicateur: "multiplicateur d'XP",
  gainsParMessage: "ducats par message",
  gainsMaxJour: "plafond journalier",
  musiqueAutorisee: "musique autorisée",
  volumeDefaut: "volume par défaut",
};

/** Résumé lisible de tous les réglages. */
function resumeReglages(reglages: ReglagesServeur): EmbedBuilder {
  return or(
    [
      "**Salons**",
      `Journal : ${reglages.salonLogs ?? "aucun"}`,
      `Alertes : ${reglages.salonAlertes ?? "aucun"}`,
      `Accueil : ${reglages.salonBienvenue ?? "aucun"}`,
      `Signalements : ${reglages.salonSignalements ?? "aucun"}`,
      `Sanctions : ${reglages.salonPunitions ?? "aucun"}`,
      "",
      "**Rôles**",
      `Administration : ${reglages.roleAdmin ?? "aucun"}`,
      `Modération : ${reglages.roleModeration ?? "aucun"}`,
      `Sourdine : ${reglages.roleMute ?? "aucun"}`,
      `DJ : ${reglages.roleDj ?? "aucun"}`,
      `Quarantaine : ${reglages.roleQuarantaine ?? "aucun"}`,
      `Accueil : ${reglages.roleBienvenue ?? "aucun"}`,
      `Vérification : ${reglages.roleVerification ?? "aucun"}`,
      `Automatique : ${reglages.roleAutomatique ?? "aucun"}`,
      "",
      "**Protection**",
      `Anti-raid : ${reglages.antiRaid ? "activé" : "désactivé"} (${reglages.raidSeuil} arrivées en ${reglages.raidFenetreSecondes} s)`,
      `Anti-mentions : ${reglages.protectionMentions ? "activée" : "désactivée"} (maximum ${reglages.mentionsMax})`,
      `Anti-flood : ${reglages.protectionFlood ? "activé" : "désactivé"} (maximum ${reglages.floodMax} messages en 10 s)`,
      `Anti-liens : ${reglages.protectionLiens ? "activé" : "désactivé"}`,
      `Domaines autorisés : ${reglages.liensAutorises.join(", ") || "aucun"}`,
      `Mots interdits : ${reglages.motsInterdits.join(", ") || "aucun"}`,
      `Verrouillé : ${reglages.verrouille ? "oui" : "non"}`,
      "",
      "**Progression et économie**",
      `XP : ${reglages.xpActif ? "activée" : "désactivée"} (×${reglages.xpMultiplicateur}, ${reglages.xpParMessage} XP par message)`,
      `Ducats : ${reglages.economieActive ? "actifs" : "désactivés"} (${reglages.gainsParMessage} par message, plafond ${reglages.gainsMaxJour} par jour)`,
      "",
      "**Musique**",
      `${reglages.musiqueAutorisee ? "autorisée" : "interdite"} (volume par défaut ${reglages.volumeDefaut} %)`,
    ].join("\n"),
    "Réglages de ce serveur",
  );
}

const cmdConfigurer: Commande = {
  nom: "configurer",
  categorie: "securite",
  niveau: "admin",
  usage: "/configurer <salons|roles|proteger|progression|musique|domaines|mots|afficher>",
  resume: "Règle les salons, rôles et protections de ce serveur.",
  donnees: commande("configurer", "Règle les salons, rôles et protections de ce serveur.")
    .addSubcommand((sous) =>
      sous
        .setName("salons")
        .setDescription("Choisit un salon du bot.")
        .addStringOption((option) =>
          option
            .setName("emploi")
            .setDescription("Emploi du salon")
            .setRequired(true)
            .addChoices(
              { name: "Journal d'activité", value: "journal" },
              { name: "Alertes de sécurité", value: "alertes" },
              { name: "Salon d'accueil", value: "accueil" },
              { name: "Signalements", value: "signalements" },
              { name: "Sanctions", value: "punitions" },
            ),
        )
        .addChannelOption((option) =>
          option
            .setName("salon")
            .setDescription("Salon concerné")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        ),
    )
    .addSubcommand((sous) =>
      sous
        .setName("roles")
        .setDescription("Affecte un rôle à un emploi.")
        .addStringOption((option) =>
          option
            .setName("emploi")
            .setDescription("Emploi du rôle")
            .setRequired(true)
            .addChoices(
              { name: "Administration", value: "administration" },
              { name: "Équipe de modération", value: "moderation" },
              { name: "Sourdine", value: "sourdine" },
              { name: "DJ", value: "dj" },
              { name: "Quarantaine", value: "quarantaine" },
              { name: "Accueil", value: "accueil" },
              { name: "Vérification", value: "verification" },
              { name: "Rôle automatique", value: "automatique" },
            ),
        )
        .addRoleOption((option) =>
          option.setName("role").setDescription("Rôle concerné").setRequired(true),
        ),
    )
    .addSubcommand((sous) =>
      sous
        .setName("proteger")
        .setDescription("Ajuste les protections automatiques.")
        .addBooleanOption((option) => option.setName("anti-raid").setDescription("Détecte les arrivées massives."))
        .addIntegerOption((option) =>
          option
            .setName("seuil-raid")
            .setDescription("Nombre d'arrivées déclenchant le verrouillage.")
            .setMinValue(2)
            .setMaxValue(200),
        )
        .addIntegerOption((option) =>
          option
            .setName("fenetre-raid")
            .setDescription("Fenêtre de détection, en secondes.")
            .setMinValue(2)
            .setMaxValue(300),
        )
        .addBooleanOption((option) => option.setName("anti-mentions").setDescription("Limite les mentions en masse."))
        .addIntegerOption((option) =>
          option
            .setName("max-mentions")
            .setDescription("Mentions autorisées par message.")
            .setMinValue(1)
            .setMaxValue(50),
        )
        .addBooleanOption((option) => option.setName("anti-flood").setDescription("Limite l'enchaînement de messages."))
        .addIntegerOption((option) =>
          option
            .setName("max-flood")
            .setDescription("Messages autorisés en dix secondes.")
            .setMinValue(3)
            .setMaxValue(50),
        )
        .addBooleanOption((option) => option.setName("anti-liens").setDescription("Filtre les liens non autorisés."))
        .addBooleanOption((option) => option.setName("anti-mots").setDescription("Filtre les mots interdits.")),
    )
    .addSubcommand((sous) =>
      sous
        .setName("progression")
        .setDescription("Règle l'XP et l'économie.")
        .addBooleanOption((option) => option.setName("xp").setDescription("Active l'XP."))
        .addNumberOption((option) =>
          option.setName("multiplicateur-xp").setDescription("Multiplicateur d'XP.").setMinValue(0.1).setMaxValue(10),
        )
        .addIntegerOption((option) =>
          option.setName("ducats").setDescription("Ducats gagnés par message.").setMinValue(0).setMaxValue(100),
        )
        .addIntegerOption((option) =>
          option
            .setName("plafond")
            .setDescription("Ducats gagnables par jour.")
            .setMinValue(0)
            .setMaxValue(100_000),
        ),
    )
    .addSubcommand((sous) =>
      sous
        .setName("musique")
        .setDescription("Règle la musique.")
        .addBooleanOption((option) => option.setName("autorisee").setDescription("Autorise la musique."))
        .addIntegerOption((option) =>
          option
            .setName("volume")
            .setDescription("Volume par défaut, de 0 à 100.")
            .setMinValue(0)
            .setMaxValue(100),
        ),
    )
    .addSubcommand((sous) =>
      sous
        .setName("domaines")
        .setDescription("Ajoute un domaine à la liste blanche de liens.")
        .addStringOption((option) =>
          option.setName("domaine").setDescription("Domaine autorisé, par exemple github.com.").setRequired(true),
        ),
    )
    .addSubcommand((sous) =>
      sous
        .setName("mots")
        .setDescription("Ajoute un mot au filtre.")
        .addStringOption((option) =>
          option.setName("mot").setDescription("Mot à surveiller.").setRequired(true),
        ),
    )
    .addSubcommand((sous) => sous.setName("afficher").setDescription("Affiche tous les réglages.")),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const sous = interaction.options.getSubcommand();
      const guild = interaction.guild;
      if (!guild) return;

      if (sous === "salons") {
        const emploi = interaction.options.getString("emploi", true);
        const salon = interaction.options.getChannel("salon", true);
        const cle = EMPLOIS_SALON[emploi];
        if (!cle) return;

        await enregistrerReglages(guild.id, { [cle]: salon.id });
        await journaliser({
          serveurId: guild.id,
          type: "configuration",
          utilisateurId: interaction.user.id,
          cibleId: salon.id,
          details: { cle, emploi },
        });
        await confirmation(
          { bot, interaction, serveur },
          `Salon « ${LIBELLES_SALON[emploi] ?? emploi} » réglé sur ${salon}.`,
        );
        return;
      }

      if (sous === "roles") {
        const emploi = interaction.options.getString("emploi", true);
        const role = interaction.options.getRole("role", true);
        const cle = EMPLOIS_ROLE[emploi];
        if (!cle) return;

        if (role.managed) {
          await repondre(
            interaction,
            erreur("Ce rôle est géré par une intégration : Discord interdit de l'affecter à une commande."),
          );
          return;
        }
        if (role.position >= (guild.members.me?.roles.highest.position ?? 0)) {
          await repondre(
            interaction,
            erreur(
              "Ce rôle est au-dessus de celui du bot : remontez DelphinaBot dans la liste des rôles pour pouvoir le gérer.",
            ),
          );
          return;
        }

        await enregistrerReglages(guild.id, { [cle]: role.id });
        await journaliser({
          serveurId: guild.id,
          type: "configuration",
          utilisateurId: interaction.user.id,
          cibleId: role.id,
          details: { cle, emploi },
        });
        await confirmation(
          { bot, interaction, serveur },
          `Rôle « ${LIBELLES_ROLE[emploi] ?? emploi} » réglé sur ${role}.`,
        );
        return;
      }

      if (sous === "proteger") {
        const changements: Partial<ReglagesServeur> = {};
        for (const [option, cle] of [
          ["anti-raid", "antiRaid"],
          ["anti-mentions", "protectionMentions"],
          ["anti-flood", "protectionFlood"],
          ["anti-liens", "protectionLiens"],
          ["anti-mots", "protectionMots"],
        ] as const) {
          const valeur = interaction.options.getBoolean(option);
          if (typeof valeur === "boolean") (changements as Record<string, unknown>)[cle] = valeur;
        }
        for (const [option, cle] of [
          ["seuil-raid", "raidSeuil"],
          ["fenetre-raid", "raidFenetreSecondes"],
          ["max-mentions", "mentionsMax"],
          ["max-flood", "floodMax"],
        ] as const) {
          const valeur = interaction.options.getInteger(option);
          if (typeof valeur === "number") (changements as Record<string, unknown>)[cle] = valeur;
        }

        await enregistrerReglages(guild.id, changements);
        await journaliser({
          serveurId: guild.id,
          type: "configuration",
          utilisateurId: interaction.user.id,
          cibleId: null,
          details: { protections: changements },
        });
        const noms = Object.keys(changements).map((cle) => LIBELLES_PROTECTION[cle] ?? cle);
        await confirmation(
          { bot, interaction, serveur },
          noms.length > 0 ? `Protections enregistrées : ${noms.join(", ")}.` : "Aucun réglage n'a été fourni.",
        );
        return;
      }

      if (sous === "progression") {
        const changements: Partial<ReglagesServeur> = {};
        const xp = interaction.options.getBoolean("xp");
        if (typeof xp === "boolean") changements.xpActif = xp;

        const multiplicateur = interaction.options.getNumber("multiplicateur-xp");
        if (typeof multiplicateur === "number") changements.xpMultiplicateur = multiplicateur;

        const ducats = interaction.options.getInteger("ducats");
        if (typeof ducats === "number") changements.gainsParMessage = ducats;

        const plafond = interaction.options.getInteger("plafond");
        if (typeof plafond === "number") changements.gainsMaxJour = plafond;

        await enregistrerReglages(guild.id, changements);
        const noms = Object.keys(changements).map((cle) => LIBELLES_PROTECTION[cle] ?? cle);
        await confirmation(
          { bot, interaction, serveur },
          noms.length > 0 ? `Progression enregistrée : ${noms.join(", ")}.` : "Aucun réglage n'a été fourni.",
        );
        return;
      }

      if (sous === "musique") {
        const changements: Partial<ReglagesServeur> = {};
        const autorisee = interaction.options.getBoolean("autorisee");
        if (typeof autorisee === "boolean") changements.musiqueAutorisee = autorisee;
        const volume = interaction.options.getInteger("volume");
        if (typeof volume === "number") changements.volumeDefaut = volume;

        await enregistrerReglages(guild.id, changements);
        const noms = Object.keys(changements).map((cle) => LIBELLES_PROTECTION[cle] ?? cle);
        await confirmation(
          { bot, interaction, serveur },
          noms.length > 0 ? `Musique : ${noms.join(", ")} enregistré(s).` : "Aucun réglage n'a été fourni.",
        );
        return;
      }

      if (sous === "domaines") {
        const domaine = normaliser(interaction.options.getString("domaine", true)).replace(/\s+/g, "");
        const actuels = serveur.liensAutorises;
        if (actuels.includes(domaine)) {
          await confirmation({ bot, interaction, serveur }, `Le domaine « ${domaine} » est déjà autorisé.`);
          return;
        }
        await enregistrerReglages(guild.id, { liensAutorises: [...actuels, domaine] });
        await confirmation({ bot, interaction, serveur }, `Domaine « ${domaine} » ajouté à la liste blanche.`);
        return;
      }

      if (sous === "mots") {
        const mot = normaliser(interaction.options.getString("mot", true));
        if (serveur.motsInterdits.includes(mot)) {
          await confirmation({ bot, interaction, serveur }, `Le mot « ${mot} » est déjà surveillé.`);
          return;
        }
        await enregistrerReglages(guild.id, { motsInterdits: [...serveur.motsInterdits, mot] });
        await confirmation({ bot, interaction, serveur }, `Le mot « ${mot} » est désormais surveillé.`);
        return;
      }

      await repondre(interaction, resumeReglages(await lireReglages(guild.id)));
    });
  },
};

const cmdVerrouiller: Commande = {
  nom: "verrouiller",
  categorie: "securite",
  niveau: "admin",
  usage: "/verrouiller [raison]",
  resume: "Verrouille le serveur : les nouveaux membres sont mis en quarantaine.",
  donnees: commande("verrouiller", "Verrouille le serveur (mesure d'urgence).").addStringOption((option) =>
    option.setName("raison").setDescription("Motif du verrouillage, visible dans le salon d'alerte."),
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      const raison = interaction.options.getString("raison") ?? "aucun motif indiqué";

      const resultat = await verrouiller(guild, interaction.user.id, raison);
      if (!resultat.ok) {
        await repondre(interaction, erreur(resultat.raison ?? "Verrouillage impossible."));
        return;
      }

      await repondre(
        interaction,
        succes(
          [
            `Serveur verrouillé. Motif : ${raison}.`,
            resultat.nombre > 0 ? `${resultat.nombre} membre(s) placé(s) en quarantaine.` : "",
            serveur.salonAlertes ? "Annonce envoyée dans le salon d'alerte." : "",
            "N'oubliez pas de prévenir votre équipe de modération.",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      );
    });
  },
};

const cmdDeverrouiller: Commande = {
  nom: "deverrouiller",
  categorie: "securite",
  niveau: "admin",
  usage: "/deverrouiller",
  resume: "Lève le verrouillage du serveur.",
  donnees: commande("deverrouiller", "Lève le verrouillage du serveur."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;

      const resultat = await deverrouiller(guild, interaction.user.id);
      if (!resultat.ok) {
        await repondre(interaction, erreur(resultat.raison ?? "Déverrouillage impossible."));
        return;
      }
      await repondre(
        interaction,
        succes(
          `Serveur déverrouillé.${resultat.nombre > 0 ? ` ${resultat.nombre} membre(s) sorti(s) de quarantaine.` : ""}`,
        ),
      );
    });
  },
};

/**
 * Noms lisibles des permissions dangereuses.
 *
 * `PermissionFlagsBits` s'indexe par chaîne, pas par `bigint` : sans cette
 * table, l'audit afficherait des nombres, ce qui n'aide personne à décider
 * qu'il faut retirer un rôle.
 */
const NOMS_PERMISSIONS: [permission: bigint, nom: string][] = [
  [PermissionFlagsBits.Administrator, "Administrateur"],
  [PermissionFlagsBits.ManageGuild, "gestion du serveur"],
  [PermissionFlagsBits.ManageRoles, "gestion des rôles"],
  [PermissionFlagsBits.ManageWebhooks, "gestion des crochets"],
  [PermissionFlagsBits.BanMembers, "bannissement"],
  [PermissionFlagsBits.KickMembers, "exclusion"],
  [PermissionFlagsBits.MentionEveryone, "mention générale"],
];

/** Nom lisible d'une permission, ou sa valeur si elle n'est pas listée. */
function nomPermission(permission: bigint): string {
  return NOMS_PERMISSIONS.find(([valeur]) => valeur === permission)?.[1] ?? String(permission);
}

const cmdAudit: Commande = {
  nom: "audit",
  categorie: "securite",
  niveau: "admin",
  usage: "/audit",
  resume: "Signale les permissions dangereuses et les protections manquantes.",
  donnees: commande("audit", "Contrôle la sécurité de ce serveur.").setDefaultMemberPermissions(
    PermissionFlagsBits.ManageGuild,
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;

      const membres = await guild.members.fetch();
      const dangereux = [
        PermissionFlagsBits.Administrator,
        PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.ManageWebhooks,
        PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.KickMembers,
      ];

      const comptesATester: { nom: string; nomId: string; detail: string[] }[] = [];
      for (const membre of membres.values()) {
        if (membre.user.bot) continue;
        const exces = dangereux.filter((permission) => membre.permissions.has(permission));
        if (exces.length === 0) continue;
        comptesATester.push({
          nom: membre.displayName,
          nomId: membre.user.tag,
          detail: exces.map((permission) => nomPermission(permission)),
        });
      }
      comptesATester.sort((a, b) => b.detail.length - a.detail.length);
      const trop = comptesATester.slice(0, 10);

      const manquantes: string[] = [];
      if (!serveur.salonAlertes) manquantes.push("Aucun salon d'alerte : le bot ne peut pas prévenir l'équipe.");
      if (!serveur.roleModeration) manquantes.push("Aucun rôle de modération : personne ne reçoit les alertes de sanction.");
      if (!serveur.roleQuarantaine) manquantes.push("Aucun rôle de quarantaine : le verrouillage n'isole personne.");
      if (serveur.antiRaid && serveur.raidSeuil > 20) {
        manquantes.push(
          `Le seuil de raid est fixé à ${serveur.raidSeuil} : un raid passera inaperçu.`,
        );
      }

      const embed = new EmbedBuilder()
        .setColor(manquantes.length > 0 ? 0xb8871f : 0x2f7d4f)
        .setTitle("Audit de sécurité")
        .setDescription(
          trop.length === 0
            ? "Aucun membre ne cumule de permission administrative."
            : `Membres aux permissions élevées (${comptesATester.length}) :\n\n${trop
                .map(
                  (element, index) =>
                    `${index + 1}. **${element.nom}** (${element.nomId}) — ${element.detail.join(", ")}`,
                )
                .join("\n")}`,
        )
        .setFooter({ text: "DelphinaBot · audit" });

      if (manquantes.length > 0) {
        embed.addFields(champs([["À corriger", manquantes.map((ligne) => `• ${ligne}`).join("\n")]]));
      }
      embed.addFields(
        champs([
          ["Membres", String(membres.size)],
          ["Verrouillé", serveur.verrouille ? "oui" : "non"],
          [
            "Protections",
            [
              `Anti-raid : ${serveur.antiRaid ? "oui" : "non"}`,
              `Anti-mentions : ${serveur.protectionMentions ? "oui" : "non"}`,
              `Anti-flood : ${serveur.protectionFlood ? "oui" : "non"}`,
              `Anti-liens : ${serveur.protectionLiens ? "oui" : "non"}`,
            ].join(" · "),
          ],
        ]),
      );

      await repondre(interaction, embed);
    });
  },
};

const cmdAlertes: Commande = {
  nom: "alertes",
  categorie: "securite",
  niveau: "moderation",
  usage: "/alertes",
  resume: "Envoie un message de test dans le salon d'alerte.",
  donnees: commande("alertes", "Teste le salon d'alerte de sécurité."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const salonId = serveur.salonAlertes;
      if (!salonId) {
        await repondre(
          interaction,
          erreur("Aucun salon d'alerte configuré. Utilisez `/configurer salons`."),
        );
        return;
      }
      const salon = interaction.guild?.channels.cache.get(salonId);
      if (!salon || !salon.isTextBased()) {
        await repondre(interaction, erreur("Le salon d'alerte configuré n'existe plus."));
        return;
      }

      const ligne = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(Boutons.deverrouiller)
          .setLabel("Lever le verrou")
          .setStyle(ButtonStyle.Success)
          .setEmoji("🔓"),
      );
      await salon.send({
        embeds: [attention("Ceci est un message de test : le salon d'alerte fonctionne.", "Test d'alerte")],
        components: [ligne],
      });
      await confirmation({ bot, interaction, serveur }, "Message de test envoyé dans le salon d'alerte.");
    });
  },
};

const cmdLien: Commande = {
  nom: "lien",
  categorie: "securite",
  niveau: "membre",
  usage: "/lien <page du wiki>",
  resume: "Demande la validation d'un lien entre votre compte et le wiki.",
  donnees: commande("lien", "Demande la validation d'un lien avec une page du wiki.").addStringOption(
    (option) =>
      option
        .setName("page")
        .setDescription("Nom de la page, par exemple eitam.")
        .setRequired(true),
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const page = interaction.options.getString("page", true).trim().toLowerCase();
      if (!/^[a-z0-9-]{2,80}$/.test(page)) {
        await repondre(
          interaction,
          erreur("Nom de page invalide : utilisez des minuscules, des chiffres et des tirets."),
        );
        return;
      }

      const existant = await lireLien(interaction.user.id);
      await demanderLien(interaction.user.id, page);

      await confirmation(
        { bot, interaction, serveur },
        [
          `Demande enregistrée pour la page « ${page} ».`,
          serveur.roleVerification
            ? `La modération vérifiera votre identité avant de vous attribuer le rôle.`
            : "La modération vérifiera votre identité manuellement.",
          `Page du wiki : ${bot.configuration.wikiUrl}/wiki/${page}`,
          existant?.verifie ? "Votre ancien lien vérifié a été remis à zéro." : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    });
  },
};

const cmdValiderLien: Commande = {
  nom: "valider-lien",
  categorie: "securite",
  niveau: "moderation",
  usage: "/valider-lien <membre>",
  resume: "Valide le lien d'un membre et lui attribue son rôle de vérification.",
  donnees: commande("valider-lien", "Valide le lien de rôle d'un membre.").addUserOption((option) =>
    option.setName("membre").setDescription("Membre dont le lien est validé.").setRequired(true),
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      const cible = interaction.options.getUser("membre", true);
      const membre = await guild.members.fetch(cible.id).catch(() => null);
      if (!membre) {
        await repondre(interaction, erreur("Ce membre n'est pas sur le serveur."));
        return;
      }

      const lien = await lireLien(cible.id);
      if (!lien) {
        await repondre(
          interaction,
          erreur("Ce membre n'a aucune demande de lien. Dites-lui d'utiliser `/lien`."),
        );
        return;
      }
      if (lien.verifie) {
        await repondre(interaction, attention("Ce lien est déjà validé."));
        return;
      }

      await validerLien(cible.id);
      await journaliser({
        serveurId: guild.id,
        type: "lien-valide",
        utilisateurId: interaction.user.id,
        cibleId: cible.id,
        details: { slug: lien.slug },
      });

      let roleAjoute = false;
      const roleId = serveur.roleVerification ?? serveur.roleBienvenue;
      if (roleId) {
        const role = await guild.roles.fetch(roleId);
        if (role && membre.roles.highest.position < role.position) {
          await membre.roles.add(role, "Lien de rôle validé").catch(() => undefined);
          roleAjoute = true;
        }
      }

      await confirmation(
        { bot, interaction, serveur },
        [
          `Lien validé : **${cible.username}** ↔ page « ${lien.slug} ».`,
          roleAjoute
            ? "Rôle de vérification attribué."
            : "Aucun rôle de vérification n'est configuré ou accessible : attribuez-le à la main.",
          `Page : ${bot.configuration.wikiUrl}/wiki/${lien.slug}`,
        ].join("\n"),
      );
    });
  },
};

const cmdHistorique: Commande = {
  nom: "historique",
  categorie: "moderation",
  niveau: "moderation",
  usage: "/historique [membre]",
  resume: "Affiche le dossier de sanctions d'un membre.",
  donnees: commande("historique", "Dossier de sanctions d'un membre.").addUserOption((option) =>
    option.setName("membre").setDescription("Membre concerné (vous-même par défaut)."),
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      const cible = interaction.options.getUser("membre") ?? interaction.user;
      const sanctions = await listerSanctions(guild.id, cible.id, 10);

      if (sanctions.length === 0) {
        await confirmation(
          { bot, interaction, serveur },
          `Aucune sanction enregistrée pour **${cible.username}**.`,
        );
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x3b6ea5)
        .setTitle(`Dossier de ${cible.username}`)
        .setDescription(
          sanctions
            .map(
              (sanction) =>
                `• **${sanction.type}** — ${sanction.raison || "sans motif"}\n  ${
                  sanction.levee ? "levée" : "active"
                } · <t:${Math.round(Date.parse(sanction.creeLe) / 1000)}:d>`,
            )
            .join("\n"),
        );
      await repondre(interaction, embed);
    });
  },
};

export const COMMANDES_SECURITE: Commande[] = [
  cmdConfigurer,
  cmdVerrouiller,
  cmdDeverrouiller,
  cmdAudit,
  cmdAlertes,
  cmdLien,
  cmdValiderLien,
  cmdHistorique,
];
