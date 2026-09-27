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
