/**
 * Événements.
 *
 * Les moments où le bot réagit sans qu'on lui demande : connexion, arrivée et
 * départ d'un membre, changement de rôles, message, interaction. C'est aussi
 * ici que vit la **synchronisation automatique avec le wiki** : dès qu'un
 * membre reçoit ou perd un rôle reconnu, le rattachement part vers le wiki,
 * signé.
 *
 * Rien n'est bloquant : un wiki injoignable ne doit pas empêcher de répondre
 * aux commandes, et un échec de synchronisation est journalisé, jamais affiché
 * comme une panne à l'utilisateur.
 */

import { ActivityType } from "discord.js";
import { journal } from "./logger.js";
import { attention, erreur as erreurEmbed, or, succes } from "./lib/embres.js";
import { remplir } from "./lib/texte.js";
import { baliseTemps } from "./lib/duree.js";
import { niveauPourXp, progression, recompenseDue } from "./niveaux.js";
import { pagesPourMembre, pousserLiens } from "./wiki.js";
import { traiterCommande } from "./commandes/index.js";
import { peutModerer } from "./commandes/outils.js";
import { concours } from "./commandes/interaction.js";
import { rafraichir } from "./musique/panneau.js";

/** Le démarrage ne s'exécute qu'une fois, même si les deux chemins se croisent. */
let demarrageFait = false;

/** Raccorde tous les événements. À appeler une fois, au démarrage. */
export function installerEvenements(client, contexte) {
  client.once("clientReady", () => void demarrer(client, contexte));
  client.on("guildMemberAdd", (membre) => void arrivee(client, contexte, membre));
  client.on("guildMemberRemove", (membre) => void depart(contexte, membre));
  client.on("guildMemberUpdate", (avant, apres) => void rolesChanges(client, contexte, avant, apres));
  client.on("messageCreate", (message) => void surMessage(contexte, message));
  client.on("interactionCreate", (interaction) => void surInteraction(interaction, contexte));

  process.on("unhandledRejection", (raison) => {
    journal.error(`Promesse rejetée sans gestion : ${raison}`);
  });
  process.on("uncaughtException", (erreur) => {
    journal.error(`Exception non rattrapée : ${erreur.stack ?? erreur.message}`);
  });
}

/**
 * Bot connecté.
 *
 * Appelé par l'événement `clientReady`, et par `index.js` juste après
 * `login()` si la connexion a déjà abouti : les deux chemins mènent ici, un
 * drapeau garantit que le travail ne se fait qu'une fois.
 */
