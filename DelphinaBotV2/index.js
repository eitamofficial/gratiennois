/**
 * Point d'entrée de DelphinaBot V2.
 *
 * L'ordre des opérations est le point important de ce fichier :
 *
 * 1. lire la configuration, **en échouant clairement** s'il manque une
 *    variable essentielle ;
 * 2. prendre le verrou d'instance unique, pour que deux bots ne se disputent
 *    jamais les mêmes interactions ni le même fichier de données ;
 * 3. ouvrir le stockage et lire la configuration partagée avec le wiki ;
 * 4. seulement ensuite, se connecter à Discord.
 *
 * Inverser 1 et 3 est l'erreur classique : le bot se connecte, puis répète
 * « DISCORD_BOT_TOKEN absent » toutes les dix minutes dans un journal que
 * personne ne lit.
 */

import { Client, GatewayIntentBits, Partials } from "discord.js";
import { ErreurConfiguration, lireConfiguration, resumer } from "./src/config.js";
import { RACINE } from "./src/env.js";
import { journal } from "./src/logger.js";
import { ouvrirStockage } from "./src/stockage.js";
import { lireRoster } from "./src/wiki.js";
import { Lecteur } from "./src/musique/lecteur.js";
import { rafraichir } from "./src/musique/panneau.js";
import { COMMANDES } from "./src/commandes/index.js";
import { demarrer, installerEvenements } from "./src/evenements.js";
import { verifierDependances } from "./src/dependances.js";
import { ErreurVerrou, prendreVerrou } from "./src/verrou.js";

/**
 * Intents demandés.
 *
 * `GuildMembers` et `MessageContent` sont deux intents **privilégiés** : sans
 * eux, le bot ne voit ni les arrivées de membres ni le texte des messages, et
 * la moitié du bot s'écroule. Ils doivent être activés dans le portail
 * développeur Discord (onglet *Bot*), puis la propagation prend jusqu'à une
 * heure.
 */
const INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildMessageReactions,
];

/** Arrêt propre : on ferme Discord, on écrit le stockage, puis on sort. */
function installerArrets(client, stockage, verrou) {
  let arrete = false;

  const arreter = async (raison) => {
    if (arrete) return;
    arrete = true;
    journal.info(`Arrêt demandé (${raison})...`);
    stockage.ecrireMaintenant();
    verrou.liberer();
    await client.destroy().catch(() => {});
    process.exit(0);
  };

  process.on("SIGINT", () => void arreter("SIGINT"));
  process.on("SIGTERM", () => void arreter("SIGTERM"));
}

async function principal() {
  const configuration = lireConfiguration();
  resumer(configuration);

  // Avant le stockage : un second bot ne doit pas écrire dans le même fichier.
  const verrou = prendreVerrou(RACINE);

  const stockage = ouvrirStockage(RACINE);
  const roster = lireRoster(configuration.roster);
  const lecteur = new Lecteur(configuration);

  const client = new Client({
    intents: INTENTS,
    partials: [Partials.GuildMember, Partials.Message, Partials.Channel, Partials.Reaction],
    // Le bot ne mentionne personne en masse : les mentions se font une par une,
    // explicitement, quand une commande le demande.
    allowedMentions: { parse: [], users: [], roles: [] },
  });

  /** Tout l'état de travail, transmis aux commandes. */
  const contexte = {
    configuration,
    stockage,
    roster,
    lecteur,
    client,
    commandes: COMMANDES,
    racine: RACINE,
  };
  client.contexte = contexte;

  // Le panneau « en cours » suit la lecture : chaque changement d'état — piste
  // suivante, pause, volume, file vidée — réécrit le message affiché, sans que
  // les commandes aient à s'en occuper. Un panneau impossible à écrire ne doit
  // jamais faire échouer la musique : l'incident part au journal, et c'est tout.
  lecteur.surChangement = (serveurId) => {
    void rafraichir(contexte, serveurId).catch((erreur) =>
      journal.debug(`Panneau « en cours » : ${erreur.message}`),
    );
  };

  installerEvenements(client, contexte);
  installerArrets(client, stockage, verrou);

  for (const besoin of verifierDependances(configuration)) journal.warn(besoin);
  journal.info(`${COMMANDES.length} commandes chargées.`);

  await client.login(configuration.token);
  journal.info(`Connexion réussie (${client.user.tag}).`);

  // Selon la version de discord.js, `clientReady` a pu être émis avant que
  // `login()` ne rende la main : on reprend la main ici dans ce cas.
  if (client.isReady()) await demarrer(client, contexte);
}

principal().catch((erreurRecue) => {
  if (erreurRecue instanceof ErreurConfiguration) {
    console.error(`\n[DelphinaBot V2] Configuration incorrecte.\n${erreurRecue.message}\n`);
    process.exit(1);
  }
  if (erreurRecue instanceof ErreurVerrou) {
    console.error(`\n[DelphinaBot V2] Instance déjà en cours.\n${erreurRecue.message}\n`);
    process.exit(1);
  }
  if (/Used disallowed intents/i.test(String(erreurRecue?.message))) {
    console.error(
      "\n[DelphinaBot V2] Discord refuse les intents privilégiés.\n" +
        "Activez « SERVER MEMBERS INTENT » et « MESSAGE CONTENT INTENT » dans\n" +
        "https://discord.com/developers/applications → votre application → Bot,\n" +
        "puis relancez le bot (la propagation peut prendre une heure).\n",
    );
    process.exit(1);
  }
  console.error("\n[DelphinaBot V2] Démarrage impossible :", erreurRecue, "\n");
  process.exit(1);
});
