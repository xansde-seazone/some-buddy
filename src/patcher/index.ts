export { findClaudeBinary, findBunBinary } from './binary-finder.ts';
export {
  findAllOccurrences,
  getCurrentSalt,
  verifySalt,
  isClaudeRunning,
  isNodeRuntime,
} from './salt-ops.ts';
export { patchBinary, restoreBinary } from './patch.ts';
export { runPreflight } from './preflight.ts';
