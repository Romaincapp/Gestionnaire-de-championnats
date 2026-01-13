# Create Pull Request

Créer une PR avec titre et description auto-générés.

**Modèle : Sonnet** - Nécessite analyse et rédaction.

## Workflow

1. `git log main..HEAD --oneline` pour voir les commits
2. `git diff main...HEAD` pour voir tous les changements
3. Générer titre basé sur les commits
4. Générer description avec :
   - Résumé des changements
   - Points clés
   - Instructions de test si pertinent
5. `gh pr create --title "..." --body "..."`

## Format du titre

```
type(scope): description courte
```

Basé sur le commit principal ou le thème global des changements.

## Format de la description

```markdown
## Résumé
[2-3 phrases décrivant les changements]

## Changements
- [Liste des modifications principales]

## Test
- [ ] [Checklist de test si applicable]
```

## Règles

- **Pas de questions** → analyse et crée
- Titre concis (< 72 caractères)
- Description claire et structurée
- Push la branche si pas encore fait
