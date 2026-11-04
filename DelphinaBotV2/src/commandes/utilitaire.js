/**
 * Utilitaires.
 *
 * Huit commandes qui rendent service sans rien modifier : voir une photo de
 * profil, connaître un membre ou un serveur, regarder le temps, calculer,
 * sonder, répéter, chercher.
 *
 * La météo vient d'**Open-Meteo**, qui est gratuit et ne demande aucune clé :
 * c'est le seul service extérieur de ce fichier, et il reste facultatif — s'il
 * ne répond pas, la commande le dit sans casser le reste du bot.
 */

import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { attention, champs, information, or, succes } from "../lib/embres.js";
import { horodatage } from "../lib/duree.js";
import { ErreurUtilisateur } from "./erreurs.js";
import { nomDe } from "./outils.js";

// ---------------------------------------------------------------------------
// Calcul (aucun `eval` : l'entrée vient du réseau)
// ---------------------------------------------------------------------------

const FONCTIONS = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  log: Math.log,
  exp: Math.exp,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
};

/**
 * Évalue une expression arithmétique.
 *
 * Analyseur descendant classique — ni `eval`, ni `Function`. Le langage est
 * fermé : nombres, quatre opérations, puissance, parenthèses, et une poignée
 * de fonctions. Une saisie hostile ne peut donc rien exécuter.
 */
export function calculer(expression) {
  const jetons = String(expression)
    .replace(/,/g, ".")
    .replace(/\s+/g, "")
    .match(/\d+\.?\d*|[+\-*/%^()]|[a-z]+/gi);

  if (!jetons) throw new ErreurUtilisateur("Expression vide.");

  let position = 0;
  const lire = () => jetons[position];
  const avancer = () => jetons[position++];

  function expression_() {
    let gauche = terme();
    while (lire() === "+" || lire() === "-") {
      const operateur = avancer();
      const droite = terme();
      gauche = operateur === "+" ? gauche + droite : gauche - droite;
    }
    return gauche;
  }

  function terme() {
    let gauche = puissance();
    while (lire() === "*" || lire() === "/" || lire() === "%") {
      const operateur = avancer();
      const droite = puissance();
      if ((operateur === "/" || operateur === "%") && droite === 0) {
        throw new ErreurUtilisateur("Division par zéro.");
      }
      gauche = operateur === "*" ? gauche * droite : operateur === "/" ? gauche / droite : gauche % droite;
    }
    return gauche;
  }

  function puissance() {
    const base = facteur();
    if (lire() === "^") {
      avancer();
      return base ** puissance();
    }
    return base;
  }

  function facteur() {
    const jeton = avancer();
    if (jeton === undefined) throw new ErreurUtilisateur("Expression incomplète.");

    if (jeton === "-") return -facteur();
    if (jeton === "+") return facteur();
    if (jeton === "(") {
      const valeur = expression_();
      if (avancer() !== ")") throw new ErreurUtilisateur("Parenthèse fermante manquante.");
      return valeur;
    }
    if (/^\d/.test(jeton)) return Number(jeton);

    const fonction = FONCTIONS[jeton.toLowerCase()];
    if (fonction && avancer() === "(") {
      const valeur = expression_();
      if (avancer() !== ")") throw new ErreurUtilisateur("Parenthèse fermante manquante.");
      return fonction(valeur);
    }
    throw new ErreurUtilisateur(`« ${jeton} » n'est pas un nombre ni une fonction connue.`);
  }

  const resultat = expression_();
  if (position !== jetons.length) throw new ErreurUtilisateur("Expression mal formée.");

  return resultat;
}

// ---------------------------------------------------------------------------
// Météo (Open-Meteo, sans clé)
// ---------------------------------------------------------------------------

/** Traduction des codes temps WMO renvoyés par Open-Meteo. */
const TEMPS = {
  0: "ciel dégagé",
  1: "généralement dégagé",
  2: "partiellement nuageux",
  3: "couvert",
  45: "brouillard",
  48: "brouillard givrant",
  51: "bruine faible",
  53: "bruine",
  55: "bruine forte",
  56: "bruine verglaçante",
  57: "bruine verglaçante forte",
  61: "pluie faible",
  63: "pluie",
  65: "pluie forte",
  66: "pluie verglaçante",
  67: "pluie verglaçante forte",
  71: "neige faible",
  73: "neige",
  75: "neige forte",
  77: "grains de neige",
  80: "averses faibles",
  81: "averses",
  82: "averses violentes",
  85: "averses de neige",
  86: "fortes averses de neige",
  95: "orage",
  96: "orage avec grêle",
  99: "orage violent avec grêle",
};

