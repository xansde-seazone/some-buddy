import type { XPState } from '../types.js';
import type { SessionData } from './parser.js';
import { levelFromXP } from './levels.js';
import { isWorkday } from './holidays.js';

export interface SessionXP {
  sessionId: string;
  date: string;
  baseXP: number;           // base XP before multipliers
  modelMultiplier: number;  // from model efficiency table
  cacheBonus: number;       // 0, 0.2, or 0.5
  totalXP: number;          // final XP for this session
  dominantModel: string;    // model with most output tokens
  complexityScore: number;  // output_tokens / api_calls
  cacheHitRate: number;     // 0-1
}

export interface SyncResult {
  sessionsProcessed: number;
  xpAdded: number;
  newStreak: number;
  newLevel: number;
  breakdown: SessionXP[];
}

export interface StreakResult {
  streak: number;
  lastActiveDate: string;
  streakXP: number;
}

type ModelTier = 'haiku' | 'sonnet' | 'opus' | 'unknown';

function getModelTier(modelId: string): ModelTier {
  if (modelId.startsWith('claude-haiku')) return 'haiku';
  if (modelId.startsWith('claude-sonnet')) return 'sonnet';
  if (modelId.startsWith('claude-opus')) return 'opus';
  return 'unknown';
}

/**
 * Determines the model multiplier based on tier and complexity score.
 *
 * | Model  | Simple (< 300) | Complex (>= 300) |
 * |--------|---------------|-----------------|
 * | haiku  | 2.0           | 1.0             |
 * | sonnet | 1.0           | 1.5             |
 * | opus   | 0.5           | 2.0             |
 */
function getModelMultiplier(tier: ModelTier, complexityScore: number): number {
  const isComplex = complexityScore >= 300;
  switch (tier) {
    case 'haiku':  return isComplex ? 1.0 : 2.0;
    case 'sonnet': return isComplex ? 1.5 : 1.0;
    case 'opus':   return isComplex ? 2.0 : 0.5;
    default:       return isComplex ? 1.5 : 1.0; // treat unknown as sonnet
  }
}

/**
 * Calculates XP for a single session.
 */
export function calculateSessionXP(session: SessionData): SessionXP {
  const { sessionId, date, calls } = session;

  if (calls.length === 0) {
    return {
      sessionId,
      date,
      baseXP: 10,
      modelMultiplier: 1.0,
      cacheBonus: 0,
      totalXP: 10,
      dominantModel: 'unknown',
      complexityScore: 0,
      cacheHitRate: 0,
    };
  }

  // Compute totals
  let totalOutputTokens = 0;
  let totalInputTokens = 0;
  let totalCacheCreation = 0;
  let totalCacheRead = 0;

  // Track output tokens per model to find dominant model
  const outputByModel = new Map<string, number>();

  for (const call of calls) {
    totalOutputTokens += call.outputTokens;
    totalInputTokens += call.inputTokens;
    totalCacheCreation += call.cacheCreation;
    totalCacheRead += call.cacheRead;

    const prev = outputByModel.get(call.model) ?? 0;
    outputByModel.set(call.model, prev + call.outputTokens);
  }

  // Dominant model = model with most output tokens
  let dominantModel = calls[0]!.model;
  let maxOutput = 0;
  for (const [model, tokens] of outputByModel) {
    if (tokens > maxOutput) {
      maxOutput = tokens;
      dominantModel = model;
    }
  }

  const complexityScore = calls.length > 0 ? totalOutputTokens / calls.length : 0;
  const tier = getModelTier(dominantModel);
  const modelMultiplier = getModelMultiplier(tier, complexityScore);

  // Cache hit rate
  const denominator = totalCacheRead + totalCacheCreation + totalInputTokens;
  const cacheHitRate = denominator > 0 ? totalCacheRead / denominator : 0;

  let cacheBonus = 0;
  if (cacheHitRate >= 0.8) {
    cacheBonus = 0.5;
  } else if (cacheHitRate >= 0.5) {
    cacheBonus = 0.2;
  }

  const baseXP = 10;
  const totalXP = Math.round(baseXP * modelMultiplier * (1 + cacheBonus));

  return {
    sessionId,
    date,
    baseXP,
    modelMultiplier,
    cacheBonus,
    totalXP,
    dominantModel,
    complexityScore,
    cacheHitRate,
  };
}

