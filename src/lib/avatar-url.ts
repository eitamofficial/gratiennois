import { cachedAvatarFile } from "./avatar-cache";
import { isDiscordAvatarUrl } from "./discord-avatar-url";
import type { ArticleInfobox, DiscordSnapshot } from "./types";

/**
 * Photos de profil Discord dans les infoboxes.
 *
 * L'encyclopédie affiche le portrait d'un personnage ; ici ce portrait est la
 * **photo de profil réelle** lue sur l'API Discord. Deux garanties :
 *
 *   1. **liste blanche stricte** — seules les URL du CDN Discord sont
 *      acceptées, avec la forme exacte des routes d'avatar. Aucune URL fournie
 *      par un rédacteur n'est suivie : un encadré ne peut pas devenir un
 *      traqueur, ni un vecteur de chargement depuis un site tiers. Toutes les
 *      autres sources restent refusées par `normalizeInfobox` ; la forme exacte
 *      des URL autorisées est définie dans `discord-avatar-url.ts`, module pur
 *      utilisable aussi bien par le serveur que par le client ;
 *   2. **repli local** — si l'API Discord est absente ou le compte sans photo,
 *      on renvoie le portrait mis en cache par `npm run cache:avatars` (dans
 *      son format d'origine : PNG, JPEG, GIF ou WebP), sinon rien : l'encadré
 *      affiche ses données sans image, ce qui reste correct.
 *
 * **Côté serveur uniquement** : ce module lit `public/avatars/index.json` sur
 * le disque. Il ne doit pas être importé par un composant client.
 */

export { isDiscordAvatarUrl };

/**
 * Photo de profil Discord servie par le site (cache local).
 *
 * Le nom du fichier n'est pas devinable : le script de cache conserve chaque
 * image dans son format d'origine, si bien qu'un portrait peut être un PNG, un
 * JPEG, un GIF ou un WebP. On lit donc l'index plutôt que de supposer
 * `<id>.png` — cette supposition affichait une image cassée pour tous les
 * portraits qui ne sont pas en PNG.
 */
export function cachedAvatarPath(discordUserId: string): string | null {
  if (!/^[0-9]{5,25}$/.test(discordUserId)) return null;
  return cachedAvatarFile(discordUserId);
}

/**
 * Résout la photo à afficher pour un personnage : photo actuelle si l'API
 * Discord répond, portrait en cache local sinon.
 */
export function resolveAvatarUrl(
  discordUserId: string | undefined,
  snapshot: DiscordSnapshot | null,
): string | null {
  if (discordUserId) {
    const member = snapshot?.members.find((item) => item.id === discordUserId);
    const live = member?.avatarUrl;
    if (live && isDiscordAvatarUrl(live)) return live;
    return cachedAvatarPath(discordUserId);
  }
  return null;
}

/**
 * Injecte la photo de profil dans une infobox de personnalité, sans jamais
 * écraser une illustration choisie par la rédaction, et sans jamais retirer
 * une illustration existante si aucune photo n'est disponible.
 */
export function withAvatar(
  infobox: ArticleInfobox,
  discordUserId: string | undefined,
  snapshot: DiscordSnapshot | null,
  personName: string,
): ArticleInfobox {
  if (infobox.imageUrl) return infobox;
  const avatarUrl = resolveAvatarUrl(discordUserId, snapshot);
  if (!avatarUrl) return infobox;
  return {
    ...infobox,
    imageUrl: avatarUrl,
    // Le texte alternatif est obligatoire (validation serveur) et nommé : une
    // photo de profil seule n'apprend rien à un lecteur d'écran.
    imageAlt: `Photo de profil Discord de ${personName}`,
    imageCaption: infobox.imageCaption ?? `Photo de profil Discord — source : API Discord`,
  };
}
