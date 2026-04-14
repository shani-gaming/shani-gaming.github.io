/**
 * Firebase Initialization — Les Sages de Pandarie
 * Inclure ce script après les SDK Firebase compat, avant tout code Firebase.
 */
const firebaseConfig = {
    apiKey: "AIzaSyD0cmazoD42kD_H243Do5pIPGhwXFgOHYE",
    authDomain: "guild-roster-67da7.firebaseapp.com",
    projectId: "guild-roster-67da7",
    storageBucket: "guild-roster-67da7.firebasestorage.app",
    messagingSenderId: "971948767326",
    appId: "1:971948767326:web:4377499f1ff23db1899ccf"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
