/**
 * Panneau « en cours de lecture ».
 *
 * Un salon de musique se pilote d'un bouton, pas d'une commande tapée à la
 * hâte : ce module tient à jour **un seul** message par serveur, affiché dans
 * le salon où la lecture a été demandée, avec la barre de progression, la file
 * à venir et quatre boutons — pause, suivant, répétition, arrêt.
 *
 * Trois principes :
 *
 * 1. **Un seul message, réécrit.** Le panneau n'est pas reposté à chaque
 *    morceau : il est modifié, et seulement si son contenu change réellement.
 *    Sans cette comparaison, un volume réglé deux fois de suite enverrait deux
 *    requêtes pour le même affichage.
 * 2. **Rien n'est indispensable.** Un panneau qu'on n'a pas pu écrire —
 *    permissions, message supprimé, salon effacé — ne doit jamais faire échouer
 *    la musique : toutes les opérations réseau sont silencieuses, l'incident
 *    part au journal.
 * 3. **Le statut du bot suit la lecture.** Il affiche l'émission en cours et
 *    redevient le statut habituel dès que la musique s'arrête.
 */

import { ActionRowBuilder, ActivityType, ButtonBuilder, ButtonStyle } from "discord.js";
import { COULEURS, PIED } from "../lib/embres.js";
import { formaterDuree } from "../lib/duree.js";
import { journal } from "../logger.js";


/** Panneaux connus : un par serveur. Vit en mémoire, comme la lecture. */
const panneaux = new Map();

/** Largeur de la barre de progression, en caractères. */
const LARGEUR_BARRE = 16;

/**
 * Barre de progression : `▬▬▬▬🔘▬▬▬▬▬▬`.
 *
 * Un direct (`duree` nulle) n'a pas de fin connue : la barre serait un
 * mensonge, on écrit donc `🔴 en direct`. Une position qui dépasse la durée
 * annoncée est ramenée à la fin : les métadonnées sont arrondies, pas la
 * lecture.
 */
export function barreProgression(positionMs, dureeMs, largeur = LARGEUR_BARRE) {
  if (!dureeMs || dureeMs <= 0) return "🔴 en direct";

  const lu = Number.isFinite(positionMs) ? positionMs : 0;
  const position = Math.max(0, Math.min(1, lu / dureeMs));
  const curseur = Math.min(largeur - 1, Math.round(position * (largeur - 1)));
  const avant = "▬".repeat(curseur);
  const apres = "▬".repeat(largeur - 1 - curseur);
  return `${avant}🔘${apres}`;
}

/**
 * Durée courte, `m:ss` ou `h:mm:ss`.
 *
 * `formaterDuree` écrit « 1 min », ce qui est parfait dans une phrase et
 * inutilisable dans une barre de progression : à cette précision, la position
 * paraît figée. Les lecteurs de musique du monde entier affichent `1:05`, et
 * c'est ce que fait le panneau.
 */
export function dureeCourte(millisecondes) {
  const total = Math.max(0, Math.round((Number.isFinite(millisecondes) ? millisecondes : 0) / 1000));
  const deux = (valeur) => String(valeur).padStart(2, "0");
  const heures = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secondes = total % 60;
  return heures > 0 ? `${heures}:${deux(minutes)}:${deux(secondes)}` : `${minutes}:${deux(secondes)}`;
}

/** Chaîne « position / durée », lisible sans calcul mental. */
export function tempsLecture(positionMs, dureeMs) {
  const position = dureeCourte(positionMs);
  return dureeMs > 0 ? `${position} / ${dureeCourte(dureeMs)}` : position;
}

