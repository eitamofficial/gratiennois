/**
 * Les quinze œufs.
 *
 * Chaque entrée est une page distincte, verrouillée par un mécanisme différent.
 * Les quinze sont déclarées ici plutôt que réparties dans quinze fichiers : une
 * seule source à maintenir, et le contenu de chaque page reste regroupé avec son
 * verrou.
 *
 * Deux règles s'appliquent à toutes les entrées. On nomme les titres d'albums et
 * de morceaux, jamais les paroles : recopier une chanson poserait un problème
 * de droits disproportionné pour le plaisir que l'on en tire. Et on privilégie
 * ce que personne ne raconte dans les dictionnaires, car c'est la seule chose
 * qui distingue une page de fan d'une page de Wikipédia.
 */

/** Un verrou est soit un mot à taper, soit une suite de touches exacte. */
export type Verrou =
  | { genre: "mot"; valeur: string }
  | { genre: "touches"; valeur: string[] };

export interface Oeuf {
  /** Identifiant, qui est aussi le dernier segment de l'URL. */
  id: string;
  titre: string;
  /** L'année, affichée en sous-titre. */
  annee: string;
  /** Une ligne qui résume, visible sur la page fermée. */
  teaser: string;
  verrou: Verrou;
  contenu: string[];
}

export const OEUFS: Oeuf[] = [
  {
    id: "fenix",
    titre: "Fénix",
    annee: "2014",
    teaser: "Un disque qu'elle a produit seule, entre deux nuits.",
    verrou: { genre: "mot", valeur: "fenix" },
    contenu: [
      "L'album est sorti l'année de la naissance de sa deuxième fille, et il porte le nom d'un oiseau qui se relève de ses cendres. Le titre n'était pas décoratif : c'était le sujet.",
      "Sur ce disque, elle produit, compose et joue. La collaboration avec Diplo et Black Magic, qui domine l'album précédent, tient en deux titres. Le reste est du rock, du rap et de l'électronique, trois genres qu'elle ne s'était pas encore autorisés.",
      "C'est son disque le plus personnel, et le premier où l'on entend une femme décrire son épuisement au lieu de le mettre en scène.",
    ],
  },
  {
    id: "suerte",
    titre: "Suerte",
    annee: "2001",
    teaser: "Une chanson écrite en une session, dont on n'a gardé que la moitié.",
    verrou: { genre: "touches", valeur: ["s", "u", "e", "r", "t", "e"] },
    contenu: [
      "Whenever, Wherever existe en deux versions. Les deux ont été enregistrées dans la même session, en anglais et en espagnol, sur la même mélodie.",
      "Le label a choisi l'anglais, qui était le morceau le plus vendu au monde hors des marchés hispaniques. Elle a gardé l'espagnol, l'a ressorti en simple et l'a lancé à son tour.",
      "Il est passé numéro un en Espagne, et c'est aujourd'hui le titre le plus connu de sa première période francophone, précisément parce qu'il n'est pas en français.",
    ],
  },
  {
    id: "ojos",
    titre: "Ojos Así",
    annee: "2001",
    teaser: "Un article de Wikipédia que ses fans ont défendu pendant des années.",
    verrou: { genre: "mot", valeur: "ojos" },
    contenu: [
      "Le morceau ouvre l'album du même nom et contient le motif qui a fait connaître sa voix dans le monde entier. Tout le titre tient en une phrase.",
      "Sa carrière a commencé par un article de Wikipédia trafiqué. En 2002, des étudiants s'emparent de sa page pour y inscrire une biographie imaginaire, celle d'une star de cinéma. Les fans la remettent en place, les étudiants la reprennent, et pendant plusieurs années la page oscille entre les deux versions.",
      "Le projet a fini par la semi-protéger, un sort rarement accordé à une chanteuse. L'anecdote est devenue l'un des exemples les plus cités de guerre d'édition sur ce site.",
    ],
  },
  {
    id: "tortura",
    titre: "La Tortura",
    annee: "2005",
    teaser: "Le morceau qui a prouvé qu'elle produisait aussi ses titres.",
    verrou: { genre: "mot", valeur: "tortura" },
    contenu: [
      "Fijación Oral est son album le plus expérimental, et ce morceau en est le plus radical. La production est électronique, la structure est dansante, et la voix monte dans un registre que presque personne ne lui connaissait.",
      "Le texte joue sur le double sens que le titre annonce. Le morceau est resté numéro un pendant plusieurs semaines en Amérique latine.",
      "C'est le premier disque sur lequel elle écrit, compose et mixe sous son propre nom.",
    ],
  },
  {
    id: "huesos",
    titre: "Los Huesos",
    annee: "2005",
    teaser: "Le plus grand succès commercial de sa première période espagnole.",
    verrou: { genre: "touches", valeur: ["Shift+h", "u", "e", "s", "o", "s"] },
    contenu: [
      "C'est le morceau le plus vendu en langue espagnole de sa génération, et pas de loin. Il est resté en tête des ventes latino-américaines pendant des mois, dans plusieurs pays à la fois.",
      "Le titre signifie les os. Le texte joue sur ce que l'os porte, et le morceau ne raconte rien : il affirme.",
      "C'est aussi l'un de ceux que ses propres fans citent le plus souvent, parce qu'il appartient à l'époque où l'espagnol et l'anglais cohabitaient dans la même chanson.",
    ],
  },
  {
    id: "hips",
    titre: "Hips Don't Lie",
    annee: "2006",
    teaser: "Un sample, un procès, et une réconciliation.",
    verrou: { genre: "touches", valeur: ["Shift+h", "Shift+d"] },
    contenu: [
      "Le morceau a été écrit à la Barbade avec Wyclef Jean, à partir d'une idée simple : les hanches ne mentent pas. Le riff de marimba arrive en premier, et il n'appartient à personne d'autre.",
      "Un an plus tard, un groupe de danseurs publie une chanson qui reprend le refrain. Le procès qui suit se termine à l'amiable, et elle les invite sur sa tournée.",
      "C'est le premier titre qui l'a placée en tête des ventes : plus de dix millions d'exemplaires, et le morceau le plus vendu de la décennie en téléchargement numérique.",
    ],
  },
  {
    id: "rabia",
    titre: "Rabia",
    annee: "2014",
    teaser: "Sept minutes, une seule prise, presque aucun montage.",
    verrou: { genre: "mot", valeur: "rabia" },
    contenu: [
      "Le titre signifie la rage. Le morceau a été écrit pendant une nuit d'insomnie, et c'est le plus dépouillé de sa carrière : une basse, une voix, aucun refrain permettant de se reprendre.",
      "Le clip a été tourné en une seule prise de sept minutes, sans montage.",
      "Il ouvre l'album Fénix et en donne le ton : pas de message positif, pas de ballet, juste une femme qui dit ce qu'elle a et ce qu'elle n'a plus.",
    ],
  },
  {
    id: "waka",
    titre: "Waka Waka",
    annee: "2010",
    teaser: "Elle zozotait depuis l'enfance. Elle en a fait un titre.",
    verrou: { genre: "touches", valeur: ["w", "w"] },
    contenu: [
      "Elle zozote depuis l'enfance. Le titre de la chanson d'ouverture de la Coupe du monde reprend ce zozotement, volontairement, deux fois dans le refrain.",
      "L'idée vient d'un producteur qui travaille avec elle depuis le début : le défaut devient le nom du morceau, et le morceau devient le plus vendu de la compétition.",
      "Elle a chanté la finale à Johannesburg, devant un public qui scandait le refrain avant même la première ligne. C'est probablement son moment le plus près de son public.",
    ],
  },
  {
    id: "eldorado",
    titre: "El Dorado",
    annee: "2017",
    teaser: "Un disque de salsa et de vallenato, avec un invité inattendu.",
    verrou: { genre: "mot", valeur: "eldorado" },
    contenu: [
      "Carlos Vives est l'autre moitié du disque. Entre lui et elle, la musique se déplace vers la salsa et le vallenato, deux genres qu'elle aimait et qu'elle n'avait jamais repris à son compte.",
      "Le titre fait clin d'œil au premier album de Carlos Vives. L'enregistrement s'est fait en partie à Carthagène et en partie à Cuba.",
      "C'est de là que sortent les deux morceaux qui ont nourrissé le phénomène de mèmes de 2017, dont une reprise de Nicki Minaj, qui en a enregistré sa propre version.",
    ],
  },
  {
    id: "chantaje",
    titre: "Chantaje",
    annee: "2017",
    teaser: "Le morceau le plus écouté de l'année en langue espagnole.",
    verrou: {
      genre: "touches",
      valeur: ["c", "Shift+h", "a", "n", "t", "a", "j", "e"],
    },
    contenu: [
      "C'est le morceau le plus streamé de 2017 en langue espagnole, et l'un des plus streamés toutes plateformes confondues. Il a dépassé le milliard d'écoutes avant la fin de l'année.",
      "Le clip, tourné en une nuit, met en scène un combat de malambo, une danse d'Argentine. La phrase la plus célèbre du morceau est une menace de rupture.",
      "Il a été écrit par un auteur cubain qui lui a envoyé la première version au téléphone, un mardi, et qui n'y croyait pas.",
    ],
  },
  {
    id: "chq",
    titre: "شكرا",
    annee: "racines",
    teaser: "Ce que signifie un nom, et d'où il vient.",
    verrou: { genre: "mot", valeur: "شكرا" },
    contenu: [
      "Shakira signifie être reconnaissant en arabe. Ce n'est pas une marque, ce n'est pas un prénom d'artiste : c'est un mot, et elle le corrige dans chaque interview.",
      "Sa branche maternelle est libanaise. Sa grand-mère est arrivée en Colombie pendant la guerre civile libanaise, et la famille parlait encore l'arabe à la maison quand elle est née. Elle a appris cette langue avant l'espagnol.",
      "Elle raconte régulièrement se sentir à la fois arabe et colombienne, et place ses deux grands-mères au premier rang de sa vie. C'est la réponse qu'elle donne à toutes les questions sur ses racines.",
    ],
  },
  {
    id: "bzrp",
    titre: "Bzrp",
    annee: "2023",
    teaser: "Six minutes d'improvisation, adoptées d'un coup.",
    verrou: { genre: "touches", valeur: ["b", "z", "r", "p"] },
    contenu: [
      "Le principe des Bzrp Music Sessions est simple : un producteur invite un artiste, et le morceau est une improvisation totale, enregistrée en studio, sans partition et sans répétition.",
      "Le volume 53, son apparition, a été publié un soir de janvier 2023 et repris partout en quelques heures. Le morceau est un dialogue entre une voix, un producteur et un batteur, et rien n'y est répété deux fois.",
      "Ce succès lui a valu une tournée mondiale l'année suivante, et son entrée au classement des ventes, ce qu'aucune de ses sorties antérieures n'avait réussi à ce niveau.",
    ],
  },
  {
    id: "halftime",
    titre: "Mi mitad",
    annee: "2023",
    teaser: "La première mi-temps de l'histoire qui ne soit pas en anglais.",
    verrou: { genre: "touches", valeur: ["Shift+s", "b", "3", "4"] },
    contenu: [
      "Le Super Bowl de 2023 est le premier dont la mi-temps ne soit pas un spectacle en anglais. Bad Bunny ouvrait, Jhayco suivait, et elle est arrivée pour la dernière partie.",
      "Le morceau n'est pas le sien à l'origine. Elle l'a réécrit pour l'occasion et l'a chanté sur scène en espagnol.",
      "Le choix était un événement en soi. On a beaucoup écrit qu'une artiste latino-américaine ne pouvait pas tenir cette place, et c'est précisément ce que cette soirée a démontré le contraire.",
    ],
  },
  {
    id: "monumento",
    titre: "Monumento",
    annee: "2014",
    teaser: "Quatorze minutes sur le fait de vieillir.",
    verrou: { genre: "mot", valeur: "monumento" },
    contenu: [
      "Residente, de Calle 13, lui a proposé un morceau sur un sujet que personne ne lui avait proposé avant : l'âge. Il l'a écrit en castillan, et elle y a répondu par l'une des pages les plus dures de sa discographie.",
      "Le morceau durait quatorze minutes à l'origine. La version publiée a été raccourcie, mais la longueur d'origine est conservée sur l'enregistrement de concert.",
      "Le clip montre son visage vieillissant en accéléré, sans aucune retouche. C'est ce projet qui a rendu volontairement non retouchées les photos de groupe de l'album.",
    ],
  },
  {
    id: "anios",
    titre: "Años Luz",
    annee: "2008",
    teaser: "Le morceau-titre d'un disque sorti juste après un séisme.",
    verrou: { genre: "touches", valeur: ["a", "n", "i", "o", "s"] },
    contenu: [
      "Le titre signifie années-lumière, et le morceau est chanté à la première personne par une étoile. L'image est banale, mais elle a pris tout son sens dans le contexte du disque.",
      "L'album est sorti en octobre 2008, quelques semaines après le séisme du Pérou. La tournée qui a suivi a consacré une part des recettes aux victimes.",
      "On considère aujourd'hui ce disque comme la fin d'une période : la dernière où elle chantait principalement pour l'ambiance.",
    ],
  },
];

/** L'œuf d'un identifiant donné, ou `undefined` si la porte n'existe pas. */
export function trouverOeuf(id: string): Oeuf | undefined {
  return OEUFS.find((oeuf) => oeuf.id === id);
}

export const NOMBRE_OEUFS = OEUFS.length;
