import { describe, it, expect, test } from 'vitest';
import {
  LEVELS,
  levelFromXP,
  xpProgress,
  colorPointsForLevel,
  isMilestone,
} from '../src/xp/levels.js';
import {
  parseColorActions,
  distributePoints,
} from '../src/xp/colors.js';
import type { Colors } from '../src/xp/colors.js';

// ---------------------------------------------------------------------------
// Batch 5 — 30-level system
// ---------------------------------------------------------------------------

describe('30-level system: basic boundaries', () => {
  it('level 1 at 0 XP', () => {
    const r = levelFromXP(0);
    expect(r.level).toBe(1);
    expect(r.name).toBe('Apprentice');
    expect(r.minXP).toBe(0);
  });

  it('level 2 at exact threshold', () => {
    const lv2 = LEVELS.find((l) => l.level === 2)!;
    const r = levelFromXP(lv2.minXP);
    expect(r.level).toBe(2);
    expect(r.name).toBe('Apprentice');
  });

  it('level 30 is max — returns Maestro with null nextMinXP', () => {
    const lv30 = LEVELS.find((l) => l.level === 30)!;
    const r = levelFromXP(lv30.minXP);
    expect(r.level).toBe(30);
    expect(r.name).toBe('Maestro');
    expect(r.nextMinXP).toBeNull();
  });

  it('XP above level 30 cap still returns level 30', () => {
    const r = levelFromXP(999999);
    expect(r.level).toBe(30);
  });
});

describe('30-level system: tier names match levels', () => {
  it('levels 1–5 are Apprentice', () => {
    for (let i = 1; i <= 5; i++) {
      expect(levelFromXP(LEVELS[i - 1]!.minXP).name).toBe('Apprentice');
    }
  });

  it('levels 6–10 are Practitioner', () => {
    for (let i = 6; i <= 10; i++) {
      expect(levelFromXP(LEVELS[i - 1]!.minXP).name).toBe('Practitioner');
    }
  });

  it('levels 11–15 are Craftsman', () => {
    for (let i = 11; i <= 15; i++) {
      expect(levelFromXP(LEVELS[i - 1]!.minXP).name).toBe('Craftsman');
    }
  });

  it('levels 16–20 are Engineer', () => {
    for (let i = 16; i <= 20; i++) {
      expect(levelFromXP(LEVELS[i - 1]!.minXP).name).toBe('Engineer');
    }
  });

  it('levels 21–25 are Architect', () => {
    for (let i = 21; i <= 25; i++) {
      expect(levelFromXP(LEVELS[i - 1]!.minXP).name).toBe('Architect');
    }
  });

  it('levels 26–30 are Maestro', () => {
    for (let i = 26; i <= 30; i++) {
      expect(levelFromXP(LEVELS[i - 1]!.minXP).name).toBe('Maestro');
    }
  });
});

describe('30-level system: xpProgress', () => {
  it('xpProgress at max level — fraction is 1.0, required is null', () => {
    const lv30 = LEVELS.find((l) => l.level === 30)!;
    const p = xpProgress(lv30.minXP + 500);
    expect(p.fraction).toBe(1.0);
    expect(p.required).toBeNull();
  });

  it('xpProgress mid-level — correct fraction', () => {
    // Level 2: minXP=100, nextMinXP=220, range=120
    // At xp=160: current=60, required=120, fraction=0.5
    const p = xpProgress(160);
    expect(p.current).toBe(60);
    expect(p.required).toBe(120);
    expect(p.fraction).toBeCloseTo(0.5, 5);
  });
});

describe('30-level system: colorPointsForLevel', () => {
  it('level 1 returns 0', () => {
    expect(colorPointsForLevel(1)).toBe(0);
  });

  it('level 2 returns 1 (normal level up)', () => {
    expect(colorPointsForLevel(2)).toBe(1);
  });

  it('level 5 returns 3 (milestone)', () => {
    expect(colorPointsForLevel(5)).toBe(3);
  });

  it('level 10 returns 3 (milestone)', () => {
    expect(colorPointsForLevel(10)).toBe(3);
  });

  it('level 7 returns 1 (normal level up)', () => {
    expect(colorPointsForLevel(7)).toBe(1);
  });
});

