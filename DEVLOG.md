# 🗓️ DEVLOG — Journal de développement

Ce fichier est la **source de vérité rapide** sur l'état du projet : ce qui a été fait,
quand, par quelle session, sur quels fichiers. Il complète (sans le remplacer)
`git log` — l'historique git donne le detail ligne par ligne, ce fichier donne le contexte
et le "pourquoi" en langage humain, lisible en 30 secondes par le prochain dev ou agent.

**Pourquoi ce fichier existe** : entre le 2024-02-02 (dernière mise à jour réelle de
`CHANGELOG.md`/`TODO.md`/`AGENTS.md`) et le 2026-09, plus de 50 commits ont fait évoluer le
code (clubs, multisport, mode couloirs natation, imports, statut DISQ, édition inline, etc.)
sans qu'aucune doc ne soit mise à jour. `DEVLOG.md` + le protocole décrit dans `CLAUDE.md`
(section "Protocole de fin de session") existent pour que ça ne se reproduise pas.

## 📋 Comment ajouter une entrée (à faire à CHAQUE session, dès qu'un commit est fait)

Ajouter un bloc en haut de la section "Journal", au format :

```markdown
### AAAA-MM-JJ — Titre court de la session

- **Contexte** : pourquoi cette session (bug rapporté, feature demandée, exploration...)
- **Fait** : résumé en 2-4 lignes de ce qui a été changé/débogué
- **Fichiers/modules touchés** : `src/xxx.iife.js`, `README.md`, ...
- **Commit(s)** : `<hash court>` ou lien PR
- **Doc à jour ?** : CHANGELOG ✅/❌ · AGENTS.md ✅/❌ · TODO.md ✅/❌ · claude.md ✅/❌
- **Suite possible** : ce qui reste ouvert / à surveiller (optionnel)
```

Ne pas réécrire les entrées passées — c'est un journal, pas une doc vivante (pour l'état
"vivant" à jour, voir `README.md` / `AGENTS.md` / `MULTISPORT.md` / `CLUBS.md`).

---

## Journal

### 2026-10-02 — Bouton « 🏁 Séries automatiques » retiré de l'écran Matchs

- **Contexte** : le bouton s'affichait aussi en mode championnat (Matchs), où il n'a pas de sens.
- **Fait** : retiré de la barre d'actions générée par `generateDayContentHTML` (`ui.iife.js`) ;
  celui de l'écran Courses (`renderChronoInterfaceForDay`, multisport) est inchangé.
- **Fichiers/modules touchés** : `src/ui.iife.js`, `tests/unit/autoSeriesButtonChronoOnly.test.js`
- **Commit(s)** : voir branche `claude/exciting-dirac-j151ws`
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md ❌ (aucune fonction exposée modifiée) · TODO.md ❌ (n/a) · claude.md ❌ (n/a)

### 2026-10-02 — Séries automatiques : un seul dossard par nageur

