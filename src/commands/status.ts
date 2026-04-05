import type { InstallState, AppState } from '../types.js';
import { paths, BUDDY_HOME } from '../paths.js';
import { readJSON } from '../fs-atomic.js';
import { getOriginalBackup } from '../backup.js';
import { manualRestoreCommand } from './panic-path.js';

export async function cmdStatus(): Promise<number> {
  const install = await readJSON<InstallState>(paths.install());
  const state = await readJSON<AppState>(paths.state());

  const installed = install?.installed ?? false;
  const claudeSettingsPath = install?.claudeSettingsPath ?? null;
  const activeBuddy = state?.activeBuddy ?? null;

  // Check original backup presence (re-verifies sha256)
  let originalBackupPresent = false;
  try {
    const meta = await getOriginalBackup();
    originalBackupPresent = meta !== null;
  } catch {
    // sha256 mismatch = corrupted = treat as missing for status purposes
    originalBackupPresent = false;
  }

  const { source: originalBackupPath, command: restoreCmd } = manualRestoreCommand();

  console.log(`Installed:    ${installed ? 'yes' : 'no'}`);
  if (installed && claudeSettingsPath) {
    console.log(`Settings:     ${claudeSettingsPath}`);
  }
  console.log(`Active buddy: ${activeBuddy ?? '(none)'}`);
  console.log(`Buddy home:   ${BUDDY_HOME}`);
  console.log(
    `Orig backup:  ${originalBackupPath}  [${originalBackupPresent ? 'present' : 'missing'}]`,
  );
  console.log(`Restore cmd:  ${restoreCmd}`);

  return 0;
}
