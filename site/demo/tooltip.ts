import { closestTo } from '#shared/dom.ts';

// The tooltips the extension's markup asks for (`data-ln-ext-tip`), which its
// own script draws (content/ui/tooltip.ts): one box on <body>, over the
// element pointed at, so no card or SVG cuts it.

const GAP = 8;
const MARGIN = 8;

export function startTooltips(): void {
  const tip = document.createElement('div');
  tip.className = 'demo-tip';
  tip.setAttribute('role', 'tooltip');
  document.body.append(tip);
  let shown: HTMLElement | null = null;
  document.addEventListener('pointerover', event => {
    const target = closestTo(event.target, '[data-ln-ext-tip]', HTMLElement);
    if (target === shown) return;
    shown = target;
    tip.classList.toggle('demo-tip--on', target !== null);
    if (!target) return;
    tip.textContent = target.dataset.lnExtTip ?? '';
    const box = target.getBoundingClientRect();
    const width = tip.offsetWidth;
    const left = Math.min(
      Math.max(MARGIN, box.left + box.width / 2 - width / 2),
      window.innerWidth - width - MARGIN,
    );
    const above = box.top - tip.offsetHeight - GAP;
    tip.style.left = `${left}px`;
    tip.style.top = `${above < MARGIN ? box.bottom + GAP : above}px`;
  });
}
