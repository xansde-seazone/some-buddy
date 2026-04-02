import chalk from 'chalk';
import { ORIGINAL_SALT } from '@/constants.js';
import { findClaudeBinary } from '@/patcher/binary-finder.js';
import { verifySalt, getMinSaltCount } from '@/patcher/salt-ops.js';
import { patchBinary, restoreBinary } from '@/patcher/patch.js';
import { savePetConfig, loadPetConfig, isHookInstalled, removeHook } from '@/config/index.js';
import { banner, warnCodesign } from '../display.ts';

export async function runRestore(): Promise<void> {
  banner();
  const binaryPath = findClaudeBinary();

  const config = loadPetConfig();
  if (config?.salt && config.salt !== ORIGINAL_SALT) {
    const check = verifySalt(binaryPath, config.salt);
    if (check.found >= getMinSaltCount(binaryPath)) {
      const restoreResult = patchBinary(binaryPath, config.salt, ORIGINAL_SALT);
      console.log(chalk.green('  Restored original pet salt.'));
      warnCodesign(restoreResult, binaryPath);
    } else {
      try {
        restoreBinary(binaryPath);
        console.log(chalk.green('  Restored from backup.'));
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    }
  } else {
    console.log(chalk.dim('  Already using original salt.'));
  }

  if (isHookInstalled()) {
    removeHook();
    console.log(chalk.dim('  Removed SessionStart hook.'));
  }

  savePetConfig({ salt: ORIGINAL_SALT, restored: true });
  console.log();
}
