import * as fs from 'node:fs/promises';
import type { AppState } from '../types.js';
import { paths, sanitizeBuddyName } from '../paths.js';
import { readJSON, writeJSON } from '../fs-atomic.js';

export async function cmdUse(name: string): Promise<number> {
  const sanitized = sanitizeBuddyName(name);
  if (!sanitized) {
    console.error(`Invalid buddy name: "${name}".`);
    return 1;
  }

  const buddyPath = paths.buddy(sanitized);
  try {
    await fs.access(buddyPath);
  } catch {
    console.error(`Buddy "${sanitized}" not found at: ${buddyPath}`);
    // List available buddies
    try {
      const entries = await fs.readdir(paths.buddiesDir());
      const names = entries.filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
      if (names.length > 0) {
        console.error(`Available buddies: ${names.join(', ')}`);
      } else {
        console.error('No buddies found. Run: my-buddy new <name>');
      }
    } catch {
      console.error('No buddies found. Run: my-buddy new <name>');
    }
    return 1;
  }

  const existing = await readJSON<AppState>(paths.state());
  const defaultXP: AppState['xp'] = {
    xp: 0, level: 1, streak: 0, lastActiveDate: null,
    lastSyncedAt: null, lastProcessedCursors: {}, eventXP: 0,
  };
  const next: AppState = {
    activeBuddy: sanitized,
    lastContext: existing?.lastContext ?? { cwd: null, branch: null, model: null },
    refreshCount: existing?.refreshCount ?? 0,
    xp: existing?.xp ?? defaultXP,
  };

  await paths.ensureHomeStructure();
  await writeJSON(paths.state(), next);

  console.log(`Active buddy set to: ${sanitized}`);
  return 0;
}
