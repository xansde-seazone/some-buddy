import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { PetConfig, PetConfigV2, ProfileData } from '@/types.js';
import { ORIGINAL_SALT } from '@/constants.js';
import { getCompanionName, getCompanionPersonality } from './claude-config.ts';

const OUR_CONFIG = join(homedir(), '.claude-code-any-buddy.json');

// --- v1 compat (used by apply --silent fast path) ---

export function savePetConfig(data: PetConfig): void {
  writeFileSync(OUR_CONFIG, JSON.stringify(data, null, 2) + '\n');
}

export function loadPetConfig(): PetConfig | null {
  if (!existsSync(OUR_CONFIG)) return null;
  try {
    return JSON.parse(readFileSync(OUR_CONFIG, 'utf-8')) as PetConfig;
  } catch {
    return null;
  }
}

// --- v2 with profiles ---

function migrateV1(v1: PetConfig): PetConfigV2 {
  const migrated: PetConfigV2 = {
    version: 2,
    activeProfile: null,
    salt: v1.salt,
    previousSalt: v1.previousSalt,
    profiles: {},
    appliedTo: v1.appliedTo,
    appliedAt: v1.appliedAt,
  };

  if (v1.salt && v1.salt !== ORIGINAL_SALT && !v1.restored) {
    const name = v1.species ?? 'default';
    migrated.activeProfile = name;
    migrated.profiles[name] = {
      salt: v1.salt,
      species: v1.species ?? 'duck',
      rarity: v1.rarity ?? 'common',
      eye: v1.eye ?? '·',
      hat: v1.hat ?? 'none',
      shiny: false,
      stats: {},
      name: getCompanionName(),
      personality: getCompanionPersonality(),
      createdAt: v1.appliedAt ?? new Date().toISOString(),
    };
  }

  savePetConfigV2(migrated);
  return migrated;
}

export function loadPetConfigV2(): PetConfigV2 | null {
  if (!existsSync(OUR_CONFIG)) return null;
  try {
    const raw = JSON.parse(readFileSync(OUR_CONFIG, 'utf-8'));
    if (raw.version === 2) return raw as PetConfigV2;
    return migrateV1(raw as PetConfig);
  } catch {
    return null;
  }
}

export function savePetConfigV2(data: PetConfigV2): void {
  writeFileSync(OUR_CONFIG, JSON.stringify(data, null, 2) + '\n');
}

export function saveProfile(
  name: string,
  profile: ProfileData,
  { activate = false }: { activate?: boolean } = {},
): void {
  const config = loadPetConfigV2() ?? {
    version: 2 as const,
    activeProfile: null,
    salt: ORIGINAL_SALT,
    profiles: {},
  };

  config.profiles[name] = profile;

  if (activate) {
    config.activeProfile = name;
    if (config.salt && config.salt !== profile.salt) {
      config.previousSalt = config.salt;
    }
    config.salt = profile.salt;
  }

  savePetConfigV2(config);
}

export function getProfiles(): Record<string, ProfileData> {
  const config = loadPetConfigV2();
  return config?.profiles ?? {};
}

export function getActiveProfile(): string | null {
  const config = loadPetConfigV2();
  return config?.activeProfile ?? null;
}

export function switchToProfile(name: string): PetConfigV2 {
  const config = loadPetConfigV2();
  if (!config?.profiles[name]) {
    throw new Error(`Buddy "${name}" not found`);
  }

  config.previousSalt = config.salt;
  config.activeProfile = name;
  config.salt = config.profiles[name].salt;
  config.appliedAt = new Date().toISOString();

  savePetConfigV2(config);
  return config;
}

export function deleteProfile(name: string): void {
  const config = loadPetConfigV2();
  if (!config?.profiles[name]) return;
  if (config.activeProfile === name) {
    throw new Error(`Cannot delete the active buddy "${name}". Switch to another first.`);
  }
  config.profiles = Object.fromEntries(
    Object.entries(config.profiles).filter(([key]) => key !== name),
  );
  savePetConfigV2(config);
}
