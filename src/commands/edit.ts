import * as fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import type { Buddy, Frame } from '../types.js';
import { paths, sanitizeBuddyName } from '../paths.js';
import { readJSON } from '../fs-atomic.js';
import { startEditorServer } from '../editor/server.js';

function makeNullRow(): (number | null)[] {
  return Array(12).fill(null) as (number | null)[];
}

function buildDefaultBuddy(sanitizedName: string): Buddy {
  const nullRow = makeNullRow();
  const eyeRow: (number | null)[] = makeNullRow();
  eyeRow[3] = 220;
  eyeRow[5] = 220;

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

async function isWSL(): Promise<boolean> {
  try {
    const content = await fs.readFile('/proc/version', 'utf8');
    const lower = content.toLowerCase();
    return lower.includes('microsoft') || lower.includes('wsl');
  } catch {
    return false;
  }
}

function openBrowser(url: string, platform: 'wsl' | 'linux' | 'darwin' | 'win32'): void {
  let cmd: string;
  let args: string[];

  if (platform === 'wsl') {
    // Use full path to powershell.exe which is reliably accessible from WSL
    cmd = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
    args = ['-NoProfile', '-Command', `Start-Process "${url}"`];
  } else if (platform === 'win32') {
    cmd = 'cmd.exe';
    args = ['/c', 'start', '', url]; // empty title argument needed for URLs
  } else if (platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }

  const child = spawn(cmd, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.on('error', () => {
    // Silently ignore — browser may not open but server still works
    console.log(`Nao foi possivel abrir o browser automaticamente.`);
    console.log(`Abra manualmente: ${url}`);
  });
  child.unref();
}

export async function cmdEdit(name?: string): Promise<number> {
  await paths.ensureHomeStructure();

  let buddy: Buddy;

  if (name) {
    const sanitized = sanitizeBuddyName(name);
    if (!sanitized) {
      console.error(`Invalid buddy name: "${name}". Use letters, numbers, and hyphens only.`);
      return 1;
    }

    const buddyPath = paths.buddy(sanitized);
    const existing = await readJSON<Buddy>(buddyPath);

    if (existing) {
      buddy = existing;
    } else {
      buddy = buildDefaultBuddy(sanitized);
    }
  } else {
    // No name provided — use a generic placeholder name
    buddy = buildDefaultBuddy('new-buddy');
  }

  const buddyPath = paths.buddy(buddy.name);

  return new Promise<number>((resolve) => {
    let resolved = false;

    function done(code: number): void {
      if (!resolved) {
        resolved = true;
        resolve(code);
      }
    }

    startEditorServer({
      buddy,
      buddyPath,
      onSave: (savedBuddy) => {
        console.log(`Buddy "${savedBuddy.name}" salvo em ${buddyPath}`);
        done(0);
      },
    })
      .then(async ({ port, close }) => {
        const url = `http://localhost:${port}`;

        // Detect platform
        const wsl = await isWSL();
        let platform: 'wsl' | 'linux' | 'darwin' | 'win32';
        if (wsl) {
          platform = 'wsl';
        } else {
          const p = process.platform;
          if (p === 'darwin' || p === 'win32') {
            platform = p;
          } else {
            platform = 'linux';
          }
        }

        openBrowser(url, platform);

        console.log(`Editor aberto em ${url}`);
        console.log('Aguardando save...');

        // Handle Ctrl+C
        process.on('SIGINT', () => {
          console.log('\nEditor cancelado.');
          close();
          done(0);
        });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Failed to start editor server: ${message}`);
        done(1);
      });
  });
}
