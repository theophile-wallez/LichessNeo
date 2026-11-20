import { createTarget, deleteTarget, type Program, type Target } from './gl.ts';

// The picture's blurred copies, made on the GPU once per picture: each is
// downsampled so the kernel stays short, then blurred along x, then y.

export interface BlurPasses {
  readonly gl: WebGL2RenderingContext;
  readonly copy: Program;
  readonly blur: Program;
  /** Draws the full-canvas quad with the program in use. */
  readonly drawQuad: () => void;
}

export interface BlurRequest {
  readonly source: WebGLTexture;
  readonly width: number;
  readonly height: number;
  /** The blur's radius, in the picture's pixels. */
  readonly sigma: number;
}

/** A blurred copy of `request.source`, in a target the caller deletes. */
export function blurred(passes: BlurPasses, { source, width, height, sigma }: BlurRequest): Target {
  const { gl, copy, blur, drawQuad } = passes;
  const factor = Math.max(1, Math.round(sigma / 5));
  const smallWidth = Math.max(1, Math.round(width / factor));
  const smallHeight = Math.max(1, Math.round(height / factor));
  const result = createTarget(gl, smallWidth, smallHeight);
  const scratch = createTarget(gl, smallWidth, smallHeight);
  gl.viewport(0, 0, smallWidth, smallHeight);
  gl.activeTexture(gl.TEXTURE0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, result.framebuffer);
  gl.bindTexture(gl.TEXTURE_2D, source);
  gl.useProgram(copy.program);
  gl.uniform1i(copy.uniform('uTexture'), 0);
  gl.uniform1f(copy.uniform('uLod'), Math.log2(factor));
  drawQuad();

  gl.useProgram(blur.program);
  gl.uniform1i(blur.uniform('uTexture'), 0);
  gl.uniform1f(blur.uniform('uSigma'), Math.max(sigma / factor, 0.01));
  gl.bindFramebuffer(gl.FRAMEBUFFER, scratch.framebuffer);
  gl.bindTexture(gl.TEXTURE_2D, result.texture);
  gl.uniform2f(blur.uniform('uStep'), 1 / smallWidth, 0);
  drawQuad();
  gl.bindFramebuffer(gl.FRAMEBUFFER, result.framebuffer);
  gl.bindTexture(gl.TEXTURE_2D, scratch.texture);
  gl.uniform2f(blur.uniform('uStep'), 0, 1 / smallHeight);
  drawQuad();

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  deleteTarget(gl, scratch);
  return result;
}
