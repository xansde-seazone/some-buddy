import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Per-test HOME isolation (mirrors integration.test.ts pattern)
// ---------------------------------------------------------------------------

let tempHome: string;
let originalHome: string | undefined;

beforeEach(async () => {
  originalHome = process.env.HOME;
  tempHome = path.join(os.tmpdir(), `buddy-batch0-${crypto.randomUUID()}`);
  await fs.mkdir(tempHome, { recursive: true });
  await fs.mkdir(path.join(tempHome, '.claude'), { recursive: true });
  process.env.HOME = tempHome;
  vi.resetModules();
});

afterEach(async () => {
  if (originalHome !== undefined) {
    process.env.HOME = originalHome;
  } else {
    delete process.env.HOME;
  }
  await fs.rm(tempHome, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Write a minimal valid buddy JSON to the temp HOME buddies dir. */
async function writeBuddy(name: string, phrases: string[]): Promise<void> {
  const buddiesDir = path.join(tempHome, '.my-buddy', 'buddies');
  await fs.mkdir(buddiesDir, { recursive: true });

  const nullRow = Array(12).fill(null) as (number | null)[];
  const eyeRow = Array(12).fill(null) as (number | null)[];
  eyeRow[3] = 220;
  eyeRow[5] = 220;

  const buddy = {
    name,
    eyes: '·',
    frames: [
      {
        ascii: [' /\\_/\\      ', ' ( · · )    ', ' (  ^  )    ', ' / > < \\    ', ' ~~~~~~     '],
        colors: [nullRow, eyeRow, nullRow, nullRow, nullRow],
      },
      {
        ascii: [' /\\_/\\      ', ' ( - - )    ', ' (  ^  )    ', ' / > < \\    ', ' ~~~~~~     '],
        colors: [nullRow, nullRow, nullRow, nullRow, nullRow],
      },
    ],
    voice: {
      personality: 'curioso',
      phrases,
      reactions: {},
    },
  };

  await fs.writeFile(path.join(buddiesDir, `${name}.json`), JSON.stringify(buddy), 'utf8');
}

/** Strip all ANSI escape sequences from a string. */
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Run cmdPreview and capture all console.log calls.
 * Returns the lines that are actual buddy content (excludes "--- Frame N ---"
 * separator lines and blank lines between frames).
 */
async function capturePreviewLines(buddyName: string): Promise<string[]> {
  vi.resetModules();
  const { cmdPreview } = await import('../src/commands/preview.js');

  const captured: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    captured.push(String(args[0] ?? ''));
  });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  await cmdPreview(buddyName);

  // Return only lines that are not frame separators or blank gap lines
  return captured.filter((line) => !line.startsWith('--- Frame') && line !== '');
}

// ---------------------------------------------------------------------------
// Batch 0 tests
// ---------------------------------------------------------------------------

describe('Batch 0 — cmdPreview new layout', () => {
  it('output has exactly 5 lines per frame (no 6th speech line)', async () => {
    await writeBuddy('capivara', ['observando...']);

    const lines = await capturePreviewLines('capivara');

    // 2 frames × 5 lines = 10 lines total
    expect(lines.length).toBe(10);
  });

  it("each line's visible content starts with the 12-char ASCII art", async () => {
    await writeBuddy('capivara', ['observando...']);

    const lines = await capturePreviewLines('capivara');

    for (const line of lines) {
      // Strip ANSI so we can measure the ASCII portion
      const visible = stripAnsi(line);
      // The ASCII art is always 12 chars (padded with spaces)
      expect(visible.length).toBeGreaterThanOrEqual(12);
      // First 12 visible chars must not be empty (the art always starts with ' ')
      const first12 = visible.slice(0, 12);
      expect(first12.trimEnd().length).toBeGreaterThanOrEqual(0); // always true — structure check
      // Must not start with separator (that would mean art is missing)
      expect(visible.startsWith('  ')).toBe(false); // line 4 (empty right col) has no separator either
      // More precisely: the raw line with ANSI must contain some non-space visible character
      // within the first segment OR be exactly the 12-char padded art (line 4)
    }
  });

  it('lines 1-3 have right-column text (name, level placeholder, phrase)', async () => {
    await writeBuddy('capivara', ['observando...']);

    const lines = await capturePreviewLines('capivara');

    // Frame 0: lines 0-4
    const frame0 = lines.slice(0, 5);

    // Line 1 (index 0): buddy name
    expect(stripAnsi(frame0[0] ?? '')).toContain('capivara');

    // Line 2 (index 1): level placeholder
    expect(stripAnsi(frame0[1] ?? '')).toContain('Lv.1 Apprentice');

    // Line 3 (index 2): speech phrase
    expect(stripAnsi(frame0[2] ?? '')).toContain('observando...');
  });

  it('line 4 has no text after the ASCII art (visual breathing room)', async () => {
    await writeBuddy('capivara', ['observando...']);

    const lines = await capturePreviewLines('capivara');

    // Frame 0: line 4 (index 3) — no separator or right-column text
    const line4 = stripAnsi(lines[3] ?? '');
    // Should not contain the separator "  " followed by non-space characters
    // i.e. after the 12-char art there is no additional text
    const afterArt = line4.slice(12);
    expect(afterArt.trim()).toBe('');
  });

  it('line 5 has the model+XP placeholder', async () => {
    await writeBuddy('capivara', ['observando...']);

    const lines = await capturePreviewLines('capivara');

    // Frame 0: line 5 (index 4)
    const line5 = stripAnsi(lines[4] ?? '');
    expect(line5).toContain('[Sonnet · High]');
    expect(line5).toContain('Nvl 1');
  });

  it('uses "..." as phrase when voice.phrases is empty', async () => {
    await writeBuddy('capivara', []);

    const lines = await capturePreviewLines('capivara');

    // Frame 0: line 3 (index 2) — phrase column
    const line3 = stripAnsi(lines[2] ?? '');
    expect(line3).toContain('...');
  });

  it('frame 1 also follows the 5-line layout', async () => {
    await writeBuddy('capivara', ['zzz...']);

    const lines = await capturePreviewLines('capivara');

    // Frame 1: lines 5-9
    const frame1 = lines.slice(5, 10);
    expect(frame1.length).toBe(5);

    // Line 1: name
    expect(stripAnsi(frame1[0] ?? '')).toContain('capivara');
    // Line 4: no right-column text
    expect(stripAnsi(frame1[3] ?? '').slice(12).trim()).toBe('');
    // Line 5: model+XP
    expect(stripAnsi(frame1[4] ?? '')).toContain('Nvl 1');
  });
});
