/**
 * Vérificateur de musique.
 *
 * Contrôle hors Discord tout ce qui fait qu'une écoute tient ou s'effondre.
 * Écrit après une série d'arrêts spontanés, dont quatre causes ont été
 * trouvées dans le code de `@discordjs/voice` — pas devinées :
 *
 * 1. le lecteur abandonnait un flux après **100 ms** de silence
 *    (`maxMissedFrames: 5` par défaut) ;
 * 2. une erreur de flux émettait `error` **puis** `Idle`, ce qui faisait sauter
 *    deux morceaux au lieu d'un ;
 * 3. une URL extraite était diffusée telle quelle, alors que YouTube la refuse
 *    par intermittence (`HTTP Error 403`) — mesuré à un essai sur quatre sur
 *    une connexion ordinaire, au démarrage comme en plein morceau ;
 * 4. une file vide faisait quitter le salon sur-le-champ.
 *
 *      npm run musique:verifier
 *
 * Les sections qui interrogent YouTube sont signalées comme telles : un refus
 * de leur part est compté « non vérifié » et non comme un échec du bot.
 *
 * Code de sortie : 0 si tout ce qui pouvait être vérifié l'est, 1 sinon.
 */

import { EventEmitter } from "node:events";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  createAudioPlayer,
  createAudioResource,
} from "@discordjs/voice";
import { lireConfiguration } from "./config.js";
import { Lecteur } from "./musique/lecteur.js";
import { barreProgression, contenu, obtenir, oublier, poser, tempsLecture } from "./musique/panneau.js";

let echecs = 0;
let nonVerifie = 0;

function verifier(nom, condition, detail = "") {
  console.log(`${condition ? "  ok  " : " ÉCHEC"} ${nom}${detail ? ` — ${detail}` : ""}`);
  if (!condition) echecs += 1;
}

function nonVerifiable(raison) {
  console.log(`  ---- non vérifié : ${raison}`);
  nonVerifie += 1;
}

const configuration = lireConfiguration();

// ---------------------------------------------------------------------------
// 1. Tous les modules se chargent
// ---------------------------------------------------------------------------
//
// Il n'y a pas de suite de tests dans ce dépôt : ce contrôle est le filet le
// moins cher contre une faute de frappe qui empêcherait le bot de démarrer.

/**
 * Fichiers de `src/` qui **travaillent** au chargement, au lieu de définir.
 *
 * Ils sont exclus du scan ci-dessous, et ce n'est pas une précaution de
 * principe : `deployer.js` publie les commandes dès qu'on l'importe, et
 * `verifier-*.js` lancent leurs contrôles. Un scan qui les chargeait a déjà
 * déclenché un envoi de commandes vers Discord sans qu'on le demande.
 */
const PROGRAMMES = ["deployer.js", "verifier-commandes.js", "verifier-musique.js"];

console.log("\n=== 1. Chargement des modules ===");
{
  const parcourir = (dossier, trouves = []) => {
    for (const entree of readdirSync(dossier)) {
      const chemin = join(dossier, entree);
      if (statSync(chemin).isDirectory()) parcourir(chemin, trouves);
      else if (chemin.endsWith(".js")) trouves.push(chemin.replace(/\\/g, "/"));
    }
    return trouves;
  };

  const tous = parcourir("src");
  const bibliotheques = tous.filter(
    (chemin) => !PROGRAMMES.some((programme) => chemin === `src/${programme}`),
  );

  let charges = 0;
  for (const chemin of bibliotheques) {
    try {
      await import(`./${chemin.replace(/^src\//, "")}`);
      charges += 1;
    } catch (erreur) {
      verifier(`import ${chemin}`, false, erreur.message);
    }
  }

  verifier(
    `les ${bibliotheques.length} modules de src/ se chargent`,
    charges === bibliotheques.length,
    `${charges} chargés, ${PROGRAMMES.length} programmes écartés`,
  );
}

// ---------------------------------------------------------------------------
// 2. La file d'attente
// ---------------------------------------------------------------------------

