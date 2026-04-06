const SEPARATOR = '  ';
const BAR_WIDTH = 8;

const FILL_CHAR = '\u2588'; // █  full block
const EMPTY_CHAR = '\u2591'; // ░  light shade

/**
 * Renders an XP progress bar of fixed width BAR_WIDTH.
 * fraction is a value in [0, 1].
 * Examples:
 *   renderXPBar(0)   → "[░░░░░░░░]"
 *   renderXPBar(0.5) → "[████░░░░]"
 *   renderXPBar(1)   → "[████████]"
 */
export function renderXPBar(fraction: number): string {
  const filled = Math.round(Math.max(0, Math.min(1, fraction)) * BAR_WIDTH);
  const bar = FILL_CHAR.repeat(filled) + EMPTY_CHAR.repeat(BAR_WIDTH - filled);
  return `[${bar}]`;
}

/**
 * Builds the 5-string right column for the statusLine layout.
 *
 * Layout:
 *   [0] buddyName
 *   [1] "Lv.<level> <name>"
 *   [2] "<phrase>" in double quotes, or '' if phrase is null
 *   [3] '' (empty — visual breathing room)
 *   [4] "[<modelName>] <xpBar> Nvl <level>"
 */
export function buildRightColumn(
  buddyName: string,
  levelInfo: { level: number; name: string },
  phrase: string | null,
  modelName: string,
  xpFraction: number,
): string[] {
  const xpBar = renderXPBar(xpFraction);
  const modelTag = `[${modelName}]`;
  const statusBar = `${modelTag} ${xpBar} Nvl ${levelInfo.level}`;

  return [
    buddyName,
    `Lv.${levelInfo.level} ${levelInfo.name}`,
    phrase !== null ? `"${phrase}"` : '',
    '',
    statusBar,
  ];
}

/**
 * Merges two parallel arrays of exactly 5 strings:
 * - asciiLines: the colorized 12-char ASCII art per line
 * - rightColumn: the right-side text per line (may be empty string)
 *
 * For each line:
 *   - If rightColumn[i] is non-empty → asciiLine + SEPARATOR + rightColumn[i]
 *   - Otherwise                      → asciiLine (no trailing separator)
 */
export function mergeColumns(asciiLines: string[], rightColumn: string[]): string[] {
  return asciiLines.map((ascii, i) => {
    const right = rightColumn[i] ?? '';
    if (right === '') {
      return ascii;
    }
    return ascii + SEPARATOR + right;
  });
}
