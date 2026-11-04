/**
 * Musique.
 *
 * Toutes les commandes passent par le même chemin : l'appelant doit être en
 * vocal, le bot rejoint son salon, puis la commande agit sur la salle. Aucune
 * commande ne rejoint un salon sans qu'un membre l'y appelle.
 */

import { SlashCommandBuilder } from "discord.js";
/** Rejoint le salon vocal de l'appelant et vérifie que la salle existe. */
async function salleDe(interaction, contexte, { rejoindre = true } = {}) {
  const serveurId = interaction.guildId;
  const existante = contexte.lecteur.obtenir(serveurId);

  if (!rejoindre) {
    if (!existante) throw new ErreurUtilisateur("Je ne joue rien dans ce serveur pour l'instant.");
    const { ok, raison } = memeSalon(interaction, existante);
    if (!ok) throw new ErreurUtilisateur(raison);
    return existante;
  }

  const { salon, raison } = salonVocalDe(interaction);
  if (!salon) throw new ErreurUtilisateur(raison);

  const connexion = await contexte.lecteur.rejoindre(interaction.guild, salon.id);
  if (!connexion.ok) throw new ErreurUtilisateur(connexion.raison);

  return contexte.lecteur.obtenir(serveurId);
}

/**
 * Affiche le panneau « en cours » dans le salon de la commande.
 *
 * Le panneau n'est pas indispensable à la lecture : un salon sans permission
 * d'écriture, un salon vocal ou un salon d'annonces ne doivent pas faire
 * échouer `/jouer`. Le refus est journalisé, un point c'est tout.
 */
async function poserPanneau(interaction, contexte) {
  const salon = interaction.channel;
  if (!salon || typeof salon.send !== "function" || salon.isTextBased?.() === false) return false;
  return poser(contexte, interaction.guildId, salon);
}

/** L'appelant est-il dans le salon où joue le bot ? */
function memeSalon(interaction, salle) {
  const salon = interaction.member?.voice?.channel ?? null;
  if (!salon) return { ok: false, raison: "Vous devez être dans un salon vocal pour cela." };
  if (salle.connexion.joinConfig.channelId !== salon.id) {
    return { ok: false, raison: "Rejoignez le salon vocal où je joue pour cette commande." };
  }
  return { ok: true, raison: null };
}

const cmdJouer = {
  nom: "jouer",
  categorie: "musique",
  resume: "Joue un morceau ou l'ajoute à la file.",
  detail:
    "Accepte un titre, un lien YouTube, ou un lien Spotify/Deezer (dont les métadonnées sont traduites en recherche, ces plateformes ne diffusant pas de flux exploitable).",
  donnees: new SlashCommandBuilder()
    .setName("jouer")
    .setDescription("Joue un morceau dans votre salon vocal.")
    .addStringOption((option) =>
      option.setName("recherche").setDescription("Titre, lien YouTube, Spotify ou Deezer").setRequired(true).setMaxLength(400),
    )
    .addIntegerOption((option) =>
      option.setName("resultats").setDescription("Nombre de résultats à mettre en file (1 par défaut)").setMinValue(1).setMaxValue(5),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply();
    const recherche = interaction.options.getString("recherche", true);
    const nombre = interaction.options.getInteger("resultats") ?? 1;

    const salle = await salleDe(interaction, contexte, { rejoindre: true });
    if (!salle) throw new ErreurUtilisateur("Impossible de rejoindre le salon vocal.");

    // Jouait-on déjà quelque chose ? C'est ce qui distingue « je lance » de
    // « je mets en file », et le membre doit le lire sans ambiguïté.
    const jouaitDeja = Boolean(salle.courante);

    let pistes;
    try {
      pistes = await contexte.lecteur.ajouterResultats(interaction.guildId, recherche, interaction.user.username, nombre);
    } catch (erreurRecue) {
      throw new ErreurUtilisateur(
        erreurRecue instanceof ErreurMusique
          ? erreurRecue.message
          : `Recherche impossible : ${erreurRecue.message}`,
      );
    }

    const premiere = pistes[0];
    const enFile = pistes.length > 1 ? `\n${pistes.length - 1} autre(s) morceau(x) ajouté(s) à la file.` : "";
    const etat = jouaitDeja ? "Ajouté à la file" : "Lecture en cours";

    await interaction.editReply({
      embeds: [
        (jouaitDeja ? information : succes)(
          [
            `[${premiere.titre}](${premiere.page})`,
            `**Auteur :** ${premiere.auteur}${premiere.duree ? ` · **Durée :** ${formaterDuree(premiere.duree * 1000)}` : ""}`,
            `**Demandé par :** <@${interaction.user.id}>${enFile}`,
          ].join("\n"),
          etat,
        ).setThumbnail(premiere.vignette),
      ],
    });

    // Le panneau arrive avec le premier morceau : c'est là qu'il est utile.
    await poserPanneau(interaction, contexte);
  },
};

