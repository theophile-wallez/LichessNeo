import { queryOne, setData, setStyleProperty } from '#shared/dom.ts';

/**
 * Places the active range's highlight, one element that slides from the last
 * pill picked to the new one. It jumps without sliding the first time and
 * when the pills reflow, so it never flies in from nowhere.
 */
export function createThumbPlacer(root: HTMLElement, thumb: HTMLElement): () => void {
  let placedAt = '';
  return () => {
    const active = queryOne(root, '[data-lr-ext-range].active', HTMLElement);
    if (!active) return;
    const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = active;
    const at = `${offsetLeft},${offsetTop},${offsetWidth}`;
    if (at === placedAt) return;
    // Only a click on a range pill asks for the slide, with data-lr-ext-slide.
    const slide = placedAt !== '' && root.dataset.lrExtSlide === '1';
    thumb.classList.toggle('lr-ext-rchart__thumb--still', !slide);
    setStyleProperty(thumb, 'width', `${offsetWidth}px`);
    setStyleProperty(thumb, 'height', `${offsetHeight}px`);
    setStyleProperty(thumb, 'transform', `translate(${offsetLeft}px, ${offsetTop}px)`);
    placedAt = at;
    setData(root, 'lrExtSlide', null);
  };
}
