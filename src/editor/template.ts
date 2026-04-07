import type { Buddy } from '../types.js';

export function buildEditorHTML(buddy: Buddy): string {
  const buddyJsonB64 = Buffer.from(JSON.stringify(buddy)).toString('base64');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>my-buddy editor — ${escapeHtml(buddy.name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      background: #1a1a2e;
      color: #e0e0e0;
      min-height: 100vh;
      padding: 2rem;
    }
    h1 {
      font-size: 1.5rem;
      color: #a78bfa;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: #6b7280;
      font-size: 0.85rem;
      margin-bottom: 1.5rem;
    }

    /* ── Main layout ─────────────────────────────────── */
    .editor-layout {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      max-width: 960px;
    }
    .top-row {
      display: flex;
      gap: 1.5rem;
      align-items: flex-start;
    }

    /* ── Frame tabs ──────────────────────────────────── */
    .frame-bar {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
      margin-bottom: 0.4rem;
    }
    .frame-tab {
      display: flex;
      align-items: center;
      gap: 4px;
      background: #1e1e3a;
      border: 1px solid #2d2d4a;
      border-radius: 5px 5px 0 0;
      padding: 3px 8px 3px 10px;
      font-family: inherit;
      font-size: 0.78rem;
      color: #9ca3af;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      user-select: none;
    }
    .frame-tab:hover { background: #2d2d4a; color: #e0e0e0; }
    .frame-tab.active {
      background: #3b2f6e;
      border-color: #a78bfa;
      color: #c4b5fd;
    }
    .frame-tab .tab-delete {
      background: none;
      border: none;
      padding: 0 0 0 2px;
      font-size: 0.7rem;
      color: #6b7280;
      cursor: pointer;
      line-height: 1;
      border-radius: 2px;
      transition: color 0.1s;
    }
    .frame-tab .tab-delete:hover { color: #f87171; background: none; }
    .frame-add-btn {
      background: #1e1e3a;
      border: 1px dashed #4b5563;
      border-radius: 5px;
      color: #6b7280;
      font-size: 1rem;
      width: 26px;
      height: 26px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
    }
    .frame-add-btn:hover { border-color: #a78bfa; color: #a78bfa; background: #1e1e3a; }

    /* ── Onion skin selector ─────────────────────────── */
    .onion-control {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.78rem;
      color: #6b7280;
      margin-left: auto;
    }
    .onion-control select {
      background: #1e1e3a;
      border: 1px solid #2d2d4a;
      border-radius: 4px;
      color: #9ca3af;
      font-family: inherit;
      font-size: 0.78rem;
      padding: 2px 6px;
      cursor: pointer;
    }
    .onion-control select:focus { outline: none; border-color: #a78bfa; }

    /* ── Grid ────────────────────────────────────────── */
    .grid-section { display: flex; flex-direction: column; gap: 0.25rem; }
    .section-label {
      font-size: 0.75rem;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    #ascii-grid {
      display: grid;
      grid-template-columns: repeat(12, 28px);
      grid-template-rows: repeat(5, 28px);
      gap: 2px;
      background: #0f0f23;
      border: 1px solid #2d2d4a;
      border-radius: 6px;
      padding: 6px;
      user-select: none;
    }
    .cell {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      font-family: 'Courier New', Courier, monospace;
      font-size: 15px;
      line-height: 1;
      border: 1px solid #2d2d4a;
      border-radius: 2px;
      cursor: pointer;
      color: #e0e0e0;
      background: #0f0f23;
      transition: border-color 0.1s;
      overflow: hidden;
    }
    .cell:hover { border-color: #4b5563; }
    .cell.selected { border-color: #a78bfa !important; background: #1e1b3a; }
    .cell.drag-over { border-color: #7c3aed; background: #1a1535; }
    /* Eye placeholder cells */
    .cell.eye-placeholder {
      border: 1px dashed #06b6d4 !important;
    }
    /* Onion skin overlay inside cell */
    .cell .onion-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Courier New', Courier, monospace;
      font-size: 15px;
      pointer-events: none;
      opacity: 0.28;
      color: #fb923c;
      z-index: 2;
    }

    /* ── Eyes editor ─────────────────────────────────── */
    .eyes-section {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .eyes-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    #eyes-input {
      width: 52px;
      background: #0f0f23;
      border: 1px solid #2d2d4a;
      border-radius: 4px;
      color: #22d3ee;
      font-family: 'Courier New', Courier, monospace;
      font-size: 1rem;
      padding: 3px 7px;
      text-align: center;
    }
    #eyes-input:focus { outline: none; border-color: #06b6d4; }
    .eyes-mode-badge {
      font-size: 0.72rem;
      padding: 2px 6px;
      border-radius: 10px;
      background: #0e4a52;
      color: #67e8f9;
      border: 1px solid #0891b2;
    }

    /* ── Right column (preview + eyes) ──────────────── */
    .right-col {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* ── Preview ─────────────────────────────────────── */
    .preview-section { display: flex; flex-direction: column; gap: 0.5rem; }
    .preview-label-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    #preview-frame-badge {
      font-size: 0.7rem;
      color: #6b7280;
      background: #1e1e3a;
      border: 1px solid #2d2d4a;
      border-radius: 8px;
      padding: 1px 8px;
    }
    #preview-box {
      background: #0f0f23;
      border: 1px solid #2d2d4a;
      border-radius: 6px;
      padding: 10px 14px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 15px;
      line-height: 1.6;
      min-width: 200px;
      white-space: pre;
    }
    #preview-box span { display: inline; }

    /* ── Color Palette ───────────────────────────────── */
    .palette-section { display: flex; flex-direction: column; gap: 0.5rem; }
    .palette-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    #color-palette {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .palette-row { display: flex; gap: 2px; }
    .color-swatch {
      width: 16px;
      height: 16px;
      border-radius: 2px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: border-color 0.1s, transform 0.1s;
      flex-shrink: 0;
    }
    .color-swatch:hover { transform: scale(1.25); z-index: 1; position: relative; }
    .color-swatch.active { border-color: #fff !important; }
    .active-color-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: #9ca3af;
    }
    #active-color-box {
      width: 20px;
      height: 20px;
      border-radius: 3px;
      border: 1px solid #4b5563;
      background: transparent;
    }

    /* ── Buttons ─────────────────────────────────────── */
    button {
      background: #7c3aed;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 0.5rem 1.2rem;
      font-family: inherit;
      font-size: 0.9rem;
      cursor: pointer;
      transition: background 0.2s;
      white-space: nowrap;
    }
    button:hover { background: #6d28d9; }
    button:disabled { background: #374151; cursor: not-allowed; }
    button.secondary {
      background: #374151;
    }
    button.secondary:hover { background: #4b5563; }
    button.danger {
      background: #6b1a1a;
    }
    button.danger:hover { background: #7f1d1d; }

    /* ── Actions bar ─────────────────────────────────── */
    .actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    #status {
      font-size: 0.85rem;
      padding: 0.35rem 0.75rem;
      border-radius: 4px;
      display: none;
    }
    #status.success {
      display: inline-block;
      background: #064e3b;
      color: #6ee7b7;
    }
    #status.error {
      display: inline-block;
      background: #7f1d1d;
      color: #fca5a5;
    }
    #status.info {
      display: inline-block;
      background: #1e3a5f;
      color: #93c5fd;
    }

    /* ── Character Map ───────────────────────────────── */
    #charmap-panel {
      display: none;
      flex-direction: column;
      gap: 0.5rem;
    }
    #charmap-panel.open { display: flex; }
    #charmap-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
      background: #0f0f23;
      border: 1px solid #2d2d4a;
      border-radius: 6px;
      padding: 8px;
      max-width: 700px;
    }
    .charmap-btn {
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      background: #1a1a2e;
      color: #e0e0e0;
      border: 1px solid #2d2d4a;
      border-radius: 3px;
      cursor: pointer;
      padding: 0;
      transition: background 0.1s, border-color 0.1s;
    }
    .charmap-btn:hover { background: #2d2d4a; border-color: #a78bfa; }

    /* ── Voice Editor ───────────────────────────────── */
    .voice-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 700px;
    }
    .voice-field {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .voice-field label, .voice-reactions label {
      font-size: 0.8rem;
      color: #9ca3af;
    }
    .voice-field input[type="text"] {
      background: #0f0f23;
      color: #e0e0e0;
      border: 1px solid #374151;
      border-radius: 4px;
      padding: 0.4rem 0.6rem;
      font-family: inherit;
      font-size: 0.85rem;
      outline: none;
      max-width: 400px;
    }
    .voice-field input[type="text"]:focus {
      border-color: #a78bfa;
    }
    .phrase-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .phrase-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .phrase-item input {
      flex: 1;
      background: #0f0f23;
      color: #e0e0e0;
      border: 1px solid #374151;
      border-radius: 4px;
      padding: 0.35rem 0.5rem;
      font-family: inherit;
      font-size: 0.8rem;
      outline: none;
      max-width: 400px;
    }
    .phrase-item input:focus { border-color: #a78bfa; }
    .phrase-item .remove-btn {
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      font-size: 1rem;
      padding: 0 4px;
      line-height: 1;
    }
    .phrase-item .remove-btn:hover { color: #ef4444; }
    button.small {
      padding: 0.3rem 0.8rem;
      font-size: 0.8rem;
    }
    .voice-reactions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .reaction-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-left: 0.5rem;
      border-left: 2px solid #2d2d4a;
    }
    .reaction-group-label {
      font-size: 0.75rem;
      color: #6b7280;
      font-style: italic;
    }

    /* ── Keyboard hint ───────────────────────────────── */
    .hint {
      color: #4b5563;
      font-size: 0.75rem;
    }
  </style>
</head>
<body>
  <h1>my-buddy editor</h1>
  <p class="subtitle">Editing: <strong>${escapeHtml(buddy.name)}</strong></p>

  <div class="editor-layout">

    <!-- Frame tab bar + onion skin -->
    <div class="frame-bar" id="frame-bar">
      <!-- tabs injected by JS -->
      <button class="frame-add-btn" id="frame-add-btn" title="Add frame">+</button>
      <div class="onion-control">
        <span>Onion:</span>
        <select id="onion-select">
          <option value="-1">Off</option>
        </select>
      </div>
    </div>

    <!-- Top row: grid + right column -->
    <div class="top-row">
      <div class="grid-section">
        <span class="section-label" id="grid-label">Frame 1 — 12×5</span>
        <div id="ascii-grid"></div>
      </div>
      <div class="right-col">
        <!-- Eyes editor -->
        <div class="eyes-section">
          <span class="section-label">Eyes</span>
          <div class="eyes-controls">
            <input id="eyes-input" type="text" maxlength="2" placeholder="·" />
            <span class="eyes-mode-badge" id="eyes-mode-badge">1×1</span>
          </div>
        </div>
        <!-- Animated preview -->
        <div class="preview-section">
          <div class="preview-label-row">
            <span class="section-label">Preview</span>
            <span id="preview-frame-badge"></span>
          </div>
          <div id="preview-box"></div>
        </div>
      </div>
    </div>

    <!-- Color palette -->
    <div class="palette-section">
      <span class="section-label">256-color palette</span>
      <div class="palette-controls">
        <div class="active-color-indicator">
          <div id="active-color-box"></div>
          <span id="active-color-label">No color (inherit)</span>
        </div>
        <button class="secondary danger" id="clear-color-btn">Clear color (null)</button>
      </div>
      <div id="color-palette"></div>
    </div>

    <!-- Voice editor -->
    <div class="voice-section">
      <span class="section-label">Buddy</span>

      <div class="voice-field">
        <label>Name</label>
        <input type="text" id="buddy-name" />
      </div>

      <div class="voice-field">
        <label>Personality</label>
        <input type="text" id="voice-personality" />
      </div>

      <div class="voice-field">
        <label>Idle Phrases</label>
        <div id="voice-phrases" class="phrase-list"></div>
        <button class="secondary small" id="add-phrase-btn">+ Add phrase</button>
      </div>

      <div class="voice-reactions">
        <label>Reactions</label>
        <!-- One sub-section per reaction key -->
        <div id="voice-reactions-container"></div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button class="secondary" id="charmap-toggle-btn">Char Map</button>
      <button id="save-btn">Save</button>
      <span id="status"></span>
    </div>

    <!-- Character map (toggleable) -->
    <div id="charmap-panel">
      <span class="section-label">Character Map (click to insert)</span>
      <div id="charmap-grid"></div>
    </div>

    <p class="hint">Click a cell to select it. Click and drag to select a region. Type to set characters. Pick a color to paint. Ctrl+S to save.</p>
  </div>

  <script>
    // ── Initial data ────────────────────────────────────────────────────────
    window.__BUDDY_DATA__ = JSON.parse(atob('${buddyJsonB64}'));

    const COLS = 12;
    const ROWS = 5;
    const EYE_PLACEHOLDER = '\\u00b7'; // middle dot ·

    // ── State ───────────────────────────────────────────────────────────────
    const state = {
      buddy: JSON.parse(JSON.stringify(window.__BUDDY_DATA__)),
      // All frames: array of {ascii: string[][], colors: (number|null)[][]}
      frames: [],
      currentFrameIndex: 0,
      // Working grid (current frame, mutable during edit)
      ascii:  Array.from({ length: ROWS }, () => Array(COLS).fill(' ')),
      colors: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
      selectedCells: new Set(),
      activeColor: null,
      dragStart: null,
      isDragging: false,
      onionSkinIndex: -1,
      eyes: (window.__BUDDY_DATA__.eyes || EYE_PLACEHOLDER),
    };

    // ── Frame helpers ────────────────────────────────────────────────────────
    function makeEmptyFrame() {
      return {
        ascii:  Array.from({ length: ROWS }, () => Array(COLS).fill(' ')),
        colors: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
      };
    }

    function frameFromBuddyFrame(f) {
      const ascii  = Array.from({ length: ROWS }, () => Array(COLS).fill(' '));
      const colors = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      for (let r = 0; r < ROWS; r++) {
        const line = (f.ascii[r] || '').padEnd(COLS, ' ');
        for (let c = 0; c < COLS; c++) ascii[r][c] = line[c] || ' ';
        const cr = f.colors[r] || [];
        for (let c = 0; c < COLS; c++) colors[r][c] = (cr[c] === undefined || cr[c] === null) ? null : cr[c];
      }
      return { ascii, colors };
    }

    // Load all frames from buddy data into state.frames
    (function initFrames() {
      const buddyFrames = state.buddy.frames || [];
      if (buddyFrames.length === 0) {
        state.frames.push(makeEmptyFrame());
      } else {
        for (const f of buddyFrames) {
          state.frames.push(frameFromBuddyFrame(f));
        }
      }
      // Load frame 0 into working grid
      loadFrameIntoGrid(0);
    })();

    function loadFrameIntoGrid(idx) {
      const f = state.frames[idx];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          state.ascii[r][c]  = f.ascii[r][c];
          state.colors[r][c] = f.colors[r][c];
        }
      }
    }

    function saveGridToFrame(idx) {
      const f = state.frames[idx];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          f.ascii[r][c]  = state.ascii[r][c];
          f.colors[r][c] = state.colors[r][c];
        }
      }
    }

    // ── ANSI 256 → RGB ──────────────────────────────────────────────────────
    function ansi256ToRgb(n) {
      const standard = [
        [0,0,0],[128,0,0],[0,128,0],[128,128,0],
        [0,0,128],[128,0,128],[0,128,128],[192,192,192],
      ];
      const bright = [
        [128,128,128],[255,0,0],[0,255,0],[255,255,0],
        [0,0,255],[255,0,255],[0,255,255],[255,255,255],
      ];
      if (n < 8) return standard[n];
      if (n < 16) return bright[n - 8];
      if (n < 232) {
        n -= 16;
        const r = Math.floor(n / 36);
        const g = Math.floor((n % 36) / 6);
        const b = n % 6;
        return [r ? r * 40 + 55 : 0, g ? g * 40 + 55 : 0, b ? b * 40 + 55 : 0];
      }
      const gray = (n - 232) * 10 + 8;
      return [gray, gray, gray];
    }

    function rgbStr(n) {
      if (n === null) return null;
      const [r, g, b] = ansi256ToRgb(n);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    // ── Eye placeholder detection ────────────────────────────────────────────
    function isEyePlaceholder(r, c) {
      const eyes = state.eyes;
      if (!eyes || eyes.length === 0) return false;
      const ch = state.ascii[r][c];
      if (eyes.length === 1) {
        return ch === EYE_PLACEHOLDER;
      }
      // 2-char eyes: both consecutive cells must be EYE_PLACEHOLDER
      if (ch !== EYE_PLACEHOLDER) return false;
      if (c + 1 < COLS && state.ascii[r][c + 1] === EYE_PLACEHOLDER) return true;
      if (c - 1 >= 0 && state.ascii[r][c - 1] === EYE_PLACEHOLDER) return true;
      return false;
    }

    // ── Build grid DOM ──────────────────────────────────────────────────────
    const gridEl = document.getElementById('ascii-grid');

    function buildGrid() {
      gridEl.innerHTML = '';
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = document.createElement('div');
          cell.className = 'cell';
          cell.dataset.row = r;
          cell.dataset.col = c;
          gridEl.appendChild(cell);
        }
      }
    }

    function getCellEl(r, c) {
      return gridEl.querySelector('[data-row="' + r + '"][data-col="' + c + '"]');
    }

    function renderCell(r, c) {
      const el = getCellEl(r, c);
      if (!el) return;
      const ch = state.ascii[r][c];

      // Main character span
      let mainSpan = el.querySelector('.cell-char');
      if (!mainSpan) {
        mainSpan = document.createElement('span');
        mainSpan.className = 'cell-char';
        el.appendChild(mainSpan);
      }
      mainSpan.textContent = ch === ' ' ? '\\u00a0' : ch;
      const col = state.colors[r][c];
      mainSpan.style.color = col !== null ? rgbStr(col) : '#e0e0e0';

      // Eye placeholder style
      const isEye = isEyePlaceholder(r, c);
      el.classList.toggle('eye-placeholder', isEye);

      // Selection
      const key = r + ',' + c;
      el.classList.toggle('selected', state.selectedCells.has(key));

      // Onion skin overlay
      let onion = el.querySelector('.onion-overlay');
      const oidx = state.onionSkinIndex;
      if (oidx >= 0 && oidx < state.frames.length && oidx !== state.currentFrameIndex) {
        const ref = state.frames[oidx];
        const refCh = ref.ascii[r][c];
        if (refCh !== ch && refCh !== ' ') {
          if (!onion) {
            onion = document.createElement('span');
            onion.className = 'onion-overlay';
            el.appendChild(onion);
          }
          onion.textContent = refCh;
        } else {
          if (onion) onion.remove();
        }
      } else {
        if (onion) onion.remove();
      }
    }

    function renderAllCells() {
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          renderCell(r, c);
    }

    // ── Animated Preview ─────────────────────────────────────────────────────
    const previewEl = document.getElementById('preview-box');
    const previewBadge = document.getElementById('preview-frame-badge');
    let previewAnimIndex = 0;
    let previewTimer = null;

    function substituteEyes(ascii) {
      // Replace EYE_PLACEHOLDER with actual eye character(s)
      const eyes = state.eyes || EYE_PLACEHOLDER;
      const eye1 = eyes[0] || EYE_PLACEHOLDER;
      const eye2 = eyes[1] || null;
      const out = ascii.map(row => [...row]);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (out[r][c] === EYE_PLACEHOLDER) {
            if (eye2 !== null && c + 1 < COLS && out[r][c + 1] === EYE_PLACEHOLDER) {
              out[r][c]     = eye1;
              out[r][c + 1] = eye2;
            } else if (eye2 === null) {
              out[r][c] = eye1;
            }
            // For 2-char eyes the second cell is handled by the first detection above
          }
        }
      }
      return out;
    }

    function renderPreviewFrame(frameIdx) {
      // Use working grid for current frame (unsaved edits visible)
      let ascii, colors;
      if (frameIdx === state.currentFrameIndex) {
        ascii  = state.ascii;
        colors = state.colors;
      } else {
        ascii  = state.frames[frameIdx].ascii;
        colors = state.frames[frameIdx].colors;
      }
      const displayAscii = substituteEyes(ascii);

      previewEl.innerHTML = '';
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const span = document.createElement('span');
          const ch = displayAscii[r][c];
          span.textContent = ch === ' ' ? '\\u00a0' : ch;
          const col = colors[r][c];
          if (col !== null) span.style.color = rgbStr(col);
          previewEl.appendChild(span);
        }
        if (r < ROWS - 1) previewEl.appendChild(document.createTextNode('\\n'));
      }

      const total = state.frames.length;
      if (total > 1) {
        previewBadge.textContent = 'Frame ' + (frameIdx + 1) + '/' + total;
      } else {
        previewBadge.textContent = '';
      }
    }

    function startPreviewAnimation() {
      if (previewTimer) clearInterval(previewTimer);
      previewAnimIndex = state.currentFrameIndex;
      renderPreviewFrame(previewAnimIndex);
      if (state.frames.length > 1) {
        previewTimer = setInterval(() => {
          previewAnimIndex = (previewAnimIndex + 1) % state.frames.length;
          renderPreviewFrame(previewAnimIndex);
        }, 500);
      }
    }

    function renderPreview() {
      // Re-render the current animation frame immediately (e.g. after edit)
      renderPreviewFrame(previewAnimIndex);
    }

    // ── Selection helpers ────────────────────────────────────────────────────
    function selectSingle(r, c) {
      state.selectedCells.clear();
      state.selectedCells.add(r + ',' + c);
    }

    function selectRect(r1, c1, r2, c2) {
      state.selectedCells.clear();
      const rMin = Math.min(r1, r2), rMax = Math.max(r1, r2);
      const cMin = Math.min(c1, c2), cMax = Math.max(c1, c2);
      for (let r = rMin; r <= rMax; r++)
        for (let c = cMin; c <= cMax; c++)
          state.selectedCells.add(r + ',' + c);
    }

    // ── Apply color/char to selection ────────────────────────────────────────
    function applyColorToSelection(colorIdx) {
      for (const key of state.selectedCells) {
        const [r, c] = key.split(',').map(Number);
        state.colors[r][c] = colorIdx;
      }
      renderAllCells();
      renderPreview();
    }

    function applyCharToSelection(ch) {
      for (const key of state.selectedCells) {
        const [r, c] = key.split(',').map(Number);
        state.ascii[r][c] = ch;
      }
      renderAllCells();
      renderPreview();
    }

    // ── Grid mouse events ────────────────────────────────────────────────────
    gridEl.addEventListener('mousedown', (e) => {
      const cell = e.target.closest('.cell');
      if (!cell) return;
      e.preventDefault();
      const r = Number(cell.dataset.row);
      const c = Number(cell.dataset.col);
      state.dragStart = { r, c };
      state.isDragging = true;
      selectSingle(r, c);
      renderAllCells();
    });

    gridEl.addEventListener('mousemove', (e) => {
      if (!state.isDragging || !state.dragStart) return;
      const cell = e.target.closest('.cell');
      if (!cell) return;
      const r = Number(cell.dataset.row);
      const c = Number(cell.dataset.col);
      selectRect(state.dragStart.r, state.dragStart.c, r, c);
      renderAllCells();
    });

    document.addEventListener('mouseup', () => {
      if (state.isDragging) {
        state.isDragging = false;
        state.dragStart = null;
      }
    });

    // ── Keyboard: type into selection ────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
      // Ignore when focus is on any text input or textarea
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // Ctrl+S → save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!document.getElementById('save-btn').disabled) save();
        return;
      }
      // Escape → clear selection
      if (e.key === 'Escape') {
        state.selectedCells.clear();
        renderAllCells();
        return;
      }
      // Only handle printable single chars if cells are selected
      if (state.selectedCells.size === 0) return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        applyCharToSelection(e.key);
      }
      // Backspace → space
      if (e.key === 'Backspace') {
        e.preventDefault();
        applyCharToSelection(' ');
      }
      // Arrow navigation (single cell)
      if (['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key) && state.selectedCells.size === 1) {
        e.preventDefault();
        const [r, c] = [...state.selectedCells][0].split(',').map(Number);
        let nr = r, nc = c;
        if (e.key === 'ArrowRight') nc = Math.min(COLS - 1, c + 1);
        if (e.key === 'ArrowLeft')  nc = Math.max(0, c - 1);
        if (e.key === 'ArrowDown')  nr = Math.min(ROWS - 1, r + 1);
        if (e.key === 'ArrowUp')    nr = Math.max(0, r - 1);
        selectSingle(nr, nc);
        renderAllCells();
      }
    });

    // ── Clipboard paste into selection ───────────────────────────────────────
    document.addEventListener('paste', (e) => {
      if (state.selectedCells.size === 0) return;

      const text = e.clipboardData?.getData('text') || '';
      if (!text) return;
      e.preventDefault();

      // Get the top-left corner of selection
      const cells = [...state.selectedCells].map(k => k.split(',').map(Number));
      const minRow = Math.min(...cells.map(c => c[0]));
      const minCol = Math.min(...cells.map(c => c[1]));

      const lines = text.split('\\n');
      for (let lr = 0; lr < lines.length && (minRow + lr) < ROWS; lr++) {
        const line = lines[lr];
        for (let lc = 0; lc < line.length && (minCol + lc) < COLS; lc++) {
          state.ascii[minRow + lr][minCol + lc] = line[lc];
        }
      }

      renderAllCells();
      renderPreview();
    });

    // ── Frame management ─────────────────────────────────────────────────────
    function rebuildFrameTabs() {
      // Remove existing tabs (keep the + button and onion control)
      const bar = document.getElementById('frame-bar');
      bar.querySelectorAll('.frame-tab').forEach(t => t.remove());
      const addBtn = document.getElementById('frame-add-btn');

      state.frames.forEach((_, i) => {
        const tab = document.createElement('div');
        tab.className = 'frame-tab' + (i === state.currentFrameIndex ? ' active' : '');
        tab.dataset.frameIdx = i;

        const label = document.createElement('span');
        label.textContent = 'Frame ' + (i + 1);
        label.style.pointerEvents = 'none';
        tab.appendChild(label);

        if (state.frames.length > 1) {
          const del = document.createElement('button');
          del.className = 'tab-delete';
          del.textContent = '×';
          del.title = 'Delete frame ' + (i + 1);
          del.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteFrame(i);
          });
          tab.appendChild(del);
        }

        tab.addEventListener('click', () => switchFrame(i));
        bar.insertBefore(tab, addBtn);
      });

      // Rebuild onion dropdown
      const sel = document.getElementById('onion-select');
      sel.innerHTML = '<option value="-1">Off</option>';
      state.frames.forEach((_, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = 'Frame ' + (i + 1);
        if (i === state.currentFrameIndex) opt.disabled = true;
        sel.appendChild(opt);
      });
      sel.value = state.onionSkinIndex;

      // Update grid label
      document.getElementById('grid-label').textContent =
        'Frame ' + (state.currentFrameIndex + 1) + ' — 12×5';
    }

    function switchFrame(idx) {
      if (idx === state.currentFrameIndex) return;
      saveGridToFrame(state.currentFrameIndex);
      state.currentFrameIndex = idx;
      loadFrameIntoGrid(idx);
      state.selectedCells.clear();
      // If onion skin was the frame we're switching to, turn it off
      if (state.onionSkinIndex === idx) {
        state.onionSkinIndex = -1;
      }
      rebuildFrameTabs();
      renderAllCells();
      startPreviewAnimation();
    }

    function addFrame(copyCurrentFrame) {
      saveGridToFrame(state.currentFrameIndex);
      const newFrame = copyCurrentFrame
        ? JSON.parse(JSON.stringify(state.frames[state.currentFrameIndex]))
        : makeEmptyFrame();
      state.frames.push(newFrame);
      switchFrame(state.frames.length - 1);
    }

    function deleteFrame(idx) {
      if (state.frames.length <= 1) return;
      // Save working grid before deletion if it's the current frame
      if (idx === state.currentFrameIndex) {
        saveGridToFrame(state.currentFrameIndex);
      }
      state.frames.splice(idx, 1);
      // Adjust currentFrameIndex
      let newIdx = state.currentFrameIndex;
      if (idx < newIdx) newIdx--;
      else if (idx === newIdx) newIdx = Math.max(0, idx - 1);
      state.currentFrameIndex = newIdx;
      // Fix onion skin index
      if (state.onionSkinIndex === idx) state.onionSkinIndex = -1;
      else if (state.onionSkinIndex > idx) state.onionSkinIndex--;

      loadFrameIntoGrid(state.currentFrameIndex);
      state.selectedCells.clear();
      rebuildFrameTabs();
      renderAllCells();
      startPreviewAnimation();
    }

    document.getElementById('frame-add-btn').addEventListener('click', () => {
      const choice = confirm('Copy current frame?\\nOK = copy, Cancel = blank frame');
      addFrame(choice);
    });

    document.getElementById('onion-select').addEventListener('change', (e) => {
      state.onionSkinIndex = Number(e.target.value);
      renderAllCells();
    });

    // ── Eyes editor ──────────────────────────────────────────────────────────
    const eyesInput = document.getElementById('eyes-input');
    const eyesModeBadge = document.getElementById('eyes-mode-badge');

    function updateEyesMode() {
      const len = state.eyes.length;
      eyesModeBadge.textContent = len >= 2 ? '2×1' : '1×1';
    }

    eyesInput.value = state.eyes;
    updateEyesMode();

    eyesInput.addEventListener('input', () => {
      // Keep only up to 2 chars; strip the middle-dot placeholder from typed text
      const raw = eyesInput.value;
      state.eyes = raw.slice(0, 2);
      eyesInput.value = state.eyes;
      updateEyesMode();
      renderAllCells();
      renderPreview();
    });

    // ── Color Palette ────────────────────────────────────────────────────────
    const paletteEl = document.getElementById('color-palette');
    const activeColorBox = document.getElementById('active-color-box');
    const activeColorLabel = document.getElementById('active-color-label');
    let activeSwatch = null;

    function buildPalette() {
      paletteEl.innerHTML = '';

      function makeRow(indices) {
        const row = document.createElement('div');
        row.className = 'palette-row';
        for (const i of indices) {
          const sw = document.createElement('div');
          sw.className = 'color-swatch';
          sw.dataset.color = i;
          const [r, g, b] = ansi256ToRgb(i);
          sw.style.background = 'rgb(' + r + ',' + g + ',' + b + ')';
          sw.title = 'ANSI ' + i;
          row.appendChild(sw);
        }
        paletteEl.appendChild(row);
        return row;
      }

      // Row 1: standard 0-7
      makeRow(Array.from({ length: 8 }, (_, i) => i));
      // Row 2: bright 8-15
      makeRow(Array.from({ length: 8 }, (_, i) => i + 8));
      // 216-color cube: 6 rows of 36
      for (let row = 0; row < 6; row++) {
        makeRow(Array.from({ length: 36 }, (_, i) => 16 + row * 36 + i));
      }
      // Grayscale 232-255
      makeRow(Array.from({ length: 24 }, (_, i) => 232 + i));

      paletteEl.addEventListener('click', (e) => {
        const sw = e.target.closest('.color-swatch');
        if (!sw) return;
        const idx = Number(sw.dataset.color);
        setActiveColor(idx, sw);
        if (state.selectedCells.size > 0) applyColorToSelection(idx);
      });
    }

    function setActiveColor(idx, swEl) {
      state.activeColor = idx;
      if (activeSwatch) activeSwatch.classList.remove('active');
      activeSwatch = swEl || paletteEl.querySelector('[data-color="' + idx + '"]');
      if (activeSwatch) activeSwatch.classList.add('active');
      const [r, g, b] = ansi256ToRgb(idx);
      activeColorBox.style.background = 'rgb(' + r + ',' + g + ',' + b + ')';
      activeColorLabel.textContent = 'ANSI ' + idx + '  rgb(' + r + ',' + g + ',' + b + ')';
    }

    document.getElementById('clear-color-btn').addEventListener('click', () => {
      state.activeColor = null;
      if (activeSwatch) activeSwatch.classList.remove('active');
      activeSwatch = null;
      activeColorBox.style.background = 'transparent';
      activeColorLabel.textContent = 'No color (inherit)';
      if (state.selectedCells.size > 0) applyColorToSelection(null);
    });

    // ── Character Map ────────────────────────────────────────────────────────
    const charmapPanel = document.getElementById('charmap-panel');
    const charmapGrid  = document.getElementById('charmap-grid');

    function buildCharMap() {
      charmapGrid.innerHTML = '';
      // Printable ASCII 32-126
      for (let code = 32; code <= 126; code++) {
        addCharmapBtn(String.fromCharCode(code));
      }
      // Middle dot (eye placeholder)
      addCharmapBtn('\\u00b7');
    }

    function addCharmapBtn(ch) {
      const btn = document.createElement('button');
      btn.className = 'charmap-btn';
      btn.textContent = ch === ' ' ? '\\u00b7' : ch;
      btn.title = ch === ' ' ? 'Space (U+0020)' : 'U+' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
      btn.addEventListener('click', () => {
        if (state.selectedCells.size > 0) applyCharToSelection(ch);
      });
      charmapGrid.appendChild(btn);
    }

    document.getElementById('charmap-toggle-btn').addEventListener('click', () => {
      charmapPanel.classList.toggle('open');
    });

    // ── Save ─────────────────────────────────────────────────────────────────
    const saveBtn  = document.getElementById('save-btn');
    const statusEl = document.getElementById('status');

    function showStatus(msg, type) {
      statusEl.textContent = msg;
      statusEl.className = type;
      statusEl.style.display = 'inline-block';
    }

    function buildBuddyToSave() {
      // Flush working grid into current frame slot
      saveGridToFrame(state.currentFrameIndex);
      const buddy = JSON.parse(JSON.stringify(state.buddy));
      // Rebuild all frames
      buddy.frames = state.frames.map(f => ({
        ascii:  f.ascii.map(row => row.join('')),
        colors: f.colors.map(row => row.map(v => v === undefined ? null : v)),
      }));
      // Update eyes
      buddy.eyes = state.eyes;
      // Update name
      const nameVal = document.getElementById('buddy-name').value.trim();
      if (nameVal) buddy.name = nameVal;
      // Update voice
      buddy.voice = collectVoice();
      return buddy;
    }

    async function save() {
      saveBtn.disabled = true;
      showStatus('Saving...', 'info');

      const payload = buildBuddyToSave();

      if (!payload.name || !payload.frames || !payload.voice) {
        showStatus('Missing required fields: name, frames, voice', 'error');
        saveBtn.disabled = false;
        return;
      }

      try {
        const res = await fetch('/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showStatus('Saved! This window will close shortly.', 'success');
          saveBtn.disabled = true;
        } else {
          const text = await res.text();
          showStatus('Server error: ' + text, 'error');
          saveBtn.disabled = false;
        }
      } catch (e) {
        showStatus('Network error: ' + e.message, 'error');
        saveBtn.disabled = false;
      }
    }

    saveBtn.addEventListener('click', save);

    // ── Voice Editor ─────────────────────────────────────────────────────────
    const REACTION_KEYS = [
      'branch_changed', 'cwd_changed', 'model_changed',
      'time_morning', 'time_afternoon', 'time_evening', 'time_night',
      'level_up', 'badge_unlocked', 'streak_milestone', 'idle_return'
    ];

    function addPhraseInput(container, value, onRemove) {
      const item = document.createElement('div');
      item.className = 'phrase-item';

      const input = document.createElement('input');
      input.type = 'text';
      input.value = value || '';

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '×';
      removeBtn.type = 'button';
      removeBtn.addEventListener('click', () => {
        item.remove();
        if (onRemove) onRemove();
      });

      item.appendChild(input);
      item.appendChild(removeBtn);
      container.appendChild(item);
      return input;
    }

    function renderVoiceEditor() {
      const voice = state.buddy.voice || {};

      // Name
      const nameInput = document.getElementById('buddy-name');
      nameInput.value = state.buddy.name || '';

      // Personality
      const personalityInput = document.getElementById('voice-personality');
      personalityInput.value = voice.personality || '';

      // Idle phrases
      const phrasesContainer = document.getElementById('voice-phrases');
      phrasesContainer.innerHTML = '';
      const phrases = voice.phrases || [];
      for (const phrase of phrases) {
        addPhraseInput(phrasesContainer, phrase, null);
      }

      // Add phrase button
      document.getElementById('add-phrase-btn').addEventListener('click', () => {
        addPhraseInput(phrasesContainer, '', null);
      });

      // Reactions
      const reactionsContainer = document.getElementById('voice-reactions-container');
      reactionsContainer.innerHTML = '';
      const reactions = voice.reactions || {};

      for (const key of REACTION_KEYS) {
        const group = document.createElement('div');
        group.className = 'reaction-group';
        group.dataset.reactionKey = key;

        const groupLabel = document.createElement('div');
        groupLabel.className = 'reaction-group-label';
        groupLabel.textContent = key;
        group.appendChild(groupLabel);

        const phraseList = document.createElement('div');
        phraseList.className = 'phrase-list';
        group.appendChild(phraseList);

        const existingPhrases = reactions[key] || [];
        for (const phrase of existingPhrases) {
          addPhraseInput(phraseList, phrase, null);
        }

        const addBtn = document.createElement('button');
        addBtn.className = 'secondary small';
        addBtn.type = 'button';
        addBtn.textContent = '+ Add';
        addBtn.addEventListener('click', () => {
          addPhraseInput(phraseList, '', null);
        });
        group.appendChild(addBtn);

        reactionsContainer.appendChild(group);
      }
    }

    function collectVoice() {
      const voice = {};

      // Personality
      const personality = document.getElementById('voice-personality').value.trim();
      if (personality) voice.personality = personality;

      // Idle phrases
      const phrasesContainer = document.getElementById('voice-phrases');
      const phraseInputs = phrasesContainer.querySelectorAll('input');
      const phrases = [];
      for (const input of phraseInputs) {
        const val = input.value.trim();
        if (val) phrases.push(val);
      }
      if (phrases.length > 0) voice.phrases = phrases;

      // Reactions
      const reactions = {};
      const reactionsContainer = document.getElementById('voice-reactions-container');
      const groups = reactionsContainer.querySelectorAll('.reaction-group');
      for (const group of groups) {
        const key = group.dataset.reactionKey;
        const inputs = group.querySelectorAll('.phrase-list input');
        const keyPhrases = [];
        for (const input of inputs) {
          const val = input.value.trim();
          if (val) keyPhrases.push(val);
        }
        if (keyPhrases.length > 0) {
          reactions[key] = keyPhrases;
        }
      }
      if (Object.keys(reactions).length > 0) voice.reactions = reactions;

      return voice;
    }

    // ── Boot ─────────────────────────────────────────────────────────────────
    buildGrid();
    buildPalette();
    buildCharMap();
    rebuildFrameTabs();
    renderAllCells();
    startPreviewAnimation();
    renderVoiceEditor();
    // Select cell (0,0) by default
    selectSingle(0, 0);
    renderAllCells();
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
