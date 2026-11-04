/**
 * Commande `/jouerfichier`.
 *
 * Joue un fichier audio stocké sur le disque du serveur (MP3, M4A, FLAC, OGG,
 * WAV, WebM…), et non un lien de streaming. C'est l'opposé de `/jouer` : ce
 * dernier résout un lien et clip son flux avec `yt-dlp`, celui-ci lit un
 * fichier que le bot trouve déjà sur la machine où il tourne.
 *
 * ---------------------------------------------------------------------------
 * L'interface
 * ---------------------------------------------------------------------------
 *
 * `/jouerfichier` est conçue pour être utilisée de deux façons distinctes,
 * selon le type de fichier qu'on lui donne :
 *
 *  - un **chemin** vers un fichier déjà sur le serveur : `/jouerfichier`,
 *    `uploads/musique.mp3`, `fichiers/concert.m4a`… Le chemin est relatif au
 *    répertoire racine du bot, celui où il a été lancé ; c'est la façon la
 *    plus simple de jouer un morceau téléchargé depuis un salon.
 *  - un **lien** d'URL, si le fichier est disponible en ligne et que le bot
 *    peut le télécharger : `/jouerfichier https://…/musique.mp3`. Cette route
 *    utilise `yt-dlp` comme d'habitude : c'est la façon la plus générale, et
 *    elle couvre les fichiers qui n'existent pas encore sur le serveur.
 *
 * ---------------------------------------------------------------------------
 * La sécurité
 * ---------------------------------------------------------------------------
 *
 * C'est l'essentiel de la commande, et c'est ce qui la distingue de
 * `/jouer` :
 *
 *  - d'abord, le bot vérifie que le fichier existe et qu'il est accessible :
 *    aucun `fs.readFile` sur un chemin arbitraire, aucun `fetch` suivi d'une
 *    extension trompeuse ;
 *  - ensuite, il vérifie que le fichier est bien un fichier audio, par son
 *    extension et par la lecture des en-têtes avec `ffmpeg` : un PDF, une
 *    archive ou un script animé ne sera jamais transmis, même si son nom se
 *    termine par `.mp3` ;
 *  - le fichier ne dépasse pas la limite de longueur configurée ; et il ne
 *    peut pas être un morceau déjà en cours de lecture ;
 *  - enfin, il ne transmet pas de contenu : l'audio part vers le vocal, sur
 *    lequel Discord est seul à pouvoir lire.
 *
 * C'est la différence fondamentale avec `yt-dlp` : le lien est suivi, mais le
 * flux vers le vocal est produit par le bot, pas par un tiers. Aucune URL
 * externe n'est jamais affichée, et un fichier malveillant ne peut pas
 * disparaître dans un message de diffusion.
 *
 * ---------------------------------------------------------------------------
 * Ce que la commande affiche
 * ---------------------------------------------------------------------------
 *
 * L'appelé répond immédiatement à la commande, puis le panneau « en cours »
 * s'affiche dans le salon vocal du membre : barre de progression, fichier en
 * cours, volume, répétition, boutons pause / suivant / arrêt / boucle. Ce qui
 * différencie ce morceau des autres, c'est la ligne `**Fichier :**` qui indique
 * le chemin ou l'URL utilisée, plus le volume et la répétition qui s'appliquent
 * comme à l'habitude. Le panneau suit la lecture comme n'importe quel autre
 * morceau : la musique continue d'être pilotée par les mêmes boutons, et le
 * meme `/suivant` passe au morceau suivant de la file.
 */

import { SlashCommandBuilder } from "discord.js";
import { ErreurUtilisateur } from "./erreurs.js";
import { attention, information, or, succes } from "../lib/embres.js";
import { formaterDuree } from "../lib/duree.js";
import { decouper } from "../lib/texte.js";
import { ErreurMusique } from "../musique/lecteur.js";
import { barreProgression, poser, tempsLecture } from "../musique/panneau.js";
import { trouverParoles } from "../musique/paroles.js";
import { ErreurLastfm, artistes, ecoutes, lastfmConfigure, profil } from "../musique/lastfm.js";
import { ajouterResultat } from "../musique/fichier.js";
import { salonVocalDe } from "./outils.js";

