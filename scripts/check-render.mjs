#!/usr/bin/env node
/**
 * Audit de rendu — desktop et mobile, sans navigateur visible.
 *
 * Le projet n'a pas de navigateur headless installé (ni Puppeteer ni Playwright) ;
 * ce script pilote Microsoft Edge en mode headless via le protocole DevTools
 * (WebSocket natif de Node, aucune dépendance) et mesure la page réelle :
 *
 *   - débordement horizontal (le site doit tenir dans la largeur de l'écran) et
 *     zoom automatique du navigateur, qui masquait les débordements sur mobile ;
 *   - éléments qui sortent du cadre de lecture ;
 *   - images rognées (object-fit: cover) ou étirées (object-fit par défaut) : un
 *     drapeau 8/5 dans un cadre carré est un bug d'affichage, pas un détail ;
 *   - texte coupé par overflow: hidden, troncatures « … » à vérifier ;
 *   - contrôles tactiles qui se recouvrent (rendent l'un inaccessible) ;
 *   - sauts de mise en page après chargement des images et des polices ;
 *   - cibles tactiles trop petites (24 px normatifs, 40 px confortable) ;
 *   - texte trop petit (< 12 px) et contrastes insuffisants (ratio < 4,5:1) ;
 *   - images sans attribut `alt`, absence de `<h1>`, niveaux de titres sautés.
 *
 * Usage :
 *   node scripts/check-render.mjs                       # pages publiques
 *   node scripts/check-render.mjs http://localhost:3000/plan
 *   PAGES="/plan /wiki/le-dauphin" node scripts/check-render.mjs
 *   COOKIE="session=…" PAGES="admin,admin/activite" node scripts/check-render.mjs
 *   BASE_URL=https://wiki.example.com node scripts/check-render.mjs
 *   THEME=light node scripts/check-render.mjs     # audite le thème clair
 *   THEME=dark  node scripts/check-render.mjs     # audite le thème sombre
 *
 * Note Windows : Git Bash transforme un chemin en argument commençant par « / ».
 * Passez donc les chemins sans barre initiale dans PAGES :
 *   PAGES="plan,wiki/le-dauphin" node scripts/check-render.mjs
 *
 * Code de sortie : 1 si au moins un problème bloquant est détecté.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const PORT = Number(process.env.CDP_PORT ?? 9222);

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const DEFAULT_PAGES = [
  "/",
  "/wiki",
  // Fiches de personnalités (portrait, encadrés, renvois)
  "/wiki/eitam",
  "/wiki/selios",
  "/wiki/esto",
  "/wiki/bougre",
  "/wiki/swaylo",
  "/wiki/baron",
  "/wiki/math",
  "/wiki/voytec",
  "/wiki/capy",
  "/wiki/style",
  "/wiki/frenchserbian",
  "/wiki/stanislas",
  // Fiche citoyen générée automatiquement (portrait + sections vides)
  "/wiki/musico",
  // Histoire des trois règnes
  "/wiki/les-trois-delphinats",
  "/wiki/ier-delphinat",
  "/wiki/la-junte-militaire",
  "/wiki/2e-delphinat",
  "/wiki/la-chute-du-2e-delphinat",
  "/wiki/norlot",
  // Guerres, répressions, crise et entités
  "/wiki/1ere-guerre-delphinal",
  "/wiki/republique-de-gratianopolis",
  "/wiki/grande-repression",
  "/wiki/grande-guerre-de-secession-delphinal",
  "/wiki/regence-gratiennoise",
  "/wiki/crise-politique-contemporaine",
  "/wiki/neustrie",
  "/wiki/massivie",
  "/wiki/le-premier-ministre",
  "/wiki/parti-revolutionnaire-socialiste-gratiennois",
  "/wiki/parti-union-de-premier-regime",
  // Textes fondateurs des règnes précédents (encadrés + drapeau)
  "/wiki/reglement-du-ier-delphinat",
  "/wiki/constitution-du-2e-delphinat",
  // Texte constitutionnel
  "/wiki/le-dauphin",
  "/wiki/le-dauphin/versions",
  "/wiki/la-constitution",
  "/wiki/les-lois-du-delphinat",
  "/wiki/histoire-du-delphinat",
  "/wiki/geographie-du-delphinat",
  "/wiki/lassemblee",
  "/wiki/les-baillits",
  "/wiki/categorie/institutions",
  "/plan",
  "/tags",
  "/recherche?q=delphinat",
  "/constitution",
  "/institutions",
  "/personnalites",
  "/credits",
  "/la-loba",
  "/la-loba/fenix",
  "/connexion",
  "/admin/ia",
  "/admin/nouveau",
  "/admin/eitam/modifier",
];

/** Cookie de session facultatif, pour auditer les pages d'administration. */
const COOKIE = process.env.COOKIE ?? "";

