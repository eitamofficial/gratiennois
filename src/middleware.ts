import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isMutation = request.method !== "GET" && request.method !== "HEAD";

  // Défense CSRF légère : toute mutation doit venir de notre propre origine.
  if (isMutation) {
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== request.headers.get("host")) {
          return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
      }
    }
  }

  // Les routes de connexion/déconnexion ne nécessitent pas de session.
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token).catch(() => null);
  if (session) return NextResponse.next();

  // Pages d'administration → redirection vers la connexion.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
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
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  // Mutations sur l'API des articles → 401 JSON ; les lectures restent publiques.
  if (isMutation && pathname.startsWith("/api/articles")) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/articles/:path*",
    "/api/sync/:path*",
    "/api/revisions",
    "/api/seed",
    "/api/auth/:path*",
  ],
};
