/**
 * Limitation de débit en mémoire (par instance de serveur).
 * Suffisant pour un wiki auto-hébergé ; en cas de déploiement multi-instances,
 * remplacer le Map par un stockage partagé (Redis, base de données).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
/** Purge périodique pour éviter la croissance illimitée de la Map. */
const MAX_BUCKETS = 10_000;

function sweep(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Consomme un jeton pour la clé donnée.
 * @param key identifiant logique (ex. "login:1.2.3.4")
 * @param limit nombre de tentatives autorisées dans la fenêtre
 * @param windowMs durée de la fenêtre
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds,
  };
}

/** Adresse IP du client (meilleur effort derrière un proxy). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const sauts = forwarded
      .split(",")
      .map((saut) => saut.trim())
      .filter(Boolean);
    // Le **dernier** saut est celui ajouté par notre portier. Les précédents
    // viennent du client et sont falsifiables : les lire permettrait à un
    // attaquant de changer d'adresse à chaque essai et de contourner le quota
    // de connexion, qui est indexé sur cette valeur.
    const dernier = sauts[sauts.length - 1];
    if (dernier) return dernier;
  }
  return request.headers.get("x-real-ip")?.trim() || "inconnu";
}
