/**
 * Données par membre : portefeuille, progression, compteurs.
 *
 * Deux règles gouvernent ce fichier.
 *
 * **L'argent se déplace, il ne se recalcule pas.** Un transfert, un gain, un
 * retrait : chaque écriture est une opération SQL atomique
 * (`UPDATE ... SET ducats = ducats + n`), jamais « lire, écrire,
 * sauvegarder ». Sans cela, deux transferts simultanés s'effacent l'un l'autre
 * et le déficit finit par payer.
 *
 * **Le compteur journalier se remet à zéro tout seul.** `jour_compte` porte la
 * date du dernier comptage ; un jour qui change suffit à remettre
 * `messages_jour` et `gains_jour` à zéro. Aucun balayeur nocturne n'est
 * nécessaire — et donc rien à maintenir en marche.
 */

import type { PoolClient } from "pg";
import { ligne, requete, transaction, versNombre } from "./index.js";

export interface Membre {
  serveurId: string;
  utilisateurId: string;
  ducats: number;
  banque: number;
  niveau: number;
  xp: number;
  xpTotal: number;
  messages: number;
  messagesJour: number;
  gainsJour: number;
  derniereRecompense: string | null;
  avertissements: number;
  infractions: number;
}

/** XP cumulée nécessaire pour atteindre le niveau donné. */
export function xpPourNiveau(niveau: number): number {
  if (niveau <= 0) return 0;
  return 50 * niveau * (niveau + 1);
}

/** Niveau correspondant à un cumul d'XP. */
export function niveauDepuisXp(xpTotal: number): number {
  if (xpTotal <= 0) return 0;
  // 50n(n + 1) = X  <=>  n = (sqrt(1 + 4X/50) - 1) / 2
  return Math.floor((Math.sqrt(1 + (4 * xpTotal) / 50) - 1) / 2);
}

