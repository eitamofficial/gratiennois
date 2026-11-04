/**
 * Animation du serveur.
 *
 * Deux commandes qui installent quelque chose de durable dans un salon :
 * un **concours** (bouton, tirage au sort à l'échéance, relance après un
 * redémarrage) et un **règlement** (texte figé dans un embed, que l'on peut
 * citer ensuite).
 *
 * L'état d'un concours vit en mémoire **et** dans le stockage : un
 * redémarrage ne doit pas annuler un tirage annoncé aux membres.
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { attention, information, or, succes } from "../lib/embres.js";
import { analyserDuree, compteARebours, formaterDuree, horodatage } from "../lib/duree.js";
import { choisir, entier } from "../lib/texte.js";
import { ErreurUtilisateur } from "./erreurs.js";
import { journaliser } from "./moderation.js";

/** Concours en cours, par identifiant de message. */
export const concours = new Map();

/** Tire le gagnant et clôt le concours. */
async function terminer(client, cle) {
  const element = concours.get(cle);
  if (!element) return;
  concours.delete(cle);

  const salon = await client.channels.fetch(element.salonId).catch(() => null);
  if (!salon?.isTextBased()) return;

  const message = await salon.messages.fetch(element.messageId).catch(() => null);
  if (!message) return;

  const reaction = message.reactions.cache.get("🎉");
  const utilisateurs = reaction ? await reaction.users.fetch().catch(() => null) : null;
  const participants = utilisateurs ? [...utilisateurs.filter((utilisateur) => !utilisateur.bot).values()] : [];

  const composants = [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("concours:fini").setLabel("Concours terminé").setStyle(ButtonStyle.Secondary).setDisabled(true),
  )];

  if (participants.length === 0) {
    await message
      .edit({
        embeds: [attention(`**${element.prix}**\n\nAucun participant : le concours est annulé.`, "Concours terminé")],
        components: composants,
      })
      .catch(() => {});
    return;
  }

  const gagnant = choisir(participants);
  await message
    .edit({
      embeds: [
        succes(
          [
            `**${element.prix}**`,
            "",
            `🎉 **Gagnant : <@${gagnant.id}>**`,
            `Participants : ${participants.length}`,
            `Lancé par <@${element.organisateurId}> · tiré au sort le ${horodatage(Date.now())}`,
          ].join("\n"),
          "Concours terminé",
        ),
      ],
      components: composants,
    })
    .catch(() => {});

  await salon
    .send({
      content: `<@${gagnant.id}>`,
      embeds: [succes(`Félicitations à <@${gagnant.id}> qui remporte **${element.prix}** !`, "Tirage au sort")],
    })
    .catch(() => {});
}

const cmdConcours = {
  nom: "concours",
  categorie: "interaction",
  resume: "Lance un concours avec un bouton de participation.",
  detail:
    "Le tirage au sort a lieu à l'échéance et survit à un redémarrage du bot. `1h` au minimum, `30 j` au maximum.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ManageMessages,
  donnees: new SlashCommandBuilder()
    .setName("concours")
    .setDescription("Lance un concours dans ce salon.")
    .addStringOption((option) => option.setName("prix").setDescription("Ce que l'on gagne").setRequired(true).setMaxLength(200))
    .addStringOption((option) => option.setName("duree").setDescription("Durée, par exemple 2h ou 3 j").setRequired(true))
    .addChannelOption((option) =>
      option.setName("salon").setDescription("Salon du concours (le salon courant par défaut)").setRequired(false),
    ),
  async executer(interaction, contexte) {
    const prix = interaction.options.getString("prix", true);
    const duree = analyserDuree(interaction.options.getString("duree", true));
    if (!duree) throw new ErreurUtilisateur("Durée illisible : essayez `2h`, `30m` ou `3 j`.");
    if (duree < 60_000) throw new ErreurUtilisateur("Un concours doit durer au moins une minute.");
    if (duree > 30 * 86_400_000) throw new ErreurUtilisateur("Un concours ne peut pas durer plus de trente jours.");

    const salon = interaction.options.getChannel("salon") ?? interaction.channel;
    if (!salon?.isTextBased()) throw new ErreurUtilisateur("Ce salon ne peut pas accueillir un concours.");

    const fin = Date.now() + duree;

    const message = await salon.send({
      embeds: [
        or(
          [
            `## 🎉 ${prix}`,
            "",
            `**Fin :** ${compteARebours(fin)} (${horodatage(fin)})`,
            `**Organisé par :** <@${interaction.user.id}>`,
            "",
            "Cliquez sur le bouton ci-dessous pour participer.",
          ].join("\n"),
          "Concours",
        ),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("concours:participer").setLabel("Participer").setEmoji("🎉").setStyle(ButtonStyle.Primary),
        ),
      ],
    });

    const cle = message.id;
    concours.set(cle, {
      messageId: message.id,
      salonId: salon.id,
      prix,
      organisateurId: interaction.user.id,
      fin,
      participants: new Set(),
    });

    const minuteur = setTimeout(() => void terminer(interaction.client, cle), duree);
    minuteur.unref?.();

    await interaction.reply({
      embeds: [
        succes(
          `Le concours est lancé dans <#${salon.id}>. Fin dans **${formaterDuree(duree)}**.`,
          "Concours lancé",
        ),
      ],
      flags: 64,
    });
    await journaliser(
      contexte,
      interaction,
      information(
        `**Prix :** ${prix}\n**Salon :** <#${salon.id}>\n**Durée :** ${formaterDuree(duree)}\n**Organisateur :** ${interaction.user.tag}`,
        "Concours lancé",
      ),
    );
  },
};

