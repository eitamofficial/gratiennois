/**
 * Musique.
 *
 * Le choix technique est explicite : `yt-dlp` résout la recherche et produit
 * une URL audio directe, `@discordjs/voice` la diffuse, et FFmpeg la transcode.
 * Ces trois éléments sont installés **sur la machine**, pas dans les
 * dépendances npm : c'est la seule façon d'obtenir un flux stable, et cela
 * évite d'embarquer un binaire dans le dépôt.
 *
 * Ce que le module refuse de faire, volontairement :
 *
 * - diffuser autre chose que ce qu'un membre a demandé nommément ;
 * - se souvenir, entre deux redémarrages, de ce qu'il diffusait ;
 * - diffuser dans un salon vocal où il n'a pas été invité.
 *
 * L'état vit en mémoire. Un lecteur de musique redémarre au moins une fois
 * par mois : un salon de musique vide au petit matin n'est pas un incident.
 */

import { spawn } from "node:child_process";
import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  type AudioPlayer,
  type AudioResource,
  type VoiceConnection,
} from "@discordjs/voice";
import { ChannelType, type Guild } from "discord.js";
import type { Delphinabot } from "../../client.js";
import { journal } from "../../logger.js";
import { formaterDuree } from "../../lib/duree.js";
import { erreur } from "../../lib/embres.js";
import { melanger } from "../../lib/texte.js";

/** Une piste, telle que renvoyée par `yt-dlp`. */
export interface Piste {
  titre: string;
  /** URL de la page, celle qu'on affiche et qu'on peut partager. */
  page: string;
  /** Flux audio direct, éphémère. */
  flux: string;
  duree: number;
  auteur: string;
  vignette: string | null;
  /** Requête d'origine, pour le message « à la demande de ». */
  demande: string;
}

export interface EntreeFile {
  piste: Piste;
  demandeur: string;
}

/** Erreur compréhensible par l'utilisateur, à afficher telle quelle. */
export class ErreurMusique extends Error {}

/** Un salon vocal où le bot joue. */
class Salle {
  readonly connexion: VoiceConnection;
  readonly joueur: AudioPlayer;
  volume: number;
  boucle: "aucune" | "piste" | "file" = "aucune";
  enPause = false;
  courante: EntreeFile | null = null;
  /** Ressource en cours de diffusion, pour le volume et la reprise. */
  ressource: AudioResource | null = null;
  readonly attente: EntreeFile[] = [];

  constructor(connexion: VoiceConnection, joueur: AudioPlayer, volume: number) {
    this.connexion = connexion;
    this.joueur = joueur;
    this.volume = volume;
  }
}

export class LecteurAudio {
  private readonly salles = new Map<string, Salle>();

  constructor(private readonly bot: Delphinabot) {}

  /** Salle active d'un serveur, ou `null`. */
  obtenir(serveurId: string): Salle | null {
    return this.salles.get(serveurId) ?? null;
  }

  /** État public, pour l'affichage dans les commandes. */
  resume(serveurId: string): string {
    const salle = this.salles.get(serveurId);
    if (!salle) return "Aucune musique n'est en cours dans ce serveur.";
    if (salle.enPause) return "La lecture est en pause.";
    if (!salle.courante) return "La file d'attente est vide.";

    const { piste } = salle.courante;
    return `En cours : **${piste.titre}** — ${piste.auteur} (${formaterDuree(piste.duree * 1000)})`;
  }