/** Rangée des boutons, adaptée à l'état de la salle. */
export function boutons(salle) {
  const pauseOuReprendre = new ButtonBuilder()
    .setCustomId(salle.enPause ? "musique:reprendre" : "musique:pause")
    .setLabel(salle.enPause ? "Reprendre" : "Pause")
    .setEmoji(salle.enPause ? "▶️" : "⏸️")
    .setStyle(salle.enPause ? ButtonStyle.Success : ButtonStyle.Secondary);

  const suivant = new ButtonBuilder()
    .setCustomId("musique:suivant")
    .setLabel("Suivant")
    .setEmoji("⏭️")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(salle.attente.length === 0 && salle.boucle !== "file");

  const repet = new ButtonBuilder()
    .setCustomId("musique:boucle")
    .setLabel(salle.boucle === "aucune" ? "Répéter" : salle.boucle === "piste" ? "Répète le morceau" : "Répète la file")
    .setEmoji(salle.boucle === "aucune" ? "🔁" : "🔂")
    .setStyle(salle.boucle === "aucune" ? ButtonStyle.Secondary : ButtonStyle.Primary);

  const arreter = new ButtonBuilder()
    .setCustomId("musique:arreter")
    .setLabel("Arrêter")
    .setEmoji("⏹️")
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder().addComponents(pauseOuReprendre, suivant, repet, arreter);
}

/** Contenu affiché : c'est aussi la signature qui évite les réécritures inutiles. */
export function contenu(contexte, serveurId, raison = "etat") {
  const salle = contexte.lecteur.obtenir(serveurId);
  if (!salle) {
    return {
      disparu: true,
      embed: null,
      composants: [],
    };
  }

  const position = contexte.lecteur.position(serveurId);
  const lignes = [];
  let titre = "Musique";

  if (salle.courante) {
    const { piste } = salle.courante;
    titre = "🎵 En cours de lecture";
    lignes.push(
      `**[${piste.titre}](${piste.page})**`,
      `${piste.auteur}`,
      "",
      `${barreProgression(position, piste.duree * 1000)}  \`${tempsLecture(position, piste.duree * 1000)}\``,
    );
    if (salle.enPause) lignes.push("", "⏸️ **En pause**");
    if (salle.courante.tentatives > 0) lignes.push("", "↻ *Reprise après une coupure du flux…*");
  } else if (salle.minuterieQuitter) {
    const delai = Math.round(contexte.lecteur.reglages.delaiQuitter / 1000);
    titre = "⏳ File terminée";
    lignes.push(
      `La file d'attente est vide. Je quitte le salon dans ${formaterDuree(delai * 1000)} si rien n'arrive —`,
      "ajoutez un morceau pour continuer la séance.",
    );
  } else {
    titre = "💤 À l'arrêt";
    lignes.push("Rien n'est en cours de lecture.", "Utilisez `/jouer` pour lancer un morceau.");
  }

  const suite = salle.attente.slice(0, 5);
  if (suite.length > 0) {
    lignes.push("", `**À suivre (${salle.attente.length})**`);
    for (const entree of suite) {
      lignes.push(`- ${entree.piste.titre} — ${entree.piste.auteur}`);
    }
    if (salle.attente.length > suite.length) lignes.push(`- … et ${salle.attente.length - suite.length} autre(s)`);
  }

  const embed = {
    color: COULEURS.information,
    title: titre,
    description: lignes.join("\n"),
    footer: { text: PIED },
    timestamp: new Date().toISOString(),
  };
  if (salle.courante?.piste.vignette) embed.thumbnail = { url: salle.courante.piste.vignette };
  if (salle.courante) {
    embed.fields = [
      { name: "Volume", value: `${salle.volume} %`, inline: true },
      { name: "Demandé par", value: salle.courante.demandeur || "—", inline: true },
    ];
  }

  // `raison` n'entre pas dans la signature : c'est un détail de journal, pas
  // un changement d'affichage, et il ne doit pas provoquer une réécriture.
  return {
    disparu: false,
    embed,
    composants: salle.courante || salle.attente.length > 0 || salle.minuterieQuitter ? [boutons(salle)] : [],
  };
}

/** Signature d'un contenu : deux rendus identiques ne coûtent aucune requête. */
function signature(element) {
  return JSON.stringify({ embed: element.embed, composants: element.composants });
}

/** Retient le panneau d'un serveur. */
export function definir(serveurId, salonId, messageId) {
  panneaux.set(serveurId, { serveurId, salonId, messageId, signature: null });
}

/** Oublie le panneau d'un serveur. */
export function oublier(serveurId) {
  panneaux.delete(serveurId);
}

/** Panneau connu d'un serveur, ou `null`. */
export function obtenir(serveurId) {
  return panneaux.get(serveurId) ?? null;
}

/**
 * Poste ou rafraîchit le panneau d'un serveur.
 *
 * Renvoie `true` si un message est affiché à jour. Ne lève jamais : un panneau
 * refusé se journalise et la musique continue.
 */
