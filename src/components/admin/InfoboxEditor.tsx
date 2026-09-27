"use client";

import { INFOBOX_MAX_FIELDS } from "@/lib/infobox";
import type { ArticleInfobox, InfoboxField } from "@/lib/types";
import ImagePicker from "@/components/admin/ImagePicker";

interface Props {
  value: ArticleInfobox | undefined;
  onChange: (value: ArticleInfobox | undefined) => void;
}

const inputClass =
  "w-full rounded-md border border-night-500 bg-night-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-gold-500/60 focus:outline-none";

/**
 * Éditeur de la boîte d'informations.
 *
 * L'encadré est facultatif : sans donnée saisies, le site affiche l'infobox
 * automatique (catégorie, rédacteur, dates, versions) construite à partir des
 * métadonnées réelles de l'article. Décrire « aucune donnée » supprime donc
 * l'infobox personnalisée sans effacer l'article.
 */
export default function InfoboxEditor({ value, onChange }: Props) {
  const enabled = value !== undefined;
  const fields = value?.fields ?? [];

  function update(patch: Partial<ArticleInfobox>) {
    onChange({ ...(value ?? { fields: [] }), ...patch });
  }

  function toggle(checked: boolean) {
    if (checked) {
      onChange({
        caption: "",
        imageUrl: "",
        imageAlt: "",
        imageCaption: "",
        footer: "",
        fields: [{ label: "", value: "" }],
      });
    } else {
      onChange(undefined);
    }
  }

  function setField(index: number, patch: Partial<InfoboxField>) {
    const next = fields.map((field, position) =>
      position === index ? { ...field, ...patch } : field,
    );
    update({ fields: next });
  }

  function addField() {
    if (fields.length >= INFOBOX_MAX_FIELDS) return;
    update({ fields: [...fields, { label: "", value: "" }] });
  }

  function removeField(index: number) {
    update({ fields: fields.filter((_, position) => position !== index) });
  }

  function moveField(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    update({ fields: next });
  }

  return (
    <div className="space-y-4">
      {/* Interrupteur : toute la ligne est cliquable (cible tactile confortable)
          et l’état est exposé aux lecteurs d’écran via role="switch". */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => toggle(!enabled)}
        className="flex min-h-[2.75rem] w-full items-center gap-3 rounded-md border border-night-600 px-4 py-3 text-left text-sm text-slate-300 transition hover:border-gold-500/50"
      >
        <span
          aria-hidden="true"
          className={[
            "relative h-6 w-11 shrink-0 rounded-full border transition",
            enabled ? "border-gold-500/60 bg-gold-500/30" : "border-night-500 bg-night-700",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-0.5 h-4 w-4 rounded-full bg-slate-300 transition-all",
              enabled ? "left-[1.4rem]" : "left-0.5",
            ].join(" ")}
          />
        </span>
        <span className="flex-1">Afficher une infobox personnalisée</span>
        <span className="text-xs text-slate-400">
          {enabled ? "activée" : "désactivée — l'encadré automatique reste affiché"}
        </span>
      </button>

      {enabled ? (
        <div className="space-y-4 rounded-lg border border-night-600 bg-night-900/40 p-4">
          <div>
            <label htmlFor="infobox-caption" className="mb-1 block text-sm font-medium text-slate-300">
              Titre de l&apos;encadré
            </label>
            <input
              id="infobox-caption"
              value={value?.caption ?? ""}
              onChange={(event) => update({ caption: event.target.value })}
              maxLength={80}
              placeholder="Texte fondateur, Institution, Commune…"
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <ImagePicker
                value={value?.imageUrl}
                alt={value?.imageAlt ?? ""}
                onChange={(imageUrl) => update({ imageUrl })}
                onSuggestAlt={(imageAlt) => {
                  if (!value?.imageAlt) update({ imageAlt });
                }}
                libelle="Photo ou illustration"
              />
            </div>
            <div>
              <label htmlFor="infobox-image-alt" className="mb-1 block text-sm font-medium text-slate-300">
                Texte alternatif *
              </label>
              <input
                id="infobox-image-alt"
                value={value?.imageAlt ?? ""}
                onChange={(event) => update({ imageAlt: event.target.value })}
                placeholder="Drapeau du IIIe Delphinat de Gratianopolis"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="infobox-image-caption" className="mb-1 block text-sm font-medium text-slate-300">
              Légende de l&apos;illustration
            </label>
            <input
              id="infobox-image-caption"
              value={value?.imageCaption ?? ""}
              onChange={(event) => update({ imageCaption: event.target.value })}
              maxLength={160}
              className={inputClass}
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-medium text-slate-300">
              Données clés ({fields.length}/{INFOBOX_MAX_FIELDS})
            </legend>
            {fields.length === 0 ? (
              <p className="text-xs text-slate-400">
                Aucune donnée saisie : l&apos;encadré n&apos;affichera que la notice automatique.
              </p>
            ) : null}
            {fields.map((field, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-md border border-night-700 bg-night-800/50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
              >
                <input
                  value={field.label}
                  onChange={(event) => setField(index, { label: event.target.value })}
                  maxLength={60}
                  placeholder="Libellé"
                  aria-label={`Libellé de la donnée ${index + 1}`}
                  className={inputClass}
                />
                <input
                  value={field.value}
                  onChange={(event) => setField(index, { value: event.target.value })}
                  maxLength={200}
                  placeholder="Valeur"
                  aria-label={`Valeur de la donnée ${index + 1}`}
                  className={inputClass}
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveField(index, -1)}
                    disabled={index === 0}
                    aria-label={`Monter la donnée ${index + 1}`}
                    className="h-11 w-11 rounded-md border border-night-500 text-sm text-slate-300 transition hover:border-gold-500/50 disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(index, 1)}
                    disabled={index === fields.length - 1}
                    aria-label={`Descendre la donnée ${index + 1}`}
                    className="h-11 w-11 rounded-md border border-night-500 text-sm text-slate-300 transition hover:border-gold-500/50 disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    aria-label={`Supprimer la donnée ${index + 1}`}
                    className="h-11 w-11 rounded-md border border-red-500/40 text-sm text-red-300 transition hover:bg-red-500/10"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addField}
              disabled={fields.length >= INFOBOX_MAX_FIELDS}
              className="inline-flex min-h-[2.75rem] items-center rounded-md border border-night-500 px-4 py-2.5 text-sm text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200 disabled:opacity-40"
            >
              + Ajouter une donnée
            </button>
          </fieldset>

          <div>
            <label htmlFor="infobox-footer" className="mb-1 block text-sm font-medium text-slate-300">
              Mention de bas d&apos;encadré
            </label>
            <input
              id="infobox-footer"
              value={value?.footer ?? ""}
              onChange={(event) => update({ footer: event.target.value })}
              maxLength={200}
              placeholder="Source : Constitution.pdf, article P-1."
              className={inputClass}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
