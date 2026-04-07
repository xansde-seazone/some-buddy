import { describe, it, expect, afterEach } from 'vitest';
import { startEditorServer } from '../src/editor/server.js';
import type { Buddy } from '../src/types.js';

const testBuddy: Buddy = {
  name: 'test-buddy',
  eyes: '·',
  frames: [{
    ascii: [' /\\_/\\      ', ' ( · · )    ', ' (  ^  )    ', ' / > < \\    ', ' ~~~~~~     '],
    colors: Array.from({ length: 5 }, () => Array(12).fill(null)),
  }],
  voice: {
    personality: 'test',
    phrases: ['hello'],
    reactions: {},
  },
};

describe('editor server', () => {
  let closeServer: (() => void) | null = null;

  afterEach(() => {
    if (closeServer) {
      closeServer();
      closeServer = null;
    }
  });

  it('starts on a random port and serves HTML on GET /', async () => {
    const { port, close } = await startEditorServer({
      buddy: testBuddy,
      buddyPath: '/tmp/test-buddy.json',
    });
    closeServer = close;

    expect(port).toBeGreaterThan(0);

    const res = await fetch(`http://localhost:${port}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('my-buddy editor');
    expect(html).toContain('test-buddy');
    expect(html).toContain('__BUDDY_DATA__');
  });

  it('returns 404 for unknown routes', async () => {
    const { port, close } = await startEditorServer({
      buddy: testBuddy,
      buddyPath: '/tmp/test-buddy.json',
    });
    closeServer = close;

    const res = await fetch(`http://localhost:${port}/unknown`);
    expect(res.status).toBe(404);
  });

  it('POST /save validates buddy structure', async () => {
    const { port, close } = await startEditorServer({
      buddy: testBuddy,
      buddyPath: '/tmp/test-buddy-save.json',
    });
    closeServer = close;

    // Missing required fields
    const res = await fetch(`http://localhost:${port}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' }),
    });
    expect(res.status).toBe(400);
  });
});
