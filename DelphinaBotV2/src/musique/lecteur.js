/**
 * Musique.
 *
 * Le choix technique est explicite : `yt-dlp` produit un flux audio,
 * `@discordjs/voice` le diffuse, et FFmpeg (embarqué par `ffmpeg-static`)
 * transcode ce flux en PCM que Discord sait encoder.
 *
 * Ce que le module refuse de faire, volontairement :
 *
 * - diffuser autre chose que ce qu'un membre a demandé nommément ;
 * - se souvenir, entre deux redémarrages, de ce qu'il diffusait ;
 * - diffuser dans un salon vocal où il n'a pas été invité.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi la lecture s'arrêtait toute seule, et ce qui a été corrigé
 * ---------------------------------------------------------------------------
 *
 * Quatre causes réelles, toutes reproduites en lisant le code de
 * `@discordjs/voice` — et non des suppositions :
 *
 * 1. **Le lecteur abandonne après 100 ms de silence.**
 *    `createAudioPlayer` arrête la ressource dès que
 *    `maxMissedFrames` (5 par défaut) cycles d'affichage consécutifs n'ont pas
 *    trouvé d'échantillon, soit **100 ms**. Or le flux vient du réseau : la
 *    moindre saccade du Wi-Fi ou du réseau mobile — et sur Android, la moindre
 *    pression du processeur — suffit à faire tomber cinq cycles d'affilée. Le
 *    morceau était alors abandonné, la file vidée, et le bot quittait le salon.
 *    La tolérance est désormais de `TOLERANCE_SILENCE_IMAGES` cycles (50 par
 *    défaut, une seconde) : une saccade produit un blanc, plus un arrêt.
 *
 * 2. **Un morceau refusé pouvait en faire tomber deux.** La bibliothèque émet
 *    `error` **puis** `Idle` sur un flux en échec : le gestionnaire d'erreur
 *    appelait `suivant()`, puis `Idle` rappelait `suivant()` — le morceau
 *    suivant, jamais entendu, était sauté. Le passage se fait désormais sur le
 *    seul état `Idle`, et l'événement est ignoré s'il ne concerne pas la
 *    ressource que la salle croit jouer.
 *
 * 3. **L'URL extraite était diffusée telle quelle.** Les URLs de YouTube
 *    expirent et refusent les requêtes directes (403) selon l'heure et la
 *    région : un morceau s'arrêtait au milieu, puis la file se vidait. Le flux
 *    est maintenant produit par un processus `yt-dlp -o -`, dont la sortie est
 *    lue en continu — l'URL n'est plus jamais réutilisée après coup. L'URL
 *    directe reste le second recours, pas le premier.
 *
 * 4. **Un morceau interrompu était perdu.** Le morceau étant coupé avant sa
 *    durée annoncée, il est maintenant **repris** (depuis le début, seul
 *    `yt-dlp` sachant reprendre un flux sans le retélécharger) autant de fois
 *    que `TENTATIVES_MUSIQUE` l'autorise, au lieu de passer au suivant.
 *
 * Une file vide ne fait plus quitter le salon immédiatement : le bot attend
 * `DELAI_QUITTER_VOCAL_SECONDES` (cinq minutes par défaut) avant de partir, ce
 * qui laisse le temps d'ajouter un morceau entre deux. Mettre 0 restaure
 * l'ancien comportement.
 *
 * L'état vit en mémoire : un salon de musique vide au petit matin n'est pas un
 * incident.
 */

import { spawn } from "node:child_process";
import { setTimeout as attendre } from "node:timers/promises";
import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} from "@discordjs/voice";
import { ChannelType } from "discord.js";
import { journal } from "../logger.js";
import { formaterDuree } from "../lib/duree.js";
import { melanger } from "../lib/texte.js";
import { ErreurSource, estLienResolvable, resoudreLien } from "./sources.js";

/** Erreur compréhensible par l'utilisateur, à afficher telle quelle. */
export class ErreurMusique extends Error {}

/**
 * Écart toléré entre la fin réelle d'un flux et la durée annoncée.
 *
 * Les durées rendues par `yt-dlp` sont arrondies et les encodages VBR finissent
 * parfois quelques secondes avant. En dessous de vingt secondes d'écart, la
 * lecture est considérée comme terminée normalement : sans cette marge, chaque
 * morceau déclencherait une reprise inutile. Au-delà, c'est une coupure.
 */
const MARGE_FIN_MS = 20_000;

/** Attente entre deux tentatives d'un morceau interrompu. */
const DELAI_REPRISE_MS = 1_500;

/** Période de contrôle du blocage silencieux. */
const PERIODE_SURVEILLANCE_MS = 15_000;

