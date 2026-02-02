// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD0cmazoD42kD_H243Do5pIPGhwXFgOHYE",
    authDomain: "guild-roster-67da7.firebaseapp.com",
    projectId: "guild-roster-67da7",
    storageBucket: "guild-roster-67da7.firebasestorage.app",
    messagingSenderId: "971948767326",
    appId: "1:971948767326:web:4377499f1ff23db1899ccf"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// Current user state
let currentUser = null;
let isUserAdmin = false;

// Toast Notification System
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 4000);
}

// Listen for auth state changes
auth.onAuthStateChanged(async user => {
    currentUser = user;

    if (user) {
        // Check if user is in admins collection
        try {
            const adminDoc = await db.collection('admins').doc(user.email).get();
            isUserAdmin = adminDoc.exists;

            if (isUserAdmin) {
                console.log('✅ Admin autorisé:', user.email);
            } else {
                console.log('⚠️ Utilisateur connecté mais pas admin:', user.email);
            }
        } catch (error) {
            console.error('Erreur vérification admin:', error);
            isUserAdmin = false;
        }
    } else {
        isUserAdmin = false;
    }

    updateAdminButton();
    renderRoster();
});

// Update admin button state
function updateAdminButton() {
    const adminBtn = document.querySelector('.admin-nav-item');
    if (!adminBtn) return; // Button not found, skip update

    // Show/hide admin controls section
    const adminControlsSection = document.getElementById('admin-controls-section');
    if (adminControlsSection) {
        adminControlsSection.style.display = (currentUser && isUserAdmin) ? 'block' : 'none';
    }

    if (currentUser && isUserAdmin) {
        adminBtn.innerHTML = '<span>✅</span> Admin (Connecté)';
        adminBtn.style.color = 'var(--primary)';
    } else if (currentUser && !isUserAdmin) {
        adminBtn.innerHTML = '<span>⚠️</span> Pas autorisé';
        adminBtn.style.color = 'var(--text-muted)';
    } else {
        adminBtn.innerHTML = '<span>⚙️</span> Mode Admin';
        adminBtn.style.color = '';
    }
}

// Specialization icons mapping
const specIcons = {
    // Death Knight
    'Sang': 'spell_deathknight_bloodpresence',
    'Givre': 'spell_deathknight_frostpresence',
    'Impie': 'spell_deathknight_unholypresence',
    // Demon Hunter
    'Dévastation': 'ability_demonhunter_specdps',
    'Vengeance': 'ability_demonhunter_spectank',
    // Druid
    'Équilibre': 'spell_nature_starfall',
    'Farouche': 'ability_druid_catform',
    'Gardien': 'ability_racial_bearform',
    'Restauration': 'spell_nature_healingtouch',
    // Evoker
    'Augmentation': 'classicon_evoker_augmentation',
    'Dévastation (Evoker)': 'classicon_evoker_devastation',
    'Préservation': 'classicon_evoker_preservation',
    // Hunter
    'Maîtrise des bêtes': 'ability_hunter_bestialdiscipline',
    'Précision': 'ability_hunter_focusedaim',
    'Survie': 'ability_hunter_camouflage',
    // Mage
    'Arcanes': 'spell_holy_magicalsentry',
    'Feu': 'spell_fire_firebolt02',
    'Givre (Mage)': 'spell_frost_frostbolt02',
    // Monk
    'Maître brasseur': 'monk_stance_drunkenox',
    'Tisse-brume': 'monk_stance_wiseserpent',
    'Marche-vent': 'monk_stance_whitetiger',
    // Paladin
    'Sacré': 'spell_holy_holybolt',
    'Protection (Paladin)': 'ability_paladin_shieldofthetemplar',
    'Vindicte': 'spell_holy_auraoflight',
    // Priest
    'Discipline': 'spell_holy_powerwordshield',
    'Sacré (Priest)': 'spell_holy_guardianspirit',
    'Ombre': 'spell_shadow_shadowwordpain',
    // Rogue
    'Assassinat': 'ability_rogue_eviscerate',
    'Hors-la-loi': 'ability_rogue_waylay',
    'Finesse': 'ability_stealth',
    // Shaman
    'Élémentaire': 'spell_nature_lightning',
    'Amélioration': 'spell_nature_lightningshield',
    'Restauration (Shaman)': 'spell_nature_magicimmunity',
    // Warlock
    'Affliction': 'spell_shadow_deathcoil',
    'Démonologie': 'spell_shadow_metamorphosis',
    'Destruction': 'spell_shadow_rainoffire',
    // Warrior
    'Armes': 'ability_warrior_savageblow',
    'Fureur': 'ability_warrior_innerrage',
    'Protection (Warrior)': 'ability_warrior_defensivestance'
};

// Get spec icon URL
function getSpecIcon(specName, className = null) {
    // Try with class suffix first (for specs that exist in multiple classes)
    let iconName = null;

    if (className) {
        // Map class IDs to readable names for suffixes
        const classNameMap = {
            'warrior': 'Warrior',
            'paladin': 'Paladin',
            'mage': 'Mage',
            'priest': 'Priest',
            'shaman': 'Shaman',
            'evoker': 'Evoker'
        };
        const classDisplayName = classNameMap[className];
        if (classDisplayName) {
            iconName = specIcons[`${specName} (${classDisplayName})`];
        }
    }

    // Fallback to spec name without suffix
    if (!iconName) {
        iconName = specIcons[specName];
    }

    if (!iconName) return null;
    return `https://wow.zamimg.com/images/wow/icons/medium/${iconName}.jpg`;
}