/**
 * Thème à auditer ("light" ou "dark"). Vide = on laisse le navigateur choisir,
 * ce qui permet de vérifier que le thème par défaut est sain.
 */
const THEME = process.env.THEME ?? "";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, mobile: true },
  { name: "desktop", width: 1440, height: 900, mobile: false },
];

/** Seuil de taille de police jugée illisible (px). */
const MIN_FONT_SIZE = 12;
/**
 * Cibles tactiles : 24 px est le minimum normatif (WCAG 2.2, SC 2.5.8),
 * 40 px la taille confortable visée sur ce site.
 */
const MIN_TAP_TARGET = 24;
const COMFORT_TAP_TARGET = 40;

// ---------------------------------------------------------------------------
// Lancement du navigateur
// ---------------------------------------------------------------------------

function findBrowser() {
  const found = EDGE_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) {
    console.error(
      "Aucun navigateur trouvé (Edge ou Chrome). Installez Edge ou lancez l'audit manuellement.",
    );
    process.exit(2);
  }
  return found;
}

const profileDir = mkdtempSync(path.join(tmpdir(), "render-audit-"));
const browser = spawn(findBrowser(), [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--disable-background-networking",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  "about:blank",
]);

/** Attend que le port de débogage réponde. */
async function waitForDebugger(attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return;
    } catch {
      /* le navigateur n'écoute pas encore */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Le navigateur headless n'a pas ouvert son port de débogage.");
}

/** Client DevTools minimal : une requête, une réponse. */
class DevTools {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    /** Handlers des événements (console, exceptions…). */
    this.handlers = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method) {
        for (const handler of this.handlers.get(message.method) ?? []) {
          handler(message.params);
        }
        return;
      }
      const resolver = this.pending.get(message.id);
      if (!resolver) return;
      this.pending.delete(message.id);
      if (message.error) resolver.reject(new Error(message.error.message));
      else resolver.resolve(message.result);
    });
  }

  on(method, handler) {
    const list = this.handlers.get(method) ?? [];
    list.push(handler);
    this.handlers.set(method, list);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
}

function openSocket(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.addEventListener("open", () => resolve(socket));
    socket.addEventListener("error", () => reject(new Error("Connexion DevTools impossible.")));
  });
}

// ---------------------------------------------------------------------------
// Audit exécuté dans la page
// ---------------------------------------------------------------------------

