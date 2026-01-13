# OneShot

Implémentation rapide d'une feature en 3 phases : Explore → Code → Test.

**Modèle : Sonnet** - Équilibre vitesse/qualité.

## Workflow

### 1. EXPLORE (rapide)
- 1-2 agents max en parallèle
- Trouver les fichiers pertinents
- Identifier les patterns existants
- **Durée** : minimum nécessaire

### 2. CODE (immédiat)
Dès que le contexte de base est là → coder :
- Suivre les patterns existants
- Nommage clair et cohérent
- Pas de commentaires inutiles
- Pas de refactoring hors scope

### 3. TEST (validation)
- Lancer lint/typecheck
- Fixer les erreurs immédiatement
- Tests complets seulement si demandé

## Règles

- **Pas de planification longue** → explore puis code
- **Max 2 agents** en exploration
- **Scope strict** → uniquement ce qui est demandé
- **Qualité maintenue** → pas de code sale pour aller vite

## Philosophie

> "Gather context, then code. Don't overthink."

L'objectif est la vélocité sans sacrifier la qualité. Explorer juste assez pour comprendre, puis implémenter directement.

## Quand utiliser

- Features simples à moyennes
- Modifications localisées
- Quand le codebase est familier
- Quand la vitesse prime

## Quand NE PAS utiliser

- Nouvelles architectures complexes → `/feature`
- Bugs mystérieux → `/debug`
- Refactoring majeur → `/refactor`
