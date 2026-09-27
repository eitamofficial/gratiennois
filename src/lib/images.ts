/**
 * Images téléversées depuis l'espace d'édition.
 *
 * Une infobox n'accepte qu'un chemin **interne** ou une photo de profil
 * Discord (voir `discord-avatar-url.ts`). Pour qu'un rédacteur puisse
 * remplacer une illustration, il faut donc une route de téléversement qui
 * dépose le fichier sur le site et renvoie son chemin public — jamais
 * d'upload vers un tiers, ni d'URL distante collée dans un champ.
 *
 * ## Pourquoi vérifier les octets et pas le nom
 *
 * Un navigateur annonce `image/png` dans un en-tête `Content-Type` qu'il est
 * libre de choisir : c'est le client qui le remplit. Se fier à ce nom, ou à
 * l'extension du fichier, revient à accepter n'importe quoi — un script
 * déguisé en `.png`.
 * La seule source de vérité est le **nombre magique** en tête de fichier, que
 * l'expéditeur ne peut pas falsifier sans produire une image illisible.
 *
 * Le SVG est volontairement refusé : c'est un document XML qui peut porter du
 * script, et il s'exécute dans le contexte de la page.
 */

/** Formats matriciels acceptés, avec leur nombre magique. */
export const IMAGE_FORMATS = ["png", "jpg", "gif", "webp"] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

/** Types MIME servis, déduits du format réel. */
const CONTENT_TYPES: Record<ImageFormat, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

export function contentTypeFor(format: ImageFormat): string {
  return CONTENT_TYPES[format];
}

/**
 * Format réel d'une image, lu dans ses premiers octets.
 *
 * Retourne `null` si ce n'est pas une image matricielle reconnue — décision
 * taken **avant** toute écriture sur le disque.
 */
