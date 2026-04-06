export const COLOR_NAMES: Record<string, string> = {
  W: 'Ordem',
  U: 'Intelecto',
  B: 'Ambicao',
  R: 'Impulso',
  G: 'Instinto',
};

export const COLOR_KEYS = ['W', 'U', 'B', 'R', 'G'] as const;
export type ColorKey = typeof COLOR_KEYS[number];
export type Colors = Record<ColorKey, number>;

export const MAX_COLOR_VALUE = 20;

export interface ColorAction {
  color: ColorKey;
  delta: number; // +1 or -1
}

/**
 * Parse color distribution string like "W+3 U-1 B+2" into actions.
 * Each action costs 1 point regardless of being +1 or -1.
 * Returns null if parsing fails.
 */
export function parseColorActions(input: string): ColorAction[] | null {
  const parts = input.trim().split(/\s+/);
  const actions: ColorAction[] = [];

  for (const part of parts) {
    // Match patterns like W+3, U-1, B+2
    const match = part.match(/^([WUBRG])([+-])(\d+)$/);
    if (!match) return null;

    const color = match[1] as ColorKey;
    const sign = match[2] === '+' ? 1 : -1;
    const amount = parseInt(match[3]!, 10);

    if (amount === 0) continue;

    // Expand W+3 into 3 individual +1 actions (each costing 1 point)
    for (let i = 0; i < amount; i++) {
      actions.push({ color, delta: sign });
    }
  }

  return actions.length > 0 ? actions : null;
}

export interface DistributeResult {
  ok: boolean;
  error?: string;
  newColors: Colors;
  pointsSpent: number;
}

/**
 * Validate and apply color actions to current state.
 */
export function distributePoints(
  currentColors: Colors,
  availablePoints: number,
  actions: ColorAction[],
): DistributeResult {
  const newColors = { ...currentColors };
  const totalCost = actions.length; // each action costs 1 point

  if (totalCost > availablePoints) {
    return {
      ok: false,
      error: `Pontos insuficientes: precisa ${totalCost}, tem ${availablePoints}`,
      newColors: currentColors,
      pointsSpent: 0,
    };
  }

  // Apply all actions, checking bounds
  for (const action of actions) {
    const newVal = newColors[action.color] + action.delta;
    if (newVal < 0) {
      return {
        ok: false,
        error: `${action.color} nao pode ficar abaixo de 0 (atual: ${newColors[action.color]})`,
        newColors: currentColors,
        pointsSpent: 0,
      };
    }
    if (newVal > MAX_COLOR_VALUE) {
      return {
        ok: false,
        error: `${action.color} nao pode passar de ${MAX_COLOR_VALUE} (atual: ${newColors[action.color]})`,
        newColors: currentColors,
        pointsSpent: 0,
      };
    }
    newColors[action.color] = newVal;
  }

  return { ok: true, newColors, pointsSpent: totalCost };
}
