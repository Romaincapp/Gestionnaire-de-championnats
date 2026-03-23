import json
import random

def generate_random_score():
    """Génère un score aléatoire réaliste (0-5)"""
    # Générer deux scores aléatoires entre 0 et 5
    score1 = random.randint(0, 5)
    score2 = random.randint(0, 5)
    
    # Au moins un des deux doit avoir 5 (match gagnant)
    if score1 != 5 and score2 != 5:
        if random.choice([True, False]):
            score1 = 5
        else:
            score2 = 5
    
    return score1, score2

def determine_winner(player1, player2, score1, score2):
    """Détermine le gagnant selon les scores"""
    if score1 == 5:
        return player1
    elif score2 == 5:
        return player2
    return None

def add_scores_to_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    championship = data['championship']
    
    # Ajouter des scores aux matchs de poules
    for day_num, day_data in championship['days'].items():
        if 'pools' in day_data and day_data['pools']['enabled']:
            for div_num, div_data in day_data['pools']['divisions'].items():
                matches = div_data.get('matches', [])
                for match in matches:
                    if not match['completed']:
                        score1, score2 = generate_random_score()
                        match['score1'] = score1
                        match['score2'] = score2
                        match['completed'] = True
                        match['winner'] = determine_winner(
                            match['player1'], match['player2'], score1, score2
                        )
    
    # Ajouter des scores aux phases finales manuelles si elles existent
    for day_num, day_data in championship['days'].items():
        if 'pools' in day_data and day_data['pools']['enabled']:
            for div_num, div_data in day_data['pools']['divisions'].items():
                if 'finalPhase' in div_data:
                    final_phase = div_data['finalPhase']
                    if 'matches' in final_phase:
                        for match in final_phase['matches']:
                            if not match.get('completed', False):
                                score1, score2 = generate_random_score()
                                match['score1'] = score1
                                match['score2'] = score2
                                match['completed'] = True
                                match['winner'] = determine_winner(
                                    match['player1'], match['player2'], score1, score2
                                )
                    # Gérer les rounds
                    if 'rounds' in final_phase:
                        for round_data in final_phase['rounds']:
                            if 'matches' in round_data:
                                for match in round_data['matches']:
                                    if not match.get('completed', False):
                                        score1, score2 = generate_random_score()
                                        match['score1'] = score1
                                        match['score2'] = score2
                                        match['completed'] = True
                                        match['winner'] = determine_winner(
                                            match['player1'], match['player2'], score1, score2
                                        )
    
    # Sauvegarder le fichier modifié
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Scores ajoutes a {filename}")

if __name__ == '__main__':
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    filepath = os.path.join(script_dir, 'MODE POOL TEST.json')
    add_scores_to_file(filepath)
