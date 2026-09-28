/**
 * Commandes d'économie.
 *
 * La monnaie est le **ducat**. Elle n'a aucune valeur réelle et ne confers
 * aucun avantage en dehors du serveur : c'est ce qui permet de jouer avec
 * des « taxes » et des « confiscations » sans créer de conflit.
 *
 * Deux règles de conception :
 *
 * - **aucune opération d'argent n'est faite en JavaScript.** Un transfert est
 *   une transaction SQL ; le solde ne peut pas disparaître entre deux
 *   requêtes ;
 * - **l'épargne est à part.** Le ducat en banque n'est ni volable ni
 *   taxable : c'est la seule chose que la modération ne peut pas toucher, et
 *   cela doit rester vrai.
 */

import { EmbedBuilder, type ChatInputCommandInteraction, type GuildMember } from "discord.js";
import type { Commande } from "../core/types.js";
import { commande, confirmation, executer, estSalonTextuel, repondre } from "./outils.js";
import type { ReglagesServeur } from "../db/serveur.js";
import { attention, champs, erreur, or, succes } from "../lib/embres.js";
import { ressource } from "../lib/ressources.js";
import { entier } from "../lib/texte.js";
import { horodatage } from "../lib/duree.js";
import {
  ajusterBanque,
  ajusterDucats,
  classement,
  decrementerAvertissements,
  lireMembre,
  rang,
  reclamerRecompense,
  retirerDucats,
  transferer,
} from "../db/membres.js";
import { journaliser } from "../db/journal.js";

interface Article {
  id: string;
  nom: string;
  prix: number;
  description: string;
  emojie: string;
}

const catalogue = () => ressource<{ boutique: { devise: string; articles: Article[] } }>("marche").boutique.articles;

const cmdSolde: Commande = {
  nom: "solde",
  categorie: "economie",
  niveau: "membre",
  usage: "/solde [membre]",
  resume: "Affiche le solde et la position au classement d'un membre.",
  donnees: commande("solde", "Solde d'un membre.").addUserOption((option) =>
    option.setName("membre").setDescription("Membre concerné (vous-même par défaut)."),
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      const vise = interaction.options.getUser("membre") ?? interaction.user;
      const fiche = await lireMembre(guild.id, vise.id);
      const position = await rang(guild.id, vise.id);

      const embed = new EmbedBuilder()
        .setColor(0xd4a63a)
        .setTitle(`Compte de ${vise.username}`)
        .setFields(
          champs([
            ["Ducats en poche", `${fiche.ducats} 🪙`],
            ["Épargne", `${fiche.banque} 🏦`],
            ["Patrimoine", `${fiche.ducats + fiche.banque} 🪙`],
            ["Classement", `${position}e place`],
          ]),
        )
        .setFooter({ text: "L'épargne n'est ni taxée ni confisquable." });
      await repondre(interaction, embed);
    });
  },
};

const cmdTransferer: Commande = {
  nom: "transferer",
  categorie: "economie",
  niveau: "membre",
  usage: "/transferer <membre> <montant>",
  resume: "Envoie des ducats à un autre membre.",
  donnees: commande("transferer", "Envoie des ducats à un membre.")
    .addUserOption((option) => option.setName("membre").setDescription("Destinataire.").setRequired(true))
    .addIntegerOption((option) =>
      option
        .setName("montant")
        .setDescription("Nombre de ducats à envoyer.")
        .setMinValue(1)
        .setMaxValue(1_000_000)
        .setRequired(true),
    ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      if (!serveur.economieActive) {
        return repondre(interaction, attention("L'économie est désactivée sur ce serveur."));
      }

      const destinataire = interaction.options.getUser("membre", true);
      const montant = interaction.options.getInteger("montant", true);
      if (destinataire.id === interaction.user.id) {
        return repondre(interaction, erreur("On ne s'envoie pas de ducats à soi-même."));
      }
      if (destinataire.bot) {
        return repondre(interaction, erreur("Les bots n'ont pas de portefeuille."));
      }

      const cle = `transfert:${guild.id}:${interaction.user.id}`;
      if (!bot.temporisations.reserver(cle, 3_000)) {
        return repondre(
          interaction,
          attention(
            `Attendez encore ${Math.ceil(bot.temporisations.restant(cle) / 1000)} s avant un nouveau transfert.`,
          ),
        );
      }

      const resultat = await transferer(guild.id, interaction.user.id, destinataire.id, montant);
      if (!resultat.ok) {
        bot.temporisations.liberer(cle);
        const fiche = await lireMembre(guild.id, interaction.user.id);
        return repondre(
          interaction,
          erreur(`Solde insuffisant : vous avez ${fiche.ducats} ducat(s), il en faut ${montant}.`),
        );
      }

      await destinataire
        .send({
          embeds: [
            succes(`**${montant} ducat(s)** reçus de ${interaction.user.username} sur **${guild.name}**.`),
          ],
        })
        .catch(() => undefined);

      await repondre(
        interaction,
        succes(
          `**${montant} ducat(s)** envoyés à ${destinataire.username}. Il vous reste ${resultat.soldeEmetteur} ducat(s).`,
        ),
      );
    });
  },
};