const cmdMeteo = {
  nom: "meteo",
  categorie: "utilitaires",
  resume: "Donne la météo d'une ville.",
  detail: "Les données viennent d'Open-Meteo (gratuit, sans clé) et sont données en heure locale du lieu.",
  donnees: new SlashCommandBuilder()
    .setName("meteo")
    .setDescription("Donne la météo actuelle et les prévisions d'une ville.")
    .addStringOption((option) =>
      option.setName("ville").setDescription("Nom de la ville, par exemple « Grenoble »").setRequired(true).setMaxLength(80),
    ),
  async executer(interaction) {
    await interaction.deferReply();
    const ville = interaction.options.getString("ville", true);

    let lieu = null;
    try {
      const reponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ville)}&count=1&language=fr&format=json`,
        { signal: AbortSignal.timeout(10_000) },
      );
      if (reponse.ok) lieu = (await reponse.json()).results?.[0] ?? null;
    } catch {
      throw new ErreurUtilisateur("Le service de géolocalisation est injoignable.");
    }

    if (!lieu) throw new ErreurUtilisateur(`Aucune ville trouvée pour « ${ville} ».`);

    let donnees = null;
    try {
      const reponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lieu.latitude}&longitude=${lieu.longitude}` +
          "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code" +
          "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code" +
          "&timezone=auto&forecast_days=3",
        { signal: AbortSignal.timeout(10_000) },
      );
      if (reponse.ok) donnees = await reponse.json();
    } catch {
      throw new ErreurUtilisateur("Le service météo est injoignable.");
    }

    if (!donnees?.current) throw new ErreurUtilisateur("Le service météo n'a rien renvoyé d'exploitable.");

    const actuel = donnees.current;
    const jours = (donnees.daily?.time ?? []).map((date, index) => {
      const jour = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(
        new Date(`${date}T12:00:00`),
      );
      const mini = Math.round(donnees.daily.temperature_2m_min[index]);
      const maxi = Math.round(donnees.daily.temperature_2m_max[index]);
      const pluie = donnees.daily.precipitation_probability_max?.[index];
      const temps = TEMPS[donnees.daily.weather_code[index]] ?? "temps indéterminé";
      return `**${jour}** — ${temps}, ${mini} à ${maxi} °C${pluie !== null && pluie !== undefined ? `, ${pluie} % de pluie` : ""}`;
    });

    await interaction.editReply({
      embeds: [
        information(
          [
            `**Maintenant :** ${TEMPS[actuel.weather_code] ?? "temps indéterminé"}, **${Math.round(actuel.temperature_2m)} °C** (ressenti ${Math.round(actuel.apparent_temperature)} °C)`,
            `**Vent :** ${Math.round(actuel.wind_speed_10m)} km/h · **Humidité :** ${actuel.relative_humidity_2m} %`,
            "",
            ...jours,
          ].join("\n"),
          `Météo — ${lieu.name}${lieu.admin1 ? `, ${lieu.admin1}` : ""}${lieu.country ? ` (${lieu.country})` : ""}`,
        ).setFooter({ text: "DelphinaBot · données Open-Meteo" }),
      ],
    });
  },
};

// ---------------------------------------------------------------------------
// Commandes simples
// ---------------------------------------------------------------------------

const cmdAvatar = {
  nom: "avatar",
  categorie: "utilitaires",
  resume: "Affiche la photo de profil d'un membre.",
  donnees: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Affiche la photo de profil d'un membre.")
    .addUserOption((option) => option.setName("membre").setDescription("Le membre (vous par défaut)"))
    .addBooleanOption((option) =>
      option.setName("serveur").setDescription("Montrer la photo propre au serveur").setRequired(false),
    ),
  async executer(interaction) {
    const membre = interaction.options.getMember("membre") ?? interaction.member;
    const utilisateur = membre?.user ?? interaction.options.getUser("membre") ?? interaction.user;
    const serveur = interaction.options.getBoolean("serveur") ?? false;

    // `serveur` demande la photo propre au serveur : elle n'existe que si le
    // membre y est encore. Sinon on retombe sur la photo globale, plutôt que
    // d'afficher un embed sans image et un lien « undefined ».
    const url =
      (serveur ? membre?.displayAvatarURL?.({ size: 1024 }) : null) ??
      utilisateur.displayAvatarURL({ size: 1024 });

    await interaction.reply({
      embeds: [
        or(
          serveur ? "Photo propre à ce serveur." : "Photo globale du compte.",
          `Photo de profil de ${utilisateur.username}`,
        )
          .setImage(url)
          .addFields(champs([["Identifiant", `\`${utilisateur.id}\``, true], ["Lien direct", `[ouvrir](${url})`, true]])),
      ],
    });
  },
};

