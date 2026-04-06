import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

export interface AssistantCall {
  model: string;        // e.g. "claude-opus-4-6"
  inputTokens: number;
  outputTokens: number;
  cacheCreation: number;
  cacheRead: number;
  timestamp: string;    // ISO
}

export interface SessionData {
  sessionId: string;    // derived from filename (no extension)
  date: string;         // "YYYY-MM-DD" in local timezone of the first call
  calls: AssistantCall[];
}

interface RawUsage {
  input_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  output_tokens?: number;
}

interface RawAssistantLine {
  type: string;
  // Top-level fields (some JSONL formats)
  model?: string;
  usage?: RawUsage;
  // Nested inside message (primary Claude Code format)
  message?: {
    model?: string;
    usage?: RawUsage;
  };
  timestamp?: string;
}

function toLocalDateString(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parses a JSONL session file incrementally starting from the given byte cursor.
 * Returns all assistant calls found and the new cursor (= total file size).
 * If the file has shrunk (cursor > file size), resets cursor to 0 and rereads.
 */
export async function parseJSONLFile(
  filePath: string,
  cursor: number,
): Promise<{ sessions: SessionData[]; newCursor: number }> {
  let fileSize: number;
  try {
    const stat = await fs.stat(filePath);
    fileSize = stat.size;
  } catch {
    // File no longer exists
    return { sessions: [], newCursor: 0 };
  }

  // If cursor > file size, file was rotated/truncated — reset and reread
  const effectiveCursor = cursor > fileSize ? 0 : cursor;

  if (effectiveCursor >= fileSize) {
    // Nothing new to read
    return { sessions: [], newCursor: fileSize };
  }

  let handle: fs.FileHandle | null = null;
  let rawText: string;
  try {
    handle = await fs.open(filePath, 'r');
    const bytesToRead = fileSize - effectiveCursor;
    const buffer = Buffer.alloc(bytesToRead);
    const { bytesRead } = await handle.read(buffer, 0, bytesToRead, effectiveCursor);
    rawText = buffer.slice(0, bytesRead).toString('utf8');
  } finally {
    if (handle !== null) await handle.close().catch(() => undefined);
  }

  const calls: AssistantCall[] = [];
  for (const line of rawText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj: RawAssistantLine;
    try {
      obj = JSON.parse(trimmed) as RawAssistantLine;
    } catch {
      continue;
    }
    if (obj.type !== 'assistant') continue;
    if (!obj.timestamp) continue;

    // Support both top-level and nested (message.*) formats
    const usage = obj.usage ?? obj.message?.usage;
    const model = obj.model ?? obj.message?.model;
    if (!usage) continue;
    if (!model) continue;

    calls.push({
      model,
      inputTokens: usage.input_tokens ?? 0,
      outputTokens: usage.output_tokens ?? 0,
      cacheCreation: usage.cache_creation_input_tokens ?? 0,
      cacheRead: usage.cache_read_input_tokens ?? 0,
      timestamp: obj.timestamp,
    });
  }

  const sessions: SessionData[] = [];
  if (calls.length > 0) {
    const sessionId = path.basename(filePath, path.extname(filePath));
    const firstTimestamp = calls[0]!.timestamp;
    sessions.push({
      sessionId,
      date: toLocalDateString(firstTimestamp),
      calls,
    });
  }

  return { sessions, newCursor: fileSize };
}

/**
 * Discovers all JSONL files under ~/.claude/projects/ recursively.
 */
export async function discoverJSONLFiles(): Promise<string[]> {
  const projectsDir = path.join(os.homedir(), '.claude', 'projects');
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const fullPath = path.join(dir, name);
      let stat: { isDirectory(): boolean; isFile(): boolean };
      try {
        stat = await fs.stat(fullPath);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        await walk(fullPath);
      } else if (stat.isFile() && name.endsWith('.jsonl')) {
        results.push(fullPath);
      }
    }
  }

  await walk(projectsDir);
  return results;
}
