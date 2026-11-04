import { isNewDevice, recordLogin } from "./features";
import { recipientsFor } from "./twofactor";
import { envoyerMessagePrive } from "./discord-dm";

/**
 * Journal de connexion et alerte de nouvel appareil.
 *
 * Le wiki n'a pas de « mot de passe oublié » : la seule preuve d'identité est le
 * code envoyé en message privé Discord. Si quelqu'un se connecte depuis une
 * adresse jamais vue, le propriétaire du compte doit l'apprendre — c'est la
 * seule façon de remarquer un vol de mot de passe avant qu'il ne serve.
 *
 * Le message ne dit rien d'exploitable : ni mot de passe, ni code, ni jeton.
 * Seulement l'adresse et l'appareil, que le propriétaire reconnaîtra ou non.
 */
export async function journaliserConnexion(options: {
  username: string;
  ok: boolean;
  ip: string;
  userAgent: string;
  raison?: string;
}): Promise<void> {
  const { username, ok, ip, userAgent, raison } = options;

  // Un échec ne déclenche aucune alerte : ce serait un moyen de harceler un
  // compte en tapant des mots de passe au hasard.
  if (!ok) {
    await recordLogin(username, false, ip, userAgent, raison).catch(() => undefined);
    return;
  }

  const nouvelAppareil = await isNewDevice(username, ip).catch(() => false);
  await recordLogin(username, true, ip, userAgent).catch(() => undefined);
  if (!nouvelAppareil) return;

  const destinataires = recipientsFor(username);
  if (destinataires.length === 0) return;

  const message = [
    "🔐 **Nouvelle connexion au wiki de Gratianopolis**",
    "",
    `Compte : ${username}`,
    `Adresse : ${ip}`,
    `Appareil : ${userAgent.slice(0, 140) || "inconnu"}`,
    "",
    "Si c'est vous, ignorez ce message.",
    "Sinon : changez votre mot de passe et prévenez le Dauphin immédiatement.",
  ].join("\n");

  await envoyerMessagePrive(destinataires, message).catch(() => undefined);
}
