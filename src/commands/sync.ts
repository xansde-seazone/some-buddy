import { loadState, saveState } from '../render/state.js';
import { discoverJSONLFiles, parseJSONLFile } from '../xp/parser.js';
import { runSync } from '../xp/calculator.js';
import { levelFromXP } from '../xp/levels.js';
import type { SessionData } from '../xp/parser.js';

/**
 * Runs the XP sync command:
 * 1. Loads current state
 * 2. Discovers JSONL files
 * 3. Parses new data from each file using stored cursors
 * 4. Runs XP calculation
 * 5. Saves updated state
 * 6. Prints audit log
 */
export async function cmdSync(): Promise<number> {
  try {
    const state = await loadState();
    const files = await discoverJSONLFiles();

    const allSessions: SessionData[] = [];
    const newCursors: Record<string, number> = { ...state.xp.lastProcessedCursors };

    for (const filePath of files) {
      const cursor = state.xp.lastProcessedCursors[filePath] ?? 0;
      const { sessions, newCursor } = await parseJSONLFile(filePath, cursor);
      allSessions.push(...sessions);
      newCursors[filePath] = newCursor;
    }

    const result = runSync(allSessions, state.xp);

    // Build updated XP state
    const prevXP = state.xp.xp;
    const newXPTotal = prevXP + result.xpAdded;
    const levelInfo = levelFromXP(newXPTotal);

    state.xp = {
      ...state.xp,
      xp: newXPTotal,
      level: levelInfo.level,
      streak: result.newStreak,
      lastActiveDate: result.breakdown.length > 0
        ? (result.breakdown[result.breakdown.length - 1]!.date)
        : state.xp.lastActiveDate,
      lastSyncedAt: new Date().toISOString(),
      lastProcessedCursors: newCursors,
    };

    await saveState(state);

    // Audit log
    console.log(`\n=== XP Sync ===`);
    console.log(`Sessions processed: ${result.sessionsProcessed}`);
    console.log(`XP added:           ${result.xpAdded}`);
    console.log(`Total XP:           ${newXPTotal}`);
    console.log(`Level:              ${levelInfo.level} — ${levelInfo.name}`);
    console.log(`Streak:             ${result.newStreak} days`);

    if (result.breakdown.length > 0) {
      console.log(`\nBreakdown:`);
      for (const s of result.breakdown) {
        console.log(
          `  ${s.date}  ${s.sessionId.slice(0, 8)}...  model=${s.dominantModel}` +
          `  mult=${s.modelMultiplier}  cache=${(s.cacheHitRate * 100).toFixed(0)}%` +
          `  xp=${s.totalXP}`,
        );
      }
    }

    return 0;
  } catch (err: unknown) {
    console.error('sync failed:', err);
    return 1;
  }
}
