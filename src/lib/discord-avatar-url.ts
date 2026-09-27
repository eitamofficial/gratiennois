/**
 * Liste blanche des URL de photo de profil Discord.
 *
 * Ce module est **délibérément pur** : ni `node:fs`, ni aucun accès réseau ou
 * disque. Il est importé par `src/lib/infobox.ts`, lui-même importé par
 * `InfoboxEditor.tsx`, qui est un composant **client** — toute dépendance
 * Node y ferait échouer la compilation du paquet. La lecture du cache local et
 * la résolution de l'URL affichée vivent donc dans `avatar-url.ts` et
 * `avatar-cache.ts`, côté serveur uniquement.
 */

/**
 * Forme exacte d'une URL d'avatar Discord :
 * `https://cdn.discordapp.com/avatars/<id>/<hash>.<ext>` (avatar de compte)
 * ou `https://cdn.discordapp.com/guild-avatars/<id>/<hash>.<ext>` (avatar de
 * serveur, propre à un membre). Les identifiants et empreintes Discord sont
 * des chaînes alphanumériques : rien d'autre n'est accepté.
 *
 * Les extensions autorisées sont les formats dans lesquels le CDN sert
 * réellement une photo de profil — PNG, JPEG, GIF et WebP.
 *
 * L'empreinte d'un avatar **animé** commence par `a_` (Discord y signale le
 * format GIF). La liste blanche n'acceptait que `[a-z0-9]` : le `_` de ce
 * préfixe rejetait l'URL, et le portrait de tout membre ayant une photo
 * animée disparaissait au profit de la silhouette par défaut — sans aucune
 * erreur visible, puisque l'absence de portrait est un repli légitime. D'où la
 * forme `(a_)?[a-z0-9]{8,64}` : le préfixe est autorisé à sa place exacte,
 * jamais un caractère `_` quelconque au milieu de l'empreinte.
 */
const DISCORD_AVATAR_URL =
  /^https:\/\/cdn\.discordapp\.com\/(avatars|guild-avatars)\/[0-9]{5,25}\/(a_)?[a-z0-9]{8,64}\.(png|webp|gif|jpe?g)(\?size=\d{1,4})?$/i;

/** Vrai si l'URL est une photo de profil Discord autorisée. */
export function isDiscordAvatarUrl(value: string): boolean {
  return DISCORD_AVATAR_URL.test(value);
}