console.log("\n=== 2. Machine à états de la file ===");
{
  const reglages = { ...configuration.musique, delaiQuitter: 60, tentatives: 2 };
  const lecteur = new Lecteur({ ...configuration, musique: reglages });

  const appels = [];
  const departs = [];
  lecteur.lancer = (serveurId, salle, entree, options = {}) => {
    appels.push({
      titre: entree.piste.titre,
      reprise: Boolean(options.reprise),
      direct: Boolean(options.direct),
    });
    salle.courante = entree;
    salle.enPause = false;
    // Une ressource neuve à chaque lancement : c'est son identité qui permet
    // d'ignorer un événement `Idle` périmé.
    salle.ressource = { identifiant: appels.length };
  };
  lecteur.quitter = (serveurId) => {
    departs.push(serveurId);
    lecteur.salles.delete(serveurId);
  };

  const fabriquerSalle = () => {
    const salle = {
      connexion: Object.assign(new EventEmitter(), {
        joinConfig: { channelId: "vocal" },
        state: { status: "ready" },
        destroy() {},
      }),
      joueur: null,
      volume: 40,
      boucle: "aucune",
      enPause: false,
      courante: null,
      ressource: { identifiant: 0 },
      attente: [],
      flux: null,
      minuterieQuitter: null,
      ralentissements: 0,
      dernierProgres: 0,
    };
    // `stop()` émet `Idle` en changeant d'état, comme la bibliothèque réelle :
    // sans cela, la reprise déclenchée par la surveillance n'aurait pas lieu.
    salle.joueur = Object.assign(new EventEmitter(), {
      state: { status: AudioPlayerStatus.Playing, playbackDuration: 0 },
      stop() {
        const position = this.state.playbackDuration ?? 0;
        this.state = { status: AudioPlayerStatus.Idle };
        this.emit(AudioPlayerStatus.Idle, { resource: salle.ressource, playbackDuration: position });
      },
      pause() {
        this.state = { status: AudioPlayerStatus.Paused };
      },
      unpause() {},
      play() {},
    });
    return salle;
  };

  const entree = (titre, duree, tentatives = 0) => ({
    piste: { titre, duree, auteur: "auteur", flux: "http://exemple", page: "http://exemple", vignette: null },
    demandeur: "membre",
    tentatives,
  });

  let salle = fabriquerSalle();

  // --- Fin normale ----------------------------------------------------------
  lecteur.salles.clear();
  salle = fabriquerSalle();
  salle.courante = entree("A", 100);
  salle.attente = [entree("B", 100)];
  lecteur.salles.set("s1", salle);
  await lecteur.pisteTerminee("s1", 100_000);
  verifier("fin normale → morceau suivant", appels.at(-1)?.titre === "B" && !appels.at(-1)?.reprise);

  // --- Coupure en cours de morceau ------------------------------------------
  appels.length = 0;
  lecteur.salles.clear();
  salle = fabriquerSalle();
  salle.courante = entree("A", 200);
  salle.attente = [entree("B", 100)];
  lecteur.salles.set("s2", salle);
  await lecteur.pisteTerminee("s2", 30_000);
  verifier("coupure → le morceau est repris", appels.at(-1)?.titre === "A" && appels.at(-1)?.reprise === true);
  verifier("la file n'a pas été touchée", salle.attente.length === 1 && salle.attente[0].piste.titre === "B");
  verifier("le compteur de reprises a augmenté", salle.courante.tentatives === 1);

  // --- Alternance des deux méthodes de lecture ------------------------------
  salle.joueur.state = { status: AudioPlayerStatus.Playing, playbackDuration: 20_000 };
  await lecteur.pisteTerminee("s2", 20_000);
  verifier("la première reprise change de méthode", appels.at(-2)?.direct === true);
  verifier("la seconde revient au flux continu", appels.at(-1)?.direct === false);

  // --- Reprises épuisées ----------------------------------------------------
  appels.length = 0;
  lecteur.salles.clear();
  salle = fabriquerSalle();
  salle.courante = entree("A", 200, 2);
  salle.attente = [entree("B", 100)];
  lecteur.salles.set("s3", salle);
  await lecteur.pisteTerminee("s3", 30_000);
  verifier("reprises épuisées → morceau suivant", appels.at(-1)?.titre === "B");

  // --- Coupure au tout début, et fin normale à quelques secondes près -------
  appels.length = 0;
  lecteur.salles.clear();
  salle = fabriquerSalle();
  salle.courante = entree("A", 300);
  lecteur.salles.set("s4", salle);
  await lecteur.pisteTerminee("s4", 1_000);
  verifier("coupure après 1 s → reprise", appels.at(-1)?.titre === "A");

  appels.length = 0;
  lecteur.salles.clear();
  salle = fabriquerSalle();
  salle.courante = entree("A", 200);
  salle.attente = [entree("B", 100)];
  lecteur.salles.set("s5", salle);
  await lecteur.pisteTerminee("s5", 195_000);
  verifier("5 s d'écart avec la durée annoncée → fin normale", appels.at(-1)?.titre === "B");

  // --- `Idle` en double : le morceau suivant ne doit pas être sauté ---------
  appels.length = 0;
  lecteur.salles.clear();
  salle = fabriquerSalle();
  lecteur.salles.set("s6", salle);
  lecteur.cablerEvenements("s6", salle);
  const ancienne = { identifiant: "ancienne" };
  salle.ressource = ancienne;
  salle.courante = entree("A", 100);
  salle.attente = [entree("B", 100), entree("C", 100)];
  salle.joueur.emit(AudioPlayerStatus.Idle, { resource: ancienne, playbackDuration: 100_000 });
  await new Promise((r) => setTimeout(r, 50));
  salle.joueur.emit(AudioPlayerStatus.Idle, { resource: ancienne, playbackDuration: 100_000 });
  await new Promise((r) => setTimeout(r, 50));
  verifier("événement « Idle » en double → un seul morceau consommé", appels.length === 1 && appels[0].titre === "B");

  // --- File vide : départ différé ------------------------------------------
  lecteur.salles.clear();
  departs.length = 0;
  salle = fabriquerSalle();
  salle.courante = entree("A", 100);
  lecteur.salles.set("s7", salle);
  await lecteur.suivant("s7");
  verifier("file vide → le bot ne part pas aussitôt", departs.length === 0);
  verifier("une minuterie de départ est posée", Boolean(salle.minuterieQuitter));
  await new Promise((r) => setTimeout(r, 200));
  verifier("file vide → le bot part après le délai", departs.length === 1);

  departs.length = 0;
  lecteur.salles.clear();
  salle = fabriquerSalle();
  salle.courante = entree("A", 100);
  lecteur.salles.set("s8", salle);
  await lecteur.suivant("s8");
  lecteur.annulerDepart(salle);
  await new Promise((r) => setTimeout(r, 200));
  verifier("un morceau arrivé pendant l'attente annule le départ", departs.length === 0);

  lecteur.configuration = { ...configuration, musique: { ...reglages, delaiQuitter: 0 } };
  departs.length = 0;
  lecteur.salles.clear();
  salle = fabriquerSalle();
  salle.courante = entree("A", 100);
  lecteur.salles.set("s9", salle);
  await lecteur.suivant("s9");
  verifier("délai de 0 → départ immédiat (comportement d'origine)", departs.length === 1);

  // --- Flux bloqué : la surveillance relance -------------------------------
  lecteur.configuration = { ...configuration, musique: reglages };
  appels.length = 0;
  lecteur.salles.clear();
  salle = fabriquerSalle();
  salle.courante = entree("A", 300);
  salle.joueur.state = { status: AudioPlayerStatus.Playing, playbackDuration: 30_000 };
  lecteur.salles.set("s10", salle);
  lecteur.cablerEvenements("s10", salle);
  // Le premier contrôle pose la référence, les trois suivants comptent le
  // silence : une minute sans un échantillon, comme en production.
  for (let i = 0; i < 4; i += 1) lecteur.surveiller();
  verifier("flux bloqué → la lecture est relancée", salle.joueur.state.status === AudioPlayerStatus.Idle);
  await new Promise((r) => setTimeout(r, 2_000));
  verifier("flux bloqué → le morceau est repris", appels.at(-1)?.titre === "A" && appels.at(-1)?.reprise === true);

  // --- La surveillance ne réveille ni une pause, ni un flux qui avance ------
  let arretsEnPause = 0;
  lecteur.salles.clear();
  salle = fabriquerSalle();
  salle.courante = entree("A", 300);
  salle.enPause = true;
  salle.joueur.stop = () => {
    arretsEnPause += 1;
  };
  salle.joueur.state = { status: AudioPlayerStatus.Paused, playbackDuration: 30_000 };
  lecteur.salles.set("s12", salle);
  for (let i = 0; i < 5; i += 1) lecteur.surveiller();
  verifier("lecture en pause → aucune intervention", arretsEnPause === 0);

  let arretsNormaux = 0;
  lecteur.salles.clear();
  salle = fabriquerSalle();
  salle.courante = entree("A", 300);
  salle.joueur.stop = () => {
    arretsNormaux += 1;
  };
  lecteur.salles.set("s13", salle);
  for (let position = 10_000; position <= 40_000; position += 10_000) {
    salle.joueur.state = { status: AudioPlayerStatus.Playing, playbackDuration: position };
    lecteur.surveiller();
  }
  verifier("lecture qui progresse → aucune intervention", arretsNormaux === 0);

  await new Promise((r) => setTimeout(r, 100));
}