export async function rafraichir(contexte, serveurId, { forcer = false } = {}) {
  const connu = panneaux.get(serveurId);
  const element = contenu(contexte, serveurId);
  await mettreAJourStatut(contexte, serveurId);

  if (element.disparu) {
    // La salle a été rangée : le panneau perd ses boutons plutôt que de rester
    // cliquable et de promettre une lecture qui n'existe plus.
    if (connu) {
      const vide = {
        color: COULEURS.encre,
        title: "💤 À l'arrêt",
        description: "La lecture est terminée. Utilisez `/jouer` pour relancer une séance.",
        footer: { text: PIED },
        timestamp: new Date().toISOString(),
      };
      await ecraser(contexte, connu, { embed: vide, composants: [] });
      panneaux.delete(serveurId);
    }
    return false;
  }

  if (!connu) return false;

  const marque = signature(element);
  if (!forcer && connu.signature === marque) return true;
  connu.signature = marque;
  return ecraser(contexte, connu, element);
}

/** Écrit le contenu dans le message existant, ou abandonne proprement. */
async function ecraser(contexte, connu, element) {
  try {
    const salon = await contexte.client.channels.fetch(connu.salonId);
    const message = await salon?.messages?.fetch(connu.messageId);
    if (!message) {
      panneaux.delete(connu.serveurId);
      return false;
    }
    await message.edit({ embeds: [element.embed], components: element.composants });
    return true;
  } catch (erreur) {
    journal.debug(`Panneau « en cours » non actualisé : ${erreur.message}`);
    return false;
  }
}

/** Suit la lecture dans le statut du bot : « Écoute <titre> ». */
async function mettreAJourStatut(contexte, serveurId) {
  const salle = contexte.lecteur.obtenir(serveurId);
  const piste = salle?.courante?.piste;
  try {
    if (piste) {
      await contexte.client.user.setActivity(piste.titre.slice(0, 120), { type: ActivityType.Listening });
    } else {
      await contexte.client.user.setActivity(
        contexte.configuration.wikiUrl ? "les archives du Delphinat" : "les débats du Delphinat",
        { type: ActivityType.Watching },
      );
    }
  } catch {
    // Le statut n'est qu'un ornement : jamais bloquant.
  }
}

/** Supprime le message d'un panneau, sans jamais faire échouer l'appelant. */
async function effacer(contexte, connu) {
  try {
    const salon = await contexte.client.channels.fetch(connu.salonId);
    const message = await salon?.messages?.fetch(connu.messageId);
    await message?.delete();
  } catch {
    // Message déjà supprimé, ou salon effacé : rien à faire.
  }
}

/**
 * Poste le panneau dans un salon, ou le déplace si la lecture change de salon.
 *
 * L'appelant a déjà joint le salon vocal ; ce qui peut manquer ici, ce sont les
 * permissions d'écriture. Le refus est rapporté pour que la commande puisse le
 * dire une fois, sans empêcher la lecture.
 */
export async function poser(contexte, serveurId, salon) {
  const element = contenu(contexte, serveurId);
  if (element.disparu) return false;

  const connu = panneaux.get(serveurId);
  if (connu && connu.salonId === salon.id) {
    if (await rafraichir(contexte, serveurId, { forcer: true })) return true;
    // Le message n'a pas pu être écrit : supprimé à la main, ou salon purgé.
    // Un panneau mort qui se croit vivant ne se réparerait jamais — c'est
    // pourquoi on oublie celui-ci et qu'on en repose un plus bas.
    panneaux.delete(serveurId);
  } else if (connu) {
    // Deux panneaux à la fois seraient deux vérités contradictoires : l'ancien
    // est retiré avant que le nouveau prenne sa place.
    panneaux.delete(serveurId);
    await effacer(contexte, connu);
  }

  try {
    const message = await salon.send({ embeds: [element.embed], components: element.composants });
    definir(serveurId, salon.id, message.id);
    await rafraichir(contexte, serveurId, { forcer: true });
    return true;
  } catch (erreur) {
    journal.warn(`Panneau « en cours » impossible dans #${salon.name ?? salon.id} : ${erreur.message}`);
    return false;
  }
}
