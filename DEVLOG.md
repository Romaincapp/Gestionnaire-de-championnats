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
