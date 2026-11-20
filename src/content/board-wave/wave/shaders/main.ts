import { COLOUR_FUNCTIONS, COLOUR_UNIFORMS } from './colour.ts';
import { LENS_FUNCTIONS, LENS_UNIFORMS } from './lens.ts';

// The wave's one pass over the board (after distortion-waves' renderer, MIT).
// The canvas lies over the live board and owns only the pixels the wave
// changes: where the lens moves, splits or blurs the picture, and where the
// colour is laid. Everywhere else it stays clear, so the board shows through.
// Its output is premultiplied, so the colour lies as well over the page.

export const MAIN_FRAGMENT = `#version 300 es
precision highp float;
${LENS_UNIFORMS}
${COLOUR_UNIFORMS}
out vec4 outColor;
${LENS_FUNCTIONS}
${COLOUR_FUNCTIONS}

void main() {
  vec2 point = vec2(gl_FragCoord.x, uPixels.y - gl_FragCoord.y) * (uSize.x / uPixels.x);
  Field field = fieldAt(point);
  float held = heldAt(point);

  vec2 seen = point;
  vec2 split = vec2(0.0);
  if (uLens) {
    float lensShare = field.distance / (uLensWidth * (field.distance > 0.0 ? 0.85 : 1.5));
    float lift = exp(-lensShare * lensShare);
    float away = max(length(field.offset), 1.0);
    vec2 swollen = field.normal * uEnergy * uAmplitude * lift * held;
    vec2 inward = field.offset / away;
    seen = point - swollen + inward * uGravity * exp(-away / 900.0) * held;
    split = (swollen - inward * uGravity * exp(-away / 240.0) * held) * uAberration;
  }
  float blurShare = field.distance / (field.distance > 0.0 ? uBlurAhead : uBlurBehind);
  float blurRadius = uEnergy * uBlur * exp(-blurShare * blurShare) * held;
  float near = smoothstep(0.0, 1.0, clamp(blurRadius / max(uNearBlur, 1e-3), 0.0, 1.0));
  float far = smoothstep(0.0, 1.0, clamp((blurRadius - uNearBlur) / max(uBlur - uNearBlur, 1e-3), 0.0, 1.0));

  // Each share reaches 1 well before its effect shows: the hand-over to the board has no seam.
  float moved = max(smoothstep(0.03, 0.4, length(seen - point)), smoothstep(0.03, 0.4, length(split)));
  float own = uLens ? max(moved, smoothstep(0.0, 0.6, blurRadius)) : 0.0;
  vec3 color = own > 0.0 ? lensed(seen, split, near, far) : vec3(0.0);

  float gap = field.distance;
  vec2 centred = point - uSize * 0.5;
  float inset = max(-edgeDistance(centred, uSize * 0.5, uCorner), 0.0);
  bool nearEdge = uRim > 0.0 && inset < max(uRimWidth * 2.2 * (1.0 + 1.9 * uUneven), uHairWidth * 0.5 + 0.75);
  if (uGlow <= 0.0 && !nearEdge) {
    outColor = vec4((color + dither(gl_FragCoord.xy) / 255.0) * own, own);
    return;
  }
  float turn = atan(field.local.y, field.local.x);
  float along = field.local.x * 0.0068;
  float lobes = uRing
    ? 0.5 + 0.5 * sin(2.0 * turn + uTime * 1.4) * cos(turn - uTime * 0.7 + 1.2)
    : 0.5 + 0.5 * sin(along * 1.3 + uTime * 1.4) * cos(along * 0.6 - uTime * 0.7 + 1.2);
  float band = 0.0;
  if (uGlow > 0.0 && gap < uLead) {
    if (gap >= 0.0) {
      float ahead = 1.0 - gap / uLead;
      band = ahead * ahead * ahead * (ahead * (ahead * 6.0 - 15.0) + 10.0);
    } else {
      band = pow(1.0 - clamp(-gap / (uTail * mix(0.6, 1.3, lobes)), 0.0, 1.0), 2.3);
    }
    band *= uGlow * uStrength * mix(0.6, 1.0, exp(-inset / 140.0)) * held;
  }
  float around = atan(centred.y / uSize.y, centred.x / uSize.x);
  float rim = 0.0;
  float hair = 0.0;
  float shimmer = 0.5;
  if (nearEdge) {
    vec2 edge = perimeterAt(centred, uSize * 0.5, uCorner);
    float thickness = 1.0;
    if (uUneven > 0.0) thickness = max(1.0 + (rimThickness(edge.x, edge.y) - 1.0) * uUneven, 0.04);
    float hug = exp(-pow(inset / (uRimWidth * thickness), 2.0));
    float reached = 1.0 - smoothstep(-uLead * 0.7, uLead * 0.5, gap);
    float kept = smoothstep(-uRimSoftness, uRimSoftness, gap + (uRadius - uClear) / field.slope);
    shimmer = 0.5 + 0.5 * sin(uTime * 3.4 - edge.x / edge.y * 4.0 * PI);
    rim = hug * reached * kept * uRim * mix(1.0, 0.7 + 0.3 * shimmer, uPulse);
    if (uHairWidth > 0.0) {
      float line = 1.0 - smoothstep(uHairWidth * 0.5, uHairWidth * 0.5 + 0.75, inset);
      float hairKept = smoothstep(-uRimSoftness, uRimSoftness, gap + (uRadius - uHairClear) / field.slope);
      hair = line * reached * hairKept * uRim * uHairOpacity
        * mix(0.5, 1.0, smoothstep(0.1, 1.5, thickness))
        * mix(1.0, 0.55 + 0.45 * shimmer, uPulse);
    }
  }
  float tinted = 1.0 - (1.0 - band) * (1.0 - rim);
  float total = 1.0 - (1.0 - tinted) * (1.0 - hair);
  if (total <= 0.0005) {
    outColor = vec4((color + dither(gl_FragCoord.xy) / 255.0) * own, own);
    return;
  }
  float flow = 0.62 + (uRing ? turn / (2.0 * PI) : along * 0.2) + uTime * 0.13 + gap * 0.0015
    + (uRing ? 0.0 : 0.05 * sin(field.local.y * 0.009 + uTime));
  vec3 lab = paletteAt(flow);
  lab = mix(lab, uAhead, 0.5 * exp(-pow((gap - 30.0) / 50.0, 2.0)));
  lab = mix(lab, uBehind, 0.5 * exp(-pow((gap + 84.0) / 72.0, 2.0)));
  lab.yz *= 1.22;
  lab = mix(lab, vec3(0.99, 0.0, 0.0), 0.7 * exp(-pow((gap + 8.0) / 26.0, 2.0)));
  vec3 rimLab = paletteAt(around / (2.0 * PI) + uTime * (0.12 + 0.25 * uPulse) + inset * 0.0012);
  rimLab.yz *= 1.1;
  lab = mix(lab, rimLab, rim / (rim + band + 1e-4));
  vec3 rgb = oklabToSrgb(lab);
  if (hair > 0.0) {
    vec3 line = mix(oklabToSrgb(rimLab), vec3(1.0), uHairWhite * (0.5 + 0.5 * shimmer));
    rgb = (rgb * tinted * (1.0 - hair) + line * hair) / total;
  }
  float noise = dither(gl_FragCoord.xy) * 2.0 / 255.0;
  float over = clamp(total + noise, 0.0, 1.0);
  outColor = vec4(color * own * (1.0 - over) + clamp(rgb + noise, 0.0, 1.0) * over, 1.0 - (1.0 - own) * (1.0 - over));
}`;
