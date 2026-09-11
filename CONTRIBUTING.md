# 🤝 Guide de Contribution

Merci de contribuer à ce projet ! Voici les bonnes pratiques à suivre.

## 🏗️ Architecture du code

### Modules IIFE

Tout le code doit être organisé en modules IIFE (Immediately Invoked Function Expression)
dans le dossier `src/`. Le projet compte aujourd'hui 16 modules (config, utils,
notifications, state, clubs, players, ui, init, matches, pools, chrono, multisport, ranking,
export, export-json, export-print) — voir `AGENTS.md` pour le rôle de chacun. `script.js`
n'est qu'un résidu legacy (~37 lignes), la migration est terminée : ne pas y écrire de code.

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
1. Tester dans Chrome et Firefox
2. Tester sur mobile (responsive)
3. Vérifier la console (F12) : aucune erreur
4. Tester l'export/import des données

### Fonctionnalités à tester
- [ ] Ajout/suppression de joueurs
- [ ] Génération de matchs
- [ ] Saisie des scores
- [ ] Classements
- [ ] Export/Import JSON
- [ ] Mode Chrono (si modifié)
- [ ] Mode Pool (si modifié)

## 🔄 Workflow de développement

### 1. Créer une backup
```bash
cp script.js script.js.backup.$(date +%Y%m%d)
```

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
- ❌ Modifier directement `script.js` (utiliser les modules)
- ❌ Ajouter de nouvelles dépendances externes
- ❌ Utiliser ES6+ (arrow functions, classes, etc.)
- ❌ Oublier d'exposer les fonctions sur window
- ❌ Supprimer des fonctions sans vérifier les dépendances

## 📚 Ressources

- [AGENTS.md](./AGENTS.md) - Documentation technique complète
- [MDN JavaScript](https://developer.mozilla.org/fr/docs/Web/JavaScript) - Référence JS
- [Can I Use](https://caniuse.com/) - Compatibilité navigateurs

## 💡 Idées de contribution

### Priorité haute
- [ ] Migrer les fonctions restantes de `script.js` vers les modules
- [ ] Ajouter des validations de formulaires
- [ ] Améliorer l'accessibilité (ARIA labels)

### Priorité moyenne
- [ ] Ajouter des animations de transition
- [ ] Optimiser les performances (gros classements)
- [ ] Internationalisation (i18n)

### Priorité basse
- [ ] Tests unitaires avec Jest
- [ ] Migration vers TypeScript
- [ ] PWA (Progressive Web App)

## 📞 Contact

Pour toute question sur le code, référez-vous à `AGENTS.md` ou ouvrez une issue.
