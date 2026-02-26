import json

# Lire J1
with open('json/Pétanque J1.json', 'r', encoding='utf-8') as f:
    j1 = json.load(f)

# Lire J2
with open('json/Pétanque J2.json', 'r', encoding='utf-8') as f:
    j2 = json.load(f)

# Créer le fichier fusionné
merged = {
    'version': '2.0',
    'exportDate': j2['exportDate'],
    'championshipName': 'Pétanque J1 + J2',
    'championship': {
        'currentDay': 1,
        'config': j1['championship']['config'],
        'days': {}
    },
    'stats': {
        'totalPlayers': 27,
        'totalMatches': 0,
        'totalDays': 2,
        'uniquePlayersList': j1['stats']['uniquePlayersList']
    }
}

# Copier J1
merged['championship']['days']['1'] = j1['championship']['days']['1']

# Copier J2 (la journée 2 du fichier J2 devient la journée 2)
merged['championship']['days']['2'] = j2['championship']['days']['2']

# Recalculer les stats
merged['stats']['totalMatches'] = j1['stats']['totalMatches'] + j2['stats']['totalMatches']

# Sauvegarder
with open('json/Pétanque J1 J2 Fusion.json', 'w', encoding='utf-8') as f:
    json.dump(merged, f, ensure_ascii=False, indent=2)

print('Fichier fusionné créé : json/Pétanque J1 J2 Fusion.json')
print(f"Journées : {merged['stats']['totalDays']}")
print(f"Matchs J1 : {j1['stats']['totalMatches']}")
print(f"Matchs J2 : {j2['stats']['totalMatches']}")
print(f"Total matchs : {merged['stats']['totalMatches']}")
