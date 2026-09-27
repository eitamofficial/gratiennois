import { CATEGORIES, type Category } from "./types";

export const SITE = {
  name: "IIIe Delphinat de Gratianopolis",
  wikiName: "Wiki de Gratianopolis",
  discordUrl: "https://discord.gg/gratianopolis",
  discordInvite: "discord.gg/gratianopolis",
  description:
    "Encyclopédie officielle du IIIe Delphinat de Gratianopolis : histoire, institutions, géographie, culture, lois et personnalités de la micronation.",
} as const;

/**
 * Crédits du wiki.
 *
 * Le wiki est l'**œuvre d'Eitam**, qui l'a conçu et développé, et qui a écrit
 * le bot Discord qui le synchronise. Le nom est cité ici — et sur la page
 * `/crédits` — parce qu'une encyclopédie doit nommer son auteur : c'est la
 * convention, et c'est ce que le lui doit.
 *
 * `articleSlug` permet de renvoyer vers sa fiche plutôt que vers du texte mort ;
 * `discordUserId` alimente sa photo de profil dans les deux cas.
 */
export const CREDITS = {
  author: {
    name: "Eitam",
    role: "Créateur du wiki et du bot Discord",
    articleSlug: "eitam",
    discordUserId: "1377681054550196295",
    description:
      "Eitam a conçu et développe ce wiki et le bot Discord qui le synchronise avec le serveur. Membre parmi les plus anciens du Delphinat, il est l'auteur de l'encyclopédie et de l'outillage qui l'entretient.",
  },
  contributions: [
    {
      name: "La rédaction du IIIe Delphinat",
      role: "Textes fondateurs et mises à jour",
      description:
        "Rédaction et validation des articles, encodés par ordre de préséance : Constitution en vigueur, puis les deux règnes précédentes, puis le récit de la rédaction.",
    },
    {
      name: "Le serveur Discord officiel",
      role: "Source des identités et des portraits",
      description:
        "Les identifiants, rôles, ancienneté et photos de profil affichés sur ce wiki sont lus en direct sur l'API Discord du serveur, et non saisis à la main.",
    },
  ],
  stack: [
    "Next.js (App Router) et React",
    "Node.js",
    "Tailwind CSS",
    "API Discord et Google Gemini",
  ],
  /**
   * Moyens de soutenir l'auteur.
   *
   * Un wiki est gratuit à lire, mais pas à écrire. Ces liens figurent dans les
   * constantes plutôt que d'être écrits en dur dans la page : l'URL vit une
   * seule fois, et la modifier ici se répercut partout.
   */
  support: [
    {
      name: "Spotify",
      handle: "Artiste",
      url: "https://open.spotify.com/artist/5gFLGLdU2KbamMDsradhuo",
      description:
        "Écouter les morceaux et les sorties sur Spotify. Un clic, c'est déjà du soutien : Spotify rémunère les artistes à l'écoute, pas au clic.",
    },
    {
      name: "YouTube",
      handle: "Chaîne musicale",
      url: "https://music.youtube.com/channel/UClRU7J6g3ZtD5LrVeZmoEUQ",
      description:
        "Clips, sessions et nouveautés sur la chaîne YouTube. L'abonnement déclenche des notifications à chaque sortie, c'est ce qui se voit le plus.",
    },
  ],
} as const;

export interface CategoryInfo {
  label: string;
  icon: string;
  description: string;
}

export const CATEGORY_INFO: Record<Category, CategoryInfo> = {
  histoire: {
    label: "Histoire",
    icon: "📜",
    description: "Chroniques et grandes dates du Delphinat, des origines à nos jours.",
  },
  institutions: {
    label: "Institutions",
    icon: "🏛️",
    description: "Le Dauphin, le Conseil, les charges et l'organisation de l'État.",
  },
  geographie: {
    label: "Géographie",
    icon: "🗺️",
    description: "Territoires, provinces et lieux emblématiques de Gratianopolis.",
  },
  culture: {
    label: "Culture",
    icon: "🎭",
    description: "Traditions, langues, arts et vie communautaire du Discord.",
  },
  lois: {
    label: "Lois",
    icon: "⚖️",
    description: "Chartes, décrets et code juridique du IIIe Delphinat.",
  },
  personnalites: {
    label: "Personnalités",
    icon: "👑",
    description:
      "Figures importantes du Delphinat — profils synchronisés avec le serveur Discord officiel.",
  },
};

/** Liste ordonnée des catégories avec leurs métadonnées d'affichage. */
export const CATEGORY_LIST = CATEGORIES.map((id) => ({ id, ...CATEGORY_INFO[id] }));

export function categoryLabel(category: Category): string {
  return CATEGORY_INFO[category]?.label ?? category;
}

export function categoryIcon(category: Category): string {
  return CATEGORY_INFO[category]?.icon ?? "📘";
}

/** Convertit un libellé quelconque en catégorie valide (fallback : "histoire"). */
export function parseCategory(value: string): Category {
  return (CATEGORIES as readonly string[]).includes(value) ? (value as Category) : "histoire";
}

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
