/**
 * Anti-raid.
 *
 * Un raid, c'est beaucoup de comptes qui arrivent en même temps, avec des
 * pseudos qui se ressemblent, et qui parlent tous en même temps. Le bot en
 * cherche **un** signe à la fois — la vitesse d'arrivée — parce que c'est le
 * seul qui ne dépende d'aucun signal extérieur.
 *
 * Le seuil est propre à chaque serveur, et le verrouillage déclenché est
 * réversible : un raid qui s'essouffle ne laisse pas le serveur fermé. Le
 * bot ne banni personne tout seul, même quand la configuration l'y autorise :
 * il le peut, et c'est précisément pour cela qu'il ne le fait pas.
 */

import type { GuildMember } from "discord.js";
import type { Delphinabot } from "../client.js";
import type { ReglagesServeur } from "../db/serveur.js";
import { journal } from "../logger.js";
import { journaliser } from "../db/journal.js";
import { verrouiller } from "./securite/verrou.js";

/** Résultat de l'analyse d'une arrivée. */
export interface Verdict {
  /** Le serveur vient d'être verrouillé à cause de cette arrivée. */
  verrouillage: boolean;
  /** Nombre d'arrivées observées dans la fenêtre. */
  arrivees: number;
  /** Rôle de quarantaine attribué. */
  quarantaine: boolean;
  /** Rôle d'accueil automatique attribué. */
  accueil: boolean;
}

/**
 * Analyse l'arrivée d'un membre et applique la réaction adaptée.
 *
 * L'ordre est important : on compte d'abord, on verrouille si le seuil est
 * franchi, et seulement ensuite on décide du rôle. Verrouiller après avoir
 * distribué le rôle d'accueil laisserait un membre sur deux hors du
 * verrouillage, ce qui n'est pas un verrouillage.
 */
export async function surArrivee(
  bot: Delphinabot,
  membre: GuildMember,
  serveur: ReglagesServeur,
): Promise<Verdict> {
  const arrivees = bot.arrivees.ajouter(
    membre.guild.id,
    Math.max(2, serveur.raidFenetreSecondes) * 1000,
  );

  let verrouillage = false;
  if (serveur.antiRaid && !serveur.verrouille && arrivees >= serveur.raidSeuil) {
    const resultat = await verrouiller(
      membre.guild,
      bot.user?.id ?? membre.id,
      `Raid détecté : ${arrivees} arrivées en ${serveur.raidFenetreSecondes} secondes.`,
    );
    verrouillage = resultat.ok;
    if (verrouillage) {
      await journaliser({
        serveurId: membre.guild.id,
        type: "raid",
        utilisateurId: null,
        cibleId: membre.id,
        details: { arrivees, seuil: serveur.raidSeuil },
      });
    }
  }

  let quarantaine = false;
  if (serveur.verrouille && serveur.roleQuarantaine) {
    quarantaine = await attribuer(membre, serveur.roleQuarantaine, "Quarantaine (verrouillage)");
  }

  let accueil = false;
  if (!serveur.verrouille && serveur.roleAutomatique && !quarantaine) {
    accueil = await attribuer(membre, serveur.roleAutomatique, "Rôle d'accueil automatique");
  }

  return { verrouillage, arrivees, quarantaine, accueil };
}

/** Attribue un rôle sans jamais faire échouer l'appelant. */
async function attribuer(membre: GuildMember, roleId: string, raison: string): Promise<boolean> {
  try {
    const role = membre.guild.roles.cache.get(roleId);
    if (!role) {
      journal.warn(`Rôle ${roleId} introuvable sur ${membre.guild.id}.`);
      return false;
    }
    if (membre.roles.highest.position >= role.position) return false;
    if (role.position >= (membre.guild.members.me?.roles.highest.position ?? 0)) return false;
    await membre.roles.add(role, raison);
    return true;
  } catch (erreurRevue) {
    journal.warn(`Rôle ${roleId} non attribué à ${membre.id} : ${erreurRevue}`);
    return false;
  }
}

/**
 * Compte les comptes récemment créés parmi un lot d'arrivées.
 *
 * Utilisé par `/audit` et par l'alerte : un raid se reconnaît aussi à une
 * nuée de comptes nés le jour même.
 */
export function comptesRecents(membres: GuildMember[], jours = 7): number {
  const limite = Date.now() - jours * 86_400_000;
  return membres.filter((membre) => membre.user.createdTimestamp > limite).length;
}
