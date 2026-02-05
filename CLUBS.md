# 🏢 Gestion des Clubs - Documentation

## Vue d'ensemble

La gestion des clubs permet d'associer chaque joueur à un club dans le mode **Championship**. Cela permet de :
- Identifier facilement l'appartenance club des joueurs
- Filtrer et organiser les classements par club
- Gérer des compétitions interclubs

## Structure des données

### Format du joueur

Avant :
```javascript
// Ancien format (string)
players[division] = ["Dupont Marcel", "Martin Sophie"]
```

Après :
```javascript
// Nouveau format (objet avec club)
players[division] = [
    { name: "Dupont Marcel", club: "TTC Paris" },
    { name: "Martin Sophie", club: "TT Club Lyon" }
]
```

### Migration automatique

Les données existantes sont automatiquement migrées au chargement de l'application. Les joueurs sans club auront le champ `club` vide (`""`).

## Interface utilisateur

### Ajout d'un joueur avec club

1. Cliquez sur le bouton **➕ Joueurs**
2. Dans le modal, remplissez :
   - **Nom** : Nom du joueur
   - **Club** : Sélectionnez un club existant ou choisissez "+ Ajouter un nouveau club..."
   - **Division** : Choisissez la division
3. Cliquez sur **Ajouter**

### Gestion des clubs

Dans le modal d'ajout de joueurs :
1. Cliquez sur le bouton **🏢 Gérer les clubs**
2. Dans le modal de gestion :
   - **Ajouter** : Entrez le nom du nouveau club et cliquez sur "+ Ajouter"
   - **Supprimer** : Cliquez sur 🗑️ à côté d'un club existant
   - **Note** : La suppression d'un club ne supprime pas les joueurs déjà assignés à ce club

### Import en masse avec club

Lors de l'ajout de plusieurs joueurs via le mode "Ajouter plusieurs joueurs" :
1. Sélectionnez un club dans la liste déroulante (optionnel)
2. Collez la liste des noms
3. Tous les joueurs importés seront assignés à ce club

## Affichage des clubs

### Liste des joueurs

Les joueurs affichent leur club sous forme de badge coloré à côté de leur nom :
```
Dupont Marcel [TTC Paris] ✏️ 🗑️
```

### Classements

Tous les classements affichent une colonne **Club** :
- Classement par journée
- Classement général
- Classement multisport

Les clubs sont affichés sous forme de badges colorés.

## API du module Clubs

Le module `clubs.iife.js` expose les fonctions suivantes via `window.clubsModule` :

### `getClubsList()`
Retourne la liste des clubs disponibles.
```javascript
var clubs = clubsModule.getClubsList();
// Retourne : ['TTC Paris', 'TT Club Lyon', ...]
```

### `addClub(clubName)`
Ajoute un nouveau club à la liste.
```javascript
var success = clubsModule.addClub('New Club');
// Retourne : true si ajouté, false si existe déjà
```

### `removeClub(clubName)`
Supprime un club de la liste.
```javascript
var success = clubsModule.removeClub('Old Club');
```

### `getPlayerName(player)`
Extrait le nom d'un joueur (supporte ancien et nouveau format).
```javascript
var name = clubsModule.getPlayerName({ name: "Dupont", club: "Paris" });
// Retourne : "Dupont"
```

### `getPlayerClub(player)`
Extrait le club d'un joueur.
```javascript
var club = clubsModule.getPlayerClub({ name: "Dupont", club: "Paris" });
// Retourne : "Paris"
```

### `getPlayerFullDisplay(player)`
Retourne l'affichage complet avec le badge du club.

### `playerExists(dayNumber, division, playerName)`
Vérifie si un joueur existe dans une division.

### `getClubsStats(dayNumber)`
Retourne les statistiques par club pour une journée.

## Stockage

Les clubs personnalisés sont stockés dans le `localStorage` sous la clé `customClubsList`. La liste par défaut est utilisée si aucun club personnalisé n'existe.

## Compatibilité

- **Anciennes données** : Migrées automatiquement (joueurs sans club)
- **Export/Import** : Le format JSON inclut maintenant les clubs
- **Mode Chrono** : Les clubs sont aussi supportés dans les participants chrono

## Conseils d'utilisation

1. **Créez vos clubs d'abord** : Avant d'ajouter des joueurs, créez la liste des clubs via "🏢 Gérer les clubs"
2. **Noms cohérents** : Utilisez toujours le même nom de club (respectez la casse)
3. **Import en masse** : Utilisez la fonction d'import en masse pour rapidement ajouter tous les joueurs d'un même club
4. **Vérification** : Les classements affichent automatiquement les clubs - vérifiez que tout est correct

## Dépannage

### Le club n'apparaît pas dans le classement
- Vérifiez que le joueur a bien été ajouté avec un club
- Rafraîchissez le classement avec le bouton "🔄 Mettre à jour"

### Impossible de supprimer un club
- Un club ne peut pas être supprimé s'il est utilisé par des joueurs
- Modifiez d'abord les joueurs pour leur assigner un autre club

### Les clubs ne s'affichent pas après import
- Les données importées doivent utiliser le nouveau format avec `{name, club}`
- Les anciennes données (noms simples) sont migrées sans club
