import * as readline from 'node:readline/promises';
import { paths } from '../paths.js';
import { readJSON, writeJSON, sha256 } from '../fs-atomic.js';
import { getLatestRotatingBackup, restoreFromBackup } from '../backup.js';
import type { InstallState } from '../types.js';
import * as fs from 'node:fs/promises';

async function promptConfirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(question);
    return answer.trim().toLowerCase().startsWith('y');
  } finally {
    rl.close();
  }
}

export async function cmdUninstall(opts?: { yes?: boolean }): Promise<number> {
  // Step 1: load install state
  const installState = await readJSON<InstallState>(paths.install());
  if (!installState?.installed) {
    console.log('my-buddy is not installed. Nothing to do.');
    return 0;
  }

  if (!installState.claudeSettingsPath) {
    console.error('Install state is corrupted (missing settings path). Run: my-buddy panic');
    return 1;
  }
  const claudeSettingsPath = installState.claudeSettingsPath;

  // Step 2: verify rotating backup exists and is valid (FR-033: refuse if missing/corrupted)
  let rotatingMeta;
  try {
    rotatingMeta = await getLatestRotatingBackup();
  } catch {
    rotatingMeta = null;
  }

  if (rotatingMeta === null) {
    const originalPath = paths.originalBackup();
    console.error('error: no valid rotating backup found. Refusing to modify settings.');
    console.error('  Original backup:', originalPath);
    console.error(`  Manual restore:  cp "${originalPath}" "${claudeSettingsPath}"`);
    return 1;
  }

  // Step 3: confirm
  if (opts?.yes !== true) {
    if (!process.stdout.isTTY) {
      console.error('error: not a TTY. Re-run with --yes to confirm uninstall.');
      return 1;
    }
    const ok = await promptConfirm(
      `Restore settings.json from backup (${rotatingMeta.path})? [y/N] `,
    );
    if (!ok) {
      console.log('Aborted.');
      return 1;
    }
  }

  // Step 4: restore
  await restoreFromBackup(rotatingMeta, claudeSettingsPath);

  // Step 5: verify restored file hash matches backup
  const restoredContent = await fs.readFile(claudeSettingsPath);
  const restoredHash = sha256(restoredContent);
  if (restoredHash !== rotatingMeta.sha256) {
    const originalPath = paths.originalBackup();
    console.error('error: restored file SHA-256 does not match backup. File may be corrupted.');
    console.error(`  Manual restore: cp "${originalPath}" "${claudeSettingsPath}"`);
    return 1;
  }

  // Step 6: update install state
  const newState: InstallState = {
    installed: false,
    installedAt: null,
    claudeSettingsPath: null,
  };
  await writeJSON(paths.install(), newState);

  // Step 7: success
  console.log('my-buddy uninstalled successfully.');
  console.log('  settings.json is byte-identical to the pre-install rotating backup.');
  console.log('  Settings restored to:', claudeSettingsPath);
  const originalPath = paths.originalBackup();
  console.log('  Original backup:', originalPath);
  console.log(`  Manual restore:  cp "${originalPath}" "${claudeSettingsPath}"`);
  return 0;
}
