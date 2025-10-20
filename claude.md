# Notes Claude - Gestionnaire de Championnats

## Date: 2025-10-20

### Contexte
Fichier de travail pour planifier et documenter les modifications sans risquer de casser le code existant.

---

## État actuel du projet

### Structure découverte
- **Fichiers principaux** :
  - [index.html](index.html) - Interface utilisateur
  - [script.js](script.js) - Logique JavaScript
  - [styles.css](styles.css) - Styles CSS

### Fonctionnalités existantes

#### Mode Classique (Tournoi)
- Gestion de plusieurs journées
- Divisions multiples (1-6 divisions configurables)
- Terrains configurables (1-10 terrains)
- Gestion des joueurs (ajout individuel, import Excel/CSV, copier-coller en masse)
- Génération de matchs (Round-Robin, Optimisé 4-10, Par Terrain, Swiss System)
- Système de BYE
- Classements (par points, par % victoires)
- Export/Import championnat complet
- Statistiques détaillées par joueur
- Export PDF/HTML/JSON du classement général

#### Mode Chrono (Course)
- Gestion d'épreuves multiples (course, vélo, natation)
- Création de séries par épreuve
- Gestion des participants (avec dossards, catégories)
- Types de course : individuelle ou relais
- Chronométrage avec tours
- Classement général chrono
- Export/Import compétition chrono

---

## Fonctions à faire évoluer

### Questions pour l'utilisateur :
1. **Quelles fonctionnalités voulez-vous améliorer en priorité ?**
   - Mode classique (tournoi) ?
   - Mode chrono (course) ?
   - Les deux ?

2. **Quels sont les points d'amélioration souhaités ?**
   - Performance/optimisation ?
   - Nouvelles fonctionnalités ?
   - Amélioration de l'UX ?
   - Export/Import amélioré ?
   - Calculs de classement ?
   - Autre ?

3. **Y a-t-il des comportements à modifier ?**
   - Génération des matchs ?
   - Système de points ?
   - Affichage des résultats ?

---

## Prochaines étapes
(À définir selon vos réponses)

---

## TÂCHE EN COURS: Éditer les séries terminées sans perdre les chronos

