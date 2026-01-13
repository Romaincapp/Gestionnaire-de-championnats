# Debug

Identifier et résoudre un bug de manière méthodique.

## Étapes

1. **Comprendre** : comportement attendu vs actuel, étapes pour reproduire
2. **Localiser** : logs, stack trace, fichier:ligne
3. **Analyser** : code autour, inputs/outputs, cas limites
4. **Hypothèses** : formuler, ajouter logs temporaires, tester une par une
5. **Corriger** : fix minimal, pas de refactoring
6. **Valider** : tester le scénario + cas limites, supprimer logs de debug

## Questions à poser
- Message d'erreur exact ?
- Depuis quand ?
- Reproductible à chaque fois ?
- Environnement ?
