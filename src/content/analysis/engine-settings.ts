import type { Feature } from '#shared/features.ts';
import { queryAll } from '#shared/dom.ts';
import { setSliderFill } from '#shared/slider-fill.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The engine's settings (styles/analysis/engine-settings.css) draw their
// sliders filled up to the thumb, as it's dragged and as Lichess sets them
// (the threads' recommended count, a settings panel just opened).

function syncSliders(): void {
  const settings = document.getElementById('ceval-settings');
  if (settings)
    for (const input of queryAll(settings, "input[type='range']", HTMLInputElement))
      setSliderFill(input);
}

export const engineSettings: Feature = {
  name: 'engine settings',
  start: () => {
    onEveryTick('engine settings sliders', syncSliders);
    document.addEventListener('input', event => {
      const { target } = event;
      if (target instanceof HTMLInputElement && target.closest('#ceval-settings'))
        setSliderFill(target);
    });
  },
};