/** Contrôles sans progrès avant de considérer le flux bloqué (3 × 15 s). */
const CONTROLES_AVANT_RELANCE = 3;

/**
 * Traduit un échec de connexion vocale en une phrase utile.
 *
 * « Le salon vocal est inaccessible » sans autre détail ne permet ni de
 * corriger les permissions ni de voir qu'il manque un paquet : l'état exact de
 * la connexion et l'erreur remontée par la bibliothèque sont donc repris ici.
 * Les deux causes réelles rencontrées méritent d'être nommées : une permission
 * manquante, et l'absence de chiffrement (bibliothèque de chiffrement ou
 * protocole DAVE).
 */
export function expliquerEchecVoix(etat, erreur) {
  const statut = etat?.status ?? "inconnu";
  const code = etat?.closeCode;

  if (code === 4014) {
    return (
      "Discord a refusé la connexion à ce salon (code 4014). Vérifiez la permission « Se connecter » " +
      "du bot dans ce salon."
    );
  }

  const detail = `${statut}${code ? `, code ${code}` : ""}`;

  // L'état retombe en « signalling » : le serveur vocal a fermé la connexion
  // aussitôt ouverte. C'est la signature d'un chiffrement manquant.
  if (statut === "signalling" || statut === "connecting") {
    return (
      `La négociation avec le serveur vocal n'a pas abouti (${detail}). Vérifiez que le bot peut ` +
      "« Se connecter » et « Parler » dans ce salon ; si les permissions sont bonnes, installez " +
      "`libsodium-wrappers` et `@discordjs/voice@^0.19.2` (chiffrement DAVE) dans DelphinaBotV2/."
    );
  }

  const cause = erreur?.message ? ` (${erreur.message})` : "";
  return (
    `Le salon vocal est inaccessible : ${detail}${cause}. Vérifiez que le bot a les permissions ` +
    "« Se connecter » et « Parler » dans ce salon."
  );
}

/** Une salle : une connexion vocale, un lecteur, une file. */
class Salle {
  constructor(connexion, joueur, volume) {
    this.connexion = connexion;
    this.joueur = joueur;
    this.volume = volume;
    this.boucle = "aucune";
    this.enPause = false;
    this.courante = null;
    this.ressource = null;
    this.attente = [];
    /** Processus `yt-dlp` et flux de la piste en cours, à fermer proprement. */
    this.flux = null;
    /** Dernière position connue, pour mesurer si un morceau a été coupé. */
    this.dernierProgres = 0;
    /** Contrôles consécutifs sans progression : détecte un flux bloqué. */
    this.ralentissements = 0;
    /** Minuterie d'attente avant de quitter une file vide. */
    this.minuterieQuitter = null;
  }
}

export class Lecteur {
  constructor(configuration) {
    this.configuration = configuration;
    this.salles = new Map();
    /** Appelé à chaque changement notable : le panneau « en cours » s'y accroche. */
    this.surChangement = null;
    this.surveillance = setInterval(() => this.surveiller(), PERIODE_SURVEILLANCE_MS);
    // La surveillance ne doit pas retenir le processus à l'arrêt.
    this.surveillance.unref?.();
  }

  /** Salle active d'un serveur, ou `null`. */
  obtenir(serveurId) {
    return this.salles.get(serveurId) ?? null;
  }

  /** Le bot joue-t-il dans ce serveur ? */
  actif(serveurId) {
    return this.salles.has(serveurId);
  }

  /** Position de lecture, en millisecondes. */
  position(serveurId) {
    const etat = this.salles.get(serveurId)?.joueur.state;
    return typeof etat?.playbackDuration === "number" ? etat.playbackDuration : 0;
  }

  /** Réglages de lecture, avec leurs valeurs de repli. */
  get reglages() {
    return this.configuration.musique;
  }

  /** Prévient qui de droit, sans jamais faire échouer la lecture. */
  informer(serveurId, raison) {
    try {
      this.surChangement?.(serveurId, raison);
    } catch (erreur) {
      journal.debug(`Panneau « en cours » non actualisé : ${erreur.message}`);
    }
  }

  /** État public, pour l'affichage dans les commandes. */
  resume(serveurId) {
    const salle = this.salles.get(serveurId);
    if (!salle) return "Aucune musique n'est en cours dans ce serveur.";
    if (salle.enPause) return "La lecture est en pause.";
    if (!salle.courante) return "La file d'attente est vide.";
    const { piste } = salle.courante;
    return `En cours : **${piste.titre}** — ${piste.auteur} (${formaterDuree(piste.duree * 1000)})`;
  }

  // -------------------------------------------------------------------------
  // Recherche
  // -------------------------------------------------------------------------

