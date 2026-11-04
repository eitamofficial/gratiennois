/**
 * URL publique du site.
 *
 * Elle sert au sitemap, à `robots.txt`, aux métadonnées OpenGraph et aux
 * partages sociaux — partout où une URL en `localhost` produirait un lien
 * cassé une fois le site déployé.
 *
 * ## Pourquoi cette fonction existe
 *
 * `SITE_URL` devait être renseignée à la main sur chaque environnement, et son
 * oubli faisait **échouer le build** (voir `check-deploy`). Or cette variable
 * est parfaitement superflue : Vercel publie lui-même l'URL du déploiement
 * dans son environnement. La déduire rend l'étape facultative, et supprime un
 * blocage qui n'apportait rien.
 *
 * L'ordre de priorité est donc : configuration explicite, puis environnement
 * Vercel, puis `localhost` en développement.
 */

/** Variables fournies par Vercel, par ordre de fiabilité. */
function urlVercel(): string | null {
  // `VERCEL_PROJECT_PRODUCTION_URL` est l'URL de production du projet ;
  // `VERCEL_URL` est l'URL du déploiement courant. Toutes deux sont des noms
  // d'hôte, sans protocole : on ajoute le scheme.
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production}`;

  const courante = process.env.VERCEL_URL?.trim();
  if (courante) return `https://${courante}`;

  return null;
}

/** URL publique du site, sans barre oblique finale. */
export function siteUrl(): string {
  const explicite = process.env.SITE_URL?.trim();
  const url = explicite || urlVercel() || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

/** Vrai si l'URL provient de l'environnement Vercel et non d'un réglage. */
export function siteUrlFromPlatform(): boolean {
  return !process.env.SITE_URL?.trim() && urlVercel() !== null;
}

// ---------------------------------------------------------------------------
// Origine de la requête courante
// ---------------------------------------------------------------------------

/**
 * Hôtes pour lesquels on accepte de construire une URL absolue à partir de la
 * requête. `ALLOWED_HOSTS` (liste séparée par des virgules) permet d'en ajouter
 * — par exemple l'adresse IP de la tablette sur le réseau local.
 */
function trustedHosts(): Set<string> {
  const hosts = new Set<string>();

  const configured = process.env.SITE_URL?.trim();
  if (configured) {
    try {
      hosts.add(new URL(configured).host.toLowerCase());
    } catch {
      // SITE_URL mal formée : on l'ignore plutôt que de refuser toute requête.
    }
  }

  for (const extra of (process.env.ALLOWED_HOSTS ?? "").split(",")) {
    const host = extra.trim().toLowerCase();
    if (host) hosts.add(host);
  }

  return hosts;
}

/** Vrai pour `localhost`, une adresse de bouclage ou une plage privée. */
function isLocalHost(host: string): boolean {
  const name = host.split(":")[0];
  if (name === "localhost" || name === "[::1]" || name === "::1") return true;
  if (/^127\./.test(name)) return true;
  if (/^10\./.test(name)) return true;
  if (/^192\.168\./.test(name)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(name)) return true;
  return false;
}

/**
 * Origine publique de la requête en cours, par exemple
 * `https://wiki-gratiennois.duckdns.org`.
 *
 * ## Pourquoi ne pas utiliser `request.nextUrl`
 *
 * `nextUrl` est construit à partir de l'adresse interne du serveur, pas de
 * l'en-tête `Host`. Derrière Caddy, le wiki écoute sur `127.0.0.1:3000` : une
 * redirection bâtie avec `nextUrl` renvoyait donc le navigateur vers
 * `https://localhost:3000/connexion`, adresse qui n'existe que sur la tablette.
 * Le visiteur voyait « site inaccessible » en cliquant sur l'espace d'édition,
 * alors que le serveur répondait parfaitement — seul le `Location` était faux.
 *
 * Les en-têtes `X-Forwarded-*` sont posés par notre propre reverse proxy, et
 * l'hôte est confronté à une liste blanche : une requête forgée avec un `Host`
 * arbitraire ne peut pas transformer la page de connexion en redirection ouverte
 * vers un domaine tiers.
 */
export function requestOrigin(headers: Headers, fallbackHost = ""): string {
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = (forwardedHost || headers.get("host") || fallbackHost).trim();

  const https =
    forwardedProto === "https" ||
    (!forwardedProto && headers.get("x-forwarded-ssl") === "on");

  const proto = https ? "https" : "http";

  if (!host) return siteUrl();

  const allowed = trustedHosts();
  if (allowed.size === 0 || allowed.has(host.toLowerCase()) || isLocalHost(host)) {
    // Un hôte de bouclage sur un site dont l'URL publique est configurée n'est
    // jamais l'adresse du visiteur : c'est le signe d'un proxy qui réécrit
    // `Host`. Émettre `http://localhost:3000` enverrait le navigateur sur une
    // adresse qui n'existe que sur la machine — on préfère la valeur déclarée.
    if (isLocalHost(host) && process.env.SITE_URL?.trim()) return siteUrl();
    return `${proto}://${host}`;
  }

  // Hôte inconnu : on retombe sur l'URL configurée, jamais sur la valeur reçue.
  return siteUrl();
}

/** Construit une URL absolue sûre à partir d'un chemin interne. */
export function absoluteUrl(pathname: string, headers: Headers): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${requestOrigin(headers)}${path}`;
}
