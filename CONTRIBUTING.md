# Contributing to any-buddy

Thanks for wanting to contribute! This project is licensed under [WTFPL](LICENSE) -- do what you want.

## Getting Started

```bash
git clone https://github.com/cpaczek/any-buddy.git
cd any-buddy
pnpm install
pnpm run build
```

## Development

The project is written in TypeScript and compiles to ESM JavaScript.

```bash
pnpm run build        # Compile TypeScript + resolve path aliases
pnpm run typecheck    # Type-check without emitting
pnpm run test         # Run all tests
pnpm run test:watch   # Run tests in watch mode
pnpm run lint         # ESLint
pnpm run lint:fix     # ESLint with auto-fix
pnpm run format       # Prettier auto-format
pnpm run format:check # Check formatting
```

### Project Structure

```
src/
  cli.ts                  # Entry point
  types.ts                # Shared type definitions
  constants.ts            # Species, rarities, eyes, hats, stats
  personalities.ts        # Default personality strings
  generation/             # Hash + RNG + pet trait generation
  sprites/                # ASCII art rendering
  config/                 # Config file management (pet, claude, hooks)
  patcher/                # Binary finding, salt ops, patching, preflight
  finder/                 # Multi-worker salt brute-force search
  tui/                    # Terminal UI (formatting, prompts, commands)
tests/                    # Vitest test files (mirrors src/ structure)
```

### Path Aliases

Cross-module imports use `@/` aliases instead of relative paths:

```typescript
import { roll } from '@/generation/roll.js';
import { SPECIES } from '@/constants.js';
```

Same-directory imports use relative `.ts` paths (handled by `rewriteRelativeImportExtensions`):

```typescript
export { roll } from './roll.ts';
```

### Pre-commit Hooks

Husky + lint-staged run automatically on commit:
- ESLint with auto-fix
- Prettier formatting

### Running the CLI Locally

```bash
pnpm run build
node dist/cli.js --help
node dist/cli.js current
```

Or link globally:

```bash
pnpm link --global
any-buddy --help
```

## Testing

Tests use [Vitest](https://vitest.dev/) and are in the `tests/` directory.

```bash
pnpm run test              # Run once
pnpm run test:watch        # Watch mode
pnpm run test:coverage     # With coverage report
```

The test suite covers:
- **generation/** -- Hash determinism, RNG, trait rolling
- **sprites/** -- ASCII rendering, eye substitution, hat placement
- **patcher/** -- Buffer operations, salt detection, runtime detection
- **finder/** -- Probability estimation, worker subprocess integration
- **config/** -- Config round-trips, hook install/remove
- **tui/** -- Formatting, flag validation
- **cli** -- Smoke tests

## CI/CD

GitHub Actions runs on every push and PR:

- **Quality gate**: lint, format check, type check, build (Ubuntu, Node 22)
- **Test matrix**: 6 jobs (Linux/macOS/Windows x Node 20/22) with Bun installed
- **Release**: Creating a GitHub release auto-publishes to npm

## Submitting Changes

1. Fork the repo
2. Create a branch (`git checkout -b my-feature`)
3. Make your changes
4. Ensure `pnpm run build && pnpm run test && pnpm run lint` pass
5. Commit and push
6. Open a PR

No formal style guide beyond what the linter and formatter enforce. Keep it simple.
