/**
 * Économie du Delphinat.
 *
 * La monnaie est le **ducat**. On en gagne en travaillant, en passant
 * quotidiennement, et par la générosité de l'administration ; on en dépense
 * dans la boutique. Deux règles rendent ce système tenable :
 *
 *  - **aucun solde négatif** : un débit impossible est refusé explicitement,
 *    jamais appliqué en silence ;
 *  - **l'épargne est un abri** : elle ne peut être ni dépensée directement ni
 *    taxée ; il faut la retirer d'abord. C'est ce qui donne un sens au verbe
 *    « épargner ».
 *
 * La boutique vit dans `ressources/marche.json` : prix et descriptions s'y
 * modifient sans toucher au code.
 */

import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { attention, champs, information, or, succes } from "../lib/embres.js";
import { formaterDuree } from "../lib/duree.js";
import { article, boutique, genererDecret } from "../lib/ressources.js";
import { PRIME, TRAVAIL } from "../stockage.js";
import { ErreurUtilisateur } from "./erreurs.js";
import { journaliser } from "./moderation.js";
import { nomDe } from "./outils.js";

/** Pluriel du ducat. */
function ducats(montant) {
  return `${montant} ducat${Math.abs(montant) > 1 ? "s" : ""}`;
}

/** Refuse proprement quand l'administration n'est pas là pour autoriser. */
function exigerAdministration(interaction) {
  const permis = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
  if (!permis) throw new ErreurUtilisateur("Cette commande est réservée à l'administration du serveur.");
}

const cmdSolde = {
  nom: "solde",
  categorie: "économie",
  resume: "Affiche la fortune d'un membre.",
  donnees: new SlashCommandBuilder()
    .setName("solde")
    .setDescription("Affiche votre solde, ou celui d'un autre membre.")
    .addUserOption((option) => option.setName("membre").setDescription("Le membre (vous par défaut)")),
  async executer(interaction, contexte) {
    const membre = interaction.options.getMember("membre") ?? interaction.member;
    const fiche = contexte.stockage.membre(interaction.guildId, membre.id);
    const total = fiche.ducats + fiche.epargne;

    await interaction.reply({
      embeds: [
        information(
          champs([
            ["En poche", ducats(fiche.ducats)],
            ["À l'épargne", ducats(fiche.epargne)],
            ["Total", ducats(total)],
            ["Prochain travail", fiche.dernierTravail ? formaterDuree(Math.max(0, TRAVAIL.delai - (Date.now() - fiche.dernierTravail))) : "disponible"],
          ])
            .map((champ) => `**${champ.name} :** ${champ.value}`)
            .join("\n"),
          `Fortune de ${nomDe(membre)}`,
        ).setThumbnail(membre.displayAvatarURL?.({ size: 128 }) ?? null),
      ],
    });
  },
};

const cmdClassementDucats = {
  nom: "classement-ducats",
  categorie: "économie",
  resume: "Affiche les plus grosses fortunes du serveur.",
  donnees: new SlashCommandBuilder()
    .setName("classement-ducats")
    .setDescription("Affiche les dix plus grosses fortunes du serveur."),
  async executer(interaction, contexte) {
    const premiers = contexte.stockage.classementDucats(interaction.guildId, 10);

    if (premiers.length === 0) {
      await interaction.reply({ embeds: [attention("Personne n'a encore de ducats.", "Trésor vide")] });
      return;
    }

    const medailles = ["🥇", "🥈", "🥉"];
    await interaction.reply({
      embeds: [
        information(
          premiers
            .map(
              (element, index) =>
                `${medailles[index] ?? `**${index + 1}.**`} <@${element.membreId}> — **${ducats(element.total)}** (poche ${element.ducats}, épargne ${element.epargne})`,
            )
            .join("\n"),
          "Fortune du Delphinat",
        ),
      ],
    });
  },
};

