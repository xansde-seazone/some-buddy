import type { AppState, Voice } from '../types.js';

type ContextKey = 'branch_changed' | 'cwd_changed' | 'model_changed';
type TimeKey = 'time_morning' | 'time_afternoon' | 'time_evening' | 'time_night';

/** Returns the list of context keys that changed between prev and curr. */
export function detectContextChanges(
  prev: AppState['lastContext'],
  curr: AppState['lastContext'],
): ContextKey[] {
  const changes: ContextKey[] = [];
  if (prev.branch !== curr.branch) changes.push('branch_changed');
  if (prev.cwd !== curr.cwd) changes.push('cwd_changed');
  if (prev.model !== curr.model) changes.push('model_changed');
  return changes;
}

/**
 * Maps a Date's hour to the appropriate time-of-day reaction key.
 * - 5–11 → time_morning
 * - 12–17 → time_afternoon
 * - 18–23 → time_evening
 * - 0–4   → time_night
 */
export function timeOfDayKey(date: Date): TimeKey {
  const h = date.getHours();
  if (h >= 5 && h <= 11) return 'time_morning';
  if (h >= 12 && h <= 17) return 'time_afternoon';
  if (h >= 18 && h <= 23) return 'time_evening';
  return 'time_night';
}

/**
 * Returns true if newStreak crosses a milestone that prevStreak hadn't reached yet.
 * Milestones: 5, 10, 20, 30
 */
export function isStreakMilestone(newStreak: number, prevStreak: number): boolean {
  const milestones = [5, 10, 20, 30];
  return milestones.some(m => newStreak >= m && prevStreak < m);
}

/**
 * Picks a phrase to display, or null if none applies.
 *
 * Priority:
 * 1. If any ctxChange has a non-empty reactions pool → pick deterministically.
 * 2. Pending progression phrase (shown once, cleared after render).
 * 3. Every 7th refresh (refreshCount % 7 === 0) → time-of-day phrase if pool non-empty.
 * 4. Every 3rd refresh (refreshCount % 3 === 0) → idle phrase if pool non-empty.
 * 5. null.
 *
 * Index into pool = refreshCount % pool.length (deterministic, never random).
 */
export function pickPhrase(
  voice: Voice,
  state: AppState,
  ctxChanges: ContextKey[],
  now: Date,
): string | null {
  const idx = state.refreshCount;

  // 1. Context-change reactions (first matching key with a non-empty pool wins)
  for (const key of ctxChanges) {
    const pool = voice.reactions[key];
    if (pool && pool.length > 0) {
      return pool[idx % pool.length] as string;
    }
  }

  // 2. Pending progression phrase (shown once, cleared after render)
  if (state.pendingPhrase) {
    return state.pendingPhrase;
  }

  // 3. Time-of-day phrase on every 7th refresh
  if (idx % 7 === 0) {
    const todKey = timeOfDayKey(now);
    const pool = voice.reactions[todKey];
    if (pool && pool.length > 0) {
      return pool[idx % pool.length] as string;
    }
  }

  // 4. Idle phrase on every 3rd refresh
  if (idx % 3 === 0) {
    const pool = voice.phrases;
    if (pool && pool.length > 0) {
      return pool[idx % pool.length] as string;
    }
  }

  return null;
}
