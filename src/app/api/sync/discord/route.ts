import { NextResponse } from "next/server";
import { getServerSession, isDauphin } from "@/lib/auth";
import { runDiscordSync, SyncNotConfiguredError } from "@/lib/sync/discord";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/sync/discord — réservé au Dauphin.
 * Interroge l'API Discord (données réelles du serveur) puis résout automatiquement
 * les IDs Discord des personnalités par correspondance de nom.
 *
 * La logique vit dans `@/lib/sync/discord` : elle est aussi appelée par la tâche
 * planifiée `/api/cron/discord`, et les deux entrées doivent rester identiques.
 */
export async function POST() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!isDauphin(session)) {
    return NextResponse.json(
      { error: "Synchronisation réservée au Dauphin." },
      { status: 403 },
    );
  }

  try {
    return NextResponse.json({ ok: true, ...(await runDiscordSync()) });
  } catch (error) {
    if (error instanceof SyncNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Un échec de l'API Discord est une dépendance externe qui ne répond plus,
    // pas une erreur de programmation : 502 est le code honnête.
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 502 },
    );
  }
}
