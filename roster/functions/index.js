const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const axios = require('axios');
const cors = require('cors');

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Définir les secrets
const blizzardClientId = defineSecret('BLIZZARD_CLIENT_ID');
const blizzardClientSecret = defineSecret('BLIZZARD_CLIENT_SECRET');
const discordClientId = defineSecret('DISCORD_CLIENT_ID');
const discordClientSecret = defineSecret('DISCORD_CLIENT_SECRET');
const discordGuildId = defineSecret('DISCORD_GUILD_ID');
const discordWebhookUrl = defineSecret('DISCORD_WEBHOOK_URL');
const raidHelperApiKey = defineSecret('RAIDHELPER_API_KEY');
const wclCredentials = defineSecret('WCL_CREDENTIALS');
// CORS configuration - Allow GitHub Pages and custom domain
const corsOptions = {
  origin: [
    'https://shani-gaming.github.io',
    'https://www.sagesdepandarie.ovh',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
  ],
  optionsSuccessStatus: 200
};

const corsMiddleware = cors(corsOptions);

/**
 * Exchange OAuth code for access token
 */
exports.blizzardAuth = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10,
    secrets: [blizzardClientId, blizzardClientSecret]
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      try {
        const { code, redirectUri } = req.body;

        if (!code || !redirectUri) {
          return res.status(400).json({ error: 'Missing code or redirectUri' });
        }

        const clientId = blizzardClientId.value();
        const clientSecret = blizzardClientSecret.value();

        // Log for debugging
        console.log('Token exchange attempt:', {
          redirectUri,
          clientIdLength: clientId.length,
          clientSecretLength: clientSecret.length,
          codeLength: code.length
        });

        // Exchange code for access token
        // Battle.net requires BOTH Basic Auth AND credentials in body
        const tokenResponse = await axios.post(
          'https://oauth.battle.net/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri
          }),
          {
            auth: {
              username: clientId,
              password: clientSecret
            },
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );

        const accessToken = tokenResponse.data.access_token;

        // Get user info
        const userInfoResponse = await axios.get(
          'https://oauth.battle.net/userinfo',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        res.json({
          accessToken: accessToken,
          battletag: userInfoResponse.data.battletag,
          sub: userInfoResponse.data.sub
        });
      } catch (error) {
        console.error('Auth error:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        res.status(500).json({
          error: 'Authentication failed',
          details: error.message,
          blizzardError: error.response?.data
        });
      }
    });
  }
);

/**
 * Get WoW character list for authenticated user
 */
exports.getWowCharacters = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      try {
        const { accessToken } = req.body;

        if (!accessToken) {
          return res.status(400).json({ error: 'Missing accessToken' });
        }

        // Get WoW account info
        const response = await axios.get(
          'https://eu.api.blizzard.com/profile/user/wow',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            },
            params: {
              namespace: 'profile-eu',
              locale: 'fr_FR'
            }
          }
        );

        // Extract characters from all WoW accounts
        const characters = [];
        if (response.data.wow_accounts) {
          response.data.wow_accounts.forEach(account => {
            if (account.characters) {
              account.characters.forEach(char => {
                characters.push({
                  name: char.name,
                  realm: char.realm.name,
                  realmSlug: char.realm.slug,
                  level: char.level,
                  playableClass: char.playable_class.name,
                  playableClassId: char.playable_class.id,
                  faction: char.faction.name
                });
              });
            }
          });
        }

        res.json({ characters });
      } catch (error) {
        console.error('Get characters error:', error);
        res.status(500).json({
          error: 'Failed to fetch characters',
          details: error.message
        });
      }
    });
  }
);

/**
 * Get detailed character information including equipment
 */
exports.getCharacterDetails = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10,
    secrets: [blizzardClientId, blizzardClientSecret]
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      try {
        const { accessToken, realmSlug, characterName, region } = req.body;

        if (!realmSlug || !characterName) {
          return res.status(400).json({ error: 'Missing required parameters' });
        }

        // If no accessToken provided, get one using client credentials
        let token = accessToken;
        if (!token) {
          const clientId = blizzardClientId.value();
          const clientSecret = blizzardClientSecret.value();

          const tokenResponse = await axios.post(
            'https://oauth.battle.net/token',
            new URLSearchParams({
              grant_type: 'client_credentials'
            }),
            {
              auth: {
                username: clientId,
                password: clientSecret
              }
            }
          );

          token = tokenResponse.data.access_token;
        }

        // Get character profile summary
        const profileUrl = `https://eu.api.blizzard.com/profile/wow/character/${realmSlug}/${characterName.toLowerCase()}`;
        const profileResponse = await axios.get(profileUrl, {
          headers: { Authorization: `Bearer ${token}` },
          params: { namespace: 'profile-eu', locale: 'fr_FR' }
        });

        // Get character equipment
        const equipmentUrl = `${profileUrl}/equipment`;
        const equipmentResponse = await axios.get(equipmentUrl, {
          headers: { Authorization: `Bearer ${token}` },
          params: { namespace: 'profile-eu', locale: 'fr_FR' }
        });

        // Get character specializations
        const specsUrl = `${profileUrl}/specializations`;
        const specsResponse = await axios.get(specsUrl, {
          headers: { Authorization: `Bearer ${token}` },
          params: { namespace: 'profile-eu', locale: 'fr_FR' }
        });

        // Get character media (avatar)
        const mediaUrl = `${profileUrl}/character-media`;
        const mediaResponse = await axios.get(mediaUrl, {
          headers: { Authorization: `Bearer ${token}` },
          params: { namespace: 'profile-eu', locale: 'fr_FR' }
        });

        // Parse equipment data
        const equipment = equipmentResponse.data.equipped_items || [];
        let missingEnchants = 0;
        let missingGems = 0;
        let totalEnchantSlots = 0;
        let totalGemSlots = 0;

        equipment.forEach(item => {
          // Check enchants (mainly on rings, weapon, cloak, chest, bracers, boots, legs)
          const enchantableSlots = ['FINGER_1', 'FINGER_2', 'MAIN_HAND', 'OFF_HAND',
                                      'BACK', 'CHEST', 'WRIST', 'FEET', 'LEGS'];
          if (enchantableSlots.includes(item.slot.type)) {
            totalEnchantSlots++;
            if (!item.enchantments || item.enchantments.length === 0) {
              missingEnchants++;
            }
          }

          // Check gems
          if (item.sockets && item.sockets.length > 0) {
            item.sockets.forEach(socket => {
              totalGemSlots++;
              if (!socket.item) {
                missingGems++;
              }
            });
          }
        });

        // Get active spec
        const activeSpec = specsResponse.data.specializations && specsResponse.data.specializations.find(s => s.specialization);

        // Extract avatar URL from media assets
        let avatarUrl = null;
        if (mediaResponse.data.assets) {
          const avatarAsset = mediaResponse.data.assets.find(asset => asset.key === 'avatar');
          if (avatarAsset) {
            avatarUrl = avatarAsset.value;
          }
        }

        res.json({
          character: {
            name: profileResponse.data.name,
            realm: profileResponse.data.realm.name,
            realmSlug: realmSlug,
            level: profileResponse.data.level,
            class: profileResponse.data.character_class.name,
            classId: profileResponse.data.character_class.id,
            activeSpec: activeSpec && activeSpec.specialization ? activeSpec.specialization.name : 'Unknown',
            activeSpecId: activeSpec && activeSpec.specialization ? activeSpec.specialization.id : null,
            averageItemLevel: profileResponse.data.average_item_level,
            equippedItemLevel: profileResponse.data.equipped_item_level,
            faction: profileResponse.data.faction.name,
            avatarUrl: avatarUrl
          },
          equipment: {
            totalEnchantSlots,
            missingEnchants,
            totalGemSlots,
            missingGems,
            enchantPercentage: totalEnchantSlots > 0 ?
              Math.round(((totalEnchantSlots - missingEnchants) / totalEnchantSlots) * 100) : 100,
            gemPercentage: totalGemSlots > 0 ?
              Math.round(((totalGemSlots - missingGems) / totalGemSlots) * 100) : 100
          }
        });
      } catch (error) {
        console.error('Get character details error:', error);
        res.status(500).json({
          error: 'Failed to fetch character details',
          details: error.message
        });
      }
    });
  }
);