// Class specs data
const classSpecs = {
    warrior: [
        { name: 'Armes', role: 'melee' },
        { name: 'Fureur', role: 'melee' },
        { name: 'Protection', role: 'tank' }
    ],
    paladin: [
        { name: 'Sacré', role: 'healer' },
        { name: 'Protection', role: 'tank' },
        { name: 'Vindicte', role: 'melee' }
    ],
    hunter: [
        { name: 'Maîtrise des bêtes', role: 'ranged' },
        { name: 'Précision', role: 'ranged' },
        { name: 'Survie', role: 'melee' }
    ],
    rogue: [
        { name: 'Assassinat', role: 'melee' },
        { name: 'Hors-la-loi', role: 'melee' },
        { name: 'Finesse', role: 'melee' }
    ],
    priest: [
        { name: 'Discipline', role: 'healer' },
        { name: 'Sacré', role: 'healer' },
        { name: 'Ombre', role: 'ranged' }
    ],
    shaman: [
        { name: 'Élémentaire', role: 'ranged' },
        { name: 'Amélioration', role: 'melee' },
        { name: 'Restauration', role: 'healer' }
    ],
    mage: [
        { name: 'Arcanes', role: 'ranged' },
        { name: 'Feu', role: 'ranged' },
        { name: 'Givre', role: 'ranged' }
    ],
    warlock: [
        { name: 'Affliction', role: 'ranged' },
        { name: 'Démonologie', role: 'ranged' },
        { name: 'Destruction', role: 'ranged' }
    ],
    monk: [
        { name: 'Maître brasseur', role: 'tank' },
        { name: 'Tisse-brume', role: 'healer' },
        { name: 'Marche-vent', role: 'melee' }
    ],
    druid: [
        { name: 'Équilibre', role: 'ranged' },
        { name: 'Farouche', role: 'melee' },
        { name: 'Gardien', role: 'tank' },
        { name: 'Restauration', role: 'healer' }
    ],
    dh: [
        { name: 'Dévastation', role: 'melee' },
        { name: 'Vengeance', role: 'tank' }
    ],
    dk: [
        { name: 'Sang', role: 'tank' },
        { name: 'Givre', role: 'melee' },
        { name: 'Impie', role: 'melee' }
    ],
    evoker: [
        { name: 'Dévastation', role: 'ranged' },
        { name: 'Préservation', role: 'healer' },
        { name: 'Augmentation', role: 'ranged' }
    ]
};

// Roster data - synced with Firestore (unlimited slots)
let roster = {
    tanks: [],
    healers: [],
    melee: [],
    ranged: []
};

// Admin mode
let isAdminMode = false;

// Initialize the page
function init() {
    // Listen to Firestore changes in real-time
    db.collection('roster').onSnapshot(snapshot => {
        // Reset roster (unlimited slots)
        roster = {
            tanks: [],
            healers: [],
            melee: [],
            ranged: []
        };

        // Populate from Firestore (supports unlimited roster)
        snapshot.forEach(doc => {
            const data = doc.data();
            const section = data.section;
            const index = data.index;

            if (roster[section] !== undefined) {
                // Ensure array is large enough
                while (roster[section].length <= index) {
                    roster[section].push(null);
                }

                roster[section][index] = {
                    id: doc.id,
                    name: data.name,
                    class: data.class,
                    spec: data.spec,
                    role: data.role,
                    flexRole: data.flexRole || null,
                    notes: data.notes || null,
                    availability: data.availability || null,
                    enchantPercentage: data.enchantPercentage !== undefined ? data.enchantPercentage : null,
                    gemPercentage: data.gemPercentage !== undefined ? data.gemPercentage : null,
                    avatarUrl: data.avatarUrl || null,
                    realmSlug: data.realmSlug || null
                };
            }
        });

        renderRoster();
        updateStats();
    }, error => {
        console.error('Erreur Firestore:', error);
        showToast('Erreur de connexion à la base de données. Vérifiez votre connexion Internet.', 'error');
    });
}

