import type { Color } from 'three';
import type { FurLook, FurModeValue } from '#content/coach/mascot/fur/fur.ts';
import { COAT_PATTERN } from '#content/coach/mascot/fur/shaders.ts';
import { solid, type Finish, type SolidMaterial } from './finishes.ts';

// A solid skin in the fur's pattern: a belly in the front color, a bee's bands,
// a tail's pale tip, drawn by the fur's own GLSL (fur/shaders.ts) over three's
// material for the finish.

interface Palette {
  readonly coat: Color;
  readonly front: Color;
  readonly accent: Color;
}

export interface PatternOptions {
  readonly finish: Finish;
  /** The colors, shared: easing them repaints the pattern. */
  readonly palette: Palette;
  /** Where the front color starts, and the bands, as the mascot's fur has them. */
  readonly look: Pick<FurLook, 'uFront' | 'uStripes'>;
  readonly mode: FurModeValue;
  readonly tipFrom: number;
}

const VERTEX_PATTERN = /* glsl */ `#include <begin_vertex>
vCream = frontMask(position, normalize(objectNormal));
vAccent = accentMask(position);`;

const FRAGMENT_COLOR = /* glsl */ `vec4 diffuseColor = vec4(
  mix(mix(uCoat, uFrontColor, vCream), uAccent, vAccent), opacity);`;

export function patterned({ finish, palette, look, mode, tipFrom }: PatternOptions): SolidMaterial {
  const material = solid(finish, '#ffffff');
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {
      uCoat: { value: palette.coat },
      uFrontColor: { value: palette.front },
      uAccent: { value: palette.accent },
      uFront: look.uFront,
      uStripes: look.uStripes,
      uMode: { value: mode },
      uTipFrom: { value: tipFrom },
    });
    shader.vertexShader = `${COAT_PATTERN}
varying float vCream;
varying float vAccent;
${shader.vertexShader.replace('#include <begin_vertex>', VERTEX_PATTERN)}`;
    shader.fragmentShader = `uniform vec3 uCoat;
uniform vec3 uFrontColor;
uniform vec3 uAccent;
varying float vCream;
varying float vAccent;
${shader.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', FRAGMENT_COLOR)}`;
  };
  return material;
}
