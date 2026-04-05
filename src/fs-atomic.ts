import * as fs from 'node:fs/promises';
import * as crypto from 'node:crypto';
import * as path from 'node:path';

/**
 * Write content to a file atomically:
 * 1. Write to a temp file in the same directory
 * 2. fsync the temp file
 * 3. Rename temp → target (atomic on POSIX)
 */
export async function writeAtomic(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.tmp-${Math.random().toString(36).slice(2)}`);

  let handle: fs.FileHandle | null = null;
  try {
    handle = await fs.open(tmp, 'w');
    await handle.writeFile(content, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    await fs.rename(tmp, filePath);
  } catch (err) {
    if (handle !== null) {
      await handle.close().catch(() => undefined);
    }
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
}

/**
 * Read and parse a JSON file. Returns null if the file does not exist.
 * Throws if the file exists but cannot be parsed.
 */
export async function readJSON<T>(filePath: string): Promise<T | null> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
  return JSON.parse(raw) as T;
}

/**
 * Write an object as pretty-printed JSON atomically.
 */
export async function writeJSON(filePath: string, data: unknown): Promise<void> {
  await writeAtomic(filePath, JSON.stringify(data, null, 2));
}

/**
 * Compute a SHA-256 hex digest of a string or Buffer.
 */
export function sha256(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Re-read a file from disk and verify its SHA-256 matches expectedSha.
 * Returns false if the file is missing or the hash mismatches.
 */
export async function verifyFile(filePath: string, expectedSha: string): Promise<boolean> {
  let content: Buffer;
  try {
    content = await fs.readFile(filePath);
  } catch {
    return false;
  }
  return sha256(content) === expectedSha;
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}
