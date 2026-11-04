/**
 * Stockage du bot.
 *
 * Un seul fichier JSON, écrit de façon atomique (fichier temporaire puis
 * renommage) : une coupure en pleine écriture ne peut donc pas laisser un
 * fichier à moitié écrit. C'est volontairement modeste — les données d'un bot
 * Discord sont de quelques milliers de lignes au plus — et cela évite toute
 * dépendance native à compiler.
 *
 * Les écritures sont **groupées** : mille messages dans la minute ne doivent
 * pas produire mille écritures disque. On marque le fichier comme à sauver, et
 * une écriture est programmée une seconde plus tard.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { journal } from "./logger.js";

const STRUCTURE = {
  serveurs: {},
  membres: {},
  avertissements: [],
  liens: {},
  signalements: [],
  alertes: [],
  verrous: {},
  epingles: {},
};

/** Monnaie du Delphinat, telle que la boutique la nomme. */
export const DEVISE = "ducat";

/** Ce que gagne un membre qui travaille, et à quelle fréquence. */
export const TRAVAIL = { montant: 25, delai: 4 * 3_600_000 };

/** Prime quotidienne. */
export const PRIME = { montant: 100, delai: 22 * 3_600_000 };

/** Au-delà de trois sanctions actives, le bot alerte : c'est un signal, pas une décision. */
export const SEUIL_ESCALADE = 3;

/** Valeurs par défaut d'un serveur, fusionnées à la lecture. */
export const SERVEUR_PAR_DEFAUT = {
  journal: null,
  /** Salon où le bot dépose ses alertes (escalades, verrouillages). */
  alertes: null,
  bienvenue: { salon: null, message: null },
  depart: { salon: null, message: null },
  autorole: null,
  niveaux: { actif: true, annonce: null, recompenses: [] },
  /** Rôle de sourdine : sans lui, `/sourdine` ne peut pas s'appliquer. */
  roleSilence: null,
  /** Rôle attribué à l'achat de « Membre vérifié ». */
  roleVerifie: null,
};

export class Stockage {
  constructor(chemin) {
    this.chemin = chemin;
    this.sauvegardeProgrammee = null;
    this.donnees = this.#lire();
  }