const cmdTravailler = {
  nom: "travailler",
  categorie: "économie",
  resume: "Gagne des ducats en travaillant.",
  detail: `Une fois toutes les ${formaterDuree(TRAVAIL.delai)}, pour ${TRAVAIL.montant} ducats.`,
  donnees: new SlashCommandBuilder().setName("travailler").setDescription("Travaille pour gagner des ducats."),
  async executer(interaction, contexte) {
    const fiche = contexte.stockage.membre(interaction.guildId, interaction.user.id);
    const ecoule = Date.now() - fiche.dernierTravail;

    if (ecoule < TRAVAIL.delai) {
      throw new ErreurUtilisateur(
        `Vous avez déjà travaillé. Reposez-vous encore **${formaterDuree(TRAVAIL.delai - ecoule)}**.`,
      );
    }

    fiche.dernierTravail = Date.now();
    contexte.stockage.enregistrerMembre(interaction.guildId, interaction.user.id, fiche);
    const apres = contexte.stockage.crediter(interaction.guildId, interaction.user.id, TRAVAIL.montant);

    await interaction.reply({
      embeds: [
        succes(
          `Votre journée de travail vous rapporte **${ducats(TRAVAIL.montant)}**.\n**Nouveau solde :** ${ducats(apres.ducats)}`,
          "Travail accompli",
        ),
      ],
    });
  },
};

const cmdRecompense = {
  nom: "recompense",
  categorie: "économie",
  resume: "Réclame la prime quotidienne du Delphinat.",
  detail: `Une fois toutes les ${formaterDuree(PRIME.delai)}, pour ${PRIME.montant} ducats.`,
  donnees: new SlashCommandBuilder().setName("recompense").setDescription("Réclame votre prime quotidienne."),
  async executer(interaction, contexte) {
    const fiche = contexte.stockage.membre(interaction.guildId, interaction.user.id);
    const ecoule = Date.now() - fiche.dernierePrime;

    if (ecoule < PRIME.delai) {
      throw new ErreurUtilisateur(
        `Votre prime a déjà été versée. Revenez dans **${formaterDuree(PRIME.delai - ecoule)}**.`,
      );
    }

    fiche.dernierePrime = Date.now();
    contexte.stockage.enregistrerMembre(interaction.guildId, interaction.user.id, fiche);
    const apres = contexte.stockage.crediter(interaction.guildId, interaction.user.id, PRIME.montant);

    await interaction.reply({
      embeds: [
        succes(
          `La prime du jour vous est versée : **${ducats(PRIME.montant)}**.\n**Nouveau solde :** ${ducats(apres.ducats)}`,
          "Prime versée",
        ),
      ],
    });
  },
};

const cmdEpargner = {
  nom: "epargner",
  categorie: "économie",
  resume: "Met des ducats de côté, à l'abri.",
  donnees: new SlashCommandBuilder()
    .setName("epargner")
    .setDescription("Dépose des ducats à l'épargne.")
    .addIntegerOption((option) =>
      option.setName("montant").setDescription("Somme à déposer").setRequired(true).setMinValue(1),
    ),
  async executer(interaction, contexte) {
    const montant = interaction.options.getInteger("montant", true);
    const debit = contexte.stockage.debiter(interaction.guildId, interaction.user.id, montant);
    if (!debit) throw new ErreurUtilisateur("Vous n'avez pas assez de ducats en poche.");

    const fiche = contexte.stockage.crediter(interaction.guildId, interaction.user.id, montant, { epargne: true });

    await interaction.reply({
      embeds: [
        succes(
          `**${ducats(montant)}** déposés à l'épargne.\n**Poche :** ${ducats(fiche.ducats)} · **Épargne :** ${ducats(fiche.epargne)}`,
          "Épargne",
        ),
      ],
    });
  },
};