// Render all roster sections
function renderRoster() {
    const tbody = document.getElementById('roster-tbody');
    const emptyRoster = document.getElementById('empty-roster');
    const table = document.getElementById('roster-table');
    const adminColumn = document.getElementById('admin-column');

    tbody.innerHTML = '';

    // Collect all players with their section info
    const allPlayers = [];
    const sections = [
        { key: 'tanks', role: 'tank', roleName: 'Tank' },
        { key: 'healers', role: 'healer', roleName: 'Healer' },
        { key: 'melee', role: 'melee', roleName: 'DPS' },
        { key: 'ranged', role: 'ranged', roleName: 'DPS' }
    ];

    sections.forEach(section => {
        roster[section.key].forEach((player, index) => {
            if (player) {
                allPlayers.push({
                    ...player,
                    sectionKey: section.key,
                    sectionIndex: index,
                    roleType: section.role,
                    roleName: section.roleName
                });
            }
        });
    });

    // Show/hide empty state
    if (allPlayers.length === 0) {
        table.style.display = 'none';
        emptyRoster.style.display = 'block';
        return;
    } else {
        table.style.display = 'table';
        emptyRoster.style.display = 'none';
    }

    // Show/hide admin column header
    if (adminColumn) {
        adminColumn.style.display = isUserAdmin ? 'table-cell' : 'none';
    }

    // Render each player as table row
    allPlayers.forEach(player => {
        const row = document.createElement('tr');
        row.className = `class-${player.class}`;

        // Character link
        const characterUrl = player.realmSlug ?
            `https://worldofwarcraft.blizzard.com/fr-fr/character/eu/${player.realmSlug}/${player.name.toLowerCase()}` : null;

        // Name cell with hover tooltip
        const nameCell = `
            <td class="player-name-cell"
                onmouseenter="showTooltip(event, ${JSON.stringify(player).replace(/"/g, '&quot;')})"
                onmouseleave="hideTooltip()">
                ${characterUrl ?
                    `<a href="${characterUrl}" target="_blank" rel="noopener noreferrer" class="player-name-link">${player.name}</a>` :
                    `<span style="color: var(--gold);">${player.name}</span>`
                }
            </td>
        `;

        // Class cell with class color
        const className = getClassName(player.class);
        const classCell = `<td class="class-cell class-${player.class}" style="color: var(--${player.class});">${className}</td>`;

        // Spec cell with icon (Main + Off spec)
        const specIconUrl = player.spec ? getSpecIcon(player.spec, player.class) : null;
        const offSpecIconUrl = player.offSpec ? getSpecIcon(player.offSpec, player.class) : null;

        let specCellContent = '';
        if (specIconUrl) {
            specCellContent = `
                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                    <div style="display: flex; align-items: center;">
                        <img src="${specIconUrl}" alt="${player.spec}" style="width: 18px; height: 18px; border-radius: 2px; vertical-align: middle; margin-right: 0.5rem;">
                        <span style="font-weight: 600;">${player.spec}</span>
                    </div>
                    ${player.offSpec && offSpecIconUrl ? `
                        <div style="display: flex; align-items: center; opacity: 0.7; font-size: 0.85rem;">
                            <img src="${offSpecIconUrl}" alt="${player.offSpec}" style="width: 14px; height: 14px; border-radius: 2px; vertical-align: middle; margin-right: 0.4rem;">
                            <span>Off: ${player.offSpec}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            specCellContent = player.spec || '-';
        }

        const specCell = `<td class="spec-cell">${specCellContent}</td>`;

        // ilvl cell
        const ilvlValue = player.notes ? extractIlvl(player.notes) : null;
        const ilvlCell = `<td class="ilvl-cell">${ilvlValue || '-'}</td>`;

        // Enchant badge
        const enchantBadge = getStatBadge(player.enchantPercentage);
        const enchantCell = `<td style="text-align: center;">${enchantBadge}</td>`;

        // Gem badge
        const gemBadge = getStatBadge(player.gemPercentage);
        const gemCell = `<td style="text-align: center;">${gemBadge}</td>`;

        // Role badge with flex role
        const roleBadge = `<span class="role-badge ${player.roleType}">${player.roleName}</span>`;

        let roleContent = roleBadge;
        if (player.flexRole) {
            // Map flex role to display name
            const flexRoleMap = {
                'tank': 'Tank',
                'healer': 'Healer',
                'melee': 'DPS',
                'ranged': 'DPS',
                'dps': 'DPS'
            };
            const flexRoleName = flexRoleMap[player.flexRole] || player.flexRole;
            const flexClass = player.flexRole === 'dps' ? 'melee' : player.flexRole; // Use melee class for dps styling
            roleContent = `
                <div style="display: flex; flex-direction: column; gap: 0.25rem; align-items: center;">
                    ${roleBadge}
                    <span class="role-badge ${flexClass}" style="opacity: 0.7; font-size: 0.75rem;">Flex: ${flexRoleName}</span>
                </div>
            `;
        }

        const roleCell = `<td style="text-align: center;">${roleContent}</td>`;

        // Availability badges
        const availabilityBadges = player.availability && Array.isArray(player.availability) ?
            player.availability.map(day => `<span class="availability-badge">${day}</span>`).join('') :
            '-';
        const availabilityCell = `<td style="text-align: center;"><div class="availability-badges">${availabilityBadges}</div></td>`;

        // Actions cell (admin only)
        const actionsCell = isUserAdmin ? `
            <td class="actions-cell" style="display: table-cell;">
                <button class="table-action-btn" onclick="refreshPlayerArmory('${player.id}', '${player.name}', '${player.realmSlug || 'hyjal'}')">🔄</button>
                <button class="table-action-btn" onclick="editPlayer('${player.sectionKey}', ${player.sectionIndex})">✏</button>
                <button class="table-action-btn" onclick="removePlayer('${player.sectionKey}', ${player.sectionIndex})">🗑</button>
            </td>
        ` : '<td class="actions-cell" style="display: none;"></td>';

        row.innerHTML = nameCell + classCell + specCell + ilvlCell + enchantCell + gemCell + roleCell + availabilityCell + actionsCell;
        tbody.appendChild(row);
    });
}

// Extract ilvl from notes field
function extractIlvl(notes) {
    if (!notes) return null;
    const match = notes.match(/ilvl\s*(\d+)/i);
    return match ? match[1] : null;
}

// Generate stat badge HTML
function getStatBadge(percentage) {
    if (percentage === null || percentage === undefined) return '-';

    const badgeClass = percentage === 100 ? 'full' :
                      percentage >= 80 ? 'partial' : 'missing';
    return `<span class="stat-badge ${badgeClass}">${percentage}%</span>`;
}

// Show character tooltip
function showTooltip(event, player) {
    const tooltip = document.getElementById('character-tooltip');
    const content = tooltip.querySelector('.tooltip-content');

    // Build tooltip HTML
    const avatarHTML = player.avatarUrl ?
        `<img src="${player.avatarUrl}" alt="${player.name}" class="tooltip-avatar">` : '';

    const ilvl = player.notes ? extractIlvl(player.notes) : null;
    const className = getClassName(player.class);
    const specIconUrl = player.spec ? getSpecIcon(player.spec, player.class) : null;
    const specDisplay = specIconUrl ?
        `<img src="${specIconUrl}" style="width: 16px; height: 16px; border-radius: 2px; vertical-align: middle; margin-right: 0.4rem;">${player.spec}` :
        player.spec;

    content.innerHTML = `
        <div class="tooltip-header">
            ${avatarHTML}
            <div class="tooltip-title">
                <div class="tooltip-name" style="color: var(--${player.class});">${player.name}</div>
                <div class="tooltip-class-spec">${className} - ${specDisplay}</div>
            </div>
        </div>
        <div class="tooltip-stats">
            ${ilvl ? `
                <div class="tooltip-stat-row">
                    <span class="tooltip-stat-label">Item Level</span>
                    <span class="tooltip-stat-value" style="color: var(--gold);">${ilvl}</span>
                </div>
            ` : ''}
            ${player.enchantPercentage !== null ? `
                <div class="tooltip-stat-row">
                    <span class="tooltip-stat-label">Enchantements</span>
                    <span class="tooltip-stat-value">${getStatBadge(player.enchantPercentage)}</span>
                </div>
            ` : ''}
            ${player.gemPercentage !== null ? `
                <div class="tooltip-stat-row">
                    <span class="tooltip-stat-label">Gemmes</span>
                    <span class="tooltip-stat-value">${getStatBadge(player.gemPercentage)}</span>
                </div>
            ` : ''}
            ${player.offSpec ? `
                <div class="tooltip-stat-row">
                    <span class="tooltip-stat-label">Off Spec</span>
                    <span class="tooltip-stat-value">
                        ${getSpecIcon(player.offSpec, player.class) ?
                            `<img src="${getSpecIcon(player.offSpec, player.class)}" style="width: 14px; height: 14px; border-radius: 2px; vertical-align: middle; margin-right: 0.4rem;">` :
                            ''}
                        ${player.offSpec}
                    </span>
                </div>
            ` : ''}
            ${player.notes ? `
                <div class="tooltip-stat-row">
                    <span class="tooltip-stat-label">Notes</span>
                    <span class="tooltip-stat-value" style="font-size: 0.85rem;">${player.notes}</span>
                </div>
            ` : ''}
            ${player.availability && Array.isArray(player.availability) && player.availability.length > 0 ? `
                <div class="tooltip-stat-row">
                    <span class="tooltip-stat-label">Disponibilité</span>
                    <span class="tooltip-stat-value" style="font-size: 0.85rem;">${player.availability.join(', ')}</span>
                </div>
            ` : ''}
            ${player.flexRole ? `
                <div class="tooltip-stat-row">
                    <span class="tooltip-stat-label">Rôle Flex</span>
                    <span class="tooltip-stat-value" style="font-size: 0.85rem;">
                        ${(() => {
                            const flexMap = {'tank': 'Tank', 'healer': 'Healer', 'melee': 'DPS', 'ranged': 'DPS', 'dps': 'DPS'};
                            return flexMap[player.flexRole] || player.flexRole;
                        })()}
                    </span>
                </div>
            ` : ''}
        </div>
    `;

    // Position tooltip
    tooltip.classList.add('active');
    positionTooltip(event, tooltip);
}