- **Contexte** : un nageur faisant deux nages recevait deux dossards (un par inscription).
- **Fait** : `generateSwimmingSeries` (chrono) attribue le dossard par nageur (clé nom + club
  normalisés) : dossard d'un participant conservé, sinon celui de la génération précédente
  (1re passe, s'il est libre), sinon nouveau numéro après le plus grand pris. Un nageur inscrit
  deux fois à la même épreuve reçoit deux dossards (le moteur de course identifie par dossard
  dans une série). Fiches « une par inscription » inchangées, avec le même numéro.
- **Fichiers/modules touchés** : `src/chrono.iife.js`, `tests/unit/swimmingImport.test.js`,
  `tests/e2e/natation.e2e.js` (contrôle sur les données réelles : 107 nageurs dont 42 multi-nages)
- **Commit(s)** : voir branche `claude/exciting-dirac-j151ws`
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md ✅ · TODO.md ❌ (n/a) · claude.md ❌ (n/a)

### 2026-10-02 — Accordéon des séries dans l'écran Courses

- **Contexte** : voir les participants de chaque série sans ouvrir de fenêtre, par série,
  par épreuve ou tout d'un coup (consultation seulement).
- **Fait** : `renderSerieCard` ajoute un en-tête cliquable (chevron) et un bloc
  `#serie-details-J-S` toujours rendu mais masqué (`renderSerieDetailsHTML`, rang/temps via
  `rankSerieResults`). Ouvrir/fermer ne change qu'un `display` (pas de re-rendu) ; état en
  mémoire (`openSerieDetails`, clé « jour-série ») relu à chaque rendu. Clic sur l'épreuve
  (`toggleEventSeriesDetails`) et bouton de la barre d'actions (`toggleAllSeriesDetails`).
- **Fichiers/modules touchés** : `src/multisport.iife.js`, `tests/unit/serieAccordion.test.js`
- **Commit(s)** : voir branche `claude/exciting-dirac-j151ws`
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md ✅ · TODO.md ❌ (n/a) · claude.md ❌ (n/a)

### 2026-10-02 — Bouton 🏆 de série fiabilisé, import multi-journées sur le moteur « à la suite »

- **Contexte** : « le petit bouton voir le classement de chaque série se trompe parfois » ;
  import multi-journées pouvant écraser une journée (fichier multi-journées + fichiers « J1 »).
- **Fait** : nouveau `rankSerieResults(serie)` (multisport) = seule règle de classement d'une
  série : DNS/DISQ exclus même avec ancienne ligne de résultat, une ligne par nom, distance
  puis temps, ex æquo au centième. Utilisé par `showSerieRanking` (fenêtre remplacée si déjà
  ouverte, Points seulement en Chrono pur hors natation, colonnes Club/Distance, DNS/DISQ en
  bas), par `getChronoResultsForDay` (points par série) et `calculateEventRankings`.
  `removeParticipantFromSerie` retire aussi la ligne de résultat. `importMultipleDayFiles` =
  `appendDaysToChampionship` sur un championnat vidé (restauré si rien d'importable) ; helpers
  communs `readJsonFiles`, `refreshAfterDaysImport`, `daysImportSummary` (non exposés).
- **Fichiers/modules touchés** : `src/multisport.iife.js`, `src/export-json.iife.js`,
  `tests/unit/serieRankingModal.test.js`, `tests/unit/importMultipleDays.test.js`
- **Commit(s)** : voir branche `claude/exciting-dirac-j151ws`
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md ✅ · TODO.md ❌ (n/a) · claude.md ❌ (n/a)
- **Tests** : `npm test` 332 ✅ · `npm run test:e2e` 0 problème

### 2026-10-02 — Import « ➕ Ajouter à la suite » (journées d'un autre projet)

- **Contexte** : une Journée 1 refaite par erreur dans un autre projet au lieu d'une Journée 2.
  L'import existant remplace tout ; l'import multi-fichiers renumérote mais remplace aussi.
- **Fait** : `appendDaysToChampionship(sources)` (cœur testable, sans fichiers) +
  `appendDaysFromFiles(event)` (lecture des fichiers, rafraîchissement UI) +
  `extractDaysFromImportData(data)` (tous les formats d'import → liste de journées). Numérotation
  après la dernière journée non vide (journées vides de fin réutilisées). Matchs : divisions
  augmentées si besoin (jamais réduites), structures complétées sur toutes les journées,
  `dayNumber` des matchs de poule renuméroté, `initializePoolSystem`. Courses : refus si une
  course tourne (`raceData.currentSerie`), séries `isRunning` du fichier mises en pause,
  `purgeRaceCacheForDay` sur le nouveau numéro. Avertissements : noms à variante de casse/accents,
  terrains différents, classement Multisport mixte. Clubs du fichier ajoutés à la liste.
- **Fichiers/modules touchés** : `src/export-json.iife.js`, `index.html`, `tests/unit/appendDays.test.js`
- **Commit(s)** : voir branche `claude/exciting-dirac-j151ws`
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md ✅ · TODO.md ❌ (n/a) · claude.md ❌ (n/a)
- **Suite possible** : `importMultipleDayFiles` (mode « remplacer ») garde les numéros d'origine
  des fichiers multi-journées et peut écraser une journée d'un autre fichier ; il pourrait
  réutiliser `appendDaysToChampionship` sur un championnat vidé.

### 2026-10-01 — Barre de recherche 🔍 dans la page (façon Ctrl+F)

- **Contexte** : demande d'une petite recherche intégrée pour retrouver vite un nom dans l'écran affiché.
- **Fait** : nouveau module `src/search.iife.js` + bouton 🔍 dans l'en-tête. Recherche limitée
  à ce qui est visible, insensible casse/accents, compteur « 2 / 4 », Entrée / Maj+Entrée / Échap.
  Surlignage par CSS Custom Highlight API (aucun `<mark>` injecté) + `MutationObserver` qui
  re-surligne après chaque re-rendu : aucune fonction d'affichage existante modifiée.
- **Fichiers/modules touchés** : `src/search.iife.js` (nouveau), `index.html`, `styles.css`,
  `tests/helpers/loadApp.js`, `tests/unit/appSearch.test.js`
- **Commit(s)** : voir branche `claude/clever-dijkstra-gsf1ab`
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md ✅ · TODO.md ❌ (n/a) · claude.md ❌ (n/a)
- **Suite possible** : le texte des champs `<input>` (scores, noms en édition) n'est pas trouvé.

### 2026-09-28 (suite 13) — Participants disponibles : infos d'inscription sur la ligne, liste agrandissable

- **Contexte** : « quand j'ai ajouté des séries automatiques, ma liste de nageurs est
  modifiée : il ne reste que nom, prénom et club, alors qu'avant la liste comportait
  visuellement distance et temps ». Vérifié (150 lignes réelles) : voulu —
  `generateSwimmingSeries` remplace chaque ligne comprise par une fiche par inscription
  (nom, club, nouveau dossard ; ligne brute gardée dans `swimRaw` pour une régénération),
  les lignes non comprises ou sans épreuve restent brutes. Mais épreuve et temps
  d'engagement n'étaient plus visibles, les 42 nageurs inscrits dans deux épreuves avaient
  deux lignes identiques, et les lignes non placées étaient noyées. Choix de l'utilisateur :
  infos **sur la même ligne** (pas en dessous), et liste agrandissable à la souris.
- **Fait** :
  - `src/chrono.iife.js` : `generateSwimmingSeries` pose `swimEventId` et `seedTimeMs` sur
    chaque fiche ; `parseSwimmingEntry` exposée.
  - `src/multisport.iife.js` (`renderParticipantsSection`) : `participantEntryInfo` →
    « 🎯 épreuve · ⏱ engagement · Série N, couloir C » à droite de la ligne (série et
    couloir lus en direct par `buildParticipantPlacement` : par id, sinon épreuve + nom après
    un déplacement ; « ⚠️ hors série » sinon) ; nom avec info-bulle « Ligne d'origine » ;
    lignes non placées après une génération en tête, fond jaune, « ⚠️ non placée » + raison
    (ligne non comprise / aucune épreuve) ; liste `resize: vertical`, hauteur gardée en
    `localStorage` (`saveParticipantsListHeight`, au relâchement de la souris).
- **Tests** : nouveau `participantsListInfo.test.js` (9 tests, 8 échouaient avant) ; e2e
  natation étape 4b : 149 fiches avec leur ligne d'infos sur la même ligne, 1 non placée en
  tête, liste agrandie **à la souris** (200 → 400 px) et gardée après 🔄.
- **Vu, non traité** : une ligne sans distance collée via « ➕ Ajouter » est coupée à la
  virgule du temps (« … 01:02,00 » → club « 00 », `saveBulkParticipantsForDay`).
- **Fichiers touchés** : `src/chrono.iife.js`, `src/multisport.iife.js`,
  `tests/unit/participantsListInfo.test.js`, `tests/e2e/natation.e2e.js`, `CHANGELOG.md`,
  `MULTISPORT.md`, `AGENTS.md`, ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (nouvelle PR, la #94 étant mergée).
- **Doc à jour ?** : CHANGELOG ✅ · MULTISPORT.md ✅ · AGENTS.md ✅ · tests ✅

### 2026-09-28 (suite 12) — « 🏁 Séries automatiques » : la journée ouverte par défaut

- **Contexte** : « si je suis dans la J2 et que je clique sur ce bouton, c'est logique que
  je souhaite des séries dans cette journée précisément ».
- **Diagnostic** (`showSwimmingImportModal`, `src/chrono.iife.js`) : la source était triée
  par nombre de lignes lisibles, la journée ouverte ne servant qu'à départager (depuis la J2,
  la liste plus longue de la J1 passait devant) ; une journée ouverte sans épreuve prenait
  silencieusement pour destination la première journée Courses avec épreuves (risque de
  remplacer les séries de la J1 depuis la J2).
- **Fait** : destination = journée ouverte quand c'est une journée Courses (sans épreuve :
  `alert` « Créez d'abord une épreuve dans la Journée N », pas de fenêtre) ; depuis une
  journée Matchs (bouton de sa barre d'outils, `ui.iife.js`) : inchangé, première journée
  Courses avec épreuves. Source = la journée ouverte si sa liste a au moins une ligne
  comprise, sinon la plus lisible des autres, avec la ligne « La Journée N n'a pas de liste
  de participants reconnue : liste prise par défaut dans la Journée X » (`#swimSourceHint`).
- **Tests** : `autoSeries.test.js` + 4 (J2 avec sa liste → J2/J2 ; J2 sans liste → autre
  journée + explication, destination J2 ; bouton d'une journée Matchs → inchangé ; J2 sans
  épreuve → message, rien de généré dans la J1).
- **Fichiers touchés** : `src/chrono.iife.js`, `tests/unit/autoSeries.test.js`,
  `CHANGELOG.md`, `MULTISPORT.md`, ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (nouvelle PR, la #93 étant mergée).
- **Doc à jour ?** : CHANGELOG ✅ · MULTISPORT.md ✅ · AGENTS.md (pas de fonction exposée nouvelle) · tests ✅

### 2026-09-28 (suite 11) — Classement par épreuve : le club du participant de la série fait foi

- **Contexte** : export utilisateur (`competition-chrono-J1-…_6.json`, non versionné :
  données personnelles) — « Les Aquaphiles » renommé « Aquaphiles » et « IMPH APRIS »
  renommé « Apris » dans « Participants disponibles », mais les anciens noms restaient au
  classement général (tableau des clubs : « Les Aquaphiles » 52, « Aquaphiles » 19,
  « IMPH APRIS » 12).
- **Diagnostic** : liste et participants des séries corrects ; 13 `serie.results` de
  séries déjà nagées gardaient l'ancien club — trace de « 🏷️ Affecter aux cochés » avant
  la PR #92 (ou de l'ancienne version encore chargée dans le navigateur). Pas le stockage
  local : c'est dans les données de la compétition. `calculateEventRankings()` lisait
  `r.club || p.club` (résultat d'abord), alors que le classement général des courses
  (`getChronoResultsForDay`) lit déjà `p.club || result.club`.
- **Fait** (`src/multisport.iife.js`, une ligne) : `calculateEventRankings()` prend le club
  du participant de la série en priorité, le résultat en repli. Les données existantes
  s'affichent justes sans rien refaire.
- **Vérifié** : sur le fichier de l'utilisateur (simulation jsdom), 7 clubs, « Aquaphiles »
  3e (73), plus de « Les Aquaphiles » ni « IMPH APRIS ».
- **Tests** : `clubRanking.test.js` + 2 (club renommé après la course → club du
  participant, un seul club, bons points — échouait avant ; repli sur le résultat sans
  participant correspondant).
- **Fichiers touchés** : `src/multisport.iife.js`, `tests/unit/clubRanking.test.js`,
  `CHANGELOG.md`, `claude.md` (piège n° 15), ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (nouvelle PR, la #92 étant mergée).
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md (pas de fonction exposée nouvelle) · tests ✅

### 2026-09-28 (suite 10) — Changer un club depuis « Participants disponibles » : suivi partout

- **Contexte** : « j'ai mis à jour les clubs dans la liste des participants disponibles, ça
  impacte bien le reste dans l'app ? les séries, les classements ? »
- **Diagnostic** (simulation sur les 150 lignes réelles de `jsondetest/natation test 2.json`
  après « 🏁 Séries automatiques ») :
  - ✏️ sur un nageur inscrit dans une seule épreuve : OK partout ;
  - ✏️ sur un nageur inscrit dans plusieurs épreuves (42 dans les données de test : la liste
    a une ligne par inscription) : **refusé**, « Un participant porte déjà ce nom » ;
  - « 🏷️ Affecter aux cochés » : liste et séries mises à jour, mais pas `serie.results` →
    le classement par épreuve et le tableau des clubs gardaient **l'ancien club** pour les
    séries déjà nagées (le classement lit `r.club || p.club`) ; cache `raceData` non mis à
    jour (un club vidé revenait à la fin de la course suivante) ;
  - `applyParticipantRename` modifiait le cache de course de **toutes** les journées, où un
    même id peut désigner un autre nageur ; et un ✏️ de club réécrivait le dossard du
    nageur dans ses autres épreuves.
- **Fait** (`src/multisport.iife.js`) : helper `updateParticipantEverywhere(dayNumber,
  chronoData, match, changes)` — liste, séries (participants **et** résultats), cache de
  course de cette journée seulement (sauvegardé) ; `applyParticipantRename` passe par lui
  (id ou ancien nom) ; `nameTakenByOther` (doublon = nom d'un **autre** nageur) ;
  `editedChanges` (dossard propagé seulement s'il a changé). Utilisés par ✏️ de la liste
  (`saveParticipantInfo`), ✏️ d'une série (`saveSerieParticipant`), fenêtre 🏊
  (`saveLaneSwimmer`), 🏷️ (`assignClubToSelected`) et l'harmonisation des noms.
- **Tests** : nouveau `participantClubUpdate.test.js` (9 tests, 6 échouaient avant) ; e2e
  natation étape 9c : ✏️ club d'un nageur classé inscrit dans 2 épreuves → liste, séries,
  résultats, classement par épreuve et tableau des clubs à jour.
- **Hors périmètre** : une journée importée depuis une autre (J2 ← J1) garde ses copies.
- **Fichiers touchés** : `src/multisport.iife.js`, `tests/unit/participantClubUpdate.test.js`,
  `tests/e2e/natation.e2e.js`, `CHANGELOG.md`, `claude.md` (piège n° 15), ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (nouvelle PR, la #91 étant mergée).
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md (pas de fonction exposée nouvelle) · tests ✅

### 2026-09-28 (suite 9) — Épreuves « fun » hors classement des clubs

- **Contexte** : après la PR #90, « il y a certaines épreuves qui ne doivent pas entrer dans le
  classement, c'est des épreuves "fun" ». Choix de l'utilisateur : une case à cocher, à la
  création de l'épreuve et en édition ; les résultats restent affichés.
- **Fait** (`src/multisport.iife.js`) :
  - case « 🎉 Épreuve fun » dans `showAddEventModalForDay` (s'applique à toutes les lignes
    saisies, `addChronoEvent(..., fun)`) et dans `editEventForDay` / `saveEditedEvent`
    (coche / décoche) → champ `event.fun` (absent si non coché) ;
  - badge « 🎉 Fun » sur la carte de l'épreuve (`renderEventCard`) ;
  - `calculateEventRankings()` : `fun` sur chaque épreuve ; une épreuve fun garde rangs et
    temps mais aucun `clubPoints` / `clubRank` ;
  - `buildEventRankingsHTML()` : pas de colonne dans le tableau des clubs (qui disparaît si
    toutes les épreuves sont fun), tableau de l'épreuve sans colonne « Points », avec le
    badge et « 🎉 Épreuve fun — hors classement des clubs ».
- **Tests** : nouveau `funEvents.test.js` (8 tests, 7 échouaient avant) ; e2e natation,
  étape 9b : ✏️ cocher « Épreuve fun » sur 50m brasse → badge, résultats affichés sans
  Points, absente du classement des clubs ; décocher → elle revient.
- **Fichiers touchés** : `src/multisport.iife.js`, `src/ui.iife.js` (commentaire export
  JSON), `tests/unit/funEvents.test.js`, `tests/e2e/natation.e2e.js`, `CHANGELOG.md`,
  `MULTISPORT.md`, `AGENTS.md`, `claude.md`, ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (nouvelle PR, la #90 étant mergée).
- **Doc à jour ?** : CHANGELOG ✅ · MULTISPORT.md ✅ · AGENTS.md ✅ · tests ✅

### 2026-09-28 (suite 8) — Points par épreuve et classement des clubs

- **Contexte** : « il serait possible d'ajouter une colonne "point" dans le général ? cela
  pour générer un classement par club toutes épreuves. Un club marque une seule fois des
  points par épreuve (le meilleur positionné du club) ». Choix de l'utilisateur : barème
  25-19-17-15-12-10-8-6-4-2 ; les meilleurs de chaque club sont **reclassés entre clubs**
  (« le club B est deuxième meilleur classé par club donc il reçoit 19 ») ; un **tableau
  supplémentaire** Club · une colonne par épreuve · Total.
- **Fait** (`src/multisport.iife.js`) :
  - `calculateEventRankings()` ajoute à chaque classé `clubRank` / `clubPoints`
    (`assignEventClubPoints`) : premier classé de chaque club = son meilleur, rang parmi les
    clubs (ex æquo au centième → même rang), points `calculateMultisportPositionPoints`
    (0 au-delà du 10e club) ; les autres nageurs du club et les sans-club → `null`. Clubs
    regroupés sans tenir compte des majuscules/espaces.
  - `calculateClubEventRanking(events)` (exposée) : par club, points de chaque épreuve
    (`null` si absent), total ; tri total ↓, puis nombre de 25 points, puis nom ; même rang
    si total et nombre de 25 égaux.
  - `buildEventRankingsHTML()` : tableau « 🏆 Classement des clubs (toutes épreuves) » en
    tête (Rang · Club · une colonne par épreuve, « (Jn) » si plusieurs journées · Total) +
    colonne **Points** dans chaque tableau d'épreuve (« – » pour un nageur déjà compté ou
    sans club). Vaut pour l'onglet, l'impression/export HTML et le second écran 📺.
  - `src/ui.iife.js` : l'export JSON par épreuve joint `clubs`.
- **Tests** : nouveau `clubRanking.test.js` (8 tests : cas de l'utilisateur, sans club,
  ex æquo, 11e club, casse/espaces, tableau des clubs, départage, HTML, export JSON) ;
  `eventRanking.test.js` compte désormais 2 tableaux d'épreuve + 1 tableau des clubs ; e2e
  natation : le tableau des clubs s'affiche, chaque total = somme de ses colonnes, tri par
  total, un club marque au plus une fois par épreuve.
- **Fichiers touchés** : `src/multisport.iife.js`, `src/ui.iife.js`,
  `tests/unit/clubRanking.test.js`, `tests/unit/eventRanking.test.js`,
  `tests/e2e/natation.e2e.js`, `CHANGELOG.md`, `MULTISPORT.md`, `AGENTS.md`, `claude.md`,
  ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (nouvelle PR, la #89 étant mergée).
- **Doc à jour ?** : CHANGELOG ✅ · MULTISPORT.md ✅ · AGENTS.md ✅ · tests ✅

### 2026-09-28 (suite 7) — Série terminée avec des DNS / DISQ

- **Contexte** : retour de l'utilisateur après la PR #88 : « si je mets un DNS ou un DISQ cela
  ne termine pas la série, si je mets des temps à tout le monde par contre la série se
  termine bien ».
- **Diagnostic** : la carte de série (`renderSerieCard`) comptait `serie.results` contre le
  nombre de participants : un DNS/DISQ n'a pas de ligne de résultats → « 4/5 résultats »,
  bordure bleue, jamais « terminée » à l'écran (même quand `serie.status` valait
  `completed`). Et `saveSerieResults` ne marquait pas terminée une série où tout le monde
  est DNS/DISQ.
- **Fait** (`src/multisport.iife.js`) : `serieProgress(serie)` — un participant est « réglé »
  s'il est arrivé, a une ligne de résultats, ou est DNS/DISQ ; la carte affiche
  « ✅ 5/5 résultats (dont 1 DNS, 1 DISQ) » en vert quand tout est réglé (ou série
  `completed`) ; la saisie manuelle marque la série terminée selon la même règle.
- **Tests** : `manualResults.test.js` passe à 15 (temps + DNS + DISQ → terminée, carte verte
  « 5/5 » ; tout le monde DNS/DISQ → terminée ; incomplète → « 4/5 », bleue ; les 3
  échouaient avant).
- **Fichiers touchés** : `src/multisport.iife.js`, `tests/unit/manualResults.test.js`,
  `CHANGELOG.md`, ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (nouvelle PR, la #88 étant mergée).
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md (pas de fonction exposée nouvelle) · tests ✅

### 2026-09-28 (suite 6) — Saisie manuelle des résultats (⏱️) : ordre des couloirs, DNS/DISQ, fiabilité

- **Contexte** : « tu vois le bouton "saisie manuelle des résultats" ? vérifie la manière dont
  il récolte ses données ». Problème vécu : « je les vois dans un mauvais ordre, il faudrait
  une colonne couloir dans ce modal pour les avoir dans le bon ordre ». Proposition de
  l'utilisateur retenue : « écrire DNS ou DISQ dans ce champ ».
- **Diagnostic** (`enterSerieResults` → `renderResultsForm` → `saveSerieResults` →
  `recordChronoResult`) : ordre de la série + dossard seul ; champs identifiés par le seul
  dossard ; **TypeError** sur une série générée (pas de `serie.results`) ; seul
  `totalTime` écrit (statut « prêt » → feuille imprimée « - », `getSerieRanking` distance 0) ;
  DNS/DISQ avec champ, ancien temps ré-enregistré ; champ vidé ignoré ; saisie illisible
  ignorée en silence (`1'02"35` → 1 s, `1:02:35` → 1 min 02) ; cache `raceData` repris à la
  réouverture puis « Terminer » réécrivait les résultats.
- **Fait** (`src/multisport.iife.js`) : colonne Couloir + tri par couloir en mode couloirs
  (`ensureSerieLanes` avant affichage), champs `result-time-<jour>-<série>-<id>` avec
  `data-initial`, Entrée → ligne suivante (`manualResultNext`, exposée) ; `parseManualResult`
  (vide / DNS / DISQ-DSQ-DQ / temps / illisible) et `parseTimeInput` réécrit (1'02"35,
  h:mm:ss, validation stricte, exposé) ; `applyManualResult` : temps = arrivée complète
  (`finished`, `finishTime`, `totalTime`, distance, ligne de résultats avec club/catégorie),
  DNS/DISQ = statut + retiré des résultats, vide = retour « prêt » ; champs inchangés non
  réécrits (précision du chrono) sauf ancien temps « à moitié » ; saisie illisible → rien
  d'enregistré, champ en rouge ; statut de série recalculé ; `dropSerieFromRaceCache` retire
  l'entrée de la série du cache (réouverture = série de la journée via `toRaceParticipant`) ;
  saisie refusée pendant que la course de la série tourne (`isSerieRaceRunning`) ;
  `recordChronoResult` crée `serie.results` s'il manque.
- **Tests** : `manualResults.test.js` (12 ; 11 échouaient avant, dont le TypeError).
  `npm test` : 256/256. `npm run test:e2e` : étape 12b (⏱️ sur une série générée : colonne
  Couloir dans l'ordre du bassin, 4 temps + DNS, série terminée) : 0 problème.
- **Fichiers touchés** : `src/multisport.iife.js`, `tests/unit/manualResults.test.js`,
  `tests/e2e/natation.e2e.js`, `MULTISPORT.md`, `AGENTS.md`, `claude.md`, `CHANGELOG.md`,
  ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (nouvelle PR, la #87 étant mergée).
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md ✅ · MULTISPORT.md ✅ · claude.md ✅ · tests ✅

### 2026-09-28 (suite 5) — Séries automatiques : relais (4x400m, 4x400m mixte, 4x50m libre)

- **Contexte** : question de l'utilisateur : « 4x400m et 4x400m mixte ça passerait ? ».
  Sonde : non — « 4x400m » n'était pas lu (`\b` entre « x » et « 400 » : pas de distance),
  les lignes étaient ignorées, une épreuve « 4x400m » (distance lue 400) rendait le 400m
  individuel ambigu, et « 4x400m mixte » passait par hasard avec un nom pollué
  (« Rfc Namur 4x »).
- **Fait** (`src/chrono.iife.js`) : `parseRelay` (« 4x400m », « 4 x 100 m », « 4×50m » →
  clé `4x400`, distance totale 1600) utilisé par `parseSwimmingEntry` (champ `relay`, zone
  retirée du nom), `deriveSwimmingEventInfo` (épreuve : `relay`, distance totale), le mode
  colonnes (`buildSwimmingEntryFromColumns`, `applySwimmingDefaultEvent`) ;
  `matchEntryToEvent` exige la même clé de relais (distance seule, distance + nage, repli
  historique) ; « x » ajouté aux mots vides des noms d'épreuve ; libellés d'aperçu/alerte
  via `entryEventLabel`. `raceType` reste « individuel » (le type « relay » de l'app est le
  relais à durée limitée). `multisport.iife.js` : la fenêtre ➕ Série lit la distance du nom
  de l'épreuve même hors natation (« 4x100m » → 400, « 200m » → 200).
- **Tests** : `autoSeries.test.js` passe à 13 (4x400m + 4x400m mixte + 400m le même jour,
  4x50m libre + 50m libre, ➕ Série sur un relais ; 3 échouaient avant). `npm test` :
  244/244. `npm run test:e2e` : mêmes résultats sur les 150 lignes réelles (149 lues,
  33 séries) : 0 problème.
- **Fichiers touchés** : `src/chrono.iife.js`, `src/multisport.iife.js`,
  `tests/unit/autoSeries.test.js`, `MULTISPORT.md`, `CHANGELOG.md`, ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (nouvelle PR, la #86 étant mergée).
- **Doc à jour ?** : CHANGELOG ✅ · MULTISPORT.md ✅ · AGENTS.md (pas de fonction exposée
  nouvelle) · tests ✅

### 2026-09-28 (suite 4) — Séries automatiques : athlétisme sans ses deux limites

- **Contexte** : « Oui corrige les deux limites puis merge » (limites notées en suite 3).
  Remarque de l'utilisateur : « c'est bizarre la limite car ça fonctionnait bien avant avec
  20m libre et 20m brasse » → exact : la **nage** écrite sur la ligne départage déjà ; la
  limite ne touchait que les lignes **sans nage** (athlétisme). Cas ajouté aux tests.
- **Fait** :
  - `chrono.iife.js` / `matchEntryToEvent` : ligne sans nage et plusieurs épreuves à la même
    distance → l'épreuve dont tous les mots (hors distance, mots vides, sans accents :
    `eventQualifierWords`) sont sur la ligne, la plus précise l'emporte ; sinon l'unique
    épreuve sans précision ; sinon non placée. Les mots de l'épreuve sont retirés du nom
    (`stripEventWordsFromName` : « Emma Roux Haies » → « Emma Roux »). Natation : « 50m » sans
    nage entre 50m libre et 50m dos reste ambigu (inchangé).
  - `generateSwimmingSeries` : `sportType` = celui de l'épreuve, sinon `swimming` si l'épreuve
    ou ses lignes donnent une nage, sinon `running` (toujours `laneMode`). Le classement par
    épreuve (`isSwimmingOnlyCompetition`, qui accepte déjà `laneMode`) s'applique donc aussi
    à l'athlétisme.
  - `multisport.iife.js` : `eventRankingTitle()` (exposée) → « 🏊 Résultats natation par
    épreuve » si toutes les séries sont de la natation, sinon « 🏁 Résultats par épreuve » ;
    utilisée par l'onglet et la fenêtre de classement (`ui.iife.js`).
- **Tests** : `autoSeries.test.js` passe à 10 (100m / 100m haies, Benjamins / Minimes,
  20m libre / 20m brasse, 50m sans nage ambigu, type de sport, titre, ➕ Série sur une épreuve
  d'athlétisme ; 5 échouaient avant). `npm test` : 241/241. `npm run test:e2e` : 0 problème.
- **Fichiers touchés** : `src/chrono.iife.js`, `src/multisport.iife.js`, `src/ui.iife.js`,
  `tests/unit/autoSeries.test.js`, `MULTISPORT.md`, `AGENTS.md`, `CHANGELOG.md`, ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (PR #86).
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md ✅ · MULTISPORT.md ✅ · tests ✅

### 2026-09-28 (suite 3) — « Séries natation » renommé « Séries automatiques »

- **Contexte** : demande utilisateur : « la modal série natation, ça peut également servir
  pour des séries d'athlétisme il me semble, on pourrait juste l'appeler séries
  automatiques ? »
- **Vérifié avant de renommer** (sonde jsdom avec 100m, 200m, 100m haies, 400m) : le
  générateur marche pour l'athlétisme quand la distance est **unique** dans la journée (200m,
  400m → séries par couloirs triées au temps). Limites : (1) « 100m » et « 100m haies » ont la
  même distance → une ligne « Nom 100m 12.45 » n'est placée nulle part (ambigu, même règle
  que « 50m » sans nage en natation) ; (2) les séries générées portent `sportType:
  'swimming'` → classement par épreuve titré « Résultats natation » ; (3) un nom contenant un
  mot de nage près de la distance (« Dos Santos ») peut être pris pour une nage (préexistant).
  Non modifié ici : proposé à l'utilisateur.
- **Fait** : libellés visibles uniquement (fonctions internes `generateSwimmingSeries`,
  `showSwimmingImportModal`… inchangées) — bouton « 🏁 Séries automatiques » (journée Courses
  `multisport.iife.js` et barre d'une journée Matchs `ui.iife.js`, avec info-bulle), titre de
  la fenêtre, « Participants par série », « 🏁 Générer les séries », aperçu / notification /
  alertes en « participants », exemple d'athlétisme dans l'aide ; case « Mode couloirs (un
  bouton d'arrêt par couloir) » de la fenêtre ➕ Série ; « déjà nagée(s) » → « déjà
  disputée(s) » dans l'avertissement et les messages de déplacement.
- **Tests** : `autoSeries.test.js` (3 : libellés, fenêtre, athlétisme 200m/400m ; les 3
  échouaient avant). `npm test` : 234/234. `npm run test:e2e` (libellés mis à jour) : 0
  problème.
- **Fichiers touchés** : `src/chrono.iife.js`, `src/multisport.iife.js`, `src/ui.iife.js`,
  `tests/unit/autoSeries.test.js`, `tests/e2e/natation.e2e.js`, `MULTISPORT.md`,
  `claude.md`, `CHANGELOG.md`, ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (ajouté à la PR #86, pas encore
  mergée).
- **Doc à jour ?** : CHANGELOG ✅ · MULTISPORT.md ✅ · claude.md ✅ · AGENTS.md (pas de
  changement d'API) · tests ✅
- **Suite possible** : épreuves de même distance départagées par les mots du nom (« haies ») ;
  type de sport déduit de l'épreuve (athlétisme ≠ natation) avec un titre de classement
  neutre.

### 2026-09-28 (suite 2) — Épreuves en masse (une par ligne)

- **Contexte** : demande utilisateur : « ça serait bien de pouvoir ajouter des épreuves en
  masse également, une épreuve par ligne au lieu d'une épreuve à la fois. Insère ça dans le
  modal existant. »
- **Fait** (`src/multisport.iife.js`) : dans `showAddEventModalForDay`, le champ
  `#eventName-N` devient un `<textarea>` (même id, « une épreuve par ligne », Ctrl+Entrée
  valide) ; `saveEventForDay` crée une épreuve par ligne via `addChronoEvent` (même date),
  ignore lignes vides et puces (`-`, `•`, `*`) et ne recrée pas une épreuve déjà présente
  (dans la liste ou la journée, sans tenir compte des majuscules). Messages : « Épreuve
  créée ! » (une seule, comme avant), « 3 épreuves créées (2 déjà existantes, ignorées) »,
  « … existe déjà » (rien de créé, fenêtre laissée ouverte).
- **Tests** : `bulkEvents.test.js` (6 ; 4 échouaient avant, les 2 autres gardent le
  comportement à une ligne / champ vide). `npm test` : 231/231. `npm run test:e2e` : l'étape 3
  crée désormais les 8 épreuves en un seul collage : 0 problème.
- **Fichiers touchés** : `src/multisport.iife.js`, `tests/unit/bulkEvents.test.js`,
  `tests/e2e/natation.e2e.js`, `AGENTS.md`, `MULTISPORT.md`, `CHANGELOG.md`, ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (ajouté à la PR #86, pas encore
  mergée).
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md ✅ · MULTISPORT.md ✅ · tests ✅

### 2026-09-28 (suite) — « + » des Participants disponibles vers les séries générées

- **Contexte** : signalé par l'utilisateur : « le bouton "+" sur la ligne du participant dans
  "participants disponibles" est lié aux séries créées manuellement […] je ne sais pas ajouter
  à des séries qui ont été créées via le bouton "série natation" ; vérifie si c'est possible
  de les ajouter aussi sans tout casser ». Choix validé : un nageur déjà dans une autre série
  de la même épreuve est **déplacé** (confirmation), refusé s'il y a déjà nagé.
- **Diagnostic** : `showAddToSerieModal` et `showBulkAddToSerieModal` ne listaient que
  `chronoData.series` (séries « à plat »), et `renderParticipantsSection` ne comptait qu'elles
  (« Créez une série » après une génération). Piège : `addChronoParticipant` donnait
  `bib = nombre de participants + 1`, déjà pris dans une série générée (dossards continus :
  Série 2 = 6..10 → nouveau dossard 6), or le dossard est la clé des actions de course.
- **Fait** (`src/multisport.iife.js`) : `getDaySeriesByEvent` (exposée ; séries par épreuve
  via `getEventSeries`, puis séries sans épreuve) ; `renderSeriePickerHTML` partagé par les
  deux fenêtres (titre par épreuve, nombre, « ✅ terminée », « → couloir N » via
  `nextFreeLane`, « ⚠️ déjà en Série X : sera déplacé ici », `data-serie-id`) ;
  `placeParticipantInSerie` (ajout ou déplacement, dossard du nageur s'il est libre dans la
  série) ; `nextFreeBib` (plus grand dossard + 1) comme repli d'`addChronoParticipant` ;
  `addExistingParticipantToSerie` : refus si déjà dans la série, confirmation de
  déplacement, refus si déjà nagé (arrivé, DISQ, tours ou résultat ; DNS déplaçable) ;
  `bulkAddParticipantsToSerie` : une seule confirmation listant les déplacés, compte-rendu
  ajoutés / déplacés / déjà présents / non déplacés.
- **Tests** : `addToGeneratedSerie.test.js` (15 ; 14 échouaient avant). `npm test` :
  225/225. `npm run test:e2e` : nouvelle étape 12 (retardataire ajouté via « + » à une série
  générée : couloir et dossard uniques, bouton d'arrêt ; déplacement d'un nageur de Série 3
  vers Série 7) : 0 problème.
- **Fichiers touchés** : `src/multisport.iife.js`, `tests/unit/addToGeneratedSerie.test.js`,
  `tests/e2e/natation.e2e.js`, `AGENTS.md`, `MULTISPORT.md`, `CHANGELOG.md`, ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (nouvelle PR, la #85 étant mergée).
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md ✅ · MULTISPORT.md ✅ · claude.md (piège n°14
  déjà général : toujours `getEventSeries`) · tests ✅

### 2026-09-28 — Séries natation : ajouter / modifier sur place sans risque

- **Contexte** : cas vécu par l'utilisateur en compétition. Séries générées par « 🏊 Séries
  natation », puis, sur place, une série ajoutée avec le bouton du haut « 🏃 Série » ; il n'a
  pas osé recliquer « Séries natation » de peur de tout refaire. Demande : « un bouton à
  chaque épreuve pour ajouter une série directement à cette épreuve », vérifier l'utilité du
  bouton du haut, et « réfléchis à ce cas de figure car c'est toujours pratique d'ajouter ou
  modifier des séries natation sur place ».
- **Diagnostic** : (1) « 🏃 Série » (haut) créait une série sans épreuve — sa fenêtre n'a
  pas de choix d'épreuve — donc ni imprimée ni classée par épreuve ; (2) le « + Série » de
  l'épreuve existait (gris, en bas de carte) mais `renderEventCard` n'affichait que
  `event.series` s'il n'était pas vide, alors que `addChronoSerie` range la série « à plat »
  → série ajoutée à une épreuve générée **invisible** ; (3) fenêtre toujours « Course à pied,
  1000 m, sans couloirs » ; (4) régénérer « Séries natation » efface toutes les séries des
  épreuves, même nagées, **sans confirmation** ; (5) aucun moyen de supprimer une série.
- **Fait** :
  - `multisport.iife.js` : bouton « ➕ Série » vert dans l'en-tête de `renderEventCard`
    (ancien « + Série » du bas retiré), séries via `getEventSeries` ; nouvelle
    `getSerieDefaultsForEvent` (réglages de la dernière série de l'épreuve, sinon déduits
    du nom via `deriveSwimmingEventInfo` : natation seulement si nage ET distance) +
    `showAddSerieModalForDayAndEvent` pré-remplie (titre = nom de l'épreuve, « Série N+1 ») ;
    bouton « 🏃 Série » retiré de la barre ; `attachSerieToEvent` (sélecteur « 📎 Rattacher à
    une épreuve… » sur les séries indépendantes) ; `deleteSerieForDay` (🗑️ sur chaque carte
    de série, confirmation avec nombre de temps perdus, refus pendant la course) ;
    `deleteEventForDay` compte les séries imbriquées.
  - `chrono.iife.js` : `existingSwimmingSeriesWarning` → encadré dans la fenêtre « Séries
    natation » (mis à jour au changement de journée cible) + `confirm()` au clic « Générer » ;
    la régénération retire aussi les séries « à plat » des épreuves régénérées (cohérent avec
    le message) ; `deriveSwimmingEventInfo` exposée sur `window`.
- **Tests** : `addSerieOnSite.test.js` (18 ; 16 échouaient avant le correctif). `npm test` :
  210/210. `npm run test:e2e` : nouvelle étape 11 (➕ Série sur place dans « 50m brasse » →
  fenêtre pré-remplie → série visible → 🏊 couloirs 3-4 → boutons d'arrêt = couloirs choisis
  → course → avertissement de « Séries natation » → Annuler) ; la feuille imprimée couvre 34
  séries : 0 problème.
- **Fichiers touchés** : `src/multisport.iife.js`, `src/chrono.iife.js`,
  `tests/unit/addSerieOnSite.test.js`, `tests/e2e/natation.e2e.js`, `MULTISPORT.md`,
  `AGENTS.md`, `claude.md`, `CHANGELOG.md`, ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (nouvelle PR, la #84 étant mergée).
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md ✅ · MULTISPORT.md ✅ · claude.md ✅ · tests ✅
- **Suite possible** : déplacer un nageur d'une série à une autre en un geste (aujourd'hui :
  🏊 dans les deux séries) ; renommer une série.

### 2026-09-24 (suite 5) — Couloirs sans ambiguïté (écran de course, boutons, feuille imprimée)

- **Contexte** : signalé par l'utilisateur. « Les boutons du mode couloir affichent le numéro
  du couloir en petit ; le grand chiffre au-dessus n'est pas juste : le bouton 1 pour le
  nageur qui est au couloir 5, et 5 sur ce même bouton. » Puis, après échange : « je ne
  comprends pas d'où vient le grand chiffre, le but est qu'il soit le couloir, mais il n'est
  pas cohérent avec l'attribution du bouton "Séries natation" et les éditions effectuées. Je
  veux que les données couloir soient ajoutées à la feuille PDF et soient les mêmes que les
  boutons d'arrêt des couloirs pour éviter la mauvaise manip. »
- **Diagnostic** : le grand chiffre EST le couloir enregistré (celui qui pilote le
  chronométrage) ; le petit est le **dossard**. À la génération natation, les dossards suivent
  l'ordre des temps (1..5) et les couloirs « le plus rapide au centre » (3, 4, 2, 5, 1) : le
  5e a le dossard 5 au couloir 1. Le tableau affiché avant le départ ne montrait que le dossard
  (« #5 ») sans couloir, donc « 5 » était pris pour le couloir. Risque réel : un nageur placé
  au couloir 5 alors que l'app l'attend au couloir 1 → temps attribués au mauvais nageur.
- **Fait** (`src/chrono.iife.js`) :
  1. `laneButtonInnerHTML()` (rendu initial + après arrivée) : légende « Couloir », grand
     numéro, nom (`.lane-name`), sans dossard.
  2. Tableau de course en mode couloirs : 1re colonne « Couloir » au lieu de « Dossard »
     (`raceIdCellContent`, même nombre de cellules, car l'édition inline cible `cells[3..8]`),
     lignes triées par couloir.
  3. Second écran 🖥️ Afficher (course) : Couloir au lieu du dossard.
  4. « 🖨️ Imprimer séries » : colonne Couloir ; feuille de départ triée par couloir, Pos. « - »
     et pas de couleurs de médaille tant que personne n'est arrivé ; en-tête d'épreuve sans
     « Distance: undefinedm | Type: undefined » (distance lue sur les séries).
  5. **Feuille = boutons** : `ensureSerieLanes(serie)` (`multisport.iife.js`, à côté de
     `nextFreeLane`) complète les couloirs manquants (séries antérieures à l'attribution
     automatique) et est appelée **au départ de la course** (`startChronoRaceForDay`,
     `ui.iife.js`, remplace le bloc inline) **et à l'impression** ; l'attribution est
     enregistrée dans la journée. Avant, une telle série sortait sans couloir sur la feuille et
     recevait ses couloirs seulement au départ.
  6. La feuille imprimait uniquement les séries imbriquées (`event.series`, génération
     natation) : une série créée via ➕ Série (rangée « à plat » dans `chronoData.series`)
     sortait « Aucune série ». Elle lit désormais `getEventSeries()` (exposée sur `window`).
     Club : celui de la série d'abord (le cache `raceData` peut porter le même id pour un
     nageur d'une autre journée).
- **Tests** : `laneNumbersUnambiguous.test.js` (11, avec le cas exact de l'utilisateur :
  dossard 5 / couloir 1 ; série ancienne sans couloir → feuille = boutons ; série ➕ imprimée ;
  les 2 derniers échouent sans le correctif). `swimmingLanesAtRaceStart.test.js` lit le nom via
  `.lane-name` au lieu d'une position d'élément. `npm test` : 192/192. `npm run test:e2e`
  étendu (colonne Couloir avant départ, boutons, feuille imprimée dont couloirs identiques aux
  données des boutons pour les 33 séries) : 0 problème.
- **Fichiers touchés** : `src/chrono.iife.js`, `src/multisport.iife.js`, `src/ui.iife.js`,
  2 tests unitaires, `tests/e2e/natation.e2e.js`, `claude.md`, `AGENTS.md`, `CHANGELOG.md`,
  ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (PR #84).
- **Doc à jour ?** : CHANGELOG ✅ · claude.md ✅ · AGENTS.md ✅ (`ensureSerieLanes`,
  `getEventSeries`) · tests ✅
- **Suite possible** : les dossards natation restent attribués dans l'ordre des temps ; ils ne
  sont plus affichés en mode couloirs, mais restent la clé interne des actions (DNS, ✏️…).

### 2026-09-24 (suite 4) — Classement par épreuve (natation), centièmes, test e2e dans le repo

- **Contexte** : demandes de l'utilisateur après le test de bout en bout. Pour la natation,
  « un classement par épreuve, un général n'est pas nécessaire, il faut regrouper les mêmes
  épreuves pour comparer ce qui est comparable ». Plus les centièmes et le test e2e à garder.
- **Fait** :
  1. `multisport.iife.js` : `isSwimmingOnlyCompetition()` (uniquement des journées Courses
     dont toutes les séries avec participants sont `swimming` ou `laneMode`),
     `calculateEventRankings()` (séries imbriquées ET « à plat » par `eventId` regroupées par
     épreuve, tri au temps, ex æquo au centième = même rang 1-2-2-4, DNS/DISQ listés sans
     rang ; un ancien résultat d'un DISQ reste exclu), `buildEventRankingsHTML()` et
     `renderEventRankingsPanel()`. Branchés dans `renderMultisportRanking()` (les deux onglets)
     et `buildMultisportRankingDoc()` (impression + export HTML).
  2. `ui.iife.js` : second écran « 📺 Afficher » (`buildMultisportRankingContentHTML`, désormais
     exposé) et son titre, export JSON (`{ type: 'classement-par-epreuve', events }`), en-tête
     statique de l'onglet (titre adapté, encadré « barème Matchs + Courses » masqué) ;
     `index.html` : id `multisport-hub-title`.
  3. `formatDurationHMS` : centièmes (« 4,20s », « 1m02,35s »), calculés sur les centièmes
     totaux (59,999 s → « 1m00,00s »).
  4. `tests/e2e/natation.e2e.js` + `npm run test:e2e` (`playwright-core` en devDependency) :
     le scénario de la session précédente, étendu au classement par épreuve (regroupement
     séries 1 + 2, ordre au temps, DISQ non classé, centièmes, clubs, second écran,
     impression). Non lancé en CI (il faut un navigateur).
- **Tests** : `eventRanking.test.js` (10), `durationHundredths.test.js` (7). `npm test` :
  181/181. `npm run test:e2e` : 0 problème.
- **Décision de conception** : seules les compétitions 100 % natation changent. Course à pied
  et compétitions mixtes (matchs + courses) gardent leur classement général.
- **Fichiers touchés** : `src/multisport.iife.js`, `src/ui.iife.js`, `index.html`, 2 tests
  unitaires, `tests/e2e/natation.e2e.js`, `package.json`, `package-lock.json`, `.gitignore`,
  `claude.md`, `AGENTS.md`, `README.md`, `CHANGELOG.md`, ce fichier.
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md ✅ · claude.md ✅ · README ✅ · tests ✅
- **Suite possible** : lancer le test e2e en CI (les runners GitHub ont Google Chrome) si l'on
  veut une vérification systématique. Reste ouvert : annuler un DNS/DISQ qui avait arrêté le
  chrono ne le relance pas.

### 2026-09-24 (suite 3) — Test de bout en bout d'une journée natation + 4 correctifs

- **Contexte** : avant la prochaine compétition, l'utilisateur a demandé un test complet
  d'une journée natation dans un vrai navigateur.
- **Test** (Playwright + Chromium, script hors repo, piloté par de VRAIS clics) : les 150
  lignes réelles de `jsondetest/natation test 2.json` (« Club Nom Prénom 25 M Brasse
  0:00:35 »). Parcours : J1 → Courses, ➕ Ajouter (collage des 150 lignes), 8 épreuves via
  🎯, 🏊 Séries natation (aperçu + génération, 5 couloirs → 33 séries), 👥 couloirs, course 1
  au clic (mauvais clic annulé via 🕘, DNS, arrêt auto), course 2 au clavier avec
  **rechargement de la page en pleine course**, 🖥️ Afficher, classement de série, onglets
  🏆 Classement et 🏅 Multisport, 💾 Exporter puis 📥 Importer dans un navigateur vierge
  (données identiques), 🖨️ Imprimer. Contre-épreuve : le même scénario échoue sur `main`.
- **Bugs trouvés et corrigés** :
  1. Onglet 🏅 Multisport supprimé définitivement par `updateTabsDisplay()` (`ui.iife.js`),
     qui retirait tous les `.tab` sauf « Classement ». Ça arrivait au chargement de la page
     avec des données, après « + » et après un import. Ne retire plus que les onglets de
     journée (`.tab[data-day]`).
  2. DISQ après arrivée gardé dans `serie.results` (seul DNS était exclu) → classé, même 1er,
     dans le classement de série et le Multisport. Exclu dans `saveRaceResultsToDay`.
  3. Distance des séries natation : 0 pour une épreuve créée via 🎯 (nom seul), puis repli
     à 1000 m au lancement. Déduite du nom (`deriveSwimmingEventInfo`) à la génération.
  4. Club absent du classement Multisport (Courses) : `serie.results` ne portait pas le club
     et `calculateMultisportRanking` passait `''`. Le club est repris des participants de
     série.
- **Tests** : `tabsRebuildKeepsFixedTabs.test.js` (3) et `swimmingResultsIntegrity.test.js`
  (5), en échec avant les correctifs. `npm test` : 164/164. Scénario de bout en bout : 0
  problème, aucune erreur JS.
- **Fichiers touchés** : `src/ui.iife.js`, `src/chrono.iife.js`, `src/multisport.iife.js`,
  2 tests, `claude.md`, `CHANGELOG.md`, ce fichier.
- **Doc à jour ?** : CHANGELOG ✅ · claude.md ✅ · AGENTS.md (pas de changement d'API) · tests ✅
- **Observations non corrigées** :
  - La ligne `Cordée Sport Ifa Bouge. Dormal Guillaume. Libre. 01:02` des données n'a pas de
    distance : elle n'est pas placée, ce qui est normal (l'aperçu la signale, l'option
    « Épreuve par défaut » permet de la placer).
  - Le classement général des Courses (onglet Multisport) affiche le temps total à la seconde
    (« 4s »), sans centièmes, alors qu'ils départagent en natation.
  - Ce classement général trie par distance puis temps, toutes séries confondues : pensé pour
    la course à pied, peu parlant pour des épreuves de natation différentes.

### 2026-09-24 (suite 2) — Échec de sauvegarde visible + tests en CI

- **Contexte** : les deux points prioritaires du bilan « il reste quoi ? » (liés aux issues
  #50 et #55), validés par l'utilisateur avant la prochaine compétition.
- **Fait** :
  1. `src/notifications.iife.js` : `reportSaveFailure(store, error)` /
     `reportSaveSuccess(store)`. En cas d'échec, un seul bandeau rouge persistant en bas de
     l'écran (pas un toast : la sauvegarde a lieu à chaque modification, un toast se
     répéterait sans cesse et disparaîtrait en 3 s), avec la cause (stockage plein ou
     indisponible) et un bouton « 💾 Exporter maintenant » (`exportChampionship`).
     Retiré automatiquement quand toutes les sauvegardes en échec réussissent de nouveau.
     En bas pour ne pas masquer les notifications de course en haut à droite.
  2. `saveToLocalStorage()` (`state.iife.js`) et `saveChronoToLocalStorage()`
     (`chrono.iife.js`) les appellent (avant : `console.warn` seul, invisible).
  3. `.github/workflows/tests.yml` : `npm ci` + `npm test` (Node 22) sur chaque PR et
     chaque push vers `main`. Étapes rejouées dans une copie propre du repo : 156/156.
- **Tests** : `tests/unit/saveFailureWarning.test.js` (7 ; 6 en échec avant le correctif).
  `npm test` : 156/156. Vérifié dans Chromium avec un VRAI dépassement de quota (stockage
  rempli jusqu'au `QuotaExceededError`) : bandeau visible, puis retiré après libération.
- **Fichiers touchés** : `src/notifications.iife.js`, `src/state.iife.js`,
  `src/chrono.iife.js`, le test, le workflow, `claude.md`, `AGENTS.md`, `CHANGELOG.md`,
  ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (nouvelle PR, la #48 étant mergée).
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md ✅ · claude.md ✅ · tests ✅
- **Suite possible** : d'autres `localStorage.setItem` non critiques (liste des clubs,
  état replié des sections) gardent un `console.warn` seul. Restent aussi ouverts :
  l'annulation DNS/DISQ qui ne relance pas le chrono, et la relecture manuelle du
  localStorage dans `showImportPlayersModal` (`multisport.iife.js`, issue #58).

### 2026-09-24 (suite) — Arrivées en mode couloirs annulables

- **Contexte** : point resté ouvert dans l'entrée précédente, demandé par l'utilisateur :
  une arrivée par clic sur un couloir (ou touche) ne pouvait pas être annulée depuis
  l'historique 🕘, contrairement au mode normal (#77).
- **Fait** (`src/chrono.iife.js`) :
  1. `finishLane` prend un instantané du nageur avant l'arrivée et l'inscrit dans
     l'historique (`logRaceAction`, qui renvoie désormais l'entrée créée).
  2. L'arrivée qui provoque l'arrêt automatique du chrono est marquée `stoppedRace`
     (`stopRaceIfAllDone(serie, action)`). Son annulation relance le chrono depuis le
     `startTime` d'origine (`resumeRaceClockAfterUndo`) : le temps de l'arrêt est rattrapé.
     Sans ça, un mauvais clic sur le dernier couloir faisait perdre au nageur tout le temps
     écoulé jusqu'à la correction (« ▶️ Reprendre » repart du temps figé). Le cas existait
     aussi en mode normal : même correctif. Pas de relance si la série a été terminée.
  3. En mode couloirs, l'annulation redessine l'écran de course (boutons de couloir) en
     gardant le panneau d'historique ouvert (`refreshRaceInterfaceKeepingHistory`).
  4. Le tick du chrono est extrait dans `runRaceClock` (partagé par `toggleRaceTimer` et la
     relance). `toggleRaceTimer` ne plante plus si le bouton ▶️ est absent du DOM.
  5. Bouton FIN du tableau en mode couloirs : le couloir passe aussi au vert.
- **Tests** : `tests/unit/laneFinishUndo.test.js` (9, tous en échec avant le correctif).
  `npm test` : 149/149. Vérifié aussi dans Chromium (Playwright, hors repo) : mauvais clic
  sur le dernier couloir à 2,2 s, annulation 4 s plus tard → chrono à 6,2 s, couloir de
  nouveau actif, vraie arrivée à 7,39 s, aucune erreur JS.
- **Fichiers touchés** : `src/chrono.iife.js`, le test, `claude.md`, `AGENTS.md`,
  `CHANGELOG.md`, ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (PR #48).
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md ✅ · claude.md ✅ · tests ✅
- **Suite possible** : annuler un DNS/DISQ (↩️ dans le tableau) qui avait arrêté le chrono
  ne le relance pas. Ces statuts ne passent pas par l'historique 🕘 ; cas rare, non traité.

### 2026-09-24 — Couloirs faux au lancement d'une course + arrêt auto du chrono (DNS/DISQ)

- **Contexte** : bug signalé — après « 🏊 Séries natation », les séries sont correctes mais
  au lancement (▶️ Course) les nageurs ne sont plus dans les bons couloirs. Puis demande :
  en mode couloirs, le chrono général doit s'arrêter à l'arrivée du dernier, comme en mode
  normal.
- **Diagnostic couloirs** : la génération et l'affichage de course sont corrects (le
  parcours « à neuf » passe). Le bug vient du cache de course live `raceData` (persisté à
  part dans localStorage) : `startChronoRaceForDay` réutilisait la **liste de nageurs du
  cache** dès qu'une entrée existait pour (id série, id épreuve, journée), et ne
  resynchronisait que les nageurs qu'il y retrouvait. Deux façons d'y tomber :
  (1) série déjà ouverte une fois puis modifiée (modale 🏊, 👥, régénération) → l'ancien
  occupant garde son couloir, le nouveau n'apparaît pas ; (2) id de série réutilisé —
  surtout via le bouton **🗑️ Vider** d'une journée Courses (`clearChronoDataForDay`), qui
  remet les compteurs à 1 **sans purger le cache** (seul « Vider la journée » le faisait
  depuis #78) → nageurs fantômes et anciens temps.
- **Fait** :
  1. `ui.iife.js` : `reconcileRaceParticipants` — la série du jour fait foi pour la
     composition et les couloirs ; le cache ne garde la progression que des nageurs de même
     id **et** même nom ; entrée sans aucun nageur commun = jetée. Purge du cache
     factorisée dans `purgeRaceCacheForDay` (utilisée par `clearDayData`).
  2. `multisport.iife.js` : `clearChronoDataForDay` appelle `purgeRaceCacheForDay`.
  3. `chrono.iife.js` : règle d'arrêt unique `stopRaceIfAllDone` (arrivées + DNS/DISQ,
     au moins une arrivée), appelée par `finishLane`, `finishParticipant`, `markAsDNS`,
     `markAsDISQ`. Avant, un seul DNS/DISQ empêchait l'arrêt, dans les deux modes.
     Suppression de `checkAllFinished` (code mort).
  4. Tests : `swimmingLanesAtRaceStart.test.js` (10) et `raceAutoStopWhenAllDone.test.js`
     (5). Contre-épreuve faite : les cas du bug échouent sur le code de `main`.
     `npm test` : 140/140.
  5. Fusion de `main` (#49→#81) dans la branche de doc (PR #48) : conflits de doc résolus
     en gardant les versions de #80 (plus à jour) + ajout du journal/protocole ;
     correction « 16 → 15 modules » (`export.iife.js` supprimé sur main).
- **Fichiers/modules touchés** : `src/ui.iife.js`, `src/multisport.iife.js`,
  `src/chrono.iife.js`, 2 tests, `claude.md` (piège #12 + protocole), `AGENTS.md`,
  `CHANGELOG.md`, `README.md`, `CONTRIBUTING.md`, ce fichier.
- **Commit(s)** : branche `claude/quirky-cori-mwceum` (PR #48).
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md ✅ · claude.md ✅ · tests ✅
- **Suite possible** :
  - Les arrivées en mode couloirs (`finishLane`) ne sont pas inscrites dans l'historique
    annulable (#77), contrairement à `finishParticipant` : un clic sur le mauvais couloir
    ne peut être annulé que via 🔄 Relancer.
  - Les changements #49→#81 (2026-09-15 → 24) n'ont pas d'entrée ici ; ils sont résumés
    dans `CHANGELOG.md` (2.5.0) et détaillés dans `git log`.

### 2026-09-11 — Remise à niveau de la documentation (constat + réécriture)

- **Contexte** : l'utilisateur soupçonnait que la doc n'était plus tenue à jour depuis
  longtemps ("plus d'un an et demi sans doc claire").
- **Fait** :
  1. Audit du repo : confirmation que `README.md`, `CHANGELOG.md`, `TODO.md`, `AGENTS.md`,
     `claude.md`, `MULTISPORT.md`, `CLUBS.md`, `CONTRIBUTING.md` n'avaient été touchés
     qu'une seule fois depuis juin (un seul commit), alors que 58 commits de fond ont suivi ;
     `CHANGELOG.md`/`TODO.md` se sont avérés figés depuis le **2024-02-02** (daté
     explicitement dans `TODO.md`), et `claude.md` décrivait encore un `script.js` monolithique
     de 10 000+ lignes sans modules — alors que la migration vers `src/*.iife.js` (16 modules)
     était en réalité terminée (`script.js` ne fait plus que ~37 lignes) et que `claude.md`
     mentionnait une checkbox globale "Mode Chrono" **supprimée** depuis l'introduction du
     mode Multisport.
  2. Réécriture de `AGENTS.md` : architecture réelle à 16 modules (ajout de
     `clubs.iife.js`, `multisport.iife.js`, `init.iife.js`, `export-json.iife.js`,
     `export-print.iife.js` qui n'apparaissaient nulle part), section migration marquée
     "terminée", ajout d'un protocole de fin de session.
  3. Réécriture de `claude.md` : correction du mode de sélection (per-day, plus de
     checkbox globale), structure de fichiers à jour, structures de données `championship`/
     `raceData` enrichies (club, statut DISQ, lanes/couloirs), nouveaux pièges documentés
     (ne pas écrire dans `script.js`, ne pas fusionner les données Championship/Chrono même
     en Multisport), et ajout de la section "Protocole de fin de session" (ce fichier).
  4. Création de ce fichier `DEVLOG.md` comme journal chronologique.
  5. *(à suivre dans cette même session)* : mise à jour de `CHANGELOG.md`, `TODO.md`,
     `README.md`, `CONTRIBUTING.md` pour refléter l'état réel du code.
- **Fichiers/modules touchés** : `AGENTS.md`, `claude.md`, `DEVLOG.md` (+ `CHANGELOG.md`,
  `TODO.md`, `README.md`, `CONTRIBUTING.md` dans la suite de la session).
- **Commit(s)** : voir l'historique git de la branche `claude/quirky-cori-mwceum`.
- **Doc à jour ?** : CHANGELOG ✅ · AGENTS.md ✅ · TODO.md ✅ · claude.md ✅ (toute la doc a
  été reprise dans cette session, précisément pour repartir sur une base saine).
- **Suite possible** : tenir ce fichier à jour à partir de maintenant — voir le protocole
  dans `claude.md`. Envisager d'automatiser un rappel (hook `Stop` / CI) qui vérifie qu'un
  commit touchant `src/` s'accompagne d'une entrée `DEVLOG.md` récente.

---

## 📚 Reconstitution rétroactive (résumé, pas un vrai journal de session)

L'historique git visible dans cet environnement remonte à **2026-04-21** (dépôt cloné en
mode shallow) ; l'historique complet est sur `main` côté GitHub. Ce qui suit résume, par
grands blocs de dates, les 58 commits de fond faits sans mise à jour de doc — pour ne pas
perdre cette information au moment où la doc reprend vie. Le détail exact reste dans
`git log`.

- **2026-06-01/02** — Mode Chrono : édition inline (tours/distance/temps), affectation de
  club aux participants par cases à cocher, harmonisation des noms (casse), classement
  chrono par distance/temps, correctifs classement combiné.
- **2026-06-04/05** — Corrections mode Pool (attribution de scores à la mauvaise division,
  navigation clavier, listing des joueurs saisis directement dans un match).
- **2026-06-11** — Détection de noms de joueurs similaires (score de similitude,
  transpositions), affichage dynamique du nombre de tours, export PDF du classement général.
- **2026-06-19** — Compactage de l'export PDF, import de classements de pools + auto-config
  JSON.
- **2026-07-02** — Corrections du tableau à élimination directe (tour de barrage au lieu
  d'un tour saturé de BYE, croisement correct des classements importés).
- **2026-08-07** — Gros lot Multisport/Natation : barème de position pour le classement
  multisport, exports alignés sur le barème, mode couloirs (assignation manuelle, arrêt du
  chrono général au dernier couloir), import "Séries natation" façon Excel (séparateur,
  mapping de colonnes, tolérance aux données manquantes), édition club/nom/dossard des
  nageurs.
- **2026-09-03/07** — Choix du score à la création d'un match BYE ; en mode Courses :
  ajout en masse de participants (y compris format dossard+tabulation), bouton "Afficher"
  (second écran temps réel), suppression d'une épreuve, correctifs édition inline pendant
  une course en cours.
- **2026-09-10** — Ajout du statut **DISQ** (disqualifié) en mode course.

*(Cette section peut être laissée telle quelle ; elle documente une période, elle n'a pas
vocation à être mise à jour — contrairement au Journal ci-dessus.)*
