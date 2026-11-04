import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/jwt";
import { applySecurityHeaders, isHttpsRequest } from "@/lib/security-headers";

// Toute réponse passe par ici, y compris les redirections et les refus : les
// en-têtes de sécurité sont posés en un seul endroit plutôt que répétés à
// chaque `return`.
function secured(response: NextResponse, request: NextRequest): NextResponse {
  applySecurityHeaders(response, isHttpsRequest(request.headers, request.nextUrl.protocol));
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isMutation = request.method !== "GET" && request.method !== "HEAD";

  // L'API d'optimisation d'images de Next.js est **fermée**.
  //
  // Le wiki n'utilise nulle part `next/image` : cette route ne sert donc à
  // personne, mais elle reste montée par le framework. Or c'est une surface
  // d'attaque lourde — une exécution de code à distance non authentifiée a été
  // publiée contre elle (GHSA-2464-fhr4-w9xw, correctif 15.5.28), et d'autres
  // suivront : elle décode des images fournies par l'appelant.
  //
  // On ne se contente donc pas de mettre à jour Next : on éteint la route. Une
  // dépendance à jour protège des CVE connues, une route absente protège aussi
  // des suivantes.
  if (pathname.startsWith("/_next/image")) {
    return secured(new NextResponse("Not Found", { status: 404 }), request);
  }

  // Défense CSRF légère : toute mutation doit venir de notre propre origine.
  if (isMutation) {
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== request.headers.get("host")) {
          return secured(
            NextResponse.json({ error: "Origine non autorisée." }, { status: 403 }),
            request,
          );
        }
      } catch {
        return secured(
          NextResponse.json({ error: "Origine non autorisée." }, { status: 403 }),
          request,
        );
      }
    }
  }

  // Les routes de connexion/déconnexion ne nécessitent pas de session.
  if (pathname.startsWith("/api/auth/")) {
    return secured(NextResponse.next(), request);
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token).catch(() => null);
  if (session) return secured(NextResponse.next(), request);

  // Pages d'administration → redirection vers la connexion.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return secured(NextResponse.redirect(url), request);
  }

  // Synchronisation Discord, installation du jeu de données et flux d'activité
  // global : réservé à une session authentifiée (le rôle est vérifié dans la
  // route).
  //
  // Exception : `/api/sync/bot` est le point d'entrée du **bot Discord**. Il ne
  // peut pas présenter de cookie — il tourne hors du site — et s'authentifie
  // par signature HMAC du corps de la requête, vérifiée dans la route
  // (`src/lib/bot-signature.ts`). La route refuse en outre toute écriture de
  // contenu : elle ne fait que rattacher des identifiants à des pages existantes.
  if (
    (pathname.startsWith("/api/sync") && pathname !== "/api/sync/bot") ||
    pathname === "/api/revisions" ||
    pathname === "/api/seed"
  ) {
    return secured(
      NextResponse.json({ error: "Authentification requise." }, { status: 401 }),
      request,
    );
  }

  // Mutations sur l'API des articles → 401 JSON ; les lectures restent publiques.
  if (isMutation && pathname.startsWith("/api/articles")) {
    return secured(
      NextResponse.json({ error: "Authentification requise." }, { status: 401 }),
      request,
    );
  }

  return secured(NextResponse.next(), request);
}

export const config = {
  // Le matcher couvre tout le site : les en-têtes de sécurité doivent être
  // posés sur les pages comme sur les ressources. Les fichiers servis
  // directement par `public/` et les artefacts de compilation de Next
  // (`/_next/static/...`) sont exclus — ce sont des fichiers statiques
  // servis en amont du middleware, et le navigateur n'y est pas exposé.
  matcher: [
    // Tout, sauf les ressources statiques publiques et les artefacts Next.
    "/((?!_next/static|_next/image|media/|avatars/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|pdf|css|js|woff2?)$).*)",
    // L'optimiseur d'images est exclu du motif ci-dessus pour ne pas ralentir
    // chaque image : on le réinclut explicitement ici afin de pouvoir le fermer.
    "/_next/image",
    // Les routes soumises à contrôle d'accès, y compris leurs fichiers.
    "/admin",
    "/admin/:path*",
    "/api/articles/:path*",
    "/api/sync/:path*",
    "/api/revisions",
    "/api/seed",
    "/api/auth/:path*",
  ],
};