// Hide character tooltip
function hideTooltip() {
    const tooltip = document.getElementById('character-tooltip');
    tooltip.classList.remove('active');
}

// Position tooltip near mouse
function positionTooltip(event, tooltip) {
    const offset = 15;
    let x = event.clientX + offset;
    let y = event.clientY + offset;

    // Prevent tooltip from going off-screen
    const tooltipRect = tooltip.getBoundingClientRect();
    if (x + tooltipRect.width > window.innerWidth) {
        x = event.clientX - tooltipRect.width - offset;
    }
    if (y + tooltipRect.height > window.innerHeight) {
        y = event.clientY - tooltipRect.height - offset;
    }

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
}

// Get class display name
function getClassName(classId) {
    const names = {
        warrior: 'Guerrier',
        paladin: 'Paladin',
        hunter: 'Chasseur',
        rogue: 'Voleur',
        priest: 'Prêtre',
        shaman: 'Chaman',
        mage: 'Mage',
        warlock: 'Démoniste',
        monk: 'Moine',
        druid: 'Druide',
        dh: 'Chasseur de démons',
        dk: 'Chevalier de la mort',
        evoker: 'Évocateur'
    };
    return names[classId] || classId;
}

// Update stats display
function updateStats() {
    const tanks = roster.tanks.filter(p => p).length;
    const healers = roster.healers.filter(p => p).length;
    const melee = roster.melee.filter(p => p).length;
    const ranged = roster.ranged.filter(p => p).length;
    const total = tanks + healers + melee + ranged;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-tanks').textContent = tanks;
    document.getElementById('stat-healers').textContent = healers;
    document.getElementById('stat-dps').textContent = melee + ranged;
}

