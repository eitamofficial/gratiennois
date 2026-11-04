/**
 * Configuration du bot.
 *
 * Tout ce qui est réglable vient de l'environnement, jamais du code. Le fichier
 * `.env` est lu au chargement (voir `env.js`), puis chaque valeur est validée
 * ici : un bot qui démarre avec une configuration incomplète vaut mieux qu'un
 * bot qui plante trois minutes plus tard sur une commande.
 *
 * Deux éléments sont **indispensables** : le jeton Discord et l'identifiant du
 * serveur. Le reste a des valeurs par défaut raisonnables — le wiki, lui, est
 * optionnel : sans `WIKI_URL`, le bot fonctionne, seul le lien vers le wiki
 * disparaît des réponses.
 */

import { existsSync } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";
import ffmpegStatic from "ffmpeg-static";
import { RACINE, chargerEnvironnement } from "./env.js";
import { journal, definirNiveau } from "./logger.js";

chargerEnvironnement();

/** Lit une variable d'environnement nettoyée. */
function texte(cle, defaut = "") {
  const valeur = process.env[cle];
  if (typeof valeur !== "string") return defaut;
  const propre = valeur.trim();
  return propre === "" ? defaut : propre;
}

/**
 * Lit un entier, en retombant sur la valeur par défaut si la saisie est douteuse.
 *
 * `minimum` vaut 1 par défaut ; les réglages dont zéro a un sens — « ne jamais
 * réessayer », « quitter aussitôt » — passent 0. Une valeur écrite mais refusée
 * est signalée dans le journal : sans cela, un `0` au lieu de `1` ou une lettre
 * glissée dans le `.env` changerait le comportement en silence.
 */
function entier(cle, defaut, minimum = 1) {
  const brut = texte(cle);
  if (!brut) return defaut;
  const valeur = Number.parseInt(brut, 10);
  if (Number.isFinite(valeur) && valeur >= minimum) return valeur;
  journal.warn(`${cle}="${brut}" n'est pas un entier valide : valeur retenue ${defaut}.`);
  return defaut;
}

/** Liste d'identifiants séparés par des virgules. */
function liste(cle) {
  return texte(cle)
    .split(/[\s,;]+/)
    .map((element) => element.trim())
    .filter(Boolean);
}

/** Chemin absolu : les chemins relatifs du `.env` partent de la racine du bot. */
function chemin(cle, defaut) {
  const valeur = texte(cle);
  if (!valeur) return defaut;
  return isAbsolute(valeur) ? valeur : join(RACINE, valeur);
}

/**
 * Retrouve un programme : d'abord dans `bin/`, puis dans le `PATH`.
 *
 * Le `PATH` compte pour le déploiement sur tablette : Termux installe `yt-dlp`
 * et `ffmpeg` dans `$PREFIX/bin`, et il n'y a aucune raison d'y recopier les
 * binaires à la main. Un chemin explicite dans le `.env` garde la priorité.
 *
 * Renvoie `null` si rien n'est trouvé : l'appelant décide quoi en dire.
 */
function trouverProgramme(cle, noms, embrique) {
  const indique = texte(cle);
  if (indique) {
    const absolu = isAbsolute(indique) ? indique : join(RACINE, indique);
    if (existsSync(absolu)) return absolu;
    journal.warn(`${cle} désigne « ${indique} », qui n'existe pas : recherche automatique à la place.`);
  }

  if (embrique && existsSync(embrique)) return embrique;

  const suffixes = process.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""];
  for (const dossier of (process.env.PATH ?? "").split(delimiter)) {
    if (!dossier) continue;
    for (const nom of noms) {
      for (const suffixe of suffixes) {
        const candidat = join(dossier, `${nom}${suffixe}`);
        if (existsSync(candidat)) return candidat;
      }
    }
  }

  return null;
}

/** Erreur de configuration, à afficher telle quelle au démarrage. */
export class ErreurConfiguration extends Error {}

let cache = null;

/**
 * Construit la configuration, une seule fois.
 *
 * Lève `ErreurConfiguration` si un élément indispensable manque : le point
 * d'entrée attrape cette erreur et affiche la marche à suivre, sans trace de
 * pile illisible.
 */
