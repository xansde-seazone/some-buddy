export interface HookEntry {
  type: 'command';
  command: string;
}

export interface HookRule {
  matcher: string;
  hooks: HookEntry[];
}

/**
 * Builds the Claude Code hooks configuration that runs `my-buddy sync`
 * on session start (UserPromptSubmit) and session end (Stop).
 *
 * @param cliPath Absolute path to the compiled cli.js file.
 */
export function buildHooksConfig(cliPath: string): Record<string, HookRule[]> {
  const syncRule: HookRule = {
    matcher: '',
    hooks: [{ type: 'command', command: `node ${cliPath} sync` }],
  };

  return {
    Stop: [syncRule],
    UserPromptSubmit: [syncRule],
  };
}

/**
 * Merges our hooks into any existing hooks the user may already have.
 * Preserves all existing rules; deduplicates by command string so that
 * repeated installs do not accumulate duplicate entries.
 */
export function mergeHooks(
  existing: Record<string, HookRule[]> | undefined,
  ours: Record<string, HookRule[]>,
): Record<string, HookRule[]> {
  const result: Record<string, HookRule[]> = { ...(existing ?? {}) };

  for (const [event, ourRules] of Object.entries(ours)) {
    const existingRules: HookRule[] = result[event] ? [...result[event]!] : [];

    for (const ourRule of ourRules) {
      // Deduplicate: skip if any existing rule already has the same command
      const alreadyPresent = existingRules.some((r) =>
        r.hooks.some((h) => ourRule.hooks.some((oh) => oh.command === h.command)),
      );
      if (!alreadyPresent) {
        existingRules.push(ourRule);
      }
    }

    result[event] = existingRules;
  }

  return result;
}
