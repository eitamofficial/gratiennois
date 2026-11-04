#!/usr/bin/env node
/**
 * Chiffrement des sauvegardes.
 *
 * Termux n'installe ni `openssl` ni `gpg` par défaut : plutôt que d'ajouter une
 * dépendance système à une tablette qui doit rester simple, on utilise le
 * chiffrement intégré à Node — déjà présent, puisque c'est lui qui fait tourner
 * le wiki.
 *
 * AES-256-GCM, pas CBC : GCM authentifie le contenu. Une archive CBC modifiée
 * se déchiffre en silence et donne des données corrompues ; une archive GCM
 * modifiée est refusée. Sur une sauvegarde, c'est la différence entre « je
 * restaure » et « je restaure n'importe quoi ».
 *
 *   node chiffrer.mjs chiffrer <clair> <archive> <phrase>
 *   node chiffrer.mjs dechiffrer <archive> <sortie> <phrase>
 *
 * Format : « WIKIBK1 » (7 octets) | sel (16) | iv (12) | chiffré | étiquette (16)
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const MAGIE = Buffer.from("WIKIBK1", "utf8");
const SEL = 16;
const IV = 12;
const ETIQUETTE = 16;
const LONGUEUR_CLE = 32;

function cle(phrase, sel) {
  // scrypt : coûteux à attaquer, et la phrase fait 64 caractères aléatoires.
  return scryptSync(phrase, sel, LONGUEUR_CLE, { N: 16384, r: 8, p: 1 });
}

function chiffrer(source, destination, phrase) {
  const clair = readFileSync(source);
  const sel = randomBytes(SEL);
  const iv = randomBytes(IV);
  const cipher = createCipheriv("aes-256-gcm", cle(phrase, sel), iv);
  const chiffre = Buffer.concat([cipher.update(clair), cipher.final()]);
  const etiquette = cipher.getAuthTag();
  writeFileSync(destination, Buffer.concat([MAGIE, sel, iv, chiffre, etiquette]));
  return clair.length;
}

function dechiffrer(archive, destination, phrase) {
  const contenu = readFileSync(archive);
  if (contenu.subarray(0, 7).toString("utf8") !== MAGIE.toString("utf8")) {
    throw new Error("ce fichier n'est pas une archive du wiki");
  }
  const sel = contenu.subarray(7, 7 + SEL);
  const iv = contenu.subarray(7 + SEL, 7 + SEL + IV);
  const etiquette = contenu.subarray(contenu.length - ETIQUETTE);
  const chiffre = contenu.subarray(7 + SEL + IV, contenu.length - ETIQUETTE);

  const decipher = createDecipheriv("aes-256-gcm", cle(phrase, sel), iv);
  decipher.setAuthTag(etiquette);
  // `final()` lève si le contenu a été modifié : c'est le point de GCM.
  const clair = Buffer.concat([decipher.update(chiffre), decipher.final()]);
  writeFileSync(destination, clair);
  return clair.length;
}

const [mode, entree, sortie, phrase] = process.argv.slice(2);
if (!mode || !entree || !sortie || !phrase) {
  console.error("usage : chiffrer.mjs <chiffrer|dechiffrer> <entree> <sortie> <phrase>");
  process.exit(2);
}

try {
  const octets = mode === "chiffrer"
    ? chiffrer(entree, sortie, phrase)
    : mode === "dechiffrer"
      ? dechiffrer(entree, sortie, phrase)
      : (() => { throw new Error("mode inconnu"); })();
  console.log(`${mode} : ${octets} octets`);
} catch (erreur) {
  console.error(`${mode} impossible : ${erreur?.message ?? erreur}`);
  process.exit(1);
}
