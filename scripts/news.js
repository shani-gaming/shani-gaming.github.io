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
