import type { Frame } from '../types.js';
import { sanitizeBuddyName } from '../paths.js';
import { loadBuddy } from '../render/index.js';
import { substituteEyes } from '../render/frames.js';
import { colorizeFrame } from '../render/color.js';

// Separator between the 12-char ASCII art column and the right-column text
const SEPARATOR = '  ';

// Placeholder strings used in preview for right-column content
const PLACEHOLDER_LEVEL = 'Lv.1 Apprentice';
const PLACEHOLDER_MODEL = '[Sonnet · High] [░░░░░░░░] Nvl 1';

/**
 * Renders a single frame in the new 5-line statusLine layout:
 *   Line 1: [12-char ASCII]  [buddy name]
 *   Line 2: [12-char ASCII]  [Lv.N LevelName]
 *   Line 3: [12-char ASCII]  [speech phrase]
 *   Line 4: [12-char ASCII]
 *   Line 5: [12-char ASCII]  [Model · Effort] [████░░░░] Nvl N
 */
function renderFrameWithLayout(
  frame: Frame,
  buddyName: string,
  phrase: string,
): string[] {
  const colorized = colorizeFrame(frame);

  // Right-column text per line (empty string = no text on that line)
  const rightCol = [buddyName, PLACEHOLDER_LEVEL, phrase, '', PLACEHOLDER_MODEL];

  return colorized.map((asciiLine, i) => {
    const right = rightCol[i] ?? '';
    if (right === '') {
      return asciiLine;
    }
    return asciiLine + SEPARATOR + right;
  });
}

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

  // Use the first phrase from voice.phrases, or "..." if none are defined
  const phrase = buddy.voice.phrases[0] ?? '...';

  for (let i = 0; i < buddy.frames.length; i++) {
    const frame = buddy.frames[i] as Frame;
    console.log(`--- Frame ${i} ---`);
    const substituted = substituteEyes(frame, buddy.eyes);
    const lines = renderFrameWithLayout(substituted, buddy.name, phrase);
    for (const line of lines) {
      console.log(line);
    }
    if (i < buddy.frames.length - 1) {
      console.log();
    }
  }

  return 0;
}
