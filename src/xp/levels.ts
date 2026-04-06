interface LevelInfo {
  level: number;
  name: string;
  minXP: number;
}

const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Apprentice',   minXP: 0 },
  { level: 2, name: 'Practitioner', minXP: 500 },
  { level: 3, name: 'Craftsman',    minXP: 1500 },
  { level: 4, name: 'Engineer',     minXP: 3500 },
  { level: 5, name: 'Architect',    minXP: 7500 },
  { level: 6, name: 'Maestro',      minXP: 15000 },
];

export interface LevelResult {
  level: number;
  name: string;
  minXP: number;
  nextMinXP: number | null;
}

/**
 * Returns the level info for a given XP total.
 * nextMinXP is null at max level.
 */
export function levelFromXP(xp: number): LevelResult {
  let current = LEVELS[0]!;
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXP) {
      current = lvl;
    } else {
      break;
    }
  }
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1] ?? null;
  return {
    level: current.level,
    name: current.name,
    minXP: current.minXP,
    nextMinXP: next ? next.minXP : null,
  };
}

export interface XPProgress {
  /** XP accumulated within the current level */
  current: number;
  /** XP required to reach the next level from current level start (null at max) */
  required: number | null;
  /** Fraction of progress to next level, 0-1 (1.0 at max level) */
  fraction: number;
}

/**
 * Returns progress within the current level (for the XP bar).
 */
export function xpProgress(xp: number): XPProgress {
  const info = levelFromXP(xp);
  if (info.nextMinXP === null) {
    return { current: xp - info.minXP, required: null, fraction: 1.0 };
  }
  const current = xp - info.minXP;
  const required = info.nextMinXP - info.minXP;
  return {
    current,
    required,
    fraction: current / required,
  };
}
