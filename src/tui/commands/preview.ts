import chalk from 'chalk';
import type { CliFlags } from '@/types.js';
import { SPECIES, EYES, RARITIES, HATS } from '@/constants.js';
import { runPreflight } from '@/patcher/preflight.js';
import { banner, showPet } from '../display.ts';
import { validateFlag, selectSpecies, selectEyes, selectRarity, selectHat } from '../prompts.ts';

export async function runPreview(flags: CliFlags = {}): Promise<void> {
  banner();
  const preflight = runPreflight({ requireBinary: false });
  if (!preflight.ok) process.exit(1);

  const species = validateFlag('species', flags.species, SPECIES) ?? (await selectSpecies());
  const eye = validateFlag('eye', flags.eye, EYES) ?? (await selectEyes(species));
  const rarity = validateFlag('rarity', flags.rarity, RARITIES) ?? (await selectRarity());
  const hat =
    rarity === 'common'
      ? ('none' as const)
      : (validateFlag('hat', flags.hat, HATS) ?? (await selectHat(species, eye, rarity)));

  const shiny = flags.shiny ?? false;
  const bones = { species, eye, hat, rarity, shiny, stats: {} };
  showPet(bones, 'Preview');
  console.log(chalk.dim('  (Preview only - no changes made)\n'));
}