// Open registration form
function openForm() {
    document.getElementById('form-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close registration form
function closeForm() {
    document.getElementById('form-overlay').classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('registration-form').reset();
    document.getElementById('registration-form').style.display = 'none';
    document.getElementById('player-spec').innerHTML = '<option value="">Choisis d\'abord ta classe</option>';
    document.getElementById('player-offspec').innerHTML = '<option value="">Aucune / Choisis d\'abord ta classe</option>';
    // Clear equipment and character data
    document.getElementById('equipment-enchant-percent').value = '';
    document.getElementById('equipment-gem-percent').value = '';
    document.getElementById('character-avatar-url').value = '';
    document.getElementById('character-realm-slug').value = '';
    // Hide availability error
    document.getElementById('availability-error').style.display = 'none';
}

// Toggle manual form visibility
function toggleManualForm() {
    const form = document.getElementById('registration-form');
    if (form.style.display === 'none') {
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
}

// Update specs based on class selection
function updateSpecs() {
    const classSelect = document.getElementById('player-class');
    const specSelect = document.getElementById('player-spec');
    const offSpecSelect = document.getElementById('player-offspec');
    const roleSelect = document.getElementById('player-role');
    const selectedClass = classSelect.value;

    specSelect.innerHTML = '<option value="">Sélectionne ta spé</option>';
    offSpecSelect.innerHTML = '<option value="">Aucune</option>';

    if (selectedClass && classSpecs[selectedClass]) {
        classSpecs[selectedClass].forEach(spec => {
            // Main spec option
            const option = document.createElement('option');
            option.value = spec.name;
            option.textContent = spec.name;
            option.dataset.role = spec.role;
            specSelect.appendChild(option);

            // Off spec option (same specs available)
            const offSpecOption = document.createElement('option');
            offSpecOption.value = spec.name;
            offSpecOption.textContent = spec.name;
            offSpecOption.dataset.role = spec.role;
            offSpecSelect.appendChild(offSpecOption);
        });

        // Auto-select role based on main spec
        specSelect.onchange = () => {
            const selectedOption = specSelect.options[specSelect.selectedIndex];
            if (selectedOption.dataset.role) {
                // If role is melee or ranged, set to "dps"
                const role = selectedOption.dataset.role;
                roleSelect.value = (role === 'melee' || role === 'ranged') ? 'dps' : role;
            }
        };
    }
}

// Update flex role based on off spec selection
function updateFlexRole() {
    const offSpecSelect = document.getElementById('player-offspec');
    const flexRoleSelect = document.getElementById('player-flex-role');
    const selectedOption = offSpecSelect.options[offSpecSelect.selectedIndex];

    if (selectedOption.dataset.role) {
        // If role is melee or ranged, set to "dps"
        const role = selectedOption.dataset.role;
        flexRoleSelect.value = (role === 'melee' || role === 'ranged') ? 'dps' : role;
    } else {
        // If "Aucune" is selected, reset flex role
        flexRoleSelect.value = '';
    }
}

// Check for duplicate player name
function isDuplicateName(name, excludeSection = null, excludeIndex = null) {
    const allSections = ['tanks', 'healers', 'melee', 'ranged'];
    for (const section of allSections) {
        for (let i = 0; i < roster[section].length; i++) {
            const player = roster[section][i];
            if (player && player.name.toLowerCase() === name.toLowerCase()) {
                if (excludeSection === section && excludeIndex === i) {
                    continue; // Skip this slot (for editing)
                }
                return true;
            }
        }
    }
    return false;
}

// Submit registration
async function submitForm(event) {
    event.preventDefault();

    const playerName = document.getElementById('player-name').value.trim();

    // Check for duplicate
    if (isDuplicateName(playerName)) {
        showToast(`Le pseudo "${playerName}" est déjà inscrit au roster ! Veuillez en choisir un autre.`, 'error');
        return;
    }

    // Validate availability (at least one day must be selected)
    const availabilityCheckboxes = document.querySelectorAll('input[name="availability"]:checked');
    const availabilityError = document.getElementById('availability-error');

    if (availabilityCheckboxes.length === 0) {
        availabilityError.style.display = 'block';
        showToast('Veuillez sélectionner au moins un jour de disponibilité', 'error');
        return;
    } else {
        availabilityError.style.display = 'none';
    }

    // Get selected availability days
    const selectedDays = Array.from(availabilityCheckboxes).map(cb => cb.value);

    const enchantPercent = document.getElementById('equipment-enchant-percent').value;
    const gemPercent = document.getElementById('equipment-gem-percent').value;
    const avatarUrl = document.getElementById('character-avatar-url').value;
    const realmSlug = document.getElementById('character-realm-slug').value;

    const playerClass = document.getElementById('player-class').value;
    const playerSpec = document.getElementById('player-spec').value;
    let playerRole = document.getElementById('player-role').value;
    let flexRole = document.getElementById('player-flex-role').value || null;

    // Convert "dps" to actual role (melee/ranged) based on spec
    if (playerRole === 'dps') {
        const specData = classSpecs[playerClass]?.find(s => s.name === playerSpec);
        playerRole = specData?.role || 'melee'; // Default to melee if not found
    }

    // Convert flex role "dps" to actual role based on off spec
    const playerOffSpec = document.getElementById('player-offspec').value;
    if (flexRole === 'dps' && playerOffSpec) {
        const offSpecData = classSpecs[playerClass]?.find(s => s.name === playerOffSpec);
        flexRole = offSpecData?.role || null;
    }

    const player = {
        name: playerName,
        class: playerClass,
        spec: playerSpec,
        offSpec: playerOffSpec || null,
        role: playerRole,
        flexRole: flexRole,
        notes: document.getElementById('player-notes').value || null,
        availability: selectedDays,
        enchantPercentage: enchantPercent ? parseInt(enchantPercent) : null,
        gemPercentage: gemPercent ? parseInt(gemPercent) : null,
        avatarUrl: avatarUrl || null,
        realmSlug: realmSlug || null
    };

    // Add to appropriate role section (unlimited slots)
    const roleMap = {
        tank: 'tanks',
        healer: 'healers',
        melee: 'melee',
        ranged: 'ranged'
    };

    const section = roleMap[player.role];
    const roleArray = roster[section];

    // Find next available index (supports unlimited roster)
    const nextIndex = roleArray.filter(p => p !== null).length;

    try {
        // Get Discord user info
        const discordUser = DiscordAuth.getUserInfo();
        if (!discordUser || !discordUser.userId) {
            showToast('Erreur: Authentification Discord requise', 'error');
            return;
        }

        // Submit via Cloud Function
        const response = await fetch(`${FUNCTIONS_BASE_URL}/submitRosterEntry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entry: {
                    ...player,
                    section: section,
                    index: nextIndex
                },
                discordUser: {
                    userId: discordUser.userId,
                    username: discordUser.username
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur serveur');
        }

        closeForm();
        showToast(`${player.name} a été inscrit comme ${player.spec} !`, 'success');
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        showToast('Erreur lors de l\'inscription. Veuillez réessayer.', 'error');
    }
}

// Remove player (admin only)
async function removePlayer(section, index) {
    if (!isUserAdmin) {
        showToast('Vous devez être un admin autorisé pour supprimer un joueur.', 'error');
        return;
    }

    const player = roster[section][index];
    if (!player || !player.id) return;

    if (confirm(`Retirer ${player.name} du roster ?`)) {
        try {
            const discordUser = DiscordAuth.getUserInfo();
            const response = await fetch(`${FUNCTIONS_BASE_URL}/deleteRosterEntry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entryId: player.id,
                    discordUser: {
                        userId: discordUser?.userId || 'admin',
                        username: discordUser?.username || 'admin'
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur serveur');
            }

            showToast(`${player.name} a été retiré du roster.`, 'success');
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            showToast('Erreur lors de la suppression. Vérifiez vos droits d\'admin.', 'error');
        }
    }
}

// Close form on overlay click
document.getElementById('form-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('form-overlay')) {
        closeForm();
    }
});

// Close form on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeForm();
    }
});

// Toggle admin mode with Google Auth
async function toggleAdminMode() {
    if (currentUser) {
        // Logout
        if (confirm('Se déconnecter du mode admin ?')) {
            try {
                await auth.signOut();
                showToast('Déconnecté du mode admin', 'success');
            } catch (error) {
                console.error('Erreur de déconnexion:', error);
            }
        }
    } else {
        // Login with Google
        try {
            await auth.signInWithPopup(provider);
            showToast('Connecté en mode admin !', 'success');
        } catch (error) {
            console.error('Erreur de connexion:', error);
            showToast('Erreur de connexion. Veuillez réessayer.', 'error');
        }
    }
}

