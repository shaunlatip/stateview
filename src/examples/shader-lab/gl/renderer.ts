import type { Effect } from "../fixtures";
import { renderCpu } from "./cpu";
import { COPY, PASSES, VERTEX, isAnimated, type FrameInfo } from "./shaders";

/**
 * A small WebGL2 renderer for the Shader Lab stage, shaped like shader-lab's
 * GL engine: an offscreen WebGL2 canvas runs the effect stack over a
 * ping-pong pair of framebuffers, and the result is drawn into the visible
 * 2D canvas. When WebGL2 isn't there, or a frame throws, it falls back to the
 * CPU path in cpu.ts, as the app's `createEngine` and Stage do.
 *
 * Unlike the app it also handles `webglcontextlost` (keeps the picture on the
 * CPU path, then rebuilds on `webglcontextrestored`) and releases the context
 * with WEBGL_lose_context when disposed, so remounting the screen for every
 * Stateview state never piles up contexts.
 */

export type Engine = "gl" | "cpu";
/** The renderer states Stateview can force; everything but "webgl" only happens in code. */
export type Simulate = "webgl" | "unavailable" | "context-lost" | "shader-error";

type Program = { prog: WebGLProgram; at: (name: string) => WebGLUniformLocation | null };
type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer };

/** Live WebGL contexts made by this module, so a test can prove they're released. */
let liveContexts = 0;
export const liveGlContexts = () => liveContexts;

/** How long the simulated context loss lasts before the browser hands it back. */
const RESTORE_AFTER_MS = 1500;

export class StageRenderer {
  engine: Engine = "gl";
  private gl: WebGL2RenderingContext | null = null;
  private glCanvas: HTMLCanvasElement | null = null;
  private loseExt: WEBGL_lose_context | null = null;
  private lost = false;
  private disposed = false;
  private programs = new Map<string, Program>();
  private vao: WebGLVertexArrayObject | null = null;
  private buffer: WebGLBuffer | null = null;
  private baseTex: WebGLTexture | null = null;
  private targets: Target[] = [];
  private size = "";
  private scratch: HTMLCanvasElement | null = null;
  private baseKey = "";
  private uploadedKey = "";
  private simulatedLoss = false;
  private restoreTimer: ReturnType<typeof setTimeout> | undefined;
  private last: { target: HTMLCanvasElement; img: HTMLImageElement; stack: Effect[]; W: number; H: number; t: number } | null = null;

  constructor(
    private readonly simulate: Simulate,
    private readonly onEngine: (engine: Engine, why: string) => void,
  ) {
    try {
      // "unavailable" stands in for a browser without WebGL2: the same throw
      // shader-lab's createEngine catches before falling back to its CPU engine.
      if (simulate === "unavailable") throw new Error("WebGL2 unavailable");
      this.setUpContext();
    } catch {
      this.engine = "cpu";
    }
  }

  /** True when the stack has an effect that moves (grain with Animate on) and the GL path can drive it. */
  wantsAnimation(stack: Effect[]) {
    return this.engine === "gl" && stack.some((e) => e.enabled && isAnimated(e.type, e.params));
  }

  /** Draw `stack` over `img` (cover-fit) into `target` at W×H device pixels; `t` is seconds, for grain. */
  render(target: HTMLCanvasElement, img: HTMLImageElement, stack: Effect[], W: number, H: number, t: number) {
    if (this.disposed) return;
    this.last = { target, img, stack, W, H, t };
    const base = this.coverFit(img, W, H);
    if (target.width !== W) target.width = W;
    if (target.height !== H) target.height = H;
    const out = target.getContext("2d");
    if (!out) return;

    if (this.engine === "gl" && this.gl && !this.lost && !this.gl.isContextLost()) {
      try {
        this.renderGl(this.gl, base, stack, W, H, t);
        out.clearRect(0, 0, W, H);
        out.drawImage(this.glCanvas as HTMLCanvasElement, 0, 0);
        this.afterFirstGlFrame();
        return;
      } catch (err) {
        // Mirrors Stage's renderFrame catch: warn, drop to the CPU engine for good.
        console.warn("[shader-lab] GL render failed — falling back to CPU engine:", err);
        this.releaseContext();
        this.engine = "cpu";
        this.onEngine("cpu", "render-failed");
      }
    }
    const frame: FrameInfo = { w: W, h: H, u: W / 1000, t };
    const src = base.getContext("2d")?.getImageData(0, 0, W, H);
    if (src) out.putImageData(renderCpu(src, stack, frame), 0, 0);
  }

