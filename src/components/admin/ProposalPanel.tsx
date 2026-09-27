"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * File de relecture des propositions automatiques.
 *
 * Trois décisions sont proposées pour chaque proposition, de la plus
 * exposée à la plus prudente :
 *
 *   - **Publier** : le texte de l'IA est ajouté tel quel à la page visée ;
 *   - **Corriger** : le rédacteur écrit sa propre version, qui remplace celle
 *     de l'IA. C'est le chemin le plus fréquent, et le plus souhaitable ;
 *   - **Rejeter** : la proposition est supprimée, rien n'est publié.
 *
 * Le composant affiche toujours le **texte proposé** avant l'action, ainsi que
 * les citations qui le justifient : on ne valide pas ce qu'on n'a pas lu.
 */

interface Proposition {
  slug: string;
  cible: string;
  title: string;
  resume: string;
  tags: string[];
  updatedAt: string;
  auteur: string;
}

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "date inconnue"
    : date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
};

export default function ProposalPanel({ propositions }: { propositions: Proposition[] }) {
  const router = useRouter();
  const [enCours, demarrerTransition] = useTransition();
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [texte, setTexte] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ton: "ok" | "erreur"; texte: string } | null>(
    null,
  );
  const [simulation, setSimulation] = useState(false);

  async function decider(slug: string, decision: string, contenu?: string) {
    setMessage(null);
    const reponse = await fetch("/api/ai/proposition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, decision, contenu }),
    });
    const donnees = await reponse.json().catch(() => ({}));

    if (!reponse.ok) {
      setMessage({ ton: "erreur", texte: donnees.error ?? "La décision a échoué." });
      return;
    }
    setMessage({ ton: "ok", texte: "Décision enregistrée." });
    setOuvert(null);
    demarrerTransition(() => router.refresh());
  }

  async function lancerAnalyse() {
    setMessage(null);
    const reponse = await fetch("/api/ai/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enregistrer: !simulation }),
    });
    const donnees = await reponse.json().catch(() => ({}));

    if (!reponse.ok) {
      setMessage({ ton: "erreur", texte: donnees.error ?? "L'analyse a échoué." });
      return;
    }
    if (simulation) {
      const volume = donnees.rapport?.volume ?? 0;
      const apport = donnees.rapport?.sansApport?.length ?? 0;
      setMessage({
        ton: "ok",
        texte:
          `Simulation terminée : ${volume} messages analysés, ` +
          `${donnees.rapport?.propositions?.length ?? 0} pages examinées, ` +
          `${apport} sans apport. Rien n'a été enregistré.`,
      });
      return;
    }
    setMessage({
      ton: "ok",
      texte:
        `Analyse terminée : ${donnees.deposees?.length ?? 0} proposition(s) déposée(s). ` +
        "Relisez-les ci-dessous avant de décider.",
    });
    demarrerTransition(() => router.refresh());
  }

  return (
    <section aria-labelledby="actions-ia" className="space-y-6">
      <div className="rounded-lg border border-night-600 bg-night-900/60 p-5">
        <h2
          id="actions-ia"
          className="font-display text-lg font-semibold text-slate-100"
        >
          Lancer une analyse
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          L&apos;analyse lit les salons de parti et rédige des propositions.
          Elle ne publie rien : chaque apport attend votre relecture.
        </p>

        <label className="mt-4 flex items-start gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={simulation}
            onChange={(event) => setSimulation(event.target.checked)}
            // 24 px : la taille minimale de cible tactile. Une case de 16 px
            // est illisible au doigt sur mobile, même si le label est
            // cliquable.
            className="mt-0.5 h-6 w-6 shrink-0 rounded border-night-500 bg-night-900 accent-gold-500"
          />
          <span>
            Simulation — analyser et afficher le bilan,{" "}
            <strong className="text-slate-200">sans rien enregistrer</strong>
          </span>
        </label>

        <button
          type="button"
          onClick={lancerAnalyse}
          disabled={enCours}
          className="mt-4 rounded-md border border-gold-500/50 px-4 py-2.5 text-sm font-medium text-gold-200 transition hover:bg-gold-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enCours ? "Analyse en cours…" : "Analyser les salons"}
        </button>
      </div>

      {message ? (
        <p
          role="status"
          className={
            message.ton === "ok"
              ? "rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
              : "rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          }
        >
          {message.texte}
        </p>
      ) : null}

      {propositions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-night-600 px-5 py-8 text-center text-sm text-slate-400">
          Aucune proposition en attente. Lancez une analyse pour alimenter
          cette file.
        </p>
      ) : (
        <ul className="space-y-4">
          {propositions.map((proposition) => {
            const estOuverte = ouvert === proposition.slug;
            return (
              <li
                key={proposition.slug}
                className="rounded-lg border border-night-600 bg-night-900/60 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold text-slate-100">
                      {proposition.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Page visée :{" "}
                      <span className="text-slate-400">{proposition.cible}</span>{" "}
                      · déposée le {formatDate(proposition.updatedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOuvert(estOuverte ? null : proposition.slug)}
                    aria-expanded={estOuverte}
                    className="rounded-md border border-night-500 px-3 py-2 text-sm text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200"
                  >
                    {estOuverte ? "Masquer" : "Relire"}
                  </button>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  {proposition.resume}
                </p>

                {estOuverte ? (
                  <div className="mt-4 space-y-4 border-t border-night-600 pt-4">
                    <div>
                      <label
                        htmlFor={`contenu-${proposition.slug}`}
                        className="text-xs uppercase tracking-wider text-slate-400"
                      >
                        Texte proposé — relisez-le avant de décider
                      </label>
                      <textarea
                        id={`contenu-${proposition.slug}`}
                        value={texte[proposition.slug] ?? ""}
                        onChange={(event) =>
                          setTexte((etat) => ({
                            ...etat,
                            [proposition.slug]: event.target.value,
                          }))
                        }
                        rows={12}
                        placeholder="Laissez vide pour publier le texte de l'IA, ou écrivez votre version pour la publier à sa place."
                        className="mt-2 w-full rounded-md border border-night-500 bg-night-950/60 p-3 font-mono text-xs leading-relaxed text-slate-200 placeholder:text-slate-600"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => decider(proposition.slug, "publier")}
                        className="rounded-md border border-emerald-500/50 px-3 py-2.5 text-sm text-emerald-200 transition hover:bg-emerald-500/10"
                      >
                        Publier le texte de l&apos;IA
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          decider(proposition.slug, "corriger", texte[proposition.slug])
                        }
                        disabled={!texte[proposition.slug]?.trim()}
                        className="rounded-md border border-sky-500/50 px-3 py-2.5 text-sm text-sky-200 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Publier ma version
                      </button>
                      <button
                        type="button"
                        onClick={() => decider(proposition.slug, "rejeter")}
                        className="rounded-md border border-red-500/50 px-3 py-2.5 text-sm text-red-200 transition hover:bg-red-500/10"
                      >
                        Rejeter
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
