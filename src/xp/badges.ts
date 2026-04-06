export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
}

export const BADGES: BadgeDefinition[] = [
  { id: 'first_sync',   name: 'First Sync',   description: 'Complete your first sync' },
  { id: 'week_streak',  name: 'Week Streak',  description: 'Reach a 5-day streak' },
  { id: 'month_streak', name: 'Month Streak', description: 'Reach a 20-day streak' },
  { id: 'cache_master', name: 'Cache Master', description: 'Session with 80%+ cache hit rate' },
  { id: 'speed_demon',  name: 'Speed Demon',  description: '3+ sessions in a single day' },
  { id: 'deep_focus',   name: 'Deep Focus',   description: 'Session with 20+ API calls' },
  { id: 'level_10',     name: 'Practitioner', description: 'Reach level 10' },
  { id: 'level_20',     name: 'Engineer',     description: 'Reach level 20' },
];

export interface BadgeContext {
  level: number;
  streak: number;
  existingBadges: string[];
  breakdown: Array<{ date: string; cacheHitRate: number }>;
  sessions: Array<{ calls: Array<unknown> }>;
}

/**
 * Evaluate all badges and return newly unlocked badge IDs.
 * A badge is only returned if it's NOT already in existingBadges.
 */
export function evaluateBadges(ctx: BadgeContext): string[] {
  const newBadges: string[] = [];

  function tryUnlock(id: string, condition: boolean): void {
    if (condition && !ctx.existingBadges.includes(id)) {
      newBadges.push(id);
    }
  }

  tryUnlock('first_sync', ctx.breakdown.length > 0);
  tryUnlock('week_streak', ctx.streak >= 5);
  tryUnlock('month_streak', ctx.streak >= 20);
  tryUnlock('cache_master', ctx.breakdown.some(s => s.cacheHitRate >= 0.8));

  // speed_demon: 3+ sessions on the same day
  const dateCount = new Map<string, number>();
  for (const s of ctx.breakdown) {
    dateCount.set(s.date, (dateCount.get(s.date) ?? 0) + 1);
  }
  tryUnlock('speed_demon', [...dateCount.values()].some(count => count >= 3));

  // deep_focus: any session with 20+ calls
  tryUnlock('deep_focus', ctx.sessions.some(s => s.calls.length >= 20));

  tryUnlock('level_10', ctx.level >= 10);
  tryUnlock('level_20', ctx.level >= 20);

  return newBadges;
}