export function detectImageFormat(buffer: Uint8Array): ImageFormat | null {
  if (buffer.length < 12) return null;

  // PNG : 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return "png";
  }
  // JPEG : FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  // GIF : "GIF87a" ou "GIF89a"
  const entete = String.fromCharCode(...buffer.subarray(0, 6));
  if (entete === "GIF87a" || entete === "GIF89a") return "gif";
  // WebP : "RIFF" .... "WEBP"
  if (
    entete.slice(0, 4) === "RIFF" &&
    String.fromCharCode(...buffer.subarray(8, 12)) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export interface ImageSize {
  width: number;
  height: number;
}

/**
 * Dimensions déclarées dans l'en-tête du fichier.
 *
 * Une image sans dimensions lisibles est refusée à l'étape suivante : un
 * fichier tronqué ou contrefait ne les contient pas. La valeur sert surtout à
 * **`width` et `height` sur la balise `<img>`**, ce qui réserve la bonne place
 * dans la page et évite un saut de mise en laie au chargement.
 */
export function readImageSize(buffer: Uint8Array, format: ImageFormat): ImageSize | null {
  const vue = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  try {
    if (format === "png" && buffer.length >= 24) {
      return { width: vue.getUint32(16), height: vue.getUint32(20) };
    }
    if (format === "gif" && buffer.length >= 10) {
      return { width: vue.getUint16(6, true), height: vue.getUint16(8, true) };
    }
    if (format === "webp" && buffer.length >= 30) {
      // VP8 / VP8L / VP8X : le chunk commence à l'octet 12.
      const FourCC = String.fromCharCode(...buffer.subarray(12, 16));
      if (FourCC === "VP8 ") {
        return { width: vue.getUint16(26, true) & 0x3fff, height: vue.getUint16(28, true) & 0x3fff };
      }
      if (FourCC === "VP8L") {
        const bits = vue.getUint32(21, true);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      if (FourCC === "VP8X") {
        const largeur = buffer[24] | (buffer[25] << 8) | (buffer[26] << 16);
        const hauteur = buffer[27] | (buffer[28] << 8) | (buffer[29] << 16);
        return { width: largeur + 1, height: hauteur + 1 };
      }
      return null;
    }
    if (format === "jpg") {
      // Parcours des segments jusqu'au marqueur SOF, qui porte les dimensions.
      let decalage = 2;
      while (decalage + 9 < buffer.length) {
        if (buffer[decalage] !== 0xff) return null;
        const marqueur = buffer[decalage + 1];
        const longueur = vue.getUint16(decalage + 2);
        // SOF0..SOF15, sauf DHT (C4), JPG (C8) et DAC (CC).
        if (marqueur >= 0xc0 && marqueur <= 0xcf && marqueur !== 0xc4 && marqueur !== 0xc8 && marqueur !== 0xcc) {
          return { height: vue.getUint16(decalage + 5), width: vue.getUint16(decalage + 7) };
        }
        decalage += 2 + longueur;
      }
      return null;
    }
  } catch {
    return null;
  }
  return null;
}

/** Taille maximale d'une image téléversée (2 Mio). */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Résolution maximale acceptée, pour éviter une image gigantesque. */
const MAX_DIMENSION = 4000;

/**
 * Vrai si le fichier se **termine** comme une image complète de ce format.
 *
 * Les dimensions vivent dans les premiers octets : un fichier tronqué après
 * l'en-tête les conserve intactes et passait donc le contrôle. Or une image
 * tronquée s'affiche comme une icône cassée sur le site — précisément le
 * défaut qu'un téléversement est censé empêcher.
 *
 * Chaque format a une fin characteristicque :
 *   - PNG   : le chunk `IEND` (`AE 42 60 82`) termine le fichier ;
 *   - GIF   : le caractère `;` (0x3B) ;
 *   - JPEG  : le marqueur `FF D9` ;
 *   - WebP  : la taille RIFF déclarée dans l'en-tête doit correspondre à la
 *             longueur réelle du fichier.
 */
export function hasCompleteTrailer(buffer: Uint8Array, format: ImageFormat): boolean {
  const n = buffer.length;
  if (n < 16) return false;
  const fin = (index: number) => buffer[n - index];
  switch (format) {
    case "png":
      // Les quatre derniers octets sont le CRC du chunk `IEND`, lu de la fin
      // vers le début : 82 60 42 AE.
      return fin(1) === 0x82 && fin(2) === 0x60 && fin(3) === 0x42 && fin(4) === 0xae;
    case "gif":
      return fin(1) === 0x3b;
    case "jpg":
      return fin(1) === 0xd9 && fin(2) === 0xff;
    case "webp": {
      // Le champ « taille RIFF » vaut la longueur du fichier moins 8.
      const vue = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const annonce = vue.getUint32(4, true);
      return annonce + 8 <= n + 8 && annonce >= 12;
    }
    default:
      return false;
  }
}

export interface ImageRejection {
  reason: string;
}

export type ImageValidation =
  | { ok: true; format: ImageFormat; width: number; height: number; buffer: Buffer }
  | { ok: false; reason: string };

/**
 * Valide un fichier reçu **avant** de l'écrire.
 *
 * L'ordre des contrôles est délibéré : identification par les octets, puis
 * taille, puis dimensions. On ne fait jamais confiance au nom de fichier
 * transmis, et on n'accepte jamais une image dont on ne sait pas lire les
 * dimensions — c'est le signe d'un fichier corrompu ou d'un contenu trompeur.
 */
export function validateUploadedImage(
  data: ArrayBuffer | Uint8Array,
  declaredType?: string,
): ImageValidation {
  const buffer = Buffer.isBuffer(data)
    ? data
    : Buffer.from(data instanceof Uint8Array ? data : new Uint8Array(data));

  if (buffer.length === 0) {
    return { ok: false, reason: "Le fichier est vide." };
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      reason: `Image trop volumineuse (${Math.round(buffer.length / 1024)} Ko ; 2 Mio maximum).`,
    };
  }

  const format = detectImageFormat(buffer);
  if (!format) {
    return {
      ok: false,
      reason:
        "Format non reconnu. Seules les images PNG, JPEG, GIF et WebP sont acceptées — le SVG est refusé, car il peut contenir du script.",
    };
  }

  // Le type déclaré n'est pas une preuve, mais un désaccord avec les octets
  // signale un envoi erroné : on le signale plutôt que de l'ignorer en silence.
  if (declaredType && declaredType.startsWith("image/")) {
    const attendu: Record<ImageFormat, string[]> = {
      png: ["image/png"],
      jpg: ["image/jpeg", "image/jpg"],
      gif: ["image/gif"],
      webp: ["image/webp"],
    };
    if (!attendu[format].includes(declaredType.toLowerCase())) {
      return {
        ok: false,
        reason: `Le fichier est annoncé comme « ${declaredType} » mais son contenu est réellement du ${format.toUpperCase()}.`,
      };
    }
  }

  const taille = readImageSize(buffer, format);
  if (!taille || taille.width < 1 || taille.height < 1) {
    return {
      ok: false,
      reason: "Dimensions illisibles : le fichier semble incomplet ou corrompu.",
    };
  }
  if (!hasCompleteTrailer(buffer, format)) {
    return {
      ok: false,
      reason:
        "Fichier incomplet : l'image est tronquée. Elle s'afficherait cassée sur le site.",
    };
  }
  if (taille.width > MAX_DIMENSION || taille.height > MAX_DIMENSION) {
    return {
      ok: false,
      reason: `Image trop grande (${taille.width}×${taille.height}) ; ${MAX_DIMENSION} pixels par côté maximum.`,
    };
  }

  return { ok: true, format, width: taille.width, height: taille.height, buffer };
}