const cmdPause = {
  nom: "pause",
  categorie: "musique",
  resume: "Met la lecture en pause.",
  donnees: new SlashCommandBuilder().setName("pause").setDescription("Met la lecture en pause."),
  async executer(interaction, contexte) {
    await salleDe(interaction, contexte, { rejoindre: false });
    const fait = contexte.lecteur.pause(interaction.guildId);
    await interaction.reply({
      embeds: [fait ? succes("Lecture en pause.", "Pause") : attention("Rien n'est en cours de lecture.")],
    });
  },
};

const cmdReprendre = {
  nom: "reprendre",
  categorie: "musique",
  resume: "Reprend la lecture.",
  donnees: new SlashCommandBuilder().setName("reprendre").setDescription("Reprend la lecture après une pause."),
  async executer(interaction, contexte) {
    await salleDe(interaction, contexte, { rejoindre: false });
    const fait = contexte.lecteur.reprendre(interaction.guildId);
    await interaction.reply({
      embeds: [fait ? succes("Lecture reprise.", "Reprise") : attention("La lecture n'était pas en pause.")],
    });
  },
};

const cmdSuivant = {
  nom: "suivant",
  categorie: "musique",
  resume: "Passe au morceau suivant.",
  donnees: new SlashCommandBuilder().setName("suivant").setDescription("Passe au morceau suivant."),
  async executer(interaction, contexte) {
    await salleDe(interaction, contexte, { rejoindre: false });
    const suivante = await contexte.lecteur.suivant(interaction.guildId);

    await interaction.reply({
      embeds: [
        suivante
          ? succes(`Suite : **${suivante.piste.titre}** — ${suivante.piste.auteur}`, "Morceau suivant")
          : attention("La file était vide : je quitte le salon vocal.", "Fin de la file"),
      ],
    });
  },
};

const cmdArreter = {
  nom: "arreter",
  categorie: "musique",
  resume: "Arrête la lecture et quitte le salon vocal.",
  donnees: new SlashCommandBuilder()
    .setName("arreter")
    .setDescription("Arrête la lecture et vide la file.")
    .addBooleanOption((option) =>
      option.setName("rester").setDescription("Rester dans le salon vocal après l'arrêt").setRequired(false),
    ),
  async executer(interaction, contexte) {
    const salle = await salleDe(interaction, contexte, { rejoindre: false });
    const rester = interaction.options.getBoolean("rester") ?? false;

    if (rester) {
      salle.attente.length = 0;
      salle.courante = null;
      salle.joueur.stop(true);
      await interaction.reply({ embeds: [succes("Lecture arrêtée, file vidée. Je reste dans le salon.", "Arrêt")] });
      return;
    }

    contexte.lecteur.quitter(interaction.guildId);
    await interaction.reply({ embeds: [succes("Lecture arrêtée, file vidée, salon quitté.", "Arrêt")] });
  },
};