  /**
   * Recherche une piste.
   *
   * `yt-dlp` fait tout le travail : une URL est lue telle quelle, un texte est
   * passé en recherche. Un seul résultat, parce qu'une file de dix
   * recherches floues n'est jamais ce que le membre voulait.
   */
  async rechercher(cible: string, limite = 1): Promise<Piste[]> {
    const estUrl = /^https?:\/\//i.test(cible);
    const arguments_ = estUrl
      ? ["-j", "--no-playlist", "--no-warnings", cible]
      : ["-j", "--no-playlist", "--no-warnings", "--default-search", "ytsearch", `${limite}:${cible}`];

    const sortie = await this.executerYtDlp(arguments_);

    let brut: Record<string, unknown>;
    try {
      brut = JSON.parse(sortie) as Record<string, unknown>;
    } catch {
      throw new ErreurMusique("yt-dlp n'a pas renvoyé de résultat lisible.");
    }

    const resultat = brut._type === "playlist" ? brut.entries : [brut];
    if (!Array.isArray(resultat) || resultat.length === 0) {
      throw new ErreurMusique("Aucun résultat pour cette recherche.");
    }

    const dureeMax = this.bot.configuration.dureeMusiqueMax / 1000;
    const jouables = (resultat as Record<string, unknown>[])
      .map((entree) => this.versPiste(entree, cible))
      .filter((piste): piste is Piste => piste !== null)
      // Un morceau plus long que la limite n'est pas proposé : mieux vaut une
      // recherche vide qu'une piste refusée en cours de route.
      .filter((piste) => piste.duree <= dureeMax);

    if (jouables.length === 0) {
      throw new ErreurMusique(
        `Aucun résultat jouable : les pistes proposées dépassent la limite de ${Math.round(dureeMax / 60)} minutes.`,
      );
    }

    return jouables.slice(0, Math.max(1, limite));
  }

  /** Traduit une entrée `yt-dlp` en piste, ou `null` si elle n'est pas jouable. */
  private versPiste(brut: Record<string, unknown>, demande: string): Piste | null {
    const flux = String(brut.url ?? "");
    if (!flux.startsWith("http")) return null;

    return {
      titre: String(brut.title ?? "Sans titre"),
      page: String(brut.webpage_url ?? flux),
      flux,
      duree: Number(brut.duration ?? 0),
      auteur: String(brut.uploader ?? String(brut.artist ?? "Auteur inconnu")),
      vignette: typeof brut.thumbnail === "string" ? brut.thumbnail : null,
      demande,
    };
  }

  /** Lance `yt-dlp` et renvoie sa sortie, en traduisant les échecs. */
  private executerYtDlp(arguments_: string[]): Promise<string> {
    const { ytdlp: chemin } = this.bot.configuration.chemins;

    return new Promise((resoudre, rejeter) => {
      const processus = spawn(chemin, arguments_, { windowsHide: true });
      let sortie = "";
      let erreurs = "";

      processus.stdout.on("data", (morceau: Buffer) => {
        sortie += morceau.toString("utf8");
      });
      processus.stderr.on("data", (morceau: Buffer) => {
        erreurs += morceau.toString("utf8");
      });

      processus.on("error", () => {
        rejeter(
          new ErreurMusique(
            `yt-dlp est introuvable (${chemin}). Installez-le : voir le README de DelphinaBot.`,
          ),
        );
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
        rejeter(new ErreurMusique(raison));
      });
    });
  }

  /** Rejoint un salon vocal, ou déplace la connexion si le bot a bougé. */
  async rejoindre(serveurId: string, salonId: string): Promise<{ ok: boolean; raison: string | null }> {
    const existante = this.salles.get(serveurId);
    if (existante) {
      if (existante.connexion.joinConfig.channelId === salonId) {
        return { ok: true, raison: null };
      }
      existante.connexion.destroy();
      this.salles.delete(serveurId);
    }

    // discord.js 14.16 expose l'adaptateur vocal par serveur : c'est lui
    // qui relaie la connexion vocale vers la passerelle Discord.
    const guild = this.bot.guilds.cache.get(serveurId);
    if (!guild) {
      return { ok: false, raison: "Serveur introuvable dans le cache du bot." };
    }

    let connexion: VoiceConnection;
    try {
      connexion = joinVoiceChannel({
        channelId: salonId,
        guildId: serveurId,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
      });
    } catch {
      return {
        ok: false,
        raison: "Impossible de rejoindre ce salon vocal.",
      };
    }

    try {
      await entersState(connexion, VoiceConnectionStatus.Ready, 20_000);
    } catch {
      connexion.destroy();
      return {
        ok: false,
        raison:
          "Le salon vocal est inaccessible : vérifiez que le bot a la permission de se connecter et de parler.",
      };
    }

    const joueur = createAudioPlayer({
      // Sans auditeur, la lecture se met en pause au lieu de tourner dans le
      // vide : un salon vide ne doit pas consommer de bande passante.
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });

    const salle = new Salle(connexion, joueur, 40);
    this.salles.set(serveurId, salle);
    this.cablerEvenements(serveurId, salle);
    return { ok: true, raison: null };
  }