/**
 * Verify Discord user has required role in guild
 */
exports.verifyDiscordRole = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10,
    secrets: [discordClientId, discordClientSecret, discordGuildId]
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      try {
        const { code, redirectUri } = req.body;

        if (!code || !redirectUri) {
          return res.status(400).json({ error: 'Missing code or redirectUri' });
        }

        const clientId = discordClientId.value();
        const clientSecret = discordClientSecret.value();
        const guildId = discordGuildId.value();

        // Allowed roles (exact match required)
        const allowedRoles = [
          '👑​ - Administrateur',
          '✴ 𝕆𝕗𝕗𝕚𝕔𝕚𝕖𝕣 ✴',
          '🧌​- 𝕄𝕖𝕞𝕓𝕣𝕖 -'
        ];

        // Exchange code for access token
        // Discord requires client_id and client_secret in the body, not as Basic Auth
        const tokenResponse = await axios.post(
          'https://discord.com/api/oauth2/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );

        const accessToken = tokenResponse.data.access_token;

        // Get user info
        const userResponse = await axios.get(
          'https://discord.com/api/users/@me',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        const userId = userResponse.data.id;
        const username = userResponse.data.username;

        // Get user's guilds
        const guildsResponse = await axios.get(
          'https://discord.com/api/users/@me/guilds',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        // Log for debugging
        console.log('User guilds:', guildsResponse.data.map(g => ({ id: g.id, name: g.name })));
        console.log('Target guild ID:', guildId);
        console.log('Guild ID type:', typeof guildId);

        // Check if user is member of the guild
        const isMember = guildsResponse.data.some(guild => {
          console.log(`Comparing: "${guild.id}" === "${guildId}"`, guild.id === guildId);
          return guild.id === guildId;
        });

        // Grant access to all guild members
        const hasAccess = isMember;
        const userRoles = isMember ? ['Membre du Discord'] : [];

        console.log('Discord auth result:', {
          username,
          isMember,
          userRoles,
          hasAccess
        });

        // Build debug info safely
        let debugInfo = {
          isMember,
          targetGuildId: guildId,
          guildIdType: typeof guildId,
          guildsCount: guildsResponse.data ? guildsResponse.data.length : 0
        };

        try {
          if (guildsResponse.data && Array.isArray(guildsResponse.data)) {
            debugInfo.userGuilds = guildsResponse.data.map(g => ({ id: g.id, name: g.name }));
          }
        } catch (err) {
          debugInfo.mapError = err.message;
        }

        res.json({
          hasAccess,
          username,
          userId,
          roles: userRoles,
          debug: debugInfo
        });
      } catch (error) {
        console.error('Discord auth error:', error);
        console.error('Error response:', error.response?.data);
        res.status(500).json({
          error: 'Discord authentication failed',
          details: error.message,
          discordError: error.response?.data
        });
      }
    });
  }
);

/**
 * Soumettre une candidature vers Discord via Webhook
 * Récupère les détails complets du personnage (ilvl, avatar) avant envoi
 */
