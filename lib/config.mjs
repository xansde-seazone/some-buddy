import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { ORIGINAL_SALT } from './constants.mjs';

const OUR_CONFIG = join(homedir(), '.claude-code-any-buddy.json');

// Read the user's Claude userId from ~/.claude.json
export function getClaudeUserId() {
  const paths = [
    join(homedir(), '.claude.json'),
    join(homedir(), '.claude', '.config.json'),
  ];

  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const config = JSON.parse(readFileSync(p, 'utf-8'));
        return config.oauthAccount?.accountUuid ?? config.userID ?? 'anon';
      } catch {
        continue;
      }
    }
  }

  return 'anon';
}

// Save our pet config
export function savePetConfig(data) {
  writeFileSync(OUR_CONFIG, JSON.stringify(data, null, 2) + '\n');
}

// Load our pet config, migrating v1 → v2 schema if needed
export function loadPetConfig() {
  if (!existsSync(OUR_CONFIG)) return null;
  try {
    const config = JSON.parse(readFileSync(OUR_CONFIG, 'utf-8'));
    if (config.version === 2) return config;
    return migrateV1(config);
  } catch {
    return null;
  }
}

// Migrate flat v1 config into v2 with profiles
function migrateV1(config) {
  const migrated = {
    version: 2,
    activeProfile: null,
    salt: config.salt,
    previousSalt: config.previousSalt,
    profiles: {},
    appliedTo: config.appliedTo,
    appliedAt: config.appliedAt,
  };

  if (config.salt && config.salt !== ORIGINAL_SALT && !config.restored) {
    const name = config.species || 'default';
    migrated.activeProfile = name;
    migrated.profiles[name] = {
      salt: config.salt,
      species: config.species,
      rarity: config.rarity,
      eye: config.eye,
      hat: config.hat,
      shiny: config.shiny ?? false,
      name: getCompanionName(),
      personality: getCompanionPersonality(),
      createdAt: config.appliedAt || new Date().toISOString(),
    };
  }

  savePetConfig(migrated);
  return migrated;
}

// Save a named profile. Only marks it active if activate=true (i.e., the binary was actually patched).
export function saveProfile(profileName, profileData, { activate = false } = {}) {
  const config = loadPetConfig() || {
    version: 2,
    activeProfile: null,
    profiles: {},
  };

  config.version = 2;
  config.profiles = config.profiles || {};
  config.profiles[profileName] = profileData;

  if (activate) {
    config.activeProfile = profileName;
    if (config.salt && config.salt !== profileData.salt) {
      config.previousSalt = config.salt;
    }
    config.salt = profileData.salt;
  }

  savePetConfig(config);
}

// Get all saved profiles
export function getProfiles() {
  const config = loadPetConfig();
  return config?.profiles || {};
}

// Get the active profile name
export function getActiveProfile() {
  const config = loadPetConfig();
  return config?.activeProfile || null;
}

// Switch to an existing profile — updates top-level salt and companion identity
export function switchToProfile(profileName) {
  const config = loadPetConfig();
  if (!config?.profiles?.[profileName]) {
    throw new Error(`Profile "${profileName}" not found`);
  }

  const profile = config.profiles[profileName];
  config.previousSalt = config.salt;
  config.activeProfile = profileName;
  config.salt = profile.salt;
  config.appliedAt = new Date().toISOString();

  savePetConfig(config);

  // Update companion identity in ~/.claude.json
  if (profile.name) {
    try { renameCompanion(profile.name); } catch { /* companion may not exist yet */ }
  }
  if (profile.personality) {
    try { setCompanionPersonality(profile.personality); } catch { /* companion may not exist yet */ }
  }
}

// Delete a named profile (cannot delete the active one)
export function deleteProfile(profileName) {
  const config = loadPetConfig();
  if (!config?.profiles?.[profileName]) return false;
  if (config.activeProfile === profileName) {
    throw new Error(`Cannot delete the active profile "${profileName}". Switch to another first.`);
  }
  delete config.profiles[profileName];
  savePetConfig(config);
  return true;
}

// Get the path to ~/.claude.json
function getClaudeConfigPath() {
  const paths = [
    join(homedir(), '.claude.json'),
    join(homedir(), '.claude', '.config.json'),
  ];
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return paths[0]; // default
}

// Read the companion's current name from ~/.claude.json
export function getCompanionName() {
  const configPath = getClaudeConfigPath();
  if (!existsSync(configPath)) return null;
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    return config.companion?.name ?? null;
  } catch {
    return null;
  }
}

// Rename the companion in ~/.claude.json
export function renameCompanion(newName) {
  const configPath = getClaudeConfigPath();
  if (!existsSync(configPath)) {
    throw new Error(`Claude config not found at ${configPath}`);
  }
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  if (!config.companion) {
    throw new Error('No companion found in config. Run /buddy in Claude Code first to hatch one.');
  }
  config.companion.name = newName;
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
}

// Read the companion's personality from ~/.claude.json
export function getCompanionPersonality() {
  const configPath = getClaudeConfigPath();
  if (!existsSync(configPath)) return null;
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    return config.companion?.personality ?? null;
  } catch {
    return null;
  }
}

// Update the companion's personality in ~/.claude.json
export function setCompanionPersonality(personality) {
  const configPath = getClaudeConfigPath();
  if (!existsSync(configPath)) {
    throw new Error(`Claude config not found at ${configPath}`);
  }
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  if (!config.companion) {
    throw new Error('No companion found in config. Run /buddy in Claude Code first to hatch one.');
  }
  config.companion.personality = personality;
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
}

// Delete the companion from ~/.claude.json so Claude Code re-hatches on next /buddy
export function deleteCompanion() {
  const configPath = getClaudeConfigPath();
  if (!existsSync(configPath)) return false;
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  if (!config.companion) return false;
  delete config.companion;
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  return true;
}

// Read or write Claude Code's settings.json for hooks
const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');

export function getClaudeSettings() {
  if (!existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveClaudeSettings(settings) {
  const dir = join(homedir(), '.claude');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
}

const HOOK_COMMAND = 'any-buddy apply --silent';

// Claude Code hooks schema: { "SessionStart": [{ "matcher": "", "hooks": [{ "type": "command", "command": "..." }] }] }
function findHookEntry(matchers) {
  if (!Array.isArray(matchers)) return null;
  return matchers.find(m =>
    Array.isArray(m.hooks) && m.hooks.some(h => h.command === HOOK_COMMAND)
  ) ?? null;
}

export function isHookInstalled() {
  const settings = getClaudeSettings();
  return findHookEntry(settings.hooks?.SessionStart) !== null;
}

export function installHook() {
  const settings = getClaudeSettings();
  if (!settings.hooks) settings.hooks = {};
  if (!Array.isArray(settings.hooks.SessionStart)) settings.hooks.SessionStart = [];

  if (!findHookEntry(settings.hooks.SessionStart)) {
    settings.hooks.SessionStart.push({
      matcher: '',
      hooks: [{ type: 'command', command: HOOK_COMMAND }],
    });
  }

  saveClaudeSettings(settings);
}

export function removeHook() {
  const settings = getClaudeSettings();
  if (!settings.hooks?.SessionStart) return;
  settings.hooks.SessionStart = settings.hooks.SessionStart.filter(
    m => !Array.isArray(m.hooks) || !m.hooks.some(h => h.command === HOOK_COMMAND)
  );
  if (settings.hooks.SessionStart.length === 0) delete settings.hooks.SessionStart;
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  saveClaudeSettings(settings);
}