  /** Branche les événements du lecteur : fin de piste, erreur, coupure. */
  private cablerEvenements(serveurId: string, salle: Salle): void {
    salle.joueur.on(AudioPlayerStatus.Idle, () => {
      void this.pisteTerminee(serveurId);
    });

    salle.joueur.on("error", (erreurReçue) => {
      journal.error(`Audio (${serveurId}) : ${(erreurReçue as Error).message}`);
      void this.suivant(serveurId);
    });

    salle.connexion.on(VoiceConnectionStatus.Disconnected, () => {
      // Discord coupe la connexion quand le bot se retrouve seul dans le
      // salon. C'est le comportement normal, pas une panne : on attend cinq
      // secondes que la reconnexion tente le coup avant de tout ranger.
      setTimeout(() => {
        const actuelle = this.salles.get(serveurId);
        if (actuelle && actuelle.connexion.state.status === VoiceConnectionStatus.Disconnected) {
          this.quitter(serveurId);
        }
      }, 5_000);
    });

    salle.connexion.on(VoiceConnectionStatus.Destroyed, () => {
      this.salles.delete(serveurId);
    });
  }

  /** Ajoute une piste et démarre la lecture si la salle est libre. */
  async ajouter(serveurId: string, entree: EntreeFile, demarrer = true): Promise<EntreeFile | null> {
    const salle = this.salles.get(serveurId);
    if (!salle) return null;

    if (salle.courante && demarrer) {
      salle.attente.push(entree);
      return null;
    }
    await this.lancer(serveurId, salle, entree);
    return entree;
  }

  /** Démarre une piste dans la salle donnée. */
  private async lancer(serveurId: string, salle: Salle, entree: EntreeFile): Promise<void> {
    salle.courante = entree;
    salle.enPause = false;

    try {
      // `inlineVolume` rend le volume adjustable en cours de lecture, sans
      // recréer le flux : c'est ce qui permet a `/volume` de reagir tout de
      // suite.
      const ressource: AudioResource = createAudioResource(entree.piste.flux, {
        inlineVolume: true,
      });
      ressource.volume?.setVolume(salle.volume / 100);
      salle.ressource = ressource;
      salle.joueur.play(ressource);
    } catch (erreurReçue) {
      journal.error(`Lecture impossible : ${(erreurReçue as Error).message}`);
      salle.joueur.stop();
    }
  }

  /** Passe à la piste suivante, en appliquant la boucle. */
  async suivant(serveurId: string): Promise<EntreeFile | null> {
    const salle = this.salles.get(serveurId);
    if (!salle) return null;

    if (salle.boucle === "piste" && salle.courante) {
      await this.lancer(serveurId, salle, salle.courante);
      return salle.courante;
    }

    const suivante = salle.attente.shift();
    if (suivante) {
      await this.lancer(serveurId, salle, suivante);
      return suivante;
    }

    if (salle.boucle === "file" && salle.courante) {
      salle.attente.push(salle.courante);
      return this.suivant(serveurId);
    }

    salle.courante = null;
    salle.ressource = null;
    this.quitter(serveurId);
    return null;
  }

  private async pisteTerminee(serveurId: string): Promise<void> {
    const salle = this.salles.get(serveurId);
    if (!salle) return;
    if (salle.enPause) return;
    await this.suivant(serveurId);
  }

