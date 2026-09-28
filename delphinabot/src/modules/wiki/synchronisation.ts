/**
 * Synchronisation avec le wiki.
 *
 * DelphinaBot n'écrit jamais d'article : il **signale** au wiki des changements
 * de rôles et de noms, et c'est le wiki qui décide quoi en faire. Le secret
 * partagé ne sert qu'à authentifier ces signaux — il n'accorde aucun droit
 * d'écriture sur le contenu.
 *
 * La signature est un HMAC-SHA256 de `horodatage.corps`. Le wiki rejoue le
 * même calcul et rejette ce qui ne correspond pas : un tiers qui intercepte
 * un appel ne peut ni le rejouer (l'horodatage change) ni le modifier (la
 * signature change).
 */

import { createHmac } from "node:crypto";

export interface LienWiki {
  slug: string;
  discordUserId: string;
}

/** Signe un corps avec le secret partagé. */
export function signer(secret: string, corps: string, horodatage = String(Date.now())): string {
  return createHmac("sha256", secret).update(`${horodatage}.${corps}`).digest("hex");
}

export interface ResultatSynchronisation {
  envoye: boolean;
  raison: string | null;
  status: number | null;
}

/**
 * Envoie des rattachements au wiki.
 *
 * Sans secret configuré, la fonction ne tente rien et renvoie la raison : le
 * bot reste alors utilisable pour la modération seule, ce qui est un mode
 * d'emploi legitimate, pas une panne.
 */
export async function pousser(
  racineWiki: string,
  secret: string,
  liens: LienWiki[],
  origine: string,
): Promise<ResultatSynchronisation> {
  if (!secret) {
    return { envoye: false, raison: "BOT_SYNC_SECRET absent : rien n'a été transmis.", status: null };
  }
  if (liens.length === 0) {
    return { envoye: false, raison: "Aucun changement à signaler.", status: null };
  }

  const corps = JSON.stringify({ liens, source: "delphinabot", origine });
  const horodatage = String(Date.now());

  try {
    const reponse = await fetch(`${racineWiki.replace(/\/+$/, "")}/api/sync/bot`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wiki-timestamp": horodatage,
        "x-wiki-signature": signer(secret, corps, horodatage),
      },
      body: corps,
      signal: AbortSignal.timeout(15_000),
    });

    return {
      envoye: reponse.ok,
      raison: reponse.ok ? null : `Le wiki a refusé (HTTP ${reponse.status}).`,
      status: reponse.status,
    };
  } catch (erreurRevue) {
    return {
      envoye: false,
      raison: `Wiki injoignable : ${(erreurRevue as Error).message}`,
      status: null,
    };
  }
}

/** Signale qu'un salon a reçu du contenu à analyser. */
export async function signalerSalon(
  racineWiki: string,
  secret: string,
  salonId: string,
  raison: string,
): Promise<boolean> {
  if (!secret) return false;

  const corps = JSON.stringify({ source: "delphinabot", canaux: [{ salonId, raison }] });
  const horodatage = String(Date.now());

  try {
    const reponse = await fetch(`${racineWiki.replace(/\/+$/, "")}/api/sync/bot`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wiki-timestamp": horodatage,
        "x-wiki-signature": signer(secret, corps, horodatage),
      },
      body: corps,
      signal: AbortSignal.timeout(15_000),
    });
    return reponse.ok;
  } catch {
    return false;
  }
}
