# Test

Écrire et exécuter des tests pour valider le code.

## Structure

```javascript
describe('Module', () => {
  describe('fonction', () => {
    it('devrait [comportement] quand [condition]', () => {
      // Arrange - préparer
      // Act - exécuter
      // Assert - vérifier
    })
  })
})
```

## Cas à couvrir
- Cas nominal (happy path)
- Cas limites (vide, null, undefined)
- Cas d'erreur (inputs invalides)
- Cas aux bornes (min, max, 0, -1)

## Exécuter
- Détecter le framework (Jest, Vitest, etc.)
- Lancer avec `npm test`
- Analyser les échecs, corriger

## Règles
- Un test = une assertion
- Noms descriptifs
- Tests indépendants
- Mock les dépendances externes
