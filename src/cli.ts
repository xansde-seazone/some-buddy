#!/usr/bin/env node
import { createRequire } from 'node:module';
import { renderStatusLine } from './render/index.js';
import { cmdNew } from './commands/new.js';
import { cmdList } from './commands/list.js';
import { cmdUse } from './commands/use.js';
import { cmdPreview } from './commands/preview.js';
import { cmdStatus } from './commands/status.js';
import { cmdInstall } from './commands/install.js';
import { cmdUninstall } from './commands/uninstall.js';
import { cmdPanic } from './commands/panic.js';
import { cmdSync } from './commands/sync.js';
import { cmdXPEvent } from './commands/xp-event.js';
import { cmdXP } from './commands/xp.js';
import { cmdColors } from './commands/colors.js';
import { cmdEdit } from './commands/edit.js';

const require = createRequire(import.meta.url);

const pkg = require('../package.json') as { version: string };

function printUsage(): void {
  console.log(`my-buddy v${pkg.version}

Usage:
  my-buddy new <name>       Create a new buddy from template
  my-buddy edit [name]       Open visual buddy editor in browser
  my-buddy list             List all buddies (active marked with *)
  my-buddy use <name>       Set the active buddy
  my-buddy preview <name>   Render buddy frames to stdout
  my-buddy status           Show install state and paths
  my-buddy xp              Show XP progression dashboard

  my-buddy install [--dry-run] [--yes]   Inject statusLine into Claude settings
  my-buddy uninstall [--yes]             Restore settings from pre-install backup
  my-buddy panic [--yes]                 EMERGENCY: restore Claude settings to original state

  my-buddy sync             Sync XP from Claude Code sessions
  my-buddy xp-event <name> <xp>  Register XP from an external event
  my-buddy colors [W+N U-N ...]  View or distribute personality colors

  my-buddy --help | -h      Show this usage
  my-buddy --version | -v   Show version`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  // Status-line render mode: invoked by Claude Code via stdin pipe with NO args
  if (!process.stdin.isTTY && args.length === 0) {
    let stdinData = '';
    await new Promise<void>((resolve) => {
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk: string) => {
        stdinData += chunk;
      });
      process.stdin.on('end', resolve);
      process.stdin.on('error', resolve);
    });
    try {
      const result = await renderStatusLine(stdinData.trim());
      if (result) process.stdout.write(result + '\n');
    } catch {
      // Always exit 0 in status-line mode
    }
    process.exit(0);
  }

  const cmd = args[0];

  if (!cmd || cmd === '--help' || cmd === '-h') {
    printUsage();
    process.exit(cmd ? 0 : 0);
  }

  if (cmd === '--version' || cmd === '-v') {
    console.log(pkg.version);
    process.exit(0);
  }

  let exitCode = 0;

  const argv = args.slice(1);

  switch (cmd) {
    case 'install': {
      exitCode = await cmdInstall({
        dryRun: argv.includes('--dry-run'),
        yes: argv.includes('--yes') || argv.includes('-y'),
      });
      break;
    }
    case 'uninstall': {
      exitCode = await cmdUninstall({
        yes: argv.includes('--yes') || argv.includes('-y'),
      });
      break;
    }
    case 'new': {
      const name = args[1];
      if (!name) {
        console.error('Usage: my-buddy new <name>');
        process.exit(1);
      }
      exitCode = await cmdNew(name);
      break;
    }
    case 'edit': {
      exitCode = await cmdEdit(args[1]);
      break;
    }
    case 'list': {
      exitCode = await cmdList();
      break;
    }
    case 'use': {
      const name = args[1];
      if (!name) {
        console.error('Usage: my-buddy use <name>');
        process.exit(1);
      }
      exitCode = await cmdUse(name);
      break;
    }
    case 'preview': {
      const name = args[1];
      if (!name) {
        console.error('Usage: my-buddy preview <name>');
        process.exit(1);
      }
      exitCode = await cmdPreview(name);
      break;
    }
    case 'status': {
      exitCode = await cmdStatus();
      break;
    }
    case 'xp': {
      exitCode = await cmdXP();
      break;
    }
    case 'colors': {
      exitCode = await cmdColors(argv);
      break;
    }
    case 'panic': {
      exitCode = await cmdPanic({
        yes: argv.includes('--yes') || argv.includes('-y'),
      });
      break;
    }
    case 'sync': {
      exitCode = await cmdSync();
      break;
    }
    case 'xp-event': {
      const eventName = args[1];
      const xpAmount = args[2];
      if (!eventName || !xpAmount) {
        console.error('Usage: my-buddy xp-event <event-name> <xp-amount>');
        process.exit(1);
      }
      exitCode = await cmdXPEvent(eventName, xpAmount);
      break;
    }
    default: {
      console.error(`Unknown command: ${cmd}`);
      printUsage();
      process.exit(1);
    }
  }

  process.exit(exitCode);
}

main().catch((err: unknown) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
