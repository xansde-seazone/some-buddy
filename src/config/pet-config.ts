import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { PetConfig } from '@/types.js';

const OUR_CONFIG = join(homedir(), '.claude-code-any-buddy.json');

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