export function lireConfiguration() {
  if (cache) return cache;

  const token = texte("DISCORD_BOT_TOKEN") || texte("TOKEN");
  const guildId = texte("DISCORD_GUILD_ID") || texte("GUILD_ID");
  const wikiUrl = texte("WIKI_URL").replace(/\/+$/, "");

  const manquants = [];
  if (!token) manquants.push("DISCORD_BOT_TOKEN");
  if (!guildId) manquants.push("DISCORD_GUILD_ID");
  if (manquants.length > 0) {
    throw new ErreurConfiguration(
      `Variables manquantes dans DelphinaBotV2/.env : ${manquants.join(", ")}.\n` +
        "Copiez .env.example vers .env, puis renseignez-les.",
    );
  }

  definirNiveau(texte("NIVEAU_LOG", "info"));

  // yt-dlp : le binaire livré avec le bot, sinon celui du système. Sous Termux,
  // `pkg install yt-dlp` ou `pip install -U yt-dlp` suffit alors.
  const cheminYtDlp =
    trouverProgramme(
      "CHEMIN_YTDLP",
      ["yt-dlp"],
      join(RACINE, "bin", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"),
    ) ?? chemin("CHEMIN_YTDLP", join(RACINE, "bin", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"));

  // FFmpeg : celui de `ffmpeg-static` quand il est là, sinon celui du système.
  // Sur tablette, le binaire fourni par la dépendance ne s'exécute pas :
  // `pkg install ffmpeg` est la voie normale, et il est alors trouvé ici.
  const cheminFfmpeg =
    trouverProgramme(
      "CHEMIN_FFMPEG",
      ["ffmpeg"],
      typeof ffmpegStatic === "string" ? ffmpegStatic : null,
    ) ?? "";

  // FFmpeg est cherché par prism-media dans `FFMPEG_PATH`. On lui donne le
  // chemin résolu plus haut : celui de `ffmpeg-static`, ou celui du système —
  // c'est ce dernier qui compte sur tablette, où le binaire de la dépendance
  // (compilé pour GNU/Linux) ne s'exécute pas.
  if (!process.env.FFMPEG_PATH && cheminFfmpeg) process.env.FFMPEG_PATH = cheminFfmpeg;

  cache = {
    token,
    clientId: texte("DISCORD_CLIENT_ID") || token.split(".")[0] || "",
    guildId,
    /** Secret HMAC partagé avec le wiki. Vide = pas de synchronisation. */
    secretSync: texte("BOT_SYNC_SECRET"),
    wikiUrl,
    /** Serveur partagé, pour l'URL des pages. */
    siteUrl: wikiUrl,
    /** Membres autorisés à tout, même ce que Discord ne permet pas. */
    proprietaires: liste("PROPRIETAIRES_IDS"),
    /** Configuration partagée avec le wiki (rôles ↔ pages). */
    roster: join(RACINE, "..", "shared", "roster.json"),
    chemins: {
      ytdlp: cheminYtDlp,
      ffmpeg: cheminFfmpeg,
      ressources: join(RACINE, "ressources"),
    },
    musique: {
      /** Au-delà, la piste est refusée avant d'être mise en file. */
      dureeMax: entier("DUREE_MUSIQUE_MAX", 7200),
      volume: entier("VOLUME_DEFAUT", 40),
      /**
       * Cycles d'affichage sans échantillon avant d'abandonner un flux.
       *
       * C'est le réglage qui a mis fin aux arrêts spontanés de la musique : la
       * bibliothèque en utilise cinq (100 ms), ce qui suffit à couper un
       * morceau au premier hoquet du réseau. Cinquante cycles valent une
       * seconde de blanc tolérée.
       */
      toleranceSilence: entier("TOLERANCE_SILENCE_IMAGES", 50),
      /** Reprises d'un morceau interrompu avant de passer au suivant. */
      tentatives: entier("TENTATIVES_MUSIQUE", 2, 0),
      /** Attente avant de quitter le salon quand la file est vide (0 = aussitôt). */
      delaiQuitter: entier("DELAI_QUITTER_VOCAL_SECONDES", 300, 0) * 1000,
    },
    niveaux: {
      /** XP gagné par message utile. */
      xpParMessage: entier("XP_PAR_MESSAGE", 15),
      /** Anti-spam : une seule attribution par membre sur cette fenêtre. */
      delaiXp: entier("DELAI_XP_SECONDES", 60) * 1000,
      /** Palier d'XP entre deux niveaux (le coût croît ensuite). */
      palier: entier("PALIER_XP", 100),
    },
    geniusToken: texte("GENIUS_TOKEN"),
    spotify: {
      clientId: texte("SPOTIFY_CLIENT_ID"),
      clientSecret: texte("SPOTIFY_CLIENT_SECRET"),
    },
    lastfm: texte("LASTFM_API_KEY"),
  };

  return cache;
}

/** Avertissements de démarrage : ce qui manque sans empêcher de tourner. */
export function avertissements(configuration) {
  const remarques = [];
  if (!configuration.secretSync) {
    remarques.push(
      "BOT_SYNC_SECRET absent : le bot fonctionne, mais rien ne sera transmis au wiki.",
    );
  }
  if (!existsSync(configuration.roster)) {
    remarques.push(`Configuration partagée introuvable (${configuration.roster}).`);
  }
  if (!existsSync(configuration.chemins.ytdlp)) {
    remarques.push(
      `yt-dlp introuvable (${configuration.chemins.ytdlp}) : les commandes de musique échoueront. ` +
        "Sur tablette : `pkg install yt-dlp` ; ailleurs : `pip install -U yt-dlp`.",
    );
  }
  if (!process.env.FFMPEG_PATH) {
    remarques.push(
      "FFmpeg introuvable : la musique refusera de jouer. Installez-le (sur tablette, " +
        "`pkg install ffmpeg`) ou renseignez CHEMIN_FFMPEG.",
    );
  }
  return remarques;
}

/** Trace la configuration au démarrage, sans jamais révéler un secret. */
export function resumer(configuration) {
  journal.info(`Configuration : serveur ${configuration.guildId}, wiki ${configuration.wikiUrl || "(non configuré)"}`);
  for (const remarque of avertissements(configuration)) journal.warn(remarque);
}
