import chalk from 'chalk';
import { ORIGINAL_SALT } from '@/constants.js';
import { findClaudeBinary } from '@/patcher/binary-finder.js';
import {
  verifySalt,
  getCurrentSalt,
  isClaudeRunning,
  getMinSaltCount,
} from '@/patcher/salt-ops.js';
import { patchBinary } from '@/patcher/patch.js';
import {
  loadPetConfig,
  loadPetConfigV2,
  renameCompanion,
  setCompanionPersonality,
  isHookInstalled,
  installHook,
} from '@/config/index.js';
import { warnCodesign } from '../display.ts';

function restoreProfileIdentity(salt: string): void {
  const configV2 = loadPetConfigV2();
  const profile = configV2?.profiles[salt];
  if (!profile) return;
  try {
    if (profile.name) renameCompanion(profile.name);
  } catch {
    /* companion may not be hatched yet */
  }
  try {
    if (profile.personality) setCompanionPersonality(profile.personality);
  } catch {
    /* companion may not be hatched yet */
  }
}

function autoInstallHook(silent: boolean, noHook: boolean): void {
  if (noHook || isHookInstalled()) return;
  installHook();
  if (!silent) {
    console.log(chalk.dim('  SessionStart hook installed — pet will auto-re-apply after updates.'));
  }
}

export async function runApply({ silent = false, noHook = false } = {}): Promise<void> {
  const config = loadPetConfig();
  if (!config?.salt) {
    if (!silent) console.error('No saved pet config. Run any-buddy first.');
    process.exit(silent ? 0 : 1);
  }

  let binaryPath: string;
  try {
    binaryPath = findClaudeBinary();
  } catch (err) {
    if (!silent) console.error((err as Error).message);
    process.exit(silent ? 0 : 1);
  }

  const check = verifySalt(binaryPath, config.salt);
  if (check.found >= getMinSaltCount(binaryPath)) {
    if (!silent) console.log(chalk.green('  Pet already applied.'));
    restoreProfileIdentity(config.salt);
    return;
  }

  const current = getCurrentSalt(binaryPath);
  const oldSalt = current.patched ? null : ORIGINAL_SALT;

  if (!oldSalt) {
    if (config.previousSalt) {
      const prevCheck = verifySalt(binaryPath, config.previousSalt);
      if (prevCheck.found >= getMinSaltCount(binaryPath)) {
        const result = patchBinary(binaryPath, config.previousSalt, config.salt);
        if (!silent) {
          console.log(chalk.green(`  Re-patched (${result.replacements} replacements).`));
        }
        warnCodesign(result, binaryPath);
        restoreProfileIdentity(config.salt);
        autoInstallHook(silent, noHook);
        return;
      }
    }
    const origCheck = verifySalt(binaryPath, ORIGINAL_SALT);
    if (origCheck.found >= getMinSaltCount(binaryPath)) {
      const result = patchBinary(binaryPath, ORIGINAL_SALT, config.salt);
      if (!silent) {
        console.log(chalk.green(`  Patched after update (${result.replacements} replacements).`));
      }
      warnCodesign(result, binaryPath);
      restoreProfileIdentity(config.salt);
      autoInstallHook(silent, noHook);
      return;
    }
    if (!silent)
      console.error(
        'Could not find known salt in binary. Claude Code may have changed the salt string.',
      );
    process.exit(silent ? 0 : 1);
  }

  const result = patchBinary(binaryPath, oldSalt, config.salt);
  if (!silent) {
    console.log(chalk.green(`  Applied (${result.replacements} replacements).`));
    warnCodesign(result, binaryPath);
    if (isClaudeRunning(binaryPath)) {
      console.log(chalk.yellow('  Restart Claude Code for the change to take effect.'));
    }
  }
  restoreProfileIdentity(config.salt);
  autoInstallHook(silent, noHook);
}
