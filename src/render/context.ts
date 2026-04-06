export type ParsedContext = {
  cwd: string | null;
  branch: string | null;
  model: string | null;
  modelDisplayName: string | null;
  effortLevel: string | null;
};

/**
 * Parses the JSON blob piped from Claude Code's statusLine hook.
 * Never throws — returns all-null context on any parse or access error.
 *
 * Expected shape (relevant fields only):
 *   {
 *     model: { id: string; display_name: string; effort?: string },
 *     cwd: string,
 *     worktree: { branch?: string },
 *   }
 */
export function parseClaudeInput(raw: string): ParsedContext {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { cwd: null, branch: null, model: null, modelDisplayName: null, effortLevel: null };
    }

    const obj = parsed as Record<string, unknown>;

    const cwd = typeof obj['cwd'] === 'string' ? obj['cwd'] : null;

    let model: string | null = null;
    let modelDisplayName: string | null = null;
    let effortLevel: string | null = null;

    const modelField = obj['model'];
    if (modelField && typeof modelField === 'object') {
      const m = modelField as Record<string, unknown>;
      if (typeof m['id'] === 'string') model = m['id'];
      if (typeof m['display_name'] === 'string') modelDisplayName = m['display_name'];

      // Try to extract effort level from known field names
      if (typeof m['effort'] === 'string') {
        effortLevel = m['effort'];
      }
    }

    // Also check top-level effort / thinkingLevel fields
    if (effortLevel === null) {
      if (typeof obj['effort'] === 'string') {
        effortLevel = obj['effort'];
      } else if (typeof obj['thinkingLevel'] === 'string') {
        effortLevel = obj['thinkingLevel'];
      }
    }

    let branch: string | null = null;
    const worktree = obj['worktree'];
    if (worktree && typeof worktree === 'object') {
      const w = worktree as Record<string, unknown>;
      if (typeof w['branch'] === 'string') branch = w['branch'];
    }

    return { cwd, branch, model, modelDisplayName, effortLevel };
  } catch {
    return { cwd: null, branch: null, model: null, modelDisplayName: null, effortLevel: null };
  }
}

/**
 * Extracts a short, human-readable model name for display in the status line.
 *
 * Strategy:
 * 1. If displayName is present, use its first word (e.g. "Sonnet 4.6" → "Sonnet").
 * 2. If displayName is absent, extract the model family from modelId
 *    (e.g. "claude-sonnet-4-6" → "Sonnet").
 * 3. If both are null, returns "Unknown".
 */
export function shortModelName(
  displayName: string | null,
  modelId: string | null,
): string {
  if (displayName !== null && displayName.trim() !== '') {
    const firstWord = displayName.trim().split(/\s+/)[0];
    return firstWord
      ? firstWord.charAt(0).toUpperCase() + firstWord.slice(1)
      : 'Unknown';
  }

  if (modelId !== null) {
    // Parse "claude-<family>-<version>" → capitalize the family segment
    const parts = modelId.toLowerCase().split('-');
    // Find the first non-"claude" part that is alphabetic (the model family name)
    const family = parts.find((p) => p !== 'claude' && /^[a-z]/.test(p));
    if (family) {
      return family.charAt(0).toUpperCase() + family.slice(1);
    }
    // Fallback: return the id as-is if no family segment found
    return modelId;
  }

  return 'Unknown';
}
