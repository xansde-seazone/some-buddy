import chalk from 'chalk';
import { select } from '@inquirer/prompts';
import { platform } from 'os';
import { ORIGINAL_SALT, RARITY_STARS } from '@/constants.js';
import { roll } from '@/generation/index.js';
import { isNodeRuntime, verifySalt, isClaudeRunning } from '@/patcher/salt-ops.js';
import { patchBinary } from '@/patcher/patch.js';
import { runPreflight } from '@/patcher/preflight.js';
import {
  loadPetConfigV2,
  savePetConfigV2,
  saveProfile,
  getCompanionName,
  renameCompanion,
  getCompanionPersonality,
  setCompanionPersonality,
} from '@/config/index.js';
import { banner, showPet, warnCodesign } from '../display.ts';
import {
  buildGalleryEntries,
  activeEntryIndex,
  DEFAULT_PROFILE,
  type GalleryEntry,
} from '../gallery/state.ts';

const MIN_SALT_COUNT = platform() === 'win32' ? 1 : 3;

async function runSequentialSwitch(entries: GalleryEntry[]): Promise<string | null> {
  const choices = entries.map((entry) => {
    const dot = entry.isActive ? '●' : '○';
    const name = entry.isDefault ? 'Original' : entry.name;
    const stars = RARITY_STARS[entry.bones.rarity];
    return {
      name: `${dot} ${name} — ${entry.bones.species} ${stars}`,
      value: entry.isDefault ? DEFAULT_PROFILE : entry.name,
    };
  });

  const choice = await select({
    message: 'Choose a buddy',
    choices,
  });

  return choice;
}

export async function runSwitch(): Promise<void> {
  banner();

  const preflight = runPreflight({ requireBinary: true });
  if (!preflight.ok || !preflight.binaryPath) {
    process.exit(1);
  }

  const config = loadPetConfigV2();
  const profiles = config?.profiles ?? {};

  if (Object.keys(profiles).length === 0) {
    console.log(chalk.dim('  No saved buddies. Run any-buddy to create one.\n'));
    return;
  }

  const userId = preflight.userId;
  const binaryPath = preflight.binaryPath;
  const entries = buildGalleryEntries(userId, binaryPath);
  const startIndex = activeEntryIndex(entries);

  // Try OpenTUI gallery, fallback to sequential
  let selectedName: string | null = null;

  try {
    const { canUseGalleryTUI, runGalleryTUI } = await import('../gallery/index.ts');
    if (await canUseGalleryTUI()) {
      const result = await runGalleryTUI(entries, startIndex);
      if (result.action === 'cancel') {
        console.log(chalk.dim('\n  Cancelled.\n'));
        return;
      }
      selectedName = result.profileName;
    }
  } catch {
    // OpenTUI not available — fall through
  }

  if (selectedName === null) {
    try {
      selectedName = await runSequentialSwitch(entries);
    } catch {
      console.log(chalk.dim('\n  Cancelled.\n'));
      return;
    }
  }

  if (!selectedName) {
    console.log(chalk.dim('\n  Cancelled.\n'));
    return;
  }

  // Skip if already active
  const selectedEntry = entries.find(
    (e) => (e.isDefault ? DEFAULT_PROFILE : e.name) === selectedName,
  );
  if (selectedEntry?.isActive) {
    console.log(chalk.dim('\n  Already active.\n'));
    return;
  }

  // Snapshot outgoing profile's companion identity
  const active = config?.activeProfile;
  if (active && config?.profiles[active]) {
    const outgoing = config.profiles[active];
    outgoing.name = getCompanionName() ?? outgoing.name;
    outgoing.personality = getCompanionPersonality() ?? outgoing.personality;
    saveProfile(active, outgoing);
  }

  // Find the old salt in binary
  const oldSalt = config?.salt ?? ORIGINAL_SALT;
  const isDefault = selectedName === DEFAULT_PROFILE;
  const newSalt = isDefault ? ORIGINAL_SALT : config?.profiles[selectedName]?.salt;

  if (!newSalt) {
    console.error(chalk.red(`\n  Buddy "${selectedName}" not found.\n`));
    return;
  }

  // Patch binary
  let patched = false;
  for (const trySalt of [oldSalt, ORIGINAL_SALT]) {
    if (!trySalt) continue;
    const check = verifySalt(binaryPath, trySalt);
    if (check.found >= MIN_SALT_COUNT) {
      const patchResult = patchBinary(binaryPath, trySalt, newSalt);
      const displayName = isDefault ? 'Original' : selectedName;
      console.log(
        chalk.green(`\n  Switched to "${displayName}"! (${patchResult.replacements} replacements)`),
      );
      warnCodesign(patchResult, binaryPath);
      patched = true;
      break;
    }
  }

  if (!patched) {
    console.error(
      chalk.red('\n  Could not find known salt in binary. Try running: any-buddy restore'),
    );
    return;
  }

  // Update config
  const updated = loadPetConfigV2();
  if (updated) {
    updated.previousSalt = updated.salt;
    updated.activeProfile = isDefault ? null : selectedName;
    updated.salt = newSalt;
    updated.appliedAt = new Date().toISOString();
    savePetConfigV2(updated);
  }

  // Restore incoming profile's companion identity
  if (!isDefault) {
    const incoming = config?.profiles[selectedName];
    if (incoming?.name) {
      try {
        renameCompanion(incoming.name);
      } catch {
        /* companion may not exist yet */
      }
    }
    if (incoming?.personality) {
      try {
        setCompanionPersonality(incoming.personality);
      } catch {
        /* companion may not exist yet */
      }
    }
  }

  // Show the new pet
  const useNodeHash = isNodeRuntime(binaryPath);
  const newBones = roll(userId, newSalt, { useNodeHash }).bones;
  showPet(newBones, 'Active pet');

  if (isClaudeRunning(binaryPath)) {
    console.log(chalk.yellow('  Restart Claude Code for the change to take effect.'));
  }
  console.log();
}
