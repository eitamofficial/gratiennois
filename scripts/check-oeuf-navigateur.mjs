/**
 * Épreuve de l'œuf dans un vrai navigateur.
 *
 * L'épreuve `check-oeuf.mjs` éprouve la logique seule. Celle-ci éprouve la
 * chaîne complète : un composant monté dans le layout, un vrai événement clavier
 * sur `document`, un `localStorage`, une navigation, et une page qui ne montre
 * son contenu qu'après ouverture.
 *
 * C'est le seul moyen de savoir si l'œuf fonctionne *réellement*. Une logique
 * correcte dans un composant non monté ne sert à rien.
 *
 *   node scripts/check-oeuf-navigateur.mjs
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PORT = 9333;

const NAVIGATEURS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

const navigateur = NAVIGATEURS.find((c) => existsSync(c));
if (!navigateur) {
  console.log("Aucun navigateur trouvé. Épreuve de l'œuf ignorée.");
  process.exit(0);
}

let echecs = 0;
const verifie = (nom, obtenu, attendu) => {
  const ok = JSON.stringify(obtenu) === JSON.stringify(attendu);
  if (ok) console.log(`OK     ${nom}`);
  else {
    echecs += 1;
    console.log(
      `ECHEC  ${nom}\n         attendu : ${JSON.stringify(attendu)}\n         obtenu  : ${JSON.stringify(obtenu)}`,
    );
  }
};

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Attend que le navigateur réponde, en interrogeant son port HTTP.
 *
 * Lire la ligne « DevTools listening » dans la sortie du processus paraît plus
 * simple, mais cette sortie n'est pas toujours capturée. Interroger le port est
 * plus lent d'une requête et nettement plus sûr.
 */
async function attendreNavigateur() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const r = await fetch(`http://localhost:${PORT}/json/version`);
      if (r.ok) return await r.json();
    } catch {
      // Le navigateur n'écoute pas encore.
    }
    await pause(150);
  }
  throw new Error("Le navigateur n'a pas ouvert son port de débogage.");
}

/**
 * Ouvre un onglet neuf et renvoie son adresse de connexion.
 *
 * Edge expose au démarrage des pages d'arrière-plan, mais aucun onglet : on doit
 * donc en créer un explicitement, faute de quoi il n'y a rien à piloter.
 */
