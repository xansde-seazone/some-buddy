import { loadState, saveState } from '../render/state.js';
import { discoverJSONLFiles, parseJSONLFile } from '../xp/parser.js';
import { runSync } from '../xp/calculator.js';
import { levelFromXP, colorPointsForLevel } from '../xp/levels.js';
import { evaluateBadges, BADGES } from '../xp/badges.js';
import { isStreakMilestone } from '../render/voice.js';
import { readJSON } from '../fs-atomic.js';
import { paths } from '../paths.js';
import type { SessionData } from '../xp/parser.js';
import type { Buddy } from '../types.js';

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

    // Capture previous values before any state mutation
    const prevLevel = state.xp.level;
    const prevStreak = state.xp.streak;
    const prevLastActiveDate = state.xp.lastActiveDate;

    // Build updated XP state
    const prevXP = state.xp.xp;
    const newXPTotal = prevXP + result.xpAdded;
    const levelInfo = levelFromXP(newXPTotal);

    // Calculate color points from level ups
    let colorPointsEarned = 0;
    if (levelInfo.level > prevLevel) {
      for (let lv = prevLevel + 1; lv <= levelInfo.level; lv++) {
        colorPointsEarned += colorPointsForLevel(lv);
      }
    }

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

    state.colorPoints = (state.colorPoints ?? 0) + colorPointsEarned;

    // Evaluate badges
    const newBadges = evaluateBadges({
      level: levelInfo.level,
      streak: result.newStreak,
      existingBadges: state.badges,
      breakdown: result.breakdown,
      sessions: allSessions,
    });

    if (newBadges.length > 0) {
      state.badges = [...state.badges, ...newBadges];
    }

    // Detect progression events and pick a pending phrase
    let pendingPhrase: string | null = null;

    if (state.activeBuddy) {
      const buddy = await readJSON<Buddy>(paths.buddy(state.activeBuddy));
      if (buddy?.voice?.reactions) {
        const reactions = buddy.voice.reactions;

        // Priority: level_up > badge_unlocked > streak_milestone > idle_return
        if (levelInfo.level > prevLevel && reactions.level_up?.length) {
          const pool = reactions.level_up;
          pendingPhrase = pool[levelInfo.level % pool.length] ?? null;
        } else if (newBadges.length > 0 && reactions.badge_unlocked?.length) {
          const pool = reactions.badge_unlocked;
          pendingPhrase = pool[0] ?? null;
        } else if (isStreakMilestone(result.newStreak, prevStreak) && reactions.streak_milestone?.length) {
          const pool = reactions.streak_milestone;
          pendingPhrase = pool[0] ?? null;
        } else if (result.breakdown.length > 0 && prevLastActiveDate) {
          const lastActive = new Date(prevLastActiveDate + 'T12:00:00');
          const firstNewSession = new Date(result.breakdown[0]!.date + 'T12:00:00');
          const daysDiff = Math.floor((firstNewSession.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff >= 3 && reactions.idle_return?.length) {
            const pool = reactions.idle_return;
            pendingPhrase = pool[0] ?? null;
          }
        }
      }
    }

    state.pendingPhrase = pendingPhrase;

    await saveState(state);

    // Audit log
    console.log(`\n=== XP Sync ===`);
    console.log(`Sessions processed: ${result.sessionsProcessed}`);
    console.log(`XP added:           ${result.xpAdded}`);
    console.log(`Total XP:           ${newXPTotal}`);
    console.log(`Level:              ${levelInfo.level} — ${levelInfo.name}`);
    console.log(`Streak:             ${result.newStreak} days`);
    if (colorPointsEarned > 0) {
      console.log(`Color points:       +${colorPointsEarned} (total: ${state.colorPoints})`);
    }

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

    for (const badgeId of newBadges) {
      const badge = BADGES.find(b => b.id === badgeId);
      if (badge) {
        console.log(`🏆 Badge desbloqueado: ${badge.name}!`);
      }
    }

    return 0;
  } catch (err: unknown) {
    console.error('sync failed:', err);
    return 1;
  }
}
