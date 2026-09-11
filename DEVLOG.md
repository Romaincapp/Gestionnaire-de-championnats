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