async function nouvelOnglet() {
  const r = await fetch(`http://localhost:${PORT}/json/new?url=about:blank`, {
    method: "PUT",
  });
  if (!r.ok) throw new Error("Impossible d'ouvrir un onglet de contrôle.");
  return r.json();
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.attentes = new Map();
    this.evenements = new Map();
    socket.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.attentes.has(m.id)) {
        const { resoudre, rejeter } = this.attentes.get(m.id);
        this.attentes.delete(m.id);
        if (m.error) rejeter(new Error(m.error.message));
        else resoudre(m.result);
        return;
      }
      if (m.method) (this.evenements.get(m.method) ?? []).forEach((f) => f(m.params));
    });
  }
  sur(method, fn) {
    const l = this.evenements.get(method) ?? [];
    l.push(fn);
    this.evenements.set(method, l);
  }
  envoyer(method, params = {}) {
    const id = ++this.id;
    return new Promise((resoudre, rejeter) => {
      this.attentes.set(id, { resoudre, rejeter });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluer(expression) {
    const r = await this.envoyer("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description ?? "erreur de page");
    }
    return r.result.value;
  }
}

const profil = mkdtempSync(path.join(tmpdir(), "oeuf-"));
const processus = spawn(
  navigateur,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profil}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--window-size=1280,900",
    "about:blank",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);





const nettoyer = async () => {
  try { processus.kill(); } catch { /* déjà arrêté */ }
  // Le navigateur garde ses fichiers ouverts quelques instants après avoir reçu
  // l'ordre d'arrêt : on lui laisse le temps avant de supprimer le profil.
  await pause(1200);
  try { rmSync(profil, { recursive: true, force: true }); } catch { /* encore occupé */ }
};

try {
  await attendreNavigateur();
  const onglet = await nouvelOnglet();
  const socket = new WebSocket(onglet.webSocketDebuggerUrl);
  await new Promise((r) => socket.addEventListener("open", r, { once: true }));
  const cdp = new Cdp(socket);

  // Charger une page, puis attendre que l'hydratation soit finie.
  //
  // L'attente est indispensable : l'ecouteur n'existe qu'apres l'hydratation,
  // et frapper avant reviendrait a conclure que l'œuf est casse alors que la
  // page n'est simplement pas prete. On interroge le marqueur pose par le
  // composant plutot que de compter sur un delai fixe, qui depend de la
  // charge de la machine.
  const charge = async (url) => {
    const fini = new Promise((r) => cdp.sur("Page.loadEventFired", r));
    await cdp.envoyer("Page.navigate", { url });
    await fini;
    for (let i = 0; i < 100; i += 1) {
      if (await cdp.evaluer('document.documentElement.dataset.oeuf === "monte"')) return;
      await pause(100);
    }
    throw new Error(`L'hydratation n'a pas abouti sur ${url}`);
  };

  // Une lettre se tape lettre par lettre ; un tiret ne sert qu'a separer deux
  // touches dans une suite, et ne doit jamais etre frappe lui-meme.
  const taper = (suite) =>
    cdp.evaluer(`(() => {
      const touches = ${JSON.stringify(suite)}.includes("-")
        ? ${JSON.stringify(suite)}.split("-")
        : [...${JSON.stringify(suite)}];
      for (const c of touches) {
        // Une majuscule ou un chiffre doit être annoncé avec son modificateur,
        // sinon la suite de touches ne correspond jamais a ce qui est attendu.
        const majuscule = c.length === 1 && /[A-Z0-9!@#$%^&*()]/.test(c);
        document.dispatchEvent(new KeyboardEvent("keydown", {
          key: c, shiftKey: majuscule, bubbles: true,
        }));
      }
      return true;
    })()`);

  await cdp.envoyer("Page.enable");
  await cdp.envoyer("Runtime.enable");

  // 1. La porte fermée ne montre rien.
  await charge(`${BASE}/la-loba`);
  verifie(
    "porte fermée : la page se fait passer pour absente",
    await cdp.evaluer("document.body.innerText.includes(\"Cette page n'existe pas\")"),
    true,
  );
  verifie(
    "porte fermée : aucun secret visible",
    await cdp.evaluer(
      "document.body.innerText.includes('Simpsons') || document.body.innerText.includes('pieds nus')",
    ),
    false,
  );

  // 2. Le mot ouvre la porte depuis n'importe quelle page.
  await charge(`${BASE}/`);
  await taper("eshep");
  await pause(900);
  verifie(
    "« eshep » ouvre la cache",
    await cdp.evaluer("location.pathname"),
    "/la-loba",
  );
  verifie(
    "la porte est mémorisée",
    await cdp.evaluer("localStorage.getItem('gratianopolis.oeuf') === '1'"),
    true,
  );
  verifie(
    "le contenu apparaît une fois la porte ouverte",
    await cdp.evaluer("document.body.innerText.includes('Simpsons')"),
    true,
  );

  // 3. Le second niveau, une fois dans la cache.
  const avant = await cdp.evaluer(
    "document.body.innerText.includes('Vous avez tout trouvé')",
  );
  await taper("loba");
  await pause(400);
  const apres = await cdp.evaluer(
    "document.body.innerText.includes('Vous avez tout trouvé')",
  );
  verifie("le second niveau est d'abord fermé", avant, false);
  verifie("« loba » révèle le second niveau", apres, true);

  // 4. Le second niveau ne doit pas rester ouvert d'une page à l'autre.
  await charge(`${BASE}/`);
  await taper("loba");
  await pause(700);
  verifie(
    "le second niveau ne se déclenche pas ailleurs",
    await cdp.evaluer("location.pathname === '/la-loba'"),
    false,
  );

  // 5. Un des quinze s'ouvre par son mot, et compte au decompte.
  await charge(`${BASE}/la-loba/fenix`);
  verifie(
    "un œuf non trouvé montre sa teaser, pas son contenu",
    await cdp.evaluer(
      "document.body.innerText.includes('disque') && !document.body.innerText.includes('oiseau')",
    ),
    true,
  );

  await charge(`${BASE}/`);
  await taper("fenix");
  await pause(900);
  verifie("« fenix » ouvre sa page", await cdp.evaluer("location.pathname"), "/la-loba/fenix");
  verifie(
    "le contenu de l'œuf est affiché",
    await cdp.evaluer("document.body.innerText.includes('oiseau')"),
    true,
  );
  verifie(
    "la découverte est comptée",
    await cdp.evaluer("document.body.innerText.includes('1 sur 15')"),
    true,
  );
  verifie(
    "la découverte est mémorisée",
    await cdp.evaluer("JSON.parse(localStorage.getItem('gratianopolis.oeufs')||'[]').includes('fenix')"),
    true,
  );

  // 6. Un verrou à suite de touches ouvre aussi le bon œuf.
  await charge(`${BASE}/`);
  await taper("b-z-r-p");
  await pause(900);
  verifie("la suite « b z r p » ouvre Bzrp", await cdp.evaluer("location.pathname"), "/la-loba/bzrp");
  verifie(
    "le decompte passe à deux",
    await cdp.evaluer("document.body.innerText.includes('2 sur 15')"),
    true,
  );

  // 7. Le contenu d'un œuf reste caché tant qu'il n'est pas trouvé.
  await charge(`${BASE}/la-loba/monumento`);
  verifie(
    "un œuf jamais trouvé reste fermé",
    await cdp.evaluer("document.body.innerText.includes('Residente')"),
    false,
  );

  // 8. Un identifiant inconnu doit tomber sur la page 404 du site : la route
  // appelle explicitement notFound, et non la porte de l'œuf.
  await charge(`${BASE}/la-loba/inconnu`);
  verifie(
    "un identifiant inconnu tombe sur la 404 du site",
    await cdp.evaluer("document.body.innerText.includes('404')"),
    true,
  );
  verifie(
    "un identifiant inconnu ne montre aucun œuf",
    await cdp.evaluer(
      "document.body.innerText.includes('oiseau') || document.body.innerText.includes('Residente')",
    ),
    false,
  );

} catch (erreur) {
  echecs += 1;
  console.log(`ECHEC  ${erreur.message}`);
} finally {
  await nettoyer();
}

console.log("");
if (echecs > 0) {
  console.log(`✗ ${echecs} échec(s) dans le navigateur.`);
  process.exit(1);
}
console.log("L'œuf s'ouvre et se referme comme prévu dans le navigateur.");
