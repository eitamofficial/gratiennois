/**
 * Envoi de messages privés par le bot Discord du wiki.
 *
 * ## Pourquoi passer par l'API plutôt que par le processus du bot
 *
 * Le bot et le wiki partagent le même jeton (`DISCORD_BOT_TOKEN`) : appeler
 * l'API depuis le serveur web, c'est toujours « le bot » qui écrit, mais sans
 * dépendre d'un second processus. Un code d'authentification qui attendrait
 * que le bot veuille bien être vivant ajouterait une panne à une panne.
 *
 * ## Les deux pièges de l'API Discord
 *
 *   1. **Ouvrir un MP demande deux appels** : on crée d'abord le salon privé
 *      (`POST /users/@me/channels`), puis on y poste le message. Le salon est
 *      réutilisé par Discord si une conversation existe déjà.
 *   2. **Les MP peuvent être fermés** : si l'utilisateur n'autorise pas les
 *      messages privés des membres du serveur, l'API répond 403 avec le code
 *      `50007`. Ce n'est pas une erreur de notre côté, et le message d'échec
 *      doit le dire clairement — sinon l'administrateur cherche au mauvais
 *      endroit.
 */

const DISCORD_API = "https://discord.com/api/v10";

/** Délai maximal d'un appel : au-delà, on considère Discord injoignable. */
const TIMEOUT_MS = 10_000;

export interface EchecEnvoi {
  /** Identifiant masqué : jamais l'identifiant complet dans les journaux. */
  destinataire: string;
  raison: string;
}

export interface ResultatEnvoi {
  envoyes: string[];
  echecs: EchecEnvoi[];
}

function jeton(): string | null {
  return process.env.DISCORD_BOT_TOKEN?.trim() || null;
}

/** Identifiant tronqué, pour qu'un journal ne devienne pas un annuaire. */
function masquer(id: string): string {
  return id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-4)}` : "…";
}

async function appel(
  chemin: string,
  token: string,
  init: RequestInit,
): Promise<Response> {
  return fetch(`${DISCORD_API}${chemin}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
}

/**
 * Attend le délai demandé par Discord en cas de limitation (429).
 *
 * Discord renvoie `retry_after` en **secondes** (flottant). On plafonne à 5 s :
 * au-delà, mieux vaut échouer et laisser l'utilisateur redemander un code que
 * bloquer une requête HTTP pendant une minute.
 */
async function attendreSiLimite(response: Response): Promise<boolean> {
  if (response.status !== 429) return false;
  try {
    const corps = (await response.clone().json()) as { retry_after?: number };
    const attente = Math.min(5, Math.max(0.2, corps.retry_after ?? 1));
    await new Promise((resoudre) => setTimeout(resoudre, attente * 1000));
    return true;
  } catch {
    return false;
  }
}

/** Envoie un message privé à un identifiant Discord. */
async function envoyerA(
  destinataire: string,
  contenu: string,
  token: string,
): Promise<{ ok: true } | { ok: false; raison: string }> {
  let creation: Response;
  try {
    creation = await appel("/users/@me/channels", token, {
      method: "POST",
      body: JSON.stringify({ recipient_id: destinataire }),
    });
  } catch {
    return { ok: false, raison: "Discord injoignable" };
  }

  if (await attendreSiLimite(creation)) {
    try {
      creation = await appel("/users/@me/channels", token, {
        method: "POST",
        body: JSON.stringify({ recipient_id: destinataire }),
      });
    } catch {
      return { ok: false, raison: "Discord injoignable" };
    }
  }

  if (!creation.ok) {
    const detail = await creation.text().catch(() => "");
    if (creation.status === 403 && detail.includes("50007")) {
      return { ok: false, raison: "messages privés fermés" };
    }
    if (creation.status === 404 || creation.status === 400) {
      return { ok: false, raison: "identifiant Discord inconnu" };
    }
    return { ok: false, raison: `refus de Discord (${creation.status})` };
  }

  const salon = (await creation.json().catch(() => null)) as { id?: string } | null;
  if (!salon?.id) return { ok: false, raison: "salon privé illisible" };

  let envoi: Response;
  try {
    envoi = await appel(`/channels/${salon.id}/messages`, token, {
      method: "POST",
      body: JSON.stringify({ content: contenu }),
    });
  } catch {
    return { ok: false, raison: "Discord injoignable" };
  }

  if (await attendreSiLimite(envoi)) {
    try {
      envoi = await appel(`/channels/${salon.id}/messages`, token, {
        method: "POST",
        body: JSON.stringify({ content: contenu }),
      });
    } catch {
      return { ok: false, raison: "Discord injoignable" };
    }
  }

  if (!envoi.ok) {
    const detail = await envoi.text().catch(() => "");
    if (envoi.status === 403 && detail.includes("50007")) {
      return { ok: false, raison: "messages privés fermés" };
    }
    return { ok: false, raison: `envoi refusé (${envoi.status})` };
  }

  return { ok: true };
}

/**
 * Envoie le même message à plusieurs destinataires.
 *
 * L'envoi est **séquentiel** et non parallèle : Discord limite par route, et
 * deux créations de salon simultanées vers des comptes différents suffisent à
 * déclencher un 429 qui ferait échouer les deux. Le volume est de deux ou trois
 * messages par connexion — la latence n'est pas un sujet.
 */
export async function envoyerMessagePrive(
  destinataires: string[],
  contenu: string,
): Promise<ResultatEnvoi> {
  const token = jeton();
  const resultat: ResultatEnvoi = { envoyes: [], echecs: [] };

  if (!token) {
    resultat.echecs.push({
      destinataire: "—",
      raison: "DISCORD_BOT_TOKEN absent de l'environnement",
    });
    return resultat;
  }

  for (const destinataire of destinataires) {
    const issue = await envoyerA(destinataire, contenu, token);
    if (issue.ok) resultat.envoyes.push(destinataire);
    else resultat.echecs.push({ destinataire: masquer(destinataire), raison: issue.raison });
  }

  return resultat;
}

/** Vrai si le jeton du bot est présent (état affiché dans l'admin). */
export function botConfigure(): boolean {
  return jeton() !== null;
}
