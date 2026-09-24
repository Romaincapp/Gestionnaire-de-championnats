# 🤝 Guide de Contribution

Merci de contribuer à ce projet ! Voici les bonnes pratiques à suivre.

## 🏗️ Architecture du code

### Modules IIFE

Tout le code doit être organisé en modules IIFE (Immediately Invoked Function Expression)
dans le dossier `src/`. Le projet compte aujourd'hui 15 modules (config, utils,
notifications, state, clubs, players, ui, init, matches, pools, chrono, multisport, ranking,
export-json, export-print) — voir `AGENTS.md` pour le rôle de chacun. `script.js`
ne gère plus que le mode sombre (~37 lignes), la migration est terminée : ne pas y écrire de code.

```javascript
(function(global) {
    'use strict';
    
    // Votre code ici
    
})(window);
```

### Dépendances

Si votre module dépend d'autres fonctions, utilisez les références globales :

```javascript
(function(global) {
    'use strict';
    
    // Accès aux fonctions d'autres modules
    var showNotification = global.showNotification;
    var championship = global.championship;
    
    function maFonction() {
        showNotification('Hello !', 'success');
    }
    
    // Exposition
    global.maFonction = maFonction;
    
})(window);
```

## 📝 Style de code

### Nommage
- **Fonctions** : `camelCase` - `generateMatchesForDay()`
- **Variables** : `camelCase` - `currentDay`
- **Constantes** : `UPPER_SNAKE_CASE` - `DEFAULT_CONFIG`
- **IDs DOM** : `kebab-case` - `matches-day-1`

### Commentaires
```javascript
/**
 * Description de la fonction
 * @param {string} playerName - Nom du joueur
 * @param {number} dayNumber - Numéro de la journée
 * @returns {Object} Statistiques du joueur
 */
function calculatePlayerStats(playerName, dayNumber) {
    // Code ici
}
```

### Structure d'une fonction
```javascript
// 1. Vérification des paramètres
if (!dayNumber) return;

// 2. Récupération des données
var dayData = championship.days[dayNumber];
if (!dayData) return;

// 3. Traitement
// ...

// 4. Sauvegarde
saveToLocalStorage();

// 5. Notification
showNotification('Succès !', 'success');
```

## 🧪 Tests

### Avant de commit
1. `npm test` - lance la suite Jest (`tests/unit/`), inclut la détection des fonctions redéfinies silencieusement (voir issues #65, #66)
2. Tester dans Chrome et Firefox
3. Tester sur mobile (responsive)
4. Vérifier la console (F12) : aucune erreur
5. Tester l'export/import des données

### Tests automatisés (Jest)
Le projet a une suite Jest minimale dans `tests/` (environnement jsdom, les
modules `src/*.iife.js` sont chargés tels quels — pas de modules ES/CommonJS
dans ce projet, voir `tests/helpers/loadApp.js`). `npm test` pour tout lancer.

Priorité pour ajouter des tests : les patterns critiques de `claude.md`
("Common Pitfalls") et tout bug réel corrigé — chaque bug corrigé devrait
laisser un test de non-régression derrière lui (voir
`tests/unit/clearDayData.test.js` et `tests/unit/matchCollectionPattern.test.js`
comme exemples). Ce n'est pas une suite exhaustive : la couverture est
volontairement ciblée sur ce qui a déjà cassé une fois.

### Fonctionnalités à tester
- [ ] Ajout/suppression de joueurs
- [ ] Génération de matchs
- [ ] Saisie des scores
- [ ] Classements
- [ ] Export/Import JSON
- [ ] Mode Chrono (si modifié)
- [ ] Mode Pool (si modifié)

## 🔄 Workflow de développement

### 1. Travailler sur une branche
`script.js` ne contient plus que le dark mode (37 lignes) — toute la
logique est dans `src/*.iife.js`, versionnée avec git. Pas besoin de backup
manuel par fichier : `git status`/`git diff` avant de committer suffit.

### 2. Modifier dans le bon module
Identifier le module concerné et y ajouter la fonctionnalité.

### 3. Exposer sur window
N'oubliez pas d'exposer la fonction :
```javascript
global.maNouvelleFonction = maNouvelleFonction;
```

### 4. Tester
```javascript
// Dans la console
console.log(typeof maNouvelleFonction); // "function"
maNouvelleFonction(); // Tester
```

### 5. Mettre à jour la documentation

**Cette étape n'est pas optionnelle.** C'est justement son absence pendant ~2,5 ans qui a
laissé toute la documentation du projet décrire un état du code qui n'existait plus (détail
dans `DEVLOG.md`, entrée du 2026-09-11). Avant de considérer une modif terminée :

1. Ajouter une entrée dans **`DEVLOG.md`** (date, résumé, fichiers touchés, commit) — voir
   le gabarit en tête de ce fichier.
2. Modifier `AGENTS.md` si vous :
   - Ajoutez une fonction exposée
   - Modifiez la structure des données
   - Changez le comportement existant
   - Ajoutez, renommez ou scindez un module dans `src/`
3. Modifier `CHANGELOG.md` si le changement est visible pour l'utilisateur final.
4. Cocher/mettre à jour `TODO.md` si une tâche listée est concernée.

Voir aussi la section "Protocole de fin de session" dans `CLAUDE.md`, qui détaille ce
protocole pour les sessions assistées par un agent.

## 🐛 Debug

### Console utile
```javascript
// Vérifier les données
console.log(championship);

// Vérifier une fonction
console.log(maFonction.toString());

// Localiser un élément
console.log(document.getElementById('matches-day-1'));
```

### Nettoyage
En cas de données corrompues :
```javascript
localStorage.clear();
location.reload();
```

## 🎯 Bonnes pratiques

### ✅ Faire
- ✅ Utiliser `'use strict';`
- ✅ Vérifier l'existence des éléments DOM avant manipulation
- ✅ Utiliser `var` (pas let/const pour la compatibilité)
- ✅ Commenter les fonctions complexes
- ✅ Gérer les erreurs avec try/catch pour localStorage
- ✅ Tester sur plusieurs navigateurs

### ❌ Ne pas faire
- ❌ Ajouter de la logique métier dans `script.js` (il ne contient que le dark mode ; utiliser les modules `src/`)
- ❌ Ajouter de nouvelles dépendances externes
- ❌ Utiliser ES6+ (arrow functions, classes, etc.)
- ❌ Oublier d'exposer les fonctions sur window
- ❌ Supprimer des fonctions sans vérifier les dépendances

## 📚 Ressources

- [AGENTS.md](./AGENTS.md) - Documentation technique complète
- [MDN JavaScript](https://developer.mozilla.org/fr/docs/Web/JavaScript) - Référence JS
- [Can I Use](https://caniuse.com/) - Compatibilité navigateurs

## 💡 Idées de contribution

Le suivi des tâches et idées se fait via les
[GitHub Issues](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues)
du repo plutôt que dans ce fichier (une liste statique ici dérive vite —
voir l'historique de `TODO.md`).

## 📞 Contact

Pour toute question sur le code, référez-vous à `AGENTS.md` ou ouvrez une issue.
