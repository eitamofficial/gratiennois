/**
 * Génère les déclinaisons web du drapeau officiel (flag.png).
 *
 * Règle de conception : **le cadre doit épouser le drapeau**. Le drapeau source
 * fait 3200×2000 (ratio 8/5) ; on ne produit donc jamais une image carrée qui
 * rognerait les bords, ni une image carrée «-rembourrée» de bandes
 * transparentes qui ferait croire à un drapeau amputé.
 *
 *   - public/flag.webp        : au ratio réel du drapeau (640×400), pour l'UI ;
 *   - public/flag-192.png     : icône PWA carrée, fond opaque et drapeau entier ;
 *   - public/flag-512.png     : idem, haute densité ;
 *   - src/app/icon.png        : favicon Next.js (64×64), même principe ;
 *   - public/og.png           : image OpenGraph 1200×630, drapeau centré sur
 *                               fond bleu nuit.
 *
 * Usage : node scripts/generate_flag_assets.mjs
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SOURCE = "public/flag.png";
/** Bleu nuit du thème : sert de fond aux icônes carrées. */
const NIGHT = "#0a1322";
/** Or du thème : liseré des icônes carrées. */
const GOLD = "#c9a227";
/** Part de la largeur de l'icône occupée par le drapeau. */
const ICON_FLAG_RATIO = 0.82;

await mkdir("src/app", { recursive: true });

const metadata = await sharp(SOURCE).metadata();
if (!metadata.width || !metadata.height) {
  throw new Error("Impossible de lire public/flag.png");
}
const sourceRatio = metadata.width / metadata.height;
console.log(
  `Drapeau source : ${metadata.width}x${metadata.height} (${metadata.format}), ratio ${sourceRatio.toFixed(3)}`,
);

// 1. Version web pour l'interface : **ratio réel**, aucune bande.
const webWidth = 640;
await sharp(SOURCE)
  .resize({ width: webWidth })
  .webp({ quality: 84 })
  .toFile("public/flag.webp");

// 2. Icônes carrées (PWA, favicon) : fond opaque + liseré or + drapeau entier
//    centré, avec une marge régulière. Aucun rognage, aucune transparence.
async function squareIcon(size, file) {
  const flagWidth = Math.round(size * ICON_FLAG_RATIO);
  const flagHeight = Math.round(flagWidth / sourceRatio);
  const flag = await sharp(SOURCE).resize({ width: flagWidth }).png().toBuffer();

  const inset = Math.max(1, Math.round(size * 0.012));
  const border = Math.max(1, Math.round(size * 0.018));

  // Liseré : rectangle transparent évidé, composé sous le drapeau.
  const frame = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${size}" height="${size}">
             <rect x="${inset}" y="${inset}" width="${size - inset * 2}" height="${
               size - inset * 2
             }" rx="${Math.round(size * 0.12)}"
                   fill="none" stroke="${GOLD}" stroke-width="${border}" />
           </svg>`,
        ),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: NIGHT },
  })
    .composite([
      { input: frame, top: 0, left: 0 },
      {
        input: flag,
        top: Math.round((size - flagHeight) / 2),
        left: Math.round((size - flagWidth) / 2),
      },
    ])
    .png()
    .toFile(file);
}

for (const size of [192, 512]) {
  await squareIcon(size, `public/flag-${size}.png`);
}
await squareIcon(64, "src/app/icon.png");

// 3. Image OpenGraph : drapeau entier, centré verticalement et horizontalement.
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const ogFlagWidth = 460;
const ogFlagHeight = Math.round(ogFlagWidth / sourceRatio);
const ogFlag = await sharp(SOURCE).resize({ width: ogFlagWidth }).png().toBuffer();

const ogFrame = await sharp({
  create: { width: OG_WIDTH, height: OG_HEIGHT, channels: 4, background: NIGHT },
})
  .composite([
    {
      input: Buffer.from(
        `<svg width="${OG_WIDTH}" height="${OG_HEIGHT}">
           <rect x="40" y="40" width="${OG_WIDTH - 80}" height="${OG_HEIGHT - 80}"
                 rx="18" fill="none" stroke="${GOLD}" stroke-opacity="0.55" stroke-width="3" />
         </svg>`,
      ),
      top: 0,
      left: 0,
    },
    {
      input: ogFlag,
      top: Math.round((OG_HEIGHT - ogFlagHeight) / 2),
      left: Math.round((OG_WIDTH - ogFlagWidth) / 2),
    },
  ])
  .png()
  .toFile("public/og.png");

console.log(
  `✓ public/flag.webp (${webWidth}×${Math.round(webWidth / sourceRatio)}), ` +
    "flag-192.png, flag-512.png, src/app/icon.png, public/og.png régénérés",
);
