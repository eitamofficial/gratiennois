/**
 * Réglages par serveur.
 *
 * Un serveur de micronation a ses salons, ses rôles et ses règles : rien de
 * tout cela n'a sa place dans un `.env`. Chaque serveur a donc sa ligne en base,
 * créée à la première visite, avec des valeurs par défaut qui conviennent à
 * tout le monde. `/configurer` écrit ensuite dedans, sans redémarrage.
 */

import { ligne, requete } from "./index.js";

export interface ReglagesServeur {
  serveurId: string;

  // Canaux
  salonLogs: string | null;
  salonAlertes: string | null;
  salonBienvenue: string | null;
  salonSignalements: string | null;
  salonPunitions: string | null;

  // Roles
  roleAdmin: string | null;
  roleModeration: string | null;
  roleMute: string | null;
  roleDj: string | null;
  roleQuarantaine: string | null;
  roleBienvenue: string | null;
  roleVerification: string | null;
  roleAutomatique: string | null;

  // Anti-raid
  antiRaid: boolean;
  raidSeuil: number;
  raidFenetreSecondes: number;
  raidBannirComptes: boolean;
  raidAgeMinimumJours: number;

  // Protections
  protectionMentions: boolean;
  mentionsMax: number;
  protectionFlood: boolean;
  floodMax: number;
  protectionLiens: boolean;
  protectionMots: boolean;
  liensAutorises: string[];
  motsInterdits: string[];
  salonsIgnores: string[];

  // Progression
  xpActif: boolean;
  xpMultiplicateur: number;
  xpParMessage: number;
  gainsParMessage: number;
  gainsMaxJour: number;
  gainsMultiplicateurXp: number;
  economieActive: boolean;

  // Musique
  musiqueAutorisee: boolean;
  volumeDefaut: number;

  // Verrouillage
  verrouille: boolean;
  verrouilleJusqua: string | null;
}

/** Valeurs par défaut : un serveur qui n'a rien configuré reste utilisable. */
const DEFAUTS: Omit<ReglagesServeur, "serveurId"> = {
  salonLogs: null,
  salonAlertes: null,
  salonBienvenue: null,
  salonSignalements: null,
  salonPunitions: null,
  roleAdmin: null,
  roleModeration: null,
  roleMute: null,
  roleDj: null,
  roleQuarantaine: null,
  roleBienvenue: null,
  roleVerification: null,
  roleAutomatique: null,
  antiRaid: true,
  raidSeuil: 5,
  raidFenetreSecondes: 10,
  raidBannirComptes: false,
  raidAgeMinimumJours: 0,
  protectionMentions: true,
  mentionsMax: 5,
  protectionFlood: true,
  floodMax: 8,
  protectionLiens: true,
  protectionMots: true,
  liensAutorises: [
    "discord.gg",
    "youtu.be",
    "github.com",
    "wiki-gratiennois.duckdns.org",
  ],
  motsInterdits: [],
  salonsIgnores: [],
  xpActif: true,
  xpMultiplicateur: 1,
  xpParMessage: 0.6,
  gainsParMessage: 1,
  gainsMaxJour: 300,
  gainsMultiplicateurXp: 0.4,
  economieActive: true,
  musiqueAutorisee: true,
  volumeDefaut: 40,
  verrouille: false,
  verrouilleJusqua: null,
};

