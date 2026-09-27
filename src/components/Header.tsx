import Link from "next/link";
import { SITE } from "@/lib/constants";
import FramedImage from "./FramedImage";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-gold-500/30 bg-night-900/90 backdrop-blur supports-[backdrop-filter]:bg-night-900/75">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3">
          {/* Drapeau officiel : le cadre adopte le ratio du drapeau (8/5),
              il ne le rogne pas et ne laisse aucune bande vide. */}
          <FramedImage
            src="/flag.webp"
            alt="Drapeau du IIIe Delphinat de Gratianopolis"
            widthClass="w-12 sm:w-14"
            loading="eager"
            width={640}
            height={400}
          />
          <span className="min-w-0 leading-tight">
            {/* Bulle d'aide invisible : un seul indice permanent sur tout le
                site. Elle n'apparaît qu'au survol, et personne d'autre qu'un
                fan ne sait quoi en faire. */}
            <span
              title="Whenever, wherever"
              className="block font-display text-lg font-semibold leading-tight tracking-wide text-gold-200 sm:text-xl"
            >
              Wiki de Gratianopolis
            </span>
            <span className="block text-xs uppercase tracking-[0.2em] text-bronze-400">
              IIIe Delphinat
            </span>
          </span>
        </Link>

        <div className="ml-auto w-full max-w-md">
          <SearchBar />
        </div>

        <a
          href={SITE.discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden shrink-0 rounded-md border border-gold-500/50 px-3 py-2 text-sm font-medium text-gold-200 transition hover:bg-gold-500/10 sm:block"
        >
          Rejoindre
        </a>

        <ThemeToggle />
      </div>
    </header>
  );
}
