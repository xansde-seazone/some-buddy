import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { join } from 'path';

const CLI_PATH = join(__dirname, '..', 'dist', 'cli.js');

describe('CLI', () => {
  it('--help exits 0 and prints usage', () => {
    const output = execFileSync('node', [CLI_PATH, '--help'], { encoding: 'utf-8' });
    expect(output).toContain('any-buddy');
    expect(output).toContain('Usage:');
    expect(output).toContain('--species');
  });

  it('help subcommand works', () => {
    const output = execFileSync('node', [CLI_PATH, 'help'], { encoding: 'utf-8' });
    expect(output).toContain('any-buddy');
  });
});