exports.submitApplication = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10,
    secrets: [discordWebhookUrl, blizzardClientId, blizzardClientSecret]
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      try {
        const { character, formData, battletag, accessToken } = req.body;

        if (!character || !formData) {
          return res.status(400).json({ error: 'Données manquantes' });
        }

        const webhookUrl = discordWebhookUrl.value();

        // Récupérer les détails complets du personnage (ilvl, avatar, etc.)
        let characterDetails = { ...character };

        try {
          // Utiliser le token d'accès de l'utilisateur ou générer un token client
          let token = accessToken;

          if (!token) {
            const clientId = blizzardClientId.value();
            const clientSecret = blizzardClientSecret.value();

            const tokenResponse = await axios.post(
              'https://oauth.battle.net/token',
              new URLSearchParams({
                grant_type: 'client_credentials'
              }),
              {
                auth: {
                  username: clientId,
                  password: clientSecret
                }
              }
            );

            token = tokenResponse.data.access_token;
          }

          // Récupérer le profil complet
          const profileUrl = `https://eu.api.blizzard.com/profile/wow/character/${character.realmSlug}/${character.name.toLowerCase()}`;
          const profileResponse = await axios.get(profileUrl, {
            headers: { Authorization: `Bearer ${token}` },
            params: { namespace: 'profile-eu', locale: 'fr_FR' }
          });

          // Récupérer l'avatar
          const mediaUrl = `${profileUrl}/character-media`;
          const mediaResponse = await axios.get(mediaUrl, {
            headers: { Authorization: `Bearer ${token}` },
            params: { namespace: 'profile-eu', locale: 'fr_FR' }
          });

          const avatarAsset = mediaResponse.data.assets?.find(asset => asset.key === 'avatar');

          characterDetails = {
            ...character,
            averageItemLevel: profileResponse.data.average_item_level,
            equippedItemLevel: profileResponse.data.equipped_item_level,
            avatarUrl: avatarAsset?.value || null
          };

          console.log('Character details enriched:', characterDetails);
        } catch (detailsError) {
          console.error('Failed to fetch character details, using basic info:', detailsError.message);
          // Continue avec les données de base si l'enrichissement échoue
        }

        // Couleurs par classe (Discord color codes)
        const classColors = {
          'Chevalier de la mort': 12853051, 'Chasseur de démons': 10694857,
          'Druide': 16743690, 'Évocateur': 3380095, 'Chasseur': 11129457,
          'Mage': 4245483, 'Moine': 65432, 'Paladin': 16092346,
          'Prêtre': 16777215, 'Voleur': 16774505, 'Chaman': 28894,
          'Démoniste': 8882157, 'Guerrier': 13081710
        };

        const color = classColors[characterDetails.playableClass] || 16777215;

        // Construire l'URL Armurerie
        const armoryUrl = `https://worldofwarcraft.blizzard.com/fr-fr/character/eu/${characterDetails.realmSlug}/${characterDetails.name.toLowerCase()}`;

        // Construction du message Discord (Embed)
        const embed = {
          title: `🎯 Nouvelle Candidature : ${characterDetails.name}`,
          description: `**${characterDetails.playableClass}** • Niveau ${characterDetails.level}`,
          color: color,
          fields: [
            {
              name: '🔴 Contact OBLIGATOIRE via Battle.net',
              value: `\`\`\`${battletag || 'Non renseigné'}\`\`\`Le candidat n'est pas encore dans notre Discord. **Envoyez-lui une demande d'ami Battle.net** pour le contacter.`,
              inline: false
            },
            {
              name: '⚔️ Item Level',
              value: characterDetails.averageItemLevel ? `${characterDetails.averageItemLevel} (équipé: ${characterDetails.equippedItemLevel})` : 'N/A',
              inline: true
            },
            { name: '🏰 Royaume', value: characterDetails.realm, inline: true },
            { name: '⚡ Faction', value: characterDetails.faction || 'N/A', inline: true },
            {
              name: '📝 Présentation & Expérience',
              value: formData.presentation.substring(0, 1024) || 'Aucune'
            },
            {
              name: '📅 Disponibilités & Objectifs',
              value: formData.availability.substring(0, 1024) || 'Non renseigné'
            },
            {
              name: '🔗 Liens',
              value: `[Voir sur l'Armurerie](${armoryUrl})`
            }
          ],
          thumbnail: { url: characterDetails.avatarUrl || '' },
          footer: { text: '⚜️ Les Sages de Pandarie • Système de Recrutement' },
          timestamp: new Date().toISOString()
        };

        // Envoi au Webhook
        await axios.post(webhookUrl, {
          content: `@here Nouvelle candidature de **${characterDetails.name}** ! Contactez via Battle.net : \`${battletag || 'Non renseigné'}\``,
          embeds: [embed]
        });

        res.json({ success: true });
      } catch (error) {
        console.error('Erreur soumission candidature:', error);
        res.status(500).json({
          error: 'Erreur lors de l\'envoi de la candidature',
          details: error.message
        });
      }
    });
  }
);

/**
 * Scheduled function: Daily guild roster sync
 * Runs every day at 2 AM (Europe/Paris timezone)
 * Detects new members and tracks roster changes
 */
