import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { CREDITS, SITE } from "@/lib/constants";
import { siteUrl as getSiteUrl } from "@/lib/site-url";
import { THEME_SCRIPT } from "@/lib/theme";
import { verifierStore } from "@/lib/store";
import StoreUnavailable from "@/components/StoreUnavailable";
import Oeuf from "@/components/Oeuf";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import FramedImage from "@/components/FramedImage";

// Les trois polices sont chargées en **version variable** : un seul fichier
// couvre toutes les graisses au lieu d'un fichier par graisse. Sur un article
// long, c'est autant de requêtes en moins au premier affichage.
const fontDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: "variable",
  display: "swap",
});

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: "variable",
  // L'interface s'affiche d'abord dans la police système, puis bascule : sur un
  // article long, attendre une police distance ferait « sauter » la mise en page.
  display: "swap",
});

/**
 * Sérif de labeur : c'est la police du corps des articles, celle des dictionnaires
 * encyclopédiques. Réservée à la prose (`.markdown`), jamais aux menus — l'interface
 * reste en sans empattements pour rester nette en petit corps.
 */
const fontSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: "variable",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE.wikiName} — ${SITE.name}`,
    template: `%s — ${SITE.wikiName}`,
  },
  description: SITE.description,
  applicationName: SITE.wikiName,
  // L'auteur est nommé dans les métadonnées : les extensions de navigateur et
  // les moteurs de recherche l'affichent à côté du titre du site.
  authors: [{ name: CREDITS.author.name, url: `/wiki/${CREDITS.author.articleSlug}` }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: SITE.wikiName,
    title: `${SITE.wikiName} — ${SITE.name}`,
    description: SITE.description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Drapeau du IIIe Delphinat de Gratianopolis" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.wikiName} — ${SITE.name}`,
    description: SITE.description,
    images: ["/og.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/flag-192.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#060b14" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // La garde est posée ici, à la toute première instruction, et pas dans les
  // pages : l'en-tête et la barre latérale interrogent eux aussi le magasin, donc
  // une base morte les ferait échouer avant même que la page ait pu choisir son
  // rendu. En interceptant ici, une seule requête suffit, routes comprises.
  const sante = await verifierStore();
  const storeIndisponible = !sante.ok;

  return (
    // `dark` est posée côté serveur : sans JavaScript, le site s'affiche
    // dans le thème signature. Le script ci-dessous applique le thème choisi
    // avant le premier rendu (aucun clignotement) ; `suppressHydrationWarning`
    // évite tout avertissement puisque la classe peut différer du HTML initial.
    <html
      lang="fr"
      className={`dark ${fontDisplay.variable} ${fontSans.variable} ${fontSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans flex min-h-screen flex-col">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-gold-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-night-950"
        >
          Aller au contenu
        </a>
        <Header />
        <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6">
          {storeIndisponible ? (
            <main id="contenu" className="min-w-0 flex-1">
              <StoreUnavailable message={sante.message} />
            </main>
          ) : (
            <>
              <Sidebar />
              <main id="contenu" className="min-w-0 flex-1">
                {children}
              </main>
            </>
          )}
        </div>

        <footer className="mt-auto border-t border-gold-500/20 bg-night-900/60">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <FramedImage
                src="/flag.webp"
                alt="Drapeau du IIIe Delphinat de Gratianopolis"
                widthClass="w-16"
              />
              <div className="min-w-0">
                <p className="font-display text-base text-gold-200">{SITE.name}</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
                  {SITE.description}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  Conçu par{" "}
                  <Link
                    href={`/wiki/${CREDITS.author.articleSlug}`}
                    className="font-medium text-gold-300 underline decoration-gold-500/40 underline-offset-2 transition hover:text-gold-200 hover:decoration-gold-400"
                  >
                    {CREDITS.author.name}
                  </Link>{" "}
                  — {CREDITS.author.role}.
                </p>
              </div>
            </div>

            <nav aria-label="Liens de pied de page" className="flex flex-col gap-2 text-sm">
              <Link href="/constitution" className="inline-block py-2.5 text-slate-300 transition hover:text-gold-200">
                📜 Constitution officielle (aperçu PDF)
              </Link>
              <Link href="/personnalites" className="inline-block py-2.5 text-slate-300 transition hover:text-gold-200">
                👑 Personnalités
              </Link>
              <Link href="/credits" className="inline-block py-2.5 text-slate-300 transition hover:text-gold-200">
                ✍️ Crédits
              </Link>
              <a
                href="/Constitution.pdf"
                className="inline-block py-2.5 text-slate-300 transition hover:text-gold-200"
                download
              >
                ⬇ Télécharger la Constitution (PDF)
              </a>
              <a
                href={SITE.discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block py-2.5 text-gold-300 transition hover:text-gold-200"
              >
                {SITE.discordInvite}
              </a>
            </nav>
          </div>
        </footer>

        {/* Ecouteur silencieux : reconnait le mot secret et ouvre la cache.
            Il ne rend rien et ne se voit pas. */}
        <Oeuf />
      </body>
    </html>
  );
}

export const dynamic = "force-dynamic";
