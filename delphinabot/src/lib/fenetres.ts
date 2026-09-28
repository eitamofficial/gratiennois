/**
 * Fenêtres glissantes et temporisations, en mémoire.
 *
 * Ces compteurs n'ont aucune valeur durable : après un redémarrage, repartir
 * de zéro est correct et sans conséquence. Les mettre en base coûterait un
 * aller-retour par message — c'est-à-dire exactement le chemin critique du
 * bot, celui qui doit rester rapide quand le serveur est plein.
 *
 * Chaque fenêtre est purifiée à la lecture : une entrée de plus de `duree`
 * millisecondes est retirée. Sans cela, la mémoire croît avec le nombre de
 * membres vus depuis le démarrage, ce qui n'est pas un détail sur un bot
 * public.
 */

import { normaliser } from "./texte.js";

interface Fenetre {
  evenements: number[];
}

/** Compteur d'événements sur une durée glissante, par clé. */
export class FenetreGlissante {
  private readonly fenetres = new Map<string, Fenetre>();

  constructor(private readonly dureeParDefaut: number) {}

  /**
   * Enregistre un événement et renvoie combien il y en a dans la fenêtre.
   *
   * Le compte est renvoyé *après* l'ajout : c'est lui qui déclenche
   * l'alerte, il doit donc inclure l'événement courant.
   */
  ajouter(cle: string, duree = this.dureeParDefaut): number {
    const maintenant = Date.now();
    const limite = maintenant - duree;

    let fenetre = this.fenetres.get(cle);
    if (!fenetre) {
      fenetre = { evenements: [] };
      this.fenetres.set(cle, fenetre);
    }

    fenetre.evenements = fenetre.evenements.filter((instant) => instant > limite);
    fenetre.evenements.push(maintenant);
    return fenetre.evenements.length;
  }

  /** Nombre d'événements dans la fenêtre, sans rien ajouter. */
  compter(cle: string, duree = this.dureeParDefaut): number {
    const fenetre = this.fenetres.get(cle);
    if (!fenetre) return 0;
    const limite = Date.now() - duree;
    return fenetre.evenements.filter((instant) => instant > limite).length;
  }

  /** Oublie tout ce qui a été enregistré pour une clé. */
  oublier(cle: string): void {
    this.fenetres.delete(cle);
  }
}

/** Temporisation par membre et par commande. */
export class Temporisations {
  private readonly expires = new Map<string, number>();

  /**
   * Réserve une temporisation.
   *
   * Renvoie `false` si la commande est encore en attente : l'appelant doit
   * alors refuser l'exécution. `restant` sert ensuite à afficher ce qu'il
   * reste à l'utilisateur.
   */
  reserver(cle: string, dureeMs: number): boolean {
    const maintenant = Date.now();
    const limite = this.expires.get(cle);
    if (limite && limite > maintenant) return false;
    this.expires.set(cle, maintenant + dureeMs);
    return true;
  }

  /** Millisecondes restantes avant libération, ou 0. */
  restant(cle: string): number {
    const limite = this.expires.get(cle);
    if (!limite) return 0;
    return Math.max(0, limite - Date.now());
  }

  /** Libère une temporisation, par exemple après un échec. */
  liberer(cle: string): void {
    this.expires.delete(cle);
  }

  /** Purge les entrées expirées. À appeler périodiquement. */
  purger(): void {
    const maintenant = Date.now();
    for (const [cle, limite] of this.expires) {
      if (limite <= maintenant) this.expires.delete(cle);
    }
  }
}

/**
 * Cache des pseudos réservés.
 *
 * Sert à l'usurpation : dès qu'un membre s'attribue un nom proche d'un nom
 * d'administration, le nom est mémorisé, pour être retiré même s'il l'écrit
 * autrement ensuite.
 */
export class NomsReserves {
  private readonly noms = new Set<string>();

  /** Ajoute un nom si un nom proche est déjà connu. Renvoie `true` si retenu. */
  ajouter(nom: string, dejaConnus: readonly string[]): boolean {
    if (dejaConnus.some((connu) => normaliser(connu) === normaliser(nom))) {
      this.noms.add(nom);
      return true;
    }
    return false;
  }

  /** Le nom est-il connu comme réservé ? */
  estReserve(nom: string): boolean {
    return this.noms.has(nom);
  }
}
