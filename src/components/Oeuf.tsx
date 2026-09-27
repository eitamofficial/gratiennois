"use client";

/**
 * L'écouteur de l'œuf.
 *
 * Il écoute **toute** la page et reste complètement muet tant que rien n'a été
 * trouvé : aucune mention, aucun indice, aucun bruit. C'est volontairement le
 * cas, car un easter egg qui se signale n'en est plus un.
 *
 * Deux précautions conditionnent son fonctionnement.
 *
 * La première est l'admin. Un composant monté globalement continue de recevoir
 * les frappes pendant qu'un rédacteur écrit un article, et l'easter egg
 * s'approprierait alors la saisie la plus importante du site. Tout ce qui
 * ressemble à un champ de saisie est donc laissé de côté.
 *
 * La seconde est la charge. L'écouteur ne fait rien de visible, mais il ne doit
 * rien coûter non plus : un seul gestionnaire sur le document, une chaîne de
 * caractères courte, et le travail s'arrête dès qu'il a trouvé.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CODE_KONAMI,
  DELAI_LECTURE_MS,
  decrireTouche,
  detecterKonami,
  detecterOeuf,
  detecterMotSecret,
  normaliserSaisie,
  noterDecouverte,
  ouvrirLaPorte,
} from "@/lib/oeuf";

/** La page secrète, une fois la porte ouverte. */
export const ROUTE_OEUF = "/la-loba";

function estChampDeSaisie(cible: EventTarget | null): boolean {
  if (!(cible instanceof HTMLElement)) return false;
  if (cible.isContentEditable) return true;
  const nom = cible.tagName;
  return nom === "INPUT" || nom === "TEXTAREA" || nom === "SELECT";
}

/**
 * On ne garde que les lettres, les chiffres et les espaces.
 *
 * Sans cela, le mot attendu dépendrait de la disposition du clavier : sur un
 * clavier allemand, la touche Z produit Y, et le mot serait refusé alors que
 * le visiteur a bien frappé ce qu'il fallait.
 */
function normaliser(cle: string): string {
  return normaliserSaisie(cle);
}

/** Combien de touches sont conservées : la plus longue suite en demande neuf. */
const PROFONDEUR = 12;

export default function Oeuf() {
  const router = useRouter();
  const tampon = useRef("");
  const brut = useRef("");
  const konami = useRef<string[]>([]);
  const suite = useRef<string[]>([]);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    /** Une frappe annule la précédente si le visiteur s'est arrêté un moment. */
    const onFrappe = (evenement: KeyboardEvent) => {
      if (evenement.metaKey || evenement.ctrlKey || evenement.altKey) return;
      if (estChampDeSaisie(evenement.target)) return;

      const touche = evenement.key;

      // Konami : la suite est comparée sur la fin de l'historique.
      konami.current = [...konami.current, touche].slice(-CODE_KONAMI.length);
      if (detecterKonami(konami.current)) {
        ouvrirLaPorte();
        konami.current = [];
        tampon.current = "";
        brut.current = "";
        router.push(ROUTE_OEUF);
        return;
      }

      // Seules les touches qui produisent un caractère comptent pour le mot
      // secret : les flèches et les modificateurs ont déjà été écartés.
      if (touche.length !== 1) return;

      if (minuterie.current) clearTimeout(minuterie.current);
      minuterie.current = setTimeout(() => {
        tampon.current = "";
      }, DELAI_LECTURE_MS);

      // Deux tampons sont tenus en parallèle : l'un passe au propre pour
      // comparer les mots latins, l'autre garde la frappe telle quelle, car la
      // normalisation efface tout ce qui n'est pas une lettre anglaise.
      tampon.current = (tampon.current + normaliser(touche)).slice(-40);
      brut.current = (brut.current + touche.toLowerCase()).slice(-40);
      suite.current = [...suite.current, decrireTouche(evenement)].slice(-PROFONDEUR);

      // D'abord les quinze, qui sont plus spécifiques : leurs verrous sont des
      // suites de touches, là où ceux de la cache principale sont des mots.
      const trouve = detecterOeuf({
        normalise: tampon.current,
        brut: brut.current,
        touches: suite.current,
      });
      if (trouve) {
        noterDecouverte(trouve.id);
        ouvrirLaPorte();
        tampon.current = "";
        brut.current = "";
        suite.current = [];
        router.push(`${ROUTE_OEUF}/${trouve.id}`);
        return;
      }

      if (!detecterMotSecret(tampon.current)) return;

      ouvrirLaPorte();
      tampon.current = "";
      brut.current = "";
      suite.current = [];
      router.push(ROUTE_OEUF);
    };

    // Marqueur de disponibilité. Il ne sert qu'a savoir, depuis l'extérieur,
    // que l'écouteur est vivant : sans lui, un essai automatisé qui frappe
    // avant la fin de l'hydratation conclut à tort que l'œuf est cassé.
    document.documentElement.dataset.oeuf = "monte";

    document.addEventListener("keydown", onFrappe);
    return () => {
      document.removeEventListener("keydown", onFrappe);
      if (minuterie.current) clearTimeout(minuterie.current);
      delete document.documentElement.dataset.oeuf;
    };
  }, [router]);

  // Le composant ne rend rien. Il n'a pas à exister dans le DOM.
  return null;
}
