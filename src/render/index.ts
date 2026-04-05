import type { Buddy } from '../types.js';
import { readJSON } from '../fs-atomic.js';
import { paths } from '../paths.js';
import { parseClaudeInput } from './context.js';
import { loadState, saveState } from './state.js';
import { detectContextChanges } from './voice.js';
import { pickFrame, substituteEyes } from './frames.js';
import { colorizeFrame } from './color.js';
import { pickPhrase } from './voice.js';

/**
 * Loads a buddy from disk by name.
 * Returns null if the file is missing, unreadable, or invalid.
 */
export async function loadBuddy(name: string): Promise<Buddy | null> {
  try {
    const data = await readJSON<Buddy>(paths.buddy(name));
    if (!data || typeof data !== 'object') return null;
    if (typeof data.name !== 'string' || !data.name) return null;
    if (!Array.isArray(data.frames) || data.frames.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Main render entry point. Parses stdin, loads state and buddy, renders the
 * ASCII frame with optional speech bubble, persists updated state, and returns
 * the final string for Claude Code's statusLine.
 *
 * Always exits cleanly: any error returns an empty string.
 */
export async function renderStatusLine(stdin: string): Promise<string> {
  try {
    // 1. Parse Claude's context from stdin
    const curr = parseClaudeInput(stdin);

    // 2. Load persisted state
    const state = await loadState();

    // 3. Detect context changes
    const ctxChanges = detectContextChanges(state.lastContext, curr);

    // 4. No active buddy → nothing to render
    if (!state.activeBuddy) return '';

    // 5. Load buddy definition
    const buddy = await loadBuddy(state.activeBuddy);
    if (!buddy) return '';

    // 6. Pick frame by refresh tick
    const frame = pickFrame(buddy, state.refreshCount);

    // 7. Substitute eye character
    const eyedFrame = substituteEyes(frame, buddy.eyes);

    // 8. Colorize → 5 lines
    const frameLines = colorizeFrame(eyedFrame);

    // 9. Pick optional speech phrase
    const phrase = pickPhrase(buddy.voice, state, ctxChanges, new Date());

    // 10. Persist updated state (fire-and-forget acceptable; awaited for correctness)
    const nextState = {
      ...state,
      refreshCount: state.refreshCount + 1,
      lastContext: curr,
    };
    await saveState(nextState);

    // Join: 5 frame lines + optional speech line
    const lines = phrase !== null ? [...frameLines, phrase] : frameLines;
    return lines.join('\n');
  } catch {
    return '';
  }
}