// Edit player (admin mode)
async function editPlayer(section, index) {
    if (!isUserAdmin) {
        showToast('Vous devez être un admin autorisé pour modifier un joueur.', 'error');
        return;
    }

    const player = roster[section][index];
    if (!player || !player.id) return;

    // Pre-fill form with existing data
    document.getElementById('player-name').value = player.name;
    document.getElementById('player-class').value = player.class;
    updateSpecs();
    setTimeout(() => {
        document.getElementById('player-spec').value = player.spec;
        document.getElementById('player-offspec').value = player.offSpec || '';
        document.getElementById('player-role').value = player.role;
        document.getElementById('player-flex-role').value = player.flexRole || '';
        document.getElementById('player-notes').value = player.notes || '';

        // Preserve equipment and character data
        document.getElementById('equipment-enchant-percent').value = player.enchantPercentage !== null ? player.enchantPercentage : '';
        document.getElementById('equipment-gem-percent').value = player.gemPercentage !== null ? player.gemPercentage : '';
        document.getElementById('character-avatar-url').value = player.avatarUrl || '';
        document.getElementById('character-realm-slug').value = player.realmSlug || '';

        // Handle availability checkboxes
        const checkboxes = document.querySelectorAll('input[name="availability"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = player.availability && player.availability.includes(checkbox.value);
        });
    }, 100);

    // Delete old entry from Firestore via Cloud Function
    try {
        const discordUser = DiscordAuth.getUserInfo();
        const response = await fetch(`${FUNCTIONS_BASE_URL}/deleteRosterEntry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entryId: player.id,
                discordUser: {
                    userId: discordUser?.userId || 'admin',
                    username: discordUser?.username || 'admin'
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur serveur');
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showToast('Erreur lors de la modification. Veuillez réessayer.', 'error');
        return;
    }

    openForm();
}

// Refresh player Armory data (admin mode)
async function refreshPlayerArmory(playerId, playerName, realmSlug) {
    if (!isUserAdmin) {
        showToast('Vous devez être un admin autorisé.', 'error');
        return;
    }

    const realm = realmSlug || 'hyjal';
    showToast(`Mise à jour de l'Armory pour ${playerName}...`, 'info');

    try {
        // Fetch character details from Battle.net
        const response = await fetch('https://getcharacterdetails-bmdbdjnmkq-ew.a.run.app', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                characterName: playerName,
                realmSlug: realm,
                region: 'eu'
            })
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des données Armory');
        }

        const data = await response.json();

        if (!data.character || !data.equipment) {
            throw new Error('Données Armory incomplètes');
        }

        // Update player in Firestore via Cloud Function
        const discordUser = DiscordAuth.getUserInfo();
        const updateResponse = await fetch(`${FUNCTIONS_BASE_URL}/updateRosterEntry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entryId: playerId,
                updates: {
                    ilvl: data.character.equippedItemLevel || null,
                    enchantPercentage: data.equipment.enchantPercentage,
                    gemPercentage: data.equipment.gemPercentage,
                    avatarUrl: data.character.avatarUrl || null
                },
                discordUser: {
                    userId: discordUser?.userId || 'admin',
                    username: discordUser?.username || 'admin'
                }
            })
        });

        if (!updateResponse.ok) {
            throw new Error('Erreur lors de la mise à jour');
        }

        showToast(`✅ Données mises à jour pour ${playerName}`, 'success');

        // Reload roster to show updated data
        setTimeout(() => {
            fetchRoster();
        }, 500);

    } catch (error) {
        console.error('Erreur refresh Armory:', error);
        showToast(`Erreur: ${error.message}`, 'error');
    }
}

// Refresh all players Armory data (admin mode)
let isRefreshingAll = false;

async function refreshAllPlayers() {
    if (!isUserAdmin) {
        showToast('Vous devez être un admin autorisé.', 'error');
        return;
    }

    if (isRefreshingAll) {
        showToast('Une actualisation est déjà en cours...', 'warning');
        return;
    }

    // Collect all players from roster
    const allPlayers = [];
    ['tanks', 'healers', 'melee', 'ranged'].forEach(section => {
        if (roster[section]) {
            roster[section].forEach(player => {
                if (player && player.id && player.name && player.realmSlug) {
                    allPlayers.push(player);
                }
            });
        }
    });

    if (allPlayers.length === 0) {
        showToast('Aucun joueur à actualiser.', 'warning');
        return;
    }

    // Confirm action
    if (!confirm(`Actualiser ${allPlayers.length} joueur(s) ? Cela peut prendre quelques minutes.`)) {
        return;
    }

    isRefreshingAll = true;

    // Show progress UI
    const progressDiv = document.getElementById('refresh-progress');
    const progressBar = document.getElementById('refresh-progress-bar');
    const statusText = document.getElementById('refresh-status');
    const countText = document.getElementById('refresh-count');
    const refreshBtn = document.getElementById('refresh-all-btn');

    progressDiv.style.display = 'block';
    refreshBtn.disabled = true;
    refreshBtn.style.opacity = '0.5';

    let completed = 0;
    let errors = 0;

    for (let i = 0; i < allPlayers.length; i++) {
        const player = allPlayers[i];

        // Update progress
        statusText.textContent = `Actualisation de ${player.name}...`;
        countText.textContent = `${i}/${allPlayers.length}`;
        const percentage = (i / allPlayers.length) * 100;
        progressBar.style.width = `${percentage}%`;

        try {
            const response = await fetch('https://getcharacterdetails-bmdbdjnmkq-ew.a.run.app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterName: player.name,
                    realmSlug: player.realmSlug,
                    region: 'eu'
                })
            });

            if (response.ok) {
                const data = await response.json();

                if (data.character && data.equipment) {
                    const discordUser = DiscordAuth.getUserInfo();
                    const updateResponse = await fetch(`${FUNCTIONS_BASE_URL}/updateRosterEntry`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            entryId: player.id,
                            updates: {
                                ilvl: data.character.equippedItemLevel || null,
                                enchantPercentage: data.equipment.enchantPercentage,
                                gemPercentage: data.equipment.gemPercentage,
                                avatarUrl: data.character.avatarUrl || null
                            },
                            discordUser: {
                                userId: discordUser?.userId || 'admin',
                                username: discordUser?.username || 'admin'
                            }
                        })
                    });

                    if (updateResponse.ok) {
                        completed++;
                    } else {
                        errors++;
                    }
                }
            } else {
                errors++;
                console.error(`Erreur pour ${player.name}:`, response.status);
            }
        } catch (error) {
            errors++;
            console.error(`Erreur pour ${player.name}:`, error);
        }

        // Delay between requests to avoid rate limiting
        if (i < allPlayers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
        }
    }

    // Finished
    statusText.textContent = 'Actualisation terminée !';
    countText.textContent = `${allPlayers.length}/${allPlayers.length}`;
    progressBar.style.width = '100%';

    // Show result
    if (errors === 0) {
        showToast(`✅ ${completed} joueur(s) actualisé(s) avec succès !`, 'success');
    } else {
        showToast(`⚠️ ${completed} réussis, ${errors} erreur(s)`, 'warning');
    }

    // Hide progress and reload roster after 2s
    setTimeout(() => {
        progressDiv.style.display = 'none';
        progressBar.style.width = '0%';
        refreshBtn.disabled = false;
        refreshBtn.style.opacity = '1';
        isRefreshingAll = false;
        fetchRoster();
    }, 2000);
}

// Export to CSV
function exportToCSV() {
    let csv = 'Pseudo,Classe,Spécialisation,Rôle,Rôle Flex,Notes,Disponibilité\n';

    const allSections = [
        { key: 'tanks', label: 'Tank' },
        { key: 'healers', label: 'Healer' },
        { key: 'melee', label: 'DPS Mêlée' },
        { key: 'ranged', label: 'DPS Distance' }
    ];

    allSections.forEach(section => {
        roster[section.key].forEach(player => {
            if (player) {
                const flexRole = player.flexRole ? player.flexRole : '';
                const notes = player.notes ? `"${player.notes}"` : '';
                const availability = player.availability ? `"${player.availability}"` : '';
                csv += `${player.name},${getClassName(player.class)},${player.spec},${section.label},${flexRole},${notes},${availability}\n`;
            }
        });
    });

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'guild-roster.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Export to Discord format
function exportToDiscord() {
    let output = '**🛡️ ROSTER RAID 10 - THE WAR WITHIN**\n\n';

    const allSections = [
        { key: 'tanks', label: '🛡️ **TANKS**', emoji: '🛡️' },
        { key: 'healers', label: '✚ **HEALERS**', emoji: '✚' },
        { key: 'melee', label: '⚔️ **MELEE DPS**', emoji: '⚔️' },
        { key: 'ranged', label: '🎯 **RANGED DPS**', emoji: '🎯' }
    ];

    allSections.forEach(section => {
        output += `${section.label}\n`;
        let count = 1;
        roster[section.key].forEach(player => {
            if (player) {
                output += `  ${count}. **${player.name}** - ${getClassName(player.class)} ${player.spec}`;
                if (player.flexRole) {
                    const roleNames = { tank: 'Tank', healer: 'Healer', melee: 'Mêlée', ranged: 'Distance' };
                    output += ` (Flex: ${roleNames[player.flexRole]})`;
                }
                if (player.notes) {
                    output += ` • ${player.notes}`;
                }
                output += '\n';
                count++;
            }
        });
        if (count === 1) {
            output += '  *Aucun inscrit*\n';
        }
        output += '\n';
    });

    // Stats
    const tanks = roster.tanks.filter(p => p).length;
    const healers = roster.healers.filter(p => p).length;
    const melee = roster.melee.filter(p => p).length;
    const ranged = roster.ranged.filter(p => p).length;
    const total = tanks + healers + melee + ranged;

    output += `**📊 STATISTIQUES**\n`;
    output += `Total inscrits: ${total}/10\n`;
    output += `Tanks: ${tanks}/2 | Healers: ${healers}/2 | DPS: ${melee + ranged}/6\n`;

    // Copy to clipboard
    navigator.clipboard.writeText(output).then(() => {
        showToast('Roster copié dans le presse-papier ! Vous pouvez le coller sur Discord.', 'success');
    }).catch(err => {
        // Fallback: show in alert
        prompt('Copiez ce texte pour Discord:', output);
    });
}

// ===== BATTLE.NET INTEGRATION =====

const FUNCTIONS_BASE_URL = 'https://europe-west1-guild-roster-67da7.cloudfunctions.net';
const BNET_CLIENT_ID = '1686cadfa50a49d3b9b8aa56ba21bc8a';
const REDIRECT_URI = window.location.origin + window.location.pathname;

// Start Battle.net OAuth flow
function startBattleNetAuth() {
    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('bnet_oauth_state', state);

    console.log('🔵 Authorization request - REDIRECT_URI:', REDIRECT_URI);
    const authUrl = `https://oauth.battle.net/authorize?client_id=${BNET_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=openid+wow.profile&state=${state}`;
    console.log('🔵 Authorization URL:', authUrl);
    window.location.href = authUrl;
}

// Handle OAuth callback
async function handleBattleNetCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (!code) return;

    // Verify state parameter for CSRF protection
    const savedState = sessionStorage.getItem('bnet_oauth_state');
    if (!state || state !== savedState) {
        showToast('Erreur de sécurité : état OAuth invalide. Veuillez réessayer.', 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    // Clear the state from session storage
    sessionStorage.removeItem('bnet_oauth_state');

    try {
        // Exchange code for access token
        console.log('🟢 Token exchange - REDIRECT_URI:', REDIRECT_URI);
        console.log('🟢 Sending to Firebase Function:', { code: code.substring(0, 10) + '...', redirectUri: REDIRECT_URI });

        const authResponse = await fetch(`${FUNCTIONS_BASE_URL}/blizzardAuth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: code,
                redirectUri: REDIRECT_URI
            })
        });

        if (!authResponse.ok) {
            const errorData = await authResponse.json().catch(() => ({}));
            const errorMsg = errorData.details || errorData.error || authResponse.statusText;
            console.error('Firebase Function error:', errorData);
            throw new Error(`Authentication failed: ${errorMsg}`);
        }

        const authData = await authResponse.json();
        console.log('Authenticated:', authData.battletag);

        // Load characters
        await loadCharacters(authData.accessToken);

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
        console.error('Battle.net auth error:', error);
        showToast('Erreur lors de la connexion à Battle.net. Veuillez réessayer.', 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Load character list
async function loadCharacters(accessToken) {
    const modal = document.getElementById('char-select-modal');
    const loading = document.getElementById('char-loading');
    const charList = document.getElementById('char-list');

    // Show modal with loading state
    modal.classList.add('active');
    loading.style.display = 'block';
    charList.style.display = 'none';

    try {
        const response = await fetch(`${FUNCTIONS_BASE_URL}/getWowCharacters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken })
        });

        if (!response.ok) {
            throw new Error('Failed to load characters');
        }

        const data = await response.json();

        if (!data.characters || data.characters.length === 0) {
            modal.classList.remove('active');
            showToast('Aucun personnage WoW trouvé sur votre compte.', 'info');
            return;
        }

        // Hide loading, show character list
        loading.style.display = 'none';
        charList.style.display = 'block';

        // Show character selection modal
        displayCharacters(data.characters, accessToken);
    } catch (error) {
        console.error('Load characters error:', error);
        modal.classList.remove('active');
        showToast('Erreur lors du chargement des personnages.', 'error');
    }
}

