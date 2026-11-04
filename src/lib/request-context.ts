/**
 * Contexte d'une requête, tel qu'il part dans le journal d'audit et dans le
 * salon Discord.
 *
 * ## Pourquoi séparer IPv4 et IPv6
 *
 * Une connexion TCP n'a **qu'une** famille d'adresse à la fois : un visiteur
 * arrive soit en IPv4, soit en IPv6, jamais les deux. Afficher deux colonnes
 * dont l'une est toujours vide peut sembler inutile — mais c'est exactement ce
 * qui permet de repérer un changement : le jour où quelqu'un qui venait
 * toujours en IPv4 apparaît en IPv6, c'est une information.
 *
 * On distingue donc trois choses :
 *   - `ipv4` : l'adresse si la connexion est en IPv4, sinon vide ;
 *   - `ipv6` : l'adresse si la connexion est en IPv6, sinon vide ;
 *   - `ip`   : l'adresse réellement vue par le serveur, quelle que soit sa
 *              famille — c'est l'IP publique du visiteur, pas une adresse
 *              privée, puisque Caddy la relaie telle qu'il l'a reçue.
 *
 * ## Les adresses « mappées »
 *
 * Un client IPv4 qui arrive sur une socket IPv6 est présenté sous la forme
 * `::ffff:192.0.2.10`. Ce n'est pas une IPv6 : c'est une IPv4 déguisée, et la
 * classer comme IPv6 induirait en erreur. On la démappe.
 */

export interface RequestContext {
  /** Adresse vue par le serveur, toutes familles confondues. */
  ip: string;
  /** Adresse si la connexion est en IPv4, sinon chaîne vide. */
  ipv4: string;
  /** Adresse si la connexion est en IPv6, sinon chaîne vide. */
  ipv6: string;
  /** Chaîne `X-Forwarded-For` complète, si plusieurs intermédiaires. */
  chain: string;
  userAgent: string;
  path: string;
}

/** Démappe `::ffff:a.b.c.d` et `::ffff:xxxx:xxxx` vers une IPv4 lisible. */
function demapper(value: string): string {
  const prefixe = /^::ffff:(.+)$/i.exec(value);
  if (!prefixe) return value;

  const reste = prefixe[1];
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(reste)) return reste;

  // Forme hexadécimale : ::ffff:c000:020a → 192.0.2.10
  const hex = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(reste);
  if (!hex) return value;

  const haut = parseInt(hex[1], 16);
  const bas = parseInt(hex[2], 16);
  return [haut >> 8, haut & 0xff, bas >> 8, bas & 0xff].join(".");
}

/** Vrai si la chaîne est une adresse IPv4 littérale. */
function estIPv4(value: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(value);
}

/** Vrai si la chaîne ressemble à une IPv6 (au moins deux groupes séparés par `:`). */
function estIPv6(value: string): boolean {
  return value.includes(":") && /^[0-9a-f:.]+$/i.test(value);
}

/**
 * Extrait le contexte d'une requête.
 *
 * `X-Forwarded-For` peut contenir une liste (`client, proxy1, proxy2`) : la
 * première valeur est le client, les suivantes sont nos propres intermédiaires.
 * On conserve la chaîne entière à part, parce qu'elle dit par combien de sauts
 * la requête est passée — utile le jour où un comportement étrange apparaît.
 */
export function requestContext(request: Request): RequestContext {
  const headers = request.headers;

  const forwarded = headers.get("x-forwarded-for") ?? "";
  const premiere = forwarded.split(",")[0]?.trim() ?? "";
  const real = headers.get("x-real-ip")?.trim() ?? "";
  const brute = premiere || real || "inconnue";

  const adresse = demapper(brute);

  return {
    ip: adresse,
    ipv4: estIPv4(adresse) ? adresse : "",
    ipv6: estIPv6(adresse) ? adresse : "",
    chain: forwarded.trim(),
    userAgent: headers.get("user-agent")?.trim() ?? "",
    path: new URL(request.url).pathname,
  };
}
