import { loadState } from '../render/state.js';
import { levelFromXP, xpProgress } from '../xp/levels.js';
import { BADGES } from '../xp/badges.js';

const BOX_INNER_WIDTH = 44;

/** Format a number with dot as thousands separator (e.g. 1240 -> '1.240') */
function formatXP(n: number): string {
  return n.toLocaleString('de-DE');
}

/** Render a content line padded to BOX_INNER_WIDTH */
function boxLine(content: string): string {
  return `│ ${content.padEnd(BOX_INNER_WIDTH)} │`;
}

/** Render the top border with a title */
function boxTop(title: string): string {
  // '┌─ <title> ─...─┐' where total width is BOX_INNER_WIDTH + 2
  const totalDashes = BOX_INNER_WIDTH + 2;
  const prefix = `─ ${title} ─`;
  const remaining = totalDashes - prefix.length;
  return `┌${prefix}${'─'.repeat(remaining)}┐`;
}

/** Render the bottom border */
function boxBottom(): string {
  return `└${'─'.repeat(BOX_INNER_WIDTH + 2)}┘`;
}

/** Render a 20-char progress bar */
function renderBar(fraction: number, isMax: boolean): string {
  if (isMax) {
    return `[${'█'.repeat(20)}] MAX`;
  }
  const filled = Math.round(fraction * 20);
  const empty = 20 - filled;
  const pct = Math.round(fraction * 100);
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${pct}%`;
}

/** Format lastSyncedAt ISO string as 'YYYY-MM-DD HH:MM' */
function formatSyncedAt(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const date = d.toISOString().slice(0, 10);
    const hhmm = d.toISOString().slice(11, 16);
    return `${date} ${hhmm}`;
  } catch {
    return '—';
  }
}

export async function cmdXP(): Promise<number> {
  const state = await loadState();
  const buddyName = state.activeBuddy ?? '(no buddy)';
  const { xp, streak, lastActiveDate, lastSyncedAt, eventXP } = state.xp;

  const levelInfo = levelFromXP(xp);
  const progress = xpProgress(xp);
  const isMax = levelInfo.nextMinXP === null;

  // Header
  console.log(boxTop(buddyName));
  console.log(boxLine(''));

  // Level + XP line
  let xpLine: string;
  if (isMax) {
    const xpStr = formatXP(xp);
    xpLine = `Lv.${levelInfo.level} ${levelInfo.name}              ${xpStr} XP ★`;
  } else {
    const currentStr = formatXP(xp);
    const nextStr = formatXP(levelInfo.nextMinXP!);
    xpLine = `Lv.${levelInfo.level} ${levelInfo.name}        ${currentStr} / ${nextStr} XP`;
  }
  console.log(boxLine(xpLine));

  // Progress bar
  const bar = renderBar(progress.fraction, isMax);
  console.log(boxLine(bar));

  console.log(boxLine(''));

  // Streak & dates
  const streakStr = streak === 1 ? `${streak} dia util` : `${streak} dias uteis`;
  console.log(boxLine(`Streak:         ${streakStr}`));
  console.log(boxLine(`Ultima sessao:  ${lastActiveDate ?? '—'}`));
  console.log(boxLine(`Ultimo sync:    ${formatSyncedAt(lastSyncedAt)}`));

  console.log(boxLine(''));

  // XP by source
  const sessionXP = xp - eventXP;
  console.log(boxLine('── XP por fonte ──'));
  console.log(boxLine(`Sessoes:  ${formatXP(sessionXP)} XP`));
  console.log(boxLine(`Eventos:  ${formatXP(eventXP)} XP`));

  console.log(boxLine(''));

  // Personality colors
  console.log(boxLine('── Personalidade ──'));
  const colorLabels: Record<string, string> = {
    W: 'Ordem    ',
    U: 'Intelecto',
    B: 'Ambicao  ',
    R: 'Impulso  ',
    G: 'Instinto ',
  };
  for (const key of ['W', 'U', 'B', 'R', 'G']) {
    const val = state.colors[key as keyof typeof state.colors] ?? 0;
    const filled = Math.min(val, 20);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    const label = colorLabels[key]!;
    console.log(boxLine(`${label} ${bar}  ${String(val).padStart(2)}`));
  }
  const pts = state.colorPoints ?? 0;
  if (pts > 0) {
    console.log(boxLine(`                        ${pts} pts livres`));
  }

  console.log(boxLine(''));

  // Badges
  const unlockedBadges = state.badges;
  const totalBadges = BADGES.length;
  const unlockedCount = unlockedBadges.length;
  console.log(boxLine(`── Badges (${unlockedCount}/${totalBadges}) ──`));

  if (unlockedCount === 0) {
    console.log(boxLine('(nenhum)'));
  } else {
    const badgeNames = unlockedBadges
      .map(id => BADGES.find(b => b.id === id))
      .filter(Boolean)
      .map(b => `✓ ${b!.name}`);

    for (let i = 0; i < badgeNames.length; i += 2) {
      const left = badgeNames[i]!.padEnd(20);
      const right = badgeNames[i + 1] ?? '';
      console.log(boxLine(`${left}${right}`));
    }
  }

  console.log(boxLine(''));

  // Footer
  console.log(boxBottom());

  return 0;
}