### Problème identifié
Actuellement, lors de l'édition d'une série dans la fonction `saveSerie()` [script.js:8072-8103](script.js#L8072-L8103), le code crée un nouvel objet `serieData` et remplace complètement la série existante (ligne 8085).

Cela écrase toutes les données chronométrées :
- `status` (running/completed)
- `startTime`
- `currentTime`
- `participants[].time` (temps finaux)
- `participants[].laps[]` (tours enregistrés)
- `participants[].totalDistance`
- `participants[].status`

### Structure des données (découverte)
```javascript
serie = {
    id: number,
    name: string,
    eventId: number,
    sportType: string,
    distance: number,
    raceType: string,
    relayDuration: number,
    participants: [
        {
            bib: string,
            name: string,
            category: string,
            status: 'ready'|'running'|'finished',
            time: number,           // Temps total en ms
            laps: [],               // Historique des tours
            totalDistance: number,  // Distance totale parcourue
            lastLapStartTime: number
        }
    ],
    status: 'pending'|'running'|'completed',
    startTime: number,
    isRunning: boolean,
    timerInterval: any,
    currentTime: number
}
```

### Solution proposée
1. Détecter si c'est une édition d'une série existante avec chronos
2. Préserver les données chronométrées des participants existants
3. Pour les nouveaux participants ajoutés : les initialiser correctement
4. Pour les participants retirés : conserver leur historique dans une archive ou simplement les supprimer
5. Ne pas écraser `status`, `startTime`, `currentTime`, `isRunning`, etc.

### Approche d'implémentation
- Modifier la fonction `saveSerie()` dans [script.js:8030-8103](script.js#L8030-L8103)
- Créer une fonction helper `mergeSerieData(oldSerie, newSerieData)` qui :
  - Conserve les données de timing de l'ancienne série
  - Met à jour seulement le nom et la liste des participants
  - Préserve les chronos des participants qui restent dans la série

---

## ✅ IMPLÉMENTATION TERMINÉE

### Modifications apportées

#### 1. Fonction `mergeSerieData()` ajoutée [script.js:8057-8071](script.js#L8057-L8071)
```javascript
function mergeSerieData(oldSerie, newData) {
    // Si la série a déjà des données chronométrées (running ou completed), les préserver
    if (oldSerie && (oldSerie.status === 'running' || oldSerie.status === 'completed')) {
        return {
            ...oldSerie,  // Conserver toutes les données existantes
            name: newData.name,  // Mettre à jour le nom
            participants: newData.participants,  // Mettre à jour les participants (déjà fusionnés)
            eventId: newData.eventId,  // Mettre à jour l'épreuve parente si changée
        };
    }
    return { ...newData };
}
```

#### 2. Fonction `saveSerie()` modifiée [script.js:8088-8119](script.js#L8088-L8119)
- Utilise maintenant `mergeSerieData()` pour fusionner intelligemment les données
- Préserve : `status`, `startTime`, `isRunning`, `currentTime`, `timerInterval`
- Met à jour : `name`, `participants`, `eventId`
- Notification mise à jour : "Série modifiée avec succès (chronos préservés)"

#### 3. Messages d'avertissement améliorés [script.js:8145-8156](script.js#L8145-L8156)
- **Série terminée** : Informe que les chronos sont préservés
- **Série en cours** : Avertit que les chronos sont préservés mais attention aux modifications

### Comportement final
✅ **Édition d'une série terminée/en cours :**
- Les temps chronométrés sont PRÉSERVÉS
- Les participants conservés gardent tous leurs chronos (time, laps, totalDistance, status)
- Les nouveaux participants ajoutés sont initialisés avec des chronos vides
- Les participants retirés perdent simplement leur place dans la série (leurs données ne sont plus affichées)

✅ **Édition d'une série en attente (pending) :**
- Comportement normal, toutes les données peuvent être changées librement

---

## 🎯 TÂCHE EN COURS : Classement Général Chrono Intelligent

### Objectif
Créer un système intelligent qui propose différents types de classement selon les épreuves disponibles.

### Types de classement à proposer

1. **Par Sport** (Running, Vélo, Natation, Multisport)
   - Classement séparé pour chaque discipline

2. **Par Type** (Individuel vs Relais)
   - Classements séparés pour les épreuves individuelles et relais

3. **Par Distance** (Meilleur temps sur une distance fixe)
   - Ex: Tous les 400m ensemble

4. **Par Temps** (Distance maximale en temps fixe)
   - Ex: Relais 1h - qui a fait le plus de distance

5. **Multi-épreuves regroupées** (Même participants, plusieurs épreuves)
   - Détection automatique des challenges multi-épreuves
   - Somme des performances

6. **Classement Global** (Tout confondu)
   - Classement actuel par distance totale

### Plan d'implémentation

1. **Créer un modal de sélection du type de classement**
   - Analyse automatique des épreuves disponibles
   - Proposition des types de classement pertinents
   - Sélection simple par boutons

2. **Algorithmes de détection**
   - Détecter les sports utilisés
   - Détecter les types (individuel/relais)
   - Détecter les distances communes
   - Détecter les participants qui font plusieurs épreuves (challenge)

3. **Génération des classements**
   - Fonction pour chaque type de classement
   - Affichage adapté selon le type choisi

---

## ✅ IMPLÉMENTATION TERMINÉE - Classement Chrono Intelligent

### Modifications apportées

#### 1. Modal de sélection ajouté dans [index.html:643-660](index.html#L643-L660)
- Modal `chronoRankingTypeModal` avec conteneur dynamique
- Design moderne et responsive
- Options générées dynamiquement selon les épreuves

#### 2. Fonction d'analyse intelligente [script.js:9185-9272](script.js#L9185-L9272)
```javascript
function analyzeCompletedEvents()
```
Détecte automatiquement :
- Les sports utilisés (course, vélo, natation, multisport)
- Les types d'épreuves (individuel vs relais)
- Les distances communes (pour classements par distance)
- Les participants multi-épreuves
- Les catégories disponibles

#### 3. Modal dynamique [script.js:9060-9148](script.js#L9060-L9148)
```javascript
function showChronoRankingTypeModal()
```
Propose uniquement les classements pertinents :
- 🌍 **Classement Global** : toujours disponible
- 🏃🚴🏊 **Par Sport** : si plusieurs sports
- 👤👥 **Par Type** : si individuel ET relais
- 🎯 **Multi-Épreuves** : si participants avec plusieurs épreuves
- 📏 **Par Distance** : si plusieurs séries avec même distance
- 📋 **Par Catégorie** : si plusieurs catégories

#### 4. Fonctions de classement spécialisées [script.js:9308-9776](script.js#L9308-L9776)

**Classements implémentés :**

1. **Par Sport** (`generateRankingBySport`)
   - Filtre par type de sport (running, cycling, swimming, multisport)
   - Cumule les performances du même sport

2. **Par Type** (`generateRankingByType`)
   - Individuel : classement des épreuves individuelles
   - Relais : classement des épreuves en relais

3. **Multi-Épreuves** (`generateMultiEventsRanking`)
   - Ne garde que les participants ayant fait plusieurs épreuves
   - Cumule toutes leurs performances
   - Parfait pour les challenges multi-disciplines

4. **Par Distance** (`generateRankingByDistance`)
   - Classement par meilleur temps sur une distance fixe
   - Ex: Tous les 400m ensemble, classés par temps

5. **Par Catégorie** (`generateRankingByCategory`)
   - Classements séparés pour chaque catégorie
   - Affichage en sections distinctes

6. **Global** (`generateOverallChronoRanking`)
   - Classement original conservé
   - Tous participants, toutes épreuves confondues

#### 5. Affichages spécialisés
- `displayRanking()` : affichage standard avec distance/temps
- `displayRankingByTime()` : affichage optimisé pour classements par temps
- `displayRankingByCategories()` : affichage multi-sections
- `displayEmptyRanking()` : gestion des classements vides

### Fonctionnement

1. **Clic sur "🏆 Classement Général"**
2. **Analyse automatique** des épreuves terminées
3. **Modal s'ouvre** avec uniquement les types de classement pertinents
4. **Sélection intuitive** par clic sur une carte colorée
5. **Génération du classement** adapté au type choisi
6. **Bouton retour** pour changer de type de classement

### Avantages
✅ Interface simple et intuitive
✅ Détection automatique intelligente
✅ Propose uniquement ce qui est pertinent
✅ Gestion des cas multi-épreuves (challenges)
✅ Support complet : course, vélo, natation, multisport
✅ Classements par catégorie, distance, type, sport
✅ Design moderne avec hover effects

### Corrections post-implémentation

#### Problème 1 : Modal se fermait sans afficher le classement
**Cause :** La fonction `generateOverallChronoRanking()` existante ne utilisait pas les nouvelles fonctions d'affichage et renvoyait tout le HTML inline.

**Solution :** [script.js:9853-9854](script.js#L9853-L9854)
- Refactorisé pour utiliser `displayRanking()`
- Simplifie l'affichage du classement global

#### Problème 2 : Bouton "Retour" rouvrait le modal au lieu de retourner aux séries
**Cause :** Les boutons appelaient `showOverallChronoRanking()` qui ouvre le modal.

**Solution :** [script.js:9540-9551](script.js#L9540-L9551)
- Créé fonction `hideChronoRanking()` pour retourner à la liste des épreuves
- Ajouté deux boutons : "⬅️ Retour aux séries" ET "🔄 Changer de type"
- Meilleure UX avec choix clair

#### Problème 3 : Séparation mode chrono vs championnat normal
**Vérification :** ✅ Les deux modes sont bien séparés
- Mode championnat : `GeneralRanking`, `updateGeneralRanking()`, etc.
- Mode chrono : `ChronoRanking`, `showOverallChronoRanking()`, etc.
- Aucun conflit entre les deux systèmes

### État final
✅ Modal fonctionne correctement
✅ Classements s'affichent après sélection
✅ Navigation intuitive (retour / changer de type)
✅ Pas de mélange entre mode chrono et championnat normal

---

## 🔧 Correction : Bouton Réinitialiser TOUT

### Problème identifié
Le bouton "🗑️ Réinitialiser TOUT" ne vidait pas les données du mode chrono stockées dans le localStorage.

### Solution implémentée [script.js:3492-3635](script.js#L3492-L3635)

**Modifications :**

1. **Nettoyage localStorage étendu** (ligne 3525)
   - Supprime maintenant `chronoRaceData` en plus de `tennisTableChampionship`
   - Recherche élargie : mots-clés `chrono` et `race` inclus

2. **Réinitialisation mémoire du mode chrono** (lignes 3520-3547)
   ```javascript
   if (typeof raceData !== 'undefined') {
       raceData.events = [];
       raceData.participants = [];
       raceData.nextEventId = 1;
       raceData.nextSerieId = 1;
       raceData.nextParticipantId = 1;
       // + réinitialisation affichage DOM
   }
   ```

3. **Message de confirmation amélioré** (lignes 3495-3517)
   - Affiche séparément les données du championnat et du mode chrono
   - Format :
     ```
     🏓 MODE CHAMPIONNAT :
     • X journée(s)
     • Y joueur(s)

     🏃 MODE CHRONO :
     • X épreuve(s)
     • Y participant(s)
     ```

4. **Message de succès mis à jour**
   - "Tout réinitialisé : Championnat + Mode Chrono - Cache vidé !"

### Résultat
✅ Le bouton "Réinitialiser TOUT" vide maintenant complètement les deux modes
✅ L'utilisateur voit clairement ce qui sera supprimé dans chaque mode
✅ Option de rechargement de page pour remise à zéro totale

---

## 🔧 Correction : Affichage du classement chrono côté utilisateur

### Problème identifié
Le classement général chrono ne s'affichait pas côté utilisateur après sélection du type. Le classement semblait se générer "derrière" la journée 1.

### Cause
Dans la fonction `selectRankingType()` [script.js:9328-9360](script.js#L9328-L9360) :
- Tentative d'accéder à `seriesList` qui n'existe pas (devrait être `eventsList`)
- Mauvaise manipulation du DOM : `seriesList.parentElement` provoquait une erreur
- Le classement se générait mais restait caché derrière la liste des épreuves

### Solution

**1. Correction de `selectRankingType()` (lignes 9331-9341)**
```javascript
const eventsList = document.getElementById('eventsList');

// Masquer la liste des épreuves et afficher le classement
if (eventsList && eventsList.parentElement) {
    eventsList.parentElement.style.display = 'none';  // Cache le conteneur blanc des épreuves
}

if (rankingSection) {
    rankingSection.style.display = 'block';  // Affiche le classement
}
```

**2. Correction de `hideChronoRanking()` (lignes 9595-9608)**
```javascript
// Masquer le classement
if (rankingSection) {
    rankingSection.style.display = 'none';
}

// Afficher la liste des épreuves
if (eventsList && eventsList.parentElement) {
    eventsList.parentElement.style.display = 'block';
}
```

### Structure HTML clarifiée
```
chronoModeSection (display: none par défaut)
├── Gestion des épreuves (conteneur blanc)
│   ├── Boutons (dont "🏆 Classement Général")
│   ├── eventsList
│   └── noEventsMessage
├── overallChronoRanking (display: none)
└── raceInterface (display: none)
```

### Résultat
✅ Le classement s'affiche maintenant correctement côté utilisateur
✅ Navigation fluide entre liste des épreuves et classement
✅ Les deux sections ne se superposent plus
✅ Le mode chrono reste bien séparé du mode championnat

---

## 📄 Ajout : Export PDF natif pour les classements chrono

### Implémentation simple et efficace

**Fonction créée** : `exportChronoRankingToPDF()` [script.js:9914-10133](script.js#L9914-L10133)

#### Fonctionnement

1. **Stockage des données du dernier classement**
   - Variable globale `lastChronoRankingData` [script.js:9786-9791](script.js#L9786-L9791)
   - Mise à jour automatique par toutes les fonctions d'affichage :
     - `displayRanking()` → classements standard
     - `displayRankingByTime()` → classements par distance
     - `displayRankingByCategories()` → classements par catégorie

2. **Génération HTML adaptative**
   - Détecte le type de classement (`global`, `distance`, `category`, etc.)
   - Génère les en-têtes de tableau appropriés
   - Adapte les colonnes selon le type :
     - **Standard** : Pos, Participant, Dossard, Catégorie, Séries, Distance, Temps
     - **Distance** : Pos, Participant, Dossard, Catégorie, Épreuve, Temps
     - **Catégorie** : Sections séparées par catégorie

3. **Style cohérent avec le championnat**
   - Même design que `exportGeneralRankingToPDF()`
   - Header violet avec dégradé
   - Médailles pour le top 3 (🥇🥈🥉)
   - Optimisé pour l'impression

4. **Bouton ajouté dans tous les classements**
   - `📄 Export PDF` présent dans :
     - Classements standard [script.js:9653-9655](script.js#L9653-L9655)
     - Classements par temps [script.js:9745-9747](script.js#L9745-L9747)
     - Classements par catégorie [script.js:9840-9842](script.js#L9840-L9842)

### Workflow utilisateur

1. Affiche un classement (n'importe quel type)
2. Clique sur "📄 Export PDF"
3. Nouvelle fenêtre s'ouvre avec le classement stylé
4. Dialogue propose d'ouvrir Ctrl+P pour imprimer/sauvegarder en PDF
5. L'utilisateur choisit "Enregistrer au format PDF"

### Avantages
✅ Simple et rapide
✅ Fonctionne pour tous les types de classement
✅ Design cohérent avec le reste de l'application
✅ Aucune dépendance externe
✅ Optimisé pour l'impression (@media print)

---

## 🎛️ Amélioration : Sélection des colonnes pour l'export PDF

### Fonctionnalité ajoutée
Les organisateurs peuvent maintenant choisir quelles colonnes inclure dans l'export PDF.

### Implémentation

**1. Modal de configuration** [index.html:662-685](index.html#L662-L685)
- Modal `chronoPdfConfigModal` avec checkboxes
- Interface simple et intuitive
- Colonnes "Position" et "Nom" obligatoires (désactivées)

**2. Fonction d'affichage du modal** [script.js:9924-9981](script.js#L9924-L9981)
```javascript
function showChronoPdfConfigModal()
```
- Génère dynamiquement les checkboxes selon le type de classement
- 3 configurations différentes :
  - **Catégorie** : Position, Nom, Dossard, Distance, Temps
  - **Distance** : Position, Nom, Dossard, Catégorie, Épreuve, Temps
  - **Standard** : Position, Nom, Dossard, Catégorie, Séries, Distance, Temps

**3. Génération PDF adaptative** [script.js:10007-10091](script.js#L10007-L10091)
```javascript
function generateChronoPDF(selectedColumns)
```
- Génère les lignes et en-têtes uniquement pour les colonnes sélectionnées
- Utilise `if (selectedColumns.xxx)` pour chaque colonne
- Calcule automatiquement le `colspan` pour les sections

**4. Workflow modifié**
```
Clic "📄 Export PDF"
    ↓
Modal de sélection des colonnes s'ouvre
    ↓
Organisateur coche/décoche les colonnes
    ↓
Clic "✅ Générer le PDF"
    ↓
PDF généré avec uniquement les colonnes sélectionnées
```

### Exemple d'utilisation

**Cas 1 : Export minimal**
- ✅ Position
- ✅ Nom
- ❌ Dossard
- ❌ Catégorie
- ✅ Temps
→ PDF avec 3 colonnes seulement

**Cas 2 : Export complet**
- Toutes les colonnes cochées
→ PDF avec toutes les informations

### Avantages
✅ Flexibilité totale pour l'organisateur
✅ Exports plus lisibles si besoin
✅ Adapté aux besoins spécifiques (ex: masquer les dossards)
✅ Position et Nom toujours présents (obligatoires)

---

## ✏️ Amélioration : Personnalisation du titre PDF

### Fonctionnalité ajoutée
Les organisateurs peuvent maintenant personnaliser le titre du document PDF.

### Implémentation

**1. Champ de saisie dans le modal** [index.html:671-681](index.html#L671-L681)
```html
<input type="text" id="pdfCustomTitle" placeholder="Entrez un titre personnalisé (optionnel)">
```
- Champ de texte avant les checkboxes de colonnes
- Affiche le titre par défaut comme suggestion
- Placeholder dynamique basé sur le titre actuel

**2. Initialisation du champ** [script.js:9928-9936](script.js#L9928-L9936)
```javascript
// Afficher le titre par défaut et vider le champ de saisie
defaultTitleSpan.textContent = data.title;
titleInput.value = '';
titleInput.placeholder = `Ex: ${data.title} 2025`;
```
- Vide le champ à chaque ouverture du modal
- Affiche le titre par défaut dans le texte d'aide
- Suggestion contextuelle dans le placeholder

**3. Utilisation du titre personnalisé** [script.js:9998-10000](script.js#L9998-L10000)
```javascript
const customTitle = document.getElementById('pdfCustomTitle').value.trim();
const finalTitle = customTitle || lastChronoRankingData.title;
```
- Si le champ est vide → titre par défaut
- Si le champ est rempli → titre personnalisé

**4. Application dans le PDF** [script.js:10026 & 10195](script.js#L10026)
```javascript
const pdfTitle = customTitle || data.title;
// Utilisé dans <title> et <h1> du PDF
```

### Exemples d'utilisation

**Exemple 1** : Titre par défaut
- Champ vide
- PDF généré avec "🏆 Classement Général"

**Exemple 2** : Titre personnalisé pour l'année
- Saisie : "Championnat Régional 2025"
- PDF généré avec "⏱️ Championnat Régional 2025"

**Exemple 3** : Titre pour une catégorie spécifique
- Saisie : "Classement Seniors - Finale"
- PDF généré avec "⏱️ Classement Seniors - Finale"

**Exemple 4** : Titre pour un sponsor
- Saisie : "Trophée Ville de Paris - Course 10km"
- PDF généré avec "⏱️ Trophée Ville de Paris - Course 10km"

### Interface utilisateur

Le modal affiche maintenant :
```
📝 Titre du document :
[Champ de saisie]
💡 Laissez vide pour utiliser le titre par défaut : Classement Général
```

### Avantages
✅ Flexibilité totale pour personnaliser les exports
✅ Possibilité d'ajouter l'année, le lieu, le sponsor
✅ Conserve le titre par défaut si aucune saisie
✅ Interface claire avec suggestion
✅ Aucune limite de caractères

---

## 🤖 Amélioration : Détection automatique LAP vs FINISH pour les relais

### Problème initial
En mode relais, l'organisateur devait taper "L" + dossard pour enregistrer un tour, et juste le dossard pour terminer. C'était peu intuitif car après 5 minutes de course sur un relais de 60 minutes, c'est évident que c'est un tour et pas un finish.

### Solution implémentée

**Logique automatique intelligente** [script.js:8876-8891](script.js#L8876-L8891)

```javascript
if (serie.raceType === 'relay' && !value.startsWith('L')) {
    const relayDurationMs = serie.relayDuration * 60 * 1000;
    const currentTime = serie.currentTime;

    if (currentTime < relayDurationMs) {
        isLap = true; // Détection auto: LAP
    } else {
        isLap = false; // Détection auto: FINISH
    }
}
```

### Fonctionnement

**Pour un relais de 60 minutes :**

| Temps écoulé | Saisie | Action automatique |
|--------------|--------|-------------------|
| 5 min | `5` + Enter | ⏱️ **LAP** (temps < 60 min) |
| 15 min | `5` + Enter | ⏱️ **LAP** (temps < 60 min) |
| 45 min | `5` + Enter | ⏱️ **LAP** (temps < 60 min) |
| 60 min | `5` + Enter | 🏁 **FINISH** (temps = 60 min) |
| 65 min | `5` + Enter | 🏁 **FINISH** (temps > 60 min) |

**Si besoin de forcer un LAP après la durée :**
- L'utilisateur peut toujours taper `L5` + Enter pour forcer un LAP

### Interface mise à jour [script.js:8336-8345](script.js#L8336-L8345)

**Mode Relais :**
```
🤖 MODE RELAIS - DÉTECTION AUTOMATIQUE
⏱️ Dossard + Enter = LAP (si temps < 60 min)
🏁 Dossard + Enter = FINISH (si temps ≥ 60 min)
💡 Plus besoin de taper "L" !
```

**Mode Individuel (inchangé) :**
```
✅ Dossard + Enter = FINISH
⏱️ L + Dossard + Enter = LAP
```

### Exemples concrets

**Exemple 1 : Relais 1 heure**
- 00:05:23 → Saisie `12` → **LAP** enregistré pour dossard 12
- 00:15:47 → Saisie `12` → **LAP** enregistré pour dossard 12
- 01:00:12 → Saisie `12` → **FINISH** enregistré pour dossard 12

**Exemple 2 : Relais 30 minutes**
- 00:10:00 → Saisie `8` → **LAP** enregistré pour dossard 8
- 00:20:00 → Saisie `8` → **LAP** enregistré pour dossard 8
- 00:30:05 → Saisie `8` → **FINISH** enregistré pour dossard 8

**Exemple 3 : Cas particulier (forcer un LAP après la durée)**
- 01:05:00 → Saisie `L12` → **LAP** forcé (avec le "L")
- 01:05:00 → Saisie `12` → **FINISH** (sans le "L", détection auto)

### Notifications améliorées

Le système affiche maintenant des notifications explicites :
- `⏱️ Détection auto: LAP pour Jean Dupont`
- `🏁 Détection auto: FINISH pour Jean Dupont`

### Avantages
✅ Plus intuitif pour les organisateurs
✅ Gain de temps : plus besoin de taper "L"
✅ Moins d'erreurs de saisie
✅ Logique basée sur le contexte temporel
✅ Compatible avec l'ancien système (L+dossard toujours fonctionnel)
✅ Notifications claires pour confirmer l'action

