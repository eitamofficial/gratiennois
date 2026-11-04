"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-slate-400 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
    >
      Imprimer
    </button>
  );
}
