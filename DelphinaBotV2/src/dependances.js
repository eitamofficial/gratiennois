/**
 * Dépendances extérieures.
 *
 * Le bot a besoin de deux programmes qui ne viennent pas de npm : `yt-dlp`
 * (recherche et flux audio) et `ffmpeg` (transcodage). Le second est fourni
 * par `ffmpeg-static` ; le premier est embarqué dans `bin/`.
 *
 * Ce fichier ne lève jamais d'erreur : il **dit** ce qui manque. Un bot sans
 * yt-dlp reste parfaitement utile — modération, niveaux, wiki — et c'est au
 * démarrage qu'il faut l'apprendre, pas au moment où un membre lance
 * `/jouer`.
 */

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import process from "node:process";
import { journal } from "./logger.js";

const require = createRequire(import.meta.url);

/** Ce que la musique exige, et à quoi cela sert. */
export const LECTEUR_DEPENDANCES = [
  { cle: "ytdlp", nom: "yt-dlp", usage: "recherche et extraction du flux audio" },
  { cle: "ffmpeg", nom: "ffmpeg", usage: "transcodage du flux en PCM lisible par Discord" },
];

/**
 * Bibliothèques de chiffrement acceptées par `@discordjs/voice`.
 *
 * Discord chiffre l'audio ; sans l'une de ces bibliothèques, la poignée de
 * main UDP avec le serveur vocal n'aboutit pas et la connexion reste bloquée
 * en « connexion » jusqu'au délai d'attente. Le paquet installé par défaut est
 * `libsodium-wrappers` : du WebAssembly, rien à compiler.
 */
export const CHIFFREMENT_VOCAL = [
  "libsodium-wrappers",
  "sodium-native",
  "sodium",
  "@stablelib/xchacha20poly1305",
  "@noble/ciphers",
];

/**
 * Premier module de la liste réellement **chargeable**, ou `null`.
 *
 * `require.resolve` ne suffirait pas pour deux des trois cas qui comptent ici :
 * `@snazzah/davey` est un module natif dont le code spécifique à la plate-forme
 * (une dépendance facultative, `@snazzah/davey-android-arm64` par exemple) peut
 * manquer alors que l'enveloppe JavaScript est bien là. Le charger pour de bon
 * est le seul contrôle qui vaut.
 */
function premierModule(noms) {
  for (const nom of noms) {
    try {
      require(nom);
      return nom;
    } catch {
      // Absent ou inutilisable sur cette plate-forme : on essaie le suivant.
    }
  }
  return null;
}

/** Le système sur lequel tourne le bot, pour adapter les conseils. */
function estTermux() {
  return /com\.termux/i.test(process.env.PREFIX ?? "") || existsSync("/data/data/com.termux/files/usr");
}

/**
 * Renvoie la liste des manques, sous forme de phrases prêtes à journaliser.
 * Une liste vide signifie que tout est là.
 */
export function verifierDependances(configuration) {
  const remarques = [];

  for (const besoin of LECTEUR_DEPENDANCES) {
    const chemin = configuration.chemins[besoin.cle];
    if (!chemin || !existsSync(chemin)) {
      remarques.push(
        `${besoin.nom} introuvable (${chemin || "chemin non défini"}) : la musique échouera ` +
          `(${besoin.usage}). ` +
          (estTermux()
            ? "Sous Termux : `pkg install ffmpeg yt-dlp`, ou `pip install -U yt-dlp`."
            : "Placez le binaire dans DelphinaBotV2/bin/, ou renseignez CHEMIN_YTDLP / CHEMIN_FFMPEG."),
      );
    }
  }

  if (!process.env.FFMPEG_PATH && configuration.chemins.ffmpeg) {
    remarques.push(
      "FFMPEG_PATH n'a pas pu être positionné : si ffmpeg est installé ailleurs, renseignez CHEMIN_FFMPEG.",
    );
  }

  // `@discordjs/voice` ne dépend d'aucune bibliothèque de chiffrement : c'est
  // au projet de la choisir. Sans elle, yt-dlp et ffmpeg ont beau être là, la
  // connexion au salon échoue — le pire cas, puisque tout paraît installé.
  const chiffrement = premierModule(CHIFFREMENT_VOCAL);
  if (!chiffrement) {
    remarques.push(
      "Aucune bibliothèque de chiffrement vocal installée : la connexion au salon restera " +
        "bloquée. Corrigez avec `npm install libsodium-wrappers` dans DelphinaBotV2/.",
    );
  } else {
    journal.debug(`Chiffrement vocal : ${chiffrement}.`);
  }

  // Depuis 2025, Discord exige le protocole DAVE (chiffrement de bout en bout
  // du vocal). `@discordjs/voice` ne le gère qu'à partir de la version 0.19,
  // qui apporte `@snazzah/davey` : en dessous, le serveur vocal ferme la
  // connexion juste après l'avoir ouverte.
  if (!premierModule(["@snazzah/davey"])) {
    remarques.push(
      "Le chiffrement de bout en bout du vocal (DAVE) est absent : Discord fermera la connexion " +
        "au salon. Corrigez avec `npm install @discordjs/voice@^0.19.2` dans DelphinaBotV2/." +
        (estTermux()
          ? " Sous Termux, le module natif doit correspondre à la plate-forme : supprimez" +
            " node_modules/@snazzah puis relancez `npm install`."
          : ""),
    );
  } else {
    journal.debug("Chiffrement de bout en bout (DAVE) : présent.");
  }

  if (!process.versions.node.startsWith("2") || Number(process.versions.node.split(".")[0]) < 20) {
    remarques.push(
      `Node.js ${process.version} est trop ancien : discord.js 14 demande Node.js 20 ou plus récent.` +
        (estTermux() ? " Sous Termux : `pkg install nodejs-lts`." : ""),
    );
  }

  return remarques;
}
