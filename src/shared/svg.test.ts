import { describe, expect, it } from 'vitest';
import { html } from './html.ts';
import { createSvgElement, pointerX, prependSvg, setAttributes, sizeSvg } from './svg.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

describe('createSvgElement', () => {
  it('makes the element in the SVG namespace, its attributes in order', () => {
    const svg = createSvgElement('svg', { class: 'lr-ext-marks', viewBox: '0 0 8 8' });
    expect(svg).toBeInstanceOf(SVGSVGElement);
    expect(svg.namespaceURI).toBe(SVG_NS);
    expect(svg.outerHTML).toBe('<svg class="lr-ext-marks" viewBox="0 0 8 8"></svg>');
  });
});

describe('setAttributes', () => {
  it('writes numbers and strings as text', () => {
    const line = createSvgElement('line');
    setAttributes(line, { x1: 1.5, x2: '2' });
    expect(line.getAttribute('x1')).toBe('1.5');
    expect(line.getAttribute('x2')).toBe('2');
  });
});

describe('sizeSvg', () => {
  it('sizes an SVG in pixels', () => {
    const svg = createSvgElement('svg');
    sizeSvg(svg, 640, 300);
    expect(svg.getAttribute('viewBox')).toBe('0 0 640 300');
    expect(svg.getAttribute('width')).toBe('640');
    expect(svg.getAttribute('height')).toBe('300');
  });
});

describe('prependSvg', () => {
  it('parses the markup as SVG, before what is there', () => {
    const svg = createSvgElement('svg');
    svg.innerHTML = '<g><text>last</text></g>';
    const group = svg.firstElementChild;
    if (!group) throw new Error('no group');
    prependSvg(group, html`<line x1="1"/><text>first</text>`);
    expect(group.innerHTML).toBe('<line x1="1"></line><text>first</text><text>last</text>');
    expect(group.firstElementChild?.namespaceURI).toBe(SVG_NS);
  });
});

describe('pointerX', () => {
  it('measures from the element’s left edge', () => {
    const svg = createSvgElement('svg');
    svg.getBoundingClientRect = () => new DOMRect(40, 0, 100, 100);
    expect(pointerX(new MouseEvent('pointermove', { clientX: 65 }), svg)).toBe(25);
  });
});