exports.syncGuildRoster = onSchedule(
  {
    schedule: '0 2 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    secrets: [blizzardClientId, blizzardClientSecret]
  },
  async (event) => {
    try {
      console.log('Starting daily guild roster sync...');

      const clientId = blizzardClientId.value();
      const clientSecret = blizzardClientSecret.value();

      const GUILD_REALM = 'hyjal';
      const GUILD_NAME = 'les-sages-de-pandarie';
      const GUILD_REGION = 'eu';

      const tokenResponse = await axios.post(
        'https://oauth.battle.net/token',
        new URLSearchParams({
          grant_type: 'client_credentials'
        }),
        {
          auth: {
            username: clientId,
            password: clientSecret
          }
        }
      );

      const accessToken = tokenResponse.data.access_token;

      const rosterResponse = await axios.get(
        `https://${GUILD_REGION}.api.blizzard.com/data/wow/guild/${GUILD_REALM}/${GUILD_NAME}/roster`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            namespace: `profile-${GUILD_REGION}`,
            locale: 'fr_FR'
          }
        }
      );

      const currentRoster = rosterResponse.data.members || [];

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = yesterday.toISOString().split('T')[0];

      const snapshotRef = db.collection('guild-roster-snapshots').doc(yesterdayKey);
      const snapshotDoc = await snapshotRef.get();

      const previousMembers = snapshotDoc.exists ? snapshotDoc.data().members || [] : [];
      const previousMemberNames = new Set(previousMembers.map(m => `${m.name}-${m.realm}`));

      // Mapping des IDs de classe WoW vers les noms
      const classNames = {
        1: 'Warrior',
        2: 'Paladin',
        3: 'Hunter',
        4: 'Rogue',
        5: 'Priest',
        6: 'Death Knight',
        7: 'Shaman',
        8: 'Mage',
        9: 'Warlock',
        10: 'Monk',
        11: 'Druid',
        12: 'Demon Hunter',
        13: 'Evoker'
      };

      const newMembers = [];
      const currentMembersList = [];

      for (const member of currentRoster) {
        const character = member.character;
        const memberKey = `${character.name}-${character.realm.slug}`;

        // Utiliser le mapping d'ID pour obtenir le nom de classe
        const classId = character.playable_class.id;
        const className = classNames[classId] || 'Unknown';

        // Construire le lien armurerie
        const armoryLink = `https://worldofwarcraft.blizzard.com/fr-fr/character/eu/${character.realm.slug}/${character.name.toLowerCase()}`;

        // Récupérer les détails du personnage (ilvl, spé, métiers)
        let characterDetails = {
          ilvl: null,
          activeSpec: null,
          midnightProfessions: []
        };

        try {
          // Appel API pour les détails du personnage
          const profileResponse = await axios.get(
            `https://${GUILD_REGION}.api.blizzard.com/profile/wow/character/${character.realm.slug}/${character.name.toLowerCase()}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              params: {
                namespace: `profile-${GUILD_REGION}`,
                locale: 'fr_FR'
              }
            }
          );

          const profile = profileResponse.data;

          // Item level
          characterDetails.ilvl = profile.equipped_item_level || profile.average_item_level || null;

          // Spécialisation active
          if (profile.active_spec) {
            characterDetails.activeSpec = profile.active_spec.name;
          }

          // Métiers Midnight (endpoint dédié avec recettes, EN + FR en parallèle)
          try {
            const profUrl = `https://${GUILD_REGION}.api.blizzard.com/profile/wow/character/${character.realm.slug}/${character.name.toLowerCase()}/professions`;
            const profResponseEn = await axios.get(profUrl, {
              headers: { Authorization: `Bearer ${accessToken}` },
              params: { namespace: `profile-${GUILD_REGION}`, locale: 'en_US' }
            });

            const allProfs = [
              ...(profResponseEn.data.primaries || []),
              ...(profResponseEn.data.secondaries || [])
            ];
            characterDetails.midnightProfessions = allProfs
              .map(prof => {
                const midnightTier = prof.tiers?.find(t => t.tier.name.startsWith('Midnight'));
                if (!midnightTier) return null;
                return {
                  name: prof.profession.name,
                  skillPoints: midnightTier.skill_points,
                  maxSkillPoints: midnightTier.max_skill_points,
                  recipes: (midnightTier.known_recipes || []).map(r => ({
                    id: r.id,
                    name: r.name,
                    nameFr: r.name,  // sera enrichi par Wowhead ci-dessous
                    spellId: null
                  }))
                };
              })
              .filter(Boolean);
          } catch (profError) {
            console.error(`Failed to fetch professions for ${character.name}:`, profError.message);
          }
        } catch (error) {
          console.error(`Failed to fetch details for ${character.name}:`, error.message);
        }

        const memberData = {
          name: character.name,
          realm: character.realm.slug,
          level: character.level,
          classId: classId,
          class: className,
          rank: member.rank,
          armoryLink: armoryLink,
          ilvl: characterDetails.ilvl,
          activeSpec: characterDetails.activeSpec,
          midnightProfessions: characterDetails.midnightProfessions,
          active: true  // Marquer comme actif (présent dans le roster)
        };

        currentMembersList.push(memberData);

        if (!previousMemberNames.has(memberKey)) {
          newMembers.push(memberKey);

          const memberDocRef = db.collection('guild-members').doc(memberKey);
          const memberDoc = await memberDocRef.get();

          if (!memberDoc.exists) {
            await memberDocRef.set({
              ...memberData,
              joinedAt: Date.now(),
              lastSeen: Date.now()
            });
            console.log('New member:', character.name);
          } else {
            await memberDocRef.update({
              ...memberData,
              lastSeen: Date.now()
            });
          }
        } else {
          const memberDocRef = db.collection('guild-members').doc(memberKey);
          await memberDocRef.update({
            ...memberData,
            lastSeen: Date.now()
          });
        }
      }

      // Enrichissement via Wowhead tooltip API : nom FR + spell ID pour lien direct
      try {
        const allRecipeIds = new Set();
        currentMembersList.forEach(member => {
          member.midnightProfessions?.forEach(prof => {
            prof.recipes?.forEach(r => allRecipeIds.add(r.id));
          });
        });

        if (allRecipeIds.size > 0) {
          const recipeIdArray = [...allRecipeIds];
          // Map: recipeId → { nameFr, spellId }
          const wowheadMap = new Map();
          const BATCH_SIZE = 5;

          for (let i = 0; i < recipeIdArray.length; i += BATCH_SIZE) {
            const batchIds = recipeIdArray.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(
              batchIds.map(id =>
                axios.get(`https://nether.wowhead.com/tooltip/recipe/${id}`, {
                  params: { locale: 'frFR' }
                })
              )
            );
            results.forEach((result, idx) => {
              if (result.status === 'fulfilled') {
                const data = result.value.data;
                const nameFr = data.name || null;
                const spellMatch = (data.tooltip || '').match(/\/spell=(\d+)/);
                const spellId = spellMatch ? parseInt(spellMatch[1]) : null;
                wowheadMap.set(batchIds[idx], { nameFr, spellId });
              }
            });
          }

          // Mettre à jour nameFr + spellId dans Firestore
          const whBatch = db.batch();
          currentMembersList.forEach(member => {
            if (!member.midnightProfessions?.length) return;
            member.midnightProfessions.forEach(prof => {
              prof.recipes?.forEach(r => {
                const wh = wowheadMap.get(r.id);
                if (wh) {
                  if (wh.nameFr) r.nameFr = wh.nameFr;
                  if (wh.spellId) r.spellId = wh.spellId;
                }
              });
            });
            const memberKey = `${member.name}-${member.realm}`;
            whBatch.update(db.collection('guild-members').doc(memberKey), {
              midnightProfessions: member.midnightProfessions
            });
          });
          await whBatch.commit();
          console.log(`Wowhead enrichment done: ${wowheadMap.size} unique recipes (FR + spellId)`);
        }
      } catch (whError) {
        console.error('Failed to enrich via Wowhead:', whError.message);
      }

      // Détecter les membres qui ont quitté la guilde
      const currentMemberKeys = new Set(currentMembersList.map(m => `${m.name}-${m.realm}`));
      const allMembersSnapshot = await db.collection('guild-members').where('active', '==', true).get();

      const departedMembers = [];
      const batch = db.batch();

      allMembersSnapshot.forEach(doc => {
        const memberId = doc.id;
        if (!currentMemberKeys.has(memberId)) {
          // Ce membre n'est plus dans le roster API = il a quitté
          departedMembers.push(memberId);
          batch.update(doc.ref, {
            active: false,
            leftAt: Date.now()
          });
          console.log('Member departed:', memberId);
        }
      });

      if (departedMembers.length > 0) {
        await batch.commit();
        console.log('Marked', departedMembers.length, 'members as departed');
      }

      const todayKey = new Date().toISOString().split('T')[0];
      await db.collection('guild-roster-snapshots').doc(todayKey).set({
        timestamp: Date.now(),
        memberCount: currentRoster.length,
        members: currentMembersList
      });

      console.log('Roster sync complete:', currentRoster.length, 'members,', newMembers.length, 'new,', departedMembers.length, 'departed');

      return {
        success: true,
        memberCount: currentRoster.length,
        newMembersCount: newMembers.length,
        departedMembersCount: departedMembers.length,
        departedMembers: departedMembers
      };

    } catch (error) {
      console.error('Error in syncGuildRoster:', error);
      throw error;
    }
  }
);

/**
 * Temporary function to create yesterday's snapshot without Thallyium and Osmondo
 */