/* eslint-disable no-undef */
function auditPage({ minFontSize, minTapTarget, comfortTapTarget, emulatedWidth, emulatedHeight }) {
  const problems = [];
  const viewportWidth = window.innerWidth;
  const documentWidth = document.documentElement.scrollWidth;
  // Sur mobile, un débordement horizontal fait « zoomer » le navigateur : la
  // largeur de la fenêtre devient alors plus grande que l'écran et la comparaison
  // document/fenetre ne détecte plus rien. On compare donc toujours à la
  // largeur **émulée** (celle de l'appareil), et on signale le zoom.
  const screenWidth = emulatedWidth || viewportWidth;
  const zoomedOut = viewportWidth > screenWidth + 1;

  const describe = (element) => {
    const id = element.id ? `#${element.id}` : "";
    const classes =
      typeof element.className === "string" && element.className
        ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}`
        : "";
    const text = (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${element.tagName.toLowerCase()}${id}${classes}${text ? ` « ${text} »` : ""}`;
  };

  const isVisible = (element) => {
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  /**
   * Chrome applique `content-visibility: hidden` au contenu d'un `<details>`
   * fermé : les éléments restent « mesurables » (rectangles non nuls) alors
   * qu'ils ne sont pas affichés. Sans cette vérification, l'audit comparerait
   * des rectangles fantômes et signalerait des chevauchements, des débordements
   * ou des contrastes qui n'existent pas.
   */
  const isRevealed = (element) => {
    let node = element;
    for (let depth = 0; node && node !== document.body && depth < 12; depth++) {
      if (node.tagName === "DETAILS" && !node.open) {
        // Seul le <summary> d'un details fermé reste affiché.
        const summary = node.querySelector(":scope > summary");
        if (!summary || (node !== element && !summary.contains(element))) return false;
      }
      node = node.parentElement;
    }
    return true;
  };

  const isReallyVisible = (element) => isVisible(element) && isRevealed(element);

  // 1. Débordement horizontal du document.
  if (documentWidth > screenWidth + 1) {
    problems.push({
      level: "bloquant",
      kind: "debordement",
      detail: `page large de ${documentWidth} px pour un écran de ${screenWidth} px`,
    });
  } else if (zoomedOut) {
    problems.push({
      level: "bloquant",
      kind: "zoom-automatique",
      detail: `le navigateur a zoomé pour faire tenir la page (fenêtre ${viewportWidth} px pour un écran de ${screenWidth} px) : le contenu déborde`,
    });
  }

  // Un élément qui déborde n'est un problème que s'il n'est pas dans une zone
  // volontairement défilante (barre de catégories mobile, blocs de code…).
  const inScrollableAncestor = (element) => {
    let node = element.parentElement;
    while (node && node !== document.body) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") return true;
      node = node.parentElement;
    }
    return false;
  };

  const offenders = [];
  for (const element of document.body.querySelectorAll("*")) {
    if (!isVisible(element)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.right > screenWidth + 2 || rect.left < -2) {
      if (inScrollableAncestor(element)) continue;
      offenders.push({
        label: describe(element),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      });
    }
  }
  if (offenders.length > 0) {
    problems.push({
      level: "bloquant",
      kind: "element-hors-cadre",
      detail: `${offenders.length} élément(s) sortent du cadre`,
      samples: offenders.slice(0, 4).map(
        (item) =>
          `${item.label} (${item.left} → ${item.right} px, largeur interne ${item.scrollWidth}/${item.clientWidth})`,
      ),
    });
  }

  // 2. Cibles tactiles — pertinent au doigt, pas au pointeur : on ne contrôle
  //    ce critère qu'en vue mobile (sur desktop 36 px à la souris suffisent).
  const small = [];
  if (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768) {
    for (const element of document.querySelectorAll("a, button, input, select, textarea, [role=button]")) {
      if (!isVisible(element)) continue;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      // Lien d'évitement (« Aller au contenu ») : réduit à 1 px jusqu'au focus,
      // il ne doit pas être signalé.
      if (rect.width <= 2 && rect.height <= 2) continue;
      // Lien de texte brut (fil d'Ariane, renvois dans une phrase) : la zone
      // cliquable est le mot lui-même, l'agrandir nuirait à la lecture.
      const isPlainTextLink =
        element.tagName === "A" &&
        Number.parseFloat(style.paddingTop) === 0 &&
        Number.parseFloat(style.borderTopWidth) === 0;
      if (isPlainTextLink) continue;
      // Un champ de formulaire posé sur une zone/FRAME avec du padding est
      // comfortably cliquable : on mesure la zone, pas seulement la boîte.
      if (["INPUT", "SELECT", "TEXTAREA"].includes(element.tagName)) {
        const parent = element.parentElement;
        if (parent) {
          const parentStyle = getComputedStyle(parent);
          const padding = [
            parentStyle.paddingTop,
            parentStyle.paddingBottom,
            parentStyle.paddingLeft,
            parentStyle.paddingRight,
          ].map((value) => Number.parseFloat(value));
          if (Math.min(...padding) >= 6) continue;
        }
      }
      // Cible jugée insuffisante quand elle est à la fois basse ET étroite :
      // un lien large de 358 px sur 32 px de haut reste confortable au doigt.
      if (rect.height < (comfortTapTarget ?? 40) && rect.width < 200) {
        const blocking = rect.height < minTapTarget;
        small.push({
          label: `${describe(element)} (${Math.round(rect.width)}×${Math.round(rect.height)} px)`,
          blocking,
        });
      }
    }
  }
  if (small.length > 0) {
    const blocking = small.filter((item) => item.blocking);
    problems.push({
      level: blocking.length > 0 ? "bloquant" : "avertissement",
      kind: "cible-tactile",
      detail: `${small.length} contrôle(s) sous ${comfortTapTarget ?? 40} px (dont ${blocking.length} sous le minimum de ${minTapTarget} px)`,
      samples: small.slice(0, 5).map((item) => item.label),
    });
  }

  // 3. Texte trop petit.
  const tiny = [];
  for (const element of document.querySelectorAll("p, span, a, li, td, th, label, small, code, h1, h2, h3")) {
    if (!isVisible(element)) continue;
    if (!element.textContent?.trim()) continue;
    const size = Number.parseFloat(getComputedStyle(element).fontSize);
    if (size < minFontSize) tiny.push(`${describe(element)} (${size} px)`);
  }
  if (tiny.length > 0) {
    problems.push({
      level: "avertissement",
      kind: "texte-petit",
      detail: `${tiny.length} bloc(s) de texte sous ${minFontSize} px`,
      samples: tiny.slice(0, 4),
    });
  }

  // 4. Contraste : couleur du texte contre le fond effectif le plus proche.
  const parseColor = (value) => {
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const [r, g, b, a = 1] = match[1].split(",").map((part) => Number.parseFloat(part));
    return { r, g, b, a };
  };
  const luminance = ({ r, g, b }) => {
    const channel = (value) => {
      const v = value / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const backgroundOf = (element) => {
    let node = element;
    while (node && node !== document.documentElement) {
      const color = parseColor(getComputedStyle(node).backgroundColor);
      if (color && color.a > 0.5) return color;
      node = node.parentElement;
    }
    return { r: 6, g: 11, b: 20, a: 1 };
  };

  const lowContrast = [];
  for (const element of document.querySelectorAll("p, span, a, li, h1, h2, h3, button, label, time")) {
    if (!isVisible(element)) continue;
    const text = element.textContent?.trim();
    if (!text) continue;
    // On ne mesure que les éléments dont tout le texte est direct.
    if (element.children.length > 0) continue;
    const style = getComputedStyle(element);
    if (style.color.includes("rgba(0, 0, 0, 0)")) continue;
    const foreground = parseColor(style.color);
    if (!foreground) continue;
    const background = backgroundOf(element);
    const l1 = luminance(foreground);
    const l2 = luminance(background);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    // Texte secondaire (indices 500+) toléré jusqu'à 3:1.
    const size = Number.parseFloat(style.fontSize);
    const bold = Number.parseInt(style.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const seuil = large ? 3 : 4.5;
    if (ratio < seuil) lowContrast.push(`${describe(element)} — ${ratio.toFixed(2)}:1 (min ${seuil}:1)`);
  }
  if (lowContrast.length > 0) {
    problems.push({
      level: "avertissement",
      kind: "contraste",
      detail: `${lowContrast.length} texte(s) sous le seuil WCAG AA`,
      samples: lowContrast.slice(0, 5),
    });
  }

  // 5. Accessibilité de base.
  const missingAlt = [...document.querySelectorAll("img")]
    .filter((image) => !image.hasAttribute("alt"))
    .map((image) => image.getAttribute("src") ?? "(sans src)");
  if (missingAlt.length > 0) {
    problems.push({
      level: "bloquant",
      kind: "alt-manquant",
      detail: `${missingAlt.length} image(s) sans attribut alt`,
      samples: missingAlt.slice(0, 3),
    });
  }

  const h1Count = document.querySelectorAll("h1").length;
  if (h1Count !== 1) {
    problems.push({
      level: "avertissement",
      kind: "titre-h1",
      detail: `${h1Count} élément(s) <h1> sur la page (un seul attendu)`,
    });
  }

  const levels = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((heading) =>
    Number.parseInt(heading.tagName[1], 10),
  );
  const jumps = [];
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) jumps.push(`h${levels[i - 1]} → h${levels[i]}`);
  }
  if (jumps.length > 0) {
    problems.push({
      level: "avertissement",
      kind: "hierarchie-titres",
      detail: `${jumps.length} saut(s) de niveau`,
      samples: jumps.slice(0, 3),
    });
  }

  if (!document.documentElement.lang) {
    problems.push({ level: "bloquant", kind: "langue-absente", detail: "<html> sans attribut lang" });
  }

  const title = document.title ?? "";
  if (!title) {
    problems.push({ level: "bloquant", kind: "titre-absent", detail: "<title> vide" });
  }

  // 6. Images : rognées, déformées, ou cadres mal ajustés.
  //    C'est la source des cadres « qui ne bordent pas le drapeau » : une image
  //    8/5 dans un cadre carré avec `object-cover` est amputée des côtés.
  const distorted = [];
  const cropped = [];
  for (const image of document.querySelectorAll("img")) {
    if (!isReallyVisible(image)) continue;
    if (!(image.naturalWidth > 0 && image.naturalHeight > 0)) continue;
    const rect = image.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    const style = getComputedStyle(image);
    const boxRatio = rect.width / rect.height;
    const naturalRatio = image.naturalWidth / image.naturalHeight;
    // Tolérance de 3 % : les arrondis de px et les bordures ne sont pas des bugs.
    const drift = Math.abs(boxRatio - naturalRatio) / naturalRatio;
    if (drift <= 0.03) continue;
    const label = `${describe(image)} (${image.naturalWidth}×${image.naturalHeight} dans ${Math.round(
      rect.width,
    )}×${Math.round(rect.height)} px, ${style.objectFit})`;
    if (style.objectFit === "fill") distorted.push(label);
    else if (style.objectFit === "cover") cropped.push(label);
  }
  if (distorted.length > 0) {
    problems.push({
      level: "bloquant",
      kind: "image-deformee",
      detail: `${distorted.length} image(s) étirées (object-fit par défaut)`,
      samples: distorted.slice(0, 4),
    });
  }
  if (cropped.length > 0) {
    problems.push({
      level: "bloquant",
      kind: "image-rognee",
      detail: `${cropped.length} image(s) rognées par object-fit: cover`,
      samples: cropped.slice(0, 4),
    });
  }

  // 7. Contenu coupé : un texte tronqué net (sans points de suspension) est un
  //    bug d'affichage ; une troncature voluntaryire est signalée à part.
  const hardClipped = [];
  const ellipsised = [];
  for (const element of document.querySelectorAll("body *")) {
    if (!isReallyVisible(element)) continue;
    // Les textes réservés aux lecteurs d'écran (`sr-only`) sont rognés à
    // dessein par un clip de 1×1 px : ce n'est pas un bug d'affichage.
    const box = element.getBoundingClientRect();
    if (box.width <= 2 && box.height <= 2) continue;
    const style = getComputedStyle(element);
    if (style.clip === "rect(0px, 0px, 0px, 0px)" || style.clipPath === "inset(50%)") continue;
    const clipsX = style.overflowX === "hidden" || style.overflowX === "clip";
    const clipsY = style.overflowY === "hidden" || style.overflowY === "clip";
    if (!clipsX && !clipsY) continue;
    // On ne retient que les éléments qui portent eux-mêmes du texte : un
    // conteneur décoratif (dégradé, halo) n'est pas concerné.
    const hasOwnText = [...element.childNodes].some(
      (node) => node.nodeType === 3 && node.textContent.trim().length > 0,
    );
    if (!hasOwnText) continue;
    const overflowingX = clipsX && element.scrollWidth > element.clientWidth + 1;
    const overflowingY = clipsY && element.scrollHeight > element.clientHeight + 1;
    if (!overflowingX && !overflowingY) continue;
    const label = `${describe(element)} (${element.scrollWidth}×${element.scrollHeight} dans ${element.clientWidth}×${element.clientHeight} px)`;
    if (style.textOverflow === "ellipsis" && overflowingX) ellipsised.push(label);
    else hardClipped.push(label);
  }
  if (hardClipped.length > 0) {
    problems.push({
      level: "bloquant",
      kind: "contenu-coupe",
      detail: `${hardClipped.length} bloc(s) de texte coupés par overflow: hidden`,
      samples: hardClipped.slice(0, 4),
    });
  }
  if (ellipsised.length > 0) {
    problems.push({
      level: "avertissement",
      kind: "texte-tronque",
      detail: `${ellipsised.length} texte(s) tronqués avec « … » (à vérifier)`,
      samples: ellipsised.slice(0, 4),
    });
  }

  // 8. Cibles tactiles superposées : deux liens ou boutons qui se recouvrent
  //    rendent l'un des deux inatteignable. On compare les **rectangles de
  //    ligne** (`getClientRects`) et non la boîte globale : un lien en ligne
  //    qui passe à la ligne a sinon une boîte qui englobe toute la colonne et
  //    ferait passer à tort les liens voisins pour superposés.
  const targets = [...document.querySelectorAll("a[href], button, input, select, textarea")]
    .filter((element) => isReallyVisible(element) && element.getBoundingClientRect().width > 2)
    .map((element) => ({ element, rects: [...element.getClientRects()] }))
    .filter((entry) => entry.rects.length > 0);
  const overlapping = [];
  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      if (
        targets[i].element.contains(targets[j].element) ||
        targets[j].element.contains(targets[i].element)
      ) {
        continue;
      }
      let worst = 0;
      for (const a of targets[i].rects) {
        for (const b of targets[j].rects) {
          const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (width <= 2 || height <= 2) continue;
          worst = Math.max(worst, (width * height) / Math.min(a.width * a.height, b.width * b.height));
        }
      }
      if (worst > 0.4) {
        overlapping.push(`${describe(targets[i].element)} ⟷ ${describe(targets[j].element)}`);
      }
    }
  }
  if (overlapping.length > 0) {
    problems.push({
      level: "bloquant",
      kind: "cibles-superposees",
      detail: `${overlapping.length} paire(s) de contrôles qui se recouvrent`,
      samples: overlapping.slice(0, 4),
    });
  }

  // 9. Saut de mise en page : on compare la hauteur du contenu avant et après
  //    le chargement de toutes les images et des polices différées.
  if (window.__layoutBaseline) {
    const baseline = window.__layoutBaseline;
    const drift = Math.abs(document.body.scrollHeight - baseline.bodyHeight);
    if (drift > 4) {
      problems.push({
        level: "avertissement",
        kind: "saut-de-mise-en-page",
        detail: `la page gagne ${drift} px de hauteur après chargement des images (${baseline.bodyHeight} → ${document.body.scrollHeight} px)`,
        samples: [describe(document.querySelector("main") ?? document.body)],
      });
    }
  } else {
    window.__layoutBaseline = { bodyHeight: document.body.scrollHeight };
  }

  return { problems, viewportWidth, documentWidth, title };
}

