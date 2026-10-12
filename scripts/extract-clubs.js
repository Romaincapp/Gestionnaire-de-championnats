const fs = require('fs');

// Lire le fichier JSON
const path = require('path');

// Fichiers d'exemple dans examples/ (lancer : node scripts/extract-clubs.js)
const inputFile = path.join(__dirname, '..', 'examples', 'competition-chrono-2025-12-11 (1).json');
const outputFile = path.join(__dirname, '..', 'examples', 'competition-chrono-2025-12-11-with-clubs.json');

console.log(`📖 Lecture du fichier ${inputFile}...`);
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Liste des clubs connus (ordre important: du plus long au plus court)
const KNOWN_CLUBS = [
    'MARTHE ET MARIE',
    'LA CORDEE SPORTS',  // Englobe aussi "CORDEE" tout court
    'GAI SEJOUR',
    'TRUCKET',
    'RENARDS',
    'CORDEE',  // Alias pour La Cordée Sports
    'BOULAIE',
    'BATOULU'
];

// Normaliser les noms de clubs (fusionner les alias)
const CLUB_ALIASES = {
    'CORDEE': 'LA CORDEE SPORTS'
};

// Normaliser le texte pour la comparaison (enlever accents et mettre en majuscules)
function normalize(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}

// Fonction pour extraire le club d'un nom
function extractClub(name) {
    if (!name) return '';

    const normalizedName = normalize(name);

    // Chercher le premier club qui correspond au début du nom
    for (const club of KNOWN_CLUBS) {
        const normalizedClub = normalize(club);
        if (normalizedName.startsWith(normalizedClub)) {
            // Si c'est un alias, utiliser le nom principal
            const mainClub = CLUB_ALIASES[club] || club;

            // Retourner le nom du club tel quel (avec la bonne casse)
            return mainClub.split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
        }
    }

    return '';
}

// Map pour compter les clubs détectés
const clubsCount = {};

console.log('\n🔍 Extraction des clubs...\n');

// 1. Mettre à jour les participants globaux dans raceData.participants
if (data.raceData.participants) {
    data.raceData.participants.forEach(participant => {
        const club = extractClub(participant.name);
        participant.club = club || '';

        // Compter les clubs
        if (club) {
            clubsCount[club] = (clubsCount[club] || 0) + 1;
        }

        console.log(`  ${participant.bib}. ${participant.name}`);
        console.log(`     → Club: "${club || '(aucun)'}"`);
    });
}

// 2. Mettre à jour les participants dans chaque série
let totalSeriesUpdated = 0;
data.raceData.events.forEach(event => {
    event.series.forEach(serie => {
        serie.participants.forEach(participant => {
            const club = extractClub(participant.name);
            participant.club = club || '';
            totalSeriesUpdated++;
        });
    });
});

console.log('\n📊 Statistiques:\n');
console.log(`  ✅ ${data.raceData.participants.length} participants globaux mis à jour`);
console.log(`  ✅ ${totalSeriesUpdated} participants de séries mis à jour`);
console.log(`  ✅ ${Object.keys(clubsCount).length} clubs détectés:\n`);

// Trier les clubs par nombre de participants
const sortedClubs = Object.entries(clubsCount)
    .sort((a, b) => b[1] - a[1])
    .map(([club, count]) => ({ club, count }));

sortedClubs.forEach(({ club, count }) => {
    console.log(`     🏅 ${club}: ${count} participant(s)`);
});

// Sauvegarder le fichier mis à jour
console.log(`\n💾 Sauvegarde dans ${outputFile}...`);
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');

console.log('\n✨ Terminé! Le fichier a été sauvegardé avec succès.');
console.log(`\n📝 Vous pouvez maintenant importer "${outputFile}" dans votre application.`);