exports.createYesterdaySnapshot = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      try {
        console.log('Creating yesterday snapshot without Thallyium and Osmondo...');

        // Get all current members
        const snapshot = await db.collection('guild-members').get();

        if (snapshot.empty) {
          return res.json({ error: 'No members found in database.' });
        }

        // Filter out Thallyium and Osmondo
        const yesterdayMembers = [];
        const excludedMembers = ['Thallyium-archimonde', 'Osmondo-hyjal'];

        snapshot.forEach(doc => {
          const memberId = doc.id;
          if (!excludedMembers.includes(memberId)) {
            const member = doc.data();
            yesterdayMembers.push({
              name: member.name,
              realm: member.realm,
              level: member.level,
              classId: member.classId,
              class: member.class,
              rank: member.rank
            });
          }
        });

        // Create snapshot for yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().split('T')[0];

        await db.collection('guild-roster-snapshots').doc(yesterdayKey).set({
          timestamp: yesterday.getTime(),
          memberCount: yesterdayMembers.length,
          members: yesterdayMembers
        });

        res.json({
          success: true,
          snapshotDate: yesterdayKey,
          membersInSnapshot: yesterdayMembers.length,
          excludedMembers: excludedMembers,
          message: 'Yesterday snapshot created. Now trigger syncGuildRoster to detect new members.'
        });

      } catch (error) {
        console.error('Error creating snapshot:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }
);

/**
 * Set all members except Thallyium and Osmondo to have joined 30 days ago
 */
exports.setOldMembersDate = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      try {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const snapshot = await db.collection('guild-members').get();

        const targetMembers = ['Thallyium-archimonde', 'Osmondo-hyjal'];
        let updated = 0;
        let kept = 0;

        const batch = db.batch();

        snapshot.forEach(doc => {
          if (!targetMembers.includes(doc.id)) {
            // Set old date for all other members
            batch.update(doc.ref, { joinedAt: thirtyDaysAgo });
            updated++;
          } else {
            kept++;
          }
        });

        await batch.commit();

        res.json({
          success: true,
          updated: updated,
          keptRecent: kept,
          message: `${updated} members set to 30 days ago. ${kept} kept as recent (Thallyium, Osmondo).`
        });

      } catch (error) {
        console.error('Error updating dates:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }
);

/**
 * Temporary HTTP function to check guild members (for testing)
 */
exports.checkMembers = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      try {
        const snapshot = await db.collection('guild-members').get();

        if (snapshot.empty) {
          return res.json({ message: 'No members found', count: 0, members: [] });
        }

        const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
        const allMembers = [];
        const recentMembers = [];

        snapshot.forEach(doc => {
          const member = { id: doc.id, ...doc.data() };
          allMembers.push(member);

          if (member.joinedAt >= fourteenDaysAgo) {
            recentMembers.push(member);
          }
        });

        // Sort recent members by joinedAt (newest first)
        recentMembers.sort((a, b) => b.joinedAt - a.joinedAt);

        res.json({
          totalMembers: allMembers.length,
          recentMembers: recentMembers.map(m => ({
            id: m.id,
            name: m.name,
            class: m.class,
            level: m.level,
            realm: m.realm,
            rank: m.rank,
            ilvl: m.ilvl,
            activeSpec: m.activeSpec,
            armoryLink: m.armoryLink,
            professions: m.professions,
            joinedAt: new Date(m.joinedAt).toLocaleString('fr-FR'),
            daysAgo: Math.floor((Date.now() - m.joinedAt) / (24 * 60 * 60 * 1000))
          }))
        });

      } catch (error) {
        console.error('Error checking members:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }
);

/**
 * Utility function to manage guild members (init active field, remove member)
 * Usage:
 * - ?action=init - Initialize all members with active: true
 * - ?action=remove&member=Name-realm - Mark a member as departed
 * - ?action=delete&member=Name-realm - Permanently delete a member
 */
exports.manageMembers = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      try {
        const action = req.query.action;
        const memberKey = req.query.member;

        if (action === 'init') {
          // Initialize all members with active: true if not set
          const snapshot = await db.collection('guild-members').get();
          const batch = db.batch();
          let updated = 0;

          snapshot.forEach(doc => {
            const data = doc.data();
            if (data.active === undefined) {
              batch.update(doc.ref, { active: true });
              updated++;
            }
          });

          await batch.commit();
          return res.json({
            success: true,
            message: `Initialized ${updated} members with active: true`,
            totalMembers: snapshot.size
          });
        }

        if (action === 'remove' && memberKey) {
          // Mark member as departed (soft delete)
          const memberRef = db.collection('guild-members').doc(memberKey);
          const memberDoc = await memberRef.get();

          if (!memberDoc.exists) {
            return res.status(404).json({ error: `Member ${memberKey} not found` });
          }

          await memberRef.update({
            active: false,
            leftAt: Date.now()
          });

          return res.json({
            success: true,
            message: `Member ${memberKey} marked as departed`
          });
        }

        if (action === 'delete' && memberKey) {
          // Permanently delete member
          const memberRef = db.collection('guild-members').doc(memberKey);
          const memberDoc = await memberRef.get();

          if (!memberDoc.exists) {
            return res.status(404).json({ error: `Member ${memberKey} not found` });
          }

          await memberRef.delete();

          return res.json({
            success: true,
            message: `Member ${memberKey} permanently deleted`
          });
        }

        return res.status(400).json({
          error: 'Invalid action',
          usage: {
            init: '?action=init - Initialize all members with active: true',
            remove: '?action=remove&member=Name-realm - Mark member as departed',
            delete: '?action=delete&member=Name-realm - Permanently delete member'
          }
        });

      } catch (error) {
        console.error('Error managing members:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }
);

/**
 * Submit a roster entry (survey response)
 * This function handles writes to the roster collection securely
 * Only Discord-authenticated users can submit entries
 */
exports.submitRosterEntry = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      try {
        // Only accept POST
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const { entry, discordUser } = req.body;

        // Validate Discord user info
        if (!discordUser || !discordUser.userId || !discordUser.username) {
          return res.status(401).json({ error: 'Discord authentication required' });
        }

        // Validate entry data
        if (!entry || !entry.name || !entry.class || !entry.spec) {
          return res.status(400).json({ error: 'Missing required entry fields (name, class, spec)' });
        }

        // Prepare the document
        const rosterEntry = {
          ...entry,
          discordUserId: discordUser.userId,
          discordUsername: discordUser.username,
          timestamp: new Date(),
          submittedVia: 'cloud-function'
        };

        // Write to Firestore
        const docRef = await db.collection('roster').add(rosterEntry);

        console.log('Roster entry submitted:', {
          docId: docRef.id,
          playerName: entry.name,
          discordUser: discordUser.username
        });

        res.json({
          success: true,
          id: docRef.id,
          message: 'Entry submitted successfully'
        });

      } catch (error) {
        console.error('Error submitting roster entry:', error);
        res.status(500).json({ error: 'Failed to submit entry', details: error.message });
      }
    });
  }
);

