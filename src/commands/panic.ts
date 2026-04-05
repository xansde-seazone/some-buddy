import * as fs from 'node:fs/promises';
import * as readline from 'node:readline';
import { paths } from '../paths.js';
import { getOriginalBackup, restoreFromBackup } from '../backup.js';
import { sha256, writeJSON } from '../fs-atomic.js';
import { manualRestoreCommand } from './panic-path.js';
import type { InstallState } from '../types.js';

async function promptYesNo(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer === 'y' || answer === 'Y');
    });
  });
}

export async function cmdPanic(opts?: { yes?: boolean }): Promise<number> {
  const {
    source: originalBackupPath,
    target: targetPath,
    command: manualCmd,
  } = manualRestoreCommand();

  try {
    // Step 1: Load original backup meta (re-verifies sha256 internally)
    let meta: Awaited<ReturnType<typeof getOriginalBackup>>;
    try {
      meta = await getOriginalBackup();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\nFailed to read original backup: ${msg}`);
      console.error(`Manual restore: ${manualCmd}`);
      return 1;
    }

    if (meta === null) {
      console.error(
        `\nNo original backup found at: ${originalBackupPath}\n` +
          `Either my-buddy was never installed, or the original backup was deleted/corrupted.`,
      );
      return 1;
    }

    // Step 2: target is already known via manualRestoreCommand()

    // Step 3: Print context before prompting
    let fileSize: number;
    try {
      const stat = await fs.stat(meta.path);
      fileSize = stat.size;
    } catch {
      fileSize = -1;
    }

    console.log(`\nEMERGENCY RESTORE\n`);
    console.log(`Source (original backup):  ${meta.path}`);
    console.log(`  Created at:  ${meta.createdAt}`);
    console.log(`  Size:        ${fileSize >= 0 ? `${fileSize} bytes` : 'unknown'}`);
    console.log(`  SHA-256:     ${meta.sha256}`);
    console.log(`Target (Claude settings):  ${targetPath}\n`);
    console.log(`This will OVERWRITE the current Claude settings.json with the original backup.`);

    // Step 4: Prompt unless --yes
    if (!opts?.yes) {
      if (!process.stdin.isTTY) {
        console.error(`\nRefusing to proceed without --yes in non-interactive mode`);
        return 1;
      }
      const confirmed = await promptYesNo(`\nProceed? [y/N] `);
      if (!confirmed) {
        console.log(`Aborted.`);
        return 0;
      }
    }

    // Step 5: Restore
    await restoreFromBackup(meta, targetPath);

    // Step 6: Post-verify
    let restoredContent: Buffer;
    try {
      restoredContent = await fs.readFile(targetPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\nCATASTROPHIC: Restore may have failed — cannot read target file: ${msg}`);
      console.error(`Manual restore: ${manualCmd}`);
      return 1;
    }

    const restoredHash = sha256(restoredContent);
    if (restoredHash !== meta.sha256) {
      console.error(
        `\nCATASTROPHIC: Post-restore SHA-256 mismatch!\n` +
          `  Expected: ${meta.sha256}\n` +
          `  Got:      ${restoredHash}\n` +
          `\nManual restore: ${manualCmd}`,
      );
      return 1;
    }

    // Step 7: Clear InstallState — best effort
    try {
      const cleared: InstallState = {
        installed: false,
        installedAt: null,
        claudeSettingsPath: null,
      };
      await writeJSON(paths.install(), cleared);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`\nWarning: could not clear install state: ${msg}`);
    }

    // Step 8: Success
    console.log(`\nRestored. Claude settings.json is now byte-identical to the original backup.`);
    console.log(`Restart Claude Code to pick up the change.`);
    return 0;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nUnexpected error during panic: ${msg}`);
    console.error(`Manual restore: ${manualCmd}`);
    return 1;
  }
}
