# Fix PR Comments

Récupérer et résoudre tous les commentaires de review d'une PR.

**Modèle : Sonnet** - Nécessite compréhension et implémentation.

## Workflow

1. Récupérer le numéro de PR (demander si pas fourni)
2. `gh pr view <num> --comments` pour voir les commentaires
3. `gh api repos/{owner}/{repo}/pulls/<num>/comments` pour les reviews
4. Pour chaque commentaire :
   - Lire le fichier concerné
   - Comprendre la demande
   - Appliquer le fix
5. Commit avec message : `fix(pr): address review comments`
6. Push

## Format des commentaires GitHub

Les commentaires peuvent être :
- **Review comments** : sur des lignes spécifiques
- **PR comments** : généraux sur la PR
- **Suggestions** : avec bloc de code suggéré

## Règles

- Traiter TOUS les commentaires, pas seulement certains
- Si un commentaire n'est pas clair → faire au mieux
- Grouper tous les fixes dans un seul commit
- Ne pas modifier du code non mentionné dans les reviews
