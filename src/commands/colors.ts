import { loadState, saveState } from '../render/state.js';
import {
  parseColorActions,
  distributePoints,
  COLOR_KEYS,
  COLOR_NAMES,
  MAX_COLOR_VALUE,
} from '../xp/colors.js';

const COLOR_LABELS: Record<string, string> = {
  W: 'Ordem    ',
  U: 'Intelecto',
  B: 'Ambicao  ',
  R: 'Impulso  ',
  G: 'Instinto ',
};

function renderBar(value: number): string {
  const filled = Math.min(value, MAX_COLOR_VALUE);
  return '█'.repeat(filled) + '░'.repeat(MAX_COLOR_VALUE - filled);
}

export async function cmdColors(args: string[]): Promise<number> {
  const state = await loadState();

  // No args: display current colors + available points
  if (args.length === 0) {
    console.log('── Personalidade ──');
    for (const key of COLOR_KEYS) {
      const val = state.colors[key];
      const bar = renderBar(val);
      const label = COLOR_LABELS[key]!;
      console.log(`${label} (${key})  ${bar}  ${val}`);
    }
    console.log('');
    console.log(`Pontos disponiveis: ${state.colorPoints}`);
    console.log('');
    console.log('Uso: my-buddy colors W+3 U-1 B+2');
    return 0;
  }

  // With args: parse and distribute
  const input = args.join(' ');
  const actions = parseColorActions(input);

  if (!actions) {
    console.error(`Formato invalido: "${input}"`);
    console.error('Uso: my-buddy colors W+3 U-1 B+2');
    return 1;
  }

  const result = distributePoints(state.colors, state.colorPoints, actions);

  if (!result.ok) {
    console.error(`Erro: ${result.error}`);
    return 1;
  }

  // Build diff summary
  const changes: { key: string; before: number; after: number; delta: number }[] = [];
  for (const key of COLOR_KEYS) {
    const before = state.colors[key];
    const after = result.newColors[key];
    if (before !== after) {
      changes.push({ key, before, after, delta: after - before });
    }
  }

  // Update state
  state.colors = result.newColors;
  state.colorPoints = state.colorPoints - result.pointsSpent;
  await saveState(state);

  // Print distribution summary
  console.log('Distribuido:');
  for (const change of changes) {
    const sign = change.delta > 0 ? '+' : '';
    console.log(`  ${change.key}: ${change.before} → ${change.after} (${sign}${change.delta})`);
  }
  console.log('');
  console.log(`Pontos gastos: ${result.pointsSpent} | Restam: ${state.colorPoints}`);

  return 0;
}
