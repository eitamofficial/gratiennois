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

  // Défense en profondeur contre les requêtes forgées : un navigateur envoie
  // `Origin` sur toute requête d'écriture. S'il est présent et ne correspond pas
  // à l'hôte du site, la requête vient d'ailleurs. Les cookies `SameSite=Lax`
  // et l'exigence de JSON suffisent déjà ; ceci ferme la porte si l'un des deux
  // venait à être assoupli.
  const origine = request.headers.get("origin");
  if (origine) {
    const hote =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
      request.headers.get("host") ??
      "";
    try {
      if (hote && new URL(origine).host !== hote) {
        return "Origine de la requête refusée.";
      }
    } catch {
      return "Origine de la requête invalide.";
    }
  }

  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return "Contenu trop volumineux (512 Ko maximum).";
  }
  return null;
}
