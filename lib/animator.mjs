// Shared animation clock for sprite frame cycling.
// Inspired by Claude Code's ClockContext — adapted for vanilla Node.js.
//
//   const animator = createAnimator(500);
//   const unsub = animator.subscribe(frame => redraw(frame));
//   // ... later:
//   unsub();

export function createAnimator(intervalMs = 500) {
  const subscribers = new Set();
  let timer = null;
  let frame = 0;

  function tick() {
    frame++;
    for (const fn of subscribers) fn(frame);
  }

  return {
    get running() { return timer !== null; },

    subscribe(fn) {
      subscribers.add(fn);
      if (subscribers.size === 1 && !timer) {
        timer = setInterval(tick, intervalMs);
        timer.unref();
      }
      return () => {
        subscribers.delete(fn);
        if (subscribers.size === 0 && timer) {
          clearInterval(timer);
          timer = null;
        }
      };
    },

    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      frame = 0;
    },
  };
}
