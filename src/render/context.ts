type ParsedContext = { cwd: string | null; branch: string | null; model: string | null };

/**
 * Parses the JSON blob piped from Claude Code's statusLine hook.
 * Never throws — returns all-null context on any parse or access error.
 *
 * Expected shape (relevant fields only):
 *   { model: { id: string; display_name: string }, cwd: string, worktree: { branch?: string } }
 */
export function parseClaudeInput(raw: string): ParsedContext {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { cwd: null, branch: null, model: null };
    }

    const obj = parsed as Record<string, unknown>;

    const cwd = typeof obj['cwd'] === 'string' ? obj['cwd'] : null;

    let model: string | null = null;
    const modelField = obj['model'];
    if (modelField && typeof modelField === 'object') {
      const m = modelField as Record<string, unknown>;
      if (typeof m['id'] === 'string') model = m['id'];
    }

    let branch: string | null = null;
    const worktree = obj['worktree'];
    if (worktree && typeof worktree === 'object') {
      const w = worktree as Record<string, unknown>;
      if (typeof w['branch'] === 'string') branch = w['branch'];
    }

    return { cwd, branch, model };
  } catch {
    return { cwd: null, branch: null, model: null };
  }
}