const cmdEpargner: Commande = {
  nom: "epargner",
  categorie: "economie",
  niveau: "membre",
  usage: "/epargner <montant>",
  resume: "Déplace des ducats vers l'épargne, à l'abri du vol et de la taxation.",
  donnees: commande("epargner", "Dépose des ducats à l'épargne.").addIntegerOption((option) =>
    option
      .setName("montant")
      .setDescription("Montant à déposer.")
      .setMinValue(1)
      .setMaxValue(1_000_000)
      .setRequired(true),
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      const montant = interaction.options.getInteger("montant", true);

      if (!(await retirerDucats(guild.id, interaction.user.id, montant))) {
        const fiche = await lireMembre(guild.id, interaction.user.id);
        return repondre(
          interaction,
          erreur(`Solde insuffisant : vous avez ${fiche.ducats} ducat(s).`),
        );
      }

      const total = await ajusterBanque(guild.id, interaction.user.id, montant);
      await confirmation(
        { bot, interaction, serveur },
        `**${montant} ducat(s)** versés à l'épargne. Total déposé : ${total} 🏦.`,
      );
    });
  },
};

const cmdRetirerEpargne: Commande = {
  nom: "retirer-epargne",
  categorie: "economie",
  niveau: "membre",
  usage: "/retirer-epargne <montant>",
  resume: "Reprend des ducats depuis l'épargne.",
  donnees: commande("retirer-epargne", "Reprend des ducats à l'épargne.").addIntegerOption((option) =>
    option
      .setName("montant")
      .setDescription("Montant à retirer.")
      .setMinValue(1)
      .setMaxValue(1_000_000)
      .setRequired(true),
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      const montant = interaction.options.getInteger("montant", true);

      const fiche = await lireMembre(guild.id, interaction.user.id);
      if (fiche.banque < montant) {
        return repondre(
          interaction,
          erreur(`Épargne insuffisante : vous avez ${fiche.banque} ducat(s) en banque.`),
        );
      }

      await ajusterBanque(guild.id, interaction.user.id, -montant);
      const poche = await ajusterDucats(guild.id, interaction.user.id, montant);
      await confirmation(
        { bot, interaction, serveur },
        `**${montant} ducat(s)** retirés de l'épargne. Vous avez ${poche} ducat(s) en poche.`,
      );
    });
  },
};

const cmdRecompense: Commande = {
  nom: "recompense",
  categorie: "economie",
  niveau: "membre",
  usage: "/recompense",
  resume: "Réclame la récompense quotidienne.",
  donnees: commande("recompense", "Récompense quotidienne."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;

      // Le montant varie légèrement d'un jour à l'autre : une récompense
      // identique tous les jours s'oublie, une récompense imprévisible se
      // remarque.
      const montant = 25 + entier(0, 25);
      const resultat = await reclamerRecompense(guild.id, interaction.user.id, montant);

      if (resultat.montant === 0) {
        return repondre(
          interaction,
          attention(
            resultat.prochain
              ? `Vous avez déjà réclamé votre récompense. Prochaine fois : ${horodatage(resultat.prochain)}.`
              : "Vous avez déjà réclamé votre récompense aujourd'hui.",
          ),
        );
      }

      await confirmation(
        { bot, interaction, serveur },
        `Récompense quotidienne : **${resultat.montant} ducat(s)**. Revenez demain.`,
      );
    });
  },
};