/**
 * Returns streak XP per workday based on accumulated streak length.
 * - Days 1-5: 5 XP/day
 * - Days 6-30: 10 XP/day
 * - Days 31+: 15 XP/day
 */
function streakDayXP(streakLength: number): number {
  if (streakLength <= 5) return 5;
  if (streakLength <= 30) return 10;
  return 15;
}

/**
 * Calculates streak from a sorted list of active dates.
 *
 * Returns the new streak count, the last active date, and total streak XP earned.
 *
 * Rules:
 * - Only workday dates count toward streak
 * - Weekend/holiday dates give +5 XP (dedication bonus) but don't affect streak
 * - Streak resets if a workday passes with no activity
 */
export function calculateStreak(
  activeDates: string[],
  currentStreak: number,
  lastActiveDate: string | null,
): StreakResult {
  if (activeDates.length === 0) {
    return {
      streak: currentStreak,
      lastActiveDate: lastActiveDate ?? '',
      streakXP: 0,
    };
  }

  // Sort ascending and deduplicate
  const sorted = [...new Set(activeDates)].sort();

  let streak = currentStreak;
  let streakXP = 0;
  let lastDate = lastActiveDate; // last date with activity (any kind)

  // Track last *workday* with activity separately to correctly handle weekends
  // between workdays (a weekend doesn't break the streak).
  // Initialise from lastActiveDate if it's a workday.
  let lastWorkdayDate: string | null = null;
  if (lastActiveDate !== null) {
    const d = new Date(lastActiveDate + 'T12:00:00');
    lastWorkdayDate = isWorkday(d) ? lastActiveDate : null;
  }

  for (const dateStr of sorted) {
    const date = new Date(dateStr + 'T12:00:00'); // local noon to avoid TZ shifts

    if (!isWorkday(date)) {
      // Dedication bonus: +5 XP, no streak change
      streakXP += 5;
      lastDate = dateStr;
      continue;
    }

    // For workday: check if it's the next consecutive workday after lastWorkdayDate
    if (lastWorkdayDate === null) {
      // First ever workday
      streak = 1;
    } else {
      const prevDate = new Date(lastWorkdayDate + 'T12:00:00');
      // Find next workday after prevDate
      const nextWorkday = findNextWorkday(prevDate);
      const nextWorkdayStr = toDateString(nextWorkday);
      if (dateStr === nextWorkdayStr) {
        // Consecutive workday — extend streak
        streak += 1;
      } else if (dateStr > nextWorkdayStr) {
        // Missed a workday — reset streak
        streak = 1;
      }
      // dateStr === lastWorkdayDate shouldn't happen (Set deduplicated)
    }

    streakXP += streakDayXP(streak);
    lastDate = dateStr;
    lastWorkdayDate = dateStr;
  }

  return {
    streak,
    lastActiveDate: lastDate ?? '',
    streakXP,
  };
}

function findNextWorkday(from: Date): Date {
  const d = new Date(from.getTime() + 86400000); // +1 day
  while (!isWorkday(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Runs the full sync: calculates XP for all new sessions and updates XPState fields.
 */
export function runSync(sessions: SessionData[], previousState: XPState): SyncResult {
  const breakdown: SessionXP[] = [];
  let xpAdded = 0;
  const activeDates: string[] = [];

  for (const session of sessions) {
    const sessionXP = calculateSessionXP(session);
    breakdown.push(sessionXP);
    xpAdded += sessionXP.totalXP;
    activeDates.push(session.date);
  }

  const streakResult = calculateStreak(
    activeDates,
    previousState.streak,
    previousState.lastActiveDate,
  );

  xpAdded += streakResult.streakXP;

  // eventXP is already counted in previousState.xp when events fire.
  // We only add newly synced session XP + streak XP on top.
  const totalXP = previousState.xp + xpAdded;
  const newLevel = levelFromXP(totalXP).level;

  return {
    sessionsProcessed: sessions.length,
    xpAdded,
    newStreak: streakResult.streak,
    newLevel,
    breakdown,
  };
}
