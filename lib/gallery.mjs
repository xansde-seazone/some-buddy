import { emitKeypressEvents } from 'readline';
import chalk from 'chalk';
import { RARITY_STARS, ORIGINAL_SALT } from './constants.mjs';
import { roll } from './generation.mjs';
import { renderSprite } from './sprites.mjs';
import { patchBinary, verifySalt, isClaudeRunning, isNodeRuntime } from './patcher.mjs';
import { runPreflight } from './preflight.mjs';
import { loadPetConfig, savePetConfig, getCompanionName, getCompanionPersonality, renameCompanion, setCompanionPersonality } from './config.mjs';
import { createAnimator } from './animator.mjs';
import { RARITY_CHALK, renderStats, banner, warnCodesign, MIN_SALT_COUNT } from './tui.mjs';

const DEFAULT_PROFILE_NAME = 'default';

// Erase N lines above cursor (move up + clear each line)
function eraseLines(n) {
  if (n <= 0) return '';
  let seq = '';
  for (let i = 0; i < n; i++) {
    seq += '\x1b[2K'; // erase entire line
    if (i < n - 1) seq += '\x1b[A'; // cursor up
  }
  seq += '\r'; // carriage return to column 0
  return seq;
}

// Build a profile card as an array of lines (no printing)
function renderProfileCard(bones, profileName, profile, isActive, index, total, frame = 0) {
  const rarityColor = RARITY_CHALK[bones.rarity] || chalk.white;
  const dot = isActive ? chalk.green('●') : chalk.dim('○');
  const lines = [];

  // Header: rarity left, species right (mirroring Claude Code's card layout)
  const rarityLabel = `${RARITY_STARS[bones.rarity]}  ${bones.rarity.toUpperCase()}`;
  const speciesLabel = bones.species.toUpperCase();
  const shinyTag = bones.shiny ? `  ${rarityColor('✦ SHINY ✦')}` : '';
  const headerLeft = `${dot} ${rarityColor(rarityLabel)}${shinyTag}`;
  const gap = Math.max(2, 38 - rarityLabel.length - speciesLabel.length - (bones.shiny ? 12 : 0));
  lines.push(`  ${headerLeft}${' '.repeat(gap)}${rarityColor(speciesLabel)}`);

  // Accessories: dim detail line
  const details = [`eyes ${bones.eye}`];
  if (bones.hat !== 'none') details.push(`hat ${bones.hat}`);
  lines.push(chalk.dim(`    ${details.join('  │  ')}`));

  // Sprite
  lines.push('');
  for (const spriteLine of renderSprite(bones, frame)) {
    lines.push(rarityColor('      ' + spriteLine));
  }
  lines.push('');

  // Companion identity
  const displayName = profile.name || profileName;
  lines.push(`  ${chalk.bold(displayName)}`);
  if (profile.personality) {
    const text = profile.personality.length > 60
      ? profile.personality.slice(0, 60) + '...' : profile.personality;
    lines.push(chalk.dim(`  "${text}"`));
  }
  lines.push('');

  // Stats
  const statsBlock = renderStats(bones.stats, rarityColor);
  if (statsBlock) lines.push(...statsBlock.split('\n'));

  // Footer: counter + hints
  lines.push('');
  const hints = [];
  if (total > 1) hints.push('← → navigate');
  if (!isActive) hints.push('enter apply');
  hints.push('esc cancel');
  lines.push(chalk.dim(`  [${index + 1}/${total}]  ${hints.join('  │  ')}`));

  return lines;
}

