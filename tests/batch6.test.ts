import { describe, it, expect } from 'vitest';
import { evaluateBadges } from '../src/xp/badges.js';
import type { BadgeContext } from '../src/xp/badges.js';

function makeCtx(overrides: Partial<BadgeContext> = {}): BadgeContext {
  return {
    level: 1,
    streak: 0,
    existingBadges: [],
    breakdown: [],
    sessions: [],
    ...overrides,
  };
}

describe('evaluateBadges', () => {
  it('returns empty when no conditions met', () => {
    const result = evaluateBadges(makeCtx());
    expect(result).toEqual([]);
  });

  it('first_sync unlocks on first sync with sessions', () => {
    const ctx = makeCtx({
      breakdown: [{ date: '2025-01-01', cacheHitRate: 0 }],
    });
    expect(evaluateBadges(ctx)).toContain('first_sync');
  });

  it('first_sync does not unlock again if already earned', () => {
    const ctx = makeCtx({
      breakdown: [{ date: '2025-01-01', cacheHitRate: 0 }],
      existingBadges: ['first_sync'],
    });
    expect(evaluateBadges(ctx)).not.toContain('first_sync');
  });

  it('week_streak unlocks at streak 5', () => {
    const ctx = makeCtx({ streak: 5 });
    expect(evaluateBadges(ctx)).toContain('week_streak');
  });

  it('week_streak does not unlock below streak 5', () => {
    const ctx = makeCtx({ streak: 4 });
    expect(evaluateBadges(ctx)).not.toContain('week_streak');
  });

  it('month_streak unlocks at streak 20', () => {
    const ctx = makeCtx({ streak: 20 });
    expect(evaluateBadges(ctx)).toContain('month_streak');
  });

  it('month_streak does not unlock below streak 20', () => {
    const ctx = makeCtx({ streak: 19 });
    expect(evaluateBadges(ctx)).not.toContain('month_streak');
  });

  it('cache_master unlocks with 80% cache hit rate', () => {
    const ctx = makeCtx({
      breakdown: [{ date: '2025-01-01', cacheHitRate: 0.8 }],
    });
    expect(evaluateBadges(ctx)).toContain('cache_master');
  });

  it('cache_master does not unlock below 80% cache hit rate', () => {
    const ctx = makeCtx({
      breakdown: [{ date: '2025-01-01', cacheHitRate: 0.79 }],
    });
    expect(evaluateBadges(ctx)).not.toContain('cache_master');
  });

  it('speed_demon unlocks with 3 sessions on the same day', () => {
    const ctx = makeCtx({
      breakdown: [
        { date: '2025-01-01', cacheHitRate: 0 },
        { date: '2025-01-01', cacheHitRate: 0 },
        { date: '2025-01-01', cacheHitRate: 0 },
      ],
    });
    expect(evaluateBadges(ctx)).toContain('speed_demon');
  });

  it('speed_demon does not unlock with sessions on different days', () => {
    const ctx = makeCtx({
      breakdown: [
        { date: '2025-01-01', cacheHitRate: 0 },
        { date: '2025-01-02', cacheHitRate: 0 },
        { date: '2025-01-03', cacheHitRate: 0 },
      ],
    });
    expect(evaluateBadges(ctx)).not.toContain('speed_demon');
  });

  it('deep_focus unlocks with a session having 20+ calls', () => {
    const calls = Array.from({ length: 20 }, () => ({}));
    const ctx = makeCtx({
      sessions: [{ calls }],
    });
    expect(evaluateBadges(ctx)).toContain('deep_focus');
  });

  it('deep_focus does not unlock with fewer than 20 calls', () => {
    const calls = Array.from({ length: 19 }, () => ({}));
    const ctx = makeCtx({
      sessions: [{ calls }],
    });
    expect(evaluateBadges(ctx)).not.toContain('deep_focus');
  });

  it('level_10 unlocks at level 10', () => {
    const ctx = makeCtx({ level: 10 });
    expect(evaluateBadges(ctx)).toContain('level_10');
  });

  it('level_10 does not unlock below level 10', () => {
    const ctx = makeCtx({ level: 9 });
    expect(evaluateBadges(ctx)).not.toContain('level_10');
  });

  it('level_20 unlocks at level 20', () => {
    const ctx = makeCtx({ level: 20 });
    expect(evaluateBadges(ctx)).toContain('level_20');
  });

  it('level_20 does not unlock below level 20', () => {
    const ctx = makeCtx({ level: 19 });
    expect(evaluateBadges(ctx)).not.toContain('level_20');
  });

  it('multiple badges can unlock at once', () => {
    const calls = Array.from({ length: 20 }, () => ({}));
    const ctx = makeCtx({
      level: 10,
      streak: 5,
      breakdown: [
        { date: '2025-01-01', cacheHitRate: 0.9 },
        { date: '2025-01-01', cacheHitRate: 0 },
        { date: '2025-01-01', cacheHitRate: 0 },
      ],
      sessions: [{ calls }],
    });
    const result = evaluateBadges(ctx);
    expect(result).toContain('first_sync');
    expect(result).toContain('week_streak');
    expect(result).toContain('cache_master');
    expect(result).toContain('speed_demon');
    expect(result).toContain('deep_focus');
    expect(result).toContain('level_10');
  });

  it('never re-unlocks existing badges', () => {
    const calls = Array.from({ length: 20 }, () => ({}));
    const existingBadges = ['first_sync', 'week_streak', 'level_10', 'cache_master', 'speed_demon', 'deep_focus'];
    const ctx = makeCtx({
      level: 10,
      streak: 5,
      existingBadges,
      breakdown: [
        { date: '2025-01-01', cacheHitRate: 0.9 },
        { date: '2025-01-01', cacheHitRate: 0 },
        { date: '2025-01-01', cacheHitRate: 0 },
      ],
      sessions: [{ calls }],
    });
    const result = evaluateBadges(ctx);
    for (const badge of existingBadges) {
      expect(result).not.toContain(badge);
    }
  });
});