// ---------------------------------------------------------------------------
// 3. Le panneau « en cours »
// ---------------------------------------------------------------------------

console.log("\n=== 3. Panneau « en cours » ===");
{
  const lecteur = new Lecteur(configuration);
  const salle = {
    connexion: { joinConfig: { channelId: "vocal" } },
    joueur: { state: { status: AudioPlayerStatus.Playing, playbackDuration: 65_000 } },
    volume: 55,
    boucle: "aucune",
    enPause: false,
    courante: {
      piste: {
        titre: "Le Retour du Dauphin",
        auteur: "Les Troubadours",
        duree: 180,
        vignette: "https://exemple/v.png",
        page: "https://exemple/p",
      },
      demandeur: "ethan",
      tentatives: 0,
    },
    attente: [
      { piste: { titre: "Chanson B", auteur: "Auteur B" }, demandeur: "x", tentatives: 0 },
      { piste: { titre: "Chanson C", auteur: "Auteur C" }, demandeur: "x", tentatives: 0 },
    ],
    minuterieQuitter: null,
  };
  lecteur.salles.set("s", salle);
  const contexte = { lecteur, configuration, client: { user: { setActivity() {} } } };

  const rendu = contenu(contexte, "s");
  verifier("le panneau se construit", !rendu.disparu && rendu.embed !== null);
  verifier("la barre de progression est là", rendu.embed.description.includes(barreProgression(65_000, 180_000)));
  verifier("position et durée lisibles", rendu.embed.description.includes("1:05 / 3:00"));
  verifier("les durées passent à l'heure au-delà", tempsLecture(3_725_000, 4_000_000) === "1:02:05 / 1:06:40");
  verifier("la file à venir est listée", rendu.embed.description.includes("À suivre (2)"));
  verifier("la vignette est reprise", rendu.embed.thumbnail?.url === "https://exemple/v.png");
  verifier("le volume est affiché", rendu.embed.fields?.some((f) => f.name === "Volume" && f.value === "55 %"));

  const boutons = rendu.composants[0]?.toJSON().components ?? [];
  verifier("quatre boutons", boutons.length === 4);
  verifier(
    "les identifiants des boutons sont ceux attendus",
    JSON.stringify(boutons.map((b) => b.custom_id)) ===
      JSON.stringify(["musique:pause", "musique:suivant", "musique:boucle", "musique:arreter"]),
  );

  salle.enPause = true;
  const enPause = contenu(contexte, "s");
  verifier(
    "en pause, le bouton propose de reprendre",
    enPause.composants[0].toJSON().components[0].custom_id === "musique:reprendre" &&
      enPause.embed.description.includes("En pause"),
  );
  salle.enPause = false;

  salle.courante = null;
  salle.attente = [];
  salle.minuterieQuitter = setTimeout(() => {}, 1_000_000);
  const fin = contenu(contexte, "s");
  verifier("le départ annoncé est visible", fin.embed.description.includes("quitte le salon dans 5 min"));
  clearTimeout(salle.minuterieQuitter);

  lecteur.salles.delete("s");
  const disparu = contenu(contexte, "s");
  verifier("salle rangée → le panneau perd ses boutons", disparu.disparu === true && disparu.composants.length === 0);

  // --- Pose du panneau, et message supprimé à la main ----------------------
  //
  // Le panneau vit dans un message ordinaire : il peut être supprimé, ou le
  // salon purgé. Un panneau qui se croit vivant ne se réparerait jamais, et
  // `/panneau` annoncerait une réussite sans rien afficher.
  lecteur.salles.set("s", salle);
  salle.courante = {
    piste: { titre: "A", auteur: "B", duree: 120, vignette: null, page: "https://exemple/p" },
    demandeur: "ethan",
    tentatives: 0,
  };
  salle.minuterieQuitter = null;

  let envois = 0;
  let modifications = 0;
  let messageVivant = true;
  const salon = {
    id: "salon-texte",
    send: async () => {
      envois += 1;
      return { id: `message-${envois}` };
    },
  };
  contexte.client.channels = {
    fetch: async () => ({
      messages: {
        fetch: async (id) => (messageVivant ? { id, edit: async () => { modifications += 1; } } : null),
      },
    }),
  };

  oublier("s2");
  const premiere = await poser(contexte, "s", salon);
  verifier("pose du panneau → un message est envoyé", premiere === true && envois === 1);
  verifier("le panneau est retenu", obtenir("s")?.messageId === "message-1");

  await poser(contexte, "s", salon);
  verifier("reposer dans le même salon ne reposte pas", envois === 1 && modifications >= 1);

  messageVivant = false;
  const repare = await poser(contexte, "s", salon);
  verifier("message supprimé à la main → le panneau est reposé", repare === true && envois === 2);
  oublier("s");
}

