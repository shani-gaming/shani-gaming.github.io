# Prompt pour Claude Code - Guild Roster WoW

## Contexte du projet

Je développe un mini-site web de sondage pour ma guilde WoW afin de préparer notre roster pour la prochaine extension "The War Within". Le site sera hébergé sur GitHub Pages sous le pseudo "Shani".

## Objectif

Site permettant aux membres de la guilde de s'inscrire pour le raid 10 avec la composition suivante :
- 2 Tanks
- 2 Healers  
- 3 DPS Mêlée
- 3 DPS Distance

## Fonctionnalités actuelles

- Formulaire d'inscription : pseudo, classe, spécialisation, rôle, disponibilité
- Auto-détection du rôle selon la spé choisie
- Couleurs de classes WoW officielles
- Persistence des données en localStorage
- Stats en temps réel (inscrits par rôle)
- Possibilité de retirer un joueur (clic sur sa carte)

## Stack technique

- HTML/CSS/JS vanilla (single file)
- Pas de backend (localStorage uniquement)
- Design dark fantasy / WoW themed
- Fonts: Cinzel (titres) + Crimson Text (corps)

## Ce que je voudrais améliorer

1. **Ajouter un système de "flex"** : permettre aux joueurs d'indiquer un rôle secondaire
2. **Export des données** : bouton pour exporter le roster en CSV ou copier en texte formaté pour Discord
3. **Système de notes** : champ pour ajouter des notes sur chaque joueur (ilvl, expérience, etc.)
4. **Validation anti-doublon** : empêcher quelqu'un de s'inscrire deux fois avec le même pseudo
5. **Mode admin** : pouvoir réorganiser les joueurs entre les slots / modifier les inscriptions
6. **Responsive amélioré** : optimiser pour mobile

## Fichiers du projet

Le projet contient actuellement un seul fichier `index.html` avec tout le code intégré (HTML + CSS + JS).

## Instructions

Pars du code existant dans `index.html` et implémente les améliorations demandées. Garde le même style visuel dark fantasy avec les couleurs de classes WoW. Le site doit rester un single-page sans backend (GitHub Pages static hosting).