const cmdFile = {
  nom: "file",
  categorie: "musique",
  resume: "Affiche la file d'attente.",
  donnees: new SlashCommandBuilder().setName("file").setDescription("Affiche la file d'attente."),
  async executer(interaction, contexte) {
    const salle = contexte.lecteur.obtenir(interaction.guildId);
    if (!salle) throw new ErreurUtilisateur("Je ne joue rien dans ce serveur.");

    const lignes = contexte.lecteur.file(interaction.guildId);
    const duree = (salle.courante?.piste.duree ?? 0) * 1000;
    const position = contexte.lecteur.position(interaction.guildId);
    const enCours = salle.courante
      ? `**En cours :** ${salle.courante.piste.titre} — ${salle.courante.piste.auteur}\n` +
        `${barreProgression(position, duree)}  \`${tempsLecture(position, duree)}\`\n\n`
      : "";

    await interaction.reply({
      embeds: [
        information(
          `${enCours}${lignes.length > 0 ? lignes.slice(0, 20).join("\n") : "Aucun morceau en attente."}${
            lignes.length > 20 ? `\n… et ${lignes.length - 20} autres.` : ""
          }\n\nVolume : ${salle.volume} % · Répétition : ${salle.boucle}`,
          "File d'attente",
        ),
      ],
    });
  },
};

const cmdRetirer = {
  nom: "retirer",
  categorie: "musique",
  resume: "Retire un morceau de la file.",
  donnees: new SlashCommandBuilder()
    .setName("retirer")
    .setDescription("Retire un morceau de la file d'attente.")
    .addIntegerOption((option) =>
      option.setName("position").setDescription("Position dans la file (1 pour le premier)").setRequired(true).setMinValue(1),
    ),
  async executer(interaction, contexte) {
    await salleDe(interaction, contexte, { rejoindre: false });
    const position = interaction.options.getInteger("position", true);
    const retire = contexte.lecteur.retirer(interaction.guildId, position);

    await interaction.reply({
      embeds: [
        retire
          ? succes(`**${retire.piste.titre}** a été retiré de la file.`, "Retiré")
          : attention(`Aucun morceau à la position ${position}.`, "Position invalide"),
      ],
    });
  },
};

const cmdDeplacer = {
  nom: "deplacer-morceau",
  categorie: "musique",
  resume: "Met un morceau de la file en tête.",
  donnees: new SlashCommandBuilder()
    .setName("deplacer-morceau")
    .setDescription("Passe un morceau en tête de file.")
    .addIntegerOption((option) =>
      option.setName("position").setDescription("Position actuelle du morceau").setRequired(true).setMinValue(1),
    ),
  async executer(interaction, contexte) {
    await salleDe(interaction, contexte, { rejoindre: false });
    const position = interaction.options.getInteger("position", true);
    const deplace = contexte.lecteur.deplacer(interaction.guildId, position);

    await interaction.reply({
      embeds: [
        deplace
          ? succes(`**${deplace.piste.titre}** passera juste après le morceau en cours.`, "Déplacé")
          : attention(`Aucun morceau à la position ${position}.`, "Position invalide"),
      ],
    });
  },
};

const cmdVolume = {
  nom: "volume",
  categorie: "musique",
  resume: "Règle le volume de la lecture.",
  donnees: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Règle le volume.")
    .addIntegerOption((option) =>
      option.setName("pourcentage").setDescription("Volume de 0 à 100").setRequired(true).setMinValue(0).setMaxValue(100),
    ),
  async executer(interaction, contexte) {
    await salleDe(interaction, contexte, { rejoindre: false });
    const valeur = contexte.lecteur.volume(interaction.guildId, interaction.options.getInteger("pourcentage", true));

    await interaction.reply({
      embeds: [valeur < 0 ? attention("Je ne joue rien dans ce serveur.") : succes(`Volume réglé à **${valeur} %**.`, "Volume")],
    });
  },
};

const cmdBoucle = {
  nom: "boucle",
  categorie: "musique",
  resume: "Règle la répétition.",
  donnees: new SlashCommandBuilder()
    .setName("boucle")
    .setDescription("Règle la répétition de la lecture.")
    .addStringOption((option) =>
      option.setName("mode").setDescription("Mode de répétition").addChoices(
        { name: "Aucune", value: "aucune" },
        { name: "Répéter le morceau", value: "piste" },
        { name: "Répéter la file", value: "file" },
      ),
    ),
  async executer(interaction, contexte) {
    const salle = await salleDe(interaction, contexte, { rejoindre: false });
    const mode = interaction.options.getString("mode") ?? "aucune";
    salle.boucle = mode;

    await interaction.reply({
      embeds: [
        succes(
          mode === "aucune"
            ? "Répétition désactivée."
            : mode === "piste"
              ? "Le morceau en cours se répétera."
              : "La file entière se répétera.",
          "Répétition",
        ),
      ],
    });
  },
};

