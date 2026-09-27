import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { canWrite, getServerSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  MAX_IMAGE_BYTES,
  contentTypeFor,
  validateUploadedImage,
} from "@/lib/images";
import { isEphemeralRuntime } from "@/lib/store/environment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dossier de dépôt des téléversements.
 *
 * Volontairement **hors de `public/`** : Next.js recense `public/` au
 * démarrage du serveur, et une image déposée ensuite ne serait servie
 * qu'après un redémarrage — l'en-tête du formulaire afficherait donc une image
 * cassée jusqu'au prochain reboot. Les fichiers sont ici servis par la route
 * `/media/<fichier>`, qui lit le disque à chaque requête.
 */
const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

/** Nombre maximum d'images téléversées par heure et par adresse. */
const MAX_PAR_HEURE = 30;

/**
 * POST /api/images — téléversement d'une image pour l'encadré d'un article.
 *
 * Réservé aux charges ayant pouvoir d'écriture. Le fichier est **identifié par
 * ses octets** (`validateUploadedImage`), jamais par son nom ni par le type
 * MIME annoncé, tous deux choisis par l'expéditeur.
 *
 * Le nom de fichier est tiré au hasard : reprendre le nom d'origine
 * reviendrait à laisser le client choisir un chemin sur le disque
 * (`../../.env`, `constitution.png`…). Il n'est d'ailleurs même pas
 * nécessaire — l'image sert à l'affichage, pas au téléchargement.
 */
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!canWrite(session)) {
    return NextResponse.json(
      { error: "Votre charge ne permet pas de téléverser d'image." },
      { status: 403 },
    );
  }

  const limite = rateLimit(`upload:${clientIp(request)}`, MAX_PAR_HEURE, 60 * 60 * 1000);
  if (!limite.allowed) {
    return NextResponse.json(
      { error: "Trop de téléversements depuis cette adresse. Réessayez plus tard." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(limite.retryAfterSeconds)) },
      },
    );
  }

  // Sur Vercel, le disque est reconstruit à chaque déploiement : une image
  // écrite ici disparaîtrait au déploiement suivant, et l'encadré afficherait
  // une image cassée. On le dit franchement plutôt que d'accepter un envoi qui
  // fonctionnera en apparence et disparaîtra.
  if (isEphemeralRuntime()) {
    return NextResponse.json(
      {
        error:
          "Ce déploiement ne conserve pas les fichiers téléversés : une image envoyée ici disparaîtrait au prochain déploiement. Utilisez « Photo de profil Discord », qui est relue en direct et ne dépend d'aucun stockage local.",
      },
      { status: 503 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Content-Type attendu : multipart/form-data." },
      { status: 415 },
    );
  }

  // Le corps est lu **en entier** avant d'être analysé : `formData()`Buffered
  // ferait d'abord transiter le fichier dans la mémoire. La taille est donc
  // contrôlée sur l'en-tête, puis sur les octets réellement reçus.
  const announced = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(announced) && announced > MAX_IMAGE_BYTES + 64 * 1024) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (2 Mio maximum)." },
      { status: 413 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requête illisible." }, { status: 400 });
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Aucun fichier reçu (champ « image » attendu)." },
      { status: 400 },
    );
  }

  const validation = validateUploadedImage(
    await file.arrayBuffer(),
    file.type || undefined,
  );
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 415 });
  }

  const nom = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${validation.format}`;
  try {
    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(path.join(UPLOADS_DIR, nom), validation.buffer);
  } catch {
    return NextResponse.json(
      {
        error:
          "Le fichier n'a pas pu être enregistré. Vérifiez que le dossier data/uploads est accessible en écriture.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      url: `/media/${nom}`,
      format: validation.format,
      width: validation.width,
      height: validation.height,
      contentType: contentTypeFor(validation.format),
      bytes: validation.buffer.length,
    },
    { status: 201 },
  );
}
