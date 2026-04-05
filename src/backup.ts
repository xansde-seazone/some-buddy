import * as fs from 'node:fs/promises';
import { paths } from './paths.js';
import { writeAtomic, readJSON, writeJSON, sha256, verifyFile } from './fs-atomic.js';
import type { BackupMeta } from './types.js';

/**
 * Copy source → target atomically by reading source and writing via writeAtomic.
 */
async function atomicCopy(source: string, target: string): Promise<string> {
  const content = await fs.readFile(source);
  await writeAtomic(target, content.toString('utf8'));
  return sha256(content);
}

/**
 * Create the immutable original backup ONLY if it does not already exist.
 * If the backup already exists, verifies integrity and returns the stored meta.
 * Throws if the existing backup is corrupted.
 */
export async function createOriginalBackup(sourcePath: string): Promise<BackupMeta> {
  const existingMeta = await readJSON<BackupMeta>(paths.originalBackupMeta());
  if (existingMeta !== null) {
    const ok = await verifyFile(paths.originalBackup(), existingMeta.sha256);
    if (!ok) {
      throw new Error('Original backup exists but SHA-256 verification failed');
    }
    return existingMeta;
  }

  await paths.ensureHomeStructure();
  const digest = await atomicCopy(sourcePath, paths.originalBackup());

  const meta: BackupMeta = {
    path: paths.originalBackup(),
    sha256: digest,
    createdAt: new Date().toISOString(),
    kind: 'original',
  };
  await writeJSON(paths.originalBackupMeta(), meta);

  const ok = await verifyFile(paths.originalBackup(), digest);
  if (!ok) {
    throw new Error('Original backup integrity check failed after write');
  }
  return meta;
}

/**
 * Always creates a new rotating backup timestamped with current ISO time.
 * Verifies integrity after writing.
 */
export async function createRotatingBackup(sourcePath: string): Promise<BackupMeta> {
  await paths.ensureHomeStructure();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = paths.rotatingBackup(timestamp);
  const metaPath = paths.rotatingBackupMeta(timestamp);

  const digest = await atomicCopy(sourcePath, backupPath);

  const meta: BackupMeta = {
    path: backupPath,
    sha256: digest,
    createdAt: new Date().toISOString(),
    kind: 'rotating',
  };
  await writeJSON(metaPath, meta);

  const ok = await verifyFile(backupPath, digest);
  if (!ok) {
    throw new Error('Rotating backup integrity check failed after write');
  }
  return meta;
}

/**
 * Read original backup meta and re-verify the file on disk.
 * Returns null if the backup is missing. Throws if the file exists but is corrupted.
 */
export async function getOriginalBackup(): Promise<BackupMeta | null> {
  const meta = await readJSON<BackupMeta>(paths.originalBackupMeta());
  if (meta === null) return null;

  const ok = await verifyFile(paths.originalBackup(), meta.sha256);
  if (!ok) {
    throw new Error('Original backup SHA-256 mismatch — file may be corrupted');
  }
  return meta;
}

/**
 * Find the most recent rotating backup by sorting meta filenames, then verify.
 * Returns null if no rotating backups exist or none can be verified.
 */
export async function getLatestRotatingBackup(): Promise<BackupMeta | null> {
  const dir = paths.rotatingDir();
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }

  const metaFiles = entries
    .filter((f) => f.endsWith('.meta.json'))
    .sort()
    .reverse();

  for (const file of metaFiles) {
    const fullPath = `${dir}/${file}`;
    const meta = await readJSON<BackupMeta>(fullPath);
    if (meta === null) continue;
    const ok = await verifyFile(meta.path, meta.sha256);
    if (ok) return meta;
  }
  return null;
}

/**
 * Re-read the backed-up file and compare its hash to meta.sha256.
 */
export async function verifyBackup(meta: BackupMeta): Promise<boolean> {
  return verifyFile(meta.path, meta.sha256);
}

/**
 * Restore a backup atomically to targetPath (read → temp → rename).
 */
export async function restoreFromBackup(meta: BackupMeta, targetPath: string): Promise<void> {
  const content = await fs.readFile(meta.path, 'utf8');
  const actualHash = sha256(content);
  if (actualHash !== meta.sha256) {
    throw new Error('Cannot restore: backup SHA-256 mismatch');
  }
  await writeAtomic(targetPath, content);
}