// Display characters in modal
function displayCharacters(characters, accessToken) {
    const charList = document.getElementById('char-list');

    charList.innerHTML = '';

    // Sort characters by level (highest first)
    const sortedChars = characters.sort((a, b) => b.level - a.level);

    sortedChars.forEach(char => {
        const charItem = document.createElement('div');
        charItem.className = 'char-item';
        charItem.innerHTML = `
            <div class="char-item-name">${char.name} <span style="color: var(--gold);">• Niveau ${char.level}</span></div>
            <div class="char-item-details">
                ${char.playableClass} - ${char.realm} (${char.faction})
            </div>
        `;
        charItem.onclick = () => selectCharacter(char, accessToken, charItem);
        charList.appendChild(charItem);
    });

    openForm();
}

// Select a character and load details
async function selectCharacter(char, accessToken, charItem) {
    const modal = document.getElementById('char-select-modal');
    const loading = document.getElementById('char-loading');
    const charList = document.getElementById('char-list');

    // Show loading state
    charList.style.display = 'none';
    loading.querySelector('p').textContent = `Chargement de ${char.name}...`;
    loading.style.display = 'block';

    try {
        // Get character details
        const response = await fetch(`${FUNCTIONS_BASE_URL}/getCharacterDetails`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accessToken,
                realmSlug: char.realmSlug,
                characterName: char.name
            })
        });

        if (!response.ok) {
            throw new Error('Failed to load character details');
        }

        const data = await response.json();
        modal.classList.remove('active');
        fillFormWithCharacter(data.character, data.equipment);
    } catch (error) {
        console.error('Load character details error:', error);
        // Reset UI
        loading.style.display = 'none';
        charList.style.display = 'block';
        showToast('Erreur lors du chargement des détails du personnage.', 'error');
    }
}

