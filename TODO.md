# ✅ TODO - Liste des tâches

> Mise à jour le 2026-09-15 : `script.js` legacy est passé de ~10-21k lignes à 37 lignes
> (dark mode uniquement) — la migration vers `src/*.iife.js` est terminée. `src/` compte
> maintenant 16 modules (~32 000 lignes), dont plusieurs absents d'AGENTS.md :
> `init.iife.js`, `export-json.iife.js`, `export-print.iife.js`, `multisport.iife.js`,
> `clubs.iife.js`. Les 73 handlers `onclick` de `index.html` pointent tous vers des
> fonctions bien exposées sur `window` (audit fait, aucun manquant).

## 🔥 Prioritaire

### Refactoring
- [x] Analyser `script.js` et identifier les fonctions restantes à migrer
- [x] Migrer les fonctions orphelines vers les modules appropriés
- [x] Tester que toutes les fonctions `window.xxx` sont bien définies
- [ ] Déplacer le dark mode restant de `script.js` vers `ui.iife.js` (ou un nouveau
      `theme.iife.js`), puis supprimer `script.js`
- [ ] Mettre à jour `AGENTS.md` pour documenter les modules manquants (`init`,
      `export-json`, `export-print`, `multisport`, `clubs`)

### Corrections
- [x] Vérifier que tous les `onclick` HTML ont leur fonction correspondante
- [ ] Tester l'export/import de données
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
- [x] Gestion des statuts (Prêt/En course/Terminé/DNS)
- [x] Édition manuelle des temps
- [x] Relance d'un participant
- [x] Configuration des séries (sport, type, distance)
- [ ] Tester la saisie des résultats chrono
- [ ] Classement interclub avec barème de points
- [ ] Export PDF des résultats chrono
- [ ] Vérifier le calcul du classement combiné
- [ ] Tester l'export/import avec données multisport
- [ ] Vérifier la détection automatique du mode multisport

### Documentation
- [x] Créer `MULTISPORT.md`
- [x] Mettre à jour la documentation avec le nouveau système simplifié
- [ ] Ajouter des captures d'écran
- [ ] Faire un guide vidéo

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

**Version actuelle** : 2.0.0+ (modulaire, migration terminée)

**Modules créés** : 16 dans `src/` (~32 000 lignes au total)
- Plus gros module : pools.iife.js (~7200 lignes / 310 KB)
- Plus petit module : notifications.iife.js (~60 lignes / 2 KB)
- Modules non documentés dans AGENTS.md : init, export-json, export-print,
  multisport, clubs

**Documentation** : 6 fichiers
- claude.md (guide technique, 15 KB)
- AGENTS.md (13 KB, partiellement obsolète — liste de modules incomplète)
- README.md (3 KB)
- CONTRIBUTING.md (5 KB)
- CHANGELOG.md (2 KB)
- MULTISPORT.md, CLUBS.md (docs de features)

**Reste à faire** :
- Lignes dans script.js legacy : 37 (dark mode uniquement)
- Fonctions à migrer : 0 (migration terminée)

---

*Dernière mise à jour : 2026-09-15*
