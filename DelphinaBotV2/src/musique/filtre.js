import { spawn } from 'node:child_process';

/**
 * Applique un filtre audio à un flux de lecture, et renvoie le nouveau flux
 * (et le processus `ffmpeg` qui le produit) tel qu'il doit être consommé par
 * `@discordjs/voice`.
 *
 * Le filtre est choisi en fonction de l'effet demandé :
 * - `nightcore`   → atempo=1.3 + asetrate=48000
 * - `speed`       → atempo=<v>
 * - `pitch`       → asetrate=<fr>
 * - `volume`      → volume=<dB>
 * - `echo`        → aecho=…
 * - `reverb`      → aresample + chorus
 * - `titre`       → titler=<texte>
 * - `reverse`     → areverse
 *
 * @param {Readable} flux - Flux audio d'entrée.
 * @param {string} effet - Nom de l'effet.
 * @param {string} valeur - Paramètre de l'effet.
 * @returns {{flux: Readable, processus: ChildProcess}} Flux filtré et processus.
 */
export function appliquerFiltre(flux, effet, valeur) {
  const commandes = {
    nightcore: [`-filter_complex`, `atempo=1.3,asetrate=48000`],
    speed: [`-filter_complex`, `atempo=${valeur}`],
    pitch: [`-filter_complex`, `asetrate=${valeur}`],
    volume: [`-filter_complex`, `volume=${valeur}`],
    echo: [`-filter_complex`, `aecho=0.8:0.9:1000:0.3`],
    reverb: [`-filter_complex`, `aresample=16000,chorus=0.5:0.5:10:0.5:0.5:0.5`],
    titre: [`-filter_complex`, `titler=${valeur}`],
    reverse: [`-filter_complex`, `areverse`],
  };

  const cmds = commandes[effet];
  if (!cmds) {
    throw new ErreurFiltre(`Filtre « ${effet} » inconnu. Les effets disponibles sont : nightcore, speed, pitch, volume, echo, reverb, titre, reverse.`);
  }

  const processus = spawn('ffmpeg', [
    '-i', 'pipe:0',
    ...cmds,
    '-f', 's16le',
    '-acodec', 'pcm_s16le',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1',
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  processus.stderr.on('data', (morceau) => {
    journal.debug(`ffmpeg (filtre ${effet}) : ${morceau.toString('utf8').slice(-200)}`);
  });

  return { flux: processus.stdout, processus };
}

/** Erreur levée quand un filtre demandé n'existe pas. */
export class ErreurFiltre extends Error {}

/** Journal de debug pour les erreurs de filtrage. */
const journal = {
  debug: (message) => {},
};
