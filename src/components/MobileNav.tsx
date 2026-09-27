import Link from "next/link";
import { CATEGORY_LIST } from "@/lib/constants";

/** Barre de catégories horizontale, visible uniquement sous le breakpoint lg. */
export default function MobileNav() {
  return (
    <nav
      aria-label="Catégories du wiki"
      className="mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden"
    >
      <Link
        href="/wiki"
        className="shrink-0 rounded-full border border-night-500 bg-night-800 px-3.5 py-2.5 text-sm text-slate-200 transition hover:border-gold-500/50"
      >
        📚 Index
      </Link>
      {CATEGORY_LIST.map((category) => (
        <Link
          key={category.id}
          href={`/wiki/categorie/${category.id}`}
          className="shrink-0 rounded-full border border-night-500 bg-night-800 px-3.5 py-2.5 text-sm text-slate-200 transition hover:border-gold-500/50"
        >
          <span aria-hidden className="mr-1">
            {category.icon}
          </span>
          {category.label}
        </Link>
      ))}
      <Link
        href="/plan"
        className="shrink-0 rounded-full border border-night-500 bg-night-800 px-3.5 py-2.5 text-sm text-slate-200 transition hover:border-gold-500/50"
      >
        🗺️ Plan
      </Link>
      <Link
        href="/admin"
        prefetch={false}
        className="ml-auto shrink-0 rounded-full border border-gold-500/40 px-3.5 py-2.5 text-sm text-gold-300"
      >
        🔐 Édition
      </Link>
    </nav>
  );
}