  /**
   * Recherche une piste.
   *
   * `yt-dlp` fait tout le travail : une URL est lue telle quelle, un texte est
   * passé en recherche. Un seul résultat par défaut, parce qu'une file de dix
   * recherches floues n'est jamais ce que le membre voulait.
   */
  async rechercher(cible, limite = 1) {
    // Spotify et Deezer ne diffusent pas de flux exploitable : le lien est
    // traduit en autant de recherches, puis chaque morceau est retrouvé là où
    // il est réellement jouable.
    if (estLienResolvable(cible)) {
      let requetes;
      try {
        requetes = await resoudreLien(cible);
      } catch (erreurSource) {
        throw new ErreurMusique(
          erreurSource instanceof ErreurSource ? erreurSource.message : "Ce lien n'a pas pu être lu.",
        );
      }

      const pistes = [];
      for (const requete of requetes.slice(0, Math.max(1, Math.min(limite, 10)))) {
        try {
          pistes.push(...(await this.rechercher(requete, 1)));
        } catch {
          // Un morceau manquant ne doit pas annuler toute la liste.
        }
      }

      if (pistes.length === 0) throw new ErreurMusique("Aucun morceau de cette liste n'a pu être retrouvé.");
      return pistes;
    }

    const estUrl = /^https?:\/\//i.test(cible);

    // Deux points comptent ici, et les deux ont déjà cassé la lecture :
    //
    // - une recherche s'écrit `ytsearchN:requête`, **dans l'argument**. Passer
    //   `--default-search ytsearch` puis `1:requête` fait lire « 1 » comme un
    //   protocole d'URL, et yt-dlp refuse tout net ;
    // - `-f bestaudio/best` est indispensable : sans lui, yt-dlp sélectionne
    //   la vidéo **et** l'audio, et le JSON ne contient alors aucun champ `url`.
    const arguments_ = estUrl
      ? ["-j", "--no-playlist", "--no-warnings", "-f", "bestaudio/best", cible]
      : ["-j", "--no-playlist", "--no-warnings", "-f", "bestaudio/best", `ytsearch${limite}:${cible}`];

    const sortie = await this.executerYtDlp(arguments_);

    // `-j` écrit un objet JSON par ligne : une recherche de plusieurs résultats
    // en produit donc plusieurs. On lit ligne par ligne.
    const entrees = [];
    for (const ligne of sortie.split(/\r?\n/)) {
      const propre = ligne.trim();
      if (!propre.startsWith("{")) continue;
      try {
        entrees.push(JSON.parse(propre));
      } catch {
        // Ligne tronquée : on l'ignore, les autres restent valables.
      }
    }

    if (entrees.length === 0) throw new ErreurMusique("yt-dlp n'a pas renvoyé de résultat lisible.");

    const aplaties = entrees.flatMap((entree) =>
      entree._type === "playlist" && Array.isArray(entree.entries) ? entree.entries : [entree],
    );

    const dureeMax = this.reglages.dureeMax;
    const jouables = aplaties
      .map((entree) => this.versPiste(entree, cible))
      .filter((piste) => piste !== null)
      // Un morceau plus long que la limite n'est pas proposé : mieux vaut une
      // recherche vide qu'une piste refusée en cours de route.
      .filter((piste) => piste.duree === 0 || piste.duree <= dureeMax);

    if (jouables.length === 0) {
      throw new ErreurMusique(
        `Aucun résultat jouable : les pistes proposées dépassent la limite de ${Math.round(dureeMax / 60)} minutes.`,
      );
    }

    return jouables.slice(0, Math.max(1, limite));
  }

  /** Traduit une entrée `yt-dlp` en piste, ou `null` si elle n'est pas jouable. */
  versPiste(brut, demande) {
    const flux = String(brut.url ?? "");
    if (!flux.startsWith("http")) return null;

    return {
      titre: String(brut.title ?? "Sans titre"),
      page: String(brut.webpage_url ?? flux),
      flux,
      duree: Number(brut.duration ?? 0),
      auteur: String(brut.uploader ?? brut.artist ?? "Auteur inconnu"),
      vignette: typeof brut.thumbnail === "string" ? brut.thumbnail : null,
      demande,
    };
  }

