// A single 12×5 ASCII frame with per-char 256-color map
export interface Frame {
  ascii: string[]; // exactly 5 strings, each 12 chars wide (may be padded)
  colors: (number | null)[][]; // 5 rows × 12 cols, values 0-255 or null (inherit terminal)
}

// Rotating idle phrases + conditional reactions
export interface Voice {
  personality: string; // free-form tone label (e.g. "sarcastic")
  phrases: string[]; // idle rotation pool (may be empty)
  reactions: {
    branch_changed?: string[];
    cwd_changed?: string[];
    model_changed?: string[];
    time_morning?: string[]; // 5:00-11:59
    time_afternoon?: string[]; // 12:00-17:59
    time_evening?: string[]; // 18:00-23:59
    time_night?: string[]; // 0:00-4:59
    // Progression reactions
    level_up?: string[];
    badge_unlocked?: string[];
    streak_milestone?: string[];
    idle_return?: string[];
  };
}

// A user-created buddy
export interface Buddy {
  name: string; // free-form, unique within user collection, non-empty
  eyes: string; // single char placeholder substituted into frames
  frames: Frame[]; // >= 1 frame
  voice: Voice;
}

// XP and progression state
export interface XPState {
  xp: number; // total accumulated XP
  level: number; // 1-6 (calculated from xp)
  streak: number; // consecutive weekdays with activity
  lastActiveDate: string | null; // "YYYY-MM-DD", last weekday with a session
  lastSyncedAt: string | null; // ISO timestamp of last sync
  lastProcessedCursors: Record<string, number>; // filepath → bytes read
  eventXP: number; // XP from events (additive, never overwritten by sync)
}

// Persisted app state
export interface AppState {
  activeBuddy: string | null; // name of active buddy, or null
  lastContext: {
    // last context seen, for reaction diff
    cwd: string | null;
    branch: string | null;
    model: string | null;
  };
  refreshCount: number; // monotonic counter for rotation
  xp: XPState;
  colors: { W: number; U: number; B: number; R: number; G: number };
  colorPoints: number; // unspent action points
  badges: string[]; // badge IDs (empty for now)
  pendingPhrase: string | null; // progression phrase to show once, then clear
}

// Installation record
export interface InstallState {
  installed: boolean;
  installedAt: string | null; // ISO timestamp
  claudeSettingsPath: string | null;
}

// Backup metadata
export interface BackupMeta {
  path: string;
  sha256: string;
  createdAt: string; // ISO timestamp
  kind: 'original' | 'rotating';
}
