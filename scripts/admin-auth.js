/**
 * AdminAuth — Module d'authentification admin réutilisable
 * Dépend de firebase-init.js (chargé avant).
 *
 * Usage :
 *   AdminAuth.init({
 *       onAdmin:     (user) => { // afficher les contrôles admin },
 *       onSignedOut: ()     => { // masquer les contrôles admin }
 *   });
 *
 *   // Bouton Admin :
 *   AdminAuth.toggle();  // login si non connecté, logout si connecté
 */

const AdminAuth = {
    _isAdmin: false,
    _callbacks: { onAdmin: null, onSignedOut: null },

    get isAdmin() { return this._isAdmin; },

    /**
     * Initialise l'écoute de session — appeler une fois au chargement de la page.
     * Restaure automatiquement la session admin si l'utilisateur était déjà connecté.
     */
    init({ onAdmin, onSignedOut }) {
        this._callbacks = { onAdmin, onSignedOut };

        firebase.auth().onAuthStateChanged(async user => {
            if (!user) {
                this._isAdmin = false;
                onSignedOut();
                return;
            }

            try {
                const doc = await firebase.firestore()
                    .collection('admins').doc(user.email).get();

                if (doc.exists) {
                    this._isAdmin = true;
                    onAdmin(user);
                } else {
                    // Connecté mais pas admin — on déconnecte silencieusement
                    this._isAdmin = false;
                    await firebase.auth().signOut();
                    onSignedOut();
                }
            } catch (err) {
                console.error('AdminAuth: Firestore check failed', err);
                this._isAdmin = false;
                onSignedOut();
            }
        });
    },

    /**
     * Toggle : connecte si non admin, déconnecte si admin.
     * À appeler sur le click du bouton Admin.
     */
    async toggle() {
        if (this._isAdmin) {
            await firebase.auth().signOut();
            // onAuthStateChanged se charge d'appeler onSignedOut()
            return;
        }

        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await firebase.auth().signInWithPopup(provider);
            // onAuthStateChanged se charge d'appeler onAdmin() si l'email est dans admins
        } catch (err) {
            if (err.code !== 'auth/popup-closed-by-user') {
                console.error('AdminAuth: login failed', err);
            }
        }
    }
};
