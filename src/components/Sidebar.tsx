"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORY_LIST } from "@/lib/constants";

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <nav aria-label="Navigation du wiki" className="sticky top-24 space-y-6">
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-bronze-400">
            Navigation
          </p>
          <ul className="space-y-1">
            <li>
              <Link
                href="/"
                className={`block rounded-md px-3 py-2 text-sm transition ${
                  isActive("/")
                    ? "bg-night-700 font-medium text-gold-200"
                    : "text-slate-300 hover:bg-night-800 hover:text-gold-200"
                }`}
              >
                🏰 Accueil
              </Link>
            </li>
            <li>
              <Link
                href="/wiki"
                className={`block rounded-md px-3 py-2 text-sm transition ${
                  pathname === "/wiki"
                    ? "bg-night-700 font-medium text-gold-200"
                    : "text-slate-300 hover:bg-night-800 hover:text-gold-200"
                }`}
              >
                📚 Index du wiki
              </Link>
            </li>
            <li>
              <Link
                href="/constitution"
                className={`block rounded-md px-3 py-2 text-sm transition ${
                  pathname === "/constitution"
                    ? "bg-night-700 font-medium text-gold-200"
                    : "text-slate-300 hover:bg-night-800 hover:text-gold-200"
                }`}
              >
                📜 Constitution (PDF)
              </Link>
              <Link
                href="/wiki/la-constitution"
                className={`block rounded-md px-3 py-2 text-sm transition ${
                  pathname === "/wiki/la-constitution"
                    ? "bg-night-700 font-medium text-gold-200"
                    : "text-slate-300 hover:bg-night-800 hover:text-gold-200"
                }`}
              >
                📜 Texte de la Constitution
              </Link>
            </li>
            <li>
              <Link
                href="/personnalites"
                className={`block rounded-md px-3 py-2 text-sm transition ${
                  pathname === "/personnalites"
                    ? "bg-night-700 font-medium text-gold-200"
                    : "text-slate-300 hover:bg-night-800 hover:text-gold-200"
                }`}
              >
                👑 Personnalités
              </Link>
            </li>
            <li>
              <Link
                href="/institutions"
                className={`block rounded-md px-3 py-2 text-sm transition ${
                  pathname === "/institutions"
                    ? "bg-night-700 font-medium text-gold-200"
                    : "text-slate-300 hover:bg-night-800 hover:text-gold-200"
                }`}
              >
                🏛️ Institutions
              </Link>
            </li>
            <li>
              <Link
                href="/tags"
                className={`block rounded-md px-3 py-2 text-sm transition ${
                  pathname.startsWith("/tags")
                    ? "bg-night-700 font-medium text-gold-200"
                    : "text-slate-300 hover:bg-night-800 hover:text-gold-200"
                }`}
              >
                🏷️ Tags
              </Link>
            </li>
            <li>
              <Link
                href="/plan"
                className={`block rounded-md px-3 py-2 text-sm transition ${
                  pathname.startsWith("/plan")
                    ? "bg-night-700 font-medium text-gold-200"
                    : "text-slate-300 hover:bg-night-800 hover:text-gold-200"
                }`}
              >
                🗺️ Plan du site
              </Link>
            </li>
            <li>
              <Link
                href="/credits"
                className={`block rounded-md px-3 py-2 text-sm transition ${
                  pathname.startsWith("/credits")
                    ? "bg-night-700 font-medium text-gold-200"
                    : "text-slate-300 hover:bg-night-800 hover:text-gold-200"
                }`}
              >
                ✍️ Crédits
              </Link>
            </li>
            <li>
              <a
                href="/Constitution.pdf"
                download
                className="block rounded-md px-3 py-2 text-sm text-slate-300 transition hover:bg-night-800 hover:text-gold-200"
              >
                ⬇ Télécharger la Constitution
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-bronze-400">
            Catégories
          </p>
          <ul className="space-y-1">
            {CATEGORY_LIST.map((category) => {
              const href = `/wiki/categorie/${category.id}`;
              return (
                <li key={category.id}>
                  <Link
                    href={href}
                    className={`block rounded-md px-3 py-2 text-sm transition ${
                      isActive(href)
                        ? "bg-night-700 font-medium text-gold-200"
                        : "text-slate-300 hover:bg-night-800 hover:text-gold-200"
                    }`}
                  >
                    <span className="mr-2" aria-hidden>
                      {category.icon}
                    </span>
                    {category.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-night-600 pt-4">
          {/* Pas de préchargement : la route est protégée et redirige vers la
              connexion pour un visiteur anonyme — la requête serait perdue. */}
          <Link
            href="/admin"
            prefetch={false}
            className="block rounded-md px-3 py-2 text-sm text-slate-400 transition hover:bg-night-800 hover:text-gold-200"
          >
            🔐 Espace d&apos;édition
          </Link>
          <a
            href="/api/articles/export"
            className="block rounded-md px-3 py-2 text-sm text-slate-400 transition hover:bg-night-800 hover:text-gold-200"
            title="Export réservé aux rédacteurs"
          >
            ⬇ Sauvegarde JSON
          </a>
        </div>
      </nav>
    </aside>
  );
}
