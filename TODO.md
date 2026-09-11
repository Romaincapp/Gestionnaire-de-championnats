# ✅ TODO - Liste des tâches

> ⚠️ Ce fichier était figé depuis 2024-02-02 alors que le code a beaucoup évolué depuis
> (voir `DEVLOG.md`). Remis à jour en 2026-09 : les tâches déjà réalisées sont cochées ou
> retirées, les tâches encore pertinentes sont conservées. **Cocher/retirer une tâche ici
> fait partie du protocole de fin de session** décrit dans `claude.md`.

## 🔥 Prioritaire

### Refactoring
- [x] Migrer les fonctions restantes de `script.js` vers les modules (`script.js` ne fait
      plus que ~37 lignes — migration terminée, voir `AGENTS.md`)
- [ ] Vérifier ponctuellement que toutes les fonctions `window.xxx` utilisées par `index.html`
      sont bien définies (pas de régression suite à un renommage de module)
- [ ] Supprimer définitivement le résidu `script.js` une fois confirmé qu'il n'est plus
      chargé/utile

### Corrections
- [ ] Vérifier que tous les `onclick` HTML ont leur fonction correspondante
- [ ] Tester l'export/import de données (championnat + chrono/multisport)
- [ ] Vérifier la sauvegarde automatique (localStorage)

## 🎯 Important

### UI/UX
- [ ] Ajouter des loaders pendant les opérations longues
- [ ] Améliorer les messages d'erreur
- [ ] Ajouter des confirmations avant suppression
- [ ] Optimiser l'affichage sur mobile

### Fonctionnalités
- [ ] Ajouter un système de backup automatique
- [ ] Permettre l'annulation des actions (undo)
- [ ] Ajouter des statistiques avancées (série de victoires, etc.)

## 📝 Documentation

- [ ] Ajouter des commentaires JSDoc dans tous les modules
- [ ] Créer des schémas de la structure des données
- [ ] Documenter les cas limites et erreurs connues
- [ ] Ajouter des exemples d'utilisation

## 🏢 Gestion des Clubs (Nouveau)

### Développement
- [x] Créer le module `clubs.iife.js`
- [x] Modifier la structure des données joueurs ({name, club})
- [x] Ajouter le sélecteur de club dans l'interface
- [x] Modifier l'affichage des joueurs (badge club)
- [x] Modifier les classements (colonne Club)
- [x] Gérer la migration des anciennes données
- [x] Ajouter la gestion des clubs personnalisés
- [x] Modifier l'import en masse pour supporter les clubs
- [x] Modifier le mode multisport pour afficher les clubs

### Documentation
- [x] Créer `CLUBS.md`

## 🏆 Mode Multisport (Nouveau) - ✅ SIMPLIFIÉ

### Développement
- [x] Créer le module `multisport.iife.js`
- [x] Ajouter le sélecteur de type de journée (compact et intégré)
- [x] **SUPPRIMÉ** : Checkbox "Mode Chrono" globale (remplacée par sélecteur par journée)
- [x] Intégrer l'interface chrono par journée
- [x] Créer le classement combiné
- [x] Ajouter les fonctions d'export
- [x] **NOUVEAU** : Détection automatique du mode multisport
- [x] **NOUVEAU** : Onglet Multisport conditionnel (apparaît uniquement si mix de types)
- [x] **NOUVEAU** : Redirection intelligente du bouton Classement vers Multisport

