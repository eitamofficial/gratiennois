/**
 * Commandes du wiki.
 *
 * Le bot ne rédige rien : il **lit** le wiki public et **signale** au wiki les
 * changements de rôles du serveur. Les commandes de ce fichier sont donc de
 * deux sortes :
 *
 *  - consultation (`/wiki`, `/page`, `/wiki-etat`) — tout le monde ;
 *  - rattachement (`/lien`, `/synchroniser`) — la modération, car cela écrit
 *    dans les fiches du wiki.
 *
 * La synchronisation en masse se fait par lots de vingt : c'est la limite que
 * la route `/api/sync/bot` accepte par appel, et un lot refusé n'annule pas les
 * autres.
 */

import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { attention, champs, information, or, succes } from "../lib/embres.js";
import { horodatage } from "../lib/duree.js";
import { ErreurUtilisateur } from "./erreurs.js";
import { MAX_LIENS, article, chercher, lienPage, lireRoster, pagesPourMembre, pousserLiens, sante } from "../wiki.js";

/** Transforme l'extrait de recherche du wiki en texte Discord. */
function extrait(html) {
  return String(html ?? "")
    .replace(/<mark>/gi, "**")
    .replace(/<\/mark>/gi, "**")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const cmdWiki = {
  nom: "wiki",
  categorie: "wiki",
  resume: "Cherche un article du wiki.",
  detail:
    "Interroge la recherche publique du wiki et renvoie les articles les plus pertinents, avec un extrait et le lien direct.",
  donnees: new SlashCommandBuilder()
    .setName("wiki")
    .setDescription("Cherche un article sur le wiki du Delphinat.")
    .addStringOption((option) =>
      option.setName("recherche").setDescription("Mots-clés à chercher").setRequired(true).setMaxLength(200),
    )
    .addStringOption((option) =>
      option
        .setName("categorie")
        .setDescription("Restreindre à une catégorie (facultatif)")
        .setRequired(false)
        .setMaxLength(40),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply();
    const requete = interaction.options.getString("recherche", true);
    const categorie = interaction.options.getString("categorie") ?? undefined;

    if (!contexte.configuration.wikiUrl) {
      throw new ErreurUtilisateur("Le wiki n'est pas configuré (WIKI_URL manquant).");
    }

    const resultat = await chercher(contexte.configuration, requete, categorie);
    if (!resultat.ok) throw new ErreurUtilisateur(resultat.raison);

    const donnees = resultat.donnees ?? {};
    const trouves = Array.isArray(donnees.results) ? donnees.results : [];

    if (trouves.length === 0) {
      const suggestions = (donnees.suggestions ?? []).slice(0, 5);
      await interaction.editReply({
        embeds: [
          or(
            [
              `Aucun article ne correspond à **${requete}**.`,
              suggestions.length > 0 ? `\n**Essayez plutôt :** ${suggestions.join(", ")}` : null,
              contexte.configuration.wikiUrl
                ? `\n[Rechercher directement sur le wiki](${contexte.configuration.wikiUrl}/recherche?q=${encodeURIComponent(requete)})`
                : null,
            ]
              .filter(Boolean)
              .join("\n"),
            "Aucun résultat",
          ),
        ],
      });
      return;
    }

    const lignes = trouves.slice(0, 5).map((element) => {
      const lien = contexte.configuration.wikiUrl
        ? `[${element.title}](${contexte.configuration.wikiUrl}/wiki/${element.slug})`
        : `**${element.title}**`;
      const resume = extrait(element.excerpt ?? element.summary ?? "");
      return `${lien} — *${element.category ?? "sans catégorie"}*\n${resume.slice(0, 220)}`;
    });

    const total = Number(donnees.total ?? trouves.length);
    const entete = `${total} article${total > 1 ? "s" : ""} pour **${requete}**`;

    await interaction.editReply({
      embeds: [
        or(lignes.join("\n\n"), `Wiki — ${entete}`).setFooter({
          text: "DelphinaBot · IIIe Delphinat de Gratianopolis · recherche publique du wiki",
        }),
      ],
    });
  },
};

const cmdPage = {
  nom: "page",
  categorie: "wiki",
  resume: "Affiche la fiche d'un article à partir de son adresse.",
  detail: "Renvoie le titre, la catégorie et le résumé d'une page, avec le lien vers le wiki.",
  donnees: new SlashCommandBuilder()
    .setName("page")
    .setDescription("Affiche une page du wiki à partir de son identifiant.")
    .addStringOption((option) =>
      option
        .setName("slug")
        .setDescription("Identifiant de la page, tel qu'il apparaît dans son adresse")
        .setRequired(true)
        .setMaxLength(120),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply();
    const slug = interaction.options.getString("slug", true).trim().toLowerCase().replace(/\s+/g, "-");

    const resultat = await article(contexte.configuration, slug);
    if (!resultat.ok) throw new ErreurUtilisateur(resultat.raison);

    const donnees = resultat.donnees?.article ?? resultat.donnees ?? {};
    if (!donnees || !donnees.title) {
      throw new ErreurUtilisateur(`La page « ${slug} » n'existe pas sur le wiki.`);
    }

    const adresse = lienPage(contexte.configuration, slug);
    await interaction.editReply({
      embeds: [
        or(
          [
            adresse ? `[Lire la page complète](${adresse})` : null,
            donnees.summary ? `\n${donnees.summary}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          donnees.title,
        ).addFields(
          champs([
            ["Catégorie", donnees.category ?? "—", true],
            ["Dernière mise à jour", donnees.updatedAt ? horodatage(donnees.updatedAt) : "—", true],
          ]),
        ),
      ],
    });
  },
};

/** Rattache un membre au wiki, d'après ses rôles et son pseudonyme. */
async function rattacher(contexte, membre, interaction) {
  const roster = contexte.roster;
  const nomsRole = membre.roles.cache
    .filter((role) => role.id !== interaction.guildId)
    .map((role) => role.name);
  const pseudonymes = [membre.displayName, membre.user.username, membre.nickname].filter(Boolean);

  const slugs = pagesPourMembre(roster, { nomsRole, pseudonymes });
  if (slugs.length === 0) {
    return {
      slugs: [],
      resultat: {
        envoye: false,
        raison:
          "Aucun rôle ni pseudonyme de ce membre ne correspond à une fiche de la configuration partagée.",
      },
    };
  }

  const liens = slugs.map((slug) => ({ slug, discordUserId: membre.id }));
  const resultat = await pousserLiens(contexte.configuration, liens, `lien:${interaction.user.id}`);
  if (resultat.envoye) contexte.stockage.noterLien(interaction.guildId, membre.id, slugs);
  return { slugs, resultat };
}

const cmdValiderLien = {
  nom: "valider-lien",
  categorie: "wiki",
  resume: "Transmet au wiki le rattachement d'un membre.",
  detail:
    "Le bot déduit la fiche à partir des rôles Discord et du pseudonyme du membre (voir `/lien`), puis signe le rattachement en HMAC avant de l'envoyer au wiki. Aucun identifiant Discord n'est jamais publié par le wiki.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ManageRoles,
  donnees: new SlashCommandBuilder()
    .setName("valider-lien")
    .setDescription("Transmet au wiki le rattachement d'un membre.")
    .addUserOption((option) =>
      option.setName("membre").setDescription("Le membre à rattacher").setRequired(true),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply({ flags: 64 });
    const membre = interaction.options.getMember("membre");
    if (!membre) throw new ErreurUtilisateur("Ce membre n'est pas sur le serveur.");

    const { slugs, resultat } = await rattacher(contexte, membre, interaction);

    if (slugs.length === 0) {
      await interaction.editReply({ embeds: [attention(resultat.raison, "Rien à rattacher")] });
      return;
    }

    if (!resultat.envoye) {
      await interaction.editReply({
        embeds: [
          attention(
            `Fiches détectées : ${slugs.join(", ")}\n\n**Rien n'a été transmis :** ${resultat.raison}`,
            "Rattachement non transmis",
          ),
        ],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        succes(
          [
            `**Membre :** ${membre.displayName} (<@${membre.id}>)`,
            `**Fiches rattachées :** ${slugs.map((slug) => `\`${slug}\``).join(", ")}`,
            resultat.ignores?.length
              ? `**Ignorées par le wiki :** ${resultat.ignores.map((element) => `${element.slug} *(${element.reason})*`).join(", ")}`
              : null,
            resultat.avatar ? "**Photo de profil :** transmise au wiki" : null,
          ]
            .filter(Boolean)
            .join("\n"),
          "Rattachement effectué",
        ),
      ],
    });
  },
};

const cmdSynchroniser = {
  nom: "synchroniser",
  categorie: "wiki",
  resume: "Rattache au wiki tous les membres reconnus.",
  detail:
    "Parcourt les membres du serveur, déduit les fiches de chacun, et envoie les rattachements par lots de vingt (la limite de la route signée). Un lot refusé n'annule pas les autres.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ManageGuild,
  donnees: new SlashCommandBuilder()
    .setName("synchroniser")
    .setDescription("Rattache au wiki tous les membres reconnus par leurs rôles.")
    .addBooleanOption((option) =>
      option
        .setName("simulation")
        .setDescription("Montrer ce qui serait envoyé, sans rien envoyer")
        .setRequired(false),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply({ flags: 64 });

    if (!contexte.configuration.secretSync && !interaction.options.getBoolean("simulation")) {
      throw new ErreurUtilisateur(
        "BOT_SYNC_SECRET n'est pas configuré : le wiki refuserait la requête. Le mode `simulation` reste disponible.",
      );
    }

    const membres = await interaction.guild.members.fetch();
    const lots = [];
    const details = [];

    for (const membre of membres.values()) {
      if (membre.user.bot) continue;
      const nomsRole = membre.roles.cache
        .filter((role) => role.id !== interaction.guildId)
        .map((role) => role.name);
      const pseudonymes = [membre.displayName, membre.user.username, membre.nickname].filter(Boolean);
      const slugs = pagesPourMembre(contexte.roster, { nomsRole, pseudonymes });
      if (slugs.length === 0) continue;

      for (const slug of slugs) lots.push({ slug, discordUserId: membre.id });
      details.push(`${membre.displayName} → ${slugs.join(", ")}`);
    }

    if (lots.length === 0) {
      await interaction.editReply({
        embeds: [
          attention(
            "Aucun membre ne correspond à une fiche de `shared/roster.json`. Vérifiez les libellés de rôles dans ce fichier.",
            "Rien à synchroniser",
          ),
        ],
      });
      return;
    }

    if (interaction.options.getBoolean("simulation")) {
      await interaction.editReply({
        embeds: [
          information(
            [
              `**${lots.length} rattachements** seraient envoyés en ${Math.ceil(lots.length / MAX_LIENS)} lot(s).`,
              "",
              details.slice(0, 20).join("\n"),
              details.length > 20 ? `… et ${details.length - 20} autres.` : "",
            ].join("\n"),
            "Simulation de synchronisation",
          ),
        ],
      });
      return;
    }

    let envoyes = 0;
    const echecs = [];
    for (let debut = 0; debut < lots.length; debut += MAX_LIENS) {
      const lot = lots.slice(debut, debut + MAX_LIENS);
      const resultat = await pousserLiens(contexte.configuration, lot, `synchroniser:${interaction.user.id}`);
      if (resultat.envoye) envoyes += lot.length;
      else echecs.push(resultat.raison);
    }

    // On mémorise ce qui est passé, pour que `/wiki-etat` puisse le montrer.
    for (const membre of membres.values()) {
      const slugs = details
        .filter((ligne) => ligne.startsWith(`${membre.displayName} → `))
        .flatMap((ligne) => ligne.split("→ ")[1].split(", "));
      if (slugs.length > 0) contexte.stockage.noterLien(interaction.guildId, membre.id, slugs);
    }

    await interaction.editReply({
      embeds: [
        (echecs.length === 0 ? succes : attention)(
          [
            `**${envoyes} rattachements transmis** sur ${lots.length} détectés, en ${Math.ceil(lots.length / MAX_LIENS)} lot(s).`,
            echecs.length > 0 ? `\n**Échecs :** ${[...new Set(echecs)].join(" · ")}` : null,
            "\nLes identifiants Discord ne sont jamais publiés : le wiki ne s'en sert que pour rattacher la fiche à la photo de profil.",
          ]
            .filter(Boolean)
            .join("\n"),
          "Synchronisation terminée",
        ),
      ],
    });
  },
};

const cmdWikiEtat = {
  nom: "wiki-etat",
  categorie: "wiki",
  resume: "État de la liaison entre le bot et le wiki.",
  donnees: new SlashCommandBuilder()
    .setName("wiki-etat")
    .setDescription("Vérifie que le wiki répond et montre la configuration partagée."),
  async executer(interaction, contexte) {
    await interaction.deferReply();

    const configuration = contexte.configuration;
    const roster = lireRoster(configuration.roster);
    const resultatSante = configuration.wikiUrl ? await sante(configuration) : { ok: false, raison: "WIKI_URL non configuré." };

    const santeWiki = resultatSante.ok
      ? `joignable (${resultatSante.donnees?.storage ?? "stockage inconnu"})`
      : `injoignable — ${resultatSante.raison}`;

    const rattaches = roster.personnages.filter((personnage) => personnage.discordUserId).length;
    const constat = resultatSante.ok ? information : attention;

    await interaction.editReply({
      embeds: [
        constat(
          [
            `**Wiki :** ${configuration.wikiUrl || "non configuré"}`,
            `**État :** ${santeWiki}`,
            `**Configuration partagée :** version ${roster.version} · ${roster.personnages.length} personnages (${rattaches} déjà renseignés dans le fichier) · ${roster.roleMapping.length} rôles institutionnels`,
            `**Synchronisation :** ${
              configuration.secretSync
                ? "signée en HMAC-SHA256 (en-têtes `x-wiki-signature` / `x-wiki-timestamp`)"
                : "désactivée — `BOT_SYNC_SECRET` absent"
            }`,
            `**Fiches déjà liées par le bot :** ${Object.keys(contexte.stockage.donnees.liens).length}`,
            "",
            "Le wiki ne publie jamais un identifiant Discord : la synchronisation ne fait que rattacher une fiche à la photo de profil du membre.",
          ].join("\n"),
          "Liaison avec le wiki",
        ),
      ],
    });
  },
};

const cmdLien = {
  nom: "lien",
  categorie: "wiki",
  resume: "Montre à quelle fiche du wiki un membre correspond.",
  detail:
    "Lecture seule : le bot montre les fiches déduites des rôles et du pseudonyme, et ce qui a déjà été transmis. C'est `/valider-lien` qui écrit dans le wiki.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ManageRoles,
  donnees: new SlashCommandBuilder()
    .setName("lien")
    .setDescription("Montre les fiches du wiki correspondant à un membre.")
    .addUserOption((option) =>
      option.setName("membre").setDescription("Le membre à examiner").setRequired(true),
    ),
  async executer(interaction, contexte) {
    const membre = interaction.options.getMember("membre");
    if (!membre) throw new ErreurUtilisateur("Ce membre n'est pas sur le serveur.");

    const nomsRole = membre.roles.cache
      .filter((role) => role.id !== interaction.guildId)
      .map((role) => role.name);
    const pseudonymes = [membre.displayName, membre.user.username, membre.nickname].filter(Boolean);
    const slugs = pagesPourMembre(contexte.roster, { nomsRole, pseudonymes });
    const precedent = contexte.stockage.lien(interaction.guildId, membre.id);

    const lignes = [
      `**Membre :** ${membre.displayName} (<@${membre.id}>)`,
      `**Rôles portés :** ${nomsRole.slice(0, 12).join(", ") || "aucun"}`,
      "",
      slugs.length > 0
        ? `**Fiches correspondantes :** ${slugs.map((slug) => `\`${slug}\``).join(", ")}`
        : "**Aucune fiche** ne correspond : vérifiez les libellés de rôles et les alias dans `shared/roster.json`.",
      "",
      precedent
        ? `**Dernier envoi :** ${precedent.slugs.join(", ")} — ${horodatage(precedent.date)}`
        : "**Dernier envoi :** aucun",
      "",
      slugs.length > 0 ? "Transmettez avec `/valider-lien`." : null,
    ];

    await interaction.reply({
      embeds: [(slugs.length > 0 ? information : attention)(lignes.filter(Boolean).join("\n"), "Rattachement wiki")],
      flags: 64,
    });
  },
};

export const COMMANDES_WIKI = [cmdWiki, cmdPage, cmdLien, cmdValiderLien, cmdSynchroniser, cmdWikiEtat];