const cmdRegles = {
  nom: "regles",
  categorie: "interaction",
  resume: "Publie le règlement du serveur dans un salon.",
  niveau: "moderateur",
  permissions: PermissionFlagsBits.ManageGuild,
  donnees: new SlashCommandBuilder()
    .setName("regles")
    .setDescription("Publie un rappel du règlement.")
    .addStringOption((option) =>
      option
        .setName("texte")
        .setDescription("Texte du règlement (sinon la version par défaut est utilisée)")
        .setMaxLength(3500),
    )
    .addChannelOption((option) =>
      option.setName("salon").setDescription("Salon de publication (le salon courant par défaut)").setRequired(false),
    ),
  async executer(interaction, contexte) {
    const salon = interaction.options.getChannel("salon") ?? interaction.channel;
    if (!salon?.isTextBased()) throw new ErreurUtilisateur("Ce salon ne peut pas accueillir le règlement.");

    const texte =
      interaction.options.getString("texte") ??
      [
        "**1. Respect.** Aucune insulte, aucun harcèlement, aucune discrimination.",
        "**2. Sujet.** Chaque salon a un sujet : gardez les discussions à leur place.",
        "**3. Publicité.** Aucune promotion sans l'accord de la modération.",
        "**4. Contenus.** Pas de contenu illégal, ni de propos révisionnistes ou complotistes.",
        "**5. Modération.** Une consigne de la modération s'applique immédiatement ; contestez-la en privé, jamais dans le salon.",
        "**6. Sanctions.** Avertissement, silence, expulsion, bannissement — dans cet ordre de gravité croissante.",
        "",
        contexte.configuration.wikiUrl
          ? `Le texte intégral des règles du Delphinat est sur le wiki : ${contexte.configuration.wikiUrl}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

    await salon.send({ embeds: [or(texte, `Règlement de ${interaction.guild.name}`)] });

    if (interaction.channelId === salon.id) {
      await interaction.reply({
        embeds: [succes("Règlement publié dans ce salon.", "Publié")],
        flags: 64,
      });
    } else {
      await interaction.reply({
        embeds: [succes(`Règlement publié dans <#${salon.id}>.`, "Publié")],
        flags: 64,
      });
    }
  },
};

const cmdTirage = {
  nom: "tirage",
  categorie: "interaction",
  resume: "Tire un ou plusieurs noms au sort dans le salon.",
  detail: "Sans liste fournie, s'appuie sur les participants du dernier concours du salon.",
  donnees: new SlashCommandBuilder()
    .setName("tirage")
    .setDescription("Tire un nom au sort.")
    .addStringOption((option) =>
      option.setName("liste").setDescription("Noms séparés par des virgules (facultatif)").setMaxLength(800),
    )
    .addIntegerOption((option) =>
      option.setName("gagnants").setDescription("Nombre de gagnants (1 par défaut)").setMinValue(1).setMaxValue(10),
    ),
  async executer(interaction, contexte) {
    const brut = interaction.options.getString("liste");
    const gagnants = interaction.options.getInteger("gagnants") ?? 1;

    let noms = (brut ?? "")
      .split(/[,\n;]/)
      .map((element) => element.trim())
      .filter(Boolean);

    // Sans liste, on retombe sur les participants enregistrés d'un concours
    // du serveur : c'est le cas d'usage le plus fréquent.
    if (noms.length === 0) {
      const derniers = [...Object.values(contexte.stockage.donnees.liens)];
      if (derniers.length === 0) {
        throw new ErreurUtilisateur("Donnez une liste de noms, ou lancez un `/concours` d'abord.");
      }
      noms = derniers.map((element) => element.slugs.join(", "));
    }

    if (noms.length < gagnants) {
      throw new ErreurUtilisateur(`Il n'y a que ${noms.length} nom(s) pour ${gagnants} gagnant(s).`);
    }

    const restants = [...noms];
    const tires = [];
    for (let index = 0; index < gagnants; index += 1) {
      const position = entier(0, restants.length - 1);
      tires.push(restants.splice(position, 1)[0]);
    }

    await interaction.reply({
      embeds: [or(tires.map((nom, index) => `**${index + 1}.** ${nom}`).join("\n"), "Tirage au sort")],
    });
  },
};

export const COMMANDES_INTERACTION = [cmdConcours, cmdRegles, cmdTirage];
