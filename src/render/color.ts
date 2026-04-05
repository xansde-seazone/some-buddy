import type { Frame } from '../types.js';

/** Returns the ANSI 256-color foreground escape for the given color code. */
export function fg256(code: number): string {
  return `\x1b[38;5;${code}m`;
}

/** Returns the ANSI SGR reset escape. */
export function reset(): string {
  return '\x1b[0m';
}

/**
 * Colorizes each row of a Frame, coalescing runs of the same color to minimize
 * SGR emissions. Emits reset at end of line only when colors were used.
 * Null color means terminal default (reset before emitting that cell if needed).
 */
export function colorizeFrame(frame: Frame): string[] {
  const rows: string[] = [];

  for (let r = 0; r < 5; r++) {
    const asciiRow: string = frame.ascii[r] ?? '';
    const colorRow: (number | null)[] = frame.colors[r] ?? [];
    const len = Math.min(asciiRow.length, 12);

    let line = '';
    let currentColor: number | null | undefined = undefined; // undefined = no SGR emitted yet
    let usedColors = false;

    for (let c = 0; c < len; c++) {
      const cellColor: number | null = colorRow[c] ?? null;
      const ch = asciiRow[c] ?? ' ';

      if (cellColor !== currentColor) {
        if (cellColor === null) {
          line += reset();
        } else {
          line += fg256(cellColor);
          usedColors = true;
        }
        currentColor = cellColor;
      }

      line += ch;
    }

    if (usedColors) {
      line += reset();
    }

    rows.push(line);
  }

  return rows;
}
