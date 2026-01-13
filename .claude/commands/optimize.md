# Optimize

Améliorer les performances du code.

## Règle d'or
**Mesurer avant d'optimiser.** Toujours.

## Étapes

1. **Mesurer** : établir une baseline
2. **Identifier** : trouver le vrai goulot d'étranglement
3. **Optimiser** : une seule chose à la fois
4. **Mesurer** : comparer avec la baseline

## Problèmes courants

### Frontend
- Re-renders excessifs → `useMemo`, `useCallback`, `React.memo`
- Bundle lourd → lazy loading, code splitting
- Listes longues → virtualisation

### Backend
- Requêtes lentes → index, select limité
- N+1 queries → eager loading
- Pas de cache → Redis, mémoire

### Général
- Algo inefficace → revoir la complexité
- Boucles imbriquées → restructurer
- Events spam → debounce/throttle

## Règles
- Une optimisation à la fois
- Mesurer avant/après
- Ne pas sacrifier la lisibilité sans raison
