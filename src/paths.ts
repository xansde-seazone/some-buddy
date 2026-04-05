import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

export const BUDDY_HOME = path.join(os.homedir(), '.my-buddy');

/**
 * Sanitize a buddy name: lowercase, spaces→'-', strip anything that isn't
 * alphanumeric or '-'. Collapses consecutive '-' and trims leading/trailing '-'.
 */
export function sanitizeBuddyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const paths = {
  buddiesDir(): string {
    return path.join(BUDDY_HOME, 'buddies');
  },

  buddy(name: string): string {
    const safe = sanitizeBuddyName(name);
    return path.join(BUDDY_HOME, 'buddies', `${safe}.json`);
  },

  originalBackup(): string {
    return path.join(BUDDY_HOME, 'backups', 'original-settings.json');
  },

  originalBackupMeta(): string {
    return path.join(BUDDY_HOME, 'backups', 'original-settings.meta.json');
  },

  rotatingDir(): string {
    return path.join(BUDDY_HOME, 'backups', 'rotating');
  },

  rotatingBackup(timestamp: string): string {
    return path.join(BUDDY_HOME, 'backups', 'rotating', `settings-${timestamp}.json`);
  },

  rotatingBackupMeta(timestamp: string): string {
    return path.join(BUDDY_HOME, 'backups', 'rotating', `settings-${timestamp}.meta.json`);
  },

  state(): string {
    return path.join(BUDDY_HOME, 'state.json');
  },

  install(): string {
    return path.join(BUDDY_HOME, 'install.json');
  },

  /**
   * Claude settings path. On Linux, macOS, and WSL the Claude home is
   * always the Linux home directory (~/.claude/settings.json).
   */
  claudeSettings(): string {
    return path.join(os.homedir(), '.claude', 'settings.json');
  },

  /** mkdir -p for all required directories */
  async ensureHomeStructure(): Promise<void> {
    const dirs = [
      BUDDY_HOME,
      paths.buddiesDir(),
      path.join(BUDDY_HOME, 'backups'),
      paths.rotatingDir(),
    ];
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  },
};
