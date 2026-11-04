import type { Metadata } from "next";
import { getServerSession, canWrite } from "@/lib/auth";
import { listPolls, pollResults } from "@/lib/features";
import PageHeader, { PageShell } from "@/components/PageHeader";
import PollForm from "@/components/PollForm";
import PollVote from "@/components/PollVote";

export const metadata: Metadata = {
  title: "Sondages",
  description: "Consultations ouvertes aux contributeurs du wiki.",
};

export const dynamic = "force-dynamic";

export default async function SondagesPage() {
  const [polls, session] = await Promise.all([listPolls(), getServerSession()]);
  const peutEcrire = canWrite(session);

  const avecResultats = await Promise.all(
    polls.map(async (poll) => ({ poll, results: await pollResults(poll.id) })),
  );

  return (
    <PageShell>
      <PageHeader eyebrow="Consultations" icon="🗳️" title="Sondages">
        <p>
          Un sondage n&apos;est pas un vote de l&apos;Assemblée : c&apos;est un
          avis consultatif, affiché avec ses résultats bruts. Le nombre de
          participants est toujours visible — un « 100 % » sur deux voix ne veut
          pas dire la même chose que sur vingt.
        </p>
      </PageHeader>

      {avecResultats.length === 0 ? (
        <p className="rounded-xl border border-dashed border-night-500 p-6 text-sm text-slate-400">
          Aucun sondage en cours.
        </p>
      ) : (
        <ul className="space-y-4">
          {avecResultats.map(({ poll, results }) => {
            const total = Object.values(results).reduce((somme, valeur) => somme + valeur, 0);
            return (
              <li key={poll.id} className="rounded-xl border border-night-600 bg-night-800/40 p-4">
                <h2 className="font-display text-lg text-gold-200">{poll.question}</h2>
                <p className="text-[11px] text-slate-500">
                  ouvert par {poll.createdBy} · {total} participation{total > 1 ? "s" : ""}
                </p>
                <ul className="mt-3 space-y-2">
                  {poll.options.map((option) => {
                    const voix = results[option] ?? 0;
                    const pourcentage = total > 0 ? Math.round((voix / total) * 100) : 0;
                    return (
                      <li key={option}>
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>{option}</span>
                          <span className="text-slate-500">
                            {voix} · {pourcentage} %
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-night-700">
                          <div
                            className="h-full rounded-full bg-gold-500/70"
                            style={{ width: `${pourcentage}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {session && <PollVote pollId={poll.id} options={poll.options} />}
              </li>
            );
          })}
        </ul>
      )}

      {peutEcrire && <PollForm />}
    </PageShell>
  );
}