### Tests
- [ ] Tester le changement de type de journée
- [x] Interface de course live avec chronométrage en direct
- [x] Mode couloirs avec touches 1-9 (natation)
- [x] Saisie rapide par dossard (avec détection auto relais)
- [x] Gestion des statuts (Prêt/En course/Terminé/DNS/**DISQ**, ajouté 2026-09)
- [x] Édition manuelle des temps, y compris **édition inline pendant une course en cours**
- [x] Relance d'un participant
- [x] Configuration des séries (sport, type, distance)
- [x] Classement interclub avec barème de points (barème de position 25/19/17…, 2026-08)
- [ ] Tester la saisie des résultats chrono
- [x] Export PDF des résultats chrono (bouton export PDF du classement général)
- [ ] Vérifier le calcul du classement combiné
- [ ] Tester l'export/import avec données multisport
- [ ] Vérifier la détection automatique du mode multisport

### Documentation
- [x] Créer `MULTISPORT.md`
- [x] Mettre à jour la documentation avec le nouveau système simplifié
- [ ] Ajouter des captures d'écran
- [ ] Faire un guide vidéo

## 🏊 Mode Couloirs & imports natation (Nouveau, 2026-08)

- [x] Assignation manuelle des couloirs par série
- [x] Sélection des participants depuis les "Participants disponibles" de la journée
- [x] Édition nom/dossard/club des nageurs (pool et modale couloirs)
- [x] Arrêt automatique du chrono général quand le dernier couloir est stoppé
- [x] Import "Séries natation" façon Excel (séparateur, mapping de colonnes)
- [x] Tolérance aux données manquantes dans l'import
- [ ] Ajouter un export dédié au mode couloirs (actuellement partagé avec l'export chrono général)

## 🚀 Améliorations techniques

### Performance
- [ ] Optimiser les boucles dans les grands classements
- [ ] Mettre en cache les calculs de statistiques
- [ ] Lazy loading des sections non visibles

### Qualité du code
- [ ] Ajouter ESLint pour la cohérence du style
- [ ] Créer des tests unitaires avec Jest
- [ ] Ajouter des tests d'intégration

### Modernisation
- [ ] Migrer vers ES6+ (classes, arrow functions, etc.)
- [ ] Utiliser un bundler (Vite recommandé)
- [ ] Ajouter TypeScript pour la type safety
- [ ] Convertir en PWA (offline mode)

## 🐛 Bugs connus à corriger

- [ ] Vérifier : perte de données si fermeture brutale pendant sauvegarde
- [ ] Vérifier : synchronisation des classements en temps réel
- [ ] Vérifier : gestion des noms avec caractères spéciaux

## 💡 Nouvelles fonctionnalités (idées)

### Championship
- [ ] Système de pénalités
- [ ] Matchs en 5 sets
- [ ] Gestion des abandons

### POOL
- [ ] Configurer la taille des poules (3, 4, 5 joueurs)
- [ ] Configurer le nombre de qualifiés
- [ ] Consulter le classement détaillé des poules

### CHRONO
- [ ] Support des relais
- [ ] Catégories d'âge
- [ ] Classements par club/équipe

### Général
- [ ] Système de login/multi-utilisateur
- [ ] Synchronisation cloud
- [ ] Application mobile native

## 🧪 Tests à faire systématiquement

### Tests fonctionnels
- [ ] Créer 3 journées avec joueurs et matchs
- [ ] Générer tous les types de matchs
- [ ] Saisir tous les scores
- [ ] Vérifier tous les classements
- [ ] Exporter et réimporter

### Tests navigateurs
- [ ] Chrome (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Chrome mobile
- [ ] Safari mobile

### Tests données
- [ ] Avec beaucoup de joueurs (50+)
- [ ] Avec beaucoup de matchs (100+)
- [ ] Avec noms longs et spéciaux

---

## 📊 Statistiques du projet

**Version actuelle** : 2.4.0 (modulaire) — voir `CHANGELOG.md`

**Modules créés** : 16 (`src/*.iife.js`) — voir `AGENTS.md` pour le détail de chacun.
Ne pas figer de tailles précises ici (elles datent vite) : lancer `wc -l src/*.iife.js`
pour l'état exact au moment où on en a besoin.

**Documentation** : `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `TODO.md`
(ce fichier), `CLAUDE.md`, `MULTISPORT.md`, `CLUBS.md`, `DEVLOG.md`.

**Reste à faire** :
- Migration `script.js` → modules : **terminée** (résidu de ~37 lignes)
- Voir les sections ci-dessus pour les tâches ouvertes par domaine

---

*Dernière mise à jour : voir `DEVLOG.md` (entrée la plus récente) — ne pas coder une date en
dur ici, c'est justement ce qui a rendu ce fichier obsolète pendant 2,5 ans la dernière fois.*