const cmdUtilisateur = {
  nom: "utilisateur",
  categorie: "utilitaires",
  resume: "Affiche la fiche d'un membre du serveur.",
  donnees: new SlashCommandBuilder()
    .setName("utilisateur")
    .setDescription("Affiche la fiche d'un membre.")
    .addUserOption((option) => option.setName("membre").setDescription("Le membre (vous par défaut)")),
  async executer(interaction, contexte) {
    const membre = interaction.options.getMember("membre") ?? interaction.member;
    const utilisateur = membre.user;

    const roles = membre.roles.cache
      .filter((role) => role.id !== interaction.guildId)
      .sort((a, b) => b.position - a.position)
      .map((role) => `<@&${role.id}>`);

    const fiche = contexte.stockage.membre(interaction.guildId, membre.id);

    const embed = information(
      "",
      `${utilisateur.username}${membre.nickname ? ` (surnom : ${membre.nickname})` : ""}`,
    )
      .setThumbnail(membre.displayAvatarURL({ size: 256 }))
      .addFields(
        champs([
          ["Identifiant", `\`${utilisateur.id}\``, true],
          ["Compte créé", horodatage(utilisateur.createdAt), true],
          ["Arrivée sur le serveur", membre.joinedAt ? horodatage(membre.joinedAt) : "inconnue", true],
          ["Niveau", String(fiche.niveau), true],
          ["Expérience", `${fiche.xp} points`, true],
          ["Bot", utilisateur.bot ? "oui" : "non", true],
          ["Rôles", roles.slice(0, 20).join(" ") || "aucun"],
        ]),
      );

    await interaction.reply({ embeds: [embed] });
  },
};

const cmdServeur = {
  nom: "serveur",
  categorie: "utilitaires",
  resume: "Affiche les informations du serveur.",
  donnees: new SlashCommandBuilder().setName("serveur").setDescription("Affiche les informations du serveur."),
  async executer(interaction, contexte) {
    const guilde = interaction.guild;
    const proprietaire = await guilde.fetchOwner().catch(() => null);

    const embed = information("", guilde.name)
      .setThumbnail(guilde.iconURL({ size: 256 }))
      .addFields(
        champs([
          ["Identifiant", `\`${guilde.id}\``, true],
          ["Créé le", horodatage(guilde.createdAt), true],
          ["Propriétaire", proprietaire ? proprietaire.user.username : "inconnu", true],
          ["Membres", String(guilde.memberCount), true],
          ["Salons", String(guilde.channels.cache.size), true],
          ["Rôles", String(guilde.roles.cache.size), true],
          ["Niveau de vérification", String(guilde.verificationLevel), true],
          ["Boosts", `${guilde.premiumSubscriptionCount ?? 0} (niveau ${guilde.premiumTier})`, true],
          ["Wiki", contexte.configuration.wikiUrl || "non configuré", true],
        ]),
      );

    await interaction.reply({ embeds: [embed] });
  },
};

const cmdMaths = {
  nom: "maths",
  categorie: "utilitaires",
  resume: "Calcule une expression.",
  detail: "Opérations `+ - * / % ^`, parenthèses, et fonctions `sqrt`, `abs`, `round`, `floor`, `ceil`, `log`, `exp`, `sin`, `cos`, `tan`.",
  donnees: new SlashCommandBuilder()
    .setName("maths")
    .setDescription("Calcule une expression arithmétique.")
    .addStringOption((option) =>
      option.setName("expression").setDescription("Par exemple (12+3)*4 ou sqrt(2)").setRequired(true).setMaxLength(200),
    ),
  async executer(interaction) {
    const expression = interaction.options.getString("expression", true);
    const resultat = calculer(expression);

    if (!Number.isFinite(resultat)) throw new ErreurUtilisateur("Le résultat n'est pas un nombre fini.");

    await interaction.reply({
      embeds: [
        succes(`\`${expression}\` = **${Number(resultat.toFixed(10))}**`, "Calcul"),
      ],
    });
  },
};