const cmdMelanger = {
  nom: "melanger",
  categorie: "musique",
  resume: "Mélange la file d'attente.",
  donnees: new SlashCommandBuilder().setName("melanger").setDescription("Mélange la file d'attente."),
  async executer(interaction, contexte) {
    await salleDe(interaction, contexte, { rejoindre: false });
    const nombre = contexte.lecteur.melanger(interaction.guildId);

    await interaction.reply({
      embeds: [
        nombre > 0
          ? succes(`${nombre} morceau(x) mélangé(s).`, "File mélangée")
          : attention("La file est vide : il n'y a rien à mélanger."),
      ],
    });
  },
};

const cmdEnCours = {
  nom: "en-cours",
  categorie: "musique",
  resume: "Affiche le morceau en cours.",
  donnees: new SlashCommandBuilder().setName("en-cours").setDescription("Affiche le morceau en cours de lecture."),
  async executer(interaction, contexte) {
    const salle = contexte.lecteur.obtenir(interaction.guildId);
    if (!salle?.courante) throw new ErreurUtilisateur("Je ne joue rien dans ce serveur.");

    const { piste } = salle.courante;
    const duree = piste.duree * 1000;
    const position = contexte.lecteur.position(interaction.guildId);

    await interaction.reply({
      embeds: [
        or(
          [
            `[${piste.titre}](${piste.page})`,
            `**Auteur :** ${piste.auteur}${piste.duree ? ` · **Durée :** ${formaterDuree(duree)}` : ""}`,
            `${barreProgression(position, duree)}  \`${tempsLecture(position, duree)}\``,
            `**Demandé par :** ${salle.courante.demandeur}`,
            salle.enPause ? "**État :** en pause" : null,
          ]
            .filter(Boolean)
            .join("\n"),
          "En cours de lecture",
        ).setThumbnail(piste.vignette),
      ],
    });
  },
};

