"use client";

import { useState } from "react";

/**
 * Aperçu du document officiel (PDF).
 * Le fichier fait plusieurs mégaoctets : il n'est chargé qu'à la demande, et
 * un lien de secours est toujours proposé (navigateurs mobiles, readers, etc.).
 */
export default function PdfPreview({
  src,
  title,
  downloadName,
}: {
  src: string;
  title: string;
  downloadName: string;
}) {
  const [active, setActive] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-night-600 bg-night-800/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-night-600 bg-night-900/60 px-4 py-3">
        <p className="text-sm text-slate-300">
          <span aria-hidden className="mr-2">
            📄
          </span>
          Document officiel — {title}
        </p>
        <div className="flex items-center gap-2">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-night-500 px-3 py-3 text-xs text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200"
          >
            Ouvrir dans un onglet
          </a>
          <a
            href={src}
            download={downloadName}
            className="rounded-md bg-gold-500 px-3 py-3 text-xs font-semibold text-night-950 transition hover:bg-gold-400"
          >
            Télécharger
          </a>
        </div>
      </div>

      {active ? (
        <object data={`${src}#view=FitH`} type="application/pdf" className="h-[75vh] min-h-[420px] w-full">
          <iframe
            src={`${src}#view=FitH`}
            title={title}
            className="h-[75vh] min-h-[420px] w-full"
          />
          <p className="p-6 text-center text-sm text-slate-400">
            Votre navigateur ne peut pas afficher ce PDF.{" "}
            <a href={src} target="_blank" rel="noopener noreferrer" className="text-gold-300 hover:underline">
              Ouvrez-le dans un nouvel onglet
            </a>{" "}
            ou{" "}
            <a href={src} download={downloadName} className="text-gold-300 hover:underline">
              téléchargez-le
            </a>
            .
          </p>
        </object>
      ) : (
        <div className="px-6 py-12 text-center">
          <p aria-hidden className="text-4xl">
            📕
          </p>
          <p className="mt-3 text-sm text-slate-400">
            L&apos;aperçu charge le document à la demande (1,8 Mo) pour ne pas ralentir
            l&apos;affichage.
          </p>
          <button
            type="button"
            onClick={() => setActive(true)}
            className="mt-4 rounded-md bg-gold-500 px-5 py-2.5 text-sm font-semibold text-night-950 transition hover:bg-gold-400"
          >
            Afficher l&apos;aperçu du document
          </button>
        </div>
      )}
    </div>
  );
}
