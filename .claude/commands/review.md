# Review

Analyser le code pour identifier les problèmes.

## Checklist

### Sécurité
- [ ] Injection SQL/NoSQL
- [ ] XSS
- [ ] Données sensibles exposées
- [ ] Validation inputs
- [ ] Gestion secrets/tokens

### Qualité
- [ ] Nommage clair
- [ ] Fonctions courtes
- [ ] Pas de duplication
- [ ] Gestion erreurs
- [ ] Pas de console.log

### Performance
- [ ] Requêtes N+1
- [ ] Fuites mémoire
- [ ] Opérations coûteuses en boucle

## Format de retour

Pour chaque problème :
- **Fichier:ligne** - Description
- **Sévérité** : Critique / Important / Mineur
- **Fix** : Comment corriger

## Règles
- Pas de critique de style
- Focus sur les vrais problèmes
- Pas de refactoring hors scope