  dispose() {
    this.disposed = true;
    clearTimeout(this.restoreTimer);
    this.releaseContext();
    this.scratch = null;
    this.last = null;
  }

  // ------------------------------------------------------------- context lifecycle

  private setUpContext() {
    const canvas = document.createElement("canvas");
    // Same attributes as shader-lab's GLContext: opaque, readable, no MSAA.
    const gl = canvas.getContext("webgl2", { alpha: false, preserveDrawingBuffer: true, antialias: false });
    if (!gl) throw new Error("WebGL2 unavailable");
    liveContexts += 1;
    this.glCanvas = canvas;
    this.gl = gl;
    this.loseExt = gl.getExtension("WEBGL_lose_context");
    canvas.addEventListener("webglcontextlost", this.handleLost);
    canvas.addEventListener("webglcontextrestored", this.handleRestored);
    this.buildResources(gl);
  }

  private buildResources(gl: WebGL2RenderingContext) {
    this.programs.clear();
    this.targets = [];
    this.size = "";
    this.uploadedKey = "";
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    // One triangle that covers the viewport.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.baseTex = this.texture(gl);
  }

  private handleLost = (event: Event) => {
    // Without preventDefault the browser never offers the context back.
    event.preventDefault();
    this.lost = true;
    if (this.engine === "gl") {
      this.engine = "cpu";
      this.onEngine("cpu", "context-lost");
    }
    // Keep the picture: redraw the last frame on the CPU path.
    if (this.last) {
      const { target, img, stack, W, H, t } = this.last;
      this.render(target, img, stack, W, H, t);
    }
  };

  private handleRestored = () => {
    if (this.disposed || !this.gl) return;
    this.lost = false;
    this.buildResources(this.gl);
    this.engine = "gl";
    this.onEngine("gl", "context-restored");
    if (this.last) {
      const { target, img, stack, W, H, t } = this.last;
      this.render(target, img, stack, W, H, t);
    }
  };

  /** The code-only states: lose the context once the first GL frame is up, or break a shader. */
  private afterFirstGlFrame() {
    if (this.simulate !== "context-lost" || this.simulatedLoss || !this.loseExt) return;
    this.simulatedLoss = true;
    const ext = this.loseExt;
    // Defer so the first frame paints before the loss lands.
    setTimeout(() => {
      if (this.disposed) return;
      ext.loseContext();
      this.restoreTimer = setTimeout(() => {
        if (!this.disposed && this.lost) ext.restoreContext();
      }, RESTORE_AFTER_MS);
    }, 0);
  }

  private releaseContext() {
    const canvas = this.glCanvas;
    const gl = this.gl;
    if (!canvas || !gl) return;
    canvas.removeEventListener("webglcontextlost", this.handleLost);
    canvas.removeEventListener("webglcontextrestored", this.handleRestored);
    if (!gl.isContextLost()) {
      for (const { prog } of this.programs.values()) gl.deleteProgram(prog);
      for (const { tex, fbo } of this.targets) {
        gl.deleteTexture(tex);
        gl.deleteFramebuffer(fbo);
      }
      gl.deleteTexture(this.baseTex);
      gl.deleteBuffer(this.buffer);
      gl.deleteVertexArray(this.vao);
      this.loseExt?.loseContext();
    }
    canvas.width = 1;
    canvas.height = 1;
    this.programs.clear();
    this.targets = [];
    this.gl = null;
    this.glCanvas = null;
    this.loseExt = null;
    liveContexts = Math.max(0, liveContexts - 1);
  }

