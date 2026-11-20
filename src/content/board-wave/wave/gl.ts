// WebGL 2's plumbing for the wave's renderer: programs whose uniforms are
// looked up once, textures, and the framebuffers the blur draws into.

export interface Program {
  readonly program: WebGLProgram;
  readonly uniform: (name: string) => WebGLUniformLocation | null;
}

function compile(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('board wave: no shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true)
    throw new Error(`board wave: ${gl.getShaderInfoLog(shader) ?? 'shader'}`);
  return shader;
}

export function linkProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string): Program {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true)
    throw new Error(`board wave: ${gl.getProgramInfoLog(program) ?? 'link'}`);
  const locations = new Map<string, WebGLUniformLocation | null>();
  const uniform = (name: string): WebGLUniformLocation | null => {
    if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name));
    return locations.get(name) ?? null;
  };
  return { program, uniform };
}

export interface TextureSpec {
  readonly width: number;
  readonly height: number;
  /** Drawn into the texture, which then gets its mipmaps; an empty one of the size otherwise. */
  readonly source?: TexImageSource;
}

export function createTexture(gl: WebGL2RenderingContext, spec: TextureSpec): WebGLTexture {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  const { source } = spec;
  if (source) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  else
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      spec.width,
      spec.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
  const minify = source ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minify);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (source) gl.generateMipmap(gl.TEXTURE_2D);
  return texture;
}

/** A texture to draw into. */
export interface Target {
  readonly texture: WebGLTexture;
  readonly framebuffer: WebGLFramebuffer;
  readonly width: number;
  readonly height: number;
}

export function createTarget(gl: WebGL2RenderingContext, width: number, height: number): Target {
  const texture = createTexture(gl, { width, height });
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  return { texture, framebuffer, width, height };
}

export function deleteTarget(gl: WebGL2RenderingContext, target: Target): void {
  gl.deleteTexture(target.texture);
  gl.deleteFramebuffer(target.framebuffer);
}