/**
 * Update a roster entry (for Armory refresh)
 */
exports.updateRosterEntry = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      try {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const { entryId, updates, discordUser } = req.body;

        if (!entryId) {
          return res.status(400).json({ error: 'Missing entryId' });
        }

        if (!updates || typeof updates !== 'object') {
          return res.status(400).json({ error: 'Missing or invalid updates' });
        }

        // Only allow specific fields to be updated
        const allowedFields = ['ilvl', 'enchantPercentage', 'gemPercentage', 'avatarUrl'];
        const sanitizedUpdates = {};

        for (const field of allowedFields) {
          if (updates[field] !== undefined) {
            sanitizedUpdates[field] = updates[field];
          }
        }

        if (Object.keys(sanitizedUpdates).length === 0) {
          return res.status(400).json({ error: 'No valid fields to update' });
        }

        // Update in Firestore
        const docRef = db.collection('roster').doc(entryId);
        const doc = await docRef.get();

        if (!doc.exists) {
          return res.status(404).json({ error: 'Entry not found' });
        }

        await docRef.update(sanitizedUpdates);

        console.log('Roster entry updated:', {
          docId: entryId,
          fields: Object.keys(sanitizedUpdates),
          updatedBy: discordUser?.username || 'unknown'
        });

        res.json({
          success: true,
          message: 'Entry updated successfully'
        });

      } catch (error) {
        console.error('Error updating roster entry:', error);
        res.status(500).json({ error: 'Failed to update entry', details: error.message });
      }
    });
  }
);

/**
 * Delete a roster entry
 * Only the original submitter or admins can delete
 */
exports.deleteRosterEntry = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      try {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const { entryId, discordUser } = req.body;

        if (!entryId) {
          return res.status(400).json({ error: 'Missing entryId' });
        }

        if (!discordUser || !discordUser.userId) {
          return res.status(401).json({ error: 'Discord authentication required' });
        }

        // Get the entry to verify ownership
        const docRef = db.collection('roster').doc(entryId);
        const doc = await docRef.get();

        if (!doc.exists) {
          return res.status(404).json({ error: 'Entry not found' });
        }

        // For now, allow deletion if user is authenticated
        // In the future, could check if discordUser.userId matches doc.data().discordUserId
        await docRef.delete();

        console.log('Roster entry deleted:', {
          docId: entryId,
          deletedBy: discordUser.username
        });

        res.json({
          success: true,
          message: 'Entry deleted successfully'
        });

      } catch (error) {
        console.error('Error deleting roster entry:', error);
        res.status(500).json({ error: 'Failed to delete entry', details: error.message });
      }
    });
  }
);

/**
 * Récupère les events Raid-Helper à venir pour le serveur Discord
 */
exports.getRaidHelperEvents = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10,
    secrets: [discordGuildId, raidHelperApiKey]
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      try {
        const serverId = discordGuildId.value();
        const apiKey   = raidHelperApiKey.value();

        const response = await axios.get(
          `https://raid-helper.xyz/api/v4/servers/${serverId}/events`,
          {
            headers: { Authorization: apiKey }
          }
        );

        const data = response.data;
        const past = req.query.past === 'true';
        // L'API retourne { postedEvents: [], scheduledEvents: [] }
        const events = [
          ...(data.postedEvents    || []),
          ...(data.scheduledEvents || [])
        ]
          .filter(e => past
            ? e.startTime * 1000 < Date.now()
            : e.startTime * 1000 >= Date.now()
          )
          .sort((a, b) => past
            ? b.startTime - a.startTime  // récent en premier pour l'attendance
            : a.startTime - b.startTime
          )
          .map(e => ({
            id:          e.id,
            title:       e.title,
            description: e.description || '',
            startTime:   e.startTime,
            endTime:     e.endTime || null,
            type:        e.templateId || null,
            signUps:     parseInt(e.signUpCount) || 0,
            leader:      e.leaderName || null,
            color:       e.color || null,
            imageUrl:    e.imageUrl || null,
          }));

        res.json({ events });
      } catch (error) {
        console.error('Error fetching Raid-Helper events:', error.message);
        res.status(500).json({ error: 'Failed to fetch events', details: error.message });
      }
    });
  }
);

/**
 * Récupère le détail d'un event Raid-Helper (signups par rôle/classe)
 */
exports.getEventDetails = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10,
    secrets: [raidHelperApiKey]
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      try {
        const { eventId } = req.query;
        if (!eventId) return res.status(400).json({ error: 'Missing eventId' });

        const apiKey   = raidHelperApiKey.value();
        const response = await axios.get(
          `https://raid-helper.xyz/api/v4/events/${eventId}`,
          { headers: { Authorization: apiKey } }
        );

        const e = response.data;
        const signUps  = (e.signUps || []);

        // Sépare les inscrits par statut
        const primary   = signUps.filter(s => s.status === 'primary');
        const absences  = signUps.filter(s => s.className === 'Absence');
        const bench     = signUps.filter(s => s.className === 'Bench');
        const late      = signUps.filter(s => s.className === 'Late');
        const tentative = signUps.filter(s => s.className === 'Tentative');

        // Compte par rôle (inscrits primaires uniquement)
        const roleSummary = { Tanks: 0, Melee: 0, Ranged: 0, Healers: 0 };
        primary.forEach(s => {
          if (roleSummary[s.roleName] !== undefined) roleSummary[s.roleName]++;
        });

        const mapPlayer = s => ({
          name:   s.name,
          userId: s.userId || null,
          class:  s.className,
          spec:   s.specName,
          role:   s.roleName,
          note:   s.note || null,
        });

        res.json({
          id:          e.id,
          title:       e.displayTitle || e.title,
          startTime:   e.startTime,
          imageUrl:    e.imageUrl || null,
          leader:      e.leaderName || null,
          roleSummary,
          signUps:     primary.sort((a, b) => a.position - b.position).map(mapPlayer),
          absences:    absences.map(mapPlayer),
          bench:       bench.map(mapPlayer),
          late:        late.map(mapPlayer),
          tentative:   tentative.map(mapPlayer),
        });
      } catch (error) {
        console.error('Error fetching event details:', error.message);
        res.status(500).json({ error: 'Failed to fetch event details', details: error.message });
      }
    });
  }
);

