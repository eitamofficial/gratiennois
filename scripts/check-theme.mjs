#!/usr/bin/env node
/**
 * Vérification du thème clair / sombre.
 *
 * Pilote Edge en headless (même approche sans dépendance que check-render.mjs)
 * et relève les couleurs **réellement calculées** par le navigateur dans les
 * deux thèmes : on ne se contente pas de « ça ne plante pas », on vérifie que la
 * palette bascule bien et qu'aucune erreur d'hydratation n'apparaît.
 *
 * Usage : node scripts/check-theme.mjs [url]
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const URL_TO_TEST = process.argv[2] ?? `${BASE_URL}/wiki/la-constitution`;
const PORT = Number(process.env.CDP_PORT ?? 9333);

const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

const browserPath = BROWSERS.find((candidate) => existsSync(candidate));
if (!browserPath) {
  console.error("Aucun navigateur (Edge/Chrome) trouvé : vérification impossible.");
  process.exit(2);
}

const profileDir = mkdtempSync(path.join(tmpdir(), "theme-check-"));
const browser = spawn(browserPath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  "about:blank",
]);

async function waitForDebugger(attempts = 60) {
  for (let index = 0; index < attempts; index++) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return;
    } catch {
      /* pas encore prêt */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Le navigateur n'a pas ouvert son port de débogage.");
}

class DevTools {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method) {
        this.events.push(message);
        return;
      }
      const resolver = this.pending.get(message.id);
      if (!resolver) return;
      this.pending.delete(message.id);
      if (message.error) resolver.reject(new Error(message.error.message));
      else resolver.resolve(message.result);
    });
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

/* eslint-disable no-undef */
function sample() {
  const read = (selector, property) => {
    const element = document.querySelector(selector);
    if (!element) return "(élément absent)";
    return getComputedStyle(element).getPropertyValue(property).trim();
  };
  return {
    classeHtml: document.documentElement.className,
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
    fondPage: read("body", "background-color"),
    fondEnTete: read("header", "background-color"),
    couleurTitre: read("h1", "color"),
    couleurTexte: read("main p", "color"),
    fondEncadre: read("table", "color"),
    bordureEncadre: read("nav[aria-label='Sommaire'] div", "border-top-color"),
  };
}

async function measure(theme) {
  await send("Page.navigate", { url: URL_TO_TEST });
  await new Promise((resolve) => setTimeout(resolve, 900));
  await send("Runtime.evaluate", {
    expression: `localStorage.setItem("gratianopolis-theme", ${JSON.stringify(theme)})`,
  });
  devtools.events.length = 0;
  await send("Page.navigate", { url: URL_TO_TEST });
  await new Promise((resolve) => setTimeout(resolve, 1400));
  const result = await send("Runtime.evaluate", {
    expression: `(${sample.toString()})()`,
    returnByValue: true,
  });
  const consoleErrors = devtools.events
    .filter((event) => event.method === "Runtime.consoleAPICalled")
    .map((event) => (event.params.args ?? []).map((arg) => arg.value ?? "").join(" "))
    .filter((text) => /hydrat|did not match|Warning/i.test(text));
  return { ...result.result.value, consoleErrors };
}

let socket;
let devtools;
let send = async () => ({});
try {
  await waitForDebugger();
  const response = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" });
  const target = await response.json();
  socket = await openSocket(target.webSocketDebuggerUrl);
  devtools = new DevTools(socket);
  send = (method, params) => devtools.send(method, params);
  await send("Page.enable");
  await send("Runtime.enable");

  const light = await measure("light");
  const dark = await measure("dark");

  console.log(`URL : ${URL_TO_TEST}\n`);
  for (const [theme, report] of [
    ["clair", light],
    ["sombre", dark],
  ]) {
    console.log(`── Thème ${theme} ──────────────────────────────`);
    for (const [key, value] of Object.entries(report)) {
      if (key === "consoleErrors") continue;
      console.log(`  ${key.padEnd(16)} : ${value}`);
    }
    console.log("");
  }

  const changed = light.fondPage !== dark.fondPage && light.couleurTitre !== dark.couleurTitre;
  const clean = light.consoleErrors.length === 0 && dark.consoleErrors.length === 0;
  console.log(
    changed
      ? "✓ La palette bascule bien entre les deux thèmes."
      : "✗ La palette ne change pas : le thème ne fonctionne pas.",
  );
  console.log(
    clean
      ? "✓ Aucune erreur d'hydratation relevée dans la console."
      : `✗ Erreurs de console : ${[...light.consoleErrors, ...dark.consoleErrors].join(" | ")}`,
  );
  process.exitCode = changed && clean ? 0 : 1;
} catch (error) {
  console.error("Vérification interrompue :", error.message);
  process.exitCode = 1;
} finally {
  browser.kill();
  socket?.close();
  await new Promise((resolve) => setTimeout(resolve, 400));
  try {
    rmSync(profileDir, { recursive: true, force: true });
  } catch {
    /* fichier temporaire restant : sans conséquence */
  }
}
