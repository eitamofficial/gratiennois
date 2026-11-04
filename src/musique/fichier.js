import { access, constants } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

// Vérifie qu'un fichier est un audio reconnu.
export function estAudio(chemin) {
  const ext = String(chemin ?? '').toLowerCase();
  return ['.mp3', '.m4a', '.flac', '.ogg', '.wav', '.webm'].includes(
    ext.slice(ext.lastIndexOf('.')),
  );
}

// Formate une durée en secondes en `mm:ss`.
export function formaterDuree(valeur) {
  const total = Math.floor(valeur);
  const minutes = Math.floor(total / 60);
  const secondes = total % 60;
  return `${minutes}:${secondes.toString().padStart(2, '0')}`;
}

// Lit la durée d'un audio avec `ffmpeg`.
export async function lireDuree(chemin) {
  const execFileAsync = promisify(execFile);

  const { stdout } = await execFileAsync('ffmpeg', [
    '-i',
    chemin,
    '-f',
    'null',
    '-',
  ], { timeout: 10000 });

  const match = stdout.match(/(\d+):(\d+)/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

// Ajoute un morceau lu depuis un fichier local à la file de lecture.
export async function ajouterResultat(
  lecteur,
  serveurId,
  chemin,
  demandeur,
  nombre = 1,
  { dureeMax = lecteur.configuration.musique.dureeMax, toleranceSilence } = {},
) {
  if (dureeMax === undefined) dureeMax = lecteur.configuration.musique.dureeMax;
  if (toleranceSilence === undefined) toleranceSilence = lecteur.configuration.musique.toleranceSilence;

  const propre = String(chemin ?? '').trim();
  if (!propre) throw new Error('Le chemin est vide.');

  let absolu = propre;
  if (!path.isAbsolute(propre)) {
    absolu = join(lecteur.configuration.racineFichiers ?? process.cwd(), propre);
  }

  try {
    await access(absolu, constants.R_OK);
  } catch {
    throw new Error(`Fichier introuvable : ${propre}`);
  }

  const etiquette = estAudio(absolu)
    ? ` audio (${path.extname(absolu).slice(1).toUpperCase()})`
    : ` fichier « ${path.extname(absolu).slice(1) ?? '(sans extension)' } »`;

  let duree;
  try {
    duree = await lireDuree(absolu);
  } catch (erreurLecture) {
    throw new Error(`Fichier impossible à lire : ${erreurLecture.message}`);
  }

  if (duree > dureeMax) {
    throw new Error(
      `Ce morceau fait ${formaterDuree(duree)}, ce qui dépasse la limite de ${Math.round(dureeMax / 60)} minutes. ` +
      `Règlez DUREE_MUSIQUE_MAX dans DelphinaBotV2/.env si vous voulez l'écouter avec le reste de la file.`,
    );
  }

  const salle = lecteur.obtenir(serveurId);
  if (salle?.courante && salle.courante.piste.page === absolu) {
    throw new Error("Ce morceau est déjà en cours de lecture.");
  }

  const piste = {
    titre: path.basename(absolu, path.extname(absolu)),
    page: absolu,
    duree,
    auteur: '—',
    vignette: null,
    demande: demandeur,
  };

  const entree = { piste, demandeur, tentatives: 0 };
  if (!salle?.courante) lecteur.lancer(serveurId, salle, entree, { direct: true });
  else salle.attente.push(entree);

  return [piste];
}
