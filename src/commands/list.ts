import * as fs from 'node:fs/promises';
import type { Buddy, AppState, Frame } from '../types.js';
import { paths } from '../paths.js';
import { readJSON } from '../fs-atomic.js';
import { colorizeFrame } from '../render/color.js';

export async function cmdList(): Promise<number> {
  let entries: string[];
  try {
    entries = await fs.readdir(paths.buddiesDir());
  } catch {
    console.log('No buddies yet. Run: my-buddy new <name>');
    return 0;
  }

  const jsonFiles = entries.filter((f) => f.endsWith('.json'));
  if (jsonFiles.length === 0) {
    console.log('No buddies yet. Run: my-buddy new <name>');
    return 0;
  }

  const state = await readJSON<AppState>(paths.state());
  const activeName = state?.activeBuddy ?? null;

  for (const file of jsonFiles.sort()) {
    const buddyPath = `${paths.buddiesDir()}/${file}`;
    let buddy: Buddy | null = null;
    try {
      buddy = await readJSON<Buddy>(buddyPath);
      if (!buddy || !buddy.name || !Array.isArray(buddy.frames) || buddy.frames.length === 0) {
        console.warn(`  [warn] Skipping invalid buddy file: ${file}`);
        continue;
      }
    } catch {
      console.warn(`  [warn] Could not read buddy file: ${file}`);
      continue;
    }

    const isActive = buddy.name === activeName;
    const prefix = isActive ? '* ' : '  ';
    console.log(`${prefix}${buddy.name}`);

    const frame = buddy.frames[0] as Frame;
    const lines = colorizeFrame(frame);
    for (const line of lines) {
      console.log(`    ${line}`);
    }
    console.log();
  }

  return 0;
}