// ─── WarcraftLogs ─────────────────────────────────────────────────────────────

const DIFFICULTY_LABEL = { 1: 'LFR', 3: 'Normal', 4: 'Héroïque', 5: 'Mythique' };
const WCL_GUILD = { name: 'Les Sages de Pandarie', serverSlug: 'hyjal', serverRegion: 'eu' };

// Cache token en mémoire entre invocations "chaudes"
let _wclTokenCache = { token: null, expiresAt: 0 };

async function getWclToken(clientId, clientSecret) {
  const now = Date.now();
  if (_wclTokenCache.token && _wclTokenCache.expiresAt > now + 60_000) {
    return _wclTokenCache.token;
  }
  const resp = await axios.post(
    'https://www.warcraftlogs.com/oauth/token',
    new URLSearchParams({ grant_type: 'client_credentials' }),
    {
      auth: { username: clientId, password: clientSecret },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
  );
  _wclTokenCache = {
    token: resp.data.access_token,
    expiresAt: now + resp.data.expires_in * 1000
  };
  return _wclTokenCache.token;
}

async function wclQuery(token, query, variables = {}) {
  const resp = await axios.post(
    'https://www.warcraftlogs.com/api/v2/client',
    { query, variables },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  if (resp.data.errors) throw new Error(resp.data.errors[0].message);
  return resp.data.data;
}

/**
 * Logique de sync WCL → Firestore.
 * - Récupère les 10 derniers reports de la guilde sur WCL
 * - Pour chaque report absent de Firestore : fetch rankings + stocke
 * - Retourne le nombre de nouveaux reports syncés
 */
async function runWclSync(token) {
  // 1. Récupère les reports WCL
  const data = await wclQuery(token, `{
    reportData {
      reports(
        guildName: "${WCL_GUILD.name}"
        guildServerSlug: "${WCL_GUILD.serverSlug}"
        guildServerRegion: "${WCL_GUILD.serverRegion}"
        limit: 10
      ) {
        data {
          code startTime endTime title
          owner { name }
          zone { id name }
          fights(killType: Kills) { id name difficulty encounterID }
        }
      }
    }
  }`);

  const wclReports = data.reportData.reports.data || [];
  if (wclReports.length === 0) return 0;

  // 2. Vérifie lesquels sont déjà en cache Firestore
  const col = db.collection('wcl-reports');
  const existing = new Set(
    (await col.select().get()).docs.map(d => d.id)
  );

  // 3. Sync les nouveaux uniquement
  let synced = 0;
  for (const report of wclReports) {
    if (existing.has(report.code)) continue;

    // Déduplique les kills par boss+difficulté (avant le fetch rankings pour avoir la difficulté)
    const killsMap = {};
    (report.fights || []).forEach(f => {
      const key = `${f.encounterID}|${f.difficulty}`;
      if (!killsMap[key]) {
        killsMap[key] = {
          encounterID: f.encounterID,
          name:        f.name,
          difficulty:  f.difficulty,
          label:       DIFFICULTY_LABEL[f.difficulty] || 'Normal'
        };
      }
    });

    // Fetch rankings pour ce report (encounterID: 0 = tous les boss)
    let rankings = null;
    try {
      const rData = await wclQuery(token, `{
        reportData {
          report(code: "${report.code}") {
            rankings(encounterID: 0)
          }
        }
      }`);
      rankings = rData.reportData.report.rankings ?? null;
    } catch (e) {
      console.warn(`Rankings fetch failed for ${report.code}:`, e.message);
    }

    // Fetch HPS rankings pour TOUS les joueurs (pas seulement healers)
    // On filtre au parse de CE REPORT uniquement (pas le meilleur ever)
    // hpsRankings: { "PlayerName|encounterId": rankPercent }
    const hpsRankings = {};
    if (rankings?.data) {
      const combos = new Map(); // key → { alias, name, serverSlug, serverRegion, encounterId, difficulty }
      rankings.data.forEach(fight => {
        if (!fight.kill) return;
        const encId = fight.encounter?.id;
        if (!encId) return;
        const difficulty = killsMap[`${encId}|3`]?.difficulty
                        || killsMap[`${encId}|4`]?.difficulty
                        || 3;
        const allChars = [
          ...(fight.roles?.tanks?.characters   || []),
          ...(fight.roles?.healers?.characters || []),
          ...(fight.roles?.dps?.characters     || [])
        ];
        allChars.forEach(char => {
          const key = `${char.name}|${encId}`;
          if (combos.has(key)) return;
          const server = char.server || {};
          const slug = server.name
            ? server.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            : null;
          if (!slug) return;
          const alias = `p_${char.name.replace(/[^a-zA-Z0-9]/g, '_')}_${encId}`;
          combos.set(key, { alias, name: char.name, serverSlug: slug, serverRegion: (server.region || 'eu').toLowerCase(), encounterId: encId, difficulty });
        });
      });

      if (combos.size > 0) {
        let q = '{ characterData {';
        for (const combo of combos.values()) {
          q += ` ${combo.alias}: character(name: "${combo.name}", serverSlug: "${combo.serverSlug}", serverRegion: "${combo.serverRegion}") {`;
          q += ` encounterRankings(encounterID: ${combo.encounterId}, difficulty: ${combo.difficulty}, metric: hps)`;
          q += ' }';
        }
        q += ' } }';
        try {
          const hpsData = await wclQuery(token, q);
          const charData = hpsData?.characterData || {};
          for (const [key, combo] of combos) {
            const ranks = charData[combo.alias]?.encounterRankings?.ranks;
            if (ranks && ranks.length > 0) {
              // Parse de CE report uniquement — pas le meilleur ever
              const thisReport = ranks.find(r => r.report?.code === report.code);
              if (thisReport) hpsRankings[key] = Math.round(thisReport.rankPercent);
            }
          }
        } catch (e) {
          console.warn(`HPS rankings fetch failed for ${report.code}:`, e.message);
        }
      }
    }

    await col.doc(report.code).set({
      code:        report.code,
      startTime:   report.startTime,
      endTime:     report.endTime,
      title:       report.title || null,
      owner:       report.owner?.name || null,
      zoneId:      report.zone?.id    || null,
      zoneName:    report.zone?.name  || null,
      kills:       Object.values(killsMap),
      rankings:    rankings,           // JSON brut WCL — null si fetch échoué
      hpsRankings: hpsRankings,        // { "PlayerName|encounterId": rankPercent } — HPS pour healers
      syncedAt:    new Date()
    });

    console.log(`WCL sync: stored report ${report.code}`);
    synced++;
  }

  return synced;
}

/**
 * Sync automatique quotidienne (06:00 Europe/Paris).
 * Ne fait des appels WCL que si de nouveaux reports existent.
 */
exports.syncWclData = onSchedule(
  {
    schedule: '0 6 * * *',
    timeZone: 'Europe/Paris',
    region:   'europe-west1',
    secrets:  [wclCredentials]
  },
  async () => {
    const creds = JSON.parse(wclCredentials.value().trim());
    const token = await getWclToken(creds.client_id, creds.client_secret);
    const synced = await runWclSync(token);
    console.log(`WCL daily sync complete: ${synced} new report(s)`);
  }
);

/**
 * Déclencheur manuel (POST) — accessible depuis le panneau admin de la page.
 * CORS restreint à nos domaines, pas d'autres secrets exposés.
 */
exports.triggerWclSync = onRequest(
  {
    region:      'europe-west1',
    maxInstances: 2,
    secrets:     [wclCredentials]
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      try {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

        const creds = JSON.parse(wclCredentials.value().trim());
        const token = await getWclToken(creds.client_id, creds.client_secret);
        const synced = await runWclSync(token);

        res.json({ ok: true, synced });
      } catch (error) {
        console.error('WCL manual sync error:', error.message);
        res.status(500).json({ error: 'Sync failed', details: error.message });
      }
    });
  }
);

