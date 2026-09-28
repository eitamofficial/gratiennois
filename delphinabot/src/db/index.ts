/**
 * Accès à PostgreSQL.
 *
 * Le bot partage la base du wiki. C'est volontaire : une seule sauvegarde, une
 * seule chose à surveiller, et les deux services vivent sur la même machine.
 * En contrepartie, **toute** table du bot est préfixée `delphinabot_` et
 * n'écrit jamais dans une table du site.
 *
 * Le schéma est créé au démarrage (`CREATE TABLE IF NOT EXISTS`) plutôt que
 * par un outil de migration : le bot n'a qu'un seul evolution à accompaniment —
 * ajouter une colonne — et cela évite d'avoir à exécuter quoi que ce soit
 * avant le premier lancement. Les requêtes sont volontairement simples et
 * paramétrées, sans ORM.
 */

import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { journal } from "../logger.js";

let pool: Pool | null = null;

/** Connexion partagée. À appeler une fois, au démarrage du bot. */
export function connexion(databaseUrl: string): Pool {
  if (pool) return pool;
  pool = new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  });
  // Sans ce gestionnaire, une connexion perdue en pleine nuit ne devient un
  // journalisé qu'à la requête suivante : le bot passe des heures muet.
  pool.on("error", (erreur) => {
    journal.error(`Base de données : ${erreur.message}`);
  });
  return pool;
}

/**
 * Connexion déjà établie, ou erreur explicite.
 *
 * On ne rappelle pas `connexion("")` dans le code applicatif : si le pool n'a
 * pas été initialisé, il faut le dire clairement plutôt que d'ouvrir une
 * connexion vide dont l'échec arrive dix lignes plus loin.
 */
function exigerPool(): Pool {
  if (!pool) {
    throw new Error(
      "La base de donnees n'est pas initialisee : appelez connexion() au demarrage du bot.",
    );
  }
  return pool;
}

/** Ferme proprement la connexion au moment de l'arrêt. */
export async function fermerBase(): Promise<void> {
  if (!pool) return;
  const courant = pool;
  pool = null;
  await courant.end();
}

/** Exécute une requête et renvoie ses lignes. */
export async function requete<L extends QueryResultRow = QueryResultRow>(
  texte: string,
  valeurs: unknown[] = [],
): Promise<L[]> {
  const resultat = await exigerPool().query<L>(texte, valeurs);
  return resultat.rows;
}

/** Exécute une requête et renvoie la première ligne, ou `null`. */
export async function ligne<L extends QueryResultRow = QueryResultRow>(
  texte: string,
  valeurs: unknown[] = [],
): Promise<L | null> {
  const lignes = await requete<L>(texte, valeurs);
  return lignes[0] ?? null;
}

/**
 * Exécute un traitement dans une transaction : tout est validé, ou rien ne
 * l'est. C'est ce qui rend fiable un transfert de ducats entre deux membres.
 */
export async function transaction<T>(
  traitement: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await exigerPool().connect();
  try {
    await client.query("BEGIN");
    const resultat = await traitement(client);
    await client.query("COMMIT");
    return resultat;
  } catch (erreur) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw erreur;
  } finally {
    client.release();
  }
}

/** Conversion sûre d'un `bigint` PostgreSQL en nombre JavaScript. */
export function versNombre(valeur: unknown, defaut = 0): number {
  if (typeof valeur === "number") return valeur;
  if (typeof valeur === "string") {
    const nombre = Number(valeur);
    return Number.isFinite(nombre) ? nombre : defaut;
  }
  if (typeof valeur === "bigint") {
    const nombre = Number(valeur);
    return Number.isSafeInteger(nombre) ? nombre : defaut;
  }
  return defaut;
}

/**
 * Création du schéma.
 *
 * Chaque énoncé est idempotent : le bot peut démarrer mille fois sans jamais
 * demander de migration. Une colonne ajoutée plus tard est un simple
 * `ADD COLUMN IF NOT EXISTS` ajouté en bas de cette liste.
 */
