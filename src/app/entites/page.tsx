import Link from "next/link";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { getServerSession, hasFullAccess } from "@/lib/auth";
import { addEntity, listEntities } from "@/lib/features";
import PageHeader, { PageShell } from "@/components/PageHeader";
import ActionButton from "@/components/admin/ActionButton";

export const metadata: Metadata = {
  title: "Entités",
  description: "Personnes, lieux, institutions et événements du Delphinat, avec leurs données structurées.",
};

export const dynamic = "force-dynamic";

const LIBELLES: Record<string, string> = {
  personne: "Personnes",
  lieu: "Lieux",
  institution: "Institutions",
  evenement: "Événements",
  autre: "Autres",
};

/**
 * Entités structurées.
 *
 * Une encyclopédie ne stocke pas seulement du texte : elle relie des personnes,
 * des lieux et des dates. Cette page rend ces liens lisibles — et surtout
 * vérifiables, puisqu'une entité pointe vers l'article qui la documente.
 */
export default async function EntitesPage() {
  const [entites, session] = await Promise.all([listEntities(), getServerSession()]);
  const peutCreer = hasFullAccess(session);

  const groupes = new Map<string, typeof entites>();
  for (const entite of entites) {
    const liste = groupes.get(entite.kind) ?? [];
    liste.push(entite);
    groupes.set(entite.kind, liste);
  }

  async function creer(formData: FormData) {
    "use server";
    const active = await getServerSession();
    if (!active || !hasFullAccess(active)) return;
    const nom = String(formData.get("name") ?? "").trim();
    const nature = String(formData.get("kind") ?? "autre");
    const slug = String(formData.get("articleSlug") ?? "").trim();
    if (nom.length < 2) return;
    await addEntity({
      name: nom.slice(0, 200),
      kind: (["personne", "lieu", "institution", "evenement", "autre"].includes(nature)
        ? nature
        : "autre") as "personne" | "lieu" | "institution" | "evenement" | "autre",
      articleSlug: slug || undefined,
      data: {},
    });
    revalidatePath("/entites");
  }

  return (
    <PageShell>
      <PageHeader eyebrow="Données liées" icon="🧩" title="Entités">
        <p>
          Personnes, lieux, institutions et événements, saisis comme des objets
          et non comme du texte libre. Chaque entité renvoie à l&apos;article qui
          la documente : la donnée ne circule pas sans sa source.
        </p>
        <p className="text-xs text-slate-500">
          {entites.length} entité{entites.length > 1 ? "s" : ""} enregistrée
          {entites.length > 1 ? "s" : ""}.
        </p>
      </PageHeader>

      {entites.length === 0 ? (
        <p className="rounded-xl border border-dashed border-night-500 p-6 text-sm text-slate-400">
          Aucune entité pour le moment. Les entités se créent ci-dessous, ou par
          l&apos;API <code className="text-bronze-300">/api/features/entities</code>.
        </p>
      ) : (
        <div className="space-y-6">
          {[...groupes].map(([nature, liste]) => (
            <section key={nature}>
              <h2 className="mb-2 border-b border-night-600 pb-1 font-display text-xl text-gold-300">
                {LIBELLES[nature] ?? nature}
                <span className="ml-2 text-xs font-normal text-slate-500">{liste.length}</span>
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {liste.map((entite) => (
                  <li
                    key={entite.id}
                    className="rounded-lg border border-night-600 bg-night-800/40 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-200">{entite.name}</span>
                    {entite.articleSlug && (
                      <Link
                        href={`/wiki/${entite.articleSlug}`}
                        className="ml-2 text-xs text-bronze-300 hover:text-gold-200"
                      >
                        → article
                      </Link>
                    )}
                    {peutCreer && (
                      <span className="ml-2">
                        <ActionButton
                          url={`/api/features/entities?id=${encodeURIComponent(entite.id)}`}
                          method="DELETE"
                          label="Retirer"
                          tone="danger"
                        />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {peutCreer && (
        <form
          action={creer}
          className="flex flex-wrap items-end gap-2 rounded-xl border border-night-600 bg-night-800/40 p-4"
        >
          <label className="text-xs text-slate-400">
            Nom
            <input
              name="name"
              required
              minLength={2}
              maxLength={200}
              className="mt-1 block rounded-md border border-night-500 bg-night-900 px-2 py-1.5 text-sm text-slate-200"
            />
          </label>
          <label className="text-xs text-slate-400">
            Nature
            <select
              name="kind"
              className="mt-1 block rounded-md border border-night-500 bg-night-900 px-2 py-1.5 text-sm text-slate-200"
            >
              <option value="personne">Personne</option>
              <option value="lieu">Lieu</option>
              <option value="institution">Institution</option>
              <option value="evenement">Événement</option>
              <option value="autre">Autre</option>
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Slug de l&apos;article (facultatif)
            <input
              name="articleSlug"
              className="mt-1 block rounded-md border border-night-500 bg-night-900 px-2 py-1.5 text-sm text-slate-200"
            />
          </label>
          <button
            type="submit"
            className="rounded-md border border-gold-500 px-3 py-2 text-xs text-gold-200"
          >
            Ajouter
          </button>
        </form>
      )}
    </PageShell>
  );
}
