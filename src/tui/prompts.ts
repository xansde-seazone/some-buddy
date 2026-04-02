import { select } from '@inquirer/prompts';
import type { Species, Eye, Rarity, Hat, StatName } from '@/types.js';
import {
  SPECIES,
  EYES,
  RARITIES,
  RARITY_STARS,
  RARITY_WEIGHTS,
  HATS,
  STAT_NAMES,
} from '@/constants.js';
import { renderSprite, renderFace } from '@/sprites/index.js';
import { RARITY_CHALK } from './format.ts';
import chalk from 'chalk';

export function validateFlag<T extends string>(
  name: string,
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined) return undefined;
  if (value === 'any') return undefined;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`Invalid --${name} "${value}". Must be one of: ${allowed.join(', ')}`);
}

export async function selectSpecies(): Promise<Species> {
  return select({
    message: 'Species',
    choices: SPECIES.map((s) => {
      const face = renderFace({ species: s, eye: '·' });
      return { name: `${s.padEnd(10)} ${face}`, value: s };
    }),
    pageSize: 18,
  });
}

export async function selectEyes(species: Species): Promise<Eye> {
  return select({
    message: 'Eyes',
    choices: EYES.map((e) => {
      const face = renderFace({ species, eye: e });
      return { name: `${e}  ${face}`, value: e };
    }),
  });
}

export async function selectRarity(): Promise<Rarity> {
  return select({
    message: 'Rarity',
    choices: RARITIES.map((r) => {
      const color = RARITY_CHALK[r] || chalk.white;
      const pct = RARITY_WEIGHTS[r];
      return {
        name: color(`${r.padEnd(12)} ${RARITY_STARS[r].padEnd(6)} (normally ${pct}%)`),
        value: r,
      };
    }),
  });
}

export async function selectHat(species: Species, eye: Eye, rarity: Rarity): Promise<Hat> {
  if (rarity === 'common') {
    console.log(chalk.dim('  Common rarity = no hat (this is how Claude Code works)\n'));
    return 'none';
  }

  return select({
    message: 'Hat',
    choices: HATS.filter((h) => h !== 'none').map((h) => {
      const preview = renderSprite({ species, eye, hat: h, rarity, shiny: false, stats: {} }, 0);
      const topLine = preview[0]?.trim() || h;
      return { name: `${h.padEnd(12)} ${topLine}`, value: h };
    }),
  });
}

export async function selectStat(label: string, exclude?: StatName): Promise<StatName> {
  const choices = STAT_NAMES.filter((s) => s !== exclude).map((s) => ({ name: s, value: s }));
  return select({ message: label, choices });
}
