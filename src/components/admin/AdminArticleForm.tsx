"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_LIST } from "@/lib/constants";
import { slugify } from "@/lib/slug";
import { renderMarkdown } from "@/components/MarkdownRenderer";
import type {
  Article,
  ArticleInfobox,
  ArticleSource,
  Category,
  MaintenanceCode,
  SourceKind,
} from "@/lib/types";
import { MAINTENANCE_CODES, SOURCE_KINDS } from "@/lib/types";
import type { PageTemplate } from "@/content/templates";
import AnalysisPanel from "./AnalysisPanel";
import InfoboxEditor from "./InfoboxEditor";

interface Props {
  article?: Article;
  /** Modèle choisi à la création : pré-remplit catégorie, structure et infobox. */
  template?: PageTemplate;
}

/** Une action de la barre d'outils : insère ou entoure la sélection. */
interface Action {
  id: string;
  label: string;
  titre: string;
  /** Placé avant la sélection. */
  avant: string;
  /** Placé après la sélection. */
  apres?: string;
  /** Texte inséré quand rien n'est sélectionné. */
  exemple?: string;
  /** Raccourci affiché dans l'infobulle (et réellement câblé plus bas). */
  raccourci?: string;
}

const ACTIONS: Array<Action | "separateur"> = [
  { id: "gras", label: "G", titre: "Gras", avant: "**", apres: "**", exemple: "texte", raccourci: "Ctrl+B" },
  { id: "italique", label: "I", titre: "Italique", avant: "*", apres: "*", exemple: "texte", raccourci: "Ctrl+I" },
  { id: "code", label: "</>", titre: "Code en ligne", avant: "`", apres: "`", exemple: "code" },
  "separateur",
  { id: "h2", label: "H2", titre: "Titre de section", avant: "\n## ", exemple: "Section" },
  { id: "h3", label: "H3", titre: "Sous-titre", avant: "\n### ", exemple: "Sous-section" },
  "separateur",
  { id: "lien-wiki", label: "[[ ]]", titre: "Lien interne vers un article", avant: "[[", apres: "]]", exemple: "slug-de-larticle", raccourci: "Ctrl+K" },
  { id: "lien", label: "🔗", titre: "Lien externe", avant: "[", apres: "](https://)", exemple: "texte du lien" },
  "separateur",
  { id: "liste", label: "•", titre: "Liste à puces", avant: "\n- ", exemple: "élément" },
  { id: "liste-num", label: "1.", titre: "Liste numérotée", avant: "\n1. ", exemple: "élément" },
  { id: "citation", label: "❝", titre: "Citation", avant: "\n> ", exemple: "texte cité" },
  "separateur",
  { id: "tableau", label: "▦", titre: "Tableau", avant: "\n| Colonne | Colonne |\n| --- | --- |\n| ", apres: " |  |\n", exemple: "valeur" },
  { id: "source", label: "§", titre: "Mention de source", avant: "\n> Source : ", exemple: "récit de la rédaction du wiki." },
  { id: "separateur-hr", label: "―", titre: "Séparateur", avant: "\n\n---\n\n" },
];

/** Clé de brouillon : une par article, plus une pour la création. */
function cleBrouillon(slug?: string): string {
  return `wiki-brouillon:${slug ?? "nouveau"}`;
}

interface Brouillon {
  title: string;
  category: Category;
  summary: string;
  tags: string;
  discordUserId: string;
  content: string;
  enregistre: string;
}

