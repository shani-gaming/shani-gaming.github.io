/**
 * Discord Authentication Module
 * Reusable authentication system for Discord OAuth2
 */

const DiscordAuth = {
    // Configuration
    CLIENT_ID: '1457760094363320441',
    REDIRECT_URI: 'https://www.sagesdepandarie.ovh/roster/discord-callback.html',
    FUNCTION_URL: 'https://verifydiscordrole-bmdbdjnmkq-ew.a.run.app',
    STORAGE_KEY: 'discord_auth',

    // Enable/disable Discord auth (for easy rollback)
    ENABLED: true,

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        if (!this.ENABLED) return true; // If disabled, grant access

        const authData = localStorage.getItem(this.STORAGE_KEY);
        if (!authData) return false;

        try {
            const data = JSON.parse(authData);
            const expiresAt = data.expiresAt || 0;

            // Check if token expired (valid for 24h)
            if (Date.now() > expiresAt) {
                this.logout();
                return false;
            }

            return data.hasAccess === true;
        } catch (error) {
            console.error('Error reading auth data:', error);
            return false;
        }
    },

    /**
     * Get authenticated user info
     */
    getUserInfo() {
        const authData = localStorage.getItem(this.STORAGE_KEY);
        if (!authData) return null;

        try {
            return JSON.parse(authData);
        } catch (error) {
            return null;
        }
    },

    /**
     * Start Discord OAuth flow
     */
    login() {
        const scope = 'identify guilds';
        const state = Math.random().toString(36).substring(7);

        // Store state for CSRF protection
        sessionStorage.setItem('discord_oauth_state', state);

        const authUrl = `https://discord.com/api/oauth2/authorize?` +
            `client_id=${this.CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent(scope)}&` +
            `state=${state}`;

        window.location.href = authUrl;
    },

    /**
     * Handle OAuth callback
     */
    async handleCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
            throw new Error(`Discord OAuth error: ${error}`);
        }

        if (!code) {
            throw new Error('No authorization code received');
        }

        // Verify state for CSRF protection
        const savedState = sessionStorage.getItem('discord_oauth_state');
        if (state !== savedState) {
            throw new Error('Invalid state parameter');
        }

        // Exchange code for access and verify roles
        const response = await fetch(this.FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: code,
                redirectUri: this.REDIRECT_URI
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Cloud Function error:', error);
            console.error('Status:', response.status);
            console.error('Full response:', {
                status: response.status,
                statusText: response.statusText,
                error: error
            });
            throw new Error(JSON.stringify(error, null, 2));
        }

        const data = await response.json();

        // Store auth data (valid for 24 hours)
        const authData = {
            hasAccess: data.hasAccess,
            username: data.username,
            userId: data.userId,
            roles: data.roles,
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24h
        };

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData));
        sessionStorage.removeItem('discord_oauth_state');

        // Sign in anonymously to Firebase for Firestore permissions
        if (data.hasAccess && typeof firebase !== 'undefined' && firebase.auth) {
            try {
                await firebase.auth().signInAnonymously();
                console.log('Firebase anonymous auth successful');
            } catch (firebaseError) {
                console.warn('Firebase anonymous auth failed:', firebaseError);
                // Continue anyway - Discord auth succeeded
            }
        }

        return authData;
    },

    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem(this.STORAGE_KEY);
        sessionStorage.removeItem('discord_oauth_state');
    },

    /**
     * Show login overlay (blocks page until authenticated)
     */
    showLoginOverlay(options = {}) {
        const {
            title = 'Accès Réservé aux Membres',
            message = 'Cette page est réservée aux membres de la guilde. Connectez-vous avec Discord pour y accéder.',
            onSuccess = null
        } = options;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'discord-auth-overlay';
        overlay.innerHTML = `
            <style>
                #discord-auth-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.95);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                    backdrop-filter: blur(10px);
                }

                .discord-auth-card {
                    background: linear-gradient(135deg, #2c2f33 0%, #23272a 100%);
                    border: 2px solid #5865F2;
                    border-radius: 16px;
                    padding: 3rem;
                    max-width: 500px;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(88, 101, 242, 0.3);
                }

                .discord-auth-icon {
                    font-size: 4rem;
                    margin-bottom: 1.5rem;
                }

                .discord-auth-title {
                    color: #ffffff;
                    font-size: 1.8rem;
                    font-weight: bold;
                    margin-bottom: 1rem;
                }

                .discord-auth-message {
                    color: #b9bbbe;
                    font-size: 1rem;
                    line-height: 1.6;
                    margin-bottom: 2rem;
                }

                .discord-login-btn {
                    background: #5865F2;
                    color: white;
                    border: none;
                    padding: 1rem 2.5rem;
                    font-size: 1.1rem;
                    font-weight: 600;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .discord-login-btn:hover {
                    background: #4752C4;
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(88, 101, 242, 0.4);
                }

                .discord-login-btn svg {
                    width: 24px;
                    height: 24px;
                    fill: currentColor;
                }
            </style>
            <div class="discord-auth-card">
                <div class="discord-auth-icon">🔒</div>
                <h2 class="discord-auth-title">${title}</h2>
                <p class="discord-auth-message">${message}</p>
                <button class="discord-login-btn" onclick="DiscordAuth.login()">
                    <svg viewBox="0 0 127.14 96.36"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>
                    Se connecter avec Discord
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Store callback for later
        if (onSuccess) {
            window._discordAuthCallback = onSuccess;
        }
    },

    /**
     * Hide login overlay
     */
    hideLoginOverlay() {
        const overlay = document.getElementById('discord-auth-overlay');
        if (overlay) {
            overlay.remove();
        }
    },

    /**
     * Ensure Firebase anonymous auth is active
     */
    async ensureFirebaseAuth() {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            console.warn('Firebase not available');
            return false;
        }

        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            return true; // Already signed in
        }

        try {
            await firebase.auth().signInAnonymously();
            console.log('Firebase anonymous auth successful');
            return true;
        } catch (error) {
            console.error('Firebase anonymous auth failed:', error);
            return false;
        }
    },

    /**
     * Initialize authentication check
     */
    async init(options = {}) {
        if (!this.ENABLED) {
            console.log('Discord auth is disabled');
            return;
        }

        if (!this.isAuthenticated()) {
            this.showLoginOverlay(options);
        } else {
            // User is Discord-authenticated, ensure Firebase auth is active
            await this.ensureFirebaseAuth();
        }
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiscordAuth;
}
