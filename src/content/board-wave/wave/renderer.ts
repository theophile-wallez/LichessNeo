import { blurred, type BlurPasses } from './blur.ts';
import { oklab, type Palette } from './color.ts';
import type { Front } from './front.ts';
import { createTexture, deleteTarget, linkProgram, type Program, type Target } from './gl.ts';
import { MAIN_FRAGMENT } from './shaders/main.ts';
import { BLUR_FRAGMENT, COPY_FRAGMENT, QUAD_VERTEX } from './shaders/passes.ts';
import type { WaveStyle } from './style.ts';

// Draws the wave over the board on a clear WebGL 2 canvas (after
// distortion-waves' renderer, MIT). The board's picture and its two blurred
// copies are made once; each frame is then one draw over the canvas.

/** The near copy's blur, in points. */
const NEAR_BLUR = 7;
const MAX_COLORS = 9;

interface Picture {
  readonly sharp: WebGLTexture;
  readonly near: Target;
  readonly far: Target;
}

export interface Frame {
  readonly front: Front;
  readonly style: WaveStyle;
  readonly lumps: Float32Array;
  /** How far the lens is in, 0 to 1: it eases in when the picture comes late. */
  readonly gain: number;
}

/** The area in points, which the shader works in. */
export interface Area {
  readonly width: number;
  readonly height: number;
}

const paletteValues = (palette: Palette): Float32Array =>
  new Float32Array(palette.colors.slice(0, MAX_COLORS).flatMap(oklab));

export class WaveRenderer {
  readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly passes: BlurPasses;
  private readonly main: Program;
  private readonly blank: WebGLTexture;
  private picture: Picture | null = null;
  private area: Area = { width: 1, height: 1 };

  private constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.canvas = canvas;
    this.gl = gl;
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const drawQuad = (): void => {
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    this.passes = {
      gl,
      copy: linkProgram(gl, QUAD_VERTEX, COPY_FRAGMENT),
      blur: linkProgram(gl, QUAD_VERTEX, BLUR_FRAGMENT),
      drawQuad,
    };
    this.main = linkProgram(gl, QUAD_VERTEX, MAIN_FRAGMENT);
    this.blank = createTexture(gl, { width: 1, height: 1 });
  }

  /** A renderer on `canvas`, or null where WebGL 2 isn't to be had. */
  static create(canvas: HTMLCanvasElement): WaveRenderer | null {
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      premultipliedAlpha: true,
      alpha: true,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return null;
    try {
      return new WaveRenderer(canvas, gl);
    } catch (error) {
      console.warn('[LichessNeo] board wave', error);
      return null;
    }
  }

  /** The GPU dropped the context (a sleep, a driver reset): it draws nothing any more. */
  get lost(): boolean {
    return this.gl.isContextLost();
  }

  get maxTextureSize(): number {
    const size: unknown = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
    return typeof size === 'number' ? size : 4096;
  }

  setArea(area: Area): void {
    this.area = area;
  }

  /** The board's picture, drawn at the canvas's resolution, and its copies blurred by `blur` points and less. */
  setPicture(source: HTMLCanvasElement, blur: number): void {
    this.dropPicture();
    const { gl, passes } = this;
    const { width, height } = source;
    const sharp = createTexture(gl, { width, height, source });
    const pixelsPerPoint = width / this.area.width;
    const copy = (points: number): Target =>
      blurred(passes, { source: sharp, width, height, sigma: points * pixelsPerPoint });
    this.picture = { sharp, near: copy(NEAR_BLUR), far: copy(Math.max(blur, NEAR_BLUR)) };
  }

  clear(): void {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  render({ front, style, lumps, gain }: Frame): void {
    const { gl, main } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(main.program);
    this.bindPicture();
    const lensGain = this.picture ? Math.min(Math.max(gain, 0), 1) : 0;
    const energy = front.energy * lensGain;
    const gravity = front.gravity * lensGain;
    gl.uniform2f(main.uniform('uSize'), this.area.width, this.area.height);
    gl.uniform2f(main.uniform('uPixels'), this.canvas.width, this.canvas.height);
    gl.uniform2f(main.uniform('uOrigin'), front.originX, front.originY);
    gl.uniform1i(main.uniform('uRing'), front.ring ? 1 : 0);
    gl.uniform1i(main.uniform('uLens'), energy > 0 || gravity > 0 ? 1 : 0);
    this.setFloats({
      uTilt: front.tilt,
      uSpine: front.spine,
      uRadius: front.radius,
      uSquash: front.squash,
      uTime: front.time,
      uEnergy: energy,
      uSwell: front.swell,
      uGravity: gravity,
      uHold: front.hold,
      uGlow: front.glow,
      uClear: front.clearRadius,
      uHairClear: front.hairClearRadius,
      uRim: front.rim,
      uBlur: energy > 0 ? Math.max(style.blur, NEAR_BLUR) : 0,
      uNearBlur: NEAR_BLUR,
    });
    this.setStyle(style);
    gl.uniform3fv(main.uniform('uLumps'), lumps);
    this.passes.drawQuad();
  }

  /** Kept for the next wave: its programs stay, its picture and its canvas's pixels go. */
  park(): void {
    this.dropPicture();
    this.canvas.width = 1;
    this.canvas.height = 1;
  }

  /** Frees the GPU's memory and gives the context back: browsers allow only so many. */
  dispose(): void {
    const { gl } = this;
    this.dropPicture();
    gl.deleteTexture(this.blank);
    for (const program of [this.main, this.passes.copy, this.passes.blur])
      gl.deleteProgram(program.program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  private bindPicture(): void {
    const { gl, main, picture } = this;
    const textures = picture
      ? [picture.sharp, picture.near.texture, picture.far.texture]
      : [this.blank, this.blank, this.blank];
    for (const [i, name] of ['uSharp', 'uNear', 'uFar'].entries()) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, textures[i] ?? this.blank);
      gl.uniform1i(main.uniform(name), i);
    }
  }

  private setStyle(style: WaveStyle): void {
    const { gl, main } = this;
    const { palette } = style;
    gl.uniform3fv(main.uniform('uPalette'), paletteValues(palette));
    gl.uniform1i(
      main.uniform('uPaletteSize'),
      Math.min(Math.max(palette.colors.length, 1), MAX_COLORS),
    );
    gl.uniform3fv(main.uniform('uAhead'), new Float32Array(oklab(palette.ahead)));
    gl.uniform3fv(main.uniform('uBehind'), new Float32Array(oklab(palette.behind)));
    this.setFloats({
      uAmplitude: style.amplitude,
      uLensWidth: style.lensWidth,
      uAberration: style.aberration,
      uBlurAhead: style.blurAhead,
      uBlurBehind: style.blurBehind,
      uLead: style.lead,
      uTail: style.tail,
      uStrength: style.strength,
      uRimWidth: style.rimWidth,
      uRimSoftness: style.rimSoftness,
      uCorner: style.cornerRadius,
      uUneven: style.rimUnevenness,
      uPulse: style.rimPulse,
      uHairWidth: style.hairlineWidth,
      uHairOpacity: style.hairlineOpacity,
      uHairWhite: style.hairlineWhite,
    });
  }

  private setFloats(values: Readonly<Record<string, number>>): void {
    for (const [name, value] of Object.entries(values))
      this.gl.uniform1f(this.main.uniform(name), value);
  }

  private dropPicture(): void {
    const { gl, picture } = this;
    if (!picture) return;
    gl.deleteTexture(picture.sharp);
    deleteTarget(gl, picture.near);
    deleteTarget(gl, picture.far);
    this.picture = null;
  }
}