const cmdParoles = {
  nom: "paroles",
  categorie: "musique",
  resume: "Cherche les paroles d'un morceau.",
  detail:
    "Sans argument, cherche les paroles du morceau en cours. Avec `GENIUS_TOKEN`, l'API officielle de Genius est utilisée ; sinon, la recherche publique du site.",
  donnees: new SlashCommandBuilder()
    .setName("paroles")
    .setDescription("Affiche les paroles d'un morceau.")
    .addStringOption((option) =>
      option.setName("morceau").setDescription("« Artiste - Titre » (le morceau en cours par défaut)").setMaxLength(200),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply();

    let recherche = interaction.options.getString("morceau");
    if (!recherche) {
      const salle = contexte.lecteur.obtenir(interaction.guildId);
      if (!salle?.courante) {
        throw new ErreurUtilisateur("Précisez un morceau, ou lancez une lecture d'abord.");
      }
      recherche = `${salle.courante.piste.auteur} - ${salle.courante.piste.titre}`;
    }

    const trouvees = await trouverParoles(recherche).catch(() => null);
    if (!trouvees) {
      await interaction.editReply({
        embeds: [
          attention(
            `Aucune parole trouvée pour **${recherche}**. Essayez la forme « Artiste - Titre ».`,
            "Rien trouvé",
          ),
        ],
      });
      return;
    }

    // Les paroles dépassent souvent la limite d'un embed : on les envoie en
    // texte, découpées proprement, avec la source en tête.
    const morceaux = decouper(trouvees.texte, 1900);
    await interaction.editReply({
      embeds: [
        information(
          [
            `**${trouvees.titre}**${trouvees.artiste ? ` — ${trouvees.artiste}` : ""}`,
            `Source : ${trouvees.url}`,
            morceaux.length > 1 ? `\n*(les paroles continuent dans les ${morceaux.length - 1} message(s) suivant(s))*` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          "Paroles",
        ),
      ],
    });

    for (const morceau of morceaux.slice(0, 4)) {
      await interaction.followUp({ content: morceau });
    }
  },
};

const cmdLastfm = {
  nom: "lastfm",
  categorie: "musique",
  resume: "Affiche les écoutes Last.fm d'un compte.",
  detail:
    "Demande `LASTFM_API_KEY` dans le fichier `.env` : sans elle, la commande explique ce qui manque au lieu de renvoyer une liste vide.",
  donnees: new SlashCommandBuilder()
    .setName("lastfm")
    .setDescription("Affiche les statistiques Last.fm d'un compte.")
    .addStringOption((option) =>
      option.setName("utilisateur").setDescription("Pseudo Last.fm (le vôtre par défaut)").setRequired(false).setMaxLength(60),
    ),
  async executer(interaction, contexte) {
    await interaction.deferReply();
    const depuis = interaction.options.getString("utilisateur") ?? interaction.user.username;

    if (!lastfmConfigure()) {
      throw new ErreurUtilisateur(
        "Last.fm n'est pas configuré. Il faut une clé d'API : `LASTFM_API_KEY` dans DelphinaBotV2/.env " +
          "(création gratuite sur https://www.last.fm/api/account/create).",
      );
    }

    try {
      const [compte, dernieres, meilleurs] = await Promise.all([
        profil(depuis),
        ecoutes(depuis, 5),
        artistes(depuis, 5),
      ]);

      const maintenant = dernieres.find((morceau) => morceau.enCours);

      await interaction.editReply({
        embeds: [
          information(
            [
              `${compte.url ? `[${compte.nom}](${compte.url})` : compte.nom}${compte.pays ? ` — ${compte.pays}` : ""}`,
              `**Écoutes :** ${compte.ecoutes}`,
              "",
              maintenant ? `**En ce moment :** ${maintenant.titre} — ${maintenant.artiste}` : null,
              "**Cinq dernières écoutes :**",
              ...dernieres.map((morceau) => `- ${morceau.titre} — ${morceau.artiste}${morceau.album ? ` *(${morceau.album})*` : ""}`),
              "",
              "**Artistes les plus écoutés :**",
              ...meilleurs.map((element) => `- ${element.nom} — ${element.ecoutes} écoutes`),
            ]
              .filter((ligne) => ligne !== null)
              .join("\n"),
            `Last.fm — ${compte.nom}`,
          ).setFooter({ text: `DelphinaBot · ${contexte.configuration.wikiUrl || "données Last.fm"}` }),
        ],
      });
    } catch (erreurRecue) {
      throw new ErreurUtilisateur(
        erreurRecue instanceof ErreurLastfm ? erreurRecue.message : `Last.fm a échoué : ${erreurRecue.message}`,
      );
    }
  },
};

const cmdPanneau = {
  nom: "panneau",
  categorie: "musique",
  resume: "Affiche le panneau de contrôle de la musique dans ce salon.",
  detail:
    "Le panneau apparaît tout seul avec le premier morceau joué et suit la lecture : barre de progression, file à venir, boutons pause, suivant, répétition et arrêt. Cette commande sert à le déplacer dans un autre salon.",
  donnees: new SlashCommandBuilder()
    .setName("panneau")
    .setDescription("Affiche ici le panneau de contrôle de la musique."),
  async executer(interaction, contexte) {
    const salle = contexte.lecteur.obtenir(interaction.guildId);
    if (!salle) {
      throw new ErreurUtilisateur("Je ne joue rien dans ce serveur : lancez `/jouer` d'abord.");
    }

    const pose = await poserPanneau(interaction, contexte);
    await interaction.reply({
      embeds: [
        pose
          ? succes("Le panneau suivra la lecture dans ce salon.", "Panneau affiché")
          : attention("Je n'ai pas la permission d'écrire dans ce salon.", "Panneau impossible"),
      ],
      flags: 64,
    });
  },
};

export const COMMANDES_MUSIQUE = [
  cmdJouer,
  cmdPause,
  cmdReprendre,
  cmdSuivant,
  cmdArreter,
  cmdFile,
  cmdRetirer,
  cmdDeplacer,
  cmdVolume,
  cmdBoucle,
  cmdMelanger,
  cmdEnCours,
  cmdPanneau,
  cmdParoles,
  cmdVolume,
  cmdLastfm,
];