const cmdTravailler: Commande = {
  nom: "travailler",
  categorie: "economie",
  niveau: "membre",
  usage: "/travailler",
  resume: "Exerce un métier contre quelques ducats (toutes les deux heures).",
  donnees: commande("travailler", "Exerce un métier contre quelques ducats."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      if (!serveur.economieActive) {
        return repondre(interaction, attention("L'économie est désactivée sur ce serveur."));
      }

      const metiers = [
        { nom: "greffier", detail: "Classer des articles du wiki." },
        { nom: "archiviste", detail: "Remettre de l'ordre dans les dossiers." },
        { nom: "douanier", detail: "Contrôler les ducats à l'entrée du Delphinat." },
        { nom: "régisseur", detail: "Tenir les registres de la chancellerie." },
        { nom: "maître des requêtes", detail: "Répondre aux questions des nouveaux membres." },
      ];
      const metier = metiers[entier(0, metiers.length - 1)];

      const cle = `travail:${guild.id}:${interaction.user.id}`;
      if (!bot.temporisations.reserver(cle, 2 * 3_600_000)) {
        const restant = bot.temporisations.restant(cle);
        return repondre(
          interaction,
          attention(
            `Vous êtes déjà au travail. Prochaine vacation dans ${Math.ceil(restant / 3_600_000)} h.`,
          ),
        );
      }

      const gain = entier(8, 25);
      const total = await ajusterDucats(guild.id, interaction.user.id, gain);
      await repondre(
        interaction,
        succes(
          [
            `Vous exercez le métier de **${metier.nom}** : ${metier.detail}`,
            `Gain : **${gain} ducats**. Vous avez ${total} ducat(s) en poche.`,
          ].join("\n"),
        ),
      );
    });
  },
};

const cmdBoutique: Commande = {
  nom: "boutique",
  categorie: "economie",
  niveau: "membre",
  usage: "/boutique",
  resume: "Liste ce que le marché du Delphinat propose.",
  donnees: commande("boutique", "Catalogue du marché."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const articles = catalogue();
      await repondre(
        interaction,
        or(
          articles
            .map((article) => `${article.emojie} **${article.nom}** — ${article.prix} ducats\n${article.description}`)
            .join("\n\n"),
          "Marché du Delphinat",
        ),
      );
    });
  },
};

const cmdAcheter: Commande = {
  nom: "acheter",
  categorie: "economie",
  niveau: "membre",
  usage: "/acheter <article>",
  resume: "Achète un article du marché.",
  donnees: commande("acheter", "Achète un article du marché.").addStringOption((option) =>
    option
      .setName("article")
      .setDescription("Nom de l'article")
      .setRequired(true)
      .setAutocomplete(true),
  ),
  async autocompletion(interaction, reglages, bot) {
    void reglages;
    void bot;
    const saisie = interaction.options.getFocused().toLowerCase();
    const noms = catalogue()
      .filter((article) => article.nom.toLowerCase().includes(saisie))
      .slice(0, 25);
    await interaction.respond(
      noms.map((article) => ({ name: `${article.nom} (${article.prix} ducats)`, value: article.id })),
    );
  },
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;

      const identifiant = interaction.options.getString("article", true);
      const article = catalogue().find((element) => element.id === identifiant);
      if (!article) {
        return repondre(
          interaction,
          erreur("Article inconnu. Utilisez `/boutique` pour voir le catalogue."),
        );
      }

      const fiche = await lireMembre(guild.id, interaction.user.id);
      if (fiche.ducats < article.prix) {
        return repondre(
          interaction,
          erreur(
            `Il vous manque ${article.prix - fiche.ducats} ducat(s). Le marché ne fait pas de crédit.`,
          ),
        );
      }

      const membre = await guild.members.fetch(interaction.user.id).catch(() => null);
      if (!membre) return repondre(interaction, erreur("Vous n'êtes plus sur ce serveur."));

      if (article.id === "reconciliation" && fiche.avertissements === 0) {
        return repondre(interaction, attention("Vous n'avez aucun avertissement à faire lever."));
      }
      if (article.id === "membre-verifie" && !serveur.roleVerification) {
        return repondre(
          interaction,
          erreur("Aucun rôle de vérification n'est configuré. Voyez l'administration du serveur."),
        );
      }

      // Le paiement est débité avant l'effet : si l'effet échoue, le membre
      // est remboursé juste après, et l'incohérence n'a pas lieu d'être.
      if (!(await retirerDucats(guild.id, interaction.user.id, article.prix))) {
        return repondre(interaction, erreur("Solde insuffistant."));
      }

      const resultat = await appliquerArticle(guild.id, interaction, serveur, article, membre);
      if (!resultat.ok) {
        await ajusterDucats(guild.id, interaction.user.id, article.prix);
        return repondre(interaction, erreur(`${resultat.raison} Votre achat a été remboursé.`));
      }

      await journaliser({
        serveurId: guild.id,
        type: "achat",
        utilisateurId: interaction.user.id,
        cibleId: null,
        details: { article: article.id, prix: article.prix },
      });

      await confirmation(
        { bot, interaction, serveur },
        `${article.emojie} **${article.nom}** acheté pour ${article.prix} ducats.\n${resultat.message}`,
      );
    });
  },
};

