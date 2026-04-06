import * as fs from 'node:fs/promises';
import * as readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import type { Buddy, Frame } from '../types.js';
import { paths, sanitizeBuddyName } from '../paths.js';
import { writeJSON } from '../fs-atomic.js';

// Row 1 eye positions (col 3 and col 5) are colored 220 (yellow)
function makeColorsRow(eyeCols: number[]): (number | null)[] {
  const row: (number | null)[] = Array(12).fill(null) as (number | null)[];
  for (const col of eyeCols) {
    row[col] = 220;
  }
  return row;
}

function buildTemplate(sanitizedName: string): Buddy {
  const nullRow: (number | null)[] = Array(12).fill(null) as (number | null)[];
  const eyeRow = makeColorsRow([3, 5]);

  const baseColors: (number | null)[][] = [nullRow, eyeRow, nullRow, nullRow, nullRow];

  const frame0: Frame = {
    ascii: [' /\\_/\\      ', ' ( · · )    ', ' (  ^  )    ', ' / > < \\    ', ' ~~~~~~     '],
    colors: baseColors,
  };

  const frame1: Frame = {
    ascii: [' /\\_/\\      ', ' ( - - )    ', ' (  ^  )    ', ' / > < \\    ', ' ~~~~~~     '],
    colors: baseColors,
  };

  return {
    name: sanitizedName,
    eyes: '·',
    frames: [frame0, frame1],
    voice: {
      personality: 'curioso',
      phrases: ['zzz...', 'tudo calmo aqui', 'observando...'],
      reactions: {
        branch_changed: ['branch nova, eita'],
        cwd_changed: ['pra onde tô indo?'],
        model_changed: ['mudou de modelo, hein'],
        time_morning: ['bom dia!'],
        time_night: ['hora de dormir'],
        level_up: ['subi de nivel!', 'evoluindo...'],
        badge_unlocked: ['conquista nova!'],
        streak_milestone: ['que sequencia!'],
        idle_return: ['voltou! senti saudades'],
      },
    },
  };
}

async function confirmOverwrite(buddyPath: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    console.error(`Buddy file already exists: ${buddyPath}`);
    console.error('Cannot prompt for confirmation (no TTY). Aborting.');
    return false;
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`Buddy already exists at ${buddyPath}. Overwrite? [y/N] `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

function detectEditor(): string | null {
  const envEditor = process.env['EDITOR'];
  if (envEditor) return envEditor;

  for (const candidate of ['nano', 'vi']) {
    try {
      const result = spawnSync('which', [candidate], { encoding: 'utf8' });
      if (result.status === 0 && result.stdout.trim()) return candidate;
    } catch {
      // continue
    }
  }
  return null;
}

export async function cmdNew(name: string): Promise<number> {
  const sanitized = sanitizeBuddyName(name);
  if (!sanitized) {
    console.error(`Invalid buddy name: "${name}". Use letters, numbers, and hyphens only.`);
    return 1;
  }

  const buddyPath = paths.buddy(sanitized);

  try {
    await fs.access(buddyPath);
    // File exists — prompt for overwrite
    const confirmed = await confirmOverwrite(buddyPath);
    if (!confirmed) {
      console.error('Aborted.');
      return 1;
    }
  } catch {
    // File does not exist — proceed
  }

  await paths.ensureHomeStructure();
  const buddy = buildTemplate(sanitized);
  await writeJSON(buddyPath, buddy);

  console.log(`Created buddy: ${buddyPath}`);
  console.log(`Edit your buddy with: $EDITOR ${buddyPath}`);
  console.log(`Activate with: my-buddy use ${sanitized}`);
  console.log('');
  console.log('StatusLine layout (5 lines):');
  console.log('  Line 1  [12-char ASCII]  →  buddy name');
  console.log('  Line 2  [12-char ASCII]  →  level  (e.g. "Lv.1 Apprentice")');
  console.log('  Line 3  [12-char ASCII]  →  speech phrase');
  console.log('  Line 4  [12-char ASCII]  →  (empty — visual breathing room)');
  console.log('  Line 5  [12-char ASCII]  →  model + XP bar  (e.g. "[Sonnet · High] [████░░░░] Nvl 1")');

  const editor = detectEditor();
  if (editor && process.stdin.isTTY) {
    spawnSync(editor, [buddyPath], { stdio: 'inherit' });
  } else if (!editor) {
    console.log(`(Set $EDITOR to open it automatically)`);
  }

  return 0;
}
