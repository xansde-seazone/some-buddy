export { savePetConfig, loadPetConfig } from './pet-config.ts';
export {
  getClaudeUserId,
  getCompanionName,
  renameCompanion,
  getCompanionPersonality,
  setCompanionPersonality,
  deleteCompanion,
} from './claude-config.ts';
export {
  getClaudeSettings,
  saveClaudeSettings,
  isHookInstalled,
  installHook,
  removeHook,
} from './hooks.ts';
