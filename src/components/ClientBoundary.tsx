"use client";

import { Component, type ReactNode } from "react";

/**
 * Garde-fou d'interface.
 *
 * Un bouton de confort — réglage de lecture, lecteur audio, partage — ne doit
 * jamais pouvoir faire tomber une page entière. Sans cette barrière, une
 * exception dans un `useEffect` déclenche la frontière d'erreur de la route, et
 * le lecteur voit « Le wiki rencontre un problème technique » à la place d'un
 * article intact.
 *
 * En cas d'erreur, le composant disparaît silencieusement : le contenu reste
 * lisible, ce qui est le seul résultat acceptable.
 */
export default class ClientBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { enErreur: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { enErreur: false };
  }

  static getDerivedStateFromError() {
    return { enErreur: true };
  }

  componentDidCatch(error: Error) {
    // Visible dans la console du navigateur, invisible pour le lecteur.
    console.error("[interface] composant désactivé :", error?.message ?? error);
  }

  render() {
    if (this.state.enErreur) return this.props.fallback ?? null;
    return this.props.children;
  }
}