/** Applique l'effet d'un article acheté. */
async function appliquerArticle(
  serveurId: string,
  interaction: ChatInputCommandInteraction,
  serveur: ReglagesServeur,
  article: Article,
  membre: GuildMember,
): Promise<{ ok: boolean; raison: string; message: string }> {
  if (article.id === "reconciliation") {
    const restant = await decrementerAvertissements(serveurId, interaction.user.id);
    return { ok: true, raison: "", message: `Avertissements restants : ${restant}.` };
  }

  if (article.id === "message-epingle") {
    const salon = interaction.channel;
    if (!salon || !salon.isTextBased() || !estSalonTextuel(salon)) {
      return { ok: false, raison: "Cette commande ne fonctionne que dans un salon textuel.", message: "" };
    }
    const messages = await salon.messages.fetch({ limit: 20 }).catch(() => null);
    const cible = messages?.find((message) => message.author.id === interaction.user.id);
    if (!cible) {
      return {
        ok: false,
        raison: "Aucun message de vous n'a été trouvé dans les vingt derniers de ce salon.",
        message: "",
      };
    }
    await cible.pin().catch(() => undefined);
    return { ok: true, raison: "", message: "Votre message a été épinglé." };
  }

  if (article.id === "decret") {
    if (!serveur.salonBienvenue) {
      return { ok: false, raison: "Aucun salon d'accueil n'est configuré.", message: "" };
    }
    const salon = interaction.guild?.channels.cache.get(serveur.salonBienvenue);
    if (!salon || !estSalonTextuel(salon)) {
      return { ok: false, raison: "Le salon d'accueil configuré n'existe plus.", message: "" };
    }
    await salon
      .send(
        `📜 **Décret** — par décret de <@${interaction.user.id}>, tout membre est tenu de respecter le bon ordre. Signé ce jour.`,
      )
      .catch(() => undefined);
    return { ok: true, raison: "", message: "Le décret a été publié dans le salon d'accueil." };
  }

  if (article.id === "membre-verifie" && serveur.roleVerification) {
    const role = interaction.guild?.roles.cache.get(serveur.roleVerification);
    if (!role) return { ok: false, raison: "Le rôle de vérification est introuvable.", message: "" };
    if (membre.roles.highest.position >= role.position) {
      return {
        ok: false,
        raison: "Vous êtes au-dessus de ce rôle : l'attribution est inutile.",
        message: "",
      };
    }
    await membre.roles.add(role, "Achat : membre vérifié").catch(() => undefined);
    return { ok: true, raison: "", message: `Rôle ${role} attribué.` };
  }

  return { ok: false, raison: "Cet article n'a pas d'effet pour l'instant.", message: "" };
}