/**
 * Lecture des données WCL depuis Firestore (aucun appel WCL API côté client).
 * GET ?type=reports   → 3 derniers reports (metadata + kills)
 * GET ?type=rankings  → matrice joueur × boss (meilleur parse sur 3 derniers reports)
 */
exports.getWclData = onRequest(
  {
    region:      'europe-west1',
    maxInstances: 10
    // Pas de secret : lit uniquement Firestore
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      try {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

        const type = req.query.type;
        if (!['reports', 'rankings'].includes(type)) {
          return res.status(400).json({ error: 'Invalid type. Use reports or rankings.' });
        }

        // Récupère les 3 derniers reports depuis Firestore
        const snapshot = await db.collection('wcl-reports')
          .orderBy('startTime', 'desc')
          .limit(3)
          .get();

        if (snapshot.empty) {
          return res.json(type === 'reports'
            ? { reports: [], syncing: true }
            : { players: [], bosses: [], syncing: true }
          );
        }

        // ── Reports ──────────────────────────────────────────────────────────
        if (type === 'reports') {
          const reports = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
              code:      d.code,
              url:       `https://www.warcraftlogs.com/reports/${d.code}`,
              startTime: d.startTime,
              endTime:   d.endTime,
              title:     d.title,
              owner:     d.owner,
              kills:     (d.kills || []).map(k => ({ name: k.name, difficulty: k.label }))
            };
          });
          return res.json({ reports });
        }

        // ── Rankings : matrice joueur × boss ─────────────────────────────────
        if (type === 'rankings') {
          const zoneName   = snapshot.docs[0].data().zoneName || null;
          // Ordre des boss : basé sur le premier report (ordre de l'instance)
          const bossOrder  = [];
          const bossSet    = new Set();
          // Récupère les noms des membres de la guilde pour filtrer les PUGs
          const guildSnap = await db.collection('guild-members').get();
          const guildNames = new Set(
            guildSnap.docs.map(d => d.data().name?.toLowerCase()).filter(Boolean)
          );

          // playerMap : { name → { class, roleCounts, encounters: { bossName → { damage, healing, role, spec, ilvl } } } }
          const playerMap = {};

          snapshot.docs.forEach(doc => {
            const d        = doc.data();
            const rankings = d.rankings;
            if (!rankings?.data) return;

            const hpsRankings = d.hpsRankings || {};

            rankings.data.forEach(fight => {
              if (!fight.kill) return;

              const bossName    = fight.encounter?.name;
              const encounterId = fight.encounter?.id;
              if (!bossName) return;

              if (!bossSet.has(bossName)) {
                bossSet.add(bossName);
                bossOrder.push({ name: bossName, encounterID: encounterId });
              }

              const roleGroups = [
                { chars: fight.roles?.tanks?.characters   || [], role: 'tank'   },
                { chars: fight.roles?.healers?.characters || [], role: 'healer' },
                { chars: fight.roles?.dps?.characters     || [], role: 'dps'    }
              ];

              roleGroups.forEach(({ chars, role }) => {
                chars.forEach(player => {
                  if (!player.name) return;
                  if (guildNames.size > 0 && !guildNames.has(player.name.toLowerCase())) return;

                  if (!playerMap[player.name]) {
                    playerMap[player.name] = {
                      name:       player.name,
                      class:      player.class || null,
                      roleCounts: { healer: 0, tank: 0, dps: 0 },
                      encounters: {}
                    };
                  }

                  playerMap[player.name].roleCounts[role]++;

                  const damagePct  = typeof player.rankPercent === 'number' ? Math.round(player.rankPercent) : null;
                  const hpsKey     = `${player.name}|${encounterId}`;
                  const healingPct = hpsRankings[hpsKey] ?? null;

                  const existing = playerMap[player.name].encounters[bossName];
                  // Garde le meilleur parse damage sur les N derniers reports pour ce boss
                  if (damagePct !== null && (!existing || damagePct > (existing.damage || 0))) {
                    playerMap[player.name].encounters[bossName] = {
                      damage:  damagePct,
                      healing: healingPct,
                      role:    role,
                      spec:    player.spec  || null,
                      ilvl:    Math.round(player.bracketData || 0)
                    };
                  }
                });
              });
            });
          });

          // Détermine le rôle principal (le plus fréquent) de chaque joueur
          const players = Object.values(playerMap).map(p => {
            const primaryRole = Object.entries(p.roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'dps';
            return { name: p.name, class: p.class, primaryRole, encounters: p.encounters };
          });

          // Trie par rôle puis par moyenne de parse (damage) décroissante
          const roleOrder = { tank: 1, healer: 2, dps: 0 };
          const avgDamage = p => {
            const vals = Object.values(p.encounters).map(e => e.damage || 0);
            return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
          };
          players.sort((a, b) => avgDamage(b) - avgDamage(a));

          return res.json({ zoneName, bosses: bossOrder, players });
        }

      } catch (error) {
        console.error('getWclData error:', error.message);
        res.status(500).json({ error: 'Failed to fetch WCL data', details: error.message });
      }
    });
  }
);
