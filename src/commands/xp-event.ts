import { loadState, saveState } from '../render/state.js';
import { levelFromXP } from '../xp/levels.js';

/**
 * Registers XP from an external event (e.g. a Claude Code hook).
 *
 * @param eventName  Human-readable label for the event (non-empty string).
 * @param xpAmount   String representation of a positive integer XP value.
 * @returns 0 on success, 1 on validation error.
 */
export async function cmdXPEvent(eventName: string, xpAmount: string): Promise<number> {
  // Validate eventName
  if (!eventName || eventName.trim() === '') {
    console.error('error: event name must be non-empty');
    return 1;
  }

  // Validate xpAmount
  const amount = parseInt(xpAmount, 10);
  if (!Number.isFinite(amount) || isNaN(amount) || amount <= 0 || String(parseInt(xpAmount, 10)) !== xpAmount.trim()) {
    console.error(`error: xp amount must be a positive integer, got: ${xpAmount}`);
    return 1;
  }

  const state = await loadState();

  state.xp.eventXP += amount;
  state.xp.xp += amount;
  state.xp.level = levelFromXP(state.xp.xp).level;

  await saveState(state);

  console.log(`+${amount} XP (${eventName}) → total ${state.xp.xp} XP (Lv.${state.xp.level})`);

  return 0;
}
