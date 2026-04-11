/**
 * Données des actualités - Les Sages de Pandarie
 *
 * Pour ajouter une news : ajouter un objet en HAUT du tableau (la plus récente en premier).
 * Champs :
 *   date    : "YYYY-MM-DD"
 *   label   : "Progression" | "Organisation" | "Recrutement" | "Communauté"
 *   title   : titre de la news
 *   content : texte court (2-3 phrases max)
 *   link    : null  OU  { text: "Libellé du lien", url: "/chemin/vers/page.html" }
 */

const NEWS = [
    {
        date: "2026-04-11",
        label: "Progression",
        title: "Voidspire Normal — Clear complet !",
        content: "6/6 NM. Le Voidspire est nettoyé de fond en comble. Les Sages de Pandarie ont terminé le mode Normal et passent désormais à l'Héroïque. On continue à recruter — si tu veux faire partie de l'aventure, rejoins-nous.",
        link: { text: "Nous rejoindre", url: "/index.html#join" }
    },
    {
        date: "2026-04-09",
        label: "Progression",
        title: "Chimaerus Héroïque — Premier Kill !",
        content: "Deux heures de prog, des mécaniques revues à la hausse, et une détermination sans faille. Les Sages de Pandarie viennent de poser leur première pierre en Héroïque en décrochant le kill de Chimaerus HM. Le premier d'une longue série.",
        link: { text: "Voir le report WarcraftLogs", url: "https://www.warcraftlogs.com/reports/FN4kWqLPaxYVHtD7" }
    },
    {
        date: "2026-04-02",
        label: "Progression",
        title: "5/8 Voidspire Normal — les Sages taillent dans le Vide",
        content: "Chimaerus, Imperator Averzian, Vorasius, Roi-Déchu Salhadaar, et le duo Vaelgor & Ezzorak. Cinq boss. Une soirée. Les Sages de Pandarie entrent dans le Voidspire et font le ménage. La première soirée enregistrée sur WarcraftLogs, et déjà cinq cadavres à notre actif.",
        link: { text: "Voir le report WarcraftLogs", url: "https://www.warcraftlogs.com/reports/axTCgJjzVtMKBP4h" }
    },
    {
        date: "2026-03-26",
        label: "Progression",
        title: "4 boss Normal — les Sages sont en mode tueur",
        content: "Chimaerus, Imperator Averzian, Vorasius, Roi-Déchu Salhadaar — quatre cadavres, une soirée, zéro remords. Les Sages de Pandarie prouvent que la sagesse, c'est bien, mais une bonne hache dans la gueule d'un boss, c'est mieux. La suite au prochain épisode.",
        link: { text: "Voir la progression", url: "/progression.html" }
    },
    {
        date: "2026-03-20",
        label: "Progression",
        title: "Chimaerus à 19% !",
        content: "Premier raid Normal sur Midnight — on n'a pas vaincu Chimaerus mais on l'a mis à 19%. C'est très encourageant pour un premier soir ensemble, la suite s'annonce prometteuse.",
        link: null
    },
    {
        date: "2026-02-15",
        label: "Organisation",
        title: "Sondage de Présence",
        content: "Afin d'organiser au mieux le roster pour Midnight, merci de remplir vos disponibilités et souhaits de classes. Plus on est nombreux à répondre, mieux on peut planifier.",
        link: { text: "Accéder au sondage", url: "/roster/index.html" }
    },
    {
        date: "2026-01-10",
        label: "Recrutement",
        title: "Préparation Roster Midnight",
        content: "Nous préparons activement la prochaine extension. Rythme envisagé : 1 soir par semaine (à définir ensemble). Objectif : clean Normal, puis Héroïque — et qui sait pour la suite ?",
        link: null
    }
];
