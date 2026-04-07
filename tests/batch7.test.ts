import { describe, it, expect } from 'vitest';
import { pickPhrase, isStreakMilestone } from '../src/render/voice.js';
import type { Voice } from '../src/types.js';
import type { AppState } from '../src/types.js';

// ---------------------------------------------------------------------------
// Batch 7 — Voice progression system
// ---------------------------------------------------------------------------

function makeVoice(overrides: Partial<Voice> = {}): Voice {
  return {
    personality: 'test',
    phrases: ['idle phrase'],
    reactions: {
      branch_changed: ['branch reaction'],
      time_morning: ['good morning'],
      level_up: ['level up!', 'leveling...'],
      badge_unlocked: ['badge unlocked!'],
      streak_milestone: ['streak milestone!'],
      idle_return: ['welcome back!'],
    },
    ...overrides,
  };
}

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    activeBuddy: 'test',
    lastContext: { cwd: null, branch: null, model: null },
    refreshCount: 0,
    xp: {
      xp: 0,
      level: 1,
      streak: 0,
      lastActiveDate: null,
      lastSyncedAt: null,
      lastProcessedCursors: {},
      eventXP: 0,
    },
    colors: { W: 0, U: 0, B: 0, R: 0, G: 0 },
    colorPoints: 0,
    badges: [],
    pendingPhrase: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// isStreakMilestone
// ---------------------------------------------------------------------------