export async function demarrer(client, contexte) {
  if (demarrageFait) return;
  demarrageFait = true;

  journal.info(
    `Connecté en tant que ${client.user.tag} — ${contexte.commandes.length} commandes, ${client.guilds.cache.size} serveur(s).`,
  );
  client.user.setActivity(
    contexte.configuration.wikiUrl ? "les archives du Delphinat" : "les débats du Delphinat",
    { type: ActivityType.Watching },
  );

  // Une salle de musique ne survit pas à un redémarrage : rien à faire ici.
  // En revanche, on vérifie une fois pour toutes que le wiki répond, pour que
  // le journal le dise franchement plutôt que de laisser découvrir un silence.
  if (contexte.configuration.wikiUrl) {
    try {
      const reponse = await fetch(`${contexte.configuration.wikiUrl}/api/health`, {
        signal: AbortSignal.timeout(8_000),
      });
      journal.info(`Wiki : HTTP ${reponse.status} sur /api/health.`);
    } catch (erreur) {
      journal.warn(`Wiki injoignable au démarrage : ${erreur.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Arrivées, départs, rôles
// ---------------------------------------------------------------------------

/** Envoie un message de bienvenue ou de départ dans le salon configuré. */
async function annoncer(contexte, serveurId, type, membre, texteParDefaut) {
  const reglages = contexte.stockage.serveur(serveurId);
  const cible = reglages[type];
  if (!cible?.salon) return;

  const salon = await membres.salonDe(membre.guild ?? membre, cible.salon);
  if (!salon) return;

  const modele = cible.message ?? texteParDefaut;
  const texte = remplir(modele, {
    membre: `<@${membre.id}>`,
    serveur: membre.guild?.name ?? "le serveur",
    nombre: String(membre.guild?.memberCount ?? ""),
    nom: membre.user?.username ?? membre.displayName ?? "membre",
  });

  await salon
    .send({ embeds: [or(texte, type === "bienvenue" ? "Bienvenue" : "Départ")], allowedMentions: { parse: [] } })
    .catch(() => {});
}

/** Petit utilitaire de résolution de salon, isolé pour la lisibilité. */
const membres = {
  async salonDe(guild, identifiant) {
    const salon = await guild.channels.fetch(identifiant).catch(() => null);
    return salon?.isTextBased() ? salon : null;
  },
};

/** Un membre arrive. */
async function arrivee(client, contexte, membre) {
  if (membre.user.bot) return;
  journal.info(`Arrivée : ${membre.user.tag} sur ${membre.guild.name}.`);

  const reglages = contexte.stockage.serveur(membre.guild.id);

  if (reglages.autorole) {
    await membre.roles
      .add(reglages.autorole, "Rôle automatique à l'arrivée")
      .catch((erreur) => journal.warn(`Rôle automatique impossible : ${erreur.message}`));
  }

  contexte.stockage.membre(membre.guild.id, membre.id);
  await annoncer(
    contexte,
    membre.guild.id,
    "bienvenue",
    membre,
    "Bienvenue {membre} sur **{serveur}** ! Nous sommes désormais {nombre}.",
  );

  // Synchronisation immédiate : un nouveau membre qui porte déjà un rôle
  // reconnu (invité par un rôle, arrivé avec un rôle existant) doit être
  // rattaché sans attendre la prochaine modification.
  await synchroniserMembre(contexte, membre, "guildMemberAdd");
}

/** Un membre part. */
async function depart(contexte, membre) {
  if (membre.user?.bot) return;
  journal.info(`Départ : ${membre.user?.tag ?? membre.id}.`);
  await annoncer(
    contexte,
    membre.guild.id,
    "depart",
    membre,
    "{membre} a quitté le serveur. Il reste {nombre} membres.",
  );
}

/** Les rôles (ou le pseudonyme) d'un membre ont changé. */
async function rolesChanges(client, contexte, avant, apres) {
  const rolesAvant = avant.roles.cache.map((role) => role.name).join("|");
  const rolesApres = apres.roles.cache.map((role) => role.name).join("|");
  const nomChange = avant.displayName !== apres.displayName;

  if (rolesAvant === rolesApres && !nomChange) return;
  await synchroniserMembre(contexte, apres, "guildMemberUpdate");
}

/**
 * Pousse vers le wiki les fiches auxquelles un membre correspond.
 *
 * Rien n'est envoyé si la liste n'a pas changé depuis le dernier envoi : un
 * membre qui parle ne doit pas déclencher une requête, et un serveur actif ne
 * doit pas inonder le wiki.
 */
async function synchroniserMembre(contexte, membre, origine) {
  if (!contexte.configuration.wikiUrl || !contexte.configuration.secretSync) return;

  const nomsRole = membre.roles.cache
    .filter((role) => role.id !== membre.guild.id)
    .map((role) => role.name);
  const pseudonymes = [membre.displayName, membre.user.username, membre.nickname].filter(Boolean);

  const slugs = pagesPourMembre(contexte.roster, { nomsRole, pseudonymes });
  if (slugs.length === 0) return;

  const precedent = contexte.stockage.lien(membre.guild.id, membre.id);
  const memeListe =
    precedent && precedent.slugs.length === slugs.length && precedent.slugs.every((slug) => slugs.includes(slug));
  if (memeListe) return;

  const resultat = await pousserLiens(
    contexte.configuration,
    slugs.map((slug) => ({ slug, discordUserId: membre.id })),
    origine,
  );

  if (resultat.envoye) {
    contexte.stockage.noterLien(membre.guild.id, membre.id, slugs);
    journal.info(`Wiki : ${membre.user.tag} rattaché à ${slugs.join(", ")}.`);
  } else {
    journal.warn(`Wiki : rattachement de ${membre.user.tag} non transmis (${resultat.raison}).`);
  }
}

// ---------------------------------------------------------------------------
// Messages : expérience et réponses utiles
// ---------------------------------------------------------------------------

/** Attribue l'expérience, annonce les passages de niveau, applique les récompenses. */
async function surMessage(contexte, message) {
  if (!message.guild || message.author.bot) return;
  if (message.system) return;

  // Une épingle achetée se consomme avant tout le reste : le membre attend
  // une confirmation immédiate.
  if (await traiterEpingle(contexte, message)) return;

  const reglages = contexte.stockage.serveur(message.guild.id);
  if (!reglages.niveaux.actif) return;

  const fiche = contexte.stockage.membre(message.guild.id, message.author.id);
  const maintenant = Date.now();
  if (maintenant - fiche.derniereXp < contexte.configuration.niveaux.delaiXp) return;

  fiche.derniereXp = maintenant;
  fiche.messages += 1;

  const palier = contexte.configuration.niveaux.palier;
  const avant = niveauPourXp(fiche.xp, palier);
  fiche.xp += contexte.configuration.niveaux.xpParMessage;
  const apres = niveauPourXp(fiche.xp, palier);
  fiche.niveau = apres;

  if (apres > avant) {
    const etat = progression(fiche.xp, palier);
    const embed = succes(
      `**${message.author.username}** passe au niveau **${apres}** !\n${Math.round(etat.ratio * 100)} % vers le niveau ${apres + 1}.`,
      "Passage de niveau",
    );

    const salonAnnonce =
      reglages.niveaux.annonce &&
      (await message.guild.channels.fetch(reglages.niveaux.annonce).catch(() => null));

    if (salonAnnonce?.isTextBased()) await salonAnnonce.send({ embeds: [embed] }).catch(() => {});

    const recompense = recompenseDue(reglages.niveaux.recompenses, avant, apres);
    if (recompense) {
      const ajout = await message.member.roles
        .add(recompense.roleId, `Récompense du niveau ${recompense.niveau}`)
        .then(() => true)
        .catch(() => false);

      if (ajout) {
        await message.channel
          .send({
            embeds: [
              succes(
                `<@${message.author.id}> reçoit <@&${recompense.roleId}> pour avoir atteint le niveau ${recompense.niveau}.`,
                "Récompense attribuée",
              ),
            ],
            allowedMentions: { parse: [] },
          })
          .catch(() => {});
      }
    }
  }

  contexte.stockage.enregistrerMembre(message.guild.id, message.author.id, fiche);
}

/**
 * Boutons du panneau « en cours de lecture ».
 *
 * Le panneau est public : n'importe qui peut cliquer. Trois règles, dans cet
 * ordre : le clic doit concerner une lecture en cours, l'auteur doit être dans
 * le salon vocal de cette lecture — ou être modérateur — et la réponse est
 * **différée** plutôt qu'envoyée, parce que l'affichage du panneau se met à jour
 * de lui-même. Sans `deferUpdate`, Discord considérerait l'interaction comme
 * restée sans réponse et afficherait « L'action a échoué » à chaque clic.
 */
async function surBoutonMusique(interaction, contexte, action) {
  const serveurId = interaction.guildId;
  const salle = contexte.lecteur.obtenir(serveurId);

  if (!salle) {
    await interaction
      .reply({ embeds: [attention("Aucune musique n'est en cours dans ce serveur.", "Rien à piloter")], flags: 64 })
      .catch(() => {});
    // Le panneau resté affiché perd ses boutons : il ne doit pas continuer de
    // promettre une lecture qui n'existe plus.
    await rafraichir(contexte, serveurId).catch(() => {});
    return;
  }

  const salonVocal = interaction.member?.voice?.channel ?? null;
  const dansLeSalon = salonVocal && salonVocal.id === salle.connexion.joinConfig.channelId;
  const moderateur = peutModerer(interaction, contexte.configuration);

  if (!dansLeSalon && !moderateur) {
    await interaction
      .reply({
        embeds: [
          attention(
            "Rejoignez le salon vocal de la lecture pour piloter la musique depuis ce panneau.",
            "Accès refusé",
          ),
        ],
        flags: 64,
      })
      .catch(() => {});
    return;
  }

  await interaction.deferUpdate().catch(() => {});

  try {
    if (action === "pause") {
      contexte.lecteur.pause(serveurId);
    } else if (action === "reprendre") {
      contexte.lecteur.reprendre(serveurId);
    } else if (action === "suivant") {
      await contexte.lecteur.suivant(serveurId);
    } else if (action === "boucle") {
      // Un seul bouton pour les trois modes : les faire défiler évite trois
      // boutons dont deux seraient toujours inutiles.
      const suivant = salle.boucle === "aucune" ? "piste" : salle.boucle === "piste" ? "file" : "aucune";
      salle.boucle = suivant;
    } else if (action === "arreter") {
      contexte.lecteur.quitter(serveurId);
    } else {
      journal.warn(`Bouton de musique inconnu : ${action}`);
    }
  } catch (erreurRecue) {
    journal.error(`Bouton « musique:${action} » a échoué : ${erreurRecue.message}`);
    await interaction.followUp({ embeds: [erreurEmbed(erreurRecue.message)], flags: 64 }).catch(() => {});
    return;
  }

  await rafraichir(contexte, serveurId, { forcer: true }).catch(() => {});
}

/**
 * Épingle achetée à la boutique.
 *
 * Deux façons de désigner le message : y **répondre**, ou coller son lien.
 * L'attente expire au bout de dix minutes : un achat oublié ne doit pas
 * épingler un message sans rapport trois jours plus tard.
 */
async function traiterEpingle(contexte, message) {
  const attente = contexte.stockage.epingleEnAttente(message.guild.id, message.author.id);
  if (!attente) return false;

  if (Date.now() - attente.date > 10 * 60_000) {
    contexte.stockage.oublierEpingle(message.guild.id, message.author.id);
    return false;
  }

  if (attente.salonId !== message.channelId) {
    await message
      .reply({
        embeds: [
          or(
            `Pour épingler, répondez au message ou collez son lien **dans <#${attente.salonId}>**.`,
            "Épingle en attente",
          ),
        ],
        allowedMentions: { parse: [], repliedUser: false },
      })
      .catch(() => {});
    return true;
  }

  const lien = message.content.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
  const salonId = lien ? lien[2] : message.channelId;
  const messageId = lien ? lien[3] : message.reference?.messageId;

  if (!messageId) {
    await message
      .reply({
        embeds: [
          or(
            "Répondez au message à épingler, ou collez son lien (clic droit → Copier le lien du message).",
            "Aucun message désigné",
          ),
        ],
        allowedMentions: { parse: [], repliedUser: false },
      })
      .catch(() => {});
    return true;
  }

  const salon = await message.guild.channels.fetch(salonId).catch(() => null);
  const cible = await salon?.messages?.fetch(messageId).catch(() => null);

  if (!cible) {
    await message
      .reply({
        embeds: [or("Je n'ai pas trouvé ce message : vérifiez le lien.", "Épingle impossible")],
        allowedMentions: { parse: [], repliedUser: false },
      })
      .catch(() => {});
    return true;
  }

  const epingle = await cible
    .pin(`Épingle achetée par ${message.author.tag}`)
    .then(() => true)
    .catch(() => false);

  contexte.stockage.oublierEpingle(message.guild.id, message.author.id);

  await message
    .reply({
      embeds: [
        epingle
          ? succes("Le message est épinglé dans le salon.", "Épingle posée")
          : attention("Je n'ai pas la permission « Gérer les messages » pour épingler ici.", "Épingle refusée"),
      ],
      allowedMentions: { parse: [], repliedUser: false },
    })
    .catch(() => {});

  return true;
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

