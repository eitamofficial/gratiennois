import type { Config } from "tailwindcss";

/**
 * Les couleurs ne sont jamais codées en dur : elles pointent vers des variables
 * CSS définies dans `src/app/globals.css`, qui changent de valeur selon le thème
 * actif (`.dark` sur `<html>`). Un composant écrit une seule fois
 * `bg-night-800 text-slate-200` et fonctionne dans les deux thèmes.
 *
 * Le format `rgb(var(--x) / <alpha-value>)` conserve la transparence de
 * Tailwind (`bg-night-800/60`, `border-gold-500/40`…).
 */
const themed = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  // La classe `dark` est posée sur <html> par le script de thème (et par le
  // rendu serveur) : c'est elle qui pilote les variantes `dark:`.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Échelle « bleu nuit » : fonds et bordures. En thème clair elle
        // devient une gamme parchemin, en thème sombre le bleu nuit d'origine.
        night: {
          950: themed("--night-950"),
          900: themed("--night-900"),
          800: themed("--night-800"),
          700: themed("--night-700"),
          600: themed("--night-600"),
          500: themed("--night-500"),
          400: themed("--night-400"),
        },
        // Or : titres, accents, liens. En thème clair les tons baissent pour
        // garder un contraste AA sur fond clair.
        gold: {
          100: themed("--gold-100"),
          200: themed("--gold-200"),
          300: themed("--gold-300"),
          400: themed("--gold-400"),
          500: themed("--gold-500"),
          600: themed("--gold-600"),
          700: themed("--gold-700"),
        },
        // Bronze : mentions secondaires, libellés en petites capitales.
        bronze: {
          300: themed("--bronze-300"),
          400: themed("--bronze-400"),
          500: themed("--bronze-500"),
          600: themed("--bronze-600"),
        },
        // L'ancienne palette « slate » est remappée sur les variables --ink-* :
        // aucune classe existante n'a besoin d'être modifiée, mais les quatre
        // tons utilisés suivent désormais le thème.
        slate: {
          100: themed("--ink-100"),
          200: themed("--ink-200"),
          300: themed("--ink-300"),
          400: themed("--ink-400"),
        },
        // Couleurs d'état (succès, information, erreur, avertissement,
        // restauration) : en thème clair les tons 200-400 sont assombris,
        // sinon un texte vert clair sur fond pâle ne serait pas lisible.
        // Les tons 500, eux, ne servent qu'en fond translucide : ils restent
        // ceux de Tailwind.
        emerald: {
          200: themed("--emerald-200"),
          300: themed("--emerald-300"),
          400: themed("--emerald-400"),
        },
        sky: {
          300: themed("--sky-300"),
          400: themed("--sky-400"),
        },
        red: {
          300: themed("--red-300"),
          400: themed("--red-400"),
        },
        amber: {
          200: themed("--amber-200"),
          300: themed("--amber-300"),
          400: themed("--amber-400"),
        },
        violet: {
          300: themed("--violet-300"),
          400: themed("--violet-400"),
        },
      },
      fontFamily: {
        // Chapeau et titres de rubriques : police à empattements, comme
        // l'encyclopédie papier. Réservée à l'affichage, jamais au corps de texte.
        display: ["var(--font-display)", "Georgia", "serif"],
        // Interface (menus, encadrés, boutons) : sans empattements, très lisible
        // en petites capitales de labeur.
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Corps des articles : sérif de labeur, endorsement des dictionnaires
        // encyclopédiques. `font-serif` dans un paragraphe de prose.
        serif: ["var(--font-serif)", "Georgia", "Times New Roman", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "glow-gold": "var(--shadow-glow-gold)",
      },
      // Grandeurs de mesure : la longueur de ligne d'un article d'encyclopédie
      // est bornée (≈ 70 caractères), sinon l'œil perd la ligne en revenant à
      // gauche. `measure-prose` sert de garde-fou sur les longues pages.
      maxWidth: {
        prose: "68ch",
        "prose-wide": "78ch",
      },
      transitionTimingFunction: {
        // Déplacement plus « naturel » pour les éléments qui enters/exitent.
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      zIndex: {
        // Barre d'outils de l'article : au-dessus du contenu, sous le header.
        toolbar: "30",
      },
      keyframes: {
        // Transition de page : le contenu « monte » légèrement à l'arrivée.
        "page-in": {
          from: { opacity: "0", transform: "translate3d(0, 8px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        // Apparition en cascade, utilisée par l'infobox et les cartes.
        "fade-rise": {
          from: { opacity: "0", transform: "translate3d(0, 6px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        // Halo doré du lien d'évitement au focus clavier.
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgb(var(--gold-500) / 0.45)" },
          "50%": { boxShadow: "0 0 0 8px rgb(var(--gold-500) / 0)" },
        },
      },
      animation: {
        "page-in": "page-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-rise": "fade-rise 320ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-gold": "pulse-gold 1.6s ease-out 1",
      },
    },
  },
  plugins: [],
};

export default config;
