/** Erreur levée lorsque le magasin de données est inaccessible. */
export class StorageUnavailableError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "StorageUnavailableError";
  }
}

/**
 * Traduit une erreur de magasin en réponse HTTP, pour les routes d'écriture.
 *
 * Un `StorageUnavailableError` décrit une **situation de configuration** — pas
 * un bug. Renvoyer « Erreur serveur. » devant elle laisserait un rédacteur
 * devant un message incompréhensible, alors que la cause est connue et
 * actionnable (il manque `DATABASE_URL`). On la restitue donc telle quelle, avec
 * le code `503` : la requête n'a pas été traitée, et il faut recommencer une
 * fois la configuration corrigée.
 *
 * Toute autre exception reste masquée — un message d'erreur interne peut
 * révéler des chemins de fichiers ou des détails de connexion.
 */
export function storageErrorResponse(error: unknown): {
  body: { error: string };
  status: number;
} {
  if (error instanceof StorageUnavailableError) {
    return { body: { error: error.message }, status: 503 };
  }
  return { body: { error: "Erreur serveur." }, status: 500 };
}

/** Masque le mot de passe d'une URL de connexion avant de l'afficher dans un message. */
export function maskDatabaseUrl(url: string | undefined): string {
  if (!url) return "(DATABASE_URL non défini)";
  return url.replace(/\/\/([^:@/]+):([^@/]+)@/, "//$1:***@");
}
