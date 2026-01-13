# Fix Error

Résoudre rapidement une erreur de build, lint ou runtime.

## Étapes

1. **Lire** : message complet, fichier:ligne, type d'erreur
2. **Catégoriser** : syntaxe, type, référence, runtime
3. **Localiser** : aller au fichier, lire le contexte
4. **Corriger** : fix minimal, un fix = un problème
5. **Vérifier** : relancer build/lint

## Solutions rapides

| Erreur | Fix |
|--------|-----|
| `Module not found` | Vérifier import, npm install |
| `is not defined` | Ajouter import/déclaration |
| `Cannot read property of undefined` | Ajouter vérification null |
| `Type X not assignable to Y` | Corriger le type |
| `Unexpected token` | Vérifier syntaxe/accolades |
