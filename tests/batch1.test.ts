import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Per-test HOME isolation
// ---------------------------------------------------------------------------

let tempHome: string;
let originalHome: string | undefined;

beforeEach(async () => {
  originalHome = process.env.HOME;
  tempHome = path.join(os.tmpdir(), `buddy-batch1-${crypto.randomUUID()}`);
  await fs.mkdir(tempHome, { recursive: true });
  await fs.mkdir(path.join(tempHome, '.claude', 'projects'), { recursive: true });
  process.env.HOME = tempHome;
  vi.resetModules();
});

afterEach(async () => {
  if (originalHome !== undefined) {
    process.env.HOME = originalHome;
  } else {
    delete process.env.HOME;
  }
  await fs.rm(tempHome, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 1. levels.ts: levelFromXP — boundary values
// ---------------------------------------------------------------------------

describe('levels: levelFromXP boundary values', () => {
  it('0 XP → level 1 (Apprentice)', async () => {
    const { levelFromXP } = await import('../src/xp/levels.js');
    const r = levelFromXP(0);
    expect(r.level).toBe(1);
    expect(r.name).toBe('Apprentice');
    expect(r.minXP).toBe(0);
    expect(r.nextMinXP).toBe(100);
  });

  it('99 XP → still level 1', async () => {
    const { levelFromXP } = await import('../src/xp/levels.js');
    expect(levelFromXP(99).level).toBe(1);
  });

  it('100 XP → level 2 (Apprentice)', async () => {
    const { levelFromXP } = await import('../src/xp/levels.js');
    const r = levelFromXP(100);
    expect(r.level).toBe(2);
    expect(r.name).toBe('Apprentice');
    expect(r.nextMinXP).toBe(220);
  });

  it('880 XP → level 6 (Practitioner)', async () => {
    const { levelFromXP } = await import('../src/xp/levels.js');
    expect(levelFromXP(880).level).toBe(6);
    expect(levelFromXP(880).name).toBe('Practitioner');
  });

  it('87000 XP → level 30 (Maestro), no nextMinXP', async () => {
    const { levelFromXP } = await import('../src/xp/levels.js');
    const r = levelFromXP(87000);
    expect(r.level).toBe(30);
    expect(r.name).toBe('Maestro');
    expect(r.nextMinXP).toBeNull();
  });

  it('999999 XP → still level 30', async () => {
    const { levelFromXP } = await import('../src/xp/levels.js');
    expect(levelFromXP(999999).level).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// 2. levels.ts: xpProgress fraction
// ---------------------------------------------------------------------------

describe('levels: xpProgress', () => {
  it('160 XP → level 2 (Apprentice), correct fraction', async () => {
    const { xpProgress } = await import('../src/xp/levels.js');
    // Level 2: minXP=100, nextMinXP=220, range=120. current=160-100=60, fraction=60/120=0.5
    const p = xpProgress(160);
    expect(p.current).toBe(60);
    expect(p.required).toBe(120);
    expect(p.fraction).toBeCloseTo(0.5, 5);
  });

  it('fraction is 1.0 at max level', async () => {
    const { xpProgress } = await import('../src/xp/levels.js');
    const p = xpProgress(100000);
    expect(p.fraction).toBe(1.0);
    expect(p.required).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. holidays.ts: isWorkday
// ---------------------------------------------------------------------------

describe('holidays: isWorkday', () => {
  it('Saturday is not a workday', async () => {
    const { isWorkday, isWeekend } = await import('../src/xp/holidays.js');
    const sat = new Date(2025, 0, 4); // Saturday Jan 4 2025
    expect(isWeekend(sat)).toBe(true);
    expect(isWorkday(sat)).toBe(false);
  });

  it('Sunday is not a workday', async () => {
    const { isWorkday } = await import('../src/xp/holidays.js');
    const sun = new Date(2025, 0, 5); // Sunday
    expect(isWorkday(sun)).toBe(false);
  });

  it('Monday Jan 6 2025 is a workday', async () => {
    const { isWorkday } = await import('../src/xp/holidays.js');
    const mon = new Date(2025, 0, 6); // Monday
    expect(isWorkday(mon)).toBe(true);
  });

  it('Jan 1 (Confraternização) is not a workday', async () => {
    const { isWorkday, isHolidayBR } = await import('../src/xp/holidays.js');
    const jan1 = new Date(2025, 0, 1);
    expect(isHolidayBR(jan1)).toBe(true);
    expect(isWorkday(jan1)).toBe(false);
  });

  it('Sep 7 (Independência) is not a workday', async () => {
    const { isWorkday } = await import('../src/xp/holidays.js');
    const sep7 = new Date(2025, 8, 7); // Sep 7 2025
    expect(isWorkday(sep7)).toBe(false);
  });

  it('Dec 25 (Natal) is not a workday', async () => {
    const { isWorkday } = await import('../src/xp/holidays.js');
    const xmas = new Date(2025, 11, 25);
    expect(isWorkday(xmas)).toBe(false);
  });

  it('Regular Wednesday is a workday', async () => {
    const { isWorkday } = await import('../src/xp/holidays.js');
    const wed = new Date(2025, 2, 12); // Wednesday March 12 2025
    expect(isWorkday(wed)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. holidays.ts: Easter and movable holidays 2025
// Easter 2025 = April 20
// Carnaval = April 20 - 47 days = March 4, 2025
// Sexta-feira Santa = April 18, 2025
// Corpus Christi = April 20 + 60 = June 19, 2025
// ---------------------------------------------------------------------------

describe('holidays: Easter and movable holidays', () => {
  it('Easter 2025 = April 20', async () => {
    const { computeEaster } = await import('../src/xp/holidays.js');
    const e = computeEaster(2025);
    expect(e.getUTCFullYear()).toBe(2025);
    expect(e.getUTCMonth()).toBe(3); // 0-indexed = April
    expect(e.getUTCDate()).toBe(20);
  });

  it('Carnaval 2025 = March 4 (not a workday)', async () => {
    const { isWorkday } = await import('../src/xp/holidays.js');
    // March 4 2025 is Tuesday — would be workday except it's Carnaval
    const carnaval = new Date(2025, 2, 4); // March 4 local
    expect(isWorkday(carnaval)).toBe(false);
  });

  it('Sexta-feira Santa 2025 = April 18 (not a workday)', async () => {
    const { isWorkday } = await import('../src/xp/holidays.js');
    const sextaSanta = new Date(2025, 3, 18); // April 18 local
    expect(isWorkday(sextaSanta)).toBe(false);
  });

  it('Corpus Christi 2025 = June 19 (not a workday)', async () => {
    const { isWorkday } = await import('../src/xp/holidays.js');
    const corpusChristi = new Date(2025, 5, 19); // June 19 local
    expect(isWorkday(corpusChristi)).toBe(false);
  });

  it('Easter 2024 = March 31', async () => {
    const { computeEaster } = await import('../src/xp/holidays.js');
    const e = computeEaster(2024);
    expect(e.getUTCMonth()).toBe(2); // March
    expect(e.getUTCDate()).toBe(31);
  });
});

// ---------------------------------------------------------------------------
// 5. parser.ts: parse JSONL file with known content
// ---------------------------------------------------------------------------

describe('parser: parseJSONLFile', () => {
  it('parses assistant lines from a JSONL file', async () => {
    vi.resetModules();
    const { parseJSONLFile } = await import('../src/xp/parser.js');

    const sessionId = crypto.randomUUID();
    const filePath = path.join(tempHome, `${sessionId}.jsonl`);

    const lines = [
      JSON.stringify({
        type: 'user',
        content: 'hello',
      }),
      JSON.stringify({
        type: 'assistant',
        model: 'claude-sonnet-4-6',
        usage: {
          input_tokens: 10,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 500,
          output_tokens: 200,
        },
        timestamp: '2025-03-05T10:00:00.000Z',
        sessionId,
      }),
      JSON.stringify({
        type: 'assistant',
        model: 'claude-sonnet-4-6',
        usage: {
          input_tokens: 5,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 600,
          output_tokens: 150,
        },
        timestamp: '2025-03-05T10:05:00.000Z',
        sessionId,
      }),
      // Line without usage — should be skipped
      JSON.stringify({
        type: 'assistant',
        model: 'claude-sonnet-4-6',
        timestamp: '2025-03-05T10:06:00.000Z',
      }),
    ];

    await fs.writeFile(filePath, lines.join('\n') + '\n', 'utf8');

    const { sessions, newCursor } = await parseJSONLFile(filePath, 0);
    const stat = await fs.stat(filePath);

    expect(sessions.length).toBe(1);
    const session = sessions[0]!;
    expect(session.calls.length).toBe(2);
    expect(session.calls[0]!.model).toBe('claude-sonnet-4-6');
    expect(session.calls[0]!.outputTokens).toBe(200);
    expect(session.calls[1]!.outputTokens).toBe(150);
    expect(newCursor).toBe(stat.size);
  });

  it('cursor picks up where it left off (second parse returns empty)', async () => {
    vi.resetModules();
    const { parseJSONLFile } = await import('../src/xp/parser.js');

    const filePath = path.join(tempHome, `${crypto.randomUUID()}.jsonl`);
    const line = JSON.stringify({
      type: 'assistant',
      model: 'claude-haiku-3-5',
      usage: { input_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 50 },
      timestamp: '2025-03-06T08:00:00.000Z',
    });
    await fs.writeFile(filePath, line + '\n', 'utf8');

    const first = await parseJSONLFile(filePath, 0);
    expect(first.sessions.length).toBe(1);

    // Second parse with cursor at end — should return no new sessions
    const second = await parseJSONLFile(filePath, first.newCursor);
    expect(second.sessions.length).toBe(0);
    expect(second.newCursor).toBe(first.newCursor);
  });

  it('cursor resets when file shrinks', async () => {
    vi.resetModules();
    const { parseJSONLFile } = await import('../src/xp/parser.js');

    const filePath = path.join(tempHome, `${crypto.randomUUID()}.jsonl`);

    const line1 = JSON.stringify({
      type: 'assistant',
      model: 'claude-opus-4-6',
      usage: { input_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 100 },
      timestamp: '2025-03-07T09:00:00.000Z',
    });
    await fs.writeFile(filePath, line1 + '\n', 'utf8');

    const first = await parseJSONLFile(filePath, 0);
    expect(first.sessions.length).toBe(1);
    const bigCursor = first.newCursor;

    // Simulate file truncation/rotation: write a shorter file
    const line2 = JSON.stringify({
      type: 'assistant',
      model: 'claude-opus-4-6',
      usage: { input_tokens: 2, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 30 },
      timestamp: '2025-03-08T09:00:00.000Z',
    });
    await fs.writeFile(filePath, line2 + '\n', 'utf8');

    // cursor > file size now — should reset and reread
    const second = await parseJSONLFile(filePath, bigCursor);
    expect(second.sessions.length).toBe(1);
    expect(second.sessions[0]!.calls[0]!.outputTokens).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// 6. calculator.ts: model multipliers
// ---------------------------------------------------------------------------

describe('calculator: model multipliers', () => {
  it('haiku + simple task → multiplier 2.0', async () => {
    const { calculateSessionXP } = await import('../src/xp/calculator.js');

    // complexity = output_tokens / calls. 100/1 = 100 < 300 → simple
    const session = {
      sessionId: 'test-1',
      date: '2025-03-10',
      calls: [{
        model: 'claude-haiku-3-5',
        inputTokens: 50,
        outputTokens: 100,
        cacheCreation: 0,
        cacheRead: 0,
        timestamp: '2025-03-10T10:00:00.000Z',
      }],
    };
    const result = calculateSessionXP(session);
    expect(result.modelMultiplier).toBe(2.0);
    expect(result.dominantModel).toBe('claude-haiku-3-5');
    expect(result.complexityScore).toBe(100);
  });

  it('haiku + complex task → multiplier 1.0', async () => {
    const { calculateSessionXP } = await import('../src/xp/calculator.js');

    const session = {
      sessionId: 'test-2',
      date: '2025-03-10',
      calls: [{
        model: 'claude-haiku-3-5',
        inputTokens: 50,
        outputTokens: 400, // > 300 → complex
        cacheCreation: 0,
        cacheRead: 0,
        timestamp: '2025-03-10T10:00:00.000Z',
      }],
    };
    const result = calculateSessionXP(session);
    expect(result.modelMultiplier).toBe(1.0);
  });

  it('sonnet + simple task → multiplier 1.0', async () => {
    const { calculateSessionXP } = await import('../src/xp/calculator.js');

    const session = {
      sessionId: 'test-3',
      date: '2025-03-10',
      calls: [{
        model: 'claude-sonnet-4-6',
        inputTokens: 100,
        outputTokens: 200, // < 300 → simple
        cacheCreation: 0,
        cacheRead: 0,
        timestamp: '2025-03-10T10:00:00.000Z',
      }],
    };
    const result = calculateSessionXP(session);
    expect(result.modelMultiplier).toBe(1.0);
  });

  it('opus + simple task → multiplier 0.5', async () => {
    const { calculateSessionXP } = await import('../src/xp/calculator.js');

    const session = {
      sessionId: 'test-4',
      date: '2025-03-10',
      calls: [{
        model: 'claude-opus-4-6',
        inputTokens: 30,
        outputTokens: 100, // < 300 → simple
        cacheCreation: 0,
        cacheRead: 0,
        timestamp: '2025-03-10T10:00:00.000Z',
      }],
    };
    const result = calculateSessionXP(session);
    expect(result.modelMultiplier).toBe(0.5);
    // totalXP = Math.round(10 * 0.5 * (1+0)) = 5
    expect(result.totalXP).toBe(5);
  });

  it('opus + complex task → multiplier 2.0', async () => {
    const { calculateSessionXP } = await import('../src/xp/calculator.js');

    const session = {
      sessionId: 'test-5',
      date: '2025-03-10',
      calls: [{
        model: 'claude-opus-4-6',
        inputTokens: 30,
        outputTokens: 500, // >= 300 → complex
        cacheCreation: 0,
        cacheRead: 0,
        timestamp: '2025-03-10T10:00:00.000Z',
      }],
    };
    const result = calculateSessionXP(session);
    expect(result.modelMultiplier).toBe(2.0);
  });
});

// ---------------------------------------------------------------------------
// 7. calculator.ts: cache bonus
// ---------------------------------------------------------------------------

describe('calculator: cache bonus', () => {
  it('hit_rate >= 0.8 → +50% bonus (cacheBonus = 0.5)', async () => {
    const { calculateSessionXP } = await import('../src/xp/calculator.js');

    // hit_rate = cacheRead / (cacheRead + cacheCreation + inputTokens)
    // = 800 / (800 + 100 + 100) = 800/1000 = 0.8
    const session = {
      sessionId: 'cache-1',
      date: '2025-03-11',
      calls: [{
        model: 'claude-sonnet-4-6',
        inputTokens: 100,
        outputTokens: 200,
        cacheCreation: 100,
        cacheRead: 800,
        timestamp: '2025-03-11T10:00:00.000Z',
      }],
    };
    const result = calculateSessionXP(session);
    expect(result.cacheBonus).toBe(0.5);
    expect(result.cacheHitRate).toBeCloseTo(0.8, 5);
    // sonnet simple (200 < 300) → mult 1.0. totalXP = Math.round(10 * 1.0 * 1.5) = 15
    expect(result.totalXP).toBe(15);
  });

  it('hit_rate >= 0.5 but < 0.8 → +20% bonus (cacheBonus = 0.2)', async () => {
    const { calculateSessionXP } = await import('../src/xp/calculator.js');

    // hit_rate = 500 / (500 + 200 + 300) = 500/1000 = 0.5
    const session = {
      sessionId: 'cache-2',
      date: '2025-03-11',
      calls: [{
        model: 'claude-sonnet-4-6',
        inputTokens: 300,
        outputTokens: 200,
        cacheCreation: 200,
        cacheRead: 500,
        timestamp: '2025-03-11T10:00:00.000Z',
      }],
    };
    const result = calculateSessionXP(session);
    expect(result.cacheBonus).toBe(0.2);
    // sonnet simple → mult 1.0. totalXP = Math.round(10 * 1.0 * 1.2) = 12
    expect(result.totalXP).toBe(12);
  });

  it('low hit_rate → no cache bonus', async () => {
    const { calculateSessionXP } = await import('../src/xp/calculator.js');

    const session = {
      sessionId: 'cache-3',
      date: '2025-03-11',
      calls: [{
        model: 'claude-sonnet-4-6',
        inputTokens: 900,
        outputTokens: 200,
        cacheCreation: 50,
        cacheRead: 50,
        timestamp: '2025-03-11T10:00:00.000Z',
      }],
    };
    const result = calculateSessionXP(session);
    expect(result.cacheBonus).toBe(0);
    expect(result.totalXP).toBe(10); // base 10, mult 1.0, no cache bonus
  });
});

// ---------------------------------------------------------------------------
// 8. calculator.ts: streak calculation
// ---------------------------------------------------------------------------

describe('calculator: streak', () => {
  it('consecutive workdays extend streak', async () => {
    const { calculateStreak } = await import('../src/xp/calculator.js');

    // March 10-14 2025 = Mon-Fri (all workdays)
    const dates = ['2025-03-10', '2025-03-11', '2025-03-12', '2025-03-13', '2025-03-14'];
    const result = calculateStreak(dates, 0, null);
    expect(result.streak).toBe(5);
    expect(result.lastActiveDate).toBe('2025-03-14');
    // Days 1-5: 5 XP each → 25 total
    expect(result.streakXP).toBe(25);
  });

  it('gap in workdays resets streak', async () => {
    const { calculateStreak } = await import('../src/xp/calculator.js');

    // Mon, Tue, then skip Wed-Thu, come back Fri
    const dates = ['2025-03-10', '2025-03-11', '2025-03-14'];
    const result = calculateStreak(dates, 0, null);
    // After Mon=1, Tue=2, then Fri breaks because Wed was skipped → reset to 1
    expect(result.streak).toBe(1);
    expect(result.lastActiveDate).toBe('2025-03-14');
  });

  it('streak continues from previous state', async () => {
    const { calculateStreak } = await import('../src/xp/calculator.js');

    // Already had a 3-day streak ending on Monday March 10
    const result = calculateStreak(['2025-03-11'], 3, '2025-03-10');
    expect(result.streak).toBe(4); // Tuesday is next workday → extend
  });

  it('weekend activity gives +5 XP but does not change streak', async () => {
    const { calculateStreak } = await import('../src/xp/calculator.js');

    // Friday + Saturday (weekend) + Monday
    const dates = ['2025-03-14', '2025-03-15', '2025-03-17'];
    const result = calculateStreak(dates, 0, null);

    // Fri=streak 1 (5xp), Sat=dedication +5, Mon=streak 2 (5xp)
    expect(result.streak).toBe(2);
    expect(result.streakXP).toBe(15); // 5 + 5 + 5
  });

  it('days 6-30 give 10 XP/day', async () => {
    const { calculateStreak } = await import('../src/xp/calculator.js');

    // Start a streak on day 5, add one more workday
    // Already at streak=5, lastActiveDate = Friday 2025-03-14
    // March 17 (Monday) → streak 6 → 10 XP
    const result = calculateStreak(['2025-03-17'], 5, '2025-03-14');
    expect(result.streak).toBe(6);
    expect(result.streakXP).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// 9. state.ts: loadState backward compat (no xp field)
// ---------------------------------------------------------------------------

describe('state: loadState backward compatibility', () => {
  it('loadState with no xp field in state.json returns default XP', async () => {
    vi.resetModules();

    // Write a state.json without the xp field (old format)
    const myBuddyDir = path.join(tempHome, '.my-buddy');
    await fs.mkdir(myBuddyDir, { recursive: true });
    const stateFile = path.join(myBuddyDir, 'state.json');
    await fs.writeFile(stateFile, JSON.stringify({
      activeBuddy: 'cat',
      lastContext: { cwd: '/foo', branch: 'main', model: 'sonnet' },
      refreshCount: 42,
      // no xp field
    }), 'utf8');

    const { loadState } = await import('../src/render/state.js');
    const state = await loadState();

    expect(state.activeBuddy).toBe('cat');
    expect(state.refreshCount).toBe(42);

    // XP fields should be defaults
    expect(state.xp.xp).toBe(0);
    expect(state.xp.level).toBe(1);
    expect(state.xp.streak).toBe(0);
    expect(state.xp.lastActiveDate).toBeNull();
    expect(state.xp.lastSyncedAt).toBeNull();
    expect(state.xp.eventXP).toBe(0);
    expect(state.xp.lastProcessedCursors).toEqual({});
  });

  it('loadState with missing state.json returns all defaults', async () => {
    vi.resetModules();
    const { loadState } = await import('../src/render/state.js');
    const state = await loadState();

    expect(state.activeBuddy).toBeNull();
    expect(state.xp.xp).toBe(0);
    expect(state.xp.level).toBe(1);
  });

  it('loadState preserves existing xp data', async () => {
    vi.resetModules();

    const myBuddyDir = path.join(tempHome, '.my-buddy');
    await fs.mkdir(myBuddyDir, { recursive: true });
    const stateFile = path.join(myBuddyDir, 'state.json');
    await fs.writeFile(stateFile, JSON.stringify({
      activeBuddy: null,
      lastContext: { cwd: null, branch: null, model: null },
      refreshCount: 0,
      xp: {
        xp: 1250,
        level: 3,
        streak: 7,
        lastActiveDate: '2025-03-14',
        lastSyncedAt: '2025-03-14T18:00:00.000Z',
        lastProcessedCursors: { '/foo/bar.jsonl': 1024 },
        eventXP: 50,
      },
    }), 'utf8');

    const { loadState } = await import('../src/render/state.js');
    const state = await loadState();

    expect(state.xp.xp).toBe(1250);
    expect(state.xp.level).toBe(3);
    expect(state.xp.streak).toBe(7);
    expect(state.xp.lastActiveDate).toBe('2025-03-14');
    expect(state.xp.lastProcessedCursors['/foo/bar.jsonl']).toBe(1024);
    expect(state.xp.eventXP).toBe(50);
  });
});
