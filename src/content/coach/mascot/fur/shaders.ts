// Shell fur: the same surface drawn as many shells, each pushed a little further
// along the normal, keeping only the pixels that fall inside a strand
// (fur.ts builds the material, strands.ts the strand texture).

export const FUR_VERTEX = /* glsl */ `
attribute float layer;
uniform float uLength;
uniform float uPuff;
uniform vec3 uBend;
uniform int uMode;
uniform vec2 uFace;
uniform float uPalm;
uniform vec2 uFaceSize;
uniform vec2 uFront;
uniform float uTipFrom;
uniform vec3 uStripes;
varying vec3 vBase;
varying vec3 vNormalW;
varying vec3 vPosW;
varying float vLayer;
varying float vCream;
varying float vAccent;

// How much of the front color a point takes: the body's belly and face, a tail's tip.
float frontMask(vec3 p, vec3 n) {
  if (uMode == 1 || uMode == 3) return 0.0;
  if (uMode == 2) return 1.0;
  if (uMode == 4) return smoothstep(uTipFrom - 0.08, uTipFrom + 0.08, p.y);
  float top = smoothstep(0.3, 1.1, p.y);
  float threshold = mix(uFront.x, uFront.y, top);
  return smoothstep(threshold - 0.22, threshold + 0.14, n.z);
}

void main() {
  vec3 n = normalize(normal);
  float cream = frontMask(position, n);
  float face = 0.0;
  if (uMode == 0) {
    vec2 d = (position.xy - uFace) / uFaceSize;
    face = (1.0 - smoothstep(0.55, 1.0, length(d))) * smoothstep(0.0, 0.3, n.z);
  }
  // A paw's palm is bare, so its pads show.
  float palm = uPalm * smoothstep(0.3, 0.42, -position.y) * smoothstep(0.2, 0.6, n.z);
  face = max(face, palm);
  // Seen edge-on, the shells of a surface facing down streak like long hair: keep it short.
  float under = mix(0.45, 1.0, smoothstep(-0.7, 0.1, n.y));
  // The front is short and velvety like the face, the coat fluffier.
  float velvet = max(face, cream);
  float len = uLength * under * mix(1.0, 0.28, velvet) * (1.0 + uPuff);
  float h = layer;
  // Combed down along the skin, so head-on it reads as hair rather than dots.
  vec3 down = vec3(0.0, -1.0, 0.0);
  vec3 comb = normalize(down - n * dot(n, down) + vec3(0.0, 0.0, 0.001));
  vec3 p = position + n * len * h + (uBend + comb * 0.45) * len * h * h;
  vBase = position;
  vLayer = h;
  vCream = cream;
  vAccent = uMode == 3 ? 1.0 : 0.0;
  if (uMode == 0 && uStripes.x > 0.0) {
    // A bee's bands, between two heights.
    float band = smoothstep(-0.2, 0.2, sin(position.y * uStripes.x * 6.2832 + 1.2));
    float within = smoothstep(uStripes.y - 0.05, uStripes.y + 0.05, position.y)
      * (1.0 - smoothstep(uStripes.z - 0.05, uStripes.z + 0.05, position.y));
    vAccent = band * within * (1.0 - face);
  }
  vec4 world = modelMatrix * vec4(p, 1.0);
  vPosW = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const FUR_FRAGMENT = /* glsl */ `
uniform vec3 uCoat;
uniform vec3 uFrontColor;
uniform vec3 uAccent;
uniform vec3 uCoatTip;
uniform vec3 uFrontTip;
uniform vec3 uAccentTip;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uSky;
uniform vec3 uGround;
uniform float uDensity;
uniform highp sampler3D uStrands;
varying vec3 vBase;
varying vec3 vNormalW;
varying vec3 vPosW;
varying float vLayer;
varying float vCream;
varying float vAccent;

// Distance to the nearest strand root, and that strand's random number, read
// from a tiling texture computed once rather than searched per pixel. It
// repeats every few strands: two reads, one turned askew, hide it, each spread
// out by the cube root of 2 so together they keep the density.
const mat3 ASKEW = mat3(0.36, 0.48, -0.8, -0.8, 0.6, 0.0, 0.48, 0.64, 0.6);
const float SPREAD = 0.7937;
vec2 cells(vec3 p) {
  vec3 q = p * SPREAD;
  vec2 straight = texture(uStrands, q / STRAND_CELLS).rg;
  vec2 askew = texture(uStrands, (ASKEW * q + 5.3) / STRAND_CELLS).rg;
  vec2 nearest = straight.r < askew.r ? straight : askew;
  return vec2(nearest.r * STRAND_RANGE / SPREAD, nearest.g);
}

void main() {
  float h = vLayer;
  vec2 fine = cells(vBase * uDensity);
  float alpha = 1.0;
  if (h > 0.0) {
    float strandLength = mix(0.6, 1.0, fine.y);
    float radius = 1.15 * (1.0 - h / strandLength);
    alpha = 1.0 - smoothstep(radius - 0.2, radius, fine.x);
    if (alpha < 0.02) discard;
  }
  float cream = clamp(vCream + (fine.y - 0.5) * 0.12, 0.0, 1.0);
  vec3 base = mix(mix(uCoat, uFrontColor, cream), uAccent, vAccent);
  vec3 tip = mix(mix(uCoatTip, uFrontTip, cream), uAccentTip, vAccent);
  vec3 albedo = mix(base, tip, h * h) * (0.94 + 0.12 * fine.y);
  vec3 n = normalize(vNormalW);
  vec3 v = normalize(cameraPosition - vPosW);
  float wrap = max(0.0, (dot(n, uLightDir) + 0.45) / 1.45);
  vec3 ambient = mix(uGround, uSky, n.y * 0.5 + 0.5);
  float occlusion = mix(0.64, 1.0, pow(h, 0.7));
  vec3 color = albedo * (ambient * 0.6 + uLightColor * wrap * 0.85) * occlusion;
  float rim = pow(1.0 - max(dot(n, v), 0.0), 2.5);
  color += tip * uLightColor * rim * 0.28 * h;
  gl_FragColor = vec4(color, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