export default function AdminArticleForm({ article, template }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(article?.title ?? "");
  const [category, setCategory] = useState<Category>(
    article?.category ?? template?.category ?? "histoire",
  );
  const [summary, setSummary] = useState(article?.summary ?? template?.summary ?? "");
  const [tags, setTags] = useState(
    article?.tags.join(", ") ?? (template?.tags.join(", ") ?? ""),
  );
  const [discordUserId, setDiscordUserId] = useState(article?.discordUserId ?? "");
  const [content, setContent] = useState(article?.content ?? template?.content ?? "");
  const [infobox, setInfobox] = useState<ArticleInfobox | undefined>(
    article?.infobox ??
      (template?.infobox
        ? {
            caption: template.infobox.caption,
            fields: template.infobox.fields.map((champ) => ({ ...champ })),
            footer: template.infobox.footer,
          }
        : undefined),
  );

  // Résumé de modification et « modification mineure » : deux conventions de
  // wiki qui n'ont de sens qu'en édition, pas à la création.
  const [comment, setComment] = useState("");
  const [minor, setMinor] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [brouillonRestaure, setBrouillonRestaure] = useState(false);

  // Métadonnées de fiabilité. Elles ne sont pas décoratives : la protection
  // restreint l'écriture, les sources alimentent la bibliographie, les bandeaux
  // préviennent le lecteur qu'une page n'est pas encore vérifiée.
  const [protection, setProtection] = useState<"" | "semi" | "full">(
    article?.protection ?? "",
  );
  const [lang, setLang] = useState(article?.lang ?? "");
  const [sources, setSources] = useState<ArticleSource[]>(article?.sources ?? []);
  const [maintenance, setMaintenance] = useState<MaintenanceCode[]>(
    article?.maintenance ?? [],
  );

  const zoneTexte = useRef<HTMLTextAreaElement>(null);
  const formulaire = useRef<HTMLFormElement>(null);

  const previewSlug = useMemo(() => slugify(title) || "(slug automatique)", [title]);
  const tagList = useMemo(
    () => tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    [tags],
  );

  const mots = useMemo(
    () => content.trim().split(/\s+/).filter(Boolean).length,
    [content],
  );

  const apercu = useMemo(
    () => (showPreview ? renderMarkdown(content) : ""),
    [showPreview, content],
  );

  // -------------------------------------------------------------------------
  // Brouillon automatique
  // -------------------------------------------------------------------------
  // Un éditeur qui perd trois paragraphes sur un F5 est un éditeur qu'on
  // n'utilise pas. Le brouillon vit dans le navigateur, jamais sur le serveur :
  // il ne peut donc pas publier quelque chose par accident.

  useEffect(() => {
    try {
      const brut = window.localStorage.getItem(cleBrouillon(article?.slug));
      if (!brut) return;
      const brouillon = JSON.parse(brut) as Brouillon;
      // On ne restaure que si le brouillon diffère de ce qui est déjà en base :
      // sinon, ouvrir un article intact proposerait de « restaurer » l'identique.
      const different =
        brouillon.content !== (article?.content ?? template?.content ?? "") ||
        brouillon.title !== (article?.title ?? "");
      if (!different) {
        window.localStorage.removeItem(cleBrouillon(article?.slug));
        return;
      }
      setTitle(brouillon.title);
      setCategory(brouillon.category);
      setSummary(brouillon.summary);
      setTags(brouillon.tags);
      setDiscordUserId(brouillon.discordUserId);
      setContent(brouillon.content);
      setBrouillonRestaure(true);
    } catch {
      // Stockage indisponible (navigation privée) : on continue sans brouillon.
    }
    // Volontairement au montage uniquement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const minuteur = setTimeout(() => {
      try {
        window.localStorage.setItem(
          cleBrouillon(article?.slug),
          JSON.stringify({
            title,
            category,
            summary,
            tags,
            discordUserId,
            content,
            enregistre: new Date().toISOString(),
          } satisfies Brouillon),
        );
      } catch {
        // Quota plein ou stockage refusé : ce n'est pas une raison pour bloquer.
      }
    }, 800);
    return () => clearTimeout(minuteur);
  }, [article?.slug, title, category, summary, tags, discordUserId, content]);

  function oublierBrouillon() {
    try {
      window.localStorage.removeItem(cleBrouillon(article?.slug));
    } catch {
      /* sans effet */
    }
    setBrouillonRestaure(false);
  }

  // -------------------------------------------------------------------------
  // Barre d'outils
  // -------------------------------------------------------------------------

  const inserer = useCallback(
    (action: Action) => {
      const zone = zoneTexte.current;
      if (!zone) return;

      const debut = zone.selectionStart;
      const fin = zone.selectionEnd;
      const selection = content.slice(debut, fin);
      const corps = selection || action.exemple || "";
      const remplacement = `${action.avant}${corps}${action.apres ?? ""}`;

      const nouveau = content.slice(0, debut) + remplacement + content.slice(fin);
      setContent(nouveau);

      // On replace le curseur : sélection entière si rien n'était sélectionné,
      // sinon à la fin du bloc inséré. Sans cela, le curseur saute à la fin du
      // document et l'outil devient inutilisable.
      const positionDebut = debut + action.avant.length;
      requestAnimationFrame(() => {
        zone.focus();
        if (selection) {
          zone.setSelectionRange(positionDebut, positionDebut + corps.length);
        } else {
          zone.setSelectionRange(positionDebut, positionDebut + corps.length);
        }
      });
    },
    [content],
  );

  // Raccourcis clavier : ceux affichés dans les infobulles doivent exister,
  // sinon la barre d'outils ment.
  useEffect(() => {
    function surTouche(evenement: KeyboardEvent) {
      if (!(evenement.ctrlKey || evenement.metaKey)) return;
      const cible = evenement.target as HTMLElement | null;
      const dansZone = cible?.tagName === "TEXTAREA" || cible?.tagName === "INPUT";

      if (evenement.key.toLowerCase() === "s") {
        evenement.preventDefault();
        formulaire.current?.requestSubmit();
        return;
      }
      if (!dansZone) return;

      const raccourcis: Record<string, string> = { b: "gras", i: "italique", k: "lien-wiki" };
      const id = raccourcis[evenement.key.toLowerCase()];
      if (!id) return;
      const action = ACTIONS.find(
        (candidat): candidat is Action => candidat !== "separateur" && candidat.id === id,
      );
      if (!action) return;
      evenement.preventDefault();
      inserer(action);
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [inserer]);

  function addTag(tag: string) {
    if (tagList.includes(tag)) return;
    setTags([...tagList, tag].join(", "));
  }

  // -------------------------------------------------------------------------
  // Envoi
  // -------------------------------------------------------------------------

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch(
        article ? `/api/articles/${article.slug}` : "/api/articles",
        {
          method: article ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            category,
            summary,
            content,
            discordUserId,
            tags: tagList,
            infobox,
            protection: protection || undefined,
            lang: lang.trim() || undefined,
            sources: sources.length > 0 ? sources : undefined,
            maintenance: maintenance.length > 0 ? maintenance : undefined,
            comment: comment.trim() || undefined,
            minor: minor || undefined,
          }),
        },
      );

      const data = await response.json().catch(() => null);
      if (response.ok) {
        oublierBrouillon();
        router.push(`/wiki/${data.article?.slug ?? previewSlug}`);
        router.refresh();
        return;
      }
      setError(data?.error ?? "Enregistrement impossible.");
    } catch {
      setError("Erreur réseau — réessayez.");
    } finally {
      setPending(false);
    }
  }

  /** Ajoute une source vide ; l'identifiant sert d'ancre pour l'édition. */
  function ajouterSource() {
    setSources((liste) => [
      ...liste,
      { id: Math.random().toString(36).slice(2, 10), kind: "page", title: "", url: "" },
    ]);
  }

  function majSource(id: string, patch: Partial<ArticleSource>) {
    setSources((liste) => liste.map((source) => (source.id === id ? { ...source, ...patch } : source)));
  }

  const champ =
    "w-full rounded-md border border-night-500 bg-night-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-gold-500/60 focus:outline-none";

  return (
    <form ref={formulaire} onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      {brouillonRestaure && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-bronze-500/40 bg-bronze-500/10 px-3 py-2 text-sm text-bronze-200">
          <span>Un brouillon non enregistré a été restauré.</span>
          <button
            type="button"
            onClick={oublierBrouillon}
            className="rounded border border-bronze-500/50 px-2 py-1 text-xs transition hover:bg-bronze-500/20"
          >
            L&apos;oublier
          </button>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-300">
            Titre *
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            className={champ}
          />
          <p className="mt-1 text-xs text-slate-400">
            Slug généré : <code className="text-bronze-300">/wiki/{previewSlug}</code>
          </p>
        </div>

        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-300">
            Catégorie *
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className={champ}
          >
            {CATEGORY_LIST.map((item) => (
              <option key={item.id} value={item.id}>
                {item.icon} {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tags" className="mb-1 block text-sm font-medium text-slate-300">
            Tags (séparés par des virgules)
          </label>
          <input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="histoire, charte"
            className={champ}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="discordUserId" className="mb-1 block text-sm font-medium text-slate-300">
            ID utilisateur Discord <span className="text-slate-400">(personnalités — optionnel)</span>
          </label>
          <input
            id="discordUserId"
            value={discordUserId}
            onChange={(e) => setDiscordUserId(e.target.value)}
            placeholder="Ex. 123456789012345678 — ou laissez vide pour résolution automatique par nom"
            className={champ}
          />
          <p className="mt-1 text-xs text-slate-400">
            Mode développeur Discord → clic droit sur le membre → « Copier l&apos;identifiant ».
            La synchronisation peut aussi résoudre automatiquement l&apos;ID à partir du nom.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="summary" className="mb-1 block text-sm font-medium text-slate-300">
          Résumé * <span className="font-normal text-slate-500">— une à deux phrases, affichées dans les cartes et les résultats de recherche</span>
        </label>
        <textarea
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          required
          rows={2}
          maxLength={800}
          className={champ}
        />
      </div>

      {/* --- Contenu ------------------------------------------------------- */}
      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="content" className="text-sm font-medium text-slate-300">
            Contenu *
          </label>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">
              {mots} mot{mots > 1 ? "s" : ""} · {content.length} car.
            </span>
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="rounded border border-night-500 px-2 py-1 text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200"
              aria-expanded={showHelp}
            >
              Aide
            </button>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="rounded border border-night-500 px-2 py-1 text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200"
              aria-pressed={showPreview}
            >
              {showPreview ? "Éditer" : "Aperçu"}
            </button>
          </div>
        </div>

        {showHelp && (
          <div className="mb-2 grid gap-x-6 gap-y-1 rounded-md border border-night-600 bg-night-900/60 px-4 py-3 text-xs text-slate-400 sm:grid-cols-2">
            <p><code className="text-bronze-300">**gras**</code> · <code className="text-bronze-300">*italique*</code> · <code className="text-bronze-300">`code`</code></p>
            <p><code className="text-bronze-300">## Titre</code> · <code className="text-bronze-300">### Sous-titre</code></p>
            <p><code className="text-bronze-300">[[slug]]</code> ou <code className="text-bronze-300">[[slug|libellé]]</code> — lien interne</p>
            <p><code className="text-bronze-300">[texte](https://…)</code> — lien externe</p>
            <p><code className="text-bronze-300">- élément</code> · <code className="text-bronze-300">1. élément</code></p>
            <p><code className="text-bronze-300">&gt; citation</code> · <code className="text-bronze-300">| a | b |</code> — tableau</p>
            <p className="sm:col-span-2 text-slate-500">
              Les liens internes acceptent un slug (<code>le-dauphin</code>) ou un titre ; un lien
              rouge signale un article à créer. Aucun HTML n&apos;est interprété : tout est échappé.
            </p>
          </div>
        )}

        {showPreview ? (
          <div className="min-h-[24rem] rounded-md border border-night-600 bg-night-950/60 px-5 py-4">
            <div
              className="markdown"
              dangerouslySetInnerHTML={{ __html: apercu }}
            />
            <p className="mt-6 border-t border-night-700 pt-2 text-xs text-slate-500">
              Aperçu rendu par le moteur du site — ce que vous voyez ici est ce que le lecteur verra.
            </p>
          </div>
        ) : (
          <>
            <div
              role="toolbar"
              aria-label="Mise en forme"
              className="flex flex-wrap items-center gap-1 rounded-t-md border border-b-0 border-night-500 bg-night-900 px-2 py-1.5"
            >
              {ACTIONS.map((action, index) =>
                action === "separateur" ? (
                  <span
                    key={`sep-${index}`}
                    aria-hidden="true"
                    className="mx-1 h-5 w-px bg-night-600"
                  />
                ) : (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => inserer(action)}
                    title={
                      action.raccourci
                        ? `${action.titre} (${action.raccourci})`
                        : action.titre
                    }
                    aria-label={action.titre}
                    className="rounded px-2 py-1 text-xs text-slate-300 transition hover:bg-night-700 hover:text-gold-200"
                  >
                    {action.label}
                  </button>
                ),
              )}
            </div>
            <textarea
              ref={zoneTexte}
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={22}
              className="w-full rounded-b-md border border-night-500 bg-night-800 px-3 py-2 font-mono text-sm leading-6 text-slate-100 placeholder:text-slate-400 focus:border-gold-500/60 focus:outline-none"
              placeholder={"# Titre\n\n## Section\n\nDu texte en **gras**, un lien [[le-dauphin]]…"}
            />
          </>
        )}
      </div>

      {/* --- Fiabilité : protection, sources, bandeaux --------------------- */}
      <details className="rounded-lg border border-night-600 bg-night-900/50 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-300">
          Fiabilité et protection
          <span className="ml-2 text-xs font-normal text-slate-500">
            {sources.length} source{sources.length > 1 ? "s" : ""}
            {protection === "semi" && " · semi-protégée"}
            {protection === "full" && " · protégée"}
          </span>
        </summary>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            Protection
            <select
              value={protection}
              onChange={(event) => setProtection(event.target.value as "" | "semi" | "full")}
              className="mt-1 w-full rounded-md border border-night-500 bg-night-800 px-2 py-1.5 text-sm text-slate-100"
            >
              <option value="">Aucune</option>
              <option value="semi">Semi-protégée — charges seulement</option>
              <option value="full">Protégée — accès complet seulement</option>
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Langue (code ISO)
            <input
              value={lang}
              onChange={(event) => setLang(event.target.value)}
              placeholder="fr"
              maxLength={5}
              className="mt-1 w-full rounded-md border border-night-500 bg-night-800 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
        </div>

        <fieldset className="mt-3">
          <legend className="text-xs text-slate-400">Bandeaux d&apos;entretien</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {MAINTENANCE_CODES.map((code) => (
              <label
                key={code}
                className="flex items-center gap-1.5 rounded-full border border-night-500 px-2 py-0.5 text-[11px] text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={maintenance.includes(code)}
                  onChange={(event) =>
                    setMaintenance((liste) =>
                      event.target.checked ? [...liste, code] : liste.filter((item) => item !== code),
                    )
                  }
                  className="h-3 w-3 accent-amber-500"
                />
                {code}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">Sources</p>
            <button
              type="button"
              onClick={ajouterSource}
              className="rounded-md border border-night-500 px-2 py-0.5 text-[11px] text-slate-300 hover:border-gold-500"
            >
              + Ajouter
            </button>
          </div>
          {sources.length === 0 && (
            <p className="mt-1 text-[11px] text-slate-500">
              Aucune source. Un bandeau « sources insuffisantes » sera affiché
              automatiquement.
            </p>
          )}
          <ul className="mt-2 space-y-2">
            {sources.map((source) => (
              <li key={source.id} className="space-y-2 rounded-md border border-night-500 p-2">
                <div className="grid gap-2 sm:grid-cols-[130px_1fr]">
                  <select
                    value={source.kind}
                    onChange={(event) =>
                      majSource(source.id, { kind: event.target.value as SourceKind })
                    }
                    className="rounded-md border border-night-500 bg-night-800 px-2 py-1 text-xs text-slate-100"
                  >
                    {SOURCE_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                  <input
                    value={source.title}
                    onChange={(event) => majSource(source.id, { title: event.target.value })}
                    placeholder="Titre de la source"
                    className="rounded-md border border-night-500 bg-night-800 px-2 py-1 text-xs text-slate-100"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                  <input
                    value={source.url ?? ""}
                    onChange={(event) => majSource(source.id, { url: event.target.value })}
                    placeholder="https://… (facultatif)"
                    className="rounded-md border border-night-500 bg-night-800 px-2 py-1 text-xs text-slate-100"
                  />
                  <input
                    value={source.author ?? ""}
                    onChange={(event) => majSource(source.id, { author: event.target.value })}
                    placeholder="Auteur"
                    className="rounded-md border border-night-500 bg-night-800 px-2 py-1 text-xs text-slate-100"
                  />
                </div>
                <textarea
                  value={source.quote ?? ""}
                  onChange={(event) => majSource(source.id, { quote: event.target.value })}
                  placeholder="Citation archivée — le texte qui reste lisible même si le lien meurt"
                  rows={2}
                  className="w-full rounded-md border border-night-500 bg-night-800 px-2 py-1 text-xs text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setSources((liste) => liste.filter((item) => item.id !== source.id))}
                  className="text-[11px] text-rose-300 hover:underline"
                >
                  Retirer cette source
                </button>
              </li>
            ))}
          </ul>
        </div>
      </details>

      {/* --- Résumé de modification ---------------------------------------- */}
      {article && (
        <div className="rounded-lg border border-night-600 bg-night-900/50 px-4 py-3">
          <label htmlFor="comment" className="mb-1 block text-sm font-medium text-slate-300">
            Résumé de la modification
          </label>
          <input
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={200}
            placeholder="Ex. « chronologie corrigée : l'alliance date du IIIe Delphinat »"
            className={champ}
          />
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={minor}
              onChange={(e) => setMinor(e.target.checked)}
              className="h-4 w-4 rounded border-night-500 bg-night-800"
            />
            Modification mineure
            <span className="text-xs text-slate-500">
              (correction de forme, orthographe — pas de changement de fond)
            </span>
          </label>
          <p className="mt-2 text-xs text-slate-500">
            Le résumé apparaît dans l&apos;historique de l&apos;article, à côté de votre nom.
          </p>
        </div>
      )}

      <details className="rounded-lg border border-night-600 bg-night-900/50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-200">
          📋 Boîte d&apos;informations (infobox)
          <span className="ml-2 text-xs font-normal text-slate-400">
            encadré de synthèse affiché à droite de l&apos;article
          </span>
        </summary>
        <div className="border-t border-night-600 px-4 py-4">
          <InfoboxEditor value={infobox} onChange={setInfobox} />
        </div>
      </details>

      <details className="rounded-lg border border-night-600 bg-night-900/50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-200">
          🧭 Assistant de rédaction
          <span className="ml-2 text-xs font-normal text-slate-400">
            statistiques, contrôle qualité, suggestions
          </span>
        </summary>
        <div className="border-t border-night-600 px-4 py-4">
          <AnalysisPanel
            title={title}
            slug={article?.slug}
            summary={summary}
            content={content}
            tags={tagList}
            category={category}
            onAddTag={addTag}
            onSetCategory={(value) => setCategory(value)}
          />
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gold-500 px-5 py-2.5 text-sm font-semibold text-night-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : article ? "Enregistrer les modifications" : "Publier l'article"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-night-500 px-4 py-2.5 text-sm text-slate-300 transition hover:border-gold-500/50"
        >
          Annuler
        </button>
        <span className="text-xs text-slate-500">Ctrl+S enregistre</span>
      </div>
    </form>
  );
}
