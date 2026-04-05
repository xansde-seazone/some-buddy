import type { Buddy, Frame } from '../types.js';

const FRAME_ROWS = 5;
const FRAME_COLS = 12;
const EYE_PLACEHOLDER = '·';

/**
 * Returns a new Frame with the eye placeholder char replaced by eyeChar in
 * the ascii rows. Colors are copied by reference (not mutated).
 */
export function substituteEyes(frame: Frame, eyeChar: string): Frame {
  const safeEye = eyeChar[0] ?? EYE_PLACEHOLDER;
  return {
    ascii: frame.ascii.map((row) => row.split(EYE_PLACEHOLDER).join(safeEye)),
    colors: frame.colors,
  };
}

/**
 * Selects a frame from the buddy's animation by tick, cycling via modulo.
 * Defensive: returns first frame if frames is empty or tick is invalid.
 */
export function pickFrame(buddy: Buddy, tick: number): Frame {
  const frames = buddy.frames;
  if (!frames || frames.length === 0) {
    return { ascii: Array(FRAME_ROWS).fill(' '.repeat(FRAME_COLS)) as string[], colors: [] };
  }
  const idx = Math.abs(Math.floor(tick)) % frames.length;
  return frames[idx] as Frame;
}

/**
 * Validates a Frame. Returns null if valid, or an error string describing the
 * first problem found. Missing color entries are treated as null (valid).
 */
export function validateFrame(frame: Frame): string | null {
  if (!frame || typeof frame !== 'object') {
    return 'frame must be an object';
  }
  if (!Array.isArray(frame.ascii)) {
    return 'frame.ascii must be an array';
  }
  if (frame.ascii.length !== FRAME_ROWS) {
    return `frame.ascii must have exactly ${FRAME_ROWS} rows, got ${frame.ascii.length}`;
  }
  for (let r = 0; r < FRAME_ROWS; r++) {
    const row = frame.ascii[r];
    if (typeof row !== 'string') {
      return `frame.ascii[${r}] must be a string`;
    }
  }
  if (!Array.isArray(frame.colors)) {
    return 'frame.colors must be an array';
  }
  for (let r = 0; r < frame.colors.length; r++) {
    const colorRow = frame.colors[r];
    if (!Array.isArray(colorRow)) {
      return `frame.colors[${r}] must be an array`;
    }
    for (let c = 0; c < colorRow.length; c++) {
      const val = colorRow[c];
      if (
        val !== null &&
        (typeof val !== 'number' || val < 0 || val > 255 || !Number.isInteger(val))
      ) {
        return `frame.colors[${r}][${c}] must be null or integer 0-255`;
      }
    }
    if (colorRow.length > FRAME_COLS) {
      return `frame.colors[${r}] has ${colorRow.length} entries, max is ${FRAME_COLS}`;
    }
  }
  if (frame.colors.length > FRAME_ROWS) {
    return `frame.colors has ${frame.colors.length} rows, max is ${FRAME_ROWS}`;
  }
  return null;
}