// Interactive gallery for switching between saved profiles.
// Returns after the user applies a profile or cancels.
export async function runSwitch() {
  banner();
  const preflight = runPreflight({ requireBinary: true });
  if (!preflight.ok) process.exit(1);

  const config = loadPetConfig();
  const profiles = config?.profiles || {};
  const savedNames = Object.keys(profiles);

  if (savedNames.length === 0) {
    console.log(chalk.dim('  No saved profiles. Run any-buddy to create one.\n'));
    return;
  }

  const userId = preflight.userId;
  const useNodeHash = isNodeRuntime(preflight.binaryPath);
  const active = config?.activeProfile || null;

  // Build gallery entries: default pet first, then saved profiles
  const defaultBones = roll(userId, ORIGINAL_SALT, { useNodeHash }).bones;
  const defaultProfile = { salt: ORIGINAL_SALT, name: null, personality: null };

  const galleryNames = [DEFAULT_PROFILE_NAME, ...savedNames];
  const galleryProfiles = [defaultProfile, ...savedNames.map(n => profiles[n])];
  const galleryBones = [defaultBones, ...savedNames.map(n => roll(userId, profiles[n].salt, { useNodeHash }).bones)];

  // Start on the active profile (or default if none active)
  let index = active ? Math.max(0, galleryNames.indexOf(active)) : 0;
  let prevCardHeight = 0;

  function isActiveEntry(i) {
    return galleryNames[i] === active || (i === 0 && !active);
  }

  function drawCard(frame = 0) {
    if (prevCardHeight > 0) {
      process.stdout.write(eraseLines(prevCardHeight));
    }
    const lines = renderProfileCard(galleryBones[index], galleryNames[index],
      galleryProfiles[index], isActiveEntry(index), index, galleryNames.length, frame);
    process.stdout.write(lines.join('\n') + '\n');
    prevCardHeight = lines.length + 1;
  }

  // Overwrite only the sprite lines in-place via ANSI cursor movement.
  const SPRITE_LINE_OFFSET = 3;

  // Hold the base pose, then play the fidget, then settle back.
  const IDLE_CYCLE = [0, 0, 0, 1, 2, 1];
  let lastFrame = -1;

  function updateSprite(tick) {
    const frame = IDLE_CYCLE[tick % IDLE_CYCLE.length];
    if (frame === lastFrame) return;
    lastFrame = frame;
    const bones = galleryBones[index];
    const rarityColor = RARITY_CHALK[bones.rarity] || chalk.white;
    const spriteLines = renderSprite(bones, frame);
    const upFromBottom = prevCardHeight - SPRITE_LINE_OFFSET - 1;

    // Cursor up to first sprite line
    process.stdout.write(`\x1b[${upFromBottom}A`);
    // Overwrite each sprite line
    for (const line of spriteLines) {
      process.stdout.write(`\r\x1b[2K${rarityColor('      ' + line)}\n`);
    }
    // Cursor back down to original position
    const remaining = upFromBottom - spriteLines.length;
    if (remaining > 0) process.stdout.write(`\x1b[${remaining}B`);
  }

  drawCard(0);

  // Event-driven gallery: animator ticks between keypresses
  const animator = createAnimator(500);

  const action = await new Promise(resolve => {
    const unsub = animator.subscribe(frame => updateSprite(frame));

    const wasRaw = process.stdin.isRaw;
    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    function cleanup() {
      unsub();
      process.stdin.removeListener('keypress', onKey);
      process.stdin.setRawMode(wasRaw ?? false);
      process.stdin.pause();
    }

    function onKey(ch, key) {
      if (!key) return;

      if (key.name === 'left' && galleryNames.length > 1) {
        index = (index - 1 + galleryNames.length) % galleryNames.length;
        lastFrame = -1;
        drawCard(0);
      } else if (key.name === 'right' && galleryNames.length > 1) {
        index = (index + 1) % galleryNames.length;
        lastFrame = -1;
        drawCard(0);
      } else if (key.name === 'return') {
        cleanup();
        resolve('apply');
      } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        cleanup();
        resolve('cancel');
      }
    }

    process.stdin.on('keypress', onKey);
  });

  if (action === 'cancel') {
    console.log(chalk.dim('\n  Cancelled.\n'));
    return;
  }

  // Apply — skip if already active
  if (isActiveEntry(index)) return;

  // Snapshot current companion identity back to the outgoing profile
  // so name/personality changes made via /buddy while on it aren't lost
  if (active && config.profiles?.[active]) {
    const outgoing = config.profiles[active];
    outgoing.name = getCompanionName() ?? outgoing.name;
    outgoing.personality = getCompanionPersonality() ?? outgoing.personality;
  }

  const oldSalt = config.salt || ORIGINAL_SALT;
  const name = galleryNames[index];
  const newSalt = galleryProfiles[index].salt;

  // Patch binary
  let patched = false;
  for (const trySalt of [oldSalt, ORIGINAL_SALT]) {
    if (!trySalt) continue;
    const check = verifySalt(preflight.binaryPath, trySalt);
    if (check.found >= MIN_SALT_COUNT) {
      const patchResult = patchBinary(preflight.binaryPath, trySalt, newSalt);
      console.log(chalk.green(`\n  Switched to "${name}"! (${patchResult.replacements} replacements)`));
      warnCodesign(patchResult, preflight.binaryPath);
      patched = true;
      break;
    }
  }

  if (!patched) {
    console.error(chalk.red('\n  Could not find known salt in binary. Try running: any-buddy restore'));
    return;
  }

  // Update config — reuse the already-loaded config object
  if (name === DEFAULT_PROFILE_NAME) {
    config.salt = ORIGINAL_SALT;
    config.activeProfile = null;
  } else {
    const profile = config.profiles[name];
    config.previousSalt = config.salt;
    config.activeProfile = name;
    config.salt = profile.salt;
  }

  // Apply incoming profile's companion identity
  const incoming = galleryProfiles[index];
  if (incoming.name) {
    try { renameCompanion(incoming.name); } catch { /* companion may not exist yet */ }
  }
  if (incoming.personality) {
    try { setCompanionPersonality(incoming.personality); } catch { /* companion may not exist yet */ }
  }
  config.appliedAt = new Date().toISOString();
  savePetConfig(config);

  if (isClaudeRunning(preflight.binaryPath)) {
    console.log(chalk.yellow('  Restart Claude Code for the change to take effect.'));
  }
  console.log();
}
