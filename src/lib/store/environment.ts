import { siteUrlFromPlatform } from "../site-url";

/**
 * Environnement d'exécution : le wiki exige-t-il une base de données ?
 *
 * Le wiki est **éditable**. Sur un poste de développement, les fichiers JSON de
 * `data/` suffisent. Sur Vercel, la plateforme est **sans état** : chaque
 * invocation reçoit un système de fichiers *en lecture seule*, distinct de
 * celui de l'invocation précédente. Deux conséquences qu'il faut énoncer
 * clairement, parce qu'elles sont silencieuses :
 *
 *   1. le répertoire `data/` n'existe pas au démarrage → le magasin JSON
 *      believes le wiki vide, et le site se met en ligne **sans aucun article** ;
 *   2. même en réussite, une écriture serait perdue à la fin de l'invocation →
 *      un article créé par un rédacteur disparaîtrait, et une lecture aléatoire
 *      renverrait un contenu différent selon la requête.
 *
 * Detecter cette situation au démarrage, **avant** d'y servir une page, évite
 * un site « en ligne » mais vide ou perdant son contenu. Ce module ne lève pas
 * d'erreur à lui tout seul : il décrit la situation, et les appelants décident.
 */

/** Vrai sur Vercel (build ou exécution). */
export function isVercel(): boolean {
  return Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV);
}

/**
 * Vrai si le wiki tourne sur une plateforme **sans écriture persistante**.
 *
 * `VERCEL` est le signal le plus fiable, mais on couvre aussi les autres
 * environnements éphémères Declares par Next.js, et le cas général d'un
 * `DATABASE_URL` absent dans un contexte qui l'implique.
 */
export function isEphemeralRuntime(): boolean {
  return isVercel() || process.env.NEXT_RUNTIME_EPHEMERAL === "1";
}

/**
 * Raisons pour lesquelles la configuration est incomplète pour un déploiement.
 * Tableau vide = prêt à être déployé.
 */
export interface DeploymentProblem {
  /** Identifiant court, stable, pour les scripts et la documentation. */
  code: string;
  /** Explication en français, affichable telle quelle dans l'admin. */
  message: string;
  /** Variable d'environnement à renseigner, si le problème se résout ainsi. */
  variable?: string;
}

/**
 * Contrôle la configuration avant déploiement.
 *
 * Volontairement **bloquant pour le contenu** : un wiki qui perd ses articles
 * est pire qu'un wiki qui refuse de démarrer. Les autres écarts (secret
 * Discord, clé Gemini) sont signalés mais n'empêchent pas la mise en ligne — le
 * wiki reste consultable, simplement sans synchronisation ni propositions.
 */
export function checkDeploymentReadiness(): DeploymentProblem[] {
  const problems: DeploymentProblem[] = [];
  const ephemeral = isEphemeralRuntime();

  // Le critère n'est pas « suis-je en production ? » — `next start` définit
  // NODE_ENV=production y compris en local, où le stockage JSON fonctionne
  // parfaitement. Le critère est **la durabilité** : le contenu peut-il
  // survivre à la fin de l'invocation ?
  if (ephemeral && !process.env.DATABASE_URL) {
    problems.push({
      code: "DATABASE_URL_MANQUANTE",
      variable: "DATABASE_URL",
      message:
        "Ce déploiement s'exécute sur une plateforme sans écriture persistante (Vercel) : les fichiers JSON de data/ sont perdus à chaque invocation, donc le wiki serait vide ou perdrait ses articles. Renseignez DATABASE_URL (PostgreSQL).",
    });
  }

  if (!process.env.AUTH_SECRET) {
    problems.push({
      code: "AUTH_SECRET_MANQUANT",
      variable: "AUTH_SECRET",
      message:
        "AUTH_SECRET n'est pas défini : aucune session d'édition ne peut être signée de façon fiable. Générez-le avec « openssl rand -base64 32 ».",
    });
  }

  return problems;
}

/**
 * Avertissements non bloquants : le wiki fonctionne, mais en moins bien.
 */
export function checkDeploymentWarnings(): DeploymentProblem[] {
  const warnings: DeploymentProblem[] = [];

  if (!process.env.DATABASE_URL && !isEphemeralRuntime()) {
    warnings.push({
      code: "STOCKAGE_JSON",
      variable: "DATABASE_URL",
      message:
        "Stockage sur fichiers JSON. Correct en auto-hébergement et en développement ; basculez sur PostgreSQL avant un déploiement.",
    });
  }

  if (!process.env.SITE_URL && !siteUrlFromPlatform()) {
    warnings.push({
      code: "SITE_URL_MANQUANTE",
      variable: "SITE_URL",
      message:
        "Ni SITE_URL ni l'environnement de la plateforme ne fournissent d'URL publique : le sitemap, les métadonnées OpenGraph et les partages sociaux produiront des URL en localhost.",
    });
  }

  if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_GUILD_ID) {
    warnings.push({
      code: "DISCORD_NON_CONFIGURE",
      variable: "DISCORD_BOT_TOKEN",
      message:
        "Discord n'est pas configuré : les portraits et les rôles ne seront pas synchronisés (le repli local reste utilisé).",
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    warnings.push({
      code: "GEMINI_NON_CONFIGURE",
      variable: "GEMINI_API_KEY",
      message:
        "GEMINI_API_KEY n'est pas défini : l'analyse automatique des salons de parti reste inerte, sans bloquer le wiki.",
    });
  }

  return warnings;
}

/** Résumé en une ligne, pour les journaux de démarrage. */
export function describeRuntime(): string {
  const pieces = [
    isEphemeralRuntime() ? "sans écriture persistante" : "écriture persistante",
    process.env.DATABASE_URL ? "PostgreSQL" : "fichiers JSON",
  ];
  return pieces.join(" · ");
}