  /** Ajoute une piste au hasard parmi les résultats, ou remélange la file. */
  async ajouterResultats(
    serveurId: string,
    requete: string,
    demandeur: string,
    nombre = 1,
  ): Promise<Piste[]> {
    const pistes = await this.rechercher(requete, Math.max(1, nombre));
    if (pistes.length === 0) throw new ErreurMusique("Aucun résultat.");

    // Un seul résultat : on le joue. Plusieurs : on brass pour ne pas toujours
    // servir la même piste à la même personne.
    const ordre = pistes.length === 1 ? pistes : melanger(pistes);

    const salle = this.salles.get(serveurId);
    if (!salle) return ordre;

    for (const piste of ordre) {
      const entree: EntreeFile = { piste, demandeur };
      if (!salle.courante) await this.lancer(serveurId, salle, entree);
      else salle.attente.push(entree);
    }
    return ordre;
  }

  /** Met en pause. */
  pause(serveurId: string): boolean {
    const salle = this.salles.get(serveurId);
    if (!salle || !salle.courante) return false;
    if (salle.enPause) return false;
    salle.joueur.pause();
    salle.enPause = true;
    return true;
  }

  /** Reprend la lecture. */
  reprendre(serveurId: string): boolean {
    const salle = this.salles.get(serveurId);
    if (!salle || !salle.ressource || !salle.enPause) return false;
    salle.joueur.play(salle.ressource);
    salle.enPause = false;
    return true;
  }

  /** Change le volume, entre 0 et 100. */
  volume(serveurId: string, valeur: number): number {
    const salle = this.salles.get(serveurId);
    if (!salle) return -1;
    salle.volume = Math.max(0, Math.min(100, valeur));
    salle.ressource?.volume?.setVolume(salle.volume / 100);
    return salle.volume;
  }

  /** Quitte le salon et oublie la file. */
  quitter(serveurId: string): void {
    const salle = this.salles.get(serveurId);
    if (!salle) return;
    salle.joueur.stop(true);
    salle.ressource = null;
    salle.connexion.destroy();
    this.salles.delete(serveurId);
  }

  /** Retire une piste de la file, à partir de son index. */
  retirer(serveurId: string, index: number): EntreeFile | null {
    const salle = this.salles.get(serveurId);
    if (!salle || index < 0 || index >= salle.attente.length) return null;
    return salle.attente.splice(index, 1)[0] ?? null;
  }

  /** Positionne une piste de la file en tête. */
  deplacer(serveurId: string, index: number): EntreeFile | null {
    const salle = this.salles.get(serveurId);
    if (!salle || index < 0 || index >= salle.attente.length) return null;
    const [element] = salle.attente.splice(index, 1);
    if (!element) return null;
    salle.attente.unshift(element);
    return element;
  }

  /** File d'attente, sous forme de texte. */
  file(serveurId: string): string[] {
    const salle = this.salles.get(serveurId);
    if (!salle) return [];
    return salle.attente.map((entree, index) => `${index + 1}. ${entree.piste.titre} — ${entree.piste.auteur}`);
  }

  /** Le salon vocal est-il un salon vocal (et pas un salon texte) ? */
  static estSalonVocal(type: ChannelType): boolean {
    return type === ChannelType.GuildVoice || type === ChannelType.GuildStageVoice;
  }

  /** Message d'erreur prêt à afficher. */
  static messageErreur(erreurReçue: unknown) {
    return erreur(
      erreurReçue instanceof ErreurMusique
        ? erreurReçue.message
        : "La musique a échoué pour une raison inconnue.",
      "Musique indisponible",
    );
  }
}

/** Accès au salon vocal courant d'un serveur, pour l'affichage. */
export function connexionCourante(serveurId: string): VoiceConnection | null {
  return getVoiceConnection(serveurId) ?? null;
}

/** Le bot est-il connecté quelque part sur ce serveur ? */
export function joueQuelquePart(guild: Guild): boolean {
  return getVoiceConnection(guild.id) !== null;
}