describe('30-level system: isMilestone', () => {
  it('levels 5, 10, 15, 20, 25, 30 are milestones', () => {
    for (const l of [5, 10, 15, 20, 25, 30]) {
      expect(isMilestone(l)).toBe(true);
    }
  });

  it('levels 1, 2, 3, 7 are not milestones', () => {
    for (const l of [1, 2, 3, 7]) {
      expect(isMilestone(l)).toBe(false);
    }
  });
});

describe('30-level system: XP curve integrity', () => {
  it('all 30 levels are defined', () => {
    expect(LEVELS).toHaveLength(30);
  });

  it('XP curve is monotonically increasing', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i]!.minXP).toBeGreaterThan(LEVELS[i - 1]!.minXP);
    }
  });

  it('level numbers are sequential 1–30', () => {
    for (let i = 0; i < LEVELS.length; i++) {
      expect(LEVELS[i]!.level).toBe(i + 1);
    }
  });
});

// ---------------------------------------------------------------------------
// Colors — parseColorActions and distributePoints
// ---------------------------------------------------------------------------

const emptyColors: Colors = { W: 0, U: 0, B: 0, R: 0, G: 0 };

describe('colors', () => {
  // parseColorActions
  test('parses valid color actions', () => {
    const actions = parseColorActions('W+1');
    expect(actions).not.toBeNull();
    expect(actions).toHaveLength(1);
    expect(actions![0]).toEqual({ color: 'W', delta: 1 });
  });

  test('returns null for invalid input', () => {
    expect(parseColorActions('X+1')).toBeNull();
    expect(parseColorActions('W1')).toBeNull();
    expect(parseColorActions('W++1')).toBeNull();
    expect(parseColorActions('')).toBeNull();
  });

  test('expands W+3 into 3 individual actions', () => {
    const actions = parseColorActions('W+3');
    expect(actions).not.toBeNull();
    expect(actions).toHaveLength(3);
    for (const a of actions!) {
      expect(a).toEqual({ color: 'W', delta: 1 });
    }
  });

  test('handles mixed + and -', () => {
    const actions = parseColorActions('W+2 U-1');
    expect(actions).not.toBeNull();
    expect(actions).toHaveLength(3);
    const wActions = actions!.filter((a) => a.color === 'W');
    const uActions = actions!.filter((a) => a.color === 'U');
    expect(wActions).toHaveLength(2);
    expect(wActions[0]).toEqual({ color: 'W', delta: 1 });
    expect(uActions).toHaveLength(1);
    expect(uActions[0]).toEqual({ color: 'U', delta: -1 });
  });

  // distributePoints
  test('distributes points successfully', () => {
    const actions = parseColorActions('W+3')!;
    const result = distributePoints(emptyColors, 5, actions);
    expect(result.ok).toBe(true);
    expect(result.newColors.W).toBe(3);
    expect(result.pointsSpent).toBe(3);
  });

  test('rejects when not enough points', () => {
    const actions = parseColorActions('W+3')!;
    const result = distributePoints(emptyColors, 2, actions);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/insuficientes/);
    expect(result.pointsSpent).toBe(0);
  });

  test('rejects when color would go below 0', () => {
    const actions = parseColorActions('W-1')!;
    const result = distributePoints(emptyColors, 5, actions);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/abaixo de 0/);
  });

  test('rejects when color would exceed 20', () => {
    const maxColors: Colors = { W: 20, U: 0, B: 0, R: 0, G: 0 };
    const actions = parseColorActions('W+1')!;
    const result = distributePoints(maxColors, 5, actions);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/passar de 20/);
  });

  test('handles multiple colors at once', () => {
    const actions = parseColorActions('W+3 U+2 R-0')!;
    // R+0 is skipped (amount=0), so 5 actions total
    const result = distributePoints(emptyColors, 5, actions);
    expect(result.ok).toBe(true);
    expect(result.newColors.W).toBe(3);
    expect(result.newColors.U).toBe(2);
    expect(result.pointsSpent).toBe(5);
  });
});
