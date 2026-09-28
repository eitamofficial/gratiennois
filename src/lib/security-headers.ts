// En-têtes de sécurité du wiki.
//
// La CSP est déclarative, mais deux de ses directives n'ont de sens qu'en
// HTTPS :
//
//   - `upgrade-insecure-requests` ordonne au navigateur de réécrire en HTTPS
//     toutes les sous-ressources same-origin. Sur une origine HTTP simple
//     (192.168.1.22:3000 depuis un autre poste du réseau, ou l'adresse de la
//     tablette en direct), le navigateur n'exempte que les origines
//     « potentiellement fiables » (localhost, 127.0.0.1, les adresses .local).
//     Une IP privée ne l'est pas : CSS et JS sont donc demandés en HTTPS vers
//     un port qui ne parle pas TLS, la requête échoue, et la page s'affiche
//     sans aucune feuille de style. D'où un wiki « cassé » sur l'IP alors que
//     localhost fonctionne.
//   - `Strict-Transport-Security` est ignoré par les navigateurs sur une
//     connexion non chiffrée, mais l'envoyer quand même pollue la réponse.
//
// `config.headers()` de `next.config.mjs` est évalué à la construction, sans
// aucune notion de requête : impossible d'y.conditionner ces deux directives.
// Les en-têtes sont donc posés dans `src/middleware.ts`, qui connaît le
// protocole réel — y compris celui annoncé par `X-Forwarded-Proto` derrière le
// reverse proxy Caddy, qui termine le TLS en amont.

const contentSecurityPolicy = (isHttps: boolean) =>
  [
    "default-src 'self'",
    // Next.js injecte des styles et un script inline (le script de thème, exécuté
    // avant le premier rendu) : 'unsafe-inline' est nécessaire pour les deux, mais
    // le contenu des articles est toujours rendu échappé par React, jamais injecté
    // en HTML brut.
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://cdn.discordapp.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Harmless sur une origine déjà HTTPS, bloquant sur une origine HTTP.
    ...(isHttps ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

/** Les en-têtes qui ne dépendent pas du protocole. */
export const securityHeaders: ReadonlyArray<readonly [string, string]> = [
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "DENY"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()"],
  ["X-DNS-Prefetch-Control", "off"],
];

/** La CSP complète, `upgrade-insecure-requests` compris ou non. */
export function contentSecurityPolicyValue(isHttps: boolean): string {
  return contentSecurityPolicy(isHttps);
}

/**
 * Copie les en-têtes de sécurité sur une réponse, en n'ajoutant les directives
 * propres à HTTPS que si la requête l'est réellement.
 */
export function applySecurityHeaders(
  response: { headers: Headers },
  isHttps: boolean,
): void {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy(isHttps));
  for (const [name, value] of securityHeaders) {
    response.headers.set(name, value);
  }
  if (isHttps) {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
}

/**
 * Protocole réel de la requête. Caddy termine le TLS puis relaie en HTTP, donc
 * le protocole vu par Next est souvent `http` alors que le navigateur parle
 * bien HTTPS : `X-Forwarded-Proto` fait foi.
 */
export function isHttpsRequest(headers: Headers, nextUrlProtocol: string): boolean {
  const forwarded = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwarded) return forwarded === "https";
  return nextUrlProtocol === "https:";
}