const cmdClassementDucats: Commande = {
  nom: "classement-ducats",
  categorie: "economie",
  niveau: "membre",
  usage: "/classement-ducats",
  resume: "Classement des membres par ducats.",
  donnees: commande("classement-ducats", "Classement par ducats."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      const entrees = await classement(guild.id, "ducats", 10);
      if (entrees.length === 0) {
        return repondre(interaction, or("Le classement est encore vide."));
      }

      const lignes = await Promise.all(
        entrees.map(async (entree, index) => {
          const membre = await guild.members.fetch(entree.utilisateurId).catch(() => null);
          return `${index + 1}. **${membre?.displayName ?? "Membre"}** — ${entree.valeur} ducats`;
        }),
      );
      await repondre(interaction, or(lignes.join("\n"), "Les plus riches du Delphinat"));
    });
  },
};

const cmdTaxer: Commande = {
  nom: "taxer",
  categorie: "economie",
  niveau: "moderation",
  usage: "/taxer <membre> <montant> [motif]",
  resume: "Prend des ducats à un membre pour sanction pécuniaire (épargne intacte).",
  donnees: commande("taxer", "Taxe pécuniaire sur un membre.")
    .addUserOption((option) => option.setName("membre").setDescription("Membre taxé.").setRequired(true))
    .addIntegerOption((option) =>
      option
        .setName("montant")
        .setDescription("Montant prélevé.")
        .setMinValue(1)
        .setMaxValue(100_000)
        .setRequired(true),
    )
    .addStringOption((option) => option.setName("motif").setDescription("Motif de la taxe.")),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;

      const vise = interaction.options.getUser("membre", true);
      const montant = interaction.options.getInteger("montant", true);
      if (vise.id === interaction.user.id) {
        return repondre(interaction, erreur("On ne se taxe pas soi-même."));
      }

      if (!(await retirerDucats(guild.id, vise.id, montant))) {
        return repondre(
          interaction,
          erreur("Ce membre n'a pas assez de ducats en poche. L'épargne n'est jamais touchée."),
        );
      }

      const motif = interaction.options.getString("motif") ?? "sans motif";
      await journaliser({
        serveurId: guild.id,
        type: "taxe",
        utilisateurId: interaction.user.id,
        cibleId: vise.id,
        details: { montant, motif },
      });

      const fiche = await lireMembre(guild.id, vise.id);
      await repondre(
        interaction,
        attention(
          `**${montant} ducat(s)** prélevés sur ${vise.tag}. Motif : ${motif}. Il lui reste ${fiche.ducats} ducat(s).`,
          "Taxe",
        ),
      );
    });
  },
};

const cmdDonner: Commande = {
  nom: "donner",
  categorie: "economie",
  niveau: "admin",
  usage: "/donner <membre> <montant>",
  resume: "Crédite des ducats à un membre (réservé à l'administration).",
  donnees: commande("donner", "Crédite des ducats à un membre.")
    .addUserOption((option) => option.setName("membre").setDescription("Bénéficiaire.").setRequired(true))
    .addIntegerOption((option) =>
      option
        .setName("montant")
        .setDescription("Montant crédité.")
        .setMinValue(1)
        .setMaxValue(1_000_000)
        .setRequired(true),
    ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      const vise = interaction.options.getUser("membre", true);
      const montant = interaction.options.getInteger("montant", true);

      const total = await ajusterDucats(guild.id, vise.id, montant);
      await journaliser({
        serveurId: guild.id,
        type: "attribution",
        utilisateurId: interaction.user.id,
        cibleId: vise.id,
        details: { montant },
      });
      await confirmation(
        { bot, interaction, serveur },
        `**${montant} ducat(s)** crédités à ${vise.tag}. Nouveau solde : ${total}.`,
      );
    });
  },
};

export const COMMANDES_ECONOMIE: Commande[] = [
  cmdSolde,
  cmdTransferer,
  cmdEpargner,
  cmdRetirerEpargne,
  cmdRecompense,
  cmdTravailler,
  cmdBoutique,
  cmdAcheter,
  cmdClassementDucats,
  cmdTaxer,
  cmdDonner,
];