// Map WoW class IDs to our class IDs
function mapWowClassToId(classId) {
    const classMap = {
        1: 'warrior',    // Guerrier
        2: 'paladin',    // Paladin
        3: 'hunter',     // Chasseur
        4: 'rogue',      // Voleur
        5: 'priest',     // Prêtre
        6: 'dk',         // Chevalier de la mort
        7: 'shaman',     // Chaman
        8: 'mage',       // Mage
        9: 'warlock',    // Démoniste
        10: 'monk',      // Moine
        11: 'druid',     // Druide
        12: 'dh',        // Chasseur de démons
        13: 'evoker'     // Évocateur
    };
    return classMap[classId] || '';
}

// Fill form with character data
function fillFormWithCharacter(character, equipment) {
    // Fill name
    document.getElementById('player-name').value = character.name;

    // Fill class
    const classId = mapWowClassToId(character.classId);
    document.getElementById('player-class').value = classId;

    // Update specs
    updateSpecs();

    // Wait for specs to be populated, then select the active spec
    setTimeout(() => {
        const specSelect = document.getElementById('player-spec');
        const activeSpecLower = character.activeSpec.toLowerCase();

        // Try to find matching spec
        for (let option of specSelect.options) {
            if (option.value.toLowerCase() === activeSpecLower) {
                specSelect.value = option.value;

                // Trigger role auto-selection
                const event = new Event('change');
                specSelect.dispatchEvent(event);
                break;
            }
        }

        // Fill notes with ilvl and equipment status
        let notes = `ilvl ${character.equippedItemLevel}`;

        if (equipment.enchantPercentage < 100) {
            notes += ` • ${equipment.missingEnchants} enchant(s) manquant(s)`;
        }

        if (equipment.gemPercentage < 100) {
            notes += ` • ${equipment.missingGems} gemme(s) manquante(s)`;
        }

        if (equipment.enchantPercentage === 100 && equipment.gemPercentage === 100) {
            notes += ' • Full enchant/gems ✓';
        }

        document.getElementById('player-notes').value = notes;

        // Store equipment percentages and character data in hidden fields
        document.getElementById('equipment-enchant-percent').value = equipment.enchantPercentage;
        document.getElementById('equipment-gem-percent').value = equipment.gemPercentage;
        document.getElementById('character-avatar-url').value = character.avatarUrl || '';
        document.getElementById('character-realm-slug').value = character.realmSlug || '';

        // Show the form so user can review and submit
        document.getElementById('registration-form').style.display = 'block';

        showToast(`Personnage "${character.name}" importé avec succès !`, 'success');
    }, 100);
}

// Initialize Discord Authentication
// Set ENABLED to false to disable Discord auth (easy rollback)
DiscordAuth.init({
    title: 'Accès Réservé aux Membres',
    message: 'Le roster est réservé aux membres de la guilde "Les Sages de Pandarie". Connectez-vous avec Discord pour y accéder.',
    onSuccess: () => {
        console.log('Discord auth successful');
    }
});

// Check for OAuth callback on page load
if (window.location.search.includes('code=')) {
    handleBattleNetCallback();
}

// Initialize on load
init();
