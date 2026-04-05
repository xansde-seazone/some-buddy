import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256File(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function sha256OfFile(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return sha256File(buf);
}

async function dirExists(p: string): Promise<boolean> {
  try {
    const s = await fs.stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Per-test HOME isolation
// ---------------------------------------------------------------------------

let tempHome: string;
let originalHome: string | undefined;

beforeEach(async () => {
  originalHome = process.env.HOME;
  tempHome = path.join(os.tmpdir(), `buddy-test-${crypto.randomUUID()}`);
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

// Dynamic import helpers — called after HOME is set and modules are reset
async function importPaths() {
  const mod = await import('../src/paths.js');
  return mod;
}

async function importInstall() {
  const mod = await import('../src/commands/install.js');
  return mod.cmdInstall;
}

async function importUninstall() {
  const mod = await import('../src/commands/uninstall.js');
  return mod.cmdUninstall;
}

async function importPanic() {
  const mod = await import('../src/commands/panic.js');
  return mod.cmdPanic;
}

// ---------------------------------------------------------------------------
// Silence console noise for all tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

// ---------------------------------------------------------------------------
// Test 1: Install → Uninstall round-trip is byte-identical (SC-002)
// ---------------------------------------------------------------------------

describe('SC-002: install → uninstall round-trip is byte-identical', () => {
  it('restores settings.json to byte-identical original after uninstall', async () => {
    // 1. Pre-populate ~/.claude/settings.json
    const settingsPath = path.join(tempHome, '.claude', 'settings.json');
    const originalContent = JSON.stringify({
      foo: 'bar',
      statusLine: { type: 'command', command: 'old' },
      other: [1, 2, 3],
    });
    await fs.writeFile(settingsPath, originalContent, 'utf8');

    // 2. SHA-256 of original
    const originalSha = await sha256OfFile(settingsPath);

    // Re-reset modules so paths sees our HOME
    vi.resetModules();
    const cmdInstall = await importInstall();
    const { paths } = await importPaths();

    // 3. Install
    const installResult = await cmdInstall({ yes: true });
    expect(installResult).toBe(0);

    // 4. Verify settings.json contains original keys + new statusLine
    const afterInstall = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    expect(afterInstall.foo).toBe('bar');
    expect(afterInstall.other).toEqual([1, 2, 3]);
    expect(afterInstall.statusLine).toBeDefined();
    expect(afterInstall.statusLine.type).toBe('command');
    expect(afterInstall.statusLine.command).toMatch(/cli\.js/);
    expect(afterInstall.statusLine.command).not.toBe('old');

    // 5. Verify original backup exists and content matches pre-install file
    const originalBackupPath = paths.originalBackup();
    expect(await fileExists(originalBackupPath)).toBe(true);
    const backupContent = await fs.readFile(originalBackupPath, 'utf8');
    expect(backupContent).toBe(originalContent);

    // 6. Uninstall
    vi.resetModules();
    const cmdUninstall = await importUninstall();
    const uninstallResult = await cmdUninstall({ yes: true });
    expect(uninstallResult).toBe(0);

    // 7. Verify byte-identical restore
    const afterUninstallSha = await sha256OfFile(settingsPath);
    expect(afterUninstallSha).toBe(originalSha);
  });
});

// ---------------------------------------------------------------------------
// Test 2: Dry-run makes zero filesystem writes (FR-032)
// ---------------------------------------------------------------------------

describe('FR-032: dry-run makes zero filesystem writes', () => {
  it('does not modify settings.json or create ~/.my-buddy/ when dryRun=true', async () => {
    // 1. Create ~/.claude/settings.json
    const settingsPath = path.join(tempHome, '.claude', 'settings.json');
    const originalContent = JSON.stringify({ hello: 'world' });
    await fs.writeFile(settingsPath, originalContent, 'utf8');

    // 2. Record mtime
    const statBefore = await fs.stat(settingsPath);
    const mtimeBefore = statBefore.mtimeMs;

    // 3. Verify ~/.my-buddy/ does not exist
    const buddyHome = path.join(tempHome, '.my-buddy');
    expect(await dirExists(buddyHome)).toBe(false);

    vi.resetModules();
    const cmdInstall = await importInstall();

    // 4. Dry-run install
    const result = await cmdInstall({ dryRun: true, yes: true });
    expect(result).toBe(0);

    // 5. Verify settings.json mtime unchanged
    const statAfter = await fs.stat(settingsPath);
    expect(statAfter.mtimeMs).toBe(mtimeBefore);

    // 6. Verify ~/.my-buddy/ still does NOT exist
    expect(await dirExists(buddyHome)).toBe(false);

    // 7. Verify no backups were created
    const backupDir = path.join(buddyHome, 'backups');
    expect(await dirExists(backupDir)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test 3: Install into non-existent settings.json (FR-027)
// ---------------------------------------------------------------------------

describe('FR-027: install with no pre-existing settings.json', () => {
  it('creates settings.json fresh; uninstall refuses (no rotating backup)', async () => {
    const settingsPath = path.join(tempHome, '.claude', 'settings.json');

    // 1. Verify settings.json does NOT exist
    expect(await fileExists(settingsPath)).toBe(false);

    vi.resetModules();
    const cmdInstall = await importInstall();

    // 2. Install — should succeed, creates fresh settings.json
    const installResult = await cmdInstall({ yes: true });
    expect(installResult).toBe(0);

    // 3. Verify settings.json now exists and contains statusLine
    expect(await fileExists(settingsPath)).toBe(true);
    const content = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    expect(content.statusLine).toBeDefined();
    expect(content.statusLine.type).toBe('command');

    // 4. Capture installed settings content before uninstall attempt
    const installedContent = await fs.readFile(settingsPath, 'utf8');

    vi.resetModules();
    const cmdUninstall = await importUninstall();

    // 5. Uninstall should REFUSE because no rotating backup was created
    // (install.ts skips backup when settingsExist=false).
    // This matches FR-033: refuse if rotating backup is missing.
    const uninstallResult = await cmdUninstall({ yes: true });
    expect(uninstallResult).toBe(1);

    // 6. Verify settings.json was NOT changed from installed state
    const contentAfter = await fs.readFile(settingsPath, 'utf8');
    expect(contentAfter).toBe(installedContent);
  });
});

// ---------------------------------------------------------------------------
// Test 4: Panic restores from original backup regardless of state (SC-009, FR-035)
// ---------------------------------------------------------------------------

describe('SC-009 / FR-035: panic restores original backup regardless of internal state', () => {
  it('restores byte-identical original even with corrupted state and missing rotating backup', async () => {
    const settingsPath = path.join(tempHome, '.claude', 'settings.json');
    const originalContent = JSON.stringify({ original: 'state' });
    await fs.writeFile(settingsPath, originalContent, 'utf8');

    // 1. Install
    vi.resetModules();
    const cmdInstall = await importInstall();
    const installResult = await cmdInstall({ yes: true });
    expect(installResult).toBe(0);

    // 2. Mess up settings.json
    await fs.writeFile(settingsPath, JSON.stringify({ corrupted: 'oh no' }), 'utf8');

    // 3. Get paths so we can delete rotating backup and install.json
    vi.resetModules();
    const { paths } = await importPaths();

    // Delete the rotating backup dir
    const rotatingDir = paths.rotatingDir();
    await fs.rm(rotatingDir, { recursive: true, force: true });

    // Delete install.json
    await fs.rm(paths.install(), { force: true });

    // 4. Run panic
    vi.resetModules();
    const cmdPanic = await importPanic();
    const panicResult = await cmdPanic({ yes: true });
    expect(panicResult).toBe(0);

    // 5. Verify settings.json is byte-identical to original
    const restoredContent = await fs.readFile(settingsPath, 'utf8');
    expect(restoredContent).toBe(originalContent);
  });
});

// ---------------------------------------------------------------------------
// Test 5: Panic refuses if original backup is missing (FR-033)
// ---------------------------------------------------------------------------

describe('FR-033: panic refuses when original backup is missing', () => {
  it('returns 1 and does not touch settings.json when no original backup exists', async () => {
    const settingsPath = path.join(tempHome, '.claude', 'settings.json');
    const originalContent = JSON.stringify({ safe: 'value' });
    await fs.writeFile(settingsPath, originalContent, 'utf8');

    // Never installed anything — no backups exist
    vi.resetModules();
    const cmdPanic = await importPanic();
    const result = await cmdPanic({ yes: true });
    expect(result).toBe(1);

    // Verify settings.json was NOT touched
    const contentAfter = await fs.readFile(settingsPath, 'utf8');
    expect(contentAfter).toBe(originalContent);
  });
});

// ---------------------------------------------------------------------------
// Test 6: Uninstall refuses if rotating backup is missing (FR-033)
// ---------------------------------------------------------------------------

describe('FR-033: uninstall refuses when rotating backup is missing', () => {
  it('returns 1 and leaves settings.json in installed state', async () => {
    const settingsPath = path.join(tempHome, '.claude', 'settings.json');
    await fs.writeFile(settingsPath, JSON.stringify({ existing: 'config' }), 'utf8');

    // 1. Install
    vi.resetModules();
    const cmdInstall = await importInstall();
    const installResult = await cmdInstall({ yes: true });
    expect(installResult).toBe(0);

    // 2. Capture installed state
    const installedContent = await fs.readFile(settingsPath, 'utf8');

    // 3. Delete the rotating backup directory
    vi.resetModules();
    const { paths } = await importPaths();
    const rotatingDir = paths.rotatingDir();
    await fs.rm(rotatingDir, { recursive: true, force: true });

    // 4. Uninstall should refuse
    vi.resetModules();
    const cmdUninstall = await importUninstall();
    const uninstallResult = await cmdUninstall({ yes: true });
    expect(uninstallResult).toBe(1);

    // 5. Verify settings.json was NOT changed from installed state
    const contentAfter = await fs.readFile(settingsPath, 'utf8');
    expect(contentAfter).toBe(installedContent);
  });
});