/** Correspondance entre les colonnes SQL et les propriétés typées. */
const COLONNES: Record<keyof Omit<ReglagesServeur, "serveurId">, string> = {
  salonLogs: "salon_logs",
  salonAlertes: "salon_alertes",
  salonBienvenue: "salon_bienvenue",
  salonSignalements: "salon_signalements",
  salonPunitions: "salon_punitions",
  roleAdmin: "role_admin",
  roleModeration: "role_moderation",
  roleMute: "role_mute",
  roleDj: "role_dj",
  roleQuarantaine: "role_quarantaine",
  roleBienvenue: "role_bienvenue",
  roleVerification: "role_verification",
  roleAutomatique: "role_automatique",
  antiRaid: "anti_raid",
  raidSeuil: "raid_seuil",
  raidFenetreSecondes: "raid_fenetre_secondes",
  raidBannirComptes: "raid_bannir_comptes",
  raidAgeMinimumJours: "raid_age_minimum_jours",
  protectionMentions: "protection_mentions",
  mentionsMax: "mentions_max",
  protectionFlood: "protection_flood",
  floodMax: "flood_max",
  protectionLiens: "protection_liens",
  protectionMots: "protection_mots",
  liensAutorises: "liens_autorises",
  motsInterdits: "mots_interdits",
  salonsIgnores: "salons_ignores",
  xpActif: "xp_actif",
  xpMultiplicateur: "xp_multiplicateur",
  xpParMessage: "xp_par_message",
  gainsParMessage: "gains_par_message",
  gainsMaxJour: "gains_max_jour",
  gainsMultiplicateurXp: "gains_multiplicateur_xp",
  economieActive: "economie_active",
  musiqueAutorisee: "musique_autorisee",
  volumeDefaut: "volume_defaut",
  verrouille: "verrouille",
  verrouilleJusqua: "verrouille_jusqua",
};

function booleen(valeur: unknown, defaut: boolean): boolean {
  if (typeof valeur === "boolean") return valeur;
  if (typeof valeur === "string") return valeur === "t" || valeur === "true";
  return defaut;
}

function nombre(valeur: unknown, defaut: number): number {
  const converti = Number(valeur);
  return Number.isFinite(converti) ? converti : defaut;
}

function texte(valeur: unknown): string | null {
  return typeof valeur === "string" && valeur ? valeur : null;
}

function liste(valeur: unknown, defaut: string[]): string[] {
  if (Array.isArray(valeur)) return valeur.map(String);
  if (typeof valeur === "string" && valeur) {
    return valeur
      .split(/[\s,]+/)
      .map((element) => element.trim())
      .filter(Boolean);
  }
  return defaut;
}

/** Traduit une ligne SQL en objet typé, en Tolérant aux colonnes absentes. */
function traduire(ligneSql: Record<string, unknown> | null): ReglagesServeur {
  const brut = ligneSql ?? {};
  return {
    serveurId: String(brut.serveur_id ?? ""),
    salonLogs: texte(brut.salon_logs),
    salonAlertes: texte(brut.salon_alertes),
    salonBienvenue: texte(brut.salon_bienvenue),
    salonSignalements: texte(brut.salon_signalements),
    salonPunitions: texte(brut.salon_punitions),
    roleAdmin: texte(brut.role_admin),
    roleModeration: texte(brut.role_moderation),
    roleMute: texte(brut.role_mute),
    roleDj: texte(brut.role_dj),
    roleQuarantaine: texte(brut.role_quarantaine),
    roleBienvenue: texte(brut.role_bienvenue),
    roleVerification: texte(brut.role_verification),
    roleAutomatique: texte(brut.role_automatique),
    antiRaid: booleen(brut.anti_raid, DEFAUTS.antiRaid),
    raidSeuil: nombre(brut.raid_seuil, DEFAUTS.raidSeuil),
    raidFenetreSecondes: nombre(brut.raid_fenetre_secondes, DEFAUTS.raidFenetreSecondes),
    raidBannirComptes: booleen(brut.raid_bannir_comptes, DEFAUTS.raidBannirComptes),
    raidAgeMinimumJours: nombre(brut.raid_age_minimum_jours, DEFAUTS.raidAgeMinimumJours),
    protectionMentions: booleen(brut.protection_mentions, DEFAUTS.protectionMentions),
    mentionsMax: nombre(brut.mentions_max, DEFAUTS.mentionsMax),
    protectionFlood: booleen(brut.protection_flood, DEFAUTS.protectionFlood),
    floodMax: nombre(brut.flood_max, DEFAUTS.floodMax),
    protectionLiens: booleen(brut.protection_liens, DEFAUTS.protectionLiens),
    protectionMots: booleen(brut.protection_mots, DEFAUTS.protectionMots),
    liensAutorises: liste(brut.liens_autorises, DEFAUTS.liensAutorises),
    motsInterdits: liste(brut.mots_interdits, DEFAUTS.motsInterdits),
    salonsIgnores: liste(brut.salons_ignores, DEFAUTS.salonsIgnores),
    xpActif: booleen(brut.xp_actif, DEFAUTS.xpActif),
    xpMultiplicateur: nombre(brut.xp_multiplicateur, DEFAUTS.xpMultiplicateur),
    xpParMessage: nombre(brut.xp_par_message, DEFAUTS.xpParMessage),
    gainsParMessage: nombre(brut.gains_par_message, DEFAUTS.gainsParMessage),
    gainsMaxJour: nombre(brut.gains_max_jour, DEFAUTS.gainsMaxJour),
    gainsMultiplicateurXp: nombre(brut.gains_multiplicateur_xp, DEFAUTS.gainsMultiplicateurXp),
    economieActive: booleen(brut.economie_active, DEFAUTS.economieActive),
    musiqueAutorisee: booleen(brut.musique_autorisee, DEFAUTS.musiqueAutorisee),
    volumeDefaut: nombre(brut.volume_defaut, DEFAUTS.volumeDefaut),
    verrouille: booleen(brut.verrouille, DEFAUTS.verrouille),
    verrouilleJusqua: brut.verrouille_jusqua ? new Date(String(brut.verrouille_jusqua)).toISOString() : null,
  };
}

