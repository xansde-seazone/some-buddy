interface LevelInfo {
  level: number;
  name: string;
  minXP: number;
}

// 30 levels across 6 tiers (5 levels each).
// XP anchors: Lv.2 ≈ 1 day (~100 XP), Lv.5 ≈ 1 week (~600 XP), Lv.10 ≈ 1 month (~2700 XP).
// Gaps grow smoothly — never a sudden cliff.
export const LEVELS: LevelInfo[] = [
  // Tier 1 — Apprentice (Lv 1–5)
  { level:  1, name: 'Apprentice',   minXP:     0 },
  { level:  2, name: 'Apprentice',   minXP:   100 },
  { level:  3, name: 'Apprentice',   minXP:   220 },
  { level:  4, name: 'Apprentice',   minXP:   380 },
  { level:  5, name: 'Apprentice',   minXP:   600 },
  // Tier 2 — Practitioner (Lv 6–10)
  { level:  6, name: 'Practitioner', minXP:   880 },
  { level:  7, name: 'Practitioner', minXP:  1220 },
  { level:  8, name: 'Practitioner', minXP:  1630 },
  { level:  9, name: 'Practitioner', minXP:  2120 },
  { level: 10, name: 'Practitioner', minXP:  2700 },
  // Tier 3 — Craftsman (Lv 11–15)
  { level: 11, name: 'Craftsman',    minXP:  3400 },
  { level: 12, name: 'Craftsman',    minXP:  4230 },
  { level: 13, name: 'Craftsman',    minXP:  5210 },
  { level: 14, name: 'Craftsman',    minXP:  6360 },
  { level: 15, name: 'Craftsman',    minXP:  7700 },
  // Tier 4 — Engineer (Lv 16–20)
  { level: 16, name: 'Engineer',     minXP:  9260 },
  { level: 17, name: 'Engineer',     minXP: 11080 },
  { level: 18, name: 'Engineer',     minXP: 13200 },
  { level: 19, name: 'Engineer',     minXP: 15650 },
  { level: 20, name: 'Engineer',     minXP: 18500 },
  // Tier 5 — Architect (Lv 21–25)
  { level: 21, name: 'Architect',    minXP: 21800 },
  { level: 22, name: 'Architect',    minXP: 25650 },
  { level: 23, name: 'Architect',    minXP: 30100 },
  { level: 24, name: 'Architect',    minXP: 35200 },
  { level: 25, name: 'Architect',    minXP: 41100 },
  // Tier 6 — Maestro (Lv 26–30)
  { level: 26, name: 'Maestro',      minXP: 47900 },
  { level: 27, name: 'Maestro',      minXP: 55700 },
  { level: 28, name: 'Maestro',      minXP: 64700 },
  { level: 29, name: 'Maestro',      minXP: 75100 },
  { level: 30, name: 'Maestro',      minXP: 87000 },
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

/** Returns the number of color points awarded for reaching this level */
export function colorPointsForLevel(level: number): number {
  if (level <= 1) return 0; // level 1 is starting level, no points
  if (level % 5 === 0) return 3; // milestone
  return 1; // normal level up
}

/** Returns true if this level is a milestone (multiple of 5) */
export function isMilestone(level: number): boolean {
  return level > 1 && level % 5 === 0;
}
