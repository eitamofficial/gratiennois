/**
 * Déclinaisons web du drapeau historique du Ier et du IIe Delphinat.
 *
 * Règle de conception : **le cadre doit épouser le drapeau**. Ce drapeau source
 * fait 2000×2000, soit un ratio 1/1 — entièrement différent du drapeau actuel
 * (3200×2000, ratio 8/5). On ne produit donc ni une image rognée, ni une image
 * « rembourrée » de bandes transparentes qui ferait croire à un drapeau amputé :
 *   - public/drapeau-Ier-IIe-Delphinat.webp : ratio réel 1/1, pour l'interface ;
 *   - public/drapeau-Ier-IIe-Delphinat-1024.png : version pleine définition.
 *
 * Usage : node scripts/generate_historical_flag.mjs
 */
import sharp from "sharp";

const SOURCE = "public/drapeau-Ier-IIe-Delphinat.png";

const metadata = await sharp(SOURCE).metadata();
if (!metadata.width || !metadata.height) {
  throw new Error(`Impossible de lire ${SOURCE}`);
}
const sourceRatio = metadata.width / metadata.height;
console.log(
  `Drapeau historique : ${metadata.width}x${metadata.height} (${metadata.format}), ratio ${sourceRatio.toFixed(3)}`,
);

if (Math.abs(sourceRatio - 1) > 0.01) {
  console.warn(
    "  ! Le ratio n'est pas 1/1 : vérifiez que le cadre épouse bien le drapeau.",
  );
}

// 1. Version web pour l'interface, au ratio réel du drapeau.
await sharp(SOURCE)
  .resize({ width: 800, withoutEnlargement: false })
  .webp({ quality: 88 })
  .toFile("public/drapeau-Ier-IIe-Delphinat.webp");
console.log("→ public/drapeau-Ier-IIe-Delphinat.webp (800 px de large)");

// 2. Version pleine définition pour l'encyclopédie et l'impression.
await sharp(SOURCE)
  .resize({ width: 1024, withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toFile("public/drapeau-Ier-IIe-Delphinat-1024.png");
console.log("→ public/drapeau-Ier-IIe-Delphinat-1024.png");
