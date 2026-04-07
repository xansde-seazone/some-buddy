import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { levelFromXP, LEVELS } from '../src/xp/levels.js';
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
  tempHome = path.join(os.tmpdir(), `buddy-batch2-${crypto.randomUUID()}`);
  await fs.mkdir(tempHome, { recursive: true });
  await fs.mkdir(path.join(tempHome, '.claude'), { recursive: true });
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
// Helpers
// ---------------------------------------------------------------------------

/** Strip all ANSI escape sequences from a string. */
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

/** Write a minimal valid buddy JSON and a state.json with an active buddy. */
async function setupBuddyAndState(
  buddyName: string,
  phrases: string[],
  xp: number = 0,
): Promise<void> {
  const buddiesDir = path.join(tempHome, '.my-buddy', 'buddies');
  await fs.mkdir(buddiesDir, { recursive: true });

  const nullRow = Array(12).fill(null) as (number | null)[];
  const buddy = {
    name: buddyName,
    eyes: '·',
    frames: [
      {
        ascii: [' /\\_/\\      ', ' ( · · )    ', ' (  ^  )    ', ' / > < \\    ', ' ~~~~~~     '],
        colors: [nullRow, nullRow, nullRow, nullRow, nullRow],
      },
    ],
    voice: {
      personality: 'curioso',
      phrases,
      reactions: {},
    },
  };

  await fs.writeFile(
    path.join(buddiesDir, `${buddyName}.json`),
    JSON.stringify(buddy),
    'utf8',
  );

  const stateDir = path.join(tempHome, '.my-buddy');
  await fs.writeFile(
    path.join(stateDir, 'state.json'),
    JSON.stringify({
      activeBuddy: buddyName,
      lastContext: { cwd: null, branch: null, model: null },
      refreshCount: 0,
      xp: {
        xp,
        level: 1,
        streak: 0,
        lastActiveDate: null,
        lastSyncedAt: null,
        lastProcessedCursors: {},
        eventXP: 0,
      },
    }),
    'utf8',
  );
}

/** Build a Claude Code statusLine stdin JSON string. */
function makeStdin(
  options: {
    modelId?: string;
    displayName?: string;
    effort?: string;
    cwd?: string;
    branch?: string;
  } = {},
): string {
  const {
    modelId = 'claude-sonnet-4-6',
    displayName = 'Sonnet 4.6',
    cwd = '/home/user/project',
    branch = 'main',
  } = options;

  const modelObj: Record<string, unknown> = { id: modelId, display_name: displayName };
  if (options.effort !== undefined) {
    modelObj['effort'] = options.effort;
  }

  return JSON.stringify({
    model: modelObj,
    cwd,
    worktree: { branch },
  });
}

// ---------------------------------------------------------------------------
// 1–7: context.ts tests
// ---------------------------------------------------------------------------

describe('context: shortModelName', () => {
  it('1. "Sonnet 4.6" with id → "Sonnet"', async () => {
    const { shortModelName } = await import('../src/render/context.js');
    expect(shortModelName('Sonnet 4.6', 'claude-sonnet-4-6')).toBe('Sonnet');
  });

  it('2. "Opus 4.6 with 1M context" → "Opus"', async () => {
    const { shortModelName } = await import('../src/render/context.js');
    expect(shortModelName('Opus 4.6 with 1M context', null)).toBe('Opus');
  });

  it('3. null displayName, "claude-haiku-4-5" → "Haiku"', async () => {
    const { shortModelName } = await import('../src/render/context.js');
    expect(shortModelName(null, 'claude-haiku-4-5')).toBe('Haiku');
  });

  it('4. null displayName, null id → "Unknown"', async () => {
    const { shortModelName } = await import('../src/render/context.js');
    expect(shortModelName(null, null)).toBe('Unknown');
  });
});

