import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { contentTypeFor, type ImageFormat } from "@/lib/images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dossier des téléversements, hors de `public/` : voir la route d'envoi. */
const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

/**
 * Nom de fichier produit par la route d'envoi : `<horodatage base36>-<12 hex>.<ext>`.
 *
 * La forme est vérifiée **en entier** : c'est la seule garantie qu'un nom
 * publié contenant `..`, un séparateur ou un caractère de contrôle ne peut pas
 * faire remonter la lecture hors du dossier. Reconstruire un nom à partir
 * d'une entrée utilisateur, même « nettoyée », est la faille classique.
 */
const NOM_VALIDE = /^[a-z0-9]{1,12}-[a-f0-9]{12}\.(png|jpg|gif|webp)$/;

/**
 * GET /media/<fichier> — sert une image téléversée.
 *
 * ## Pourquoi une route et pas `public/`
 *
 * Next.js **recense `public/` au démarrage du serveur** : un fichier déposé
 * ensuite n'est servi qu'après un redémarrage. Un téléversement depuis
 * l'espace d'édition enregistrait donc l'image, la route répondait `201`, et
 * l'encadré affichait une image cassée — jusqu'au prochain redémarrage, sans
 * la moindre erreur. Lire le disque à chaque requête supprime ce décalage.
 *
 * C'est aussi l'occasion d'envoyer `nosniff` : sans lui, un navigateur peut
 * interpréter un fichier comme un document, et un fichierclaimed comme une
 * image doit le rester.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  if (!NOM_VALIDE.test(name)) {
    return NextResponse.json({ error: "Fichier inconnu." }, { status: 404 });
  }

  try {
    const contenu = await readFile(path.join(UPLOADS_DIR, name));
    return new NextResponse(new Uint8Array(contenu), {
      headers: {
        "Content-Type": contentTypeFor(name.split(".").pop() as ImageFormat),
        "X-Content-Type-Options": "nosniff",
        // Le nom contient un horodatage : un fichier est jamais réutilisé.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier inconnu." }, { status: 404 });
  }
}
