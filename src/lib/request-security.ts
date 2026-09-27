/** Garde-fous communs aux routes d'écriture. */

/** Taille maximale acceptée pour le corps d'une requête d'écriture (512 Ko). */
export const MAX_BODY_BYTES = 512 * 1024;

/**
 * Vérifie qu'une mutation est bien une requête JSON de taille raisonnable.
 * Renvoie un message d'erreur, ou null si la requête est acceptable.
 */
export function checkWriteRequest(request: Request): string | null {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return "Content-Type attendu : application/json.";
  }

  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return "Contenu trop volumineux (512 Ko maximum).";
  }
  return null;
}