  // ------------------------------------------------------------- drawing

  /** Cover-fit the source into a W×H scratch canvas: the frame every engine starts from. */
  private coverFit(img: HTMLImageElement, W: number, H: number) {
    const key = `${img.currentSrc || img.src}@${W}x${H}`;
    if (this.scratch && this.baseKey === key) return this.scratch;
    const canvas = this.scratch ?? document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }
    this.scratch = canvas;
    this.baseKey = key;
    return canvas;
  }

  private texture(gl: WebGL2RenderingContext) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private ensureTargets(gl: WebGL2RenderingContext, W: number, H: number) {
    const size = `${W}x${H}`;
    if (this.size === size) return;
    for (const { tex, fbo } of this.targets) {
      gl.deleteTexture(tex);
      gl.deleteFramebuffer(fbo);
    }
    this.targets = [0, 1].map(() => {
      const tex = this.texture(gl);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { tex, fbo };
    });
    this.size = size;
  }

  private program(gl: WebGL2RenderingContext, key: string, frag: string): Program {
    const hit = this.programs.get(key);
    if (hit) return hit;
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) throw new Error("createShader failed");
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        throw new Error(`${key} shader failed to compile: ${log ?? "no log"}`);
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl.FRAGMENT_SHADER, frag);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "a_pos");
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`${key} program failed to link: ${gl.getProgramInfoLog(prog)}`);
    const cache = new Map<string, WebGLUniformLocation | null>();
    const at = (name: string) => {
      if (!cache.has(name)) cache.set(name, gl.getUniformLocation(prog, name));
      return cache.get(name) ?? null;
    };
    const entry = { prog, at };
    this.programs.set(key, entry);
    return entry;
  }

  private renderGl(gl: WebGL2RenderingContext, base: HTMLCanvasElement, stack: Effect[], W: number, H: number, t: number) {
    const canvas = this.glCanvas as HTMLCanvasElement;
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    this.ensureTargets(gl, W, H);
    gl.bindVertexArray(this.vao);
    gl.viewport(0, 0, W, H);

    // Upload the cover-fit source, FLIP_Y so its top row is v_uv.y = 1.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.baseTex);
    if (this.uploadedKey !== this.baseKey) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, base);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      this.uploadedKey = this.baseKey;
    }

    const frame: FrameInfo = { w: W, h: H, u: W / 1000, t };
    const draw = (prog: Program, src: WebGLTexture | null, dst: WebGLFramebuffer | null) => {
      gl.useProgram(prog.prog);
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src);
      gl.uniform1i(prog.at("u_tex"), 0);
      gl.uniform2f(prog.at("u_texel"), 1 / W, 1 / H);
      gl.uniform2f(prog.at("u_dims"), W, H);
      gl.uniform1f(prog.at("u_unit"), frame.u);
      gl.uniform1f(prog.at("u_time"), t);
    };

    let cur = this.baseTex;
    let flip = 0;
    for (const effect of stack) {
      if (!effect.enabled) continue;
      const pass = PASSES[effect.type];
      // "shader-error": the first pass compiles from a broken source, as a bad edit to a pass would.
      const broken = this.simulate === "shader-error";
      const prog = this.program(gl, broken ? `${effect.type}:broken` : effect.type, broken ? `${pass.frag}\n#error simulated compile failure` : pass.frag);
      const dst = this.targets[flip];
      draw(prog, cur, dst.fbo);
      pass.set(gl, prog.at, effect.params, frame);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      cur = dst.tex;
      flip = 1 - flip;
    }
    // Present to the default framebuffer.
    const copy = this.program(gl, "copy", COPY);
    draw(copy, cur, null);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