// ---------------------------------------------------------------------------
// 4 et 5. Le flux réel (réseau)
// ---------------------------------------------------------------------------

console.log("\n=== 4. Flux de lecture (yt-dlp → FFmpeg → PCM) ===");
const lecteur = new Lecteur({ ...configuration, musique: { ...configuration.musique, dureeMax: 36_000 } });
let piste = null;
try {
  [piste] = await lecteur.rechercher("musique celtique", 1);
  verifier("recherche yt-dlp", Boolean(piste?.titre), piste?.titre);
} catch (erreur) {
  nonVerifiable(`la recherche a échoué (${erreur.message})`);
}

if (piste) {
  // YouTube refuse par intermittence le téléchargement direct (`HTTP Error
  // 403`), y compris avec un yt-dlp à jour : mesuré à un essai sur quatre. On
  // retente une fois, et un double refus reste « non vérifié » : c'est l'amont.
  let mesure = null;
  for (let essai = 1; essai <= 2 && !mesure; essai += 1) {
    const { flux, processus } = lecteur.ouvrirFlux(piste);
    const ressource = createAudioResource(flux, { inputType: StreamType.Arbitrary, inlineVolume: true });
    const joueur = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
        maxMissedFrames: configuration.musique.toleranceSilence,
      },
    });

    let erreur = null;
    joueur.on("error", (evenement) => {
      erreur = evenement;
    });
    joueur.play(ressource);

    const debut = Date.now();
    await new Promise((r) => setTimeout(r, 9_000));
    const position = joueur.state.playbackDuration ?? 0;
    const ecoule = (Date.now() - debut) / 1000;

    if (position > 5_000) mesure = { essai, position, ecoule };
    else console.log(`  ---- essai ${essai} sans son : yt-dlp code ${processus.exitCode}, lecteur ${erreur?.message ?? "sans erreur"}`);

    const salle = { flux: { flux, processus } };
    lecteur.fermerFlux(salle);
    await new Promise((r) => setTimeout(r, 500));

    if (mesure) {
      verifier("processus yt-dlp lancé", Boolean(processus.pid), `pid ${processus.pid}`);
      verifier("le son sort réellement", true, `${Math.round(position)} ms décodés en ${ecoule.toFixed(1)} s`);
      verifier(
        "fermerFlux tue le processus yt-dlp",
        processus.exitCode !== null || processus.killed,
        `code ${processus.exitCode}`,
      );
      if (joueur.state.status === AudioPlayerStatus.Idle) {
        console.log(
          `  ---- YouTube a coupé le flux après ${(position / 1000).toFixed(1)} s (${erreur?.message ?? "fin brutale"}) :`,
        );
        console.log("       c'est l'incident que la reprise couvre — vérifié en section 5.");
      }
    }
    joueur.stop(true);
  }
  if (!mesure) nonVerifiable("YouTube a refusé les deux essais (amont)");

  // -------------------------------------------------------------------------
  console.log("\n=== 5. Second recours : l'URL extraite ===");
  // On casse volontairement le chemin de yt-dlp : c'est la panne réelle — le
  // flux est refusé, ou le binaire n'est plus là. La reprise doit alors passer
  // par l'URL extraite lors de la recherche, seconde méthode indépendante.
  const configurationCassee = {
    ...configuration,
    chemins: { ...configuration.chemins, ytdlp: "C:/chemin/qui/n-existe-pas/yt-dlp.exe" },
  };
  const lecteurCassee = new Lecteur(configurationCassee);
  const joueur = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
      maxMissedFrames: configuration.musique.toleranceSilence,
    },
  });
  const salle = {
    connexion: { joinConfig: { channelId: "vocal" }, state: { status: "ready" }, destroy() {} },
    joueur,
    volume: 40,
    boucle: "aucune",
    enPause: false,
    courante: null,
    ressource: null,
    attente: [],
    flux: null,
    minuterieQuitter: null,
    ralentissements: 0,
    dernierProgres: 0,
  };
  // Les deux écouteurs que pose `cablerEvenements` en production. Celui de
  // « error » n'est pas décoratif : un AudioPlayer qui émet « error » sans
  // personne pour l'écouter fait tomber tout le processus Node.
  let erreurs = 0;
  joueur.on("error", () => {
    erreurs += 1;
  });
  joueur.on(AudioPlayerStatus.Idle, (ancien) => {
    void lecteurCassee.pisteTerminee("sF", ancien?.playbackDuration ?? 0);
  });
  lecteurCassee.salles.set("sF", salle);

  const entree = { piste: { ...piste }, demandeur: "membre", tentatives: 0 };
  salle.courante = entree;
  lecteurCassee.lancer("sF", salle, entree);

  await new Promise((r) => setTimeout(r, 3_000));
  verifier("flux cassé → la reprise est déclenchée", entree.tentatives === 1, `tentatives ${entree.tentatives}`);
  verifier("l'échec est signalé sans tuer le bot", erreurs >= 1, `${erreurs} erreur(s) de lecteur`);

  const debut = Date.now();
  while ((joueur.state.playbackDuration ?? 0) < 4_000 && Date.now() - debut < 25_000) {
    await new Promise((r) => setTimeout(r, 500));
  }
  verifier(
    "second recours → le son joue quand même",
    (joueur.state.playbackDuration ?? 0) >= 4_000,
    `${joueur.state.playbackDuration ?? 0} ms lus`,
  );
  verifier("la reprise n'a pas relancé yt-dlp", salle.flux === null || salle.flux.processus === null);
  joueur.stop(true);
}

// ---------------------------------------------------------------------------
// Bilan
// ---------------------------------------------------------------------------

const bilan = echecs === 0 ? "TOUT EST VERT" : `${echecs} vérification(s) en échec`;
console.log(`\n${bilan}${nonVerifie > 0 ? ` — ${nonVerifie} point(s) non vérifié(s) (réseau ou YouTube)` : ""}`);
process.exit(echecs === 0 ? 0 : 1);
