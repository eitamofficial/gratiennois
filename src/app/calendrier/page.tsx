import type { Metadata } from "next";
import { getServerSession, canWrite } from "@/lib/auth";
import { listEvents } from "@/lib/features";
import PageHeader, { PageShell } from "@/components/PageHeader";
import CalendarForm from "@/components/CalendarForm";

export const metadata: Metadata = {
  title: "Calendrier",
  description: "Dates et anniversaires du Delphinat : institutions, élections, traités, culture.",
};

export const dynamic = "force-dynamic";

const LIBELLES: Record<string, string> = {
  institution: "Institution",
  election: "Élection",
  traite: "Traité",
  culture: "Culture",
  autre: "Autre",
};

export default async function CalendrierPage() {
  const [events, session] = await Promise.all([listEvents(), getServerSession()]);
  const peutEcrire = canWrite(session);

  const parAnnee = new Map<string, typeof events>();
  for (const event of events) {
    const annee = event.date.slice(0, 4);
    const liste = parAnnee.get(annee) ?? [];
    liste.push(event);
    parAnnee.set(annee, liste);
  }

  return (
    <PageShell>
      <PageHeader eyebrow="Repères" icon="🗓️" title="Calendrier du Delphinat">
        <p>
          Les dates qui structurent le récit : entrées en fonction, scrutins,
          traités, commémorations. Une date sans source reste une date — elle
          n&apos;est pas présentée comme certaine pour autant.
        </p>
      </PageHeader>

      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-night-500 p-6 text-sm text-slate-400">
          Aucune date enregistrée.
        </p>
      ) : (
        <div className="space-y-8">
          {[...parAnnee].map(([annee, liste]) => (
            <section key={annee}>
              <h2 className="mb-3 border-b border-night-600 pb-1 font-display text-2xl text-gold-300">
                {annee}
              </h2>
              <ol className="space-y-3">
                {liste.map((event) => (
                  <li key={event.id} className="flex gap-4">
                    <time
                      dateTime={event.date}
                      className="w-24 shrink-0 font-mono text-sm text-bronze-300"
                    >
                      {event.date.slice(5)}
                    </time>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{event.title}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        {LIBELLES[event.kind] ?? event.kind}
                      </p>
                      {event.description && (
                        <p className="mt-1 text-xs text-slate-400">{event.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {peutEcrire && <CalendarForm />}
    </PageShell>
  );
}
