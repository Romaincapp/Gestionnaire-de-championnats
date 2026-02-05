# 🏆 Mode Multisport - Documentation

## Vue d'ensemble

Le mode **Multisport** permet de gérer un challenge qui combine :
- 🎾 **Championship** : Journées avec matchs et scores (tennis de table, badminton, etc.)
- ⏱️ **Chrono** : Journées avec courses et chronométrage (natation, course à pied)
- 🏅 **Classement combiné** : Un seul classement qui agrège automatiquement tous les résultats

## Comment ça marche

### 1. Configuration intelligente des journées

Chaque journée peut être configurée indépendamment directement depuis son onglet :

1. Allez dans l'onglet de la journée souhaitée
2. En haut de la page, vous verrez un **sélecteur compact de type** :
   - 🏆 **Matchs** : Mode championship classique avec scores
   - ⏱️ **Courses** : Mode chronométrage

3. Le changement est immédiat et la page se recharge pour afficher l'interface adaptée

> 💡 **Smart** : L'application détecte automatiquement si vous avez un mix de types (ex: J1 en Matchs + J2 en Courses) et affiche alors automatiquement l'onglet **🏅 Multisport**.

### 2. Mode Championship (🏆 Matchs)

Ce mode fonctionne comme le système classique :
- Ajoutez des joueurs par division
- Générez des matchs (round-robin ou système suisse)
- Saisissez les scores
- 3 points par victoire

### 3. Mode Chrono (⏱️ Courses)

En mode courses, vous pouvez :

#### Créer des épreuves
- Cliquez sur "🎯 Nouvelle Épreuve"
- Donnez un nom (ex: "50m nage libre", "10km")
- Ajoutez une date optionnelle

#### Créer des séries configurables
- Par épreuve ou indépendantes
- Cliquez sur "🏃 Nouvelle Série"
- Configurez les options :
  - **Nom** : ex: "Série 1", "Finale A"
  - **Sport** : 🏃 Course à pied, 🚴 Cyclisme, 🏊 Natation
  - **Type** : Individuelle, Relais (durée limitée), Interclub
  - **Distance** : Distance par tour en mètres
  - **Mode couloirs** : Pour natation avec arrêt par touche 1-9

#### Gérer les participants
- Par série, cliquez sur "👥 Participants"
- Ajoutez les noms, numéros de dossard, clubs et catégories
- **Mode couloirs** : Assignez un numéro de couloir (1-9) pour la natation
- Les participants peuvent être importés depuis d'autres journées

#### Saisir les résultats (2 méthodes)

**Méthode 1 : Chronométrage Live (recommandé)**
- Cliquez sur "▶️ Course" pour lancer l'interface de chronométrage en direct
- Interface avec grand chrono digital et boutons par participant
- **Démarrer** : Lance le chrono
- **Pause** : Met en pause (peut reprendre)
- **🏁 Tour** : Enregistre le temps d'un participant
- Les temps sont sauvegardés automatiquement
- **🏁 Fin** : Termine la course et retourne à la liste

**Méthode 2 : Saisie manuelle**
- Cliquez sur "⏱️ Résultats"
- Entrez les temps au format `mm:ss.ms` ou secondes
- Exemples: `1:23.45`, `45.5`, `2:30`

#### Interface de Course Live Complète

L'interface de chronométrage en direct offre :

**Contrôles principaux :**
- **Grand affichage digital** : Chrono central visible de loin (48px)
- **Démarrer/Pause/Reprendre** : Contrôle total du chronométrage
- **🏁 Terminer** : Fin de course et sauvegarde des résultats

**Gestion des participants :**
- Tableau complet avec : Dossard, Nom, Club, Tours, Distance, Temps, Meilleur tour, Statut
- **Actions par participant** :
  - **LAP** : Enregistre un tour
  - **FIN** : Marque comme terminé
  - **DNS** : Non partant (Did Not Start)
  - **✏️** : Éditer le temps manuellement
  - **🔄** : Relancer un participant

**Mode Couloirs (Natation) :**
- Interface visuelle avec les couloirs 1-9
- **Arrêt par touche** : Appuyez sur 1-9 du clavier pour arrêter le chrono
- **Ou clic** : Cliquez directement sur le couloir
- Couleur verte = arrivé, rouge = en course

**Saisie Rapide par Dossard :**
- Champ de saisie rapide avec le clavier
- **Dossard + Enter** = FINISH
- **L + Dossard + Enter** = LAP (tour)
- **Mode Relais** : Détection automatique LAP/FINISH selon le temps écoulé

