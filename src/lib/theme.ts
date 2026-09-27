/**
 * Thème clair / sombre.
 *
 * Le thème est une simple classe sur `<html>` : toutes les couleurs du site
 * sont pilotées par des variables CSS (voir `globals.css` et `tailwind.config.ts`).
 *
 * Choix d'implémentation, pour **zéro bug d'hydratation** :
 *   1. le serveur rend toujours `<html class="dark …">` (le thème signature du
 *      Delphinat, et un rendu correct même sans JavaScript) ;
 *   2. un script inline, exécuté dans le `<head>` **avant le premier paint**,
 *      applique le thème mémorisé (ou celui du système) : aucun clignotement ;
 *   3. l'icône du bouton est affichée par CSS (`dark:hidden` / `hidden dark:block`)
 *      et non par un état React : le premier rendu client est donc identique au
 *      premier rendu serveur, quelle que soit la valeur stockée ;
 *   4. `<html suppressHydrationWarning>` car le script modifie sa classe avant
 *      que React n'hydrate — c'est la pratique recommandée par Next.js.
 */
export const THEME_STORAGE_KEY = "gratianopolis-theme";

export type Theme = "light" | "dark";

/** Couleur de la barre d'adresse du navigateur, par thème. */
export const THEME_COLORS: Record<Theme, string> = {
  light: "#f6f3ec",
  dark: "#060b14",
};

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Script inline injecté dans le `<head>`.
 *
 * Il est volontairement autonome (aucun import, aucune closure externe) et
 * entièrement encadré : une erreur de stockage (mode privé, cookies bloqués)
 * ne doit pas empêcher l'affichage du site.
 */
export const THEME_SCRIPT = `(function(){try{
var k=${JSON.stringify(THEME_STORAGE_KEY)};
var s=null;try{s=window.localStorage.getItem(k);}catch(e){}
var sys=(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light";
var t=(s==="light"||s==="dark")?s:sys;
var r=document.documentElement;
r.classList.toggle("dark",t==="dark");
r.style.colorScheme=t;
var m=document.querySelector('meta[name="theme-color"]');
if(m){m.setAttribute("content",t==="dark"?"${THEME_COLORS.dark}":"${THEME_COLORS.light}");}
}catch(e){}})();`;