const cmdRetirerEpargne = {
  nom: "retirer-epargne",
  categorie: "économie",
  resume: "Retire des ducats de l'épargne.",
  donnees: new SlashCommandBuilder()
    .setName("retirer-epargne")
    .setDescription("Retire des ducats de votre épargne.")
    .addIntegerOption((option) =>
      option.setName("montant").setDescription("Somme à retirer").setRequired(true).setMinValue(1),
    ),
  async executer(interaction, contexte) {
    const montant = interaction.options.getInteger("montant", true);
    const fiche = contexte.stockage.membre(interaction.guildId, interaction.user.id);

    if (fiche.epargne < montant) throw new ErreurUtilisateur("Votre épargne est inférieure à cette somme.");

    fiche.epargne -= montant;
    contexte.stockage.enregistrerMembre(interaction.guildId, interaction.user.id, fiche);
    const apres = contexte.stockage.crediter(interaction.guildId, interaction.user.id, montant);

    await interaction.reply({
      embeds: [
        succes(
          `**${ducats(montant)}** retirés de l'épargne.\n**Poche :** ${ducats(apres.ducats)} · **Épargne :** ${ducats(apres.epargne)}`,
          "Retrait d'épargne",
        ),
      ],
    });
  },
};

const cmdTransferer = {
  nom: "transferer",
  categorie: "économie",
  resume: "Transfère des ducats à un autre membre.",
  donnees: new SlashCommandBuilder()
    .setName("transferer")
    .setDescription("Transfère des ducats à un membre.")
    .addUserOption((option) => option.setName("membre").setDescription("Le destinataire").setRequired(true))
    .addIntegerOption((option) =>
      option.setName("montant").setDescription("Somme à transférer").setRequired(true).setMinValue(1),
    ),
  async executer(interaction, contexte) {
    const cible = interaction.options.getUser("membre", true);
    const montant = interaction.options.getInteger("montant", true);

    if (cible.bot) throw new ErreurUtilisateur("Les bots n'ont pas de bourse.");
    if (cible.id === interaction.user.id) throw new ErreurUtilisateur("Se transférer des ducats à soi-même ne change rien.");

    const debit = contexte.stockage.debiter(interaction.guildId, interaction.user.id, montant);
    if (!debit) throw new ErreurUtilisateur("Vous n'avez pas assez de ducats en poche.");

    const recu = contexte.stockage.crediter(interaction.guildId, cible.id, montant);

    await interaction.reply({
      embeds: [
        succes(
          `**${ducats(montant)}** transférés à <@${cible.id}>.\n**Votre solde :** ${ducats(debit.ducats)} · **Son solde :** ${ducats(recu.ducats)}`,
          "Transfert",
        ),
      ],
    });
  },
};

const cmdDonner = {
  nom: "donner",
  categorie: "économie",
  resume: "Crédite un membre (administration).",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ManageGuild,
  donnees: new SlashCommandBuilder()
    .setName("donner")
    .setDescription("Crédite des ducats à un membre.")
    .addUserOption((option) => option.setName("membre").setDescription("Le bénéficiaire").setRequired(true))
    .addIntegerOption((option) =>
      option.setName("montant").setDescription("Somme à créditer").setRequired(true).setMinValue(1),
    )
    .addStringOption((option) => option.setName("motif").setDescription("Motif du versement").setMaxLength(200)),
  async executer(interaction, contexte) {
    exigerAdministration(interaction);
    const cible = interaction.options.getUser("membre", true);
    const montant = interaction.options.getInteger("montant", true);
    const motif = interaction.options.getString("motif") ?? "versement administratif";

    const fiche = contexte.stockage.crediter(interaction.guildId, cible.id, montant);

    await interaction.reply({
      embeds: [
        succes(
          `**${ducats(montant)}** versés à <@${cible.id}>.\n**Motif :** ${motif}\n**Nouveau solde :** ${ducats(fiche.ducats)}`,
          "Versement",
        ),
      ],
    });
    await journaliser(
      contexte,
      interaction,
      information(
        `**Bénéficiaire :** ${cible.tag}\n**Montant :** ${ducats(montant)}\n**Motif :** ${motif}\n**Par :** ${interaction.user.tag}`,
        "Versement de ducats",
      ),
    );
  },
};

