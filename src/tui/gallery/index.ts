import { ISSUE_URL } from '@/constants.js';
import { canUseBuilder } from '../builder/index.ts';
import { BORDER_COLOR, DIM_COLOR, FOCUS_BORDER } from '../builder/colors.ts';
import { createAnimator } from '../animator.ts';
import { DEFAULT_PROFILE, type GalleryEntry, type GalleryState } from './state.ts';

export type GalleryResult = { action: 'apply'; profileName: string } | { action: 'cancel' };

export async function runGalleryTUI(
  entries: GalleryEntry[],
  activeIndex: number,
): Promise<GalleryResult> {
  const otui = await import('@opentui/core');
  const { createCliRenderer, Box, Text } = otui;
  type TextRenderableType = InstanceType<typeof otui.TextRenderable>;
  const { createProfileListPanel } = await import('./profile-list-panel.ts');
  const { createGalleryPreviewPanel } = await import('./profile-preview-panel.ts');
  const { setupGalleryKeyboard } = await import('./keyboard.ts');
  const { selectedEntry } = await import('./state.ts');

  let renderer: Awaited<ReturnType<typeof createCliRenderer>> | null = null;

  try {
    renderer = await createCliRenderer({
      exitOnCtrlC: false,
      screenMode: 'alternate-screen',
    });

    const r = renderer;
    const state: GalleryState = { entries, selectedIndex: activeIndex };

    return await new Promise<GalleryResult>((resolve) => {
      let resolved = false;
      const animator = createAnimator(500);
      let unsubAnimation: (() => void) | null = null;

      function finish(result: GalleryResult): void {
        if (resolved) return;
        resolved = true;
        unsubAnimation?.();
        animator.stop();
        keyboard.destroy();
        r.destroy();
        renderer = null;
        resolve(result);
      }

      // Root layout
      const rootBox = Box(
        {
          id: 'root',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          borderStyle: 'rounded',
          border: true,
          borderColor: BORDER_COLOR,
          title: ' any-buddy buddies ',
          titleAlignment: 'center',
          padding: 0,
        },
        Box({
          id: 'main-row',
          flexDirection: 'row',
          flexGrow: 1,
          width: '100%',
        }),
        Text({
          id: 'help-bar',
          content: '  ↑↓ navigate   Enter apply   Esc exit',
          fg: DIM_COLOR,
          height: 1,
          flexShrink: 0,
          paddingLeft: 1,
        }),
      );

      r.root.add(rootBox);
      const mainRow = r.root.findDescendantById('main-row');
      const helpBar = r.root.findDescendantById('help-bar') as TextRenderableType | null;
      if (!mainRow) {
        finish({ action: 'cancel' });
        return;
      }

      // Profile list (left)
      const profileList = createProfileListPanel(mainRow);

      // Preview (right)
      const preview = createGalleryPreviewPanel(mainRow);

      // Initial render + start animation
      profileList.update(state);
      preview.update(selectedEntry(state));
      unsubAnimation = animator.subscribe((frame) => preview.tick(frame));

      const HELP_DEFAULT = '  ↑↓ navigate   Enter apply   Esc exit';
      const HELP_CONFIRM = '  Enter/Y confirm   Esc/N go back';

      // Keyboard
      const keyboard = setupGalleryKeyboard(r.keyInput, {
        onNavigate: (direction) => {
          const len = state.entries.length;
          state.selectedIndex =
            direction === 'next'
              ? (state.selectedIndex + 1) % len
              : (state.selectedIndex - 1 + len) % len;
          profileList.update(state);
          preview.update(selectedEntry(state));
        },
        onApply: () => {
          const entry = selectedEntry(state);
          if (entry.isDefault) {
            finish({ action: 'apply', profileName: DEFAULT_PROFILE });
          } else {
            finish({ action: 'apply', profileName: entry.name });
          }
        },
        onCancel: () => {
          finish({ action: 'cancel' });
        },
        onEnterConfirmMode: () => {
          if (helpBar) {
            helpBar.content = HELP_CONFIRM;
            helpBar.fg = FOCUS_BORDER;
          }
        },
        onExitConfirmMode: () => {
          if (helpBar) {
            helpBar.content = HELP_DEFAULT;
            helpBar.fg = DIM_COLOR;
          }
        },
      });

      // Ctrl+C fallback
      r.keyInput.on('keypress', (key) => {
        if (key.ctrl && key.name === 'c') {
          finish({ action: 'cancel' });
        }
      });

      r.auto();
    });
  } catch (err) {
    if (renderer) {
      try {
        renderer.destroy();
      } catch {
        // ignore cleanup errors
      }
    }
    console.error(`  Gallery error: ${(err as Error).message}`);
    console.error(`  If this persists, please report at: ${ISSUE_URL}`);
    return { action: 'cancel' };
  }
}

export { canUseBuilder as canUseGalleryTUI };
