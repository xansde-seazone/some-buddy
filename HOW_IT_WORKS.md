# How any-buddy Works

## The Companion System

Claude Code's companion system generates your pet's visual traits (species, rarity, eyes, hat) by hashing your user ID with a salt string (`friend-2026-401`), then feeding that hash into a deterministic PRNG (Mulberry32). The result is always the same pet for the same user -- it's recalculated on every launch, so you can't override it through config files.

## What any-buddy Does

1. **You pick** your desired species, rarity, eyes, and hat through an interactive TUI
2. **Brute-force search** finds a replacement salt string that produces your chosen pet when combined with your real user ID (simple searches take milliseconds; shiny/legendary/custom stats can take minutes)
3. **Binary patch** replaces the salt in the Claude Code binary using an atomic rename, with a backup created first
4. **Auto-repair hook** (optional) installs a `SessionStart` hook in `~/.claude/settings.json` that re-applies the patch after Claude Code updates

## Hash Functions

Claude Code uses different hash functions depending on how it was installed:

| Install Method | Runtime | Hash Function |
|---------------|---------|---------------|
| Compiled binary (Linux/macOS) | Bun | `Bun.hash` (wyhash) |
| npm install (Windows) | Node.js | FNV-1a |

any-buddy detects which runtime your Claude Code uses and matches the correct hash function automatically.

## The Binary Patch

Claude Code is a compiled Bun binary (ELF on Linux, Mach-O on macOS) or a JS bundle (`cli.js` on Windows via npm). The salt string `"friend-2026-401"` appears 3 times in the compiled binary (Linux/macOS) and once in the JS bundle (Windows).

The patch process:

1. Reads the binary into a buffer
2. Finds all occurrences of the old salt
3. Replaces each with the new salt (always exactly 15 characters -- same length, no byte offset shifts)
4. Writes to a temp file, then atomically renames it over the original
5. Verifies by re-reading
6. On macOS, re-signs the binary with an ad-hoc signature (`codesign --force --sign -`)

The atomic rename (`rename()` syscall) is safe even while Claude Code is running -- the OS keeps the old inode open for any running process. The new binary takes effect on next launch.

A backup is always created at `<binary-path>.anybuddy-bak` before the first patch.

## The Salt Search

Finding a salt that produces your desired pet is a brute-force search over random 15-character strings. The search runs in parallel across up to 8 CPU cores, with each worker:

1. Generating a random salt
2. Hashing `userId + salt`
3. Seeding a Mulberry32 PRNG with the hash
4. Rolling traits in order (rarity, species, eye, hat, shiny, stats)
5. Breaking early on the first mismatch (most iterations bail after checking rarity)

Expected attempts depend on trait rarity:

| Target | Expected Attempts | Typical Time |
|--------|------------------|--------------|
| Common duck | ~180 | <1ms |
| Rare dragon with hat | ~8,640 | ~10ms |
| Legendary + specific hat | ~86,400 | ~100ms |
| Legendary + shiny | ~8,640,000 | ~10s |
| Legendary + shiny + peak + dump | ~172,800,000 | ~3min |

## The Auto-Patch Hook

When installed, adds this to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "any-buddy apply --silent"
          }
        ]
      }
    ]
  }
}
```

On every Claude Code session start, this runs `apply --silent` which:

1. Reads your saved salt from `~/.claude-code-any-buddy.json`
2. Checks if the current binary already has the correct salt (fast `Buffer.indexOf`)
3. If not (Claude updated), re-patches
4. Silent mode: produces no output unless a patch was actually applied

The hook adds negligible startup time (~50ms) when no patch is needed. It defaults to **No** during setup -- you'll be asked.

## Files

| File | Purpose |
|------|---------|
| `~/.claude.json` | Read-only -- your user ID is read from here |
| `~/.claude-code-any-buddy.json` | Stores your chosen salt and pet config |
| `~/.claude/settings.json` | SessionStart hook is added here (optional) |
| `<binary>.anybuddy-bak` | Backup of the original binary |
