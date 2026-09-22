/**
 * Hold the page at 100%.
 *
 * The viewport meta in `index.html` does this on Android and on desktop.
 * iOS Safari ignores `user-scalable=no`, deliberately, on accessibility
 * grounds, and desktop browsers zoom on ctrl+wheel and ctrl+plus regardless
 * of any meta tag. So the two gaps are closed here.
 *
 * This is a real trade and worth being clear about: somebody who would pinch
 * to magnify a score sheet can no longer do so. It is done because a
 * card-based layout at 130% does not read as "magnified", it reads as broken:
 * cards overlapping, the bottom bar off the edge, and a teacher half way
 * through entering marks with no idea how to get the page square again. The
 * things that genuinely need width, the score grid, the report sheet, scroll
 * inside their own containers, and the browser's own page-zoom (⌘/Ctrl and the
 * menu) is untouched, so a person who needs everything bigger still has the
 * one control that resizes the layout properly instead of magnifying it.
 *
 * Every listener is passive:false because preventDefault is the entire point,
 * and Chrome now defaults wheel and touch listeners to passive.
 */
export function lockZoom(): void {
  if (typeof window === 'undefined') return;

  /*
   * iOS Safari. `gesturestart` fires the moment a second finger lands, before
   * any scaling has happened, so cancelling it stops the pinch without the
   * page ever visibly moving. `gesturechange`/`gestureend` are cancelled too
   * for the case where a gesture began before this ran.
   */
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (event) => event.preventDefault(), { passive: false });
  }

  /*
   * Desktop pinch and ctrl+wheel.
   *
   * A trackpad pinch reaches the page as a wheel event with `ctrlKey` set,
   * there is no separate gesture event for it, which is why this one test
   * covers both the trackpad and holding ctrl while scrolling a mouse.
 */
  window.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey) event.preventDefault();
    },
    { passive: false },
  );

  /*
   * Double-tap to zoom, which `touch-action: pan-y` already handles on modern
   * iOS but not on older WebKit. Two taps inside 300ms at the same spot is the
   * gesture; anything slower is two ordinary taps and must go through
   * untouched or buttons stop working.
   */
  let lastTap = 0;
  document.addEventListener(
    'touchend',
    (event) => {
      const now = Date.now();
      if (now - lastTap < 300) event.preventDefault();
      lastTap = now;
    },
    { passive: false },
  );
}
