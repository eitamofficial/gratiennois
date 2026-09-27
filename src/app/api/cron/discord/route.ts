import { NextResponse } from "next/server";
import { runDiscordSync, SyncNotConfiguredError } from "@/lib/sync/discord";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/discord — synchronisation Discord planifiée (Vercel Cron).
 *
 * Sur un déploiement, personne n'est devant l'écran pour cliquer sur
 * « Synchroniser » dans `/admin` : sans planification, les portraits, les rôles
 * et les fiches citoyens resteraient figés au moment du déploiement. La tâche
 * est donc appelée chaque heure par l'horaire de `vercel.json`.
 *
 * **Authentification** : Vercel joint l'en-tête `Authorization: Bearer
 * $CRON_SECRET` à chaque appel de Cron. On compare avec une égalité constant
 * dans le temps, et un secret absent fait répondre 503 plutôt que d'ouvrir la
 * route à quiconque trouve l'URL.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      {
        error:
          "CRON_SECRET n'est pas défini : la tâche planifiée est désactivée. Définissez-le pour que la synchronisation se fasse seule.",
      },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const fourni = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!comparaisonAChiffreConstant(fourni, secret)) {
    return NextResponse.json({ error: "Jeton invalide." }, { status: 401 });
  }

  try {
    const report = await runDiscordSync();
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    if (error instanceof SyncNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

/**
 * Comparaison à temps constant.
 *
 * Un `===` classique s'arrête à la première différence et révèle, par la durée
 * de la réponse, le nombre de caractères corrects. Sans importance ici, c'est
 * une bonne habitude à ne pas laisser passer sur une comparaison de secret.
 */
function comparaisonAChiffreConstant(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let ecart = 0;
  for (let i = 0; i < a.length; i += 1) {
    ecart |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return ecart === 0;
}
