/**
 * Navbar Configuration - Les Sages de Pandarie
 *
 * Pour ajouter/modifier des entrées, édite simplement les tableaux ci-dessous.
 * Les changements seront appliqués à toutes les pages automatiquement.
 */

const navConfig = {
    // Logo et lien accueil
    logo: {
        text: 'LES SAGES DE PANDARIE',
        href: '/index.html'
    },

    // Liens principaux (affichés directement dans la navbar)
    mainLinks: [
        { text: 'Accueil', href: '/index.html' },
        { text: 'Sondage Midnight', href: '/roster/index.html' }
    ],

    // Menus déroulants
    dropdowns: [
        {
            text: 'Outils',
            items: [
                { text: 'Composition de Raid', href: '/composition/index.html' }
                // Ajoute d'autres outils ici :
                // { text: 'Nouvel Outil', href: '/chemin/vers/outil.html' }
            ]
        }
        // Ajoute d'autres menus déroulants ici si besoin
    ],

    // Bouton CTA (call-to-action) - optionnel
    cta: {
        text: 'Rejoindre',
        href: '/index.html#join'
    }
};

/**
 * Génère et injecte la navbar dans la page
 */
function initNavbar() {
    // Trouve le conteneur navbar ou crée-le
    let navbar = document.querySelector('nav.navbar');

    if (!navbar) {
        navbar = document.createElement('nav');
        navbar.className = 'navbar';
        document.body.insertBefore(navbar, document.body.firstChild);
    }

    // Détermine le chemin de base selon la profondeur de la page
    const basePath = getBasePath();

    // Génère le HTML
    let html = `
        <a href="${basePath}${navConfig.logo.href}" class="nav-logo">
            <span style="color: var(--primary);">●</span> ${navConfig.logo.text}
        </a>
        <div class="nav-links">
    `;

    // Liens principaux
    navConfig.mainLinks.forEach(link => {
        const isActive = isCurrentPage(link.href);
        html += `<a href="${basePath}${link.href}" class="nav-link${isActive ? ' active' : ''}">${link.text}</a>`;
    });

    // Menus déroulants
    navConfig.dropdowns.forEach(dropdown => {
        const hasActiveItem = dropdown.items.some(item => isCurrentPage(item.href));
        html += `
            <div class="nav-dropdown">
                <button class="nav-link nav-dropdown-btn${hasActiveItem ? ' active' : ''}">
                    ${dropdown.text}
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    </svg>
                </button>
                <div class="nav-dropdown-menu">
                    ${dropdown.items.map(item => {
                        const isActive = isCurrentPage(item.href);
                        return `<a href="${basePath}${item.href}" class="nav-dropdown-item${isActive ? ' active' : ''}">${item.text}</a>`;
                    }).join('')}
                </div>
            </div>
        `;
    });

    html += `</div>`;

    // Bouton CTA
    if (navConfig.cta) {
        html += `<a href="${basePath}${navConfig.cta.href}" class="btn btn-primary">${navConfig.cta.text}</a>`;
    }

    navbar.innerHTML = html;

    // Initialise les événements dropdown
    initDropdownEvents();
}

/**
 * Calcule le chemin de base relatif selon la page actuelle
 */
function getBasePath() {
    const path = window.location.pathname;

    // Compte le nombre de segments dans le chemin (exclut le fichier)
    // /index.html -> 0 segments
    // /composition/index.html -> 1 segment
    // /roster/index.html -> 1 segment
    const segments = path.split('/').filter(s => s && !s.includes('.'));

    if (segments.length === 0) {
        return '.';
    }

    // Remonte d'un niveau par segment
    return segments.map(() => '..').join('/');
}

/**
 * Vérifie si le lien correspond à la page actuelle
 */
function isCurrentPage(href) {
    const currentPath = window.location.pathname;
    const normalizedHref = href.replace(/^\//, '');

    // Vérifie si le chemin actuel se termine par le href
    return currentPath.endsWith(normalizedHref) ||
           currentPath.endsWith(normalizedHref.replace('index.html', ''));
}

/**
 * Initialise les événements pour les menus déroulants
 */
function initDropdownEvents() {
    const dropdowns = document.querySelectorAll('.nav-dropdown');

    dropdowns.forEach(dropdown => {
        const btn = dropdown.querySelector('.nav-dropdown-btn');
        const menu = dropdown.querySelector('.nav-dropdown-menu');

        // Toggle au clic
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.contains('open');

            // Ferme tous les autres dropdowns
            document.querySelectorAll('.nav-dropdown.open').forEach(d => d.classList.remove('open'));

            // Toggle celui-ci
            if (!isOpen) {
                dropdown.classList.add('open');
            }
        });

        // Hover sur desktop
        dropdown.addEventListener('mouseenter', () => {
            if (window.innerWidth > 768) {
                dropdown.classList.add('open');
            }
        });

        dropdown.addEventListener('mouseleave', () => {
            if (window.innerWidth > 768) {
                dropdown.classList.remove('open');
            }
        });
    });

    // Ferme les dropdowns quand on clique ailleurs
    document.addEventListener('click', () => {
        document.querySelectorAll('.nav-dropdown.open').forEach(d => d.classList.remove('open'));
    });
}

// Initialise la navbar quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbar);
} else {
    initNavbar();
}
