import chalk from 'chalk';
import type { CliFlags } from '@/types.js';
import { SPECIES, EYES, RARITIES, HATS } from '@/constants.js';
import { runPreflight } from '@/patcher/preflight.js';
import { banner, showPet } from '../display.ts';
import { validateFlag, selectSpecies, selectEyes, selectRarity, selectHat } from '../prompts.ts';
import { allTraitsFlagged } from '../builder/state.ts';

async function runSequentialPreview(flags: CliFlags): Promise<void> {
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

export async function runPreview(flags: CliFlags = {}): Promise<void> {
  banner();
  const preflight = runPreflight({ requireBinary: false });
  if (!preflight.ok) process.exit(1);

  if (allTraitsFlagged(flags)) {
    // All traits specified via flags -- just render directly
    const species = validateFlag('species', flags.species, SPECIES) ?? SPECIES[0];
    const eye = validateFlag('eye', flags.eye, EYES) ?? EYES[0];
    const rarity = validateFlag('rarity', flags.rarity, RARITIES) ?? RARITIES[0];
    const hat =
      rarity === 'common' ? ('none' as const) : (validateFlag('hat', flags.hat, HATS) ?? 'crown');

    const bones = { species, eye, hat, rarity, shiny: flags.shiny ?? false, stats: {} };
    showPet(bones, 'Preview');
    console.log(chalk.dim('  (Preview only - no changes made)\n'));
    return;
  }

  // Try the OpenTUI builder in browse-only mode
  try {
    const { canUseBuilder, runBuilder } = await import('../builder/index.ts');
    if (await canUseBuilder()) {
      await runBuilder(flags, true);
      console.log(chalk.dim('  (Preview only - no changes made)\n'));
      return;
    }
  } catch {
    // OpenTUI unavailable -- fall through
  }

  // Show warning if Bun is not available
  if (typeof globalThis.Bun === 'undefined') {
    console.log(
      chalk.yellow(
        '  \u26A0  Bun is not installed — using basic prompts.\n' +
          '     Install Bun (https://bun.sh) for the interactive builder\n' +
          '     with live preview.\n',
      ),
    );
  }

  // Fallback: sequential prompts
  await runSequentialPreview(flags);
}
