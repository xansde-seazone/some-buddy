import type { AppState, XPState } from '../types.js';
import { readJSON, writeJSON } from '../fs-atomic.js';
import { paths } from '../paths.js';

const DEFAULT_XP_STATE: XPState = {
  xp: 0,
  level: 1,
  streak: 0,
  lastActiveDate: null,
  lastSyncedAt: null,
  lastProcessedCursors: {},
  eventXP: 0,
};

const DEFAULT_STATE: AppState = {
  activeBuddy: null,
  lastContext: { cwd: null, branch: null, model: null },
  refreshCount: 0,
  xp: { ...DEFAULT_XP_STATE, lastProcessedCursors: {} },
  colors: { W: 0, U: 0, B: 0, R: 0, G: 0 },
  colorPoints: 0,
  badges: [],
  pendingPhrase: null,
};

function parseXPState(raw: unknown): XPState {
  const r = raw as Record<string, unknown> | null | undefined;
  if (!r || typeof r !== 'object') return { ...DEFAULT_XP_STATE, lastProcessedCursors: {} };

  const cursors: Record<string, number> = {};
  const rawCursors = r['lastProcessedCursors'];
  if (rawCursors && typeof rawCursors === 'object' && !Array.isArray(rawCursors)) {
    for (const [k, v] of Object.entries(rawCursors as Record<string, unknown>)) {
      if (typeof v === 'number') cursors[k] = v;
    }
  }

  return {
    xp: typeof r['xp'] === 'number' ? r['xp'] : 0,
    level: typeof r['level'] === 'number' ? r['level'] : 1,
    streak: typeof r['streak'] === 'number' ? r['streak'] : 0,
    lastActiveDate: typeof r['lastActiveDate'] === 'string' ? r['lastActiveDate'] : null,
    lastSyncedAt: typeof r['lastSyncedAt'] === 'string' ? r['lastSyncedAt'] : null,
    lastProcessedCursors: cursors,
    eventXP: typeof r['eventXP'] === 'number' ? r['eventXP'] : 0,
  };
}

/** Loads persisted AppState from disk, returning defaults if file is missing. */
export async function loadState(): Promise<AppState> {
  try {
    const data = await readJSON<AppState>(paths.state());
    if (data === null) return { ...DEFAULT_STATE, lastContext: { ...DEFAULT_STATE.lastContext }, xp: { ...DEFAULT_XP_STATE, lastProcessedCursors: {} } };
    const rawData = data as unknown as Record<string, unknown>;

    // Parse colors safely — each field must be number, clamped 0-20
    const rawColors = rawData['colors'];
    const parsedColors: { W: number; U: number; B: number; R: number; G: number } = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    if (rawColors && typeof rawColors === 'object' && !Array.isArray(rawColors)) {
      const c = rawColors as Record<string, unknown>;
      for (const k of ['W', 'U', 'B', 'R', 'G'] as const) {
        const v = typeof c[k] === 'number' ? (c[k] as number) : 0;
        parsedColors[k] = Math.max(0, Math.min(20, v));
      }
    }

    // Parse colorPoints safely — number, default 0, min 0
    const rawColorPoints = rawData['colorPoints'];
    const parsedColorPoints = typeof rawColorPoints === 'number' ? Math.max(0, rawColorPoints) : 0;

    // Parse badges safely — string array, default []
    const rawBadges = rawData['badges'];
    const parsedBadges: string[] = Array.isArray(rawBadges)
      ? rawBadges.filter((b) => typeof b === 'string')
      : [];

    return {
      activeBuddy: typeof data.activeBuddy === 'string' ? data.activeBuddy : null,
      lastContext: {
        cwd: typeof data.lastContext?.cwd === 'string' ? data.lastContext.cwd : null,
        branch: typeof data.lastContext?.branch === 'string' ? data.lastContext.branch : null,
        model: typeof data.lastContext?.model === 'string' ? data.lastContext.model : null,
      },
      refreshCount: typeof data.refreshCount === 'number' ? data.refreshCount : 0,
      xp: parseXPState(rawData['xp']),
      colors: parsedColors,
      colorPoints: parsedColorPoints,
      badges: parsedBadges,
      pendingPhrase: typeof rawData['pendingPhrase'] === 'string' ? rawData['pendingPhrase'] : null,
    };
  } catch {
    return { ...DEFAULT_STATE, lastContext: { ...DEFAULT_STATE.lastContext }, xp: { ...DEFAULT_XP_STATE, lastProcessedCursors: {} } };
  }
}

/** Persists AppState to disk atomically. Safe against mid-write cancellation. */
export async function saveState(state: AppState): Promise<void> {
  await writeJSON(paths.state(), state);
}
