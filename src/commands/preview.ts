import type { Frame } from '../types.js';
import { sanitizeBuddyName } from '../paths.js';
import { loadBuddy } from '../render/index.js';
import { substituteEyes } from '../render/frames.js';
import { colorizeFrame } from '../render/color.js';

export async function cmdPreview(name: string): Promise<number> {
  const sanitized = sanitizeBuddyName(name);
  if (!sanitized) {
    console.error(`Invalid buddy name: "${name}".`);
    return 1;
  }

  const buddy = await loadBuddy(sanitized);
  if (!buddy) {
    console.error(`Buddy "${sanitized}" not found.`);
    return 1;
  }

  for (let i = 0; i < buddy.frames.length; i++) {
    const frame = buddy.frames[i] as Frame;
    console.log(`--- Frame ${i} ---`);
    const substituted = substituteEyes(frame, buddy.eyes);
    const lines = colorizeFrame(substituted);
    for (const line of lines) {
      console.log(line);
    }
    if (i < buddy.frames.length - 1) {
      console.log();
    }
  }

  return 0;
}
