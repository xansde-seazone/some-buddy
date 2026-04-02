import chalk from 'chalk';
import type { Bones, Rarity } from '@/types.js';
import { renderSprite } from '@/sprites/index.js';

export function progressBar(pct: number, width: number): string {
  const filled = Math.min(width, Math.round((pct / 100) * width));
  const empty = width - filled;
  return chalk.cyan('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}

export function formatCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`;
  return String(n);
}

export const RARITY_CHALK: Record<Rarity, (s: string) => string> = {
  common: chalk.gray,
  uncommon: chalk.green,
  rare: chalk.blue,
  epic: chalk.magenta,
  legendary: chalk.yellow,
};

export function colorize(text: string, rarity: Rarity): string {
  return (RARITY_CHALK[rarity] || chalk.white)(text);
}

export function formatSprite(bones: Bones, frame = 0): string {
  return renderSprite(bones, frame).join('\n');
}

export function spritePreview(
  species: Bones['species'],
  eye: Bones['eye'],
  hat: Bones['hat'],
  rarity: Bones['rarity'],
): string {
  const bones: Bones = {
    species,
    eye,
    hat: rarity === 'common' ? 'none' : hat,
    rarity,
    shiny: false,
    stats: {},
  };
  const lines = renderSprite(bones, 0);
  return lines.map((l) => l.trimEnd()).join('\n');
}
