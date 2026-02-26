// ============================================
// MODULE MATCHS (IIFE)
// ============================================
(function(global) {
    'use strict';

    var championship = global.championship;
    var config = global.config;
    var showNotification = global.showNotification;
    var saveToLocalStorage = function() { if (typeof global.saveToLocalStorage === 'function') global.saveToLocalStorage(); };
    var getNumberOfDivisions = function() { return typeof global.getNumberOfDivisions === 'function' ? global.getNumberOfDivisions() : 3; };
    var getNumberOfCourts = function() { return typeof global.getNumberOfCourts === 'function' ? global.getNumberOfCourts() : 4; };
    var getCourtsForDivision = function(d) { return typeof global.getCourtsForDivision === 'function' ? global.getCourtsForDivision(d) : {first:1,last:4,count:4}; };
    var shuffleArray = function(arr) { return typeof global.shuffleArray === 'function' ? global.shuffleArray(arr) : arr; };
    var hasReverseMatchInDay = function(m, p1, p2) { return typeof global.hasReverseMatchInDay === 'function' ? global.hasReverseMatchInDay(m, p1, p2) : false; };
    var escapeForOnclick = function(s) { return typeof global.escapeForOnclick === 'function' ? global.escapeForOnclick(s) : s; };
    var getPlayerName = function(p) { return typeof global.getPlayerName === 'function' ? global.getPlayerName(p) : (p || ''); };

    function generateMatchesForDay(dayNumber) {
        if (!dayNumber) {
            dayNumber = championship.currentDay;
        }

        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        // NOUVEAU: Vérifier si le mode poules est activé
        if (dayData.pools && dayData.pools.enabled) {
        alert('⚠️ Mode Poules activé !\n\nUtilisez les boutons "Générer les Poules" dans la section bleue ci-dessus.');
        return;
        }

        // NOUVEAU: Détecter si certaines divisions ont exactement 4 joueurs
        const numDivisions = getNumberOfDivisions();
        let hasFourPlayerDivision = false;
        for (let div = 1; div <= numDivisions; div++) {
            const divPlayers = dayData.players[div] || [];
            if (divPlayers.length === 4) {
                hasFourPlayerDivision = true;
                break;
            }
        }

        // Demander le nombre de matchs par équipe avec un message adapté
        let promptMessage = 'Combien de matchs par équipe voulez-vous générer ?\n\n';
        if (hasFourPlayerDivision) {
            promptMessage += 'ATTENTION : Avec 4 équipes :\n';
            promptMessage += '• 3 matchs = chaque équipe affronte les 3 autres UNE fois\n';
            promptMessage += '• 4+ matchs = au moins 1 match aller-retour par équipe\n';
            promptMessage += '• 6 matchs = matchs aller-retour complets\n\n';
        }
        promptMessage += '(Recommandé: 4 matchs)\n(Min: 1, Max: 6)';

        const userInput = prompt(promptMessage, '4');
        if (userInput === null) {
            return; // Utilisateur a annulé
        }
        const targetMatchesPerPlayer = parseInt(userInput);
        if (isNaN(targetMatchesPerPlayer) || targetMatchesPerPlayer < 1 || targetMatchesPerPlayer > 6) {
            alert('⚠️ Veuillez entrer un nombre entre 1 et 6');
            return;
        }

        let reportDetails = {
            totalNewMatches: 0,
            totalRematches: 0,
            divisions: {}
        };

        for (let division = 1; division <= numDivisions; division++) {
            // Normaliser les joueurs : extraire le nom si c'est un objet {name, club}
            const divisionPlayers = (dayData.players[division] || []).map(p => getPlayerName(p));

            if (divisionPlayers.length < 2) {
                if (divisionPlayers.length === 1) {
                    alert(`Journée ${dayNumber} - Division ${division}: Il faut au moins 2 joueurs pour générer des matchs`);
                }
                continue;
            }

            dayData.matches[division] = [];

            // NOUVEAU: Détecter si on a exactement 4 joueurs (autoriser aller-retour seulement si 4+ matchs demandés)
            const allowReverseMatches = (divisionPlayers.length === 4) && (targetMatchesPerPlayer >= 4);

            const matchHistory = new Map();

            for (let i = 0; i < divisionPlayers.length; i++) {
                for (let j = i + 1; j < divisionPlayers.length; j++) {
                    const key = [divisionPlayers[i], divisionPlayers[j]].sort().join('|vs|');
                    matchHistory.set(key, 0);
                }
            }
            
            Object.keys(championship.days).forEach(day => {
                const dayNum = parseInt(day);
                
                if (dayNum !== dayNumber && 
                    championship.days[dayNum] && 
                    championship.days[dayNum].matches[division]) {
                    
                    championship.days[dayNum].matches[division].forEach(match => {
                        if (divisionPlayers.includes(match.player1) && 
                            divisionPlayers.includes(match.player2)) {
                            
                            const key = [match.player1, match.player2].sort().join('|vs|');
                            const currentCount = matchHistory.get(key) || 0;
                            matchHistory.set(key, currentCount + 1);
                        }
                    });
                }
            });
            
            const possibleMatches = [];
            for (let i = 0; i < divisionPlayers.length; i++) {
                for (let j = i + 1; j < divisionPlayers.length; j++) {
                    const player1 = divisionPlayers[i];
                    const player2 = divisionPlayers[j];
                    const key = [player1, player2].sort().join('|vs|');
                    const timesPlayed = matchHistory.get(key) || 0;
                    
                    possibleMatches.push({
                        player1: player1,
                        player2: player2,
                        timesPlayed: timesPlayed,
                        priority: timesPlayed === 0 ? 0 : timesPlayed + 10,
                        key: key,
                        randomOrder: Math.random()
                    });
                }
            }
            
            possibleMatches.sort((a, b) => {
                if (a.priority !== b.priority) return a.priority - b.priority;
                return a.randomOrder - b.randomOrder;
            });
            
            const playersMatchCount = new Map();
            divisionPlayers.forEach(p => playersMatchCount.set(p, 0));

            const matchesByTour = { 1: [], 2: [], 3: [], 4: [] };
            // Utiliser un Map<key, count> au lieu d'un Set pour permettre les matchs aller-retour
            const usedMatchesCount = new Map();
            // Avec 4 joueurs et 4+ matchs demandés, on peut jouer 2 fois contre le même adversaire
            const maxUsesPerPair = allowReverseMatches ? 2 : 1;

            for (let tour = 1; tour <= 4; tour++) {
                const playersInThisTour = new Set();

                for (const matchPair of possibleMatches) {
                    const currentUses = usedMatchesCount.get(matchPair.key) || 0;
                    if (currentUses >= maxUsesPerPair) continue;

                    if (!playersInThisTour.has(matchPair.player1) &&
                        !playersInThisTour.has(matchPair.player2)) {

                        const p1Count = playersMatchCount.get(matchPair.player1) || 0;
                        const p2Count = playersMatchCount.get(matchPair.player2) || 0;

                        if (p1Count < targetMatchesPerPlayer && p2Count < targetMatchesPerPlayer) {
                            // NOUVEAU: Vérifier qu'un match aller-retour n'existe pas déjà dans cette journée
                            // SAUF si on a exactement 4 joueurs (autoriser aller-retour)
                            const allMatchesThisDay = [];
                            for (let t = 1; t <= 4; t++) {
                                allMatchesThisDay.push(...matchesByTour[t]);
                            }

                            if (allowReverseMatches || !hasReverseMatchInDay(allMatchesThisDay, matchPair.player1, matchPair.player2)) {
                                const matchData = {
                                    player1: matchPair.player1,
                                    player2: matchPair.player2,
                                    tour: tour,
                                    score1: '',
                                    score2: '',
                                    completed: false,
                                    winner: null,
                                    timesPlayedBefore: matchPair.timesPlayed,
                                    isRematch: matchPair.timesPlayed > 0
                                };

                                matchesByTour[tour].push(matchData);
                                playersInThisTour.add(matchPair.player1);
                                playersInThisTour.add(matchPair.player2);
                                playersMatchCount.set(matchPair.player1, p1Count + 1);
                                playersMatchCount.set(matchPair.player2, p2Count + 1);
                                usedMatchesCount.set(matchPair.key, currentUses + 1);

                                if (matchPair.timesPlayed === 0) {
                                    reportDetails.totalNewMatches++;
                                } else {
                                    reportDetails.totalRematches++;
                                }
                            }
                        }
                    }

                    if (matchesByTour[tour].length >= Math.ceil(divisionPlayers.length / 2)) {
                        break;
                    }
                }
            }

            // SECOND PASSAGE: Pour les joueurs qui n'ont pas atteint leur quota,
            // on les fait jouer une 2ème fois dans un tour (contre un autre joueur en déficit)
            // On répète jusqu'à ce qu'on ne puisse plus améliorer (pour gérer les déficits > 1)
            let improved = true;
            while (improved) {
                improved = false;

                // Recalculer les joueurs en déficit et les trier par déficit décroissant (le plus en déficit en premier)
                const playersWithDeficit = divisionPlayers
                    .filter(p => (playersMatchCount.get(p) || 0) < targetMatchesPerPlayer)
                    .sort((a, b) => (playersMatchCount.get(a) || 0) - (playersMatchCount.get(b) || 0));

                if (playersWithDeficit.length < 2) break;

                // Essayer d'apparier le joueur avec le plus grand déficit en priorité
                for (let i = 0; i < playersWithDeficit.length && !improved; i++) {
                    const player1 = playersWithDeficit[i];
                    const p1Count = playersMatchCount.get(player1) || 0;
                    if (p1Count >= targetMatchesPerPlayer) continue;

                    for (let j = i + 1; j < playersWithDeficit.length; j++) {
                        const player2 = playersWithDeficit[j];
                        const p2Count = playersMatchCount.get(player2) || 0;
                        if (p2Count >= targetMatchesPerPlayer) continue;

                        const key = [player1, player2].sort().join('|vs|');
                        const currentKeyUses = usedMatchesCount.get(key) || 0;
                        if (currentKeyUses >= maxUsesPerPair) continue;

                        // Trouver le tour avec le moins de matchs pour équilibrer
                        let bestTour = 1;
                        let minMatches = matchesByTour[1].length;
                        for (let t = 2; t <= 4; t++) {
                            if (matchesByTour[t].length < minMatches) {
                                minMatches = matchesByTour[t].length;
                                bestTour = t;
                            }
                        }

                        const timesPlayed = matchHistory.get(key) || 0;
                        const matchData = {
                            player1: player1,
                            player2: player2,
                            tour: bestTour,
                            score1: '',
                            score2: '',
                            completed: false,
                            winner: null,
                            timesPlayedBefore: timesPlayed,
                            isRematch: currentKeyUses > 0 || timesPlayed > 0
                        };

                        matchesByTour[bestTour].push(matchData);
                        playersMatchCount.set(player1, p1Count + 1);
                        playersMatchCount.set(player2, p2Count + 1);
                        usedMatchesCount.set(key, currentKeyUses + 1);

                        if (timesPlayed === 0) {
                            reportDetails.totalNewMatches++;
                        } else {
                            reportDetails.totalRematches++;
                        }

                        improved = true;
                        break; // Recommencer avec la liste triée à jour
                    }
                }
            }

            for (let tour = 1; tour <= 4; tour++) {
                dayData.matches[division].push(...matchesByTour[tour]);
            }
            
            reportDetails.divisions[division] = {
                players: divisionPlayers.length,
                newMatches: dayData.matches[division].filter(m => !m.isRematch).length,
                rematches: dayData.matches[division].filter(m => m.isRematch).length,
                total: dayData.matches[division].length
            };
        }
        
        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();
        
        let summary = `✅ Matchs générés pour la Journée ${dayNumber} !\n\n`;

        for (let division = 1; division <= numDivisions; division++) {
            if (reportDetails.divisions[division]) {
                const divStats = reportDetails.divisions[division];
                summary += `Division ${division}: ${divStats.players} joueurs\n`;
                summary += `  → ${divStats.newMatches} matchs INÉDITS`;
                if (divStats.rematches > 0) {
                    summary += ` + ${divStats.rematches} revanches`;
                }
                summary += ` = ${divStats.total} matchs total\n`;
            }
        }
        
        summary += `\n📊 Résumé global :\n`;
        summary += `• ${reportDetails.totalNewMatches} nouveaux matchs\n`;
        if (reportDetails.totalRematches > 0) {
            summary += `• ${reportDetails.totalRematches} revanches (minimisées)\n`;
        }
        summary += `\n💡 L'algorithme a priorisé les matchs jamais joués !`;
        
        alert(summary);
    }
    window.generateMatchesForDay = generateMatchesForDay;

    // GÉNÉRATION OPTIMISÉE POUR 4-10 JOUEURS (4 TOURS)
    function generateMatchesOptimized4to10(dayNumber) {
        if (!dayNumber) {
            dayNumber = championship.currentDay;
        }

        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        if (dayData.pools && dayData.pools.enabled) {
            alert('⚠️ Mode Poules activé !\n\nUtilisez les boutons "Générer les Poules" dans la section bleue ci-dessus.');
            return;
        }

        const numDivisions = getNumberOfDivisions();

        let reportDetails = {
            totalNewMatches: 0,
            divisions: {}
        };

        for (let division = 1; division <= numDivisions; division++) {
            // Normaliser les joueurs : extraire le nom si c'est un objet {name, club}
            const divisionPlayers = (dayData.players[division] || []).map(p => getPlayerName(p));
            const numPlayers = divisionPlayers.length;

            if (numPlayers < 4) {
                if (numPlayers > 0) {
                    alert(`Journée ${dayNumber} - Division ${division}: Il faut au moins 4 joueurs pour cette génération optimisée`);
                }
                continue;
            }

            if (numPlayers > 10) {
                alert(`Journée ${dayNumber} - Division ${division}: Cette génération est optimisée pour 4 à 10 joueurs. Vous avez ${numPlayers} joueurs.`);
                continue;
            }

            dayData.matches[division] = [];

            // Schémas prédéfinis pour chaque nombre de joueurs (selon vos spécifications)
            const schemas = {
                4: [
                    [[0,1], [0,2], [1,3]],       // Tour 1: aller - a-b, a-c, b-d
                    [[0,3], [3,2], [1,2]],       // Tour 2: aller suite - a-d, d-c, b-c
                    [[0,1], [2,3]]               // Tour 3: retour - a-b, c-d
                ],
                5: [
                    [[0,1], [2,4], [3,4]],       // Tour 1: a-b, c-e, d-e
                    [[0,2], [1,3], [0,3]],       // Tour 2: a-c, b-d, a-d
                    [[1,4], [3,2]],              // Tour 3: b-e, d-c
                    [[0,4], [1,2]]               // Tour 4: a-e, b-c
                ],
                6: [
                    [[0,1], [2,3], [4,5]],    // Tour 1
                    [[0,2], [1,4], [3,5]],    // Tour 2
                    [[0,3], [1,5], [4,2]],    // Tour 3
                    [[0,5], [1,2], [4,3]]     // Tour 4
                ],
                7: [
                    [[0,1], [2,3], [4,5]],       // Tour 1: a-b, c-d, e-f
                    [[6,5], [0,2], [4,6]],       // Tour 2: g-f, a-c, e-g
                    [[0,3], [1,3], [1,4], [2,5]], // Tour 3: a-d, b-d, b-e, c-f
                    [[6,3], [2,6], [0,4], [1,5]]  // Tour 4: g-d, c-g, a-e, b-f
                ],
                8: [
                    [[0,1], [2,3], [4,5], [6,7]], // Tour 1
                    [[0,3], [1,2], [4,7], [5,6]], // Tour 2
                    [[0,2], [1,3], [4,6], [5,7]], // Tour 3
                    [[0,4], [2,6], [1,5], [3,7]]  // Tour 4
                ],
                9: [
                    [[0,1], [2,3], [4,5], [6,7]], // Tour 1 (i=8 BYE)
                    [[0,2], [1,3], [4,6], [5,8]], // Tour 2 (h=7 BYE)
                    [[0,3], [1,2], [4,7], [6,8]], // Tour 3 (f=5 BYE)
                    [[0,5], [1,6], [2,7], [3,8]]  // Tour 4 (e=4 BYE)
                ],
                10: [
                    [[0,1], [2,3], [4,5], [6,7], [8,9]], // Tour 1
                    [[0,2], [1,3], [4,6], [5,8], [7,9]], // Tour 2
                    [[0,3], [1,2], [4,7], [5,9], [6,8]], // Tour 3
                    [[0,5], [1,6], [2,7], [3,8], [4,9]]  // Tour 4
                ]
            };

            const schema = schemas[numPlayers];
            if (!schema) {
                alert(`Aucun schéma prédéfini pour ${numPlayers} joueurs`);
                continue;
            }

            // Générer les matchs selon le schéma
            // D'abord identifier les joueurs qui ont un BYE (pour 9 joueurs)
            const byePlayers = [];
            if (numPlayers === 9) {
                const byeMap = [8, 7, 5, 4]; // Indices des joueurs qui ont BYE à chaque tour
                byeMap.forEach((playerIdx, tourIdx) => {
                    if (!byePlayers[tourIdx]) byePlayers[tourIdx] = [];
                    byePlayers[tourIdx].push(divisionPlayers[playerIdx]);
                });
            }

            schema.forEach((tour, tourIndex) => {
                tour.forEach(([idx1, idx2]) => {
                    if (idx1 < divisionPlayers.length && idx2 < divisionPlayers.length) {
                        const player1 = divisionPlayers[idx1];
                        const player2 = divisionPlayers[idx2];

                        // NOUVEAU: Vérifier qu'un match aller-retour n'existe pas déjà dans cette journée
                        if (!hasReverseMatchInDay(dayData.matches[division], player1, player2)) {
                            const matchData = {
                                player1: player1,
                                player2: player2,
                                tour: tourIndex + 1,
                                score1: '',
                                score2: '',
                                completed: false,
                                winner: null,
                                timesPlayedBefore: 0,
                                isRematch: false
                            };

                            dayData.matches[division].push(matchData);
                            reportDetails.totalNewMatches++;
                        }
                    }
                });

                // Ajouter les BYE pour ce tour (si applicable)
                if (byePlayers[tourIndex] && byePlayers[tourIndex].length > 0) {
                    byePlayers[tourIndex].forEach(player => {
                        const byeMatch = {
                            player1: player,
                            player2: 'BYE',
                            tour: tourIndex + 1,
                            score1: 5,
                            score2: 0,
                            completed: true,
                            winner: player,
                            isBye: true
                        };
                        dayData.matches[division].push(byeMatch);
                    });
                }
            });

            reportDetails.divisions[division] = {
                players: numPlayers,
                matches: dayData.matches[division].length,
                tours: 4
            };
        }

        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();

        let summary = `✅ Matchs générés (Optimisation 4-10 joueurs) !\n\n`;

        for (let division = 1; division <= numDivisions; division++) {
            if (reportDetails.divisions[division]) {
                const divStats = reportDetails.divisions[division];
                summary += `Division ${division}: ${divStats.players} joueurs\n`;
                summary += `  → ${divStats.matches} matchs en ${divStats.tours} tours\n`;
            }
        }

        summary += `\n📊 Total: ${reportDetails.totalNewMatches} matchs générés`;
        alert(summary);
    }
    window.generateMatchesOptimized4to10 = generateMatchesOptimized4to10;

    // GÉNÉRATION PAR TERRAIN (4-10 JOUEURS PAR TERRAIN)
    function generateMatchesByCourtOptimized(dayNumber) {
        if (!dayNumber) {
            dayNumber = championship.currentDay;
        }

        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        if (dayData.pools && dayData.pools.enabled) {
            alert('⚠️ Mode Poules activé !\n\nUtilisez les boutons "Générer les Poules" dans la section bleue ci-dessus.');
            return;
        }

        const numDivisions = getNumberOfDivisions();

        let reportDetails = {
            totalMatches: 0,
            divisions: {}
        };

        // Schémas prédéfinis pour chaque nombre de joueurs
        const schemas = {
            4: [
                [[0,1], [0,2], [1,3]],
                [[0,3], [3,2], [1,2]],
                [[0,1], [2,3]]
            ],
            5: [
                [[0,1], [2,4], [3,4]],
                [[0,2], [1,3], [0,3]],
                [[1,4], [3,2]],
                [[0,4], [1,2]]
            ],
            6: [
                [[0,1], [2,3], [4,5]],
                [[0,2], [1,4], [3,5]],
                [[0,3], [1,5], [4,2]],
                [[0,5], [1,2], [4,3]]
            ],
            7: [
                [[0,1], [2,3], [4,5]],
                [[6,5], [0,2], [4,6]],
                [[0,3], [1,3], [1,4], [2,5]],
                [[6,3], [2,6], [0,4], [1,5]]
            ],
            8: [
                [[0,1], [2,3], [4,5], [6,7]],
                [[0,3], [1,2], [4,7], [5,6]],
                [[0,2], [1,3], [4,6], [5,7]],
                [[0,4], [2,6], [1,5], [3,7]]
            ],
            9: [
                [[0,1], [2,3], [4,5], [6,7]],
                [[0,2], [1,3], [4,6], [5,8]],
                [[0,3], [1,2], [4,7], [6,8]],
                [[0,5], [1,6], [2,7], [3,8]]
            ],
            10: [
                [[0,1], [2,3], [4,5], [6,7], [8,9]],
                [[0,2], [1,3], [4,6], [5,8], [7,9]],
                [[0,3], [1,2], [4,7], [5,9], [6,8]],
                [[0,5], [1,6], [2,7], [3,8], [4,9]]
            ]
        };

        for (let division = 1; division <= numDivisions; division++) {
            // Normaliser les joueurs : extraire le nom si c'est un objet {name, club}
            const divisionPlayers = (dayData.players[division] || []).map(p => getPlayerName(p));
            const numPlayers = divisionPlayers.length;

            if (numPlayers < 4) {
                if (numPlayers > 0) {
                    alert(`Division ${division}: Il faut au moins 4 joueurs pour cette génération`);
                }
                continue;
            }

            // Obtenir les terrains de cette division
            const divisionCourts = getCourtsForDivision(division);
            const numCourts = divisionCourts.count;

            // Calculer combien de joueurs par terrain (idéalement entre 4 et 10)
            const playersPerCourt = Math.floor(numPlayers / numCourts);

            if (playersPerCourt < 4) {
                alert(`Division ${division}: Pas assez de joueurs pour les ${numCourts} terrains.\n\n` +
                      `Vous avez ${numPlayers} joueurs, il faut au moins ${numCourts * 4} joueurs (4 par terrain).\n\n` +
                      `Options:\n` +
                      `- Réduire le nombre de terrains\n` +
                      `- Ajouter plus de joueurs\n` +
                      `- Utiliser une autre méthode de génération`);
                continue;
            }

            if (playersPerCourt > 10) {
                alert(`Division ${division}: Trop de joueurs par terrain.\n\n` +
                      `Avec ${numPlayers} joueurs sur ${numCourts} terrains = ${playersPerCourt} joueurs/terrain.\n\n` +
                      `Maximum: 10 joueurs par terrain.\n\n` +
                      `Options:\n` +
                      `- Augmenter le nombre de terrains\n` +
                      `- Utiliser une autre méthode de génération`);
                continue;
            }

            dayData.matches[division] = [];

            // Mélanger les joueurs pour une répartition équitable
            const shuffledPlayers = [...divisionPlayers].sort(() => Math.random() - 0.5);

            // Répartir les joueurs sur les terrains
            const courtAssignments = [];
            const remainingPlayers = numPlayers % numCourts; // Joueurs en surplus
            let currentPlayerIndex = 0;

            for (let courtIdx = 0; courtIdx < numCourts; courtIdx++) {
                // Les premiers terrains reçoivent un joueur supplémentaire si nécessaire
                const playersForThisCourt = playersPerCourt + (courtIdx < remainingPlayers ? 1 : 0);

                const courtPlayers = shuffledPlayers.slice(currentPlayerIndex, currentPlayerIndex + playersForThisCourt);
                const actualCourtNumber = divisionCourts.first + courtIdx;

                courtAssignments.push({
                    court: actualCourtNumber,
                    players: courtPlayers,
                    numPlayers: courtPlayers.length
                });

                currentPlayerIndex += playersForThisCourt;
            }

            // Vérification : tous les joueurs doivent être assignés
            const totalAssigned = courtAssignments.reduce((sum, ca) => sum + ca.numPlayers, 0);
            if (totalAssigned !== numPlayers) {
                console.error(`⚠️ Erreur: ${totalAssigned}/${numPlayers} joueurs assignés`);
                alert(`Erreur de répartition dans Division ${division}: seulement ${totalAssigned}/${numPlayers} joueurs assignés!`);
                continue;
            }

            // Générer les matchs pour chaque terrain
            let totalMatchesGenerated = 0;

            courtAssignments.forEach(courtAssignment => {
                const { court, players, numPlayers: courtNumPlayers } = courtAssignment;

                // Vérifier si on a un schéma pour ce nombre de joueurs
                const schema = schemas[courtNumPlayers];
                if (!schema) {
                    console.warn(`Pas de schéma pour ${courtNumPlayers} joueurs sur terrain ${court}`);
                    return;
                }

                // Générer les matchs selon le schéma
                const byePlayers = [];
                if (courtNumPlayers === 9) {
                    const byeMap = [8, 7, 5, 4];
                    byeMap.forEach((playerIdx, tourIdx) => {
                        if (!byePlayers[tourIdx]) byePlayers[tourIdx] = [];
                        byePlayers[tourIdx].push(players[playerIdx]);
                    });
                }

                schema.forEach((tour, tourIndex) => {
                    tour.forEach(([idx1, idx2]) => {
                        if (idx1 < players.length && idx2 < players.length) {
                            const player1 = players[idx1];
                            const player2 = players[idx2];

                            // NOUVEAU: Vérifier qu'un match aller-retour n'existe pas déjà dans cette journée
                            if (!hasReverseMatchInDay(dayData.matches[division], player1, player2)) {
                                const matchData = {
                                    player1: player1,
                                    player2: player2,
                                    tour: tourIndex + 1,
                                    court: court,
                                    score1: '',
                                    score2: '',
                                    completed: false,
                                    winner: null,
                                    timesPlayedBefore: 0,
                                    isRematch: false
                                };

                                dayData.matches[division].push(matchData);
                                totalMatchesGenerated++;
                            }
                        }
                    });

                    // Ajouter les BYE pour ce tour (si applicable)
                    if (byePlayers[tourIndex] && byePlayers[tourIndex].length > 0) {
                        byePlayers[tourIndex].forEach(player => {
                            const byeMatch = {
                                player1: player,
                                player2: 'BYE',
                                tour: tourIndex + 1,
                                court: court,
                                score1: 5,
                                score2: 0,
                                completed: true,
                                winner: player,
                                isBye: true
                            };
                            dayData.matches[division].push(byeMatch);
                        });
                    }
                });
            });

            reportDetails.divisions[division] = {
                players: numPlayers,
                courts: numCourts,
                playersPerCourt: playersPerCourt,
                matches: totalMatchesGenerated,
                courtAssignments: courtAssignments
            };

            reportDetails.totalMatches += totalMatchesGenerated;
        }

        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();

        let summary = `✅ Matchs générés par terrain (4-10 joueurs/terrain) !\n\n`;

        for (let division = 1; division <= numDivisions; division++) {
            if (reportDetails.divisions[division]) {
                const divStats = reportDetails.divisions[division];

                // Vérifier que tous les joueurs sont bien assignés
                const totalPlayersAssigned = divStats.courtAssignments.reduce((sum, ca) => sum + ca.numPlayers, 0);
                const allPlayersAssigned = totalPlayersAssigned === divStats.players;

                summary += `Division ${division}:\n`;
                summary += `  👥 ${divStats.players} joueurs ${allPlayersAssigned ? '✓ TOUS' : '⚠️ ATTENTION'} répartis sur ${divStats.courts} terrains\n`;
                summary += `  ⚔️ ${divStats.matches} matchs générés\n\n`;

                divStats.courtAssignments.forEach(ca => {
                    summary += `  • Terrain ${ca.court}: ${ca.numPlayers} joueurs (${ca.players.slice(0, 3).join(', ')}${ca.players.length > 3 ? '...' : ''})\n`;
                });
                summary += '\n';
            }
        }

        summary += `📊 Total: ${reportDetails.totalMatches} matchs générés\n`;
        summary += `✅ Tous les joueurs ont été assignés à un terrain !`;
        alert(summary);
    }
    window.generateMatchesByCourtOptimized = generateMatchesByCourtOptimized;

    // SYSTÈME SWISS SYSTEM
    function generateMatchesSwissSystem(dayNumber) {
        if (!dayNumber) {
            dayNumber = championship.currentDay;
        }

        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        if (dayData.pools && dayData.pools.enabled) {
            alert('⚠️ Mode Poules activé !');
            return;
        }

        // Vérifier si des matchs existent déjà pour ce jour
        const numDivisions = getNumberOfDivisions();
        let hasExistingMatches = false;
        for (let division = 1; division <= numDivisions; division++) {
            if (dayData.matches[division] && dayData.matches[division].length > 0) {
                hasExistingMatches = true;
                break;
            }
        }

        if (!hasExistingMatches) {
            alert('⚠️ Swiss System nécessite un classement existant.\n\nPour la première journée, utilisez la génération Round-Robin classique.');
            return;
        }

        let reportDetails = {
            totalMatches: 0,
            divisions: {}
        };

        for (let division = 1; division <= numDivisions; division++) {
            // Normaliser les joueurs : extraire le nom si c'est un objet {name, club}
            const divisionPlayers = (dayData.players[division] || []).map(p => getPlayerName(p));

            if (divisionPlayers.length < 2) {
                continue;
            }

            // Calculer le classement actuel des joueurs
            const playerStats = new Map();
            divisionPlayers.forEach(player => {
                playerStats.set(player, {
                    name: player,
                    points: 0,
                    wins: 0,
                    losses: 0,
                    played: 0,
                    opponents: new Set()
                });
            });

            // Analyser tous les matchs précédents
            Object.keys(championship.days).forEach(day => {
                const dayNum = parseInt(day);
                if (championship.days[dayNum] && championship.days[dayNum].matches[division]) {
                    championship.days[dayNum].matches[division].forEach(match => {
                        if (match.completed && divisionPlayers.includes(match.player1) && divisionPlayers.includes(match.player2)) {
                            const p1Stats = playerStats.get(match.player1);
                            const p2Stats = playerStats.get(match.player2);

                            if (p1Stats && p2Stats) {
                                p1Stats.played++;
                                p2Stats.played++;
                                p1Stats.opponents.add(match.player2);
                                p2Stats.opponents.add(match.player1);

                                if (match.winner === match.player1) {
                                    p1Stats.wins++;
                                    p1Stats.points += 3;
                                    p2Stats.losses++;
                                } else if (match.winner === match.player2) {
                                    p2Stats.wins++;
                                    p2Stats.points += 3;
                                    p1Stats.losses++;
                                } else {
                                    // Match nul
                                    p1Stats.points += 1;
                                    p2Stats.points += 1;
                                }
                            }
                        }
                    });
                }
            });

            // Trier les joueurs par points (système Swiss)
            const sortedPlayers = Array.from(playerStats.values()).sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.wins !== a.wins) return b.wins - a.wins;
                return a.played - b.played;
            });

            // Générer les paires selon le système Swiss (joueurs de niveau similaire)
            const matches = [];
            const paired = new Set();

            for (let i = 0; i < sortedPlayers.length; i++) {
                if (paired.has(sortedPlayers[i].name)) continue;

                // Chercher le meilleur adversaire disponible
                let opponent = null;
                for (let j = i + 1; j < sortedPlayers.length; j++) {
                    if (paired.has(sortedPlayers[j].name)) continue;

                    // Préférer un adversaire qu'on n'a jamais affronté
                    if (!sortedPlayers[i].opponents.has(sortedPlayers[j].name)) {
                        opponent = sortedPlayers[j];
                        break;
                    }
                }

                // Si tous les adversaires ont déjà été affrontés, prendre le premier disponible
                if (!opponent) {
                    for (let j = i + 1; j < sortedPlayers.length; j++) {
                        if (!paired.has(sortedPlayers[j].name)) {
                            opponent = sortedPlayers[j];
                            break;
                        }
                    }
                }

                if (opponent) {
                    matches.push({
                        player1: sortedPlayers[i].name,
                        player2: opponent.name,
                        tour: 1,
                        score1: '',
                        score2: '',
                        completed: false,
                        winner: null,
                        p1Points: sortedPlayers[i].points,
                        p2Points: opponent.points
                    });
                    paired.add(sortedPlayers[i].name);
                    paired.add(opponent.name);
                }
            }

            dayData.matches[division] = matches;
            reportDetails.totalMatches += matches.length;
            reportDetails.divisions[division] = {
                players: divisionPlayers.length,
                matches: matches.length
            };
        }

        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();

        let summary = `✅ Matchs générés (Swiss System) !\n\n`;
        summary += `Les joueurs sont appariés selon leur classement actuel.\n\n`;

        for (let division = 1; division <= numDivisions; division++) {
            if (reportDetails.divisions[division]) {
                const divStats = reportDetails.divisions[division];
                summary += `Division ${division}: ${divStats.matches} matchs\n`;
            }
        }

        alert(summary);
    }
    window.generateMatchesSwissSystem = generateMatchesSwissSystem;

    // AFFICHAGE DES MATCHS
    function updateMatchesDisplay(dayNumber) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        const numDivisions = getNumberOfDivisions();
        const numCourts = getNumberOfCourts();

        for (let division = 1; division <= numDivisions; division++) {
            const container = document.getElementById(`division${dayNumber}-${division}-matches`);
            if (!container) continue;

            if (!dayData.matches[division] || dayData.matches[division].length === 0) {
                container.innerHTML = '';
                continue;
            }

            const matchsByTour = {};
            dayData.matches[division].forEach(match => {
                if (!matchsByTour[match.tour]) {
                    matchsByTour[match.tour] = [];
                }
                matchsByTour[match.tour].push(match);
            });

            let html = '';

            for (let tour = 1; tour <= 4; tour++) {
                if (matchsByTour[tour] && matchsByTour[tour].length > 0) {
                    const tourMatches = matchsByTour[tour];
                    const completedMatches = tourMatches.filter(m => m.completed).length;
                    const totalMatches = tourMatches.length;

                    html += `
                        <div class="tour-section">
                            <div class="tour-header" data-day="${dayNumber}" data-division="${division}" data-tour="${tour}" style="cursor: pointer;">
                                <div class="tour-title">🎯 Tour ${tour}</div>
                                <div class="tour-progress" id="progress-d${dayNumber}-div${division}-t${tour}">${completedMatches}/${totalMatches} terminés</div>
                            </div>
                            <div class="tour-matches" id="tour${dayNumber}-${division}-${tour}">
                    `;

                    // Obtenir la plage de terrains pour cette division
                    const divisionCourts = getCourtsForDivision(division);

                    // Organiser les matchs par terrain
                    const matchesByCourt = {};
                    tourMatches.forEach((match, idx) => {
                        // Assigner automatiquement un terrain si pas déjà fait
                        if (!match.court) {
                            // Calculer le numéro de terrain relatif (0 à count-1)
                            const relativeCourtIndex = idx % divisionCourts.count;
                            // Convertir en numéro de terrain absolu
                            match.court = divisionCourts.first + relativeCourtIndex;
                        }
                        if (!matchesByCourt[match.court]) {
                            matchesByCourt[match.court] = [];
                        }
                        matchesByCourt[match.court].push(match);
                    });

                    // Afficher par terrain (uniquement les terrains de cette division)
                    for (let court = divisionCourts.first; court <= divisionCourts.last; court++) {
                        const courtMatches = matchesByCourt[court] || [];
                        if (courtMatches.length === 0) continue;

                        html += `
                            <div class="court-container">
                                <div class="court-title">
                                    🎾 Terrain ${court}
                                </div>
                        `;

                        courtMatches.forEach((match, matchIndex) => {
                        const globalIndex = dayData.matches[division].indexOf(match);
                        const matchStatus = match.completed ? 'completed' : 'pending';
                        const statusClass = match.completed ? 'status-completed' : 'status-pending';
                        const statusText = match.completed ? 'Terminé' : 'En cours';
                        
                        const score1 = match.score1 || 0;
                        const score2 = match.score2 || 0;
                        const collapsedSummary = match.completed ? `${match.player1} <span class="collapse-score">${score1}-${score2}</span> ${match.player2}` : '';

                        html += `
                            <div class="match ${matchStatus}" data-match-id="d${dayNumber}-div${division}-m${globalIndex}" style="position: relative;">
                                ${window.showForfaitButtons ? `<button onclick="event.stopPropagation(); deleteMatch(${dayNumber}, ${division}, ${globalIndex})"
                                        title="Supprimer ce match"
                                        style="position: absolute; top: 50%; right: 5px; transform: translateY(-50%);
                                               width: 18px; height: 18px; z-index: 10;
                                               background: #e74c3c; color: white; border: none; border-radius: 50%;
                                               font-size: 11px; cursor: pointer; line-height: 1; padding: 0;
                                               opacity: 0.6; transition: opacity 0.2s;"
                                        onmouseover="this.style.opacity='1'"
                                        onmouseout="this.style.opacity='0.6'">×</button>` : ''}
                                ${match.completed || collapsedSummary ? `<div class="match-header" onclick="toggleMatchCollapse(this.parentElement)" style="cursor: pointer;">
                                    ${match.completed ? `<div class="player-names">${collapsedSummary}</div>` : ''}
                                    ${match.completed ? `<div class="match-status ${statusClass}">${statusText}</div>` : ''}
                                </div>` : ''}
                                <div class="sets-container">
                                    <div class="set">
                                        <div class="set-scores">
                                            <span class="player-name-left">${match.player1}</span>
                                            <div class="score-center">
                                                <input type="number" class="score-input"
                                                       placeholder="0" min="0"
                                                       value="${match.score1 === null || match.score1 === undefined ? '' : match.score1}"
                                                       onchange="updateMatchScore(${dayNumber}, ${division}, ${globalIndex}, 'score1', this.value)"
                                                       onkeydown="handleEnterKey(event, ${dayNumber}, ${division}, ${globalIndex})">
                                                <span class="score-separator">-</span>
                                                <input type="number" class="score-input"
                                                       placeholder="0" min="0"
                                                       value="${match.score2 === null || match.score2 === undefined ? '' : match.score2}"
                                                       onchange="updateMatchScore(${dayNumber}, ${division}, ${globalIndex}, 'score2', this.value)"
                                                       onkeydown="handleEnterKey(event, ${dayNumber}, ${division}, ${globalIndex})">
                                            </div>
                                            <span class="player-name-right">${match.player2}</span>
                                        </div>
                                        ${!match.completed && window.showForfaitButtons ? `
                                        <div style="display: flex; gap: 4px; justify-content: center; margin-top: 6px;">
                                            <button onclick="declareForfait('regular', ${dayNumber}, ${division}, ${globalIndex}, 'player1')"
                                                    style="padding: 2px 6px; font-size: 10px; background: #e74c3c; color: white;
                                                           border: none; border-radius: 3px; cursor: pointer;"
                                                    title="Forfait ${match.player1}">F1</button>
                                            <button onclick="declareForfait('regular', ${dayNumber}, ${division}, ${globalIndex}, 'player2')"
                                                    style="padding: 2px 6px; font-size: 10px; background: #e74c3c; color: white;
                                                           border: none; border-radius: 3px; cursor: pointer;"
                                                    title="Forfait ${match.player2}">F2</button>
                                        </div>
                                        ` : ''}
                                    </div>
                                </div>
                        `;

                        if (match.completed && match.winner) {
                            const forfaitText = match.forfaitBy ? ' (forfait)' : '';
                            html += `
                                <div class="match-result result-completed ${match.forfaitBy ? 'result-forfait' : ''}">
                                    ${match.forfaitBy ? '⚠️' : '🏆'} ${match.winner} remporte le match${forfaitText} (${score1}-${score2})
                                </div>
                            `;
                        } else if (match.completed && match.winner === null) {
                            html += `
                                <div class="match-result result-completed result-draw">
                                    🤝 Match nul (${score1}-${score2})
                                </div>
                            `;
                        }

                        html += `
                            </div>
                        `;
                        });

                        html += `
                            </div>
                        `;
                    }

                    html += `
                            </div>
                        </div>
                    `;
                }
            }

            container.innerHTML = html;
        }

        // Ouvrir le premier tour de chaque division et installer les event listeners
        setTimeout(() => {
            // Ouvrir le premier tour de chaque division
            for (let div = 1; div <= numDivisions; div++) {
                const firstTour = document.getElementById(`tour${dayNumber}-${div}-1`);
                if (firstTour) {
                    firstTour.classList.add('active');
                }
            }

            // Installer un event listener global avec délégation d'événements
            const divisionsContainer = document.getElementById(`divisions-${dayNumber}`);
            if (divisionsContainer && !divisionsContainer.hasAttribute('data-tour-listener')) {
                divisionsContainer.addEventListener('click', function(e) {
                    const tourHeader = e.target.closest('.tour-header');
                    if (tourHeader) {
                        const day = parseInt(tourHeader.getAttribute('data-day'));
                        const division = parseInt(tourHeader.getAttribute('data-division'));
                        const tour = parseInt(tourHeader.getAttribute('data-tour'));
                        if (day && division && tour) {
                            toggleTour(day, division, tour);
                        }
                    }
                });
                divisionsContainer.setAttribute('data-tour-listener', 'true');
            }
        }, 100);
    }

    function toggleTour(dayNumber, division, tour) {
        const tourElement = document.getElementById(`tour${dayNumber}-${division}-${tour}`);
        if (tourElement) {
            tourElement.classList.toggle('active');
        }
    }
    window.toggleTour = toggleTour;

    function togglePlayersList(dayNumber, division) {
        const container = document.getElementById(`players-list-container-${dayNumber}-${division}`);
        const toggleIcon = document.getElementById(`players-list-toggle-${dayNumber}-${division}`);
        if (container) {
            container.classList.toggle('active');
            if (toggleIcon) {
                toggleIcon.textContent = container.classList.contains('active') ? '▼' : '▶';
            }
        }
    }
    window.togglePlayersList = togglePlayersList;

    function toggleMatchCollapse(matchElement) {
        if (!matchElement) return;
        matchElement.classList.toggle('collapsed');

        // Persister l'état collapsed dans l'objet match
        const matchId = matchElement.getAttribute('data-match-id');
        const divisionAttr = matchElement.getAttribute('data-division');

        if (matchId) {
            const dayNumber = championship.currentDay;
            const dayData = championship.days[dayNumber];
            const numDivisions = championship.config.numDivisions || 3;

            // Chercher dans les pools
            if (dayData.pools && dayData.pools.enabled) {
                for (let division = 1; division <= numDivisions; division++) {
                    const match = dayData.pools.divisions[division].matches.find(m => m.id == matchId);
                    if (match) {
                        match.isCollapsed = matchElement.classList.contains('collapsed');
                        saveToLocalStorage();
                        return;
                    }
                }
            }

            // Chercher dans la phase finale manuelle
            if (dayData.pools && dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.divisions) {
                for (let division = 1; division <= numDivisions; division++) {
                    const rounds = dayData.pools.manualFinalPhase.divisions[division]?.rounds;
                    if (rounds) {
                        for (const roundName in rounds) {
                            const match = rounds[roundName].matches.find(m => m.id === matchId);
                            if (match) {
                                match.isCollapsed = matchElement.classList.contains('collapsed');
                                saveToLocalStorage();
                                return;
                            }
                        }
                    }
                }
            }

            // Chercher dans les matchs normaux (pour les manual-match)
            if (divisionAttr) {
                const division = parseInt(divisionAttr);
                const matches = dayData.matches[division];
                if (matches) {
                    const matchIndex = parseInt(matchId);
                    if (matches[matchIndex]) {
                        matches[matchIndex].isCollapsed = matchElement.classList.contains('collapsed');
                        saveToLocalStorage();
                    }
                }
            }
        }
    }
    window.toggleMatchCollapse = toggleMatchCollapse;

    function updateSetScore(dayNumber, division, matchIndex, setIndex, scoreField, value) {
        championship.days[dayNumber].matches[division][matchIndex].sets[setIndex][scoreField] = value;
        saveToLocalStorage();
    }
    window.updateSetScore = updateSetScore;

    function updateMatchScore(dayNumber, division, matchIndex, scoreField, value) {
        const match = championship.days[dayNumber].matches[division][matchIndex];
        match[scoreField] = value;
        // Annuler le forfait si les scores sont modifiés manuellement
        if (match.forfaitBy) {
            delete match.forfaitBy;
        }
        saveToLocalStorage();
    }
    window.updateMatchScore = updateMatchScore;

    function deleteMatch(dayNumber, division, matchIndex) {
        const match = championship.days[dayNumber].matches[division][matchIndex];
        if (!match) return;

        const confirmMsg = `Supprimer ce match ?\n\n${match.player1} vs ${match.player2}`;
        if (!confirm(confirmMsg)) return;

        // Supprimer le match du tableau
        championship.days[dayNumber].matches[division].splice(matchIndex, 1);

        saveToLocalStorage();
        updateMatchesDisplay(dayNumber);
        showNotification(`Match supprimé`, 'warning');
    }
    window.deleteMatch = deleteMatch;

    function deletePoolMatch(dayNumber, matchId, division) {
        const dayData = championship.days[dayNumber];
        if (!dayData || !dayData.pools || !dayData.pools.divisions || !dayData.pools.divisions[division]) return;

        const poolDiv = dayData.pools.divisions[division];
        if (!poolDiv.matches) return;

        const matchIndex = poolDiv.matches.findIndex(m => m.id === matchId);
        if (matchIndex === -1) return;

        const match = poolDiv.matches[matchIndex];
        const confirmMsg = `Supprimer ce match de poule ?\n\n${match.player1} vs ${match.player2}`;
        if (!confirm(confirmMsg)) return;

        // Supprimer le match
        poolDiv.matches.splice(matchIndex, 1);

        saveToLocalStorage();
        updatePoolsDisplay(dayNumber);
        showNotification(`Match de poule supprimé`, 'warning');
    }
    window.deletePoolMatch = deletePoolMatch;

    // ======================================
    // AJOUT MANUEL DE MATCHS DANS LES POOLS
    // ======================================

    function showAddPoolMatchModal(dayNumber, division, poolIndex) {
        const dayData = championship.days[dayNumber];
        if (!dayData || !dayData.pools || !dayData.pools.divisions || !dayData.pools.divisions[division]) {
            showNotification('Erreur: données de pool non trouvées', 'error');
            return;
        }

        const pools = dayData.pools.divisions[division].pools;
        if (!pools || !pools[poolIndex]) {
            showNotification('Erreur: pool non trouvée', 'error');
            return;
        }

        const allPoolPlayers = pools[poolIndex];
        const realPlayers = allPoolPlayers.filter(p => !p.startsWith('BYE'));
        const poolName = `Poule ${String.fromCharCode(65 + poolIndex)}`;

        // Options: joueurs réels + option BYE toujours disponible à la fin
        let playerOptions = realPlayers.map(p => `<option value="${p}">${p}</option>`).join('');
        playerOptions += `<option value="BYE">--- BYE (repos) ---</option>`;

        const modalHTML = `
            <div id="add-pool-match-modal" style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); display: flex; align-items: center;
                justify-content: center; z-index: 10000;
            " onclick="if(event.target === this) this.remove()">
                <div style="
                    background: white; border-radius: 12px; padding: 25px;
                    max-width: 400px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                " onclick="event.stopPropagation()">
                    <h3 style="margin: 0 0 20px 0; color: #2c3e50; text-align: center;">
                        Ajouter un match - ${poolName}
                    </h3>
                    <p style="color: #7f8c8d; font-size: 14px; text-align: center; margin-bottom: 20px;">
                        Division ${division} - Journée ${dayNumber}
                    </p>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #34495e;">
                            Joueur 1
                        </label>
                        <select id="add-match-player1" style="
                            width: 100%; padding: 10px; border: 2px solid #ecf0f1;
                            border-radius: 8px; font-size: 14px;
                        ">
                            ${playerOptions}
                        </select>
                    </div>

                    <div style="text-align: center; margin: 10px 0; font-weight: bold; color: #3498db;">
                        VS
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #34495e;">
                            Joueur 2
                        </label>
                        <select id="add-match-player2" style="
                            width: 100%; padding: 10px; border: 2px solid #ecf0f1;
                            border-radius: 8px; font-size: 14px;
                        ">
                            ${playerOptions}
                        </select>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="document.getElementById('add-pool-match-modal').remove()" style="
                            padding: 10px 25px; background: #95a5a6; color: white;
                            border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
                        ">Annuler</button>
                        <button onclick="addManualPoolMatch(${dayNumber}, ${division}, ${poolIndex})" style="
                            padding: 10px 25px; background: #27ae60; color: white;
                            border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
                        ">Ajouter</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Sélectionner le 2ème joueur par défaut pour éviter le même joueur
        const select2 = document.getElementById('add-match-player2');
        if (select2 && poolPlayers.length > 1) {
            select2.selectedIndex = 1;
        }
    }
    window.showAddPoolMatchModal = showAddPoolMatchModal;

    function addManualPoolMatch(dayNumber, division, poolIndex) {
        const player1 = document.getElementById('add-match-player1').value;
        const player2 = document.getElementById('add-match-player2').value;

        if (player1 === player2) {
            showNotification('Veuillez sélectionner deux joueurs différents', 'error');
            return;
        }

        const dayData = championship.days[dayNumber];
        const poolDiv = dayData.pools.divisions[division];

        // Créer le nouveau match (scores vides, à remplir manuellement)
        const newMatch = {
            id: 'manual-' + Date.now(),
            player1: player1,
            player2: player2,
            poolIndex: poolIndex,
            poolName: `Poule ${String.fromCharCode(65 + poolIndex)}`,
            division: division,
            dayNumber: dayNumber,
            score1: '',
            score2: '',
            completed: false,
            winner: null,
            isPoolMatch: true,
            isByeMatch: false,
            isManualMatch: true
        };

        // Ajouter le match
        poolDiv.matches.push(newMatch);

        // Fermer le modal
        const modal = document.getElementById('add-pool-match-modal');
        if (modal) modal.remove();

        // Sauvegarder et rafraîchir
        saveToLocalStorage();
        updatePoolsDisplay(dayNumber);
        showNotification(`Match ajouté: ${player1} vs ${player2}`, 'success');
    }
    window.addManualPoolMatch = addManualPoolMatch;

    function deleteManualMatch(dayNumber, division, roundName, position) {
        const dayData = championship.days[dayNumber];
        if (!dayData || !dayData.pools || !dayData.pools.manualFinalPhase) return;

        const manualPhase = dayData.pools.manualFinalPhase;
        if (!manualPhase.matches || !manualPhase.matches[division]) return;

        const matches = manualPhase.matches[division];
        const matchIndex = matches.findIndex(m => m.round === roundName && m.position === position);
        if (matchIndex === -1) return;

        const match = matches[matchIndex];
        const confirmMsg = `Supprimer ce match de phase finale ?\n\n${match.player1 || '?'} vs ${match.player2 || '?'}`;
        if (!confirm(confirmMsg)) return;

        // Supprimer le match
        matches.splice(matchIndex, 1);

        saveToLocalStorage();
        updateManualFinalPhaseDisplay(dayNumber);
        showNotification(`Match de phase finale supprimé`, 'warning');
    }
    window.deleteManualMatch = deleteManualMatch;

    function handleEnterKey(event, dayNumber, division, matchIndex) {
        const match = championship.days[dayNumber].matches[division][matchIndex];
        const shouldValidate = event.key === 'Enter' ||
                               (event.key === 'Tab' && match.score1 !== undefined && match.score1 !== '' &&
                                match.score2 !== undefined && match.score2 !== '');

        if (shouldValidate) {
            if (event.key === 'Tab' && (match.score1 === undefined || match.score1 === '' ||
                                         match.score2 === undefined || match.score2 === '')) {
                return; // Laisser Tab naviguer normalement si scores incomplets
            }

            if (event.key === 'Tab') {
                event.preventDefault(); // Empêcher navigation Tab si on valide
            }

            const wasCompleted = match.completed;

            checkMatchCompletion(dayNumber, division, matchIndex);

            const isNowCompleted = championship.days[dayNumber].matches[division][matchIndex].completed;

            updateSingleMatchDisplay(dayNumber, division, matchIndex);
            saveToLocalStorage();

            const matchElement = document.querySelector(`[data-match-id="d${dayNumber}-div${division}-m${matchIndex}"]`);
            if (matchElement) {
                matchElement.style.transform = 'scale(1.02)';
                matchElement.style.boxShadow = '0 5px 20px rgba(27, 164, 60, 0.4)';
                matchElement.style.transition = 'all 0.3s ease';

                setTimeout(() => {
                    matchElement.style.transform = '';
                    matchElement.style.boxShadow = '';
                }, 400);
            }

            if (!wasCompleted && isNowCompleted) {
                setTimeout(() => {
                    if (matchElement) {
                        matchElement.style.background = '#d5f4e6';
                        matchElement.style.borderColor = '#27ae60';
                    }
                }, 200);

                showNotification(`Match terminé: ${championship.days[dayNumber].matches[division][matchIndex].winner} gagne!`, 'success');

                // Auto-collapse le match terminé après un délai
                setTimeout(() => {
                    if (matchElement && !matchElement.classList.contains('collapsed')) {
                        toggleMatchCollapse(matchElement);
                    }
                }, 800);
            }
        }
    }
    window.handleEnterKey = handleEnterKey;

    function updateSingleMatchDisplay(dayNumber, division, matchIndex) {
        const match = championship.days[dayNumber].matches[division][matchIndex];
        const matchElement = document.querySelector(`[data-match-id="d${dayNumber}-div${division}-m${matchIndex}"]`);

        if (!matchElement) return;

        const score1 = match.score1 || 0;
        const score2 = match.score2 || 0;

        if (match.completed) {
            matchElement.classList.add('completed');

            // Créer ou mettre à jour le header
            let matchHeader = matchElement.querySelector('.match-header');
            if (!matchHeader) {
                matchHeader = document.createElement('div');
                matchHeader.className = 'match-header';
                // Insérer le header au début de matchElement, avant sets-container
                const setsContainer = matchElement.querySelector('.sets-container');
                matchElement.insertBefore(matchHeader, setsContainer);
            }

            // Ajouter onclick sur le header pour toggle collapse
            if (!matchHeader.hasAttribute('onclick')) {
                matchHeader.setAttribute('onclick', 'toggleMatchCollapse(this.parentElement)');
                matchHeader.style.cursor = 'pointer';
            }

            // Créer ou mettre à jour player-names
            let playerNamesElement = matchHeader.querySelector('.player-names');
            if (!playerNamesElement) {
                playerNamesElement = document.createElement('div');
                playerNamesElement.className = 'player-names';
                matchHeader.appendChild(playerNamesElement);
            }
            // Mettre à jour le contenu avec le format collapsed
            playerNamesElement.innerHTML = `${match.player1} <span class="collapse-score">${score1}-${score2}</span> ${match.player2}`;

            // Créer ou mettre à jour le badge de statut
            let statusElement = matchHeader.querySelector('.match-status');
            if (!statusElement) {
                statusElement = document.createElement('div');
                statusElement.className = 'match-status status-completed';
                matchHeader.appendChild(statusElement);
            } else {
                statusElement.className = 'match-status status-completed';
            }
            statusElement.textContent = 'Terminé';

            // Gérer le résultat - créer s'il n'existe pas
            if (match.winner) {
                let resultElement = matchElement.querySelector('.match-result');
                if (!resultElement) {
                    resultElement = document.createElement('div');
                    resultElement.className = 'match-result result-completed';
                    matchElement.appendChild(resultElement);
                } else {
                    resultElement.className = 'match-result result-completed';
                }
                resultElement.textContent = `🏆 ${match.winner} remporte le match (${score1}-${score2})`;
            }
        } else {
            // Match non terminé - supprimer header et résultat s'ils existent
            matchElement.classList.remove('completed');

            const matchHeader = matchElement.querySelector('.match-header');
            if (matchHeader) {
                matchHeader.remove();
            }

            const resultElement = matchElement.querySelector('.match-result');
            if (resultElement) {
                resultElement.remove();
            }
        }
        
        // Plus besoin de désactiver des sets car il n'y a plus que 2 scores
        
        updateTourProgress(dayNumber, division, match.tour);
    }

    function updateTourProgress(dayNumber, division, tour) {
        const progressElement = document.getElementById(`progress-d${dayNumber}-div${division}-t${tour}`);
        if (!progressElement) return;
        
        const tourMatches = championship.days[dayNumber].matches[division].filter(m => m.tour === tour);
        const completedMatches = tourMatches.filter(m => m.completed).length;
        const totalMatches = tourMatches.length;
        
        progressElement.textContent = `${completedMatches}/${totalMatches} terminés`;
        
        progressElement.style.background = 'rgba(46, 204, 113, 0.3)';
        setTimeout(() => {
            progressElement.style.background = 'rgba(255,255,255,0.2)';
        }, 500);
    }

    function checkMatchCompletion(dayNumber, division, matchIndex) {
        const match = championship.days[dayNumber].matches[division][matchIndex];

        // Si l'ancien format avec sets existe, le convertir
        if (match.sets && !match.hasOwnProperty('score1')) {
            let player1Sets = 0;
            let player2Sets = 0;
            match.sets.forEach((set) => {
                if (set.player1Score !== '' && set.player2Score !== '') {
                    const score1 = parseInt(set.player1Score);
                    const score2 = parseInt(set.player2Score);
                    if (score1 > score2) player1Sets++;
                    else if (score2 > score1) player2Sets++;
                }
            });
            match.score1 = player1Sets;
            match.score2 = player2Sets;
            delete match.sets;
        }

        match.completed = false;
        match.winner = null;

        if (match.score1 !== '' && match.score2 !== '') {
            const score1 = parseInt(match.score1);
            const score2 = parseInt(match.score2);

            if (score1 > score2) {
                match.completed = true;
                match.winner = match.player1;
            } else if (score2 > score1) {
                match.completed = true;
                match.winner = match.player2;
            } else {
                // En cas d'égalité, le match est terminé mais sans vainqueur
                match.completed = true;
                match.winner = null;
            }
        }
    }

    // Déclarer un forfait pour un match (régulier, poule ou phase finale)
    function declareForfait(matchType, dayNumber, division, matchId, forfaitPlayer) {
        let match = null;

        if (matchType === 'regular') {
            // Match régulier
            match = championship.days[dayNumber].matches[division][matchId];
        } else if (matchType === 'pool') {
            // Match de poule - rechercher par ID
            const poolData = championship.days[dayNumber].pools?.divisions[division];
            if (poolData && poolData.matches) {
                match = poolData.matches.find(m => m.id === matchId);
            }
        } else if (matchType === 'final') {
            // Match de phase finale manuelle - rechercher dans tous les tours
            const manualFinalPhase = championship.days[dayNumber].pools?.manualFinalPhase?.divisions[division];
            if (manualFinalPhase && manualFinalPhase.rounds) {
                Object.values(manualFinalPhase.rounds).forEach(round => {
                    if (round.matches) {
                        const foundMatch = round.matches.find(m => m.id === matchId);
                        if (foundMatch) match = foundMatch;
                    }
                });
            }
        }

        if (!match) {
            showNotification('Match non trouvé', 'error');
            return;
        }

        // Appliquer le forfait
        match.forfaitBy = forfaitPlayer; // 'player1' ou 'player2'
        match.completed = true;

        if (forfaitPlayer === 'player1') {
            match.score1 = 0;
            match.score2 = 5;
            match.winner = match.player2;
        } else {
            match.score1 = 5;
            match.score2 = 0;
            match.winner = match.player1;
        }

        saveToLocalStorage();

        // Rafraîchir l'affichage selon le type de match
        if (matchType === 'regular') {
            updateMatchesDisplay(dayNumber);
        } else if (matchType === 'pool') {
            updatePoolsDisplay(dayNumber);
        } else if (matchType === 'final') {
            updateManualFinalPhaseDisplay(dayNumber);
        }

        showNotification(`Forfait déclaré pour ${forfaitPlayer === 'player1' ? match.player1 : match.player2}`, 'warning');
    }
    window.declareForfait = declareForfait;
    window.updateMatchesDisplay = updateMatchesDisplay;
    window.checkMatchCompletion = checkMatchCompletion;


})(window);