describe('context: parseClaudeInput', () => {
  it('5. model.display_name populates modelDisplayName', async () => {
    const { parseClaudeInput } = await import('../src/render/context.js');
    const raw = JSON.stringify({
      model: { id: 'claude-sonnet-4-6', display_name: 'Sonnet 4.6' },
      cwd: '/foo',
      worktree: { branch: 'main' },
    });
    const result = parseClaudeInput(raw);
    expect(result.modelDisplayName).toBe('Sonnet 4.6');
    expect(result.model).toBe('claude-sonnet-4-6');
  });

  it('6. model.effort populates effortLevel', async () => {
    const { parseClaudeInput } = await import('../src/render/context.js');
    const raw = JSON.stringify({
      model: { id: 'claude-sonnet-4-6', display_name: 'Sonnet 4.6', effort: 'High' },
      cwd: '/foo',
      worktree: { branch: 'main' },
    });
    const result = parseClaudeInput(raw);
    expect(result.effortLevel).toBe('High');
  });

  it('7. no effort field → effortLevel is null', async () => {
    const { parseClaudeInput } = await import('../src/render/context.js');
    const raw = JSON.stringify({
      model: { id: 'claude-sonnet-4-6', display_name: 'Sonnet 4.6' },
      cwd: '/foo',
      worktree: { branch: 'main' },
    });
    const result = parseClaudeInput(raw);
    expect(result.effortLevel).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 8–16: layout.ts tests
// ---------------------------------------------------------------------------

describe('layout: renderXPBar', () => {
  it('8. fraction=0 → all empty', async () => {
    const { renderXPBar } = await import('../src/render/layout.js');
    expect(renderXPBar(0)).toBe('[░░░░░░░░]');
  });

  it('9. fraction=1 → all filled', async () => {
    const { renderXPBar } = await import('../src/render/layout.js');
    expect(renderXPBar(1)).toBe('[████████]');
  });

  it('10. fraction=0.5 → half filled', async () => {
    const { renderXPBar } = await import('../src/render/layout.js');
    expect(renderXPBar(0.5)).toBe('[████░░░░]');
  });
});

describe('layout: buildRightColumn', () => {
  it('11. returns array of exactly 5 strings', async () => {
    const { buildRightColumn } = await import('../src/render/layout.js');
    const result = buildRightColumn('Capivara', { level: 2, name: 'Apprentice' }, 'zzz...', 'Sonnet', null, 0.5);
    expect(result).toHaveLength(5);
    result.forEach((s) => expect(typeof s).toBe('string'));
  });

  it('12. line 0 is buddy name, line 1 is level, line 2 is quoted phrase, line 3 is empty, line 4 has model and XP bar', async () => {
    const { buildRightColumn } = await import('../src/render/layout.js');
    const result = buildRightColumn('Capivara', { level: 2, name: 'Apprentice' }, 'zzz...', 'Sonnet', null, 0.5);
    expect(result[0]).toBe('Capivara');
    expect(result[1]).toBe('Lv.2 Apprentice');
    expect(result[2]).toBe('"zzz..."');
    expect(result[3]).toBe('');
    expect(result[4]).toContain('Sonnet');
    expect(result[4]).toContain('░');
  });

  it('13. model tag always without effort suffix', async () => {
    const { buildRightColumn } = await import('../src/render/layout.js');
    const result = buildRightColumn('Cat', { level: 1, name: 'Apprentice' }, null, 'Haiku', 0);
    expect(result[4]).toContain('[Haiku]');
    expect(result[4]).not.toContain('·');
  });

  it('14. model tag format: [ModelName] xpBar Nvl N', async () => {
    const { buildRightColumn } = await import('../src/render/layout.js');
    const result = buildRightColumn('Cat', { level: 1, name: 'Apprentice' }, null, 'Sonnet', 0);
    expect(result[4]).toContain('[Sonnet]');
    expect(result[4]).not.toContain('·');
  });
});

describe('layout: mergeColumns', () => {
  it('15. empty right → only ASCII (no trailing separator)', async () => {
    const { mergeColumns } = await import('../src/render/layout.js');
    const ascii = [' /\\_/\\      ', ' ( · · )    ', ' (  ^  )    ', ' / > < \\    ', ' ~~~~~~     '];
    const right = ['Name', 'Lv.1 Apprentice', '"phrase"', '', 'bar'];
    const merged = mergeColumns(ascii, right);
    // Line 4 (index 3) has empty right column
    expect(merged[3]).toBe(' / > < \\    ');
  });

  it('16. non-empty right → ASCII + separator + text', async () => {
    const { mergeColumns } = await import('../src/render/layout.js');
    const ascii = [' /\\_/\\      ', ' ( · · )    ', ' (  ^  )    ', ' / > < \\    ', ' ~~~~~~     '];
    const right = ['Capivara', 'Lv.2 Apprentice', '"zzz..."', '', '[Sonnet] [████░░░░] Nvl 2'];
    const merged = mergeColumns(ascii, right);
    // Line 0 should be ascii + 2 spaces + right text
    expect(merged[0]).toBe(' /\\_/\\        Capivara');
  });
});

// ---------------------------------------------------------------------------
// 17–18: render/index.ts full render tests
// ---------------------------------------------------------------------------

describe('render: renderStatusLine layout', () => {
  it('17. full render output is exactly 5 lines', async () => {
    await setupBuddyAndState('capivara', ['observando...']);
    vi.resetModules();

    const { renderStatusLine } = await import('../src/render/index.js');
    const stdin = makeStdin({ modelId: 'claude-sonnet-4-6', displayName: 'Sonnet 4.6' });
    const output = await renderStatusLine(stdin);

    const lines = output.split('\n');
    expect(lines.length).toBe(5);
  });

  it('18. line 5 (index 4) contains model name and XP bar characters', async () => {
    await setupBuddyAndState('capivara', ['observando...'], 750);
    vi.resetModules();

    const { renderStatusLine } = await import('../src/render/index.js');
    const stdin = makeStdin({ modelId: 'claude-sonnet-4-6', displayName: 'Sonnet 4.6' });
    const output = await renderStatusLine(stdin);

    const lines = output.split('\n');
    const line5 = stripAnsi(lines[4] ?? '');
    expect(line5).toContain('Sonnet');
    // XP bar characters should be present
    expect(line5).toMatch(/[█░]/u);
    expect(line5).toContain('Nvl');
  });
});

// ---------------------------------------------------------------------------
// render: tier names match level system through full render
// ---------------------------------------------------------------------------

describe('render: tier names match level system through full render', () => {
  const tierBoundaries = [
    { tierName: 'Apprentice',   xp:     0 },
    { tierName: 'Practitioner', xp:   880 },
    { tierName: 'Craftsman',    xp:  3400 },
    { tierName: 'Engineer',     xp:  9260 },
    { tierName: 'Architect',    xp: 21800 },
    { tierName: 'Maestro',      xp: 47900 },
  ];

  for (const { tierName, xp } of tierBoundaries) {
    it(`19. full render at XP=${xp} contains tier name "${tierName}" from levelFromXP`, async () => {
      await setupBuddyAndState('capivara', ['observando...'], xp);
      vi.resetModules();

      const { renderStatusLine } = await import('../src/render/index.js');
      const stdin = makeStdin({ modelId: 'claude-sonnet-4-6', displayName: 'Sonnet 4.6' });
      const output = await renderStatusLine(stdin);

      const stripped = stripAnsi(output);
      const expectedName = levelFromXP(xp).name;
      expect(expectedName).toBe(tierName);
      expect(stripped).toContain(tierName);
    });
  }

  it('20. buildRightColumn always uses tier name from levelFromXP (guard against hardcoded names)', async () => {
    const { buildRightColumn } = await import('../src/render/layout.js');

    const probelevels = [1, 2, 5, 6, 10, 11, 15, 16, 20, 21, 25, 26, 30];
    for (const lvl of probelevels) {
      const levelEntry = LEVELS[lvl - 1]!;
      const info = levelFromXP(levelEntry.minXP);
      const lines = buildRightColumn('Test', { level: info.level, name: info.name }, null, 'Sonnet', 0);
      expect(lines[1]).toBe(`Lv.${info.level} ${info.name}`);
    }
  });
});