/**
 * Réglages d'un serveur, créés au besoin.
 *
 * Créer la ligne ici plutôt qu'à l'arrivée du bot simplifie tout : aucun
 * message d'accueil n'a à savoir si c'est la première fois.
 */
export async function lireReglages(serveurId: string): Promise<ReglagesServeur> {
  await requete(
    `INSERT INTO delphinabot_serveurs (serveur_id) VALUES ($1)
     ON CONFLICT (serveur_id) DO NOTHING`,
    [serveurId],
  );
  const trouvee = await ligne(`SELECT * FROM delphinabot_serveurs WHERE serveur_id = $1`, [
    serveurId,
  ]);
  return traduire(trouvee);
}

/**
 * Écrit une partie des réglages et relit la ligne complète.
 *
 * Le nom de la colonne vient de `COLONNES`, jamais de l'appelant : c'est ce
 * qui rend impossible d'injecter du SQL par le nom d'un champ.
 */
export async function enregistrerReglages(
  serveurId: string,
  changements: Partial<ReglagesServeur>,
): Promise<ReglagesServeur> {
  const colonnes: string[] = [];
  const valeurs: unknown[] = [];

  for (const [cle, valeur] of Object.entries(changements) as [keyof ReglagesServeur, unknown][]) {
    if (cle === "serveurId" || valeur === undefined) continue;
    const colonne = COLONNES[cle as keyof typeof COLONNES];
    if (!colonne) continue;
    colonnes.push(colonne);
    valeurs.push(valeur);
  }

  if (colonnes.length > 0) {
    valeurs.push(serveurId);
    await requete(
      `UPDATE delphinabot_serveurs
          SET ${colonnes.map((colonne, index) => `${colonne} = $${index + 1}`).join(", ")},
              modifie_le = now()
        WHERE serveur_id = $${valeurs.length}`,
      valeurs,
    );
  }

  return lireReglages(serveurId);
}

/** Liste des serveurs connus, pour les treatments de fond. */
export async function listerServeurs(): Promise<string[]> {
  const lignes = await requete<{ serveur_id: string }>(
    `SELECT serveur_id FROM delphinabot_serveurs`,
  );
  return lignes.map((element) => element.serveur_id);
}