/** Commandes, boutons et sélecteurs. */
async function surInteraction(interaction, contexte) {
  if (interaction.isChatInputCommand()) {
    await traiterCommande(interaction, contexte);
    return;
  }

  if (interaction.isButton()) {
    await surBouton(interaction, contexte);
  }
}

/** Boutons persistants : ceux qui doivent survivre à un redémarrage. */
async function surBouton(interaction, contexte) {
  const [espace, action] = interaction.customId.split(":");

  if (espace === "musique") {
    await surBoutonMusique(interaction, contexte, action);
    return;
  }

  if (espace === "concours" && action === "participer") {
    const element = concours.get(interaction.message.id);
    if (!element) {
      await interaction
        .reply({ embeds: [or("Ce concours est terminé.", "Concours clos")], flags: 64 })
        .catch(() => {});
      return;
    }

    if (element.participants.has(interaction.user.id)) {
      element.participants.delete(interaction.user.id);
      await interaction
        .reply({
          embeds: [or(`Vous ne participez plus à **${element.prix}**. Bonne chance aux autres !`, "Participation retirée")],
          flags: 64,
        })
        .catch(() => {});
      return;
    }

    element.participants.add(interaction.user.id);
    await interaction
      .reply({
        embeds: [
          succes(
            `Vous participez à **${element.prix}**.\nFin : ${baliseTemps(element.fin)}.`,
            "Participation enregistrée",
          ),
        ],
        flags: 64,
      })
      .catch(() => {});
    return;
  }
}