export async function initierSchema(): Promise<void> {
  await exigerPool().query(SCHEMA);
  journal.info("Schema DelphinaBot verifie.");
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS delphinabot_serveurs (
  serveur_id                  text PRIMARY KEY,
  prefixe                     text NOT NULL DEFAULT '!',
  salon_logs                  text,
  salon_alertes               text,
  salon_bienvenue             text,
  salon_signalements          text,
  salon_punitions             text,
  role_admin                  text,
  role_moderation             text,
  role_mute                   text,
  role_dj                     text,
  role_quarantaine            text,
  role_bienvenue              text,
  role_verification           text,
  role_automatique            text,
  anti_raid                   boolean NOT NULL DEFAULT true,
  raid_seuil                  integer NOT NULL DEFAULT 5,
  raid_fenetre_secondes       integer NOT NULL DEFAULT 10,
  raid_bannir_comptes         boolean NOT NULL DEFAULT false,
  raid_age_minimum_jours      integer NOT NULL DEFAULT 0,
  protection_mentions         boolean NOT NULL DEFAULT true,
  mentions_max                integer NOT NULL DEFAULT 5,
  protection_flood            boolean NOT NULL DEFAULT true,
  flood_max                   integer NOT NULL DEFAULT 8,
  protection_liens            boolean NOT NULL DEFAULT true,
  protection_mots             boolean NOT NULL DEFAULT true,
  liens_autorises             text[] NOT NULL DEFAULT ARRAY['discord.gg','youtu.be','github.com','wiki-gratiennois.duckdns.org']::text[],
  mots_interdits              text NOT NULL DEFAULT '',
  salons_ignores              text[] NOT NULL DEFAULT ARRAY[]::text[],
  xp_actif                    boolean NOT NULL DEFAULT true,
  xp_multiplicateur           double precision NOT NULL DEFAULT 1,
  xp_par_message              double precision NOT NULL DEFAULT 0.6,
  gains_par_message           integer NOT NULL DEFAULT 1,
  gains_max_jour              integer NOT NULL DEFAULT 300,
  gains_multiplicateur_xp     double precision NOT NULL DEFAULT 0.4,
  economie_active             boolean NOT NULL DEFAULT true,
  musique_autorisee           boolean NOT NULL DEFAULT true,
  volume_defaut               integer NOT NULL DEFAULT 40,
  verrouille                  boolean NOT NULL DEFAULT false,
  verrouille_jusqua           timestamptz,
  cree_le                     timestamptz NOT NULL DEFAULT now(),
  modifie_le                  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delphinabot_membres (
  serveur_id          text NOT NULL,
  utilisateur_id      text NOT NULL,
  ducats              bigint NOT NULL DEFAULT 0,
  banque              bigint NOT NULL DEFAULT 0,
  niveau              integer NOT NULL DEFAULT 0,
  xp                  bigint NOT NULL DEFAULT 0,
  xp_total            bigint NOT NULL DEFAULT 0,
  messages            bigint NOT NULL DEFAULT 0,
  messages_jour       integer NOT NULL DEFAULT 0,
  jour_compte         text,
  gains_jour          integer NOT NULL DEFAULT 0,
  derniere_recompense timestamptz,
  avertissements      integer NOT NULL DEFAULT 0,
  infractions         bigint NOT NULL DEFAULT 0,
  dernier_message     timestamptz,
  cree_le             timestamptz NOT NULL DEFAULT now(),
  modifie_le          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (serveur_id, utilisateur_id)
);

CREATE TABLE IF NOT EXISTS delphinabot_sanctions (
  id            bigserial PRIMARY KEY,
  serveur_id    text NOT NULL,
  utilisateur_id text NOT NULL,
  type          text NOT NULL,
  raison        text NOT NULL DEFAULT '',
  auteur_id     text NOT NULL,
  duree_ms      bigint,
  expire_le     timestamptz,
  levee         boolean NOT NULL DEFAULT false,
  levee_par     text,
  levee_le      timestamptz,
  contestee     boolean NOT NULL DEFAULT false,
  cree_le       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS delphinabot_sanctions_membre
  ON delphinabot_sanctions (serveur_id, utilisateur_id, levee, cree_le DESC);

CREATE TABLE IF NOT EXISTS delphinabot_journal (
  id             bigserial PRIMARY KEY,
  serveur_id     text NOT NULL,
  type           text NOT NULL,
  utilisateur_id text,
  cible_id       text,
  details        text NOT NULL DEFAULT '{}',
  cree_le        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS delphinabot_journal_recent
  ON delphinabot_journal (serveur_id, cree_le DESC);

CREATE TABLE IF NOT EXISTS delphinabot_signalements (
  id          bigserial PRIMARY KEY,
  serveur_id  text NOT NULL,
  salon_id    text NOT NULL,
  auteur_id   text NOT NULL,
  cible_id    text NOT NULL,
  raison      text NOT NULL,
  extrait     text NOT NULL DEFAULT '',
  message_id  text,
  statut      text NOT NULL DEFAULT 'ouvert',
  resolu_par  text,
  resolu_le   timestamptz,
  cree_le     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS delphinabot_signalements_ouverts
  ON delphinabot_signalements (serveur_id, statut, cree_le DESC);

CREATE TABLE IF NOT EXISTS delphinabot_liens (
  utilisateur_id text PRIMARY KEY,
  slug           text NOT NULL,
  verifie        boolean NOT NULL DEFAULT false,
  cree_le        timestamptz NOT NULL DEFAULT now(),
  verifie_le     timestamptz
);
`;