const cmdSondage = {
  nom: "sondage",
  categorie: "utilitaires",
  resume: "Crée un sondage à réactions.",
  detail: "Deux propositions deviennent 👍 / 👎 ; au-delà, des chiffres sont utilisés.",
  donnees: new SlashCommandBuilder()
    .setName("sondage")
    .setDescription("Crée un sondage dans ce salon.")
    .addStringOption((option) =>
      option.setName("question").setDescription("La question posée").setRequired(true).setMaxLength(250),
    )
    .addStringOption((option) =>
      option.setName("propositions").setDescription("Propositions séparées par des barres verticales | (facultatif)").setMaxLength(900),
    ),
  async executer(interaction) {
    const question = interaction.options.getString("question", true);
    const propositions = (interaction.options.getString("propositions") ?? "")
      .split("|")
      .map((element) => element.trim())
      .filter(Boolean)
      .slice(0, 9);

    const emojis =
      propositions.length === 0 || propositions.length === 2
        ? ["👍", "👎"]
        : ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

    const options = propositions.length === 0 ? ["Pour", "Contre"] : propositions;
    const description = options.map((element, index) => `${emojis[index]} ${element}`).join("\n");

    const reponse = await interaction.reply({
      embeds: [
        or(`**${question}**\n\n${description}`, "Sondage").setFooter({
          text: `Sondage ouvert par ${interaction.user.username}`,
        }),
      ],
      withResponse: true,
    });

    // `withResponse` est la forme actuelle ; le repli couvre les versions où
    // seul `fetchReply` existait.
    const message = reponse?.resource?.message ?? (await interaction.fetchReply());

    for (const emoji of emojis.slice(0, options.length)) {
      await message.react(emoji).catch(() => {});
    }
  },
};

const cmdDire = {
  nom: "dire",
  categorie: "utilitaires",
  resume: "Fait parler le bot dans un salon.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ManageMessages,
  donnees: new SlashCommandBuilder()
    .setName("dire")
    .setDescription("Fait envoyer un message par le bot.")
    .addStringOption((option) => option.setName("texte").setDescription("Le texte à envoyer").setRequired(true).setMaxLength(1900))
    .addChannelOption((option) =>
      option
        .setName("salon")
        .setDescription("Salon d'envoi (le salon courant par défaut)")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply({ flags: 64 });
    const texte = interaction.options.getString("texte", true);
    const salon = interaction.options.getChannel("salon") ?? interaction.channel;

    await salon.send({ content: texte, allowedMentions: { parse: [] } });

    await interaction.editReply({
      embeds: [succes(`Message envoyé dans <#${salon.id}>.`, "Envoyé")],
    });
    const reglages = contexte.stockage.serveur(interaction.guildId);
    if (reglages.journal) {
      const journaux = await interaction.guild.channels.fetch(reglages.journal).catch(() => null);
      if (journaux?.isTextBased()) {
        await journaux
          .send({
            embeds: [
              information(
                `**Auteur :** ${interaction.user.tag}\n**Salon :** <#${salon.id}>\n\n${texte}`,
                "Message dicté au bot",
              ),
            ],
          })
          .catch(() => {});
      }
    }
  },
};

const cmdLmgtfy = {
  nom: "lmgtfy",
  categorie: "utilitaires",
  resume: "Génère un lien de recherche pour une question.",
  donnees: new SlashCommandBuilder()
    .setName("lmgtfy")
    .setDescription("Génère un lien « laisse-moi chercher ça pour toi ».")
    .addStringOption((option) =>
      option.setName("recherche").setDescription("Ce qu'il faut chercher").setRequired(true).setMaxLength(300),
    ),
  async executer(interaction) {
    const recherche = interaction.options.getString("recherche", true);
    const lien = `https://duckduckgo.com/?q=${encodeURIComponent(recherche)}`;
    await interaction.reply({
      embeds: [or(`${lien}`, `Recherche : ${recherche}`)],
    });
  },
};

export const COMMANDES_UTILITAIRES = [
  cmdAvatar,
  cmdUtilisateur,
  cmdServeur,
  cmdMeteo,
  cmdMaths,
  cmdSondage,
  cmdDire,
  cmdLmgtfy,
];
