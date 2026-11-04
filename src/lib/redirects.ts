import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requestOrigin } from "./site-url";

/**
 * Redirection interne qui conserve l'hôte public.
 *
 * `redirect("/connexion")` de Next construit le `Location` à partir de l'adresse
 * interne du serveur. Derrière Caddy, le wiki écoute sur `127.0.0.1:3000` : le
 * navigateur recevait donc `https://localhost:3000/connexion`, adresse qui
 * n'existe que sur la tablette. Le visiteur voyait « site inaccessible » en
 * cliquant sur l'espace d'édition, alors que le serveur répondait parfaitement.
 *
 * `requestOrigin` lit `X-Forwarded-Host`, posé par le portier, et le confronte à
 * une liste blanche — la redirection ne peut pas devenir ouverte.
 */
export async function redirectTo(pathname: string): Promise<never> {
  const entetes = await headers();
  const chemin = pathname.startsWith("/") ? pathname : `/${pathname}`;
  redirect(`${requestOrigin(entetes)}${chemin}`);
}

/** Redirection vers la connexion, en conservant la page demandée. */
export async function redirectToLogin(nextPath: string): Promise<never> {
  return redirectTo(`/connexion?next=${encodeURIComponent(nextPath)}`);
}
