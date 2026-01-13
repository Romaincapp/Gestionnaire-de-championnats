# Refactor

Améliorer la structure sans changer le comportement.

## Étapes

1. **Analyser** : comprendre le code, noter les tests existants
2. **Identifier** : duplication, fonctions longues, nommage, couplage
3. **Planifier** : lister les changements, prioriser, découper
4. **Appliquer** : un refactoring à la fois, vérifier tests après chaque étape
5. **Valider** : tests passent, comportement identique

## Techniques
- Extract function/method
- Rename variable/function
- Move to separate file
- Simplify conditionals
- Remove dead code

## Red flags
- `if` imbriqués > 3 niveaux
- Fonctions > 5 paramètres
- Fichiers > 300 lignes
- Switch/case géants

## Règles
- Pas de nouvelles features pendant un refactoring
- Petits changements incrémentaux
- Si pas de tests → en ajouter d'abord