const cmdTaxer = {
  nom: "taxer",
  categorie: "économie",
  resume: "Prélève des ducats à un membre (administration).",
  detail: "La taxe porte sur la poche : l'épargne n'est jamais saisie sans un retrait explicite.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ManageGuild,
  donnees: new SlashCommandBuilder()
    .setName("taxer")
    .setDescription("Prélève des ducats sur la poche d'un membre.")
    .addUserOption((option) => option.setName("membre").setDescription("Le contribuable").setRequired(true))
    .addIntegerOption((option) =>
      option.setName("montant").setDescription("Somme à prélever").setRequired(true).setMinValue(1),
    )
    .addStringOption((option) => option.setName("motif").setDescription("Motif de la taxe").setMaxLength(200)),
  async executer(interaction, contexte) {
    exigerAdministration(interaction);
    const cible = interaction.options.getUser("membre", true);
    const montant = interaction.options.getInteger("montant", true);
    const motif = interaction.options.getString("motif") ?? "taxe du Delphinat";

    const fiche = contexte.stockage.membre(interaction.guildId, cible.id);
    if (fiche.ducats < montant) {
      throw new ErreurUtilisateur(
        `<@${cible.id}> n'a que ${ducats(fiche.ducats)} en poche : la taxe ne peut pas être prélevée.`,
      );
    }

    const apres = contexte.stockage.debiter(interaction.guildId, cible.id, montant);

    await interaction.reply({
      embeds: [
        succes(
          `**${ducats(montant)}** prélevés à <@${cible.id}>.\n**Motif :** ${motif}\n**Solde restant :** ${ducats(apres.ducats)}`,
          "Taxe prélevée",
        ),
      ],
    });
    await journaliser(
      contexte,
      interaction,
      attention(
        `**Contribuable :** ${cible.tag}\n**Montant :** ${ducats(montant)}\n**Motif :** ${motif}\n**Par :** ${interaction.user.tag}`,
        "Prélèvement",
      ),
    );
  },
};

const cmdBoutique = {
  nom: "boutique",
  categorie: "économie",
  resume: "Affiche les articles de la boutique.",
  donnees: new SlashCommandBuilder().setName("boutique").setDescription("Affiche la boutique du Delphinat."),
  async executer(interaction, contexte) {
    const donnees = boutique(contexte.configuration.chemins.ressources);
    if (!donnees) throw new ErreurUtilisateur("Le fichier `ressources/marche.json` est introuvable.");

    const articles = donnees.articles ?? [];
    const fiche = contexte.stockage.membre(interaction.guildId, interaction.user.id);

    await interaction.reply({
      embeds: [
        information(
          [
            `**Votre poche :** ${ducats(fiche.ducats)}`,
            "",
            ...articles.map(
              (element) =>
                `${element.emojie ?? "•"} **${element.nom}** — ${element.prix} ducats\n*${element.description}*`,
            ),
            "",
            "Achetez avec `/acheter article:<identifiant>`.",
          ].join("\n"),
          `Boutique (${donnees.devise ?? "ducats"})`,
        ),
      ],
    });
  },
};

const cmdAcheter = {
  nom: "acheter",
  categorie: "économie",
  resume: "Achète un article de la boutique.",
  detail:
    "Chaque article a un effet réel : la réconciliation retire un avertissement, le message épinglé épingle un message désigné, le décret est publié, le membre vérifié attribue le rôle configuré. Un article sans effet appliqué est **remboursé**.",
  donnees: new SlashCommandBuilder()
    .setName("acheter")
    .setDescription("Achète un article de la boutique.")
    .addStringOption((option) =>
      option.setName("article").setDescription("Identifiant de l'article").setRequired(true).setAutocomplete(false),
    ),
  async executer(interaction, contexte) {
    const identifiant = interaction.options.getString("article", true);
    const chose = article(contexte.configuration.chemins.ressources, identifiant);
    if (!chose) {
      const donnees = boutique(contexte.configuration.chemins.ressources);
      const liste = (donnees?.articles ?? []).map((element) => `\`${element.id}\``).join(", ");
      throw new ErreurUtilisateur(`Article inconnu. Articles disponibles : ${liste || "aucun"}.`);
    }

    const debit = contexte.stockage.debiter(interaction.guildId, interaction.user.id, chose.prix);
    if (!debit) {
      const fiche = contexte.stockage.membre(interaction.guildId, interaction.user.id);
      throw new ErreurUtilisateur(
        `Cet article coûte **${ducats(chose.prix)}** et vous en avez ${ducats(fiche.ducats)}.`,
      );
    }

    const application = await appliquer(interaction, contexte, chose);

    if (!application.ok) {
      contexte.stockage.crediter(interaction.guildId, interaction.user.id, chose.prix);
      await interaction.reply({
        embeds: [
          attention(`${application.raison}\n\nVous avez été **remboursé** de ${ducats(chose.prix)}.`, "Achat annulé"),
        ],
        flags: 64,
      });
      return;
    }

    await interaction.reply({
      embeds: [
        succes(
          `${chose.emojie ?? "🛒"} **${chose.nom}** acheté pour **${ducats(chose.prix)}**.\n${application.detail}\n\n**Solde restant :** ${ducats(debit.ducats)}`,
          "Achat effectué",
        ),
      ],
    });
  },
};

