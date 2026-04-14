# Plan d'amélioration — Les Sages de Pandarie

Suivi des tâches identifiées lors de l'audit du site.
Cocher au fur et à mesure. Les tâches sont ordonnées par priorité/dépendances.

---

## Fondations (CI + Sécurité de base)

- [x] Mettre en place la CI GitHub Actions (ESLint + HTMLHint + Lighthouse)
- [ ] Créer `.gitignore` (supprime 1 finding VICE HIGH)
- [ ] Ajouter meta description + Open Graph sur toutes les pages (SEO + prévisualisation Discord)
- [ ] Ajouter favicon manquant sur `index.html`

---

## Refactoring — Éliminer les duplications

- [ ] Créer `scripts/firebase-init.js` — config Firebase centralisée (8 duplications → 1)
- [ ] Créer `scripts/admin-auth.js` — module auth admin réutilisable (pattern identique à discordAuth.js)
- [ ] Déplacer `.page-header`, `.admin-btn` dans `common.css` (supprime ~10 redéfinitions locales)

---

## Sécurité — XSS restants

- [ ] `escHtml()` sur `stats.html` (noms membres Firestore dans arrivals/departures, lignes 660-664)
- [ ] `escHtml()` sur `attendance.html` (err.message ligne 517, tooltip Discord ligne 643)
- [ ] `escHtml()` sur `news.html` (données NEWS.js injectées ligne 191 — risque faible mais propre)

---

## Assets

- [ ] Évaluer le téléchargement local des icônes classes/specs (guildsofwow.com + wow.zamimg.com)

---

## Notes

- Audio player site-wide : abandonné (limitation autoplay navigateur sur MPA)
- Firebase SDK : harmoniser compat vs modulaire (index.html utilise modulaire, les autres compat)
