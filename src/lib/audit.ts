import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { isEphemeralRuntime } from "./store/environment";
import { requestContext } from "./request-context";
import { COULEUR, journaliser, type LogEmbed } from "./discord-log";
import { ROLE_INFO, type UserRole } from "./types";

/**
 * Journal d'audit des actions du wiki.
 *
 * Il répond à une question que le wiki ne savait pas trancher : « qui a fait
 * quoi, quand, et d'où ? ». Deux destinations, deux usages :
 *
 *   - un fichier JSON Lines dans `data/`, qui reste sur la tablette et survit
 *     à une coupure réseau — c'est la trace qu'on relit après coup ;
 *   - un salon Discord, qui prévient en direct — c'est la trace qu'on voit.
 *
 * **Aucun secret n'y est écrit** : ni mot de passe, ni jeton, ni code OAuth. Le
 * journal dit qu'une action a eu lieu, pas avec quoi.
 */

const AUDIT_FILE = path.join(process.cwd(), "data", "audit-connexions.jsonl");

export type AuditEvent =
  | "connexion-reussie"
  | "connexion-refusee"
  | "deconnexion"
  | "quota-depasse"
  | "article-cree"
  | "article-modifie"
  | "article-supprime"
  | "revision-restauree"
  | "commentaire-publie"
  | "commentaire-supprime"
  | "synchronisation"
  | "jeu-de-donnees"
  | "proposition-publiee";

interface Presentation {
  libelle: string;
  icone: string;
  couleur: number;
}

const PRESENTATION: Record<AuditEvent, Presentation> = {
  "connexion-reussie": { libelle: "Connexion réussie", icone: "🔓", couleur: COULEUR.connexion },
  "connexion-refusee": { libelle: "Connexion refusée", icone: "⛔", couleur: COULEUR.refus },
  deconnexion: { libelle: "Déconnexion", icone: "🚪", couleur: COULEUR.neutre },
  "quota-depasse": { libelle: "Quota dépassé", icone: "🚦", couleur: COULEUR.refus },
  "article-cree": { libelle: "Article créé", icone: "🆕", couleur: COULEUR.creation },
  "article-modifie": { libelle: "Article modifié", icone: "✏️", couleur: COULEUR.modification },
  "article-supprime": { libelle: "Article supprimé", icone: "🗑️", couleur: COULEUR.suppression },
  "revision-restauree": { libelle: "Version restaurée", icone: "↩️", couleur: COULEUR.modification },
  "commentaire-publie": { libelle: "Commentaire publié", icone: "💬", couleur: COULEUR.neutre },
  "commentaire-supprime": { libelle: "Commentaire supprimé", icone: "🧹", couleur: COULEUR.neutre },
  synchronisation: { libelle: "Synchronisation Discord", icone: "🔄", couleur: COULEUR.neutre },
  "jeu-de-donnees": { libelle: "Installation du jeu de données", icone: "📦", couleur: COULEUR.neutre },
  "proposition-publiee": { libelle: "Proposition publiée", icone: "🤖", couleur: COULEUR.creation },
};

export interface AuditEntry {
  at: string;
  event: AuditEvent;
  /** Identité concernée, si elle est connue. */
  username?: string;
  /** Moyen utilisé : `local` (identifiant du wiki) ou `discord`. */
  provider?: string;
  role?: string;
  /** Adresse vue par le serveur, toutes familles confondues. */
  ip?: string;
  ipv4?: string;
  ipv6?: string;
  /** Chaîne `X-Forwarded-For` complète, si plusieurs sauts. */
  chain?: string;
  userAgent?: string;
  path?: string;
  /** Précision libre, courte : raison du refus, slug commenté… */
  detail?: string;
  /** Titre de la page concernée, pour un journal lisible. */
  article?: string;
}

function heureLisible(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "Europe/Paris",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Traduit une charge technique en libellé constitutionnel. */
function libelleCharge(role: string | undefined): string {
  if (!role) return "—";
  const info = ROLE_INFO[role as UserRole];
  return info ? info.label : role;
}

/** Compose l'embed Discord correspondant à une entrée d'audit. */
function versEmbed(entry: AuditEntry): LogEmbed {
  const presentation = PRESENTATION[entry.event];

  const champs: Array<{ name: string; value: string; inline: boolean }> = [
    { name: "Compte", value: entry.username || "—", inline: true },
    { name: "Charge", value: libelleCharge(entry.role), inline: true },
    {
      name: "Moyen",
      value:
        entry.provider === "discord"
          ? "Discord (OAuth2)"
          : entry.provider === "local"
            ? "Identifiant du wiki"
            : "—",
      inline: true,
    },
    // Les trois adresses demandées. Une connexion n'a qu'une famille à la fois :
    // celle qui n'est pas utilisée reste à « — », et c'est normal.
    { name: "IPv4", value: entry.ipv4 || "—", inline: true },
    { name: "IPv6", value: entry.ipv6 || "—", inline: true },
    { name: "IP publique", value: entry.ip || "—", inline: true },
  ];

  if (entry.chain && entry.chain.includes(",")) {
    champs.push({ name: "Chaîne X-Forwarded-For", value: entry.chain, inline: false });
  }

  champs.push({ name: "Date", value: heureLisible(entry.at), inline: true });

  if (entry.path) {
    champs.push({ name: "Page", value: `\`${entry.path}\``, inline: true });
  }

  if (entry.userAgent) {
    champs.push({ name: "Navigateur", value: entry.userAgent, inline: false });
  }

  return {
    title: `${presentation.icone} ${presentation.libelle}${
      entry.article ? ` — ${entry.article}` : ""
    }`,
    description: entry.detail || undefined,
    fields: champs,
    color: presentation.couleur,
  };
}

/**
 * Écrit une ligne d'audit, sur disque et dans le salon Discord.
 *
 * L'échec d'écriture est avalé volontairement : un disque plein ne doit pas
 * empêcher quelqu'un de se connecter. Le journal est un témoin, pas un verrou.
 */
export async function audit(entry: Omit<AuditEntry, "at">): Promise<void> {
  const complet: AuditEntry = { at: new Date().toISOString(), ...entry };

  // Discord d'abord : c'est de l'ordre de la notification, et l'appel ne bloque
  // pas (mise en file interne).
  journaliser(versEmbed(complet));

  if (isEphemeralRuntime()) return;

  try {
    await mkdir(path.dirname(AUDIT_FILE), { recursive: true });
    await appendFile(AUDIT_FILE, `${JSON.stringify(complet)}\n`, "utf8");
  } catch {
    // Voir plus haut : le journal ne bloque jamais l'action qu'il décrit.
  }
}

/**
 * Variante pour les routes HTTP : complète l'entrée avec l'adresse, la famille
 * d'adresse et le navigateur, extraits de la requête.
 */
export async function auditFromRequest(
  request: Request,
  entry: Omit<AuditEntry, "at" | "ip" | "ipv4" | "ipv6" | "chain" | "userAgent">,
): Promise<void> {
  const contexte = requestContext(request);
  await audit({
    ...entry,
    ip: contexte.ip,
    ipv4: contexte.ipv4,
    ipv6: contexte.ipv6,
    chain: contexte.chain,
    userAgent: contexte.userAgent,
    path: entry.path ?? contexte.path,
  });
}
