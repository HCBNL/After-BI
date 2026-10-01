/**
 * Showing something without pulling the page apart.
 *
 * THE TRAP THIS EXISTS FOR
 *
 * `element.scrollIntoView()` does not scroll the page. It scrolls every
 * scrollable ancestor between the element and the document, and `overflow:
 * hidden` counts as scrollable: a clipped box cannot be scrolled with a finger
 * or a wheel, but it has a `scrollTop` like anything else and script sets it
 * freely. Nothing ever sets it back, because there is no scrollbar for anybody
 * to drag and no reason for a person to suspect it happened.
 *
 * The home hero is the case that bit. It is `overflow-hidden`, and its
 * decorative cubes hang below its bottom edge, so it has real scrollable
 * height. The tour pointed at the shortcuts inside it, the browser scrolled
 * the hero's own contents up by about 35px on the way past, and the curve
 * pinned to the foot of the panel travelled up with them, drawn across the
 * middle of the panel with the panel's red carrying on below it. The screen
 * stayed that way until the page was reloaded.
 *
 * So: `reveal` moves only what a person could have moved themselves, and
 * `healClipped` puts back anything that was only ever meant to clip.
 */

/** How far inside the viewport `reveal` keeps the element. */
const MARGIN = 24;

function clips(value: string): boolean {
  return value === 'hidden' || value === 'clip';
}

/**
 * Reset every clipped ancestor that has somehow been scrolled.
 *
 * Cheap, a walk up one chain, reading styles only for boxes that are actually
 * offset, and it is what repairs a screen something else has already pulled
 * apart. Safe to call as often as is convenient.
 */
export function healClipped(el: Element | null): void {
  let node: Element | null = el;
  while (node && node !== document.documentElement) {
    if (node instanceof HTMLElement && (node.scrollTop !== 0 || node.scrollLeft !== 0)) {
      const style = getComputedStyle(node);
      if (clips(style.overflowY) && node.scrollTop !== 0) node.scrollTop = 0;
      if (clips(style.overflowX) && node.scrollLeft !== 0) node.scrollLeft = 0;
    }
    node = node.parentElement;
  }
}

/**
 * The nearest ancestor a person could actually scroll, or null for the page.
 *
 * `hidden` is deliberately absent from the test. That is the whole point: a
 * clipped box is not a scroll container, whatever the DOM will let script do
 * to it.
 */
function scrollParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = getComputedStyle(node);
    if (/^(auto|scroll|overlay)$/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Show the element, moving as little as possible.
 *
 * If it is already on screen nothing happens at all, which is most of the time:
 * re-centring on every step is what made the page lurch between two steps
 * pointing at things sitting side by side.
 */
export function reveal(el: HTMLElement, behavior: ScrollBehavior = 'smooth'): void {
  healClipped(el);

  const scroller = scrollParent(el);
  const rect = el.getBoundingClientRect();
  const bounds = scroller ? scroller.getBoundingClientRect() : null;
  const viewTop = bounds ? bounds.top : 0;
  const viewBottom = bounds ? bounds.bottom : window.innerHeight || document.documentElement.clientHeight;

  const above = rect.top - (viewTop + MARGIN);
  const below = rect.bottom - (viewBottom - MARGIN);

  let delta = 0;
  if (above < 0) delta = above;
  // Never push the top of a tall element off the screen chasing its bottom.
  else if (below > 0) delta = Math.min(below, above);

  if (delta === 0) return;
  if (scroller) scroller.scrollBy({ top: delta, behavior });
  else window.scrollBy({ top: delta, behavior });
}
