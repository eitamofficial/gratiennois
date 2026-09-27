#!/usr/bin/env node
/**
 * Diagnostic ponctuel : affiche les rectangles et les styles d'éléments
 * pointés par l'audit de rendu. Sert à trancher entre un vrai bug de mise en
 * page et un faux positif de l'audit.
 *
 * Usage : node scripts/dump-rects.mjs "/admin/x/modifier" "#infobox-image-alt" "button"
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const COOKIE = process.env.COOKIE ?? "";
const PORT = Number(process.env.CDP_PORT ?? 9444);
const [target, ...selectors] = process.argv.slice(2);

const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const browserPath = BROWSERS.find((candidate) => existsSync(candidate));
if (!browserPath) {
  console.error("Navigateur introuvable.");
  process.exit(2);
}

const profileDir = mkdtempSync(path.join(tmpdir(), "dump-rects-"));
const browser = spawn(browserPath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  "about:blank",
]);

async function waitForDebugger() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return;
    } catch {
      /* pas prêt */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("débogage indisponible");
}

class DevTools {
  constructor(socket) {
    this.socket = socket;
    this.id = 1;
    this.pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const resolver = this.pending.get(message.id);
      if (!resolver) return;
      this.pending.delete(message.id);
      message.error ? resolver.reject(new Error(message.error.message)) : resolver.resolve(message.result);
    });
  }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
}

const openSocket = (url) =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.addEventListener("open", () => resolve(socket));
    socket.addEventListener("error", () => reject(new Error("connexion impossible")));
  });

/* eslint-disable no-undef */
const probe = (selectors) => {
  const out = [];
  for (const selector of selectors) {
    for (const element of document.querySelectorAll(selector)) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      // Chaine d ancetres qui rognent : si un parent coupe, l element peut
      // etre invisible tout en occupant des coordonnees.
      const clippers = [];
      let node = element.parentElement;
      while (node && node !== document.documentElement) {
        const parentStyle = getComputedStyle(node);
        if (
          parentStyle.overflowX !== "visible" ||
          parentStyle.overflowY !== "visible" ||
          parentStyle.display === "none"
        ) {
          clippers.push(
            `${node.tagName.toLowerCase()}.${String(node.className).split(" ").slice(0, 3).join(".")} ` +
              `[overflow ${parentStyle.overflowX}/${parentStyle.overflowY}${parentStyle.display === "none" ? ", display:none" : ""}]`,
          );
        }
        node = node.parentElement;
      }
      out.push({
        selector,
        texte: (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40),
        rect: [rect.left, rect.top, rect.width, rect.height].map(Math.round).join(" / "),
        display: style.display,
        position: style.position,
        zIndex: style.zIndex,
        clip: clippers.slice(0, 3).join("  ⟵  ") || "(aucun)",
        clientRects: [...element.getClientRects()].length,
        naturel: element.tagName === "IMG" ? element.naturalWidth + "x" + element.naturalHeight : "",
        objectFit: style.objectFit,
      });
    }
  }
  return out;
};

let socket;
try {
  await waitForDebugger();
  const response = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" });
  const tab = await response.json();
  socket = await openSocket(tab.webSocketDebuggerUrl);
  const devtools = new DevTools(socket);
  await devtools.send("Page.enable");
  await devtools.send("Runtime.enable");
  if (COOKIE) {
    const [name, ...rest] = COOKIE.split("=");
    await devtools.send("Network.enable");
    await devtools.send("Network.setCookie", { name, value: rest.join("="), domain: "localhost", path: "/" });
  }
  await devtools.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  const full = /^https?:\/\//.test(target)
    ? target
    : `${BASE_URL}/${target.replace(/^\/+/, "")}`;
  await devtools.send("Page.navigate", { url: full });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const result = await devtools.send("Runtime.evaluate", {
    expression: `(${probe.toString()})(${JSON.stringify(selectors)})`,
    returnByValue: true,
  });
  for (const entry of result.result.value ?? []) {
    console.log(`\n${entry.selector} — « ${entry.texte} »`);
    console.log(`   rect (x/y/l/h) : ${entry.rect}`);
    console.log(`   display        : ${entry.display}   position: ${entry.position}   z-index: ${entry.zIndex}`);
    console.log(`   lignes         : ${entry.clientRects}   object-fit: ${entry.objectFit}   naturel: ${entry.naturel}`);
    console.log(`   rogné par      : ${entry.clip}`);
  }
} catch (error) {
  console.error("Échec :", error.message);
  process.exitCode = 1;
} finally {
  browser.kill();
  socket?.close();
  await new Promise((resolve) => setTimeout(resolve, 300));
}
