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
- Cliquez sur "🎯 Épreuve"
- Donnez un nom (ex: "50m nage libre", "10km") — ou **plusieurs, une par ligne** : collez la
  liste des épreuves pour toutes les créer d'un coup (une épreuve déjà existante n'est pas
  recréée)
- Ajoutez une date optionnelle

#### Séries automatiques (natation, athlétisme…)
- **« 🏁 Séries automatiques »** (ex « 🏊 Séries natation ») répartit les participants en
  séries par couloirs, triés au temps d'engagement (le plus rapide au centre). Une ligne par
  participant avec son épreuve et son temps : « Jean Dupont 50m libre 0:32.50 »,
  « Marie Leroy 200m 25.40 ».
- La fenêtre part de la **journée ouverte** : les séries sont créées dans cette journée, à
  partir de sa liste de participants. Si elle n'a pas de liste, celle d'une autre journée
  (par ex. une journée Matchs) est proposée, et c'est indiqué. Si elle n'a pas encore
  d'épreuve, un message demande d'en créer une (« 🎯 Épreuve ») : rien n'est généré ailleurs.
- La ligne est placée dans l'épreuve dont le nom contient la **distance** et, en natation, la
  **nage** (« 20m libre » / « 20m brasse »). Plusieurs épreuves à la même distance sans nage
  (athlétisme : « 100m » et « 100m haies », « 100m Benjamins » et « 100m Minimes ») sont
  départagées par les **mots de l'épreuve présents sur la ligne** (« Emma Roux 100m haies
  15.20 » → « 100m haies ») ; une ligne sans précision va dans l'épreuve sans précision
  (« 100m »). Si rien ne départage, la ligne n'est pas placée (utiliser « Épreuve par défaut »).
- **Relais** : « 4x400m », « 4 x 100 m », « 4×50m libre » sont reconnus (une ligne par
  équipe : « Team Alpha 4x400m 3:25.00 »). Un relais ne se confond jamais avec l'épreuve
  individuelle (« 400m ») ; « 4x400m » et « 4x400m mixte » sont départagés par « mixte ».
  La série porte la distance totale (4x400m → 1 600 m).
- Séries générées en mode couloirs, marquées **natation** si l'épreuve ou ses lignes donnent
  une nage, sinon **course** (athlétisme). Classement **par épreuve** dans les deux cas, titré
  « Résultats natation par épreuve » seulement si tout est de la natation, sinon
  « Résultats par épreuve ».
- **Points et classement des clubs** : chaque tableau d'épreuve a une colonne **Points**
  (barème 25-19-17-15-12-10-8-6-4-2). Un club ne marque qu'**une fois par épreuve**, avec
  son meilleur classé, et les clubs sont reclassés entre eux (1er et 2e du club A, 3e du
  club B → A 25, B 19 ; « – » pour le 2e nageur de A). Nageurs sans club : classés, sans
  points. En tête, le tableau **« 🏆 Classement des clubs (toutes épreuves) »** : Rang ·
  Club · une colonne par épreuve (points gagnés, « – » si absent) · Total ; à total égal,
  le plus de 25 points passe devant.
- **Épreuves fun** : cochez **« 🎉 Épreuve fun »** à la création de l'épreuve ou dans ✏️
  Modifier l'épreuve. Ses résultats restent affichés (badge « 🎉 Fun »), mais elle n'a pas
  de colonne « Points » et ne compte pas dans le classement des clubs.

#### Créer des séries configurables
- Chaque série appartient à une épreuve : cliquez sur **« ➕ Série »** dans l'en-tête de
  l'épreuve (il n'y a plus de bouton « Série » dans la barre d'actions : une série créée
  sans épreuve n'était ni imprimée ni classée par épreuve)
- La fenêtre est **pré-remplie** à partir de la dernière série de l'épreuve (ou de son nom :
  « 100m Brasse » → Natation, 100 m, mode couloirs) et propose le nom « Série N+1 » : pratique
  pour **ajouter une série natation sur place** sans relancer « 🏁 Séries automatiques »
- 🗑️ sur une série la supprime (refusé pendant sa course) ; une ancienne série
  « indépendante » se rattache à une épreuve via « 📎 Rattacher à une épreuve… »
- « 🏁 Séries automatiques » **remplace** toutes les séries des épreuves (y compris celles déjà
  nagées) : la fenêtre l'annonce, et une confirmation est demandée si des séries existent
- Configurez les options :
  - **Nom** : ex: "Série 1", "Finale A"
  - **Sport** : 🏃 Course à pied, 🚴 Cyclisme, 🏊 Natation
  - **Type** : Individuelle, Relais (durée limitée), Interclub
  - **Distance** : Distance par tour en mètres
  - **Mode couloirs** : Pour natation avec arrêt par touche 1-9

#### Gérer les participants
- Après « 🏁 Séries automatiques », « 👥 Participants disponibles » a **une fiche par
  inscription** (nom, club) : la ligne brute est découpée, et gardée en info-bulle sur le nom.
  Sur la même ligne, à droite : « 🎯 50m brasse · ⏱ 1m02,00s · Série 1, couloir 3 »
  (épreuve, temps d'engagement, série et couloir actuels). Les lignes **non placées**
  (non comprises, ou sans épreuve correspondante) sont en tête, avec « ⚠️ non placée ».
- La liste **s'agrandit à la souris** : tirer le coin en bas à droite. La hauteur est gardée.
- Depuis « 👥 Participants disponibles » : le **« + »** d'un participant (ou « ➕ Ajouter à une
  série » pour les cochés) propose toutes les séries, **y compris celles générées par
  « 🏁 Séries automatiques »**, groupées par épreuve, avec le couloir que prendra le nageur. Un
  nageur déjà dans une autre série de la même épreuve y est **déplacé** (après confirmation ;
  impossible s'il y a déjà nagé). Son dossard reste unique dans la série.
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

**Méthode 2 : Saisie manuelle** (bouton ⏱️ d'une série)
- En mode couloirs, colonne **Couloir** et lignes **dans l'ordre du bassin**, comme la feuille
  « 🖨️ Imprimer séries » : on recopie la feuille ligne par ligne (Entrée = ligne suivante)
- Dans chaque champ : un temps (`1:02.35`, `62.35`, `62,35`, `1'02"35`, `1:02:35` pour les
  heures), ou **`DNS`** / **`DISQ`** (`DSQ`, `DQ` acceptés) ; un champ vidé retire le temps
- Une saisie illisible est signalée en rouge et rien n'est enregistré tant qu'elle n'est pas
  corrigée
- Un temps saisi compte comme une arrivée au chrono (feuille imprimée, classements) ; la
  série passe « terminée » quand tout le monde a un temps (ou DNS/DISQ). Refusé pendant que
  la course de cette série tourne

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
