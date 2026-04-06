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
  tempHome = path.join(os.tmpdir(), `buddy-batch3-${crypto.randomUUID()}`);
  await fs.mkdir(tempHome, { recursive: true });
  await fs.mkdir(path.join(tempHome, '.claude'), { recursive: true });
  await fs.mkdir(path.join(tempHome, '.my-buddy'), { recursive: true });
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

// Silence console output in all tests
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

// ---------------------------------------------------------------------------
// 1. buildHooksConfig returns Stop and UserPromptSubmit hooks
// ---------------------------------------------------------------------------

describe('hooks/config: buildHooksConfig', () => {
  it('returns Stop and UserPromptSubmit entries', async () => {
    const { buildHooksConfig } = await import('../src/hooks/config.js');
    const config = buildHooksConfig('/usr/local/bin/cli.js');

    expect(config).toHaveProperty('Stop');
    expect(config).toHaveProperty('UserPromptSubmit');
  });

  it('each event has a rule with the correct sync command', async () => {
    const { buildHooksConfig } = await import('../src/hooks/config.js');
    const cliPath = '/home/user/.npm/bin/cli.js';
    const config = buildHooksConfig(cliPath);

    for (const event of ['Stop', 'UserPromptSubmit']) {
      const rules = config[event]!;
      expect(rules.length).toBeGreaterThanOrEqual(1);
      const rule = rules[0]!;
      expect(rule.matcher).toBe('');
      expect(rule.hooks.length).toBeGreaterThanOrEqual(1);
      expect(rule.hooks[0]!.type).toBe('command');
      expect(rule.hooks[0]!.command).toBe(`node ${cliPath} sync`);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. mergeHooks — empty existing
// ---------------------------------------------------------------------------

describe('hooks/config: mergeHooks with empty existing', () => {
  it('adds our hooks to empty existing (undefined)', async () => {
    const { buildHooksConfig, mergeHooks } = await import('../src/hooks/config.js');
    const ours = buildHooksConfig('/path/to/cli.js');
    const result = mergeHooks(undefined, ours);

    expect(result).toHaveProperty('Stop');
    expect(result).toHaveProperty('UserPromptSubmit');
    expect(result['Stop']!.length).toBe(1);
    expect(result['UserPromptSubmit']!.length).toBe(1);
  });

  it('adds our hooks to empty existing (empty object)', async () => {
    const { buildHooksConfig, mergeHooks } = await import('../src/hooks/config.js');
    const ours = buildHooksConfig('/path/to/cli.js');
    const result = mergeHooks({}, ours);

    expect(result['Stop']!.length).toBe(1);
    expect(result['UserPromptSubmit']!.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 3. mergeHooks — preserves existing hooks and adds ours
// ---------------------------------------------------------------------------

describe('hooks/config: mergeHooks preserves existing hooks', () => {
  it('keeps existing rules alongside ours', async () => {
    const { buildHooksConfig, mergeHooks } = await import('../src/hooks/config.js');
    const existing = {
      Stop: [
        {
          matcher: 'some-project',
          hooks: [{ type: 'command' as const, command: 'some-other-tool notify' }],
        },
      ],
    };
    const ours = buildHooksConfig('/path/to/cli.js');
    const result = mergeHooks(existing, ours);

    // Stop should now have 2 rules: the existing one + ours
    expect(result['Stop']!.length).toBe(2);
    const commands = result['Stop']!.flatMap((r) => r.hooks.map((h) => h.command));
    expect(commands).toContain('some-other-tool notify');
    expect(commands).toContain('node /path/to/cli.js sync');

    // UserPromptSubmit should only have ours (was not in existing)
    expect(result['UserPromptSubmit']!.length).toBe(1);
  });

  it('preserves unrelated event keys from existing', async () => {
    const { buildHooksConfig, mergeHooks } = await import('../src/hooks/config.js');
    const existing = {
      PreToolUse: [
        {
          matcher: '',
          hooks: [{ type: 'command' as const, command: 'echo pre' }],
        },
      ],
    };
    const ours = buildHooksConfig('/path/to/cli.js');
    const result = mergeHooks(existing, ours);

    expect(result).toHaveProperty('PreToolUse');
    expect(result['PreToolUse']!.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 4. mergeHooks — deduplication
// ---------------------------------------------------------------------------

describe('hooks/config: mergeHooks deduplicates existing entries', () => {
  it('does not add a duplicate rule when our command already exists', async () => {
    const { buildHooksConfig, mergeHooks } = await import('../src/hooks/config.js');
    const cliPath = '/path/to/cli.js';
    const ours = buildHooksConfig(cliPath);

    // Simulate that install was already run: merge once
    const first = mergeHooks(undefined, ours);
    // Merge again (reinstall scenario)
    const second = mergeHooks(first, ours);

    // Should still be 1 rule per event, not 2
    expect(second['Stop']!.length).toBe(1);
    expect(second['UserPromptSubmit']!.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5 & 6. xp-event: valid event adds XP to both xp and eventXP
// ---------------------------------------------------------------------------

describe('xp-event: valid event adds XP', () => {
  it('adds XP to state.xp.xp and state.xp.eventXP', async () => {
    vi.resetModules();
    const { cmdXPEvent } = await import('../src/commands/xp-event.js');
    const { loadState } = await import('../src/render/state.js');

    const result = await cmdXPEvent('test-event', '100');
    expect(result).toBe(0);

    const state = await loadState();
    expect(state.xp.xp).toBe(100);
    expect(state.xp.eventXP).toBe(100);
  });

  it('accumulates multiple events correctly', async () => {
    vi.resetModules();
    const { cmdXPEvent } = await import('../src/commands/xp-event.js');
    const { loadState } = await import('../src/render/state.js');

    await cmdXPEvent('first-event', '50');
    vi.resetModules();
    const { cmdXPEvent: cmdXPEvent2 } = await import('../src/commands/xp-event.js');
    await cmdXPEvent2('second-event', '75');

    vi.resetModules();
    const { loadState: loadState2 } = await import('../src/render/state.js');
    const state = await loadState2();
    expect(state.xp.xp).toBe(125);
    expect(state.xp.eventXP).toBe(125);
  });
});

// ---------------------------------------------------------------------------
// 7. xp-event: level recalculated after XP addition
// ---------------------------------------------------------------------------

describe('xp-event: level recalculated after XP addition', () => {
  it('recalculates level when XP crosses a threshold', async () => {
    vi.resetModules();
    const { cmdXPEvent } = await import('../src/commands/xp-event.js');
    const { loadState } = await import('../src/render/state.js');

    // 100 XP is the threshold for level 2
    const result = await cmdXPEvent('big-event', '100');
    expect(result).toBe(0);

    const state = await loadState();
    expect(state.xp.xp).toBe(100);
    expect(state.xp.level).toBe(2);
  });

  it('stays at level 1 for XP below threshold', async () => {
    vi.resetModules();
    const { cmdXPEvent } = await import('../src/commands/xp-event.js');
    const { loadState } = await import('../src/render/state.js');

    await cmdXPEvent('small-event', '10');

    const state = await loadState();
    expect(state.xp.level).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 8. xp-event: invalid amount returns error
// ---------------------------------------------------------------------------

describe('xp-event: validation errors return exit code 1', () => {
  it('returns 1 for non-numeric amount', async () => {
    vi.resetModules();
    const { cmdXPEvent } = await import('../src/commands/xp-event.js');
    const result = await cmdXPEvent('my-event', 'abc');
    expect(result).toBe(1);
  });

  it('returns 1 for negative amount', async () => {
    vi.resetModules();
    const { cmdXPEvent } = await import('../src/commands/xp-event.js');
    const result = await cmdXPEvent('my-event', '-5');
    expect(result).toBe(1);
  });

  it('returns 1 for zero amount', async () => {
    vi.resetModules();
    const { cmdXPEvent } = await import('../src/commands/xp-event.js');
    const result = await cmdXPEvent('my-event', '0');
    expect(result).toBe(1);
  });

  it('returns 1 for float amount', async () => {
    vi.resetModules();
    const { cmdXPEvent } = await import('../src/commands/xp-event.js');
    const result = await cmdXPEvent('my-event', '3.14');
    expect(result).toBe(1);
  });

  it('returns 1 for empty event name', async () => {
    vi.resetModules();
    const { cmdXPEvent } = await import('../src/commands/xp-event.js');
    const result = await cmdXPEvent('', '50');
    expect(result).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 9. eventXP is preserved after simulated sync (state persistence)
// ---------------------------------------------------------------------------

describe('xp-event: eventXP persists across state loads', () => {
  it('eventXP is still present in state after saving and reloading', async () => {
    vi.resetModules();
    const { cmdXPEvent } = await import('../src/commands/xp-event.js');

    // Register an XP event
    await cmdXPEvent('hook-completed', '200');

    // Reload state from disk to verify persistence
    vi.resetModules();
    const { loadState } = await import('../src/render/state.js');
    const state = await loadState();

    expect(state.xp.eventXP).toBe(200);
    expect(state.xp.xp).toBe(200);
  });

  it('eventXP is not reset after a manual state save (sync simulation)', async () => {
    vi.resetModules();
    const { cmdXPEvent } = await import('../src/commands/xp-event.js');

    // Add event XP
    await cmdXPEvent('pre-sync-event', '150');

    // Simulate a sync: load state, update lastSyncedAt, save
    vi.resetModules();
    const { loadState, saveState } = await import('../src/render/state.js');
    const stateBeforeSync = await loadState();
    stateBeforeSync.xp.lastSyncedAt = new Date().toISOString();
    await saveState(stateBeforeSync);

    // Reload and verify eventXP survived the sync
    vi.resetModules();
    const { loadState: loadState2 } = await import('../src/render/state.js');
    const stateAfterSync = await loadState2();

    expect(stateAfterSync.xp.eventXP).toBe(150);
    expect(stateAfterSync.xp.xp).toBe(150);
  });
});