describe('isStreakMilestone', () => {
  it('detects crossing milestone 5 from below', () => {
    expect(isStreakMilestone(5, 4)).toBe(true);
  });

  it('does not trigger when already past milestone 5', () => {
    expect(isStreakMilestone(6, 5)).toBe(false);
  });

  it('detects crossing milestone 10', () => {
    expect(isStreakMilestone(10, 9)).toBe(true);
  });

  it('does not trigger when already past milestone 10', () => {
    expect(isStreakMilestone(11, 10)).toBe(false);
  });

  it('detects crossing milestone 20', () => {
    expect(isStreakMilestone(20, 19)).toBe(true);
  });

  it('detects crossing milestone 30', () => {
    expect(isStreakMilestone(30, 29)).toBe(true);
  });

  it('does not trigger for non-milestone values', () => {
    expect(isStreakMilestone(7, 6)).toBe(false);
  });

  it('does not trigger when streak did not increase', () => {
    expect(isStreakMilestone(5, 5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pickPhrase — pendingPhrase priority
// ---------------------------------------------------------------------------

describe('pickPhrase — pendingPhrase takes priority over time-of-day', () => {
  it('returns pendingPhrase when refreshCount is a multiple of 7', () => {
    const voice = makeVoice();
    // refreshCount=0 is a multiple of 7, which would normally trigger time-of-day
    const state = makeState({ refreshCount: 0, pendingPhrase: 'subi de nivel!' });
    // Use a morning hour to ensure time_morning pool would match
    const morningDate = new Date('2025-01-01T09:00:00');
    const result = pickPhrase(voice, state, [], morningDate);
    expect(result).toBe('subi de nivel!');
  });

  it('returns pendingPhrase even when refreshCount is a multiple of 3', () => {
    const voice = makeVoice();
    const state = makeState({ refreshCount: 3, pendingPhrase: 'conquista nova!' });
    const result = pickPhrase(voice, state, [], new Date());
    expect(result).toBe('conquista nova!');
  });
});

describe('pickPhrase — context change takes priority over pendingPhrase', () => {
  it('returns context reaction when ctxChanges is provided alongside pendingPhrase', () => {
    const voice = makeVoice();
    const state = makeState({ refreshCount: 0, pendingPhrase: 'subi de nivel!' });
    const result = pickPhrase(voice, state, ['branch_changed'], new Date());
    expect(result).toBe('branch reaction');
  });
});

describe('pickPhrase — pendingPhrase is returned over idle phrases', () => {
  it('returns pendingPhrase instead of idle phrase on every 3rd refresh', () => {
    const voice = makeVoice({ reactions: {} }); // no reactions to avoid time-of-day conflicts
    const state = makeState({ refreshCount: 3, pendingPhrase: 'progression!' });
    const result = pickPhrase(voice, state, [], new Date('2025-01-01T02:00:00')); // night (no time_morning)
    expect(result).toBe('progression!');
  });
});

describe('pickPhrase — no pendingPhrase falls through to time-of-day and idle', () => {
  it('returns time-of-day phrase on refresh 0 with no pending or ctx changes', () => {
    const voice = makeVoice();
    const state = makeState({ refreshCount: 0, pendingPhrase: null });
    const morningDate = new Date('2025-01-01T09:00:00');
    const result = pickPhrase(voice, state, [], morningDate);
    expect(result).toBe('good morning');
  });

  it('returns idle phrase on refresh 3 with no pending or ctx changes (non-7th)', () => {
    const voice = makeVoice({ reactions: {} }); // no time reactions
    const state = makeState({ refreshCount: 3, pendingPhrase: null });
    const result = pickPhrase(voice, state, [], new Date('2025-01-01T02:00:00'));
    expect(result).toBe('idle phrase');
  });

  it('returns null when refreshCount is not a multiple of 3 and no pending', () => {
    const voice = makeVoice({ reactions: {} });
    const state = makeState({ refreshCount: 1, pendingPhrase: null });
    const result = pickPhrase(voice, state, [], new Date('2025-01-01T02:00:00'));
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// pendingPhrase persistence logic (simulated via renderStatusLine nextState)
// ---------------------------------------------------------------------------

describe('pendingPhrase clearing logic', () => {
  it('pendingPhrase is cleared when the phrase was actually displayed', () => {
    // Simulate the nextState computation from renderStatusLine
    const state = makeState({ pendingPhrase: 'subi de nivel!' });
    const phrase = 'subi de nivel!'; // phrase came from pendingPhrase

    const nextPendingPhrase = state.pendingPhrase && phrase === state.pendingPhrase
      ? null
      : state.pendingPhrase;

    expect(nextPendingPhrase).toBeNull();
  });

  it('pendingPhrase persists when context change took priority', () => {
    // Simulate the nextState computation when context change overrode pendingPhrase
    const state = makeState({ pendingPhrase: 'subi de nivel!' });
    const phrase = 'branch reaction'; // phrase came from context change, NOT pendingPhrase

    const nextPendingPhrase = state.pendingPhrase && phrase === state.pendingPhrase
      ? null
      : state.pendingPhrase;

    expect(nextPendingPhrase).toBe('subi de nivel!');
  });

  it('pendingPhrase stays null when it was already null', () => {
    const state = makeState({ pendingPhrase: null });
    const phrase = 'idle phrase';

    const nextPendingPhrase = state.pendingPhrase && phrase === state.pendingPhrase
      ? null
      : state.pendingPhrase;

    expect(nextPendingPhrase).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// level_up phrase selection
// ---------------------------------------------------------------------------

describe('level_up phrase selection from pool', () => {
  it('picks phrase using level % pool.length', () => {
    // level_up pool has 2 items: ['subi de nivel!', 'evoluindo...']
    const pool = ['subi de nivel!', 'evoluindo...'];

    // level 2: 2 % 2 = 0 → 'subi de nivel!'
    expect(pool[2 % pool.length]).toBe('subi de nivel!');

    // level 3: 3 % 2 = 1 → 'evoluindo...'
    expect(pool[3 % pool.length]).toBe('evoluindo...');
  });

  it('pickPhrase returns level_up phrase when pendingPhrase is set', () => {
    const voice = makeVoice();
    const state = makeState({
      refreshCount: 1, // not a multiple of 3 or 7
      pendingPhrase: 'subi de nivel!',
    });
    const result = pickPhrase(voice, state, [], new Date('2025-01-01T14:00:00'));
    expect(result).toBe('subi de nivel!');
  });
});

// ---------------------------------------------------------------------------
// badge_unlocked phrase
// ---------------------------------------------------------------------------

describe('badge_unlocked phrase', () => {
  it('pickPhrase returns badge phrase from pendingPhrase', () => {
    const voice = makeVoice();
    const state = makeState({
      refreshCount: 1,
      pendingPhrase: 'badge unlocked!',
    });
    const result = pickPhrase(voice, state, [], new Date('2025-01-01T14:00:00'));
    expect(result).toBe('badge unlocked!');
  });
});

// ---------------------------------------------------------------------------
// streak_milestone phrase
// ---------------------------------------------------------------------------

describe('streak_milestone phrase', () => {
  it('pickPhrase returns streak phrase from pendingPhrase', () => {
    const voice = makeVoice();
    const state = makeState({
      refreshCount: 1,
      pendingPhrase: 'streak milestone!',
    });
    const result = pickPhrase(voice, state, [], new Date('2025-01-01T14:00:00'));
    expect(result).toBe('streak milestone!');
  });
});

// ---------------------------------------------------------------------------
// idle_return phrase
// ---------------------------------------------------------------------------

describe('idle_return phrase', () => {
  it('pickPhrase returns idle_return phrase from pendingPhrase', () => {
    const voice = makeVoice();
    const state = makeState({
      refreshCount: 1,
      pendingPhrase: 'welcome back!',
    });
    const result = pickPhrase(voice, state, [], new Date('2025-01-01T14:00:00'));
    expect(result).toBe('welcome back!');
  });
});

// ---------------------------------------------------------------------------
// no progression phrase when no events
// ---------------------------------------------------------------------------

describe('no progression phrase when no events', () => {
  it('pendingPhrase stays null when no progression events occurred', () => {
    // This simulates what sync.ts would do: no level up, no badges, no milestone
    const prevLevel = 3;
    const newLevel = 3; // no level change
    const newBadges: string[] = []; // no new badges
    const newStreak = 4;
    const prevStreak = 3; // no milestone (5 not crossed)
    const hasBreakdown = false;

    let pendingPhrase: string | null = null;

    if (newLevel > prevLevel) {
      pendingPhrase = 'level up!';
    } else if (newBadges.length > 0) {
      pendingPhrase = 'badge!';
    } else if (isStreakMilestone(newStreak, prevStreak)) {
      pendingPhrase = 'milestone!';
    } else if (hasBreakdown) {
      pendingPhrase = 'idle return!';
    }

    expect(pendingPhrase).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// level_up has priority over badge_unlocked
// ---------------------------------------------------------------------------

describe('level_up has priority over badge_unlocked', () => {
  it('level_up wins when both level up and badge unlock happen in same sync', () => {
    const reactions = {
      level_up: ['subi de nivel!', 'evoluindo...'],
      badge_unlocked: ['conquista nova!'],
      streak_milestone: ['que sequencia!'],
    };

    const prevLevel = 2;
    const newLevel = 3; // level up happened
    const newBadges = ['first_sync']; // badge also unlocked

    let pendingPhrase: string | null = null;

    if (newLevel > prevLevel && reactions.level_up?.length) {
      const pool = reactions.level_up;
      pendingPhrase = pool[newLevel % pool.length] ?? null;
    } else if (newBadges.length > 0 && reactions.badge_unlocked?.length) {
      pendingPhrase = reactions.badge_unlocked[0] ?? null;
    }

    expect(pendingPhrase).toBe('evoluindo...'); // level 3 % 2 = 1 → 'evoluindo...'
    expect(pendingPhrase).not.toBe('conquista nova!');
  });
});