// ---------------------------------------------------------------------------
// Parcours
// ---------------------------------------------------------------------------

/** Messages de console relevés pendant la navigation courante. */
const consoleMessages = [];

async function audit(target, devtools, viewport) {
  await devtools.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  });
  consoleMessages.length = 0;
  const url = /^https?:\/\//.test(target) ? target : `${BASE_URL}${target}`;
  if (process.env.DEBUG_CDP) console.log("  → navigation", JSON.stringify(url));
  await devtools.send("Page.navigate", { url });
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // **Le serveur répond-il vraiment ?** Sans cette vérification, une page
  // d'erreur de Chrome (site injoignable, build manquant) est auditée comme
  // une page vide : aucun élément à sermonder, donc aucun défaut, donc
  // « aucun probleme » — l'audit validait un site mort. C'est arrivé
  // reellement ici, et le faux vert a coûté une verification complete.
  const chargement = await devtools.send("Runtime.evaluate", {
    expression: `JSON.stringify({ titre: document.title, url: location.href, noeuds: document.body ? document.body.innerHTML.length : 0 })`,
    returnByValue: true,
  });
  const etat = JSON.parse(chargement.result?.value ?? "{}");
  if (!etat.noeuds) {
    return {
      documentWidth: 0,
      problems: [
        {
          kind: "site injoignable",
          level: "bloquant",
          detail:
            `aucun contenu servi pour ${target} — le serveur est-il demarre ? le build est-il present ? le port est-il correct ?`,
        },
      ],
    };
  }
  if (etat.url !== url && !etat.url.startsWith(BASE_URL)) {
    return {
      documentWidth: 0,
      problems: [
        {
          kind: "redirection inattendue",
          level: "bloquant",
          detail: `${target} a redirige vers ${etat.url}`,
        },
      ],
    };
  }

  const options = JSON.stringify({
    minFontSize: MIN_FONT_SIZE,
    minTapTarget: MIN_TAP_TARGET,
    comfortTapTarget: COMFORT_TAP_TARGET,
    emulatedWidth: viewport.width,
    emulatedHeight: viewport.height,
  });

  // Première passe : on enregistre la hauteur de la page, puis on force le
  // chargement de toutes les images et des polices. La seconde passe (ci-dessous)
  // compare les deux hauteurs : un écart signale un saut de mise en page.
  await devtools.send("Runtime.evaluate", {
    expression: `(async () => {
      ${auditPage.toString()}
      (${auditPage.toString()})(${options});
      const images = [...document.querySelectorAll("img")];
      for (const image of images) image.loading = "eager";
      await Promise.all([
        document.fonts ? document.fonts.ready : Promise.resolve(),
        ...images.map((image) =>
          image.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                image.addEventListener("load", resolve, { once: true });
                image.addEventListener("error", resolve, { once: true });
              }),
        ),
      ]);
    })()`,
    awaitPromise: true,
  });
  await new Promise((resolve) => setTimeout(resolve, 400));

  const expression = `(${auditPage.toString()})(${options})`;
  const result = await devtools.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: false,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? "Erreur d'évaluation");
  }
  const report = result.result.value;

  // Erreurs et avertissements de la console : c'est là que se manifestent les
  // bugs d'hydratation React, invisibles dans le rendu mais très pénibles.
  const noisy = consoleMessages.filter(
    (message) =>
      !/favicon|manifest\.webmanifest|net::ERR_|Failed to load resource/i.test(message),
  );
  if (noisy.length > 0) {
    report.problems.push({
      level: /hydrat|did not match|Minified React error #(418|421|423|425)/i.test(noisy.join(" "))
        ? "bloquant"
        : "avertissement",
      kind: "console",
      detail: `${noisy.length} message(s) d'erreur ou d'avertissement dans la console`,
      samples: noisy.slice(0, 4),
    });
  }

  return report;
}