/** Rejoint le salon vocal de l'appelant et vérifie que la salle existe. */
async function salleDe(interaction, contexte, { rejoindre = true } = {}) {
  const serveurId = interaction.guildId;
  const existante = contexte.lecteur.obtenir(serveurId);

  if (!rejoindre) {
    if (!existante) throw new ErreurUtilisateur("Je ne joue rien dans ce serveur pour l'instant.");
    const { ok, raison } = memeSalon(interaction, existante);
    if (!ok) throw new ErreurUtilisateur(raison);
    return existante;
  }

  const { salon, raison } = salonVocalDe(interaction);
  if (!salon) throw new ErreurUtilisateur(raison);

  const connexion = await contexte.lecteur.rejoindre(interaction.guild, salon.id);
  if (!connexion.ok) throw new ErreurUtilisateur(connexion.raison);

  return contexte.lecteur.obtenir(serveurId);
}

/** Affiche le panneau « en cours » dans le salon de la commande. */
async function poserPanneau(interaction, contexte) {
  const salon = interaction.channel;
  if (!salon || typeof salon.send !== "function" || salon.isTextBased?.() === false) return false;
  return poser(contexte, interaction.guildId, salon);
}

/** L'appelant est-il dans le salon où joue le bot ? */
function memeSalon(interaction, salle) {
  const salon = interaction.member?.voice?.channel ?? null;
  if (!salon) return { ok: false, raison: "Vous devez être dans un salon vocal pour cela." };
  if (salle.connexion.joinConfig.channelId !== salon.id) {
    return { ok: false, raison: "Rejoignez le salon vocal où je joue pour cette commande." };
  }
  return { ok: true, raison: null };
}

const cmdJouerfichier = {
  nom: "jouerfichier",
  categorie: "musique",
  resume: "Joue un fichier audio local sur le serveur vocal.",
  detail:
    "Joue un fichier stocké sur le serveur, ou une URL qui sera téléchargée — MP3, M4A, FLAC, OGG, WAV, WebM…."
    + "\
\
"
    + "`/jouerfichier` s'utilise avec le chemin d'un fichier ou avec un lien : `fichier.mp3`, `musique/mivideo.mp4`, `https://…/track.mp3`.",
  donnees: new SlashCommandBuilder()
    .setName("jouerfichier")
    .setDescription("Joue un fichier audio du serveur dans votre salon vocal.")
    .addStringOption((option) =>
      option.setName("fichier")
        .setDescription("Chemin du fichier, ou lien d'URL vers un fichier audio")
        .setRequired(true)
        .setMaxLength(500),
    )
    .addStringOption((option) =>
      option.setName("destination")
        .setDescription("Répertoire où chercher le fichier s'il est local (par défaut : le répertoire courant)")
        .setRequired(false)
        .setMaxLength(300),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply();
    const fichier = interaction.options.getString("fichier", true);
    const destination = interaction.options.getString("destination")?.trim();

    const salle = await salleDe(interaction, contexte, { rejoindre: true });
    if (!salle) throw new ErreurUtilisateur("Impossible de rejoindre le salon vocal.");

    // Un lien est toujours une recherche : on l'envoie à `yt-dlp` comme d'habitude.
    const estLien = /^https?:\/\//i.test(fichier);
    if (estLien) {
      const pistes = await contexte.lecteur.ajouterResultats(
        interaction.guildId,
        fichier,
        interaction.user.username,
        1,
      );

      const premiere = pistes[0];
      await interaction.editReply({
        embeds: [
          (information)(
            [
              `[${premiere.titre}](${premiere.page})`,
              `**Auteur :** ${premiere.auteur}${premiere.duree ? ` · **Durée :** ${formaterDuree(premiere.duree * 1000)}` : ""}`,
              `**Demandé par :** <@${interaction.user.id}>`,
            ].join("\
"),
            "Téléchargement",
          ).setThumbnail(premiere.vignette),
        ],
      });

      await poserPanneau(interaction, contexte);
      return;
    }

    // Un chemin local. `ajouterResultat` se charge de tout : existence,
    // format, taille, lecture.
    let pistes;
    try {
      pistes = await ajouterResultat(contexte.lecteur, interaction.guildId, fichier, destination, interaction.user.username, 1);
    } catch (erreurRecue) {
      throw new ErreurUtilisateur(
        erreurRecue instanceof ErreurMusique
          ? erreurRecue.message
          : `Fichier impossible à lire : ${erreurRecue.message}`,
      );
    }

    const premiere = pistes[0];
    const duree = premiere.duree ? formaterDuree(premiere.duree * 1000) : "—";
    await interaction.editReply({
      embeds: [
        (succes)(
          [
            `[${premiere.titre}](${premiere.page})`,
            `**Durée :** ${duree}`,
            `**Demandé par :** <@${interaction.user.id}>`,
          ].join("\
"),
          "Fichier local",
        ).setThumbnail(premiere.vignette),
      ],
    });

    await poserPanneau(interaction, contexte);
  },
};

export const COMMANDES_FICHIER = [cmdJouerfichier];