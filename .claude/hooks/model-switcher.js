#!/usr/bin/env node
/**
 * Hook Claude Code - Model Switcher
 * Détecte les commandes slash et suggère le modèle approprié
 */

const MODEL_MAP = {
  // ============ HAIKU - Tâches simples et rapides ============
  '/commit': 'haiku',
  '/git/commit': 'haiku',
  '/fix-error': 'haiku',

  // ============ SONNET - Tâches moyennes ============
  '/debug': 'sonnet',
  '/test': 'sonnet',
  '/review': 'sonnet',
  '/refactor': 'sonnet',
  '/optimize': 'sonnet',
  '/explore': 'sonnet',
  '/oneshot': 'sonnet',
  '/git/create-pr': 'sonnet',
  '/git/fix-pr-comments': 'sonnet',
  '/create-pr': 'sonnet',
  '/fix-pr-comments': 'sonnet',

  // ============ OPUS - Tâches complexes ============
  '/feature': 'opus',
  '/architect': 'opus',
  '/plan': 'opus',
};

const MODEL_EMOJI = {
  haiku: '⚡',
  sonnet: '🎯',
  opus: '🧠',
};

const MODEL_DESC = {
  haiku: 'Rapide & économique',
  sonnet: 'Équilibré',
  opus: 'Puissant & créatif',
};

async function main() {
  let inputData = '';

  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  try {
    const data = JSON.parse(inputData);
    const prompt = (data.prompt || '').trim().toLowerCase();

    let detectedCommand = null;
    let recommendedModel = null;

    // Chercher la commande la plus spécifique d'abord
    const sortedCommands = Object.keys(MODEL_MAP).sort((a, b) => b.length - a.length);

    for (const command of sortedCommands) {
      if (prompt.startsWith(command)) {
        detectedCommand = command;
        recommendedModel = MODEL_MAP[command];
        break;
      }
    }

    if (detectedCommand && recommendedModel) {
      const emoji = MODEL_EMOJI[recommendedModel];
      const desc = MODEL_DESC[recommendedModel];

      const output = {
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext: `${emoji} MODÈLE RECOMMANDÉ: ${recommendedModel.toUpperCase()} (${desc})
┌─────────────────────────────────────────┐
│ Commande: ${detectedCommand.padEnd(28)}│
│ Si mauvais modèle: /model ${recommendedModel.padEnd(14)}│
└─────────────────────────────────────────┘`
        }
      };

      console.log(JSON.stringify(output));
    }

    process.exit(0);
  } catch (error) {
    process.exit(0);
  }
}

main();