const pages = process.argv.slice(2).filter((argument) => !argument.startsWith("-"));
// Sur Windows, Git Bash réécrit un chemin commençant par « / » : on accepte
// donc aussi des chemins sans barre initiale, séparés par des virgules.
const envPages = process.env.PAGES ? process.env.PAGES.split(/[,\s]+/).filter(Boolean) : [];
const requested = envPages.length > 0 ? envPages : pages;
const pagesToAudit =
  requested.length > 0
    ? requested.map((entry) =>
        /^https?:\/\//.test(entry) ? entry : `/${entry.replace(/^\/+/, "")}`,
      )
    : DEFAULT_PAGES;

let failures = 0;
let socket;
try {
  await waitForDebugger();
  const response = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" });
  const target = await response.json();
  socket = await openSocket(target.webSocketDebuggerUrl);
  const devtools = new DevTools(socket);
  await devtools.send("Page.enable");
  await devtools.send("Runtime.enable");
  await devtools.send("Network.enable");
  await devtools.send("Log.enable");

  // Console du navigateur : le canal de détection des erreurs d'hydratation.
  devtools.on("Runtime.consoleAPICalled", (params) => {
    if (params.type !== "error" && params.type !== "warning") return;
    const text = (params.args ?? [])
      .map((arg) => arg.value ?? arg.description ?? arg.unserializableValue ?? "")
      .join(" ")
      .trim();
    if (text) consoleMessages.push(`[console.${params.type}] ${text.slice(0, 300)}`);
  });
  devtools.on("Runtime.exceptionThrown", (params) => {
    const details = params.exceptionDetails;
    const text = details?.exception?.description ?? details?.text ?? "";
    if (text) consoleMessages.push(`[exception] ${String(text).slice(0, 300)}`);
  });
  devtools.on("Log.entryAdded", (params) => {
    const entry = params.entry;
    if (entry.level !== "error" && entry.level !== "warning") return;
    const text = entry.text ?? "";
    if (text) consoleMessages.push(`[log.${entry.level}] ${text.slice(0, 300)}`);
  });
  if (COOKIE) {
    const [name, ...rest] = COOKIE.split("=");
    await devtools.send("Network.setCookie", {
      name,
      value: rest.join("="),
      domain: "localhost",
      path: "/",
    });
  }

  // Le thème est mémorisé dans localStorage : on se place d'abord sur le site
  // pour disposer d'une origine, puis on force la valeur avant le moindre audit.
  if (THEME === "light" || THEME === "dark") {
    await devtools.send("Page.navigate", { url: `${BASE_URL}/` });
    await new Promise((resolve) => setTimeout(resolve, 800));
    await devtools.send("Runtime.evaluate", {
      expression: `localStorage.setItem("gratianopolis-theme", ${JSON.stringify(THEME)})`,
    });
    console.log(`Thème audité : ${THEME}\n`);
  }

  for (const page of pagesToAudit) {
    for (const viewport of VIEWPORTS) {
      const report = await audit(page, devtools, viewport);
      const blocking = report.problems.filter((problem) => problem.level === "bloquant");
      const warnings = report.problems.filter((problem) => problem.level === "avertissement");
      if (blocking.length > 0) failures++;

      const status = blocking.length > 0 ? "FAIL" : warnings.length > 0 ? "WARN" : "OK  ";
      console.log(
        `${status} [${viewport.name}] ${page} — ${report.documentWidth}/${viewport.width} px`,
      );
      for (const problem of [...blocking, ...warnings]) {
        console.log(`       ${problem.level === "bloquant" ? "✗" : "!"} ${problem.kind} : ${problem.detail}`);
        for (const sample of problem.samples ?? []) console.log(`         · ${sample}`);
      }
    }
  }

  socket?.close();
} catch (error) {
  failures++;
  console.error(`Audit interrompu : ${error.message}`);
} finally {
  // Le profile temporaire est souvent encore verrouillé par le navigateur :
  // on ferme d'abord, puis on tente le nettoyage sans faire échouer l'audit.
  browser.kill();
  await new Promise((resolve) => setTimeout(resolve, 500));
  try {
    rmSync(profileDir, { recursive: true, force: true });
  } catch {
    // fichier temporaire laissé en place : sans conséquence
  }
}

console.log(
  failures === 0
    ? "\nAucun problème bloquant de rendu."
    : `\n${failures} vue(s) avec un problème bloquant.`,
);
process.exit(failures === 0 ? 0 : 1);
