const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const axios = require('axios');
const cors = require('cors');

// Définir les secrets
const blizzardClientId = defineSecret('BLIZZARD_CLIENT_ID');
const blizzardClientSecret = defineSecret('BLIZZARD_CLIENT_SECRET');
const discordClientId = defineSecret('DISCORD_CLIENT_ID');
const discordClientSecret = defineSecret('DISCORD_CLIENT_SECRET');
const discordGuildId = defineSecret('DISCORD_GUILD_ID');
const discordWebhookUrl = defineSecret('DISCORD_WEBHOOK_URL');
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
              name: '⚔️ Item Level',
              value: characterDetails.averageItemLevel ? `${characterDetails.averageItemLevel} (équipé: ${characterDetails.equippedItemLevel})` : 'N/A',
              inline: true
            },
            { name: '🏰 Royaume', value: characterDetails.realm, inline: true },
            { name: '⚡ Faction', value: characterDetails.faction || 'N/A', inline: true },
            { name: '🎮 BattleTag', value: battletag || 'Non renseigné', inline: false },
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
          content: '@here Nouvelle candidature reçue !',
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
