// The lens of the wave's shader (after distortion-waves' waveLens and
// waveBlurMask, MIT): the front's distance field, and the picture of the board
// read through the swell, split into a spectrum where it bends and blurred
// progressively around the front.

export const LENS_UNIFORMS = `
uniform vec2 uSize;
uniform vec2 uPixels;
uniform vec2 uOrigin;
uniform float uTilt;
uniform float uSpine;
uniform float uRadius;
uniform float uSquash;
uniform float uTime;
uniform float uEnergy;
uniform float uSwell;
uniform float uGravity;
uniform float uHold;
uniform bool uRing;
uniform bool uLens;
uniform sampler2D uSharp;
uniform sampler2D uNear;
uniform sampler2D uFar;
uniform float uAmplitude;
uniform float uLensWidth;
uniform float uAberration;
uniform float uBlur;
uniform float uBlurAhead;
uniform float uBlurBehind;
uniform float uNearBlur;
`;

export const LENS_FUNCTIONS = `
struct Field {
  float distance;
  vec2 normal;
  vec2 local;
  vec2 offset;
  float slope;
};

// A ring keeps its source clear, so the wave leaves from around it.
float heldAt(vec2 point) {
  if (uHold <= 0.0) return 1.0;
  return smoothstep(uHold * 0.9, uHold * 1.8, length(point - uOrigin));
}

Field fieldAt(vec2 point) {
  vec2 offset = point - uOrigin;
  float cs = cos(uTilt), sn = sin(uTilt);
  vec2 local = vec2(cs * offset.x + sn * offset.y, -sn * offset.x + cs * offset.y);
  float across = local.x * uSquash;
  vec2 fromSpine = vec2(max(abs(across) - uSpine, 0.0), local.y);
  float reach = max(length(fromSpine), 1e-3);
  vec2 gradient = vec2(fromSpine.x * sign(local.x) * uSquash, fromSpine.y) / reach;
  float slope = max(length(gradient), 1e-3);
  float bend;
  if (uRing) {
    float angle = atan(local.y, local.x);
    bend = 0.62 * sin(2.0 * angle + uTime * 1.1) + 0.38 * sin(3.0 * angle - uTime * 1.5 + 1.7);
  } else {
    float along = across * 0.0058;
    bend = 0.62 * sin(along + uTime * 1.1) + 0.38 * sin(along * 2.1 - uTime * 1.5 + 1.7);
  }
  vec2 normal = gradient / slope;
  Field field;
  field.distance = (reach - uRadius) / slope + uSwell * bend;
  field.normal = vec2(cs * normal.x - sn * normal.y, sn * normal.x + cs * normal.y);
  field.local = local;
  field.offset = offset;
  field.slope = slope;
  return field;
}

// The progressive blur: the near copy over the sharp one, the far over that.
// Every read names its level: inside branches that differ between pixels a
// plain texture() picks a wrong one, and draws their boundary as a dotted line.
vec3 screenAt(vec2 point, float near, float far) {
  vec2 uv = clamp(point, vec2(0.5), uSize - 0.5) / uSize;
  vec3 color = textureLod(uSharp, uv, 0.0).rgb;
  if (near > 0.0) color = mix(color, textureLod(uNear, uv, 0.0).rgb, near);
  if (far > 0.0) color = mix(color, textureLod(uFar, uv, 0.0).rgb, far);
  return color;
}

const vec3 spectrum[5] = vec3[5](
  vec3(0.571, 0.0, 0.0), vec3(0.343, 0.206, 0.0), vec3(0.086, 0.588, 0.086),
  vec3(0.0, 0.206, 0.343), vec3(0.0, 0.0, 0.571)
);

vec3 lensed(vec2 point, vec2 split, float near, float far) {
  if (dot(split, split) < 0.0625) return screenAt(point, near, far);
  vec3 color = vec3(0.0);
  for (int i = 0; i < 5; i++) {
    float along = float(i) / 2.0 - 1.0;
    color += screenAt(point + split * along, near, far) * spectrum[i];
  }
  return color;
}
`;