/** Applique l'effet d'un article. Renvoie `{ ok, detail, raison }`. */
async function appliquer(interaction, contexte, chose) {
  const serveurId = interaction.guildId;
  const membreId = interaction.user.id;
  const reglages = contexte.stockage.serveur(serveurId);

  if (chose.id === "reconciliation") {
    const liste = contexte.stockage.avertissements(serveurId, membreId);
    if (liste.length === 0) {
      return { ok: false, raison: "Votre dossier est déjà vierge : il n'y a aucun avertissement à retirer." };
    }
    const retire = liste[0];
    contexte.stockage.retirerAvertissement(serveurId, retire.id);
    return { ok: true, detail: `Avertissement retiré : « ${retire.raison} ».` };
  }

  if (chose.id === "message-epingle") {
    // Le message à épingler n'est pas encore connu : on arme une attente, que
    // le prochain message de l'acheteur dans ce salon déclenchera.
    contexte.stockage.attendreEpingle(serveurId, membreId, interaction.channelId);
    return {
      ok: true,
      detail: "Envoyez maintenant, **dans ce salon**, un message contenant le lien de celui à épingler.",
    };
  }

  if (chose.id === "decret") {
    const salonId = reglages.bienvenue.salon ?? interaction.channelId;
    const salon = await interaction.guild.channels.fetch(salonId).catch(() => null);
    if (!salon?.isTextBased()) {
      return { ok: false, raison: "Aucun salon d'accueil n'est configuré pour publier un décret." };
    }
    const texte = genererDecret(contexte.configuration.chemins.ressources);
    if (!texte) return { ok: false, raison: "Les modèles de décret sont introuvables." };
    await salon.send({
      embeds: [
        or(texte, "Décret").setFooter({ text: `Décret acheté et signé par ${interaction.user.username}` }),
      ],
    });
    return { ok: true, detail: `Le décret a été publié dans <#${salon.id}>.` };
  }

  if (chose.id === "membre-verifie") {
    if (!reglages.roleVerifie) {
      return { ok: false, raison: "Le rôle de vérification n'est pas configuré : `/configurer verifie role:…`." };
    }
    const membre = interaction.member;
    const ajout = await membre.roles
      .add(reglages.roleVerifie, "Article « Membre vérifié » acheté")
      .then(() => true)
      .catch(() => false);
    if (!ajout) return { ok: false, raison: "Le rôle de vérification est plus haut que le rôle du bot." };
    return { ok: true, detail: `Le rôle <@&${reglages.roleVerifie}> vous a été attribué.` };
  }

  return { ok: true, detail: chose.description };
}

export const COMMANDES_ECONOMIE = [
  cmdSolde,
  cmdClassementDucats,
  cmdTravailler,
  cmdRecompense,
  cmdEpargner,
  cmdRetirerEpargne,
  cmdTransferer,
  cmdDonner,
  cmdTaxer,
  cmdBoutique,
  cmdAcheter,
];
