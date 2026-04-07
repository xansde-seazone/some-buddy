import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AppState } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides: Partial<AppState['xp']> & { activeBuddy?: string | null }): AppState {
  const { activeBuddy = null, ...xpOverrides } = overrides;
  return {
    activeBuddy,
    lastContext: { cwd: null, branch: null, model: null },
    refreshCount: 0,
    xp: {
      xp: 0,
      level: 1,
      streak: 0,
      lastActiveDate: null,
      lastSyncedAt: null,
      lastProcessedCursors: {},
      eventXP: 0,
      ...xpOverrides,
    },
    colors: { W: 0, U: 0, B: 0, R: 0, G: 0 },
    colorPoints: 0,
    badges: [],
  };
}

// ---------------------------------------------------------------------------
// Per-test setup / teardown
// ---------------------------------------------------------------------------

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock('../src/render/state.js');
});

// ---------------------------------------------------------------------------
// Batch 4 — cmdXP dashboard
// ---------------------------------------------------------------------------

describe('Batch 4 — cmdXP dashboard', () => {
  it('renders dashboard with XP > 0', async () => {
    // xp=4000 is level 11 (minXP=3400, nextMinXP=4230), eventXP=260, sessionXP=4000-260=3740
    const state = makeState({
      activeBuddy: 'Moja',
      xp: 4000,
      level: 11,
      streak: 5,
      lastActiveDate: '2026-04-06',
      lastSyncedAt: '2026-04-06T18:42:00.000Z',
      eventXP: 260,
    });

    vi.doMock('../src/render/state.js', () => ({
      loadState: vi.fn().mockResolvedValue(state),
    }));

    vi.resetModules();
    const { cmdXP } = await import('../src/commands/xp.js');
    const exitCode = await cmdXP();

    expect(exitCode).toBe(0);

    const output = consoleSpy.mock.calls.map((c) => String(c[0] ?? '')).join('\n');

    expect(output).toContain('Moja');
    expect(output).toContain('Lv.11');
    expect(output).toContain('Craftsman');
    expect(output).toContain('4.000');
    expect(output).toContain('Streak:');
    expect(output).toContain('5 dias');
    // Session XP = 4000 - 260 = 3740
    expect(output).toContain('3.740 XP');
    // Event XP = 260
    expect(output).toContain('260 XP');
  });

  it('renders dashboard with default/zero state', async () => {
    const state = makeState({
      activeBuddy: null,
      xp: 0,
      level: 1,
      streak: 0,
      lastActiveDate: null,
      lastSyncedAt: null,
      eventXP: 0,
    });

    vi.doMock('../src/render/state.js', () => ({
      loadState: vi.fn().mockResolvedValue(state),
    }));

    vi.resetModules();
    const { cmdXP } = await import('../src/commands/xp.js');
    const exitCode = await cmdXP();

    expect(exitCode).toBe(0);

    const output = consoleSpy.mock.calls.map((c) => String(c[0] ?? '')).join('\n');

    expect(output).toContain('(no buddy)');
    expect(output).toContain('Lv.1');
    expect(output).toContain('Apprentice');
    expect(output).toContain('0 / 100 XP');
    expect(output).toContain('0%');
    // Null dates render as —
    const dashCount = (output.match(/—/g) ?? []).length;
    expect(dashCount).toBeGreaterThanOrEqual(2);
  });

  it('renders max level correctly', async () => {
    const state = makeState({
      activeBuddy: 'Moja',
      xp: 90000,
      level: 30,
      streak: 10,
      lastActiveDate: '2026-04-06',
      lastSyncedAt: null,
      eventXP: 0,
    });

    vi.doMock('../src/render/state.js', () => ({
      loadState: vi.fn().mockResolvedValue(state),
    }));

    vi.resetModules();
    const { cmdXP } = await import('../src/commands/xp.js');
    await cmdXP();

    const output = consoleSpy.mock.calls.map((c) => String(c[0] ?? '')).join('\n');

    expect(output).toContain('Maestro');
    expect(output).toContain('★');
    expect(output).toContain('MAX');
  });

  it('formats XP with dot separator', async () => {
    const state = makeState({
      activeBuddy: 'Moja',
      xp: 90000,
      level: 30,
      streak: 0,
      lastActiveDate: null,
      lastSyncedAt: null,
      eventXP: 0,
    });

    vi.doMock('../src/render/state.js', () => ({
      loadState: vi.fn().mockResolvedValue(state),
    }));

    vi.resetModules();
    const { cmdXP } = await import('../src/commands/xp.js');
    await cmdXP();

    const output = consoleSpy.mock.calls.map((c) => String(c[0] ?? '')).join('\n');

    expect(output).toContain('90.000');
  });

  it('progress bar fraction is correct', async () => {
    // xp=965, level 6 (Practitioner): minXP=880, nextMinXP=1220
    // range = 1220-880 = 340. current = 965-880 = 85, fraction = 85/340 = 0.25
    // 20 * 0.25 = 5 filled chars
    const state = makeState({
      activeBuddy: 'Moja',
      xp: 965,
      level: 6,
      streak: 0,
      lastActiveDate: null,
      lastSyncedAt: null,
      eventXP: 0,
    });

    vi.doMock('../src/render/state.js', () => ({
      loadState: vi.fn().mockResolvedValue(state),
    }));

    vi.resetModules();
    const { cmdXP } = await import('../src/commands/xp.js');
    await cmdXP();

    const output = consoleSpy.mock.calls.map((c) => String(c[0] ?? '')).join('\n');

    // 5 filled (█) + 15 empty (░)
    expect(output).toContain('█████░░░░░░░░░░░░░░░');
    expect(output).toContain('25%');
  });
});