  /** Lance `yt-dlp` et renvoie sa sortie, en traduisant les échecs. */
  executerYtDlp(arguments_) {
    const chemin = this.configuration.chemins.ytdlp;

    return new Promise((resoudre, rejeter) => {
      const processus = spawn(chemin, arguments_, { windowsHide: true });
      let sortie = "";
      let erreurs = "";

      processus.stdout.on("data", (morceau) => {
        sortie += morceau.toString("utf8");
      });
      processus.stderr.on("data", (morceau) => {
        erreurs += morceau.toString("utf8");
      });

      processus.on("error", () => {
        rejeter(new ErreurMusique(messagesYtDlp.chemin(chemin)));
      });

      processus.on("close", (code) => {
        if (code === 0 && sortie.trim()) {
          resoudre(sortie);
          return;
        }
        const raison = /Video unavailable|unavailable/i.test(erreurs)
          ? "Cette vidéo n'est plus disponible."
          : /Sign in|login required|private/i.test(erreurs)
            ? "Cette vidéo est privée ou réservée à une connexion."
            : "La recherche n'a rien donné. Vérifiez l'orthographe, ou essayez un mot-clé plus simple.";
        journal.debug(`yt-dlp a échoué (code ${code}) : ${erreurs.trim().split("\n").pop() ?? ""}`);
        rejeter(new ErreurMusique(raison));
      });
    });
  }

  // -------------------------------------------------------------------------
  // Connexion vocale
  // -------------------------------------------------------------------------

  /** Rejoint un salon vocal, ou déplace la connexion si le bot a bougé. */
  async rejoindre(serveur, salonId) {
    const existante = this.salles.get(serveur.id);
    if (existante) {
      if (existante.connexion.joinConfig.channelId === salonId) return { ok: true, raison: null };
      // Même précaution que dans `quitter()` : la table d'abord, la connexion
      // ensuite, pour qu'un rappel ne détruise pas deux fois la même chose.
      this.salles.delete(serveur.id);
      existante.connexion.removeAllListeners();
      if (existante.connexion.state.status !== VoiceConnectionStatus.Destroyed) {
        existante.connexion.destroy();
      }
    }

    let connexion;
    try {
      connexion = joinVoiceChannel({
        channelId: salonId,
        guildId: serveur.id,
        adapterCreator: serveur.voiceAdapterCreator,
        selfDeaf: true,
      });
    } catch {
      return { ok: false, raison: "Impossible de rejoindre ce salon vocal." };
    }

    // On retient l'erreur remontée par la bibliothèque pendant la négociation :
    // c'est elle qui distingue une permission manquante d'un paquet absent.
    let derniereErreur = null;
    const noterErreur = (erreur) => {
      derniereErreur = erreur;
    };
    connexion.on("error", noterErreur);

    try {
      await entersState(connexion, VoiceConnectionStatus.Ready, 20_000);
    } catch {
      const etat = connexion.state;
      connexion.off("error", noterErreur);
      connexion.destroy();
      const raison = expliquerEchecVoix(etat, derniereErreur);
      // Le journal garde la trace : l'utilisateur n'a droit qu'à l'essentiel.
      journal.warn(`Voix (${serveur.id}, salon ${salonId}) : ${raison}`);
      return { ok: false, raison };
    }

    connexion.off("error", noterErreur);

    const joueur = createAudioPlayer({
      behaviors: {
        // Sans auditeur, la lecture se met en pause au lieu de tourner dans le
        // vide : un salon vide ne doit pas consommer de bande passante.
        noSubscriber: NoSubscriberBehavior.Pause,
        // Le point le plus important du module. La valeur de la bibliothèque
        // (5 cycles, 100 ms) abandonne la ressource au premier hoquet du
        // réseau : c'est ce qui arrêtait la musique « toute seule ».
        maxMissedFrames: this.reglages.toleranceSilence,
      },
    });

    connexion.subscribe(joueur);
    const salle = new Salle(connexion, joueur, this.reglages.volume);
    this.salles.set(serveur.id, salle);
    this.cablerEvenements(serveur.id, salle);
    return { ok: true, raison: null };
  }

