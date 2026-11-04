"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Connexion en deux temps.
 *
 * Le mot de passe seul n'ouvre plus de session : il déclenche l'envoi d'un code
 * par MP Discord, et c'est ce code qui termine la connexion. Trois écrans se
 * succèdent donc — identifiants, code, secours — et l'état vit ici plutôt que
 * dans trois pages, pour qu'un retour en arrière ne laisse pas de formulaire
 * orphelin.
 *
 * Le code de secours n'est proposé qu'en cas d'échec d'envoi : le laisser
 * visible en permanence inviterait à contourner l'A2F par confort.
 */

type Etape = "identifiants" | "code" | "secours";

export default function LoginForm({ discord = false }: { discord?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // `next` vient de l'URL : sans contrôle, `/connexion?next=https://exemple.test`
  // transformerait la page de connexion en tremplin vers un site tiers, avec le
  // nom du wiki comme caution. On n'accepte qu'un chemin interne.
  const demande = searchParams.get("next") ?? "";
  const nextPath =
    demande.startsWith("/") && !demande.startsWith("//") && !demande.startsWith("/\\")
      ? demande
      : "/admin";

  const [etape, setEtape] = useState<Etape>("identifiants");
  // Un retour d'OAuth arrive avec `?erreur=…` : sans ce décodage, le visiteur
  // revoyait le formulaire vide, sans savoir pourquoi sa connexion Discord
  // avait échoué.
  const [error, setError] = useState<string | null>(() => {
    const code = searchParams.get("erreur");
    if (!code) return null;
    const messages: Record<string, string> = {
      // Codes renvoyés par /api/auth/discord (départ).
      discord_indisponible: "La connexion Discord n'est pas configurée sur ce serveur.",
      trop_de_tentatives: "Trop de tentatives. Réessayez dans quelques minutes.",
      // Codes renvoyés par /api/auth/discord/callback (retour).
      refus: "Vous avez annulé l'autorisation Discord.",
      session_expiree: "Le parcours a expiré. Recommencez la connexion.",
      state_invalide: "Vérification de sécurité échouée. Recommencez la connexion.",
      echange_refuse: "Discord a refusé l'échange du code. Vérifiez l'identifiant et le secret de l'application.",
      secret_manquant: "Le secret client Discord n'est pas configuré sur ce serveur.",
      profil_illisible: "Le profil Discord n'a pas pu être lu. Réessayez.",
      acces_refuse: "Ce compte Discord n'a pas de charge sur le wiki.",
    };
    return messages[code] ?? "La connexion a échoué. Réessayez.";
  });
  const [pending, setPending] = useState(false);

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [expireDans, setExpireDans] = useState(0);
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");

  const champCode = useRef<HTMLInputElement>(null);

  // Compte à rebours : le code meurt au bout de cinq minutes, et l'afficher
  // évite de laisser l'utilisateur saisir un code déjà périmé.
  useEffect(() => {
    if (etape !== "code" || expireDans <= 0) return;
    const minuteur = setInterval(() => setExpireDans((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(minuteur);
  }, [etape, expireDans]);

  useEffect(() => {
    if (etape === "code") champCode.current?.focus();
  }, [etape]);

  function terminer() {
    router.replace(nextPath.startsWith("/") ? nextPath : "/admin");
    router.refresh();
  }

  async function poster(url: string, corps: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    const data = await response.json().catch(() => null);
    return { response, data } as {
      response: Response;
      data: (Record<string, unknown> & { error?: string; code?: string }) | null;
    };
  }

  // --- Étape 1 : identifiants -------------------------------------------------

  async function soumettreIdentifiants(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const utilisateur = String(formData.get("username") ?? "");
    const secret = String(formData.get("password") ?? "");

    try {
      const { response, data } = await poster("/api/auth/login", {
        username: utilisateur,
        password: secret,
      });

      if (response.ok) {
        if (data?.twoFactor === true) {
          setIdentifiant(utilisateur);
          setMotDePasse(secret);
          setChallengeId(String(data.challengeId ?? ""));
          setExpireDans(Number(data.expiresInSeconds ?? 300));
          setEtape("code");
          return;
        }
        terminer();
        return;
      }

      // L'échec d'envoi du MP n'est pas une erreur d'identifiants : on propose
      // le code de secours plutôt que de laisser l'utilisateur bloqué.
      if (data?.code === "dm_echec") {
        setIdentifiant(utilisateur);
        setMotDePasse(secret);
        setEtape("secours");
      }

      setError(data?.error ?? "Connexion impossible.");
    } catch {
      setError("Erreur réseau — réessayez.");
    } finally {
      setPending(false);
    }
  }

  // --- Étape 2 : code reçu en MP ---------------------------------------------

  async function soumettreCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("code") ?? "").replace(/\s+/g, "");

    try {
      const { response, data } = await poster("/api/auth/verify-2fa", {
        challengeId,
        code,
      });
      if (response.ok) {
        terminer();
        return;
      }
      setError(data?.error ?? "Code refusé.");
      if (data?.code === "inconnu" || data?.code === "expire") {
        setEtape("identifiants");
        setChallengeId(null);
      }
    } catch {
      setError("Erreur réseau — réessayez.");
    } finally {
      setPending(false);
    }
  }

  // --- Secours ----------------------------------------------------------------

  async function soumettreSecours(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    try {
      const { response, data } = await poster("/api/auth/recovery", {
        username: String(formData.get("username") ?? identifiant),
        password: String(formData.get("password") ?? motDePasse),
        code: String(formData.get("recovery") ?? ""),
      });
      if (response.ok) {
        terminer();
        return;
      }
      setError(data?.error ?? "Code de secours refusé.");
    } catch {
      setError("Erreur réseau — réessayez.");
    } finally {
      setPending(false);
    }
  }

  // --- Rendu ------------------------------------------------------------------

  const champ =
    "w-full rounded-md border border-night-500 bg-night-800 px-3 py-2.5 text-sm text-slate-100 focus:border-gold-500/60 focus:outline-none";
  const bouton =
    "w-full rounded-md bg-gold-500 px-4 py-2.5 text-sm font-semibold text-night-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-60";

  const alerte = error && (
    <p
      role="alert"
      className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
    >
      {error}
    </p>
  );

  if (etape === "code") {
    return (
      <form onSubmit={soumettreCode} className="space-y-5">
        <div className="rounded-md border border-gold-500/30 bg-gold-500/5 px-3 py-2.5 text-sm text-gold-100">
          Un code à six chiffres vient d&apos;être envoyé en message privé
          Discord. Il expire dans{" "}
          <strong>
            {Math.floor(expireDans / 60)}:
            {String(expireDans % 60).padStart(2, "0")}
          </strong>
          .
        </div>

        {alerte}

        <div>
          <label htmlFor="code" className="mb-1 block text-sm font-medium text-slate-300">
            Code de vérification
          </label>
          <input
            ref={champCode}
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            placeholder="000000"
            className={`${champ} text-center text-2xl tracking-[0.5em]`}
          />
        </div>

        <button type="submit" disabled={pending} className={bouton}>
          {pending ? "Vérification…" : "Valider le code"}
        </button>

        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <button
            type="button"
            className="text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
            onClick={() => {
              setEtape("identifiants");
              setChallengeId(null);
              setError(null);
            }}
          >
            Recommencer
          </button>
          <button
            type="button"
            className="text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
            onClick={() => {
              setEtape("secours");
              setError(null);
            }}
          >
            Pas reçu le message ?
          </button>
        </div>
      </form>
    );
  }

  if (etape === "secours") {
    return (
      <form onSubmit={soumettreSecours} className="space-y-5">
        <div className="rounded-md border border-night-600 bg-night-800/60 px-3 py-2.5 text-sm text-slate-300">
          Connexion par <strong>code de secours</strong>. Il ne fonctionne que si
          les messages privés Discord sont inaccessibles.
        </div>

        {alerte}

        <div>
          <label htmlFor="username-secours" className="mb-1 block text-sm font-medium text-slate-300">
            Identifiant
          </label>
          <input
            id="username-secours"
            name="username"
            type="text"
            autoComplete="username"
            defaultValue={identifiant}
            required
            className={champ}
          />
        </div>

        <div>
          <label htmlFor="password-secours" className="mb-1 block text-sm font-medium text-slate-300">
            Mot de passe
          </label>
          <input
            id="password-secours"
            name="password"
            type="password"
            autoComplete="current-password"
            defaultValue={motDePasse}
            required
            className={champ}
          />
        </div>

        <div>
          <label htmlFor="recovery" className="mb-1 block text-sm font-medium text-slate-300">
            Code de secours
          </label>
          <input
            id="recovery"
            name="recovery"
            type="password"
            autoComplete="off"
            required
            className={champ}
          />
        </div>

        <button type="submit" disabled={pending} className={bouton}>
          {pending ? "Vérification…" : "Se connecter"}
        </button>

        <button
          type="button"
          className="w-full text-sm text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          onClick={() => {
            setEtape("identifiants");
            setError(null);
          }}
        >
          Revenir à la connexion normale
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={soumettreIdentifiants} className="space-y-5">
      {alerte}

      <div>
        <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-300">
          Identifiant
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          className={champ}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-300">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={champ}
        />
      </div>

      <button type="submit" disabled={pending} className={bouton}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>

      {/* Connexion Discord : proposée seulement si le serveur a un identifiant
          et un secret d'application. Sinon le bouton mènerait à une erreur, ce
          qui est pire que de ne pas l'afficher. */}
      {discord && (
        <>
          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-night-500" />
            <span className="text-[11px] uppercase tracking-wide text-slate-500">ou</span>
            <span className="h-px flex-1 bg-night-500" />
          </div>
          <a
            href={`/api/auth/discord?next=${encodeURIComponent(nextPath)}`}
            className="block w-full rounded-md border border-[#5865F2]/60 bg-[#5865F2]/15 px-4 py-2.5 text-center text-sm font-medium text-[#c7ccff] transition hover:bg-[#5865F2]/25"
          >
            Continuer avec Discord
          </a>
        </>
      )}

      <p className="text-xs leading-relaxed text-slate-500">
        Une double authentification par message privé Discord protège les comptes
        d&apos;édition. Aucun code n&apos;est demandé aux simples lecteurs.
      </p>
    </form>
  );
}