  #lire() {
    try {
      if (existsSync(this.chemin)) {
        const brut = JSON.parse(readFileSync(this.chemin, "utf8"));
        return { ...STRUCTURE, ...brut };
      }
    } catch (erreur) {
      // Un fichier corrompu ne doit pas empêcher le bot de démarrer : on
      // repart de zéro, et on le dit clairement.
      journal.error(`Stockage illisible (${this.chemin}) : ${erreur.message}`);
      const sauvegarde = `${this.chemin}.corrompu-${Date.now()}`;
      try {
        renameSync(this.chemin, sauvegarde);
        journal.warn(`Ancien fichier conservé sous ${sauvegarde}.`);
      } catch {
        // Peu importe : on continue avec des données vides.
      }
    }
    return structuredClone(STRUCTURE);
  }

  /** Programme une écriture, sans bloquer l'appelant. */
  sauvegarder() {
    if (this.sauvegardeProgrammee) return;
    this.sauvegardeProgrammee = setTimeout(() => {
      this.sauvegardeProgrammee = null;
      this.ecrireMaintenant();
    }, 1000);
    this.sauvegardeProgrammee.unref?.();
  }

  /** Écrit tout de suite : à utiliser avant un arrêt. */
  ecrireMaintenant() {
    try {
      mkdirSync(dirname(this.chemin), { recursive: true });
      const temporaire = `${this.chemin}.tmp`;
      writeFileSync(temporaire, JSON.stringify(this.donnees, null, 2), "utf8");
      renameSync(temporaire, this.chemin);
    } catch (erreur) {
      journal.error(`Écriture du stockage impossible : ${erreur.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // Serveurs
  // -------------------------------------------------------------------------

  /** Réglages d'un serveur, complétés par les valeurs par défaut. */
  serveur(serveurId) {
    if (!this.donnees.serveurs[serveurId]) this.donnees.serveurs[serveurId] = {};
    const brut = this.donnees.serveurs[serveurId];
    const fusion = { ...structuredClone(SERVEUR_PAR_DEFAUT), ...brut };
    fusion.bienvenue = { ...SERVEUR_PAR_DEFAUT.bienvenue, ...(brut.bienvenue ?? {}) };
    fusion.depart = { ...SERVEUR_PAR_DEFAUT.depart, ...(brut.depart ?? {}) };
    fusion.niveaux = { ...SERVEUR_PAR_DEFAUT.niveaux, ...(brut.niveaux ?? {}) };
    return fusion;
  }

  /** Enregistre un réglage de serveur. */
  regler(serveurId, modification) {
    const actuel = this.donnees.serveurs[serveurId] ?? {};
    this.donnees.serveurs[serveurId] = { ...actuel, ...modification };
    this.sauvegarder();
    return this.serveur(serveurId);
  }

  // -------------------------------------------------------------------------
  // Niveaux
  // -------------------------------------------------------------------------

  /** Fiche d'un membre, créée à la première visite. */
  membre(serveurId, membreId) {
    if (!this.donnees.membres[serveurId]) this.donnees.membres[serveurId] = {};
    if (!this.donnees.membres[serveurId][membreId]) {
      this.donnees.membres[serveurId][membreId] = {
        xp: 0,
        niveau: 0,
        messages: 0,
        derniereXp: 0,
        ducats: 0,
        epargne: 0,
        dernierTravail: 0,
        dernierePrime: 0,
      };
    }
    const fiche = this.donnees.membres[serveurId][membreId];
    // Les fiches écrites par une version antérieure n'ont pas les champs
    // d'économie : on les complète à la lecture plutôt que d'imposer une
    // migration.
    if (typeof fiche.ducats !== "number") fiche.ducats = 0;
    if (typeof fiche.epargne !== "number") fiche.epargne = 0;
    if (typeof fiche.dernierTravail !== "number") fiche.dernierTravail = 0;
    if (typeof fiche.dernierePrime !== "number") fiche.dernierePrime = 0;
    return fiche;
  }

  // -------------------------------------------------------------------------
  // Économie (ducats)
  // -------------------------------------------------------------------------

  /** Crédite un membre, en poche ou à l'épargne. Renvoie la fiche à jour. */
  crediter(serveurId, membreId, montant, { epargne = false } = {}) {
    const fiche = this.membre(serveurId, membreId);
    const champ = epargne ? "epargne" : "ducats";
    fiche[champ] = Math.max(0, fiche[champ] + Math.round(montant));
    this.enregistrerMembre(serveurId, membreId, fiche);
    return fiche;
  }

  /**
   * Débite un membre de sa poche. Renvoie `null` si le solde est insuffisant :
   * le refus est explicite plutôt qu'un solde négatif silencieux.
   */
  debiter(serveurId, membreId, montant) {
    const fiche = this.membre(serveurId, membreId);
    const somme = Math.round(montant);
    if (fiche.ducats < somme) return null;
    fiche.ducats -= somme;
    this.enregistrerMembre(serveurId, membreId, fiche);
    return fiche;
  }

  /** Classement des fortunes : poche plus épargne. */
  classementDucats(serveurId, limite = 10) {
    return Object.entries(this.donnees.membres[serveurId] ?? {})
      .map(([membreId, fiche]) => ({
        membreId,
        total: (fiche.ducats ?? 0) + (fiche.epargne ?? 0),
        ducats: fiche.ducats ?? 0,
        epargne: fiche.epargne ?? 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limite);
  }

  /** Enregistre la fiche d'un membre. */
  enregistrerMembre(serveurId, membreId, fiche) {
    if (!this.donnees.membres[serveurId]) this.donnees.membres[serveurId] = {};
    this.donnees.membres[serveurId][membreId] = fiche;
    this.sauvegarder();
    return fiche;
  }

  /** Tous les membres d'un serveur, du plus haut niveau au plus bas. */
  classement(serveurId, limite = 10) {
    const table = this.donnees.membres[serveurId] ?? {};
    return Object.entries(table)
      .map(([membreId, fiche]) => ({ membreId, ...fiche }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limite);
  }

  /** Rang d'un membre dans le classement du serveur (1 pour le premier). */
  rang(serveurId, membreId) {
    const table = this.donnees.membres[serveurId] ?? {};
    const ordonne = Object.entries(table)
      .map(([id, fiche]) => ({ id, xp: fiche.xp ?? 0 }))
      .sort((a, b) => b.xp - a.xp);
    const index = ordonne.findIndex((element) => element.id === membreId);
    return { position: index >= 0 ? index + 1 : ordonne.length + 1, total: ordonne.length };
  }

  // -------------------------------------------------------------------------
  // Avertissements
  // -------------------------------------------------------------------------

  /** Ajoute un avertissement et renvoie sa fiche. */
  avertir(serveurId, membreId, auteurId, raison) {
    const fiche = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      serveurId,
      membreId,
      auteurId,
      raison,
      date: Date.now(),
    };
    this.donnees.avertissements.push(fiche);
    this.sauvegarder();
    return fiche;
  }

  /** Avertissements d'un membre, du plus récent au plus ancien. */
  avertissements(serveurId, membreId) {
    return this.donnees.avertissements
      .filter((element) => element.serveurId === serveurId && element.membreId === membreId)
      .sort((a, b) => b.date - a.date);
  }

  /** Retire un avertissement par son identifiant. */
  retirerAvertissement(serveurId, id) {
    const index = this.donnees.avertissements.findIndex(
      (element) => element.serveurId === serveurId && element.id === id,
    );
    if (index < 0) return null;
    const [retire] = this.donnees.avertissements.splice(index, 1);
    this.sauvegarder();
    return retire;
  }

  // -------------------------------------------------------------------------
  // Signalements et alertes
  // -------------------------------------------------------------------------

  /** Ouvre un signalement. Le numéro est propre au serveur et croissant. */
  signaler(serveurId, auteurId, cibleId, motif) {
    const existants = this.donnees.signalements.filter((element) => element.serveurId === serveurId);
    const numero = existants.reduce((maximum, element) => Math.max(maximum, element.numero), 0) + 1;
    const fiche = {
      numero,
      serveurId,
      auteurId,
      cibleId,
      motif,
      statut: "ouvert",
      date: Date.now(),
      traitePar: null,
      dateTraitement: null,
    };
    this.donnees.signalements.push(fiche);
    this.sauvegarder();
    return fiche;
  }

  /** Signalements d'un serveur, du plus récent au plus ancien. */
  signalements(serveurId, statut = null) {
    return this.donnees.signalements
      .filter((element) => element.serveurId === serveurId)
      .filter((element) => !statut || element.statut === statut)
      .sort((a, b) => b.numero - a.numero);
  }

  /** Clôt un signalement : `resolu` ou `rejete`. */
  resoudreSignalement(serveurId, numero, statut, parId) {
    const fiche = this.donnees.signalements.find(
      (element) => element.serveurId === serveurId && element.numero === numero,
    );
    if (!fiche) return null;
    if (fiche.statut !== "ouvert") return fiche;

    fiche.statut = statut;
    fiche.traitePar = parId;
    fiche.dateTraitement = Date.now();
    this.sauvegarder();
    return fiche;
  }

  /** Note une alerte, en la gardant courte : un journal, pas une archive. */
  alerter(serveurId, type, message, { cibleId = null } = {}) {
    const fiche = { serveurId, type, message, cibleId, date: Date.now(), levee: false };
    this.donnees.alertes.push(fiche);
    // On ne conserve que les 200 dernières par serveur : au-delà, ce n'est
    // plus un tableau de bord mais un fichier mort.
    const duServeur = this.donnees.alertes.filter((element) => element.serveurId === serveurId);
    if (duServeur.length > 200) {
      const aRetirer = new Set(duServeur.slice(0, duServeur.length - 200));
      this.donnees.alertes = this.donnees.alertes.filter((element) => !aRetirer.has(element));
    }
    this.sauvegarder();
    return fiche;
  }

  /** Alertes d'un serveur, la plus récente d'abord. */
  alertes(serveurId, limite = 15) {
    return this.donnees.alertes
      .filter((element) => element.serveurId === serveurId)
      .sort((a, b) => b.date - a.date)
      .slice(0, limite);
  }

  // -------------------------------------------------------------------------
  // Verrouillage de salons
  // -------------------------------------------------------------------------

  /** Note qu'un salon est verrouillé, avec sa raison. */
  verrouiller(serveurId, salonId, raison, parId) {
    this.donnees.verrous[`${serveurId}:${salonId}`] = { raison, parId, date: Date.now() };
    this.sauvegarder();
    return this.donnees.verrous[`${serveurId}:${salonId}`];
  }

  /** Le verrou d'un salon, ou `null`. */
  verrou(serveurId, salonId) {
    return this.donnees.verrous[`${serveurId}:${salonId}`] ?? null;
  }

  /** Retire le verrou d'un salon. Renvoie la fiche retirée. */
  deverrouiller(serveurId, salonId) {
    const cle = `${serveurId}:${salonId}`;
    const fiche = this.donnees.verrous[cle] ?? null;
    delete this.donnees.verrous[cle];
    this.sauvegarder();
    return fiche;
  }

  /** Salons verrouillés d'un serveur. */
  verrous(serveurId) {
    return Object.entries(this.donnees.verrous)
      .filter(([cle]) => cle.startsWith(`${serveurId}:`))
      .map(([cle, fiche]) => ({ salonId: cle.split(":")[1], ...fiche }));
  }

  // -------------------------------------------------------------------------
  // Épingles achetées
  // -------------------------------------------------------------------------

  /** Arme une attente d'épingle : le prochain message de l'acheteur la déclenche. */
  attendreEpingle(serveurId, membreId, salonId) {
    this.donnees.epingles[`${serveurId}:${membreId}`] = { salonId, date: Date.now() };
    this.sauvegarder();
  }

  /** L'attente d'épingle en cours, ou `null`. */
  epingleEnAttente(serveurId, membreId) {
    return this.donnees.epingles[`${serveurId}:${membreId}`] ?? null;
  }

  /** Consomme l'attente d'épingle. */
  oublierEpingle(serveurId, membreId) {
    delete this.donnees.epingles[`${serveurId}:${membreId}`];
    this.sauvegarder();
  }

  // -------------------------------------------------------------------------
  // Liens wiki
  // -------------------------------------------------------------------------

  /** Mémorise le dernier rattachement connu d'un membre au wiki. */
  noterLien(serveurId, membreId, slugs) {
    this.donnees.liens[`${serveurId}:${membreId}`] = { slugs, date: Date.now() };
    this.sauvegarder();
  }

  /** Dernier rattachement connu d'un membre. */
  lien(serveurId, membreId) {
    return this.donnees.liens[`${serveurId}:${membreId}`] ?? null;
  }
}

/** Ouvre le stockage du bot. */
export function ouvrirStockage(racine) {
  return new Stockage(join(racine, "data", "delphinabot.json"));
}
