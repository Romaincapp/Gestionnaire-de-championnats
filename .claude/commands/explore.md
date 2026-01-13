# Explore

Exploration approfondie d'un sujet dans le codebase, la documentation et le web.

**Modèle : Sonnet** - Exploration et synthèse.

## Workflow

### 1. PLANIFIER (avant de chercher)
- Définir les termes de recherche
- Identifier les sources à explorer
- Planifier les agents à lancer

### 2. EXPLORER (en parallèle)
Lancer plusieurs agents simultanément :

**Codebase** (1-3 agents)
- Grep pour les patterns/keywords
- Glob pour les fichiers
- Read pour le contexte complet

**Documentation** (1-2 agents)
- README, docs/, wiki
- Commentaires dans le code
- Types/interfaces

**Web** (1-2 agents si besoin)
- Documentation officielle
- Stack Overflow
- Articles techniques

### 3. SYNTHÉTISER
Combiner les résultats avec :
- Chemins de fichiers exacts
- Numéros de ligne
- Extraits de code pertinents

### 4. RAPPORT
Présenter :
- Fichiers clés trouvés
- Patterns identifiés
- Exemples de code
- Connexions entre éléments

## Règles

- **Planifier AVANT de lancer les agents**
- **Lancer en parallèle** pour la vitesse
- **Inclure fichier:ligne** pour chaque référence
- **Ne pas créer de fichiers** → output seulement
- **Être exhaustif** plutôt que rapide

## Scaling

| Complexité | Agents codebase | Agents docs | Agents web |
|------------|-----------------|-------------|------------|
| Simple     | 1               | 1           | 0-1        |
| Moyenne    | 2               | 1-2         | 1          |
| Complexe   | 3               | 2           | 2          |
