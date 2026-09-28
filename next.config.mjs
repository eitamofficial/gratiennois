/** @type {import('next').NextConfig} */

// Les en-têtes de sécurité (CSP, HSTS, X-Frame-Options…) ne sont PAS posés
// ici. `headers()` est évalué à la construction, sans accès à la requête : il
// ne peut donc pas savoir si le visiteur est en HTTPS. Or émettre
// `upgrade-insecure-requests` sur une origine HTTP (l'adresse IP de la
// tablette sur le réseau local, par exemple) ordonne au navigateur de
// rejouer le CSS et le JS en HTTPS vers un port sans TLS : la page arrive
// entièrement dénuée de styles. Les en-têtes sont donc appliqués dans
// `src/middleware.ts`, qui connaît le protocole réel — voir
// `src/lib/security-headers.ts`.
//
// Le reverse proxy Caddy ajoute de son côté X-Frame-Options, HSTS et
// Referrer-Policy ; `deploy/termux/Caddyfile`.

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