  /** Branche les événements du lecteur : fin de piste, erreur, coupure. */
  cablerEvenements(serveurId, salle) {
    salle.joueur.on(AudioPlayerStatus.Idle, (ancien) => {
      // Un événement qui ne concerne pas la ressource que la salle croit jouer
      // vient d'un flux déjà remplacé : l'honorer ferait sauter le morceau
      // suivant, ce qui arrivait sur chaque erreur réseau.
      if (ancien?.resource && salle.ressource && ancien.resource !== salle.ressource) return;
      const position = typeof ancien?.playbackDuration === "number" ? ancien.playbackDuration : 0;
      void this.pisteTerminee(serveurId, position);
    });

    salle.joueur.on("error", (erreurRecue) => {
      // On ne passe pas au morceau suivant ici : la bibliothèque émet `error`
      // **puis** `Idle`, et le second passage ferait sauter une piste de plus.
      journal.error(`Audio (${serveurId}) : ${erreurRecue.message}`);
    });

    salle.connexion.on(VoiceConnectionStatus.Disconnected, async () => {
      // Discord coupe la connexion quand le bot se retrouve seul dans le salon,
      // et le réseau mobile la coupe pour un rien. La bibliothèque tente alors
      // d'elle-même de revenir : on lui laisse sa chance avant de ranger, sans
      // quoi la musique s'arrêtait à chaque hoquet de connexion.
      try {
        await Promise.race([
          entersState(salle.connexion, VoiceConnectionStatus.Signalling, 5_000),
          entersState(salle.connexion, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        journal.warn(`Voix (${serveurId}) : connexion perdue, reconnexion en cours.`);
        await entersState(salle.connexion, VoiceConnectionStatus.Ready, 15_000);

        // Entre la coupure et le retour, l'appelant a pu changer de salon : la
        // salle a alors été remplacée, et c'est la nouvelle qui pilote la
        // musique. Reprendre ici ferait jouer deux flux à la fois.
        if (this.salles.get(serveurId) !== salle) return;

        // La file reprend là où elle en était : une coupure de réseau ne doit
        // pas coûter la séance.
        if (salle.courante && !salle.enPause) {
          const position = this.position(serveurId);
          const reprise = salle.courante;
          reprise.tentatives = 0;
          // Le flux précédent est mort avec la connexion.
          salle.dernierProgres = 0;
          if (position > 5_000) journal.warn(`Voix (${serveurId}) : reprise de la lecture.`);
          this.lancer(serveurId, salle, reprise, { reprise: true });
        }
        return;
      } catch {
        // Vraie coupure : le bot a été déplacé ou éjecté.
      }

      // Rien n'a abouti : le bot est bien sorti du salon, ou le serveur vocal
      // l'a refusé. On range la salle plutôt que de laisser une connexion
      // fantôme dans la table.
      //
      // Le contrôle d'identité n'est pas une précaution de principe : cette
      // attente dure cinq secondes, et pendant ce temps un membre a très bien
      // pu appeler le bot dans un autre salon. Sans ce test, la salle neuve
      // serait détruite par l'ancienne — la musique s'arrêtait « toute seule ».
      if (this.salles.get(serveurId) !== salle) return;

      if (salle.connexion.state.status === VoiceConnectionStatus.Disconnected) {
        journal.warn(`Voix (${serveurId}) : connexion perdue définitivement.`);
        this.quitter(serveurId);
      }
    });

    salle.connexion.on(VoiceConnectionStatus.Destroyed, () => {
      if (this.salles.get(serveurId) === salle) this.salles.delete(serveurId);
    });
  }

  // -------------------------------------------------------------------------
  // Flux audio
  // -------------------------------------------------------------------------

  /**
   * Ouvre le flux de la piste : `yt-dlp` écrit l'audio sur sa sortie standard,
   * que la couche vocale lit en continu et transmet à FFmpeg.
   *
   * Diffuser directement l'URL extraite — l'ancienne méthode — obligeait à
   * utiliser une adresse qui expire et que YouTube refuse volontiers (403) une
   * fois le morceau commencé : la lecture s'arrêtait alors au milieu, sans
   * raison apparente.
   */
  ouvrirFlux(piste, { direct = false } = {}) {
    if (direct && piste.flux) {
      // Second recours : l'URL extraite à la recherche. FFmpeg la lit lui-même.
      return { flux: piste.flux, processus: null };
    }

    const chemin = this.configuration.chemins.ytdlp;
    if (!chemin) return { flux: piste.flux, processus: null };

    const processus = spawn(
      chemin,
      [
        "-f",
        "bestaudio/best",
        "--no-playlist",
        "--no-warnings",
        "--no-progress",
        "--quiet",
        "-o",
        "-",
        piste.page,
      ],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );

    let erreurs = "";
    processus.stderr.on("data", (morceau) => {
      erreurs = `${erreurs}${morceau.toString("utf8")}`.slice(-400);
    });

    // Si `yt-dlp` n'a pas pu démarrer, on casse la sortie avec l'erreur : le
    // lecteur verra un flux en échec et enchaînera, au lieu d'attendre un flux
    // qui ne viendra jamais.
    processus.on("error", (erreur) => {
      journal.error(`yt-dlp (flux) : ${messagesYtDlp.processus(erreur, chemin)}`);
      processus.stdout.destroy(new Error(erreur.message));
    });

    processus.on("close", (code) => {
      if (code !== 0 && erreurs.trim()) {
        journal.debug(`yt-dlp (flux) a quitté avec le code ${code} : ${erreurs.trim().split("\n").pop()}`);
      }
    });

    return { flux: processus.stdout, processus };
  }

  /** Ferme le processus et le flux de la piste en cours. */
  fermerFlux(salle) {
    const actuel = salle.flux;
    salle.flux = null;
    if (!actuel) return;

    try {
      if (typeof actuel.flux?.destroy === "function") actuel.flux.destroy();
    } catch {
      // Déjà fermé.
    }

    if (actuel.processus && actuel.processus.exitCode === null && !actuel.processus.killed) {
      // Sans cela, un `yt-dlp` orphelin continue de télécharger : sur une
      // tablette, c'est de la batterie brûlée pour rien.
      try {
        actuel.processus.kill();
      } catch {
        // Déjà terminé.
      }
    }
  }

  // -------------------------------------------------------------------------
  // Lecture
  // -------------------------------------------------------------------------

  /**
   * Démarre une piste dans la salle donnée.
   *
   * `reprise` indique qu'il s'agit de reprendre la même piste après une
   * coupure ; `direct` choisit alors la méthode employée : le flux continu de
   * `yt-dlp` (`false`) ou l'URL extraite lue par FFmpeg (`true`). Les deux sont
   * indépendantes, et l'appelant les alterne.
   */
  lancer(serveurId, salle, entree, { reprise = false, direct = false } = {}) {
    salle.courante = entree;
    salle.enPause = false;
    salle.dernierProgres = 0;
    salle.ralentissements = 0;
    this.annulerDepart(salle);
    this.fermerFlux(salle);

    if (entree.tentatives === undefined) entree.tentatives = 0;

    const { flux, processus } = this.ouvrirFlux(entree.piste, { direct });

    try {
      // `inlineVolume` rend le volume réglable en cours de lecture, sans
      // recréer le flux : c'est ce qui permet à `/volume` de réagir tout de suite.
      const ressource = createAudioResource(flux, {
        inputType: typeof flux === "string" ? undefined : StreamType.Arbitrary,
        inlineVolume: true,
      });
      ressource.volume?.setVolume(salle.volume / 100);
      salle.ressource = ressource;
      salle.flux = { flux, processus };
      salle.joueur.play(ressource);
      this.informer(serveurId, reprise ? "reprise" : "piste");
    } catch (erreurRecue) {
      journal.error(`Lecture impossible : ${erreurRecue.message}`);
      this.fermerFlux(salle);
      salle.joueur.stop();
    }
  }

  /** Ajoute une piste et démarre la lecture si la salle est libre. */
  ajouter(serveurId, entree) {
    const salle = this.salles.get(serveurId);
    if (!salle) return null;

    if (salle.courante) {
      salle.attente.push(entree);
      this.informer(serveurId, "file");
      return null;
    }
    this.lancer(serveurId, salle, entree);
    return entree;
  }

  /**
   * Passe à la piste suivante, en appliquant la boucle.
   *
   * Appelé par `/suivant` — où l'intention est explicite — et par la fin
   * naturelle d'un morceau.
   */
  async suivant(serveurId) {
    const salle = this.salles.get(serveurId);
    if (!salle) return null;

    if (salle.boucle === "piste" && salle.courante) {
      const repetee = salle.courante;
      repetee.tentatives = 0;
      this.lancer(serveurId, salle, repetee);
      return repetee;
    }

    const suivante = salle.attente.shift();
    if (suivante) {
      suivante.tentatives = 0;
      this.lancer(serveurId, salle, suivante);
      return suivante;
    }

    if (salle.boucle === "file" && salle.courante) {
      const repetee = salle.courante;
      repetee.tentatives = 0;
      salle.attente.push(repetee);
      return this.suivant(serveurId);
    }

    // File vide : on ne quitte pas le salon tout de suite. Le morceau suivant
    // arrive souvent dans la minute, et un bot qui disparaît sans prévenir est
    // exactement ce qui donnait l'impression qu'il s'arrêtait « tout seul ».
    this.fermerFlux(salle);
    salle.courante = null;
    salle.ressource = null;
    this.programmerDepart(serveurId, salle);
    this.informer(serveurId, "fin");
    return null;
  }

  /**
   * Fin de la piste en cours, pour quelque raison que ce soit.
   *
   * `position` est la durée réellement lue avant l'arrêt : c'est elle qui
   * distingue un morceau arrivé à son terme d'un flux coupé en route.
   */
  async pisteTerminee(serveurId, position = 0) {
    const salle = this.salles.get(serveurId);
    if (!salle) return;
    if (salle.enPause) return;
    // `Idle` se déclenche aussi quand on vient d'arrêter : dans ce cas la
    // salle n'a plus de morceau en cours et il n'y a rien à enchaîner.
    if (!salle.courante) return;

    const entree = salle.courante;
    const dureeMs = entree.piste.duree > 0 ? entree.piste.duree * 1000 : 0;
    const coupee = dureeMs > 0 && position < dureeMs - MARGE_FIN_MS;

    if (coupee && entree.tentatives < this.reglages.tentatives) {
      entree.tentatives += 1;
      journal.warn(
        `Musique (${serveurId}) : « ${entree.piste.titre} » interrompu après ` +
          `${formaterDuree(position)} sur ${formaterDuree(dureeMs)} — reprise ` +
          `${entree.tentatives}/${this.reglages.tentatives}.`,
      );

      this.fermerFlux(salle);
      try {
        await attendre(DELAI_REPRISE_MS);
      } catch {
        // Attente interrompue : on enchaîne sans plus attendre.
      }

      // La salle a pu disparaître pendant l'attente (départ, autre morceau).
      const encore = this.salles.get(serveurId);
      if (encore !== salle || salle.courante !== entree) return;

      // Les deux méthodes alternent d'une reprise à l'autre. Ce n'est pas une
      // coquetterie : le refus de YouTube (`HTTP Error 403`) est intermittent —
      // mesuré à un essai sur quatre sur cette machine — et rien ne dit que ce
      // soit la méthode qui vient d'échouer qui repassera la fois suivante.
      this.lancer(serveurId, salle, entree, { reprise: true, direct: entree.tentatives % 2 === 1 });
      return;
    }

    if (coupee) {
      journal.warn(
        `Musique (${serveurId}) : « ${entree.piste.titre} » abandonné après ` +
          `${entree.tentatives} reprise(s).`,
      );
    }

    await this.suivant(serveurId);
  }

  /**
   * Surveille un flux qui ne progresse plus.
   *
   * La tolérance de silence couvre les saccades réseau, mais pas un encodage
   * qui se tait définitivement sans se terminer : le lecteur reste alors en
   * « lecture » sans qu'un seul échantillon ne sorte. Trois contrôles sans
   * progression déclenchent une reprise, par le même chemin qu'une coupure.
   */
  surveiller() {
    for (const [serveurId, salle] of this.salles) {
      const etat = salle.joueur.state;
      if (etat.status !== AudioPlayerStatus.Playing) {
        salle.ralentissements = 0;
        continue;
      }

      const position = typeof etat.playbackDuration === "number" ? etat.playbackDuration : 0;
      if (position > salle.dernierProgres) {
        salle.dernierProgres = position;
        salle.ralentissements = 0;
        continue;
      }

      salle.ralentissements += 1;
      if (salle.ralentissements >= CONTROLES_AVANT_RELANCE) {
        journal.warn(
          `Musique (${serveurId}) : le flux ne progresse plus depuis ` +
            `${Math.round((CONTROLES_AVANT_RELANCE * PERIODE_SURVEILLANCE_MS) / 1000)} s, reprise.`,
        );
        salle.ralentissements = 0;
        // `stop()` déclenche `Idle`, que `pisteTerminee` traite comme une
        // coupure : le morceau est repris, la file reste intacte.
        salle.joueur.stop();
      }
    }
  }

  // -------------------------------------------------------------------------
  // Départ différé
  // -------------------------------------------------------------------------

  /** Programme le départ du salon, ou part tout de suite si le délai est nul. */
  programmerDepart(serveurId, salle) {
    const delai = this.reglages.delaiQuitter;
    if (delai <= 0) {
      this.quitter(serveurId);
      return;
    }

    salle.minuterieQuitter = setTimeout(() => {
      const actuelle = this.salles.get(serveurId);
      if (actuelle !== salle) return;
      if (salle.courante) return;
      journal.info(`Musique (${serveurId}) : file vide depuis ${Math.round(delai / 1000)} s, je quitte le salon.`);
      this.quitter(serveurId);
    }, delai);
    salle.minuterieQuitter.unref?.();
  }

  /** Annule un départ programmé : un morceau arrive toujours au bon moment. */
  annulerDepart(salle) {
    if (!salle?.minuterieQuitter) return;
    clearTimeout(salle.minuterieQuitter);
    salle.minuterieQuitter = null;
  }

  /** Cherche puis met en file, en renvoyant les pistes retenues. */
  async ajouterResultats(serveurId, requete, demandeur, nombre = 1) {
    const pistes = await this.rechercher(requete, Math.max(1, nombre));
    if (pistes.length === 0) throw new ErreurMusique("Aucun résultat.");

    // Un seul résultat : on le joue. Plusieurs : on brasse pour ne pas toujours
    // servir la même piste à la même personne.
    const ordre = pistes.length === 1 ? pistes : melanger(pistes);

    const salle = this.salles.get(serveurId);
    if (!salle) return ordre;

    this.annulerDepart(salle);

    for (const piste of ordre) {
      const entree = { piste, demandeur, tentatives: 0 };
      if (!salle.courante) this.lancer(serveurId, salle, entree);
      else salle.attente.push(entree);
    }
    if (salle.courante && salle.attente.length > 0) this.informer(serveurId, "file");

    return ordre;
  }

  /** Met en pause. */
  pause(serveurId) {
    const salle = this.salles.get(serveurId);
    if (!salle || !salle.courante || salle.enPause) return false;
    salle.joueur.pause();
    salle.enPause = true;
    this.informer(serveurId, "etat");
    return true;
  }

  /** Reprend la lecture. */
  reprendre(serveurId) {
    const salle = this.salles.get(serveurId);
    if (!salle || !salle.ressource || !salle.enPause) return false;
    salle.joueur.unpause();
    salle.enPause = false;
    salle.dernierProgres = 0;
    salle.ralentissements = 0;
    this.informer(serveurId, "etat");
    return true;
  }

  /** Change le volume, entre 0 et 100. */
  volume(serveurId, valeur) {
    const salle = this.salles.get(serveurId);
    if (!salle) return -1;
    salle.volume = Math.max(0, Math.min(100, valeur));
    salle.ressource?.volume?.setVolume(salle.volume / 100);
    this.informer(serveurId, "etat");
    return salle.volume;
  }

  /**
   * Quitte le salon et oublie la file.
   *
   * La salle est retirée de la table **avant** l'arrêt du lecteur, et ce n'est
   * pas un détail d'ordre : `stop()` déclenche l'état `Idle`, qui remonte
   * jusqu'à `pisteTerminee()` puis `suivant()`, qui rappelle `quitter()`. Sans
   * ce retrait préalable, la seconde entrée détruisait une connexion vocale
   * déjà détruite et `/arreter` échouait au lieu de simplement s'arrêter.
   */
  quitter(serveurId) {
    const salle = this.salles.get(serveurId);
    if (!salle) return;

    this.salles.delete(serveurId);
    this.annulerDepart(salle);
    this.fermerFlux(salle);
    salle.courante = null;
    salle.ressource = null;
    salle.joueur.stop(true);

    // Ceinture et bretelles : `destroy()` lève si la connexion l'est déjà.
    if (salle.connexion.state.status !== VoiceConnectionStatus.Destroyed) salle.connexion.destroy();
    this.informer(serveurId, "quitte");
  }

  /** Retire une piste de la file, à partir de sa position (1 pour la première). */
  retirer(serveurId, position) {
    const salle = this.salles.get(serveurId);
    const index = position - 1;
    if (!salle || index < 0 || index >= salle.attente.length) return null;
    const retire = salle.attente.splice(index, 1)[0] ?? null;
    if (retire) this.informer(serveurId, "file");
    return retire;
  }

  /** Met une piste de la file en tête. */
  deplacer(serveurId, position) {
    const salle = this.salles.get(serveurId);
    const index = position - 1;
    if (!salle || index < 0 || index >= salle.attente.length) return null;
    const [element] = salle.attente.splice(index, 1);
    if (!element) return null;
    salle.attente.unshift(element);
    this.informer(serveurId, "file");
    return element;
  }

  /** File d'attente, sous forme de lignes prêtes à afficher. */
  file(serveurId) {
    const salle = this.salles.get(serveurId);
    if (!salle) return [];
    return salle.attente.map(
      (entree, index) => `${index + 1}. ${entree.piste.titre} — ${entree.piste.auteur}`,
    );
  }

  /** Mélange la file existante. */
  melanger(serveurId) {
    const salle = this.salles.get(serveurId);
    if (!salle || salle.attente.length === 0) return 0;
    const melange = melanger(salle.attente);
    salle.attente.length = 0;
    salle.attente.push(...melange);
    this.informer(serveurId, "file");
    return melange.length;
  }

  /** Le salon est-il un salon vocal exploitable ? */
  static estSalonVocal(type) {
    return type === ChannelType.GuildVoice || type === ChannelType.GuildStageVoice;
  }

  /** Message d'erreur prêt à afficher. */
  static messageErreur(erreurRecue) {
    return erreurRecue instanceof ErreurMusique
      ? erreurRecue.message
      : "La musique a échoué pour une raison inconnue.";
  }
}

/** Messages parlants pour les deux échecs de `yt-dlp` qui se ressemblent. */
const messagesYtDlp = {
  chemin: (chemin) =>
    `yt-dlp est introuvable (${chemin}). Placez le binaire dans DelphinaBotV2/bin/, ` +
    "installez-le (`pip install -U yt-dlp` ou `pkg install yt-dlp`), ou renseignez CHEMIN_YTDLP.",
  processus: (erreur, chemin) =>
    `impossible de lancer ${chemin} (${erreur.code ?? erreur.message}). ` +
    "Vérifiez le chemin de CHEMIN_YTDLP, ou installez yt-dlp pour cette plate-forme.",
};
