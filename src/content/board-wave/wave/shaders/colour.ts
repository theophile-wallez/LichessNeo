import { LUMPS } from '#content/board-wave/wave/rim.ts';

// The colour of the wave's shader (after distortion-waves' waveBand, MIT): the
// band on the front, the rim along the area's rounded edges with its uneven
// lumps, and the hairline on the glass, blended in Oklab.

export const COLOUR_UNIFORMS = `
uniform float uGlow;
uniform float uClear;
uniform float uHairClear;
uniform float uRim;
uniform vec3 uPalette[9];
uniform int uPaletteSize;
uniform vec3 uAhead;
uniform vec3 uBehind;
uniform float uLead;
uniform float uTail;
uniform float uStrength;
uniform float uRimWidth;
uniform float uRimSoftness;
uniform float uCorner;
uniform float uUneven;
uniform float uPulse;
uniform float uHairWidth;
uniform float uHairOpacity;
uniform float uHairWhite;
uniform vec3 uLumps[${LUMPS}];
`;

export const COLOUR_FUNCTIONS = `
const float PI = 3.14159265;

float edgeDistance(vec2 point, vec2 halfSize, float radius) {
  float corner = min(radius, min(halfSize.x, halfSize.y));
  vec2 inside = abs(point) - (halfSize - corner);
  return length(max(inside, 0.0)) + min(max(inside.x, inside.y), 0.0) - corner;
}

// How far along the perimeter a point near the edge is, and the perimeter.
vec2 perimeterAt(vec2 point, vec2 halfSize, float radius) {
  float straightX = max(halfSize.x - radius, 0.0);
  float straightY = max(halfSize.y - radius, 0.0);
  float arc = 0.5 * PI * radius;
  float perimeter = 4.0 * (straightX + straightY + arc);
  float ax = abs(point.x), ay = abs(point.y);
  if (ax > straightX && ay > straightY) {
    vec2 fromCorner = point - vec2(sign(point.x) * straightX, sign(point.y) * straightY);
    float angle, start;
    if (point.x >= 0.0 && point.y < 0.0) { angle = atan(fromCorner.x, -fromCorner.y); start = straightX; }
    else if (point.x >= 0.0) { angle = atan(fromCorner.y, fromCorner.x); start = straightX + arc + 2.0 * straightY; }
    else if (point.y >= 0.0) { angle = atan(-fromCorner.x, fromCorner.y); start = 3.0 * straightX + 2.0 * arc + 2.0 * straightY; }
    else { angle = atan(-fromCorner.y, -fromCorner.x); start = 3.0 * straightX + 3.0 * arc + 4.0 * straightY; }
    return vec2(start + radius * clamp(angle, 0.0, 0.5 * PI), perimeter);
  }
  bool onSide = ax > straightX ? true : (ay > straightY ? false : (halfSize.x - ax) < (halfSize.y - ay));
  if (onSide) {
    return vec2(point.x >= 0.0
      ? straightX + arc + (point.y + straightY)
      : 3.0 * straightX + 3.0 * arc + 2.0 * straightY + (straightY - point.y), perimeter);
  }
  return vec2(point.y < 0.0
    ? (point.x >= 0.0 ? point.x : perimeter + point.x)
    : straightX + 2.0 * arc + 2.0 * straightY + (straightX - point.x), perimeter);
}

float rimThickness(float along, float perimeter) {
  float thickness = 0.08;
  for (int i = 0; i < ${LUMPS}; i++) {
    float gap = along - uLumps[i].x;
    gap -= perimeter * floor(gap / perimeter + 0.5);
    float share = gap / uLumps[i].y;
    thickness += uLumps[i].z * exp(-share * share);
  }
  return thickness / 1.0498;
}

float dither(vec2 point) {
  return fract(52.9829189 * fract(dot(point, vec2(0.06711056, 0.00583715)))) - 0.5;
}

vec3 paletteAt(float along) {
  float place = fract(along) * float(uPaletteSize);
  int from = min(int(place), uPaletteSize - 1);
  int to = from + 1 == uPaletteSize ? 0 : from + 1;
  float share = fract(place);
  share = share * share * (3.0 - 2.0 * share);
  return mix(uPalette[from], uPalette[to], share);
}

vec3 oklabToSrgb(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  vec3 linear = clamp(vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ), 0.0, 1.0);
  return mix(12.92 * linear, 1.055 * pow(linear, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), linear));
}
`;
