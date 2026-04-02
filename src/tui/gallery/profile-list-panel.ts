import type { BoxRenderable, TextRenderable } from '@opentui/core';
import { Box, Text } from '@opentui/core';
import type { Renderable as OTUIRenderable } from '@opentui/core';
import { RARITY_STARS } from '@/constants.js';
import {
  RARITY_HEX,
  BORDER_COLOR,
  HIGHLIGHT_BG,
  HIGHLIGHT_FG,
  DIM_COLOR,
} from '../builder/colors.ts';
import type { GalleryState, GalleryEntry } from './state.ts';

const ENTRY_HEIGHT = 2;
const PANEL_WIDTH = 30;
// Inner width: panel - borders(2) - paddingLeft(1) - paddingRight(1)
const INNER_WIDTH = PANEL_WIDTH - 4;

export interface ProfileListPanel {
  container: OTUIRenderable;
  update: (state: GalleryState) => void;
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function formatEntry(entry: GalleryEntry, isSelected: boolean): string {
  const marker = isSelected ? '▶' : ' ';
  const dot = entry.isActive ? '●' : '○';
  const name = entry.isDefault ? 'Original' : entry.name;
  const date = formatDate(entry.profile?.createdAt);

  // Line 1: name left-aligned, date right-aligned
  const prefix = `${marker} ${dot} `;
  const nameArea = INNER_WIDTH - prefix.length;
  const line1 = date
    ? `${prefix}${name.padEnd(nameArea - date.length)}${date}`
    : `${prefix}${name}`;

  // Line 2: species + rarity stars
  const stars = RARITY_STARS[entry.bones.rarity];
  const line2 = `    ${entry.bones.species} ${stars}`;

  return `${line1}\n${line2}`;
}

export function createProfileListPanel(parent: OTUIRenderable): ProfileListPanel {
  const entryTexts: TextRenderable[] = [];
  let contentRenderable: BoxRenderable | null = null;
  let scrollOffset = 0;

  const container = Box(
    {
      id: 'profile-list',
      borderStyle: 'rounded',
      border: true,
      borderColor: BORDER_COLOR,
      title: ' Buddies ',
      titleAlignment: 'center',
      flexDirection: 'column',
      width: 30,
      padding: 0,
      paddingLeft: 1,
      paddingRight: 1,
      paddingTop: 0,
      overflow: 'hidden',
      flexShrink: 0,
    },
    Box({
      id: 'profile-list-content',
      flexDirection: 'column',
      position: 'relative',
      top: 0,
      gap: 0,
    }),
  );

  parent.add(container);

  const containerRenderable = parent.findDescendantById('profile-list') as BoxRenderable;
  contentRenderable = containerRenderable?.findDescendantById(
    'profile-list-content',
  ) as BoxRenderable;

  function update(state: GalleryState): void {
    if (!contentRenderable) return;

    // Rebuild entry texts if count changed
    while (entryTexts.length < state.entries.length) {
      const idx = entryTexts.length;
      const textNode = Text({
        id: `pl-entry-${idx}`,
        content: '',
        height: ENTRY_HEIGHT,
        width: '100%',
      });
      contentRenderable.add(textNode);
      const resolved = contentRenderable.findDescendantById(`pl-entry-${idx}`) as TextRenderable;
      if (resolved) entryTexts.push(resolved);
    }

    // Update each entry
    for (let i = 0; i < state.entries.length; i++) {
      const entry = state.entries[i];
      const isSelected = i === state.selectedIndex;
      const text = entryTexts[i];
      if (!text) continue;

      text.content = formatEntry(entry, isSelected);

      if (isSelected) {
        text.bg = HIGHLIGHT_BG;
        text.fg = HIGHLIGHT_FG;
      } else {
        text.bg = undefined as unknown as string;
        text.fg = entry.isActive ? RARITY_HEX[entry.bones.rarity] : DIM_COLOR;
      }
    }

    // Scroll to keep selected entry visible
    scrollToIndex(state.selectedIndex, state.entries.length);
  }

  function scrollToIndex(index: number, total: number): void {
    if (!contentRenderable) return;
    const CHROME_HEIGHT = 4;
    const viewportHeight = (process.stdout.rows ?? 40) - CHROME_HEIGHT;
    const totalHeight = total * ENTRY_HEIGHT;

    if (totalHeight <= viewportHeight) {
      scrollOffset = 0;
      contentRenderable.top = 0;
      return;
    }

    const targetY = index * ENTRY_HEIGHT;
    if (targetY < scrollOffset) {
      scrollOffset = targetY;
    } else if (targetY + ENTRY_HEIGHT > scrollOffset + viewportHeight) {
      scrollOffset = targetY + ENTRY_HEIGHT - viewportHeight;
    }

    const maxScroll = Math.max(0, totalHeight - viewportHeight);
    scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
    contentRenderable.top = -scrollOffset;
  }

  return { container: containerRenderable ?? (container as unknown as OTUIRenderable), update };
}