/** Date du jour au format `AAAA-MM-JJ`, à l'heure de Paris. */
export function jourDuServeur(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Décalage horaire de Paris, en millisecondes, à la date donnée. */
function decalageParis(date: Date): number {
  const partie = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((element) => element.type === "timeZoneName")?.value;

  const trouve = /GMT([+-])(\d{2}):(\d{2})/.exec(partie ?? "");
  if (!trouve) return 0;
  const signe = trouve[1] === "-" ? -1 : 1;
  return signe * (Number(trouve[2]) * 3600 + Number(trouve[3]) * 60) * 1000;
}

/** Instant de minuit à Paris pour la journée en cours. */
export function debutJourParis(date: Date = new Date()): Date {
  return new Date(Date.parse(`${jourDuServeur(date)}T00:00:00Z`) - decalageParis(date));
}

function traduire(
  brut: Record<string, unknown> | null,
  serveurId: string,
  utilisateurId: string,
): Membre {
  return {
    serveurId,
    utilisateurId,
    ducats: versNombre(brut?.ducats),
    banque: versNombre(brut?.banque),
    niveau: versNombre(brut?.niveau),
    xp: versNombre(brut?.xp),
    xpTotal: versNombre(brut?.xp_total),
    messages: versNombre(brut?.messages),
    messagesJour: versNombre(brut?.messages_jour),
    gainsJour: versNombre(brut?.gains_jour),
    derniereRecompense: brut?.derniere_recompense
      ? new Date(String(brut.derniere_recompense)).toISOString()
      : null,
    avertissements: versNombre(brut?.avertissements),
    infractions: versNombre(brut?.infractions),
  };
}

/** Fiche d'un membre, créée au besoin. */
export async function lireMembre(serveurId: string, utilisateurId: string): Promise<Membre> {
  await requete(
    `INSERT INTO delphinabot_membres (serveur_id, utilisateur_id, jour_compte)
     VALUES ($1, $2, $3)
     ON CONFLICT (serveur_id, utilisateur_id) DO NOTHING`,
    [serveurId, utilisateurId, jourDuServeur()],
  );
  const trouve = await ligne(
    `SELECT * FROM delphinabot_membres WHERE serveur_id = $1 AND utilisateur_id = $2`,
    [serveurId, utilisateurId],
  );
  return traduire(trouve, serveurId, utilisateurId);
}

/** Ajoute des ducats. Montant négatif pour retirer ; le solde reste positif. */
export async function ajusterDucats(
  serveurId: string,
  utilisateurId: string,
  montant: number,
): Promise<number> {
  await lireMembre(serveurId, utilisateurId);
  const resultat = await ligne<{ ducats: string }>(
    `UPDATE delphinabot_membres
        SET ducats = GREATEST(0, ducats + $3), modifie_le = now()
      WHERE serveur_id = $1 AND utilisateur_id = $2
      RETURNING ducats`,
    [serveurId, utilisateurId, Math.round(montant)],
  );
  return versNombre(resultat?.ducats);
}

/** Ajoute des ducats à l'épargne, que le vol et la taxation n'atteignent pas. */
export async function ajusterBanque(
  serveurId: string,
  utilisateurId: string,
  montant: number,
): Promise<number> {
  await lireMembre(serveurId, utilisateurId);
  const resultat = await ligne<{ banque: string }>(
    `UPDATE delphinabot_membres
        SET banque = GREATEST(0, banque + $3), modifie_le = now()
      WHERE serveur_id = $1 AND utilisateur_id = $2
      RETURNING banque`,
    [serveurId, utilisateurId, Math.round(montant)],
  );
  return versNombre(resultat?.banque);
}

/** Retire des ducats ; `false` si le solde est insuffisant. */
export async function retirerDucats(
  serveurId: string,
  utilisateurId: string,
  montant: number,
): Promise<boolean> {
  await lireMembre(serveurId, utilisateurId);
  const resultat = await ligne<{ utilisateur_id: string }>(
    `UPDATE delphinabot_membres
        SET ducats = ducats - $3, modifie_le = now()
      WHERE serveur_id = $1 AND utilisateur_id = $2 AND ducats >= $3
      RETURNING utilisateur_id`,
    [serveurId, utilisateurId, Math.round(montant)],
  );
  return Boolean(resultat);
}

async function retirerDansTransaction(
  client: PoolClient,
  serveurId: string,
  utilisateurId: string,
  colonne: "ducats" | "banque",
  montant: number,
): Promise<boolean> {
  const resultat = await client.query(
    `UPDATE delphinabot_membres
        SET ${colonne} = ${colonne} - $3, modifie_le = now()
      WHERE serveur_id = $1 AND utilisateur_id = $2 AND ${colonne} >= $3
      RETURNING utilisateur_id`,
    [serveurId, utilisateurId, Math.round(montant)],
  );
  return (resultat.rowCount ?? 0) > 0;
}

/**
 * Transfert entre deux membres, atomique.
 *
 * Le retrait et le crédit ont lieu dans la même transaction : si le crédit
 * échoue, le retrait est annulé. Aucune perte possible, et le total du serveur
 * reste constant.
 */
export async function transferer(
  serveurId: string,
  depuis: string,
  vers: string,
  montant: number,
): Promise<{ ok: boolean; soldeEmetteur: number; soldeRecepteur: number }> {
  const somme = Math.round(montant);
  if (somme <= 0 || depuis === vers) return { ok: false, soldeEmetteur: 0, soldeRecepteur: 0 };

  return transaction(async (client) => {
    for (const identifiant of [depuis, vers]) {
      await client.query(
        `INSERT INTO delphinabot_membres (serveur_id, utilisateur_id, jour_compte)
         VALUES ($1, $2, $3) ON CONFLICT (serveur_id, utilisateur_id) DO NOTHING`,
        [serveurId, identifiant, jourDuServeur()],
      );
    }

    const debite = await retirerDansTransaction(client, serveurId, depuis, "ducats", somme);
    if (!debite) return { ok: false, soldeEmetteur: 0, soldeRecepteur: 0 };

    const credited = await client.query<{ ducats: string }>(
      `UPDATE delphinabot_membres
          SET ducats = ducats + $3, modifie_le = now()
        WHERE serveur_id = $1 AND utilisateur_id = $2
        RETURNING ducats`,
      [serveurId, vers, somme],
    );

    const emetteur = await client.query<{ ducats: string }>(
      `SELECT ducats FROM delphinabot_membres WHERE serveur_id = $1 AND utilisateur_id = $2`,
      [serveurId, depuis],
    );

    return {
      ok: true,
      soldeEmetteur: versNombre(emetteur.rows[0]?.ducats),
      soldeRecepteur: versNombre(credited.rows[0]?.ducats),
    };
  });
}

export interface Progression {
  gains: number;
  xpGagne: number;
  niveauAvant: number;
  niveauApres: number;
  montee: boolean;
}

/**
 * Enregistre un message : remet les compteurs journaliers à jour, crédite l'XP
 * et les ducats dans la limite du plafond quotidien, et renvoie ce qu'il faut
 * pour annoncer une éventuelle montée de niveau.
 */
export async function enregistrerMessage(
  serveurId: string,
  utilisateurId: string,
  options: {
    xpParMessage: number;
    xpMultiplicateur: number;
    gainsParMessage: number;
    gainsMaxJour: number;
    xpActif: boolean;
    economieActive: boolean;
  },
): Promise<Progression> {
  await lireMembre(serveurId, utilisateurId);
  await remettreCompteurs(serveurId, utilisateurId, jourDuServeur());

  const avant = await lireMembre(serveurId, utilisateurId);
  const xpGagne = options.xpActif
    ? Math.max(0, options.xpParMessage * options.xpMultiplicateur)
    : 0;
  const gainBrut = options.economieActive ? Math.max(0, options.gainsParMessage) : 0;
  const gains = Math.min(gainBrut, Math.max(0, options.gainsMaxJour - avant.gainsJour));

  const xpTotalApres = avant.xpTotal + xpGagne;
  const niveauApres = Math.max(avant.niveau, niveauDepuisXp(xpTotalApres));

  await requete(
    `UPDATE delphinabot_membres
        SET messages = messages + 1,
            messages_jour = messages_jour + 1,
            gains_jour = gains_jour + $4,
            xp = xp + $5,
            xp_total = xp_total + $5,
            niveau = $6,
            modifie_le = now()
      WHERE serveur_id = $1 AND utilisateur_id = $2`,
    [serveurId, utilisateurId, gains, xpGagne, niveauApres],
  );

  return {
    gains,
    xpGagne,
    niveauAvant: avant.niveau,
    niveauApres,
    montee: niveauApres > avant.niveau,
  };
}

/** Remet `messages_jour` et `gains_jour` à zéro quand le jour a changé. */
async function remettreCompteurs(
  serveurId: string,
  utilisateurId: string,
  jour: string,
): Promise<boolean> {
  const lignes = await requete<{ utilisateur_id: string }>(
    `UPDATE delphinabot_membres
        SET messages_jour = 0, gains_jour = 0, jour_compte = $3
      WHERE serveur_id = $1 AND utilisateur_id = $2
        AND jour_compte IS DISTINCT FROM $3
      RETURNING utilisateur_id`,
    [serveurId, utilisateurId, jour],
  );
  return lignes.length > 0;
}

/** Incrémente le compteur d'avertissements et renvoie le nouveau total. */
export async function incrementerAvertissements(
  serveurId: string,
  utilisateurId: string,
): Promise<number> {
  await lireMembre(serveurId, utilisateurId);
  const resultat = await ligne<{ avertissements: string }>(
    `UPDATE delphinabot_membres
        SET avertissements = avertissements + 1, modifie_le = now()
      WHERE serveur_id = $1 AND utilisateur_id = $2
      RETURNING avertissements`,
    [serveurId, utilisateurId],
  );
  return versNombre(resultat?.avertissements);
}

/** Retire un avertissement, sans descendre sous zéro. */
export async function decrementerAvertissements(
  serveurId: string,
  utilisateurId: string,
): Promise<number> {
  const resultat = await ligne<{ avertissements: string }>(
    `UPDATE delphinabot_membres
        SET avertissements = GREATEST(0, avertissements - 1), modifie_le = now()
      WHERE serveur_id = $1 AND utilisateur_id = $2
      RETURNING avertissements`,
    [serveurId, utilisateurId],
  );
  return versNombre(resultat?.avertissements);
}

/** Incrémente le compteur d'infractions (avertissements et sanctions). */
export async function incrementerInfractions(
  serveurId: string,
  utilisateurId: string,
): Promise<number> {
  await lireMembre(serveurId, utilisateurId);
  const resultat = await ligne<{ infractions: string }>(
    `UPDATE delphinabot_membres
        SET infractions = infractions + 1, modifie_le = now()
      WHERE serveur_id = $1 AND utilisateur_id = $2
      RETURNING infractions`,
    [serveurId, utilisateurId],
  );
  return versNombre(resultat?.infractions);
}

/**
 * Récompense quotidienne.
 *
 * L'éligibilité est calculée sur minuit à Paris plutôt que sur 24 h
 * glissantes : à 23 h 50, on ne peut pas « repousser » sa récompense de dix
 * minutes pour enchaîner deux fois le même soir.
 */
export async function reclamerRecompense(
  serveurId: string,
  utilisateurId: string,
  montant: number,
): Promise<{ montant: number; prochain: Date | null }> {
  const maintenant = new Date();
  const minuit = debutJourParis(maintenant);

  return transaction(async (client) => {
    await client.query(
      `INSERT INTO delphinabot_membres (serveur_id, utilisateur_id, jour_compte)
       VALUES ($1, $2, $3) ON CONFLICT (serveur_id, utilisateur_id) DO NOTHING`,
      [serveurId, utilisateurId, jourDuServeur(maintenant)],
    );

    const resultat = await client.query<{ derniere_recompense: Date }>(
      `UPDATE delphinabot_membres
          SET derniere_recompense = now(), ducats = ducats + $3, modifie_le = now()
        WHERE serveur_id = $1 AND utilisateur_id = $2
          AND (derniere_recompense IS NULL OR derniere_recompense < $4)
        RETURNING derniere_recompense`,
      [serveurId, utilisateurId, Math.round(montant), minuit],
    );

    if ((resultat.rowCount ?? 0) === 0) {
      const fiche = await client.query<{ derniere_recompense: Date | null }>(
        `SELECT derniere_recompense FROM delphinabot_membres
          WHERE serveur_id = $1 AND utilisateur_id = $2`,
        [serveurId, utilisateurId],
      );
      const derniere = fiche.rows[0]?.derniere_recompense ?? null;
      return {
        montant: 0,
        prochain: derniere ? new Date(derniere.getTime() + 24 * 3_600_000) : null,
      };
    }

    return { montant: Math.round(montant), prochain: null };
  });
}

export interface EntreeClassement {
  utilisateurId: string;
  valeur: number;
  niveau: number;
}

/** Classement décroissant sur une colonne donnée (ducats, XP, messages). */
export async function classement(
  serveurId: string,
  colonne: "ducats" | "xp_total" | "messages",
  limite = 10,
): Promise<EntreeClassement[]> {
  const lignes = await requete<{ utilisateur_id: string; valeur: string; niveau: number }>(
    `SELECT utilisateur_id, ${colonne} AS valeur, niveau
       FROM delphinabot_membres
      WHERE serveur_id = $1
      ORDER BY ${colonne} DESC, utilisateur_id ASC
      LIMIT $2`,
    [serveurId, limite],
  );
  return lignes.map((element) => ({
    utilisateurId: element.utilisateur_id,
    valeur: versNombre(element.valeur),
    niveau: versNombre(element.niveau),
  }));
}

/** Rang d'un membre dans le classement des ducats (1 = premier). */
export async function rang(serveurId: string, utilisateurId: string): Promise<number> {
  const resultat = await ligne<{ rang: string }>(
    `SELECT COUNT(*) + 1 AS rang
       FROM delphinabot_membres
      WHERE serveur_id = $1
        AND ducats > COALESCE((SELECT ducats FROM delphinabot_membres
                                 WHERE serveur_id = $1 AND utilisateur_id = $2), 0)`,
    [serveurId, utilisateurId],
  );
  return versNombre(resultat?.rang, 1);
}
