import * as fs from 'node:fs/promises';
import * as readline from 'node:readline/promises';
import { paths } from '../paths.js';
import { readJSON, writeJSON } from '../fs-atomic.js';
import {
  createOriginalBackup,
  createRotatingBackup,
  getLatestRotatingBackup,
  restoreFromBackup,
} from '../backup.js';
import type { InstallState } from '../types.js';

interface StatusLineConfig {
  type: 'command';
  command: string;
  padding: number;
}

interface ClaudeSettings {
  statusLine?: StatusLineConfig;
  [key: string]: unknown;
}

function buildStatusLineConfig(): StatusLineConfig {
  const cliPath = new URL('../cli.js', import.meta.url).pathname;
  return { type: 'command', command: `node ${cliPath}`, padding: 0 };
}

function isOurs(existing: StatusLineConfig | undefined, ours: StatusLineConfig): boolean {
  return existing !== undefined && existing.command === ours.command;
}

async function promptConfirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(question);
    return answer.trim().toLowerCase().startsWith('y');
  } finally {
    rl.close();
  }
}

export async function cmdInstall(opts?: { dryRun?: boolean; yes?: boolean }): Promise<number> {
  const claudeSettingsPath = paths.claudeSettings();
  const statusLineConfig = buildStatusLineConfig();

  // Load existing settings or start fresh
  const existing = (await readJSON<ClaudeSettings>(claudeSettingsPath)) ?? {};

  // Detect conflict: statusLine exists and is not ours
  if (existing.statusLine !== undefined && !isOurs(existing.statusLine, statusLineConfig)) {
    if (opts?.yes !== true) {
      if (!process.stdout.isTTY) {
        console.error(
          'error: settings.json already has a statusLine not written by my-buddy.\n' +
            'Re-run with --yes to overwrite, or edit manually.',
        );
        return 1;
      }
      const ok = await promptConfirm('settings.json already has a statusLine. Overwrite? [y/N] ');
      if (!ok) {
        console.log('Aborted.');
        return 1;
      }
    }
  }

  const merged: ClaudeSettings = { ...existing, statusLine: statusLineConfig };

  // FR-029: validate roundtrip
  JSON.parse(JSON.stringify(merged));

  if (opts?.dryRun) {
    console.log('--- dry-run: would write to', claudeSettingsPath);
    console.log('Before:', JSON.stringify(existing, null, 2));
    console.log('After:', JSON.stringify(merged, null, 2));
    return 0;
  }

  // Check if settings file exists (for backup decision)
  const settingsExist = await fs
    .access(claudeSettingsPath)
    .then(() => true)
    .catch(() => false);

  await paths.ensureHomeStructure();

  let rotatingMeta = null;
  try {
    if (settingsExist) {
      await createOriginalBackup(claudeSettingsPath);
      rotatingMeta = await createRotatingBackup(claudeSettingsPath);
    }

    await writeJSON(claudeSettingsPath, merged);

    // FR-029: verify written file reads back identical
    const written = await readJSON<ClaudeSettings>(claudeSettingsPath);
    if (JSON.stringify(written) !== JSON.stringify(merged)) {
      throw new Error('Written settings.json does not round-trip correctly');
    }

    // Update install state
    const installState: InstallState = {
      installed: true,
      installedAt: new Date().toISOString(),
      claudeSettingsPath,
    };
    await writeJSON(paths.install(), installState);

    const originalPath = paths.originalBackup();
    console.log('my-buddy installed successfully.');
    console.log('  Settings:', claudeSettingsPath);
    if (settingsExist) {
      console.log('  Original backup:', originalPath);
      console.log(`  Manual restore:  cp "${originalPath}" "${claudeSettingsPath}"`);
    }
    return 0;
  } catch (err) {
    console.error('Install failed:', (err as Error).message);

    // FR-027: auto-rollback
    if (rotatingMeta !== null) {
      try {
        // prefer the rotating backup taken just before we wrote
        const latest = await getLatestRotatingBackup();
        const target = latest ?? rotatingMeta;
        await restoreFromBackup(target, claudeSettingsPath);
        console.error('Auto-rollback succeeded: settings restored from rotating backup.');
      } catch (rollbackErr) {
        console.error('Auto-rollback FAILED:', (rollbackErr as Error).message);
        console.error(`Manual restore: cp "${rotatingMeta.path}" "${claudeSettingsPath}"`);
      }
    } else if (!settingsExist) {
      await fs.unlink(claudeSettingsPath).catch(() => undefined);
      console.error(
        'Auto-rollback: removed newly-created settings.json (pre-install state had no file).',
      );
    }
    return 1;
  }
}
