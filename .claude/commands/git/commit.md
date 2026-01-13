# Git Commit

Analyser les changements et créer un commit conventionnel rapidement.

**Modèle : Haiku** - Tâche simple et rapide.

## Workflow

1. `git status` pour voir l'état
2. `git diff` pour comprendre les changements
3. Si rien n'est stagé → `git add .`
4. Déterminer type + scope + message
5. `git commit -m "type(scope): description"`
6. `git push`

## Format

```
type(scope): description en minuscules
```

**Types** : feat, fix, update, refactor, docs, style, test, chore

## Règles

- **Pas de questions** → décide et exécute
- **Auto-staging** → stage tout si rien n'est stagé
- **Impératif** → "add", "fix", "update" (pas "added", "fixed")
- **Max 72 caractères**
- **Minuscules** après le `:`

## Exemples

```
feat(auth): add Google OAuth login
fix(api): handle timeout errors
update(ui): improve button hover state
refactor(utils): simplify date formatting
```

## Interdit

- Fichiers .env, secrets, credentials
- Messages vagues ("fix", "update", "wip")
- Commits mélangeant plusieurs features
