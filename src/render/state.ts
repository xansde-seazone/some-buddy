import type { AppState } from '../types.js';
import { readJSON, writeJSON } from '../fs-atomic.js';
import { paths } from '../paths.js';

const DEFAULT_STATE: AppState = {
  activeBuddy: null,
  lastContext: { cwd: null, branch: null, model: null },
  refreshCount: 0,
};

/** Loads persisted AppState from disk, returning defaults if file is missing. */
export async function loadState(): Promise<AppState> {
  try {
    const data = await readJSON<AppState>(paths.state());
    if (data === null) return { ...DEFAULT_STATE, lastContext: { ...DEFAULT_STATE.lastContext } };
    return {
      activeBuddy: typeof data.activeBuddy === 'string' ? data.activeBuddy : null,
      lastContext: {
        cwd: typeof data.lastContext?.cwd === 'string' ? data.lastContext.cwd : null,
        branch: typeof data.lastContext?.branch === 'string' ? data.lastContext.branch : null,
        model: typeof data.lastContext?.model === 'string' ? data.lastContext.model : null,
      },
      refreshCount: typeof data.refreshCount === 'number' ? data.refreshCount : 0,
    };
  } catch {
    return { ...DEFAULT_STATE, lastContext: { ...DEFAULT_STATE.lastContext } };
  }
}

/** Persists AppState to disk atomically. Safe against mid-write cancellation. */
export async function saveState(state: AppState): Promise<void> {
  await writeJSON(paths.state(), state);
}