**Classement Live :**
- Affichage en temps réel avec médailles 🥇🥈🥉
- Stats : participants, terminés, distance totale, tours totaux
- Tri automatique par temps/distance

**Statuts des participants :**
- ⏸️ **Prêt** : En attente du départ
- ▶️ **En course** : Parti mais pas arrivé
- 🏁 **Terminé** : Arrivé, temps final enregistré
- 🚫 **DNS** : Did Not Start (non partant)

#### Système de points Chrono

| Position | Points |
|----------|--------|
| 1ère | 20 pts |
| 2ème | 17 pts |
| 3ème | 15 pts |
| 4ème | 13 pts |
| 5ème | 11 pts |
| 6ème | 10 pts |
| 7ème | 9 pts |
| 8ème | 8 pts |
| 9ème | 7 pts |
| 10ème | 6 pts |
| 11ème | 5 pts |
| 12ème | 4 pts |
| 13ème | 3 pts |
| 14ème | 2 pts |
| 15ème | 1 pt |
| 16ème+ | 1 pt (participation) |

### 4. Classement Multisport (Automatique)

Quand l'application détecte un mix de types de journées :

1. L'onglet **🏅 Multisport** apparaît automatiquement dans les onglets
2. Le bouton **🏆 Classement** redirige intelligemment vers le classement multisport
3. Le classement affiche :
   - Points **Matchs** (victoires = 3 pts)
   - Points **Courses** (selon le tableau ci-dessus)
   - **Total** combiné

Fonctionnalités disponibles :
- 🔄 **Mettre à jour** : Recalcule le classement
- 📺 **Afficher** : Ouvre dans une nouvelle fenêtre pour projection
- 📊 **Exporter JSON** : Exporte les données complètes

## Structure des données

```javascript
championship.days[dayNumber] = {
    dayType: 'championship' | 'chrono',  // Type de la journée
    players: { ... },                     // Joueurs (mode matchs)
    matches: { ... },                     // Matchs (mode matchs)
    pools: { ... },                       // Poules (mode matchs, optionnel)
    chronoData: {                         // Données courses (mode chrono)
        events: [...],
        series: [...],
        participants: [...]
    }
}
```

## Exemple d'utilisation

### Scénario: Challenge Interclub Multisport

| Journée | Type | Activité | Mode |
|---------|------|----------|------|
| J1 | 🏆 Matchs | Tennis de table | Championship |
| J2 | ⏱️ Courses | Natation 50m | Chrono |
| J3 | ⏱️ Courses | Course à pied 10km | Chrono |
| J4 | 🏆 Matchs | Badminton | Championship |

**Résultat** :
- L'onglet "🏅 Multisport" apparaît automatiquement
- Le classement combine les points des 4 journées
- Les joueurs sont classés par total de points

## Migration depuis une version antérieure

Les journées existantes sans type défini sont automatiquement migrées en mode **🏆 Matchs** au premier chargement.

## Conseils d'utilisation

1. **Planifiez vos journées** : Définissez le type de chaque journée avant de commencer la saisie
2. **Homogénéité des noms** : Utilisez exactement les mêmes noms de joueurs entre les journées pour un classement correct
3. **Détection automatique** : L'onglet multisport n'apparaît que quand c'est pertinent (mix de types)
4. **Flexibilité** : Vous pouvez changer le type d'une journée à tout moment (les données sont conservées)

## Dépannage

### L'onglet Multisport n'apparaît pas
- Vérifiez que vous avez au moins une journée en mode "🏆 Matchs" ET une en mode "⏱️ Courses"
- L'onglet n'apparaît que s'il y a un véritable mix de types

### Le classement est vide
- Vérifiez que vous avez des résultats dans au moins une journée
- Vérifiez que les noms des participants sont identiques entre les journées

### Changement de type non pris en compte
- La page se recharge après chaque changement de type
- Si l'interface ne change pas, vérifiez dans la console du navigateur (F12)

## Différences avec l'ancien système

| Avant | Après |
|-------|-------|
| Checkbox "Mode Chrono" globale | Sélecteur par journée |
| Mode exclusif (un ou l'autre) | Mode hybride (les deux simultanément) |
| Onglet Multisport toujours visible | Onglet Multisport conditionnel (smart) |
| Classements séparés | Classement unifié automatique |
