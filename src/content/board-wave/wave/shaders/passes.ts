// The renderer's small passes: the full-canvas quad, a copy that downsamples
// from a mipmapped picture, and a gaussian blur, one axis per pass.

export const QUAD_VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

export const COPY_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTexture;
uniform float uLod;
out vec4 outColor;
void main() { outColor = textureLod(uTexture, vUv, uLod); }`;

// The input is downsampled first, so the kernel stays short.
export const BLUR_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTexture;
uniform vec2 uStep;
uniform float uSigma;
out vec4 outColor;
void main() {
  float reach = ceil(uSigma * 3.0);
  vec4 sum = vec4(0.0);
  float weights = 0.0;
  for (float i = -48.0; i <= 48.0; i += 1.0) {
    if (abs(i) > reach) continue;
    float weight = exp(-0.5 * i * i / (uSigma * uSigma));
    sum += texture(uTexture, vUv + uStep * i) * weight;
    weights += weight;
  }
  outColor = sum / weights;
}`;
