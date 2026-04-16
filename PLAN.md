# Plan d'amélioration — Les Sages de Pandarie

Suivi des tâches identifiées lors de l'audit du site.
Cocher au fur et à mesure. Les tâches sont ordonnées par priorité/dépendances.

---

## Fondations (CI + Sécurité de base)

- [x] Mettre en place la CI GitHub Actions (ESLint + HTMLHint + Lighthouse)
- [x] Créer `.gitignore`
- [x] Ajouter meta description + Open Graph sur toutes les pages (SEO + prévisualisation Discord)
- [x] Ajouter favicon manquant sur `index.html`

---

## Refactoring — Éliminer les duplications

- [x] Créer `scripts/firebase-init.js` — config Firebase centralisée
- [x] Créer `scripts/admin-auth.js` — module auth admin réutilisable
- [x] Déplacer `.page-header`, `.admin-btn` dans `common.css` (supprime ~10 redéfinitions locales)

---

## Sécurité — XSS

- [x] `escHtml()` sur `stats.html` (noms membres Firestore dans arrivals/departures)
- [x] `escHtml()` sur `attendance.html` (tooltip alts Discord)
- [x] `escHtml()` sur `news.html` — pas nécessaire (données hardcodées dans news.js)

---

## Assets

- [x] Évaluer le téléchargement local des icônes classes/specs (guildsofwow.com + wow.zamimg.com)

---

## Divers

- [x] Investiguer le Firebase config différent dans `composition/index.html` (apiKey différent)
- [x] Harmoniser Firebase SDK : compat vs modulaire (index.html utilise modulaire, les autres compat)

---

## Notes

- Audio player site-wide : abandonné (limitation autoplay navigateur sur MPA)
