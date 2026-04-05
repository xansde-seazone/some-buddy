import { paths } from '../paths.js';

export interface ManualRestoreInfo {
  source: string;
  target: string;
  command: string;
}

/**
 * Returns the paths and shell command for a manual emergency restore.
 * Safe to call at any time — no I/O, no side effects.
 */
export function manualRestoreCommand(): ManualRestoreInfo {
  const source = paths.originalBackup();
  const target = paths.claudeSettings();
  const command = `cp "${source}" "${target}"`;
  return { source, target, command };
}
