"use client";

import { useId, useRef, useState } from "react";

interface Props {
  /** Chemin public ou URL Discord actuellement enregistrée. */
  value: string | undefined;
  /** Texte alternatif : sert aussi de nom de fichier proposé au téléversement. */
  alt: string;
  /** Rappelée avec le nouveau chemin, ou `""` pour retirer l'illustration. */
  onChange: (url: string) => void;
  /**
   * Rappelée lorsqu'un texte alternatif doit être prérempli. Le serveur
   * **refuse** d'enregistrer une image sans texte alternatif : le proposer
   * automatiquement évite un aller-retour d'erreur pour une contrainte
   * d'accessibilité.
   */
  onSuggestAlt?: (alt: string) => void;
  /** Titre de la rubrique, adapté au contexte. */
  libelle?: string;
}

const FORMAT_LISIBLES: Record<string, string> = {
  png: "PNG",
  jpg: "JPEG",
  gif: "GIF",
  webp: "WebP",
};

/**
 * Sélecteur d'illustration pour la boîte d'informations.
 *
 * Trois façons de remplir la photo, dans l'ordre d'usage réel :
 *
 *   1. **la photo de profil Discord** : c'est le cas le plus fréquent pour une
 *      fiche de personnalité. Elle est relue en direct à chaque visite, donc
 *      elle ne se périme jamais et n'occupe aucun stockage ;
 *   2. **un téléversement** : pour un drapeau, un sceau, une carte. Le fichier
 *      est identifié par ses octets, pas par son nom ;
 *   3. **rien** : l'encadré affiche alors ses données sans image.
 *
 * Retirer l'image n'efface pas le texte : l'encadré reste, simplement sans
 * portrait. C'est ce que produit « Utiliser la photo Discord », qui vide le
 * champ pour laisser la synchronisation reprendre la main.
 */
export default function ImagePicker({
  value,
  alt,
  onChange,
  onSuggestAlt,
  libelle = "Illustration",
}: Props) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  async function televerser(fichier: File) {
    setErreur(null);
    setSucces(null);

    // Contrôle immédiat, pour ne pas envoyer un fichier que le serveur refusera
    // de toute façon : il faut laisser le temps d'afficher un message.
    if (fichier.size > 2 * 1024 * 1024) {
      setErreur("Image trop volumineuse : 2 Mio maximum.");
      return;
    }

    setOccupe(true);
    try {
      const donnees = new FormData();
      donnees.append("image", fichier);
      const reponse = await fetch("/api/images", { method: "POST", body: donnees });
      const corps = (await reponse.json()) as {
        url?: string;
        error?: string;
        width?: number;
        height?: number;
        format?: string;
      };
      if (!reponse.ok || !corps.url) {
        setErreur(corps.error ?? "Le téléversement a échoué.");
        return;
      }
      onChange(corps.url);
      // Le nom de fichier devient le texte alternatif proposé : un rédacteur
      // n'a plus qu'à le reformuler, et l'image n'est jamais enregistrée sans
      // alternative — ce que le serveur refuse.
      if (onSuggestAlt) {
        const sansExt = fichier.name.replace(/\.[A-Za-z0-9]{2,5}$/, "");
        const lisible = sansExt.replace(/[-_]+/g, " ").trim();
        if (lisible) onSuggestAlt(lisible);
      }
      setSucces(
        `Image téléversée (${FORMAT_LISIBLES[corps.format ?? ""] ?? corps.format}${
          corps.width && corps.height ? `, ${corps.width}×${corps.height}` : ""
        }).`,
      );
    } catch {
      setErreur("Le téléversement a échoué : la connexion a été interrompue.");
    } finally {
      setOccupe(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-300">
        {libelle}
      </label>

      <div className="flex items-start gap-4">
        {value ? (
          // `next/image` est volontairement évité : la source peut venir de
          // n'importe quel chemin interne, et un aperçu ne doit pas passer par
          // l'optimiseur du serveur pour se comporter correctement.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-24 w-24 shrink-0 rounded-lg border border-night-500 bg-night-900 object-contain"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-night-500 text-xs text-slate-500"
          >
            Aucune image
          </div>
        )}

        <div className="min-w-0 flex-1">
          <input
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            ref={fileRef}
            disabled={occupe}
            onChange={(event) => {
              const fichier = event.target.files?.[0];
              if (fichier) void televerser(fichier);
            }}
            className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-gold-600 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-night-900 hover:file:bg-gold-500 disabled:opacity-50"
          />

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setErreur(null);
                setSucces("Photo de profil Discord : l'image est relue en direct.");
              }}
              disabled={!value}
              className="rounded-md border border-night-500 px-3 py-2.5 text-sm text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Photo de profil Discord
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setErreur(null);
                  setSucces(null);
                }}
                className="rounded-md border border-night-500 px-3 py-2.5 text-sm text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200"
              >
                Retirer l&apos;image
              </button>
            ) : null}
            {occupe ? (
              <span role="status" className="self-center text-sm text-slate-400">
                Téléversement en cours…
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-xs text-slate-400">
            PNG, JPEG, GIF ou WebP, 2 Mio maximum. Le format est vérifié à partir
            du contenu du fichier, pas de son nom.
          </p>

          {erreur ? (
            <p role="alert" className="mt-2 text-sm text-red-300">
              {erreur}
            </p>
          ) : null}
          {succes ? (
            <p role="status" className="mt-2 text-sm text-emerald-300">
              {succes}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <label
          htmlFor={`${inputId}-url`}
          className="mb-1 block text-xs font-medium text-slate-400"
        >
          Chemin de l&apos;image (modifiable à la main)
        </label>
        <input
          id={`${inputId}-url`}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={alt ? `/uploads/${alt}.webp` : "/flag.webp"}
          className="w-full rounded-md border border-night-500 bg-night-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:border-gold-500/60 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-400">
          Seuls un chemin du site et une photo de profil Discord sont acceptés ;
          toute autre URL est refusée à l&apos;enregistrement.
        </p>
      </div>
    </div>
  );
}
