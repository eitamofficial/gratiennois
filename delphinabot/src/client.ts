/**
 * Le client Discord.
 *
 * Tout l'état de travail du bot vit ici : les commandes enregistrées, les
 * compteurs de protection et le lecteur audio. Les modules ne stockent rien
 * ailleurs — un bot dont l'état est éparpillé dans des variables de module
 * devient impossible à raisonner au premier incident.
 */

import { Client, GatewayIntentBits, Partials } from "discord.js";
import type { Configuration } from "./config.js";
import { FenetreGlissante, NomsReserves, Temporisations } from "./lib/fenetres.js";
import type { Commande } from "./core/types.js";
import { LecteurAudio } from "./modules/musique/lecteur.js";

/**
 * Intents demandés.
 *
 * `GuildMembers` et `MessageContent` sont deux intents **privilégiés** : sans
 * eux, le bot ne voit ni les nouveaux membres ni le texte des messages, et la
 * moitié de ses modules s'écroule. Ils doivent être activés dans le portail
 * développeur, à l'invite du bot, puis propagés (jusqu'à une heure).
 */
const INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildVoiceStates,
];

export class Delphinabot extends Client {
  readonly configuration: Configuration;
  readonly commandes = new Map<string, Commande>();
  readonly temporisations = new Temporisations();
  /** Arrivées de membres, pour la détection de raid. */
  readonly arrivees = new FenetreGlissante(10_000);
  /** Messages envoyés, pour la détection de flood. */
  readonly envois = new FenetreGlissante(10_000);
  /** Actions de modération en cours, pour casser les rafales. */
  readonly actionsModeration = new FenetreGlissante(10_000);
  /** Pseudos signalés comme usurpés. */
  readonly pseudos = new NomsReserves();
  /** Lecteur audio, un par serveur. */
  readonly lecteur: LecteurAudio;

  constructor(configuration: Configuration) {
    super({
      intents: INTENTS,
      partials: [Partials.GuildMember, Partials.Message, Partials.Channel],
      // Le bot n'a rien à faire dans les DM des autres ; on désactive au maximum.
      allowedMentions: { parse: [], users: [], roles: [] },
    });

    this.configuration = configuration;
    this.lecteur = new LecteurAudio(this);
  }

  /** Enregistre une commande. Les doublons sont une erreur de développement. */
  enregistrerCommande(commande: Commande): void {
    if (this.commandes.has(commande.nom)) {
      throw new Error(`Commande en double : ${commande.nom}`);
    }
    this.commandes.set(commande.nom, commande);
  }

  /** Toutes les commandes, pour le déploiement et l'aide. */
  listeCommandes(): Commande[] {
    return [...this.commandes.values()];
  }
}
