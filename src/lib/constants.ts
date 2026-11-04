import { CATEGORIES, type Category } from "./types";

/**
 * Invitation du serveur Discord.
 *
 * Le slug réel n'est **pas** versionné : ce dépôt est public, et une invitation
 * publiée attire les raids. Il se règle par `DISCORD_INVITE` dans
 * `.env.secrets` (voir `env.exemple`), qui accepte un slug (`abc123`) comme une
 * URL complète. À défaut, le slug de démonstration est utilisé — le lien mène
 * alors nulle part, ce qui vaut mieux qu'un lien mort publié.
 */
export function discordInviteUrl(): string {
  const brut = process.env.DISCORD_INVITE?.trim();
  if (!brut) return "https://discord.gg/gratianopolis";
  if (/^https?:\/\//i.test(brut)) return brut;
  return `https://discord.gg/${brut.replace(/^\/+/, "")}`;
}

/** Le slug seul, pour l'affichage (« discord.gg/abc123 »). */
function discordInviteLabel(): string {
  return discordInviteUrl().replace(/^https?:\/\//i, "");
}

export const SITE = {
  name: "IIIe Delphinat de Gratianopolis",
  wikiName: "Wiki de Gratianopolis",
  discordUrl: discordInviteUrl(),
  discordInvite: discordInviteLabel(),
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

/**
 * DelphinaBot, le bot Discord du Delphinat.
 *
 * Cette page est la référence publique que Discord exige : le portail
 * développeur demande quatre adresses — point de terminaison des
 * interactions, vérification des liens de rôles, conditions d'utilisation et
 * politique de confidentialité. Les écrire ici, et une seule fois, évite
 * d'avoir quatre versions d'une même information qui divergent.
 *
 * Les adresses sont des **chemins** : la page les rend en adresses complètes
 * avec `siteUrl()`, qui déduit le domaine de l'environnement. C'est ce qui
 * permet à la même page d'être juste en local, sur le domaine définitif et
 * sur un déploiement Vercel, sans la réécrire à chaque fois.
 */
export const DELPHINABOT = {
  nom: "DelphinaBot",
  resume:
    "Bot Discord du IIIe Delphinat de Gratianopolis : sécurité, modération, wiki, divertissement, économie et musique. Entièrement francophone, écrit en JavaScript pour discord.js 14, hébergé sur le même serveur que ce wiki.",
  dossier: "DelphinaBotV2",
  /** Les quatre emplacements du portail développeur Discord. */
  adresses: [
    {
      cle: "endpoint-interactions",
      titre: "Point de terminaison des interactions",
      chemin: "/bot",
      explication:
        "DelphinaBot reste connecté en permanence à la passerelle Discord et reçoit donc les interactions par ce canal : le champ reste volontairement vide dans le portail. Cette page est la référence qui explique ce choix, et où le retrouver si vous assumez l administration du bot.",
    },
    {
      cle: "liens-de-roles",
      titre: "URL de vérification des liens de rôles",
      chemin: "/bot/liens",
      explication:
        "Adresse donnée aux membres pour rattacher leur compte Discord à une page du wiki. La validation est faite par la modération, jamais automatiquement.",
    },
    {
      cle: "conditions",
      titre: "Conditions d'utilisation",
      chemin: "/bot/conditions",
      explication:
        "Ce qu'un membre peut attendre du bot, et ce à quoi il s'engage en l'utilisant.",
    },
    {
      cle: "confidentialite",
      titre: "Politique de confidentialité",
      chemin: "/bot/confidentialite",
      explication:
        "Quelles données le bot conserve, combien de temps, et ce qu'il ne fait pas — il ne lit aucun message privé et n'enregistre aucun contenu.",
    },
  ],
  modules: [
    {
      nom: "Sécurité",
      resume:
        "Réglages par serveur, audit des permissions dangereuses, détection d'usurpation de nom, liens de rôles vérifiés avec le wiki.",
    },
    {
      nom: "Modération",
      resume:
        "Avertissement, délai, sourdine, exclusion, bannissement, révocation, purge, ralentissement, signalements et dossier de sanctions par membre.",
    },
    {
      nom: "Anti-raid",
      resume:
        "Détection d'une arrivée massive, verrouillage immédiat du serveur, mise en quarantaine et alerte dans un salon dédié.",
    },
    {
      nom: "Divertissement",
      resume:
        "Quiz jouable, dés, citations, décrets, tirages au sort, niveaux et classement d'expérience.",
    },
    {
      nom: "Économie",
      resume:
        "Ducats, métier, récompense quotidienne, épargne à l'abri du vol, transferts atomiques, marché et taxation.",
    },
    {
      nom: "Musique",
      resume:
        "Lecture dans les salons vocaux, file d'attente, volume et boucle, à partir de yt-dlp et FFmpeg installés sur la machine.",
    },
  ],
  principes: [
    "Le bot n'écrit jamais un article du wiki : il signale des changements de rôles, et le wiki décide.",
    "Il n'exclut ni ne banni seul : au-delà de trois sanctions, c'est une alerte à la modération, pas une décision.",
    "Il ne conserve aucun contenu de message : seulement un identifiant, un motif et un extrait de quatre cents caractères pour les signalements.",
    "Les sanctions sont levées, jamais effacées : le dossier reste consultable, ce qui est la seule mémoire fiable en cas de contestation.",
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

/**
 * Fuseau d'affichage, fixé volontairement.
 *
 * Sans lui, le serveur formate en UTC et le navigateur en heure locale : deux
 * textes différents pour la même date, donc un conflit d'hydratation React
 * (#418) sur toute page qui affiche une heure. Le Delphinat est à Paris ;
 * l'affichage l'est aussi, quel que soit l'endroit d'où l'on consulte.
 */
export const FUSEAU = "Europe/Paris";

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
      timeZone: FUSEAU,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: FUSEAU,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
