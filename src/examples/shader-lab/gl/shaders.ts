import type { EffectType, GradientStop, Params } from "../fixtures";

/**
 * Fragment shaders ported from shader-lab's GL engine
 * (`src/lib/bg-lab/engine/gl/passes/*.ts` at 2e0708c), with the same
 * uniforms and the same uniform setters. Each pass reads the previous pass
 * from `u_tex` and draws one full-screen triangle.
 *
 * Ported: halftone (mono + CMYK, passes/halftone.ts), ordered dither
 * (passes/dither.ts, without the blue-noise table), gradient map, adjust,
 * posterize, grayscale (passes/color.ts), grain and vignette (passes/post.ts).
 */

export const VERTEX = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main(){ v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;

/** Shared prelude (gl/common.ts HEADER): v_uv.y === 1 is the top of the output. */
const HEADER = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_texel;
uniform vec2 u_dims;
uniform float u_unit;
uniform float u_time;
out vec4 o;
float luma601(vec3 c){ return 0.299*c.r+0.587*c.g+0.114*c.b; }
float luma709(vec3 c){ return 0.2126*c.r+0.7152*c.g+0.0722*c.b; }
vec3  toLin(vec3 s){ return pow(max(s,0.0), vec3(2.2)); }
vec3  toSRGB(vec3 l){ return pow(max(l,0.0), vec3(1.0/2.2)); }
`;

const frag = (body: string) => HEADER + body;

export const COPY = frag(`void main(){ o = texture(u_tex, v_uv); }`);

// ---------------------------------------------------------------- param helpers (cpu/util.ts pn/ps/pb)

export const pn = (p: Params, k: string, d: number) => (typeof p[k] === "number" ? (p[k] as number) : d);
export const ps = (p: Params, k: string, d: string) => (typeof p[k] === "string" ? (p[k] as string) : d);
export const pb = (p: Params, k: string, d: boolean) => (typeof p[k] === "boolean" ? (p[k] as boolean) : d);
export const pstops = (p: Params, k: string): GradientStop[] => (Array.isArray(p[k]) ? (p[k] as GradientStop[]) : []);

export function hexRGB(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h.padEnd(6, "0");
  const n = Number.parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const rgb01 = (hex: string) => hexRGB(hex).map((v) => v / 255) as [number, number, number];

export const BLEND_INDEX: Record<string, number> = { multiply: 0, screen: 1, overlay: 2, "soft-light": 3, color: 4 };
export const HALFTONE_SHAPES = ["circle", "ring", "line", "square", "diamond"];
export const DITHER_TYPES: Record<string, number> = { bayer2: 0, bayer4: 1, bayer8: 2, stripes: 4, crossStripe: 5 };

/** What a uniform setter gets: the frame's pixel size, unit (= width / 1000) and time in seconds. */
export type FrameInfo = { w: number; h: number; u: number; t: number };
type Uniform = (name: string) => WebGLUniformLocation | null;
export type Pass = { frag: string; set: (gl: WebGL2RenderingContext, at: Uniform, p: Params, f: FrameInfo) => void };

/** Grain re-seeds at 24fps while `animate` is on; it's the only ported effect that moves. */
export function grainFrame(p: Params, t: number) {
  return pb(p, "animate", true) ? Math.floor(t * 24) : 0;
}

export function isAnimated(type: EffectType, p: Params) {
  return type === "grain" && p.animate === true;
}

// ---------------------------------------------------------------- halftone (mono + CMYK)
// Screen rotated about the canvas centre, cell-centre coverage sampled NEAREST
// in perceptual sRGB, 1px linear AA on the SDF, a 3x3 cell neighbourhood so
// dots can overlap. CMYK runs four screens (C15 M75 Y0 K45) multiplied over white.
const halftone: Pass = {
  frag: frag(`uniform float u_cell; uniform float u_angle; uniform float u_contrast; uniform int u_shape;
uniform float u_stagger; uniform float u_invert; uniform float u_mode; uniform vec3 u_ink; uniform vec3 u_paper;
uniform float u_rscale; uniform float u_gooeyK; uniform float u_combine;
float dotSDF(vec2 cc, float r, int shape){
  if(shape==3) return max(abs(cc.x),abs(cc.y)) - r;
  if(shape==4) return abs(cc.x)+abs(cc.y) - r;
  if(shape==2) return abs(cc.y) - r*0.5;
  if(shape==1){ float d=length(cc); return max(d - r, r*0.55 - d); }
  return length(cc) - r;
}
float aaCov(float dPx){ return clamp(0.5 - dPx, 0.0, 1.0); }
float smin(float a, float b, float k){ float h = max(k - abs(a-b), 0.0)/k; return min(a,b) - h*h*k*0.25; }
vec3 cellSource(vec2 Pc){
  vec2 idx = clamp(floor(Pc + 0.5), vec2(0.0), u_dims - 1.0);
  return texture(u_tex, vec2((idx.x+0.5)/u_dims.x, 1.0 - (idx.y+0.5)/u_dims.y)).rgb;
}
void cmykScreen(inout vec3 res, vec2 P, vec2 ctr, float cell, float angDeg, vec3 inkCol, int chan){
  float ang = radians(angDeg), cs = cos(ang), sn = sin(ang);
  vec2 dP = P - ctr;
  vec2 Q = vec2(cs*dP.x + sn*dP.y, -sn*dP.x + cs*dP.y);
  float diag = ceil(sqrt(dot(u_dims, u_dims)));
  float A = -0.5*diag + 0.5*cell;
  float kx0 = floor((Q.x - A)/cell + 0.5), ky0 = floor((Q.y - A)/cell + 0.5);
  float dAcc = 1e9;
  for(int dy=-1; dy<=1; dy++){
    float ky = ky0 + float(dy);
    float rowOff = (u_stagger > 0.5 && mod(ky,2.0) > 0.5) ? 0.5*cell : 0.0;
    for(int dx=-1; dx<=1; dx++){
      float kx = kx0 + float(dx);
      vec2 C = vec2(A + rowOff + kx*cell, A + ky*cell);
      vec2 cc = (Q - C)/cell;
      vec3 src = cellSource(vec2(cs*C.x - sn*C.y, sn*C.x + cs*C.y) + ctr);
      float k = min(1.0-src.r, min(1.0-src.g, 1.0-src.b));
      float cov;
      if(chan==3){ cov = k; }
      else { float denom = 1.0 - k; vec3 cmy = denom > 1e-6 ? (1.0 - src - k)/denom : vec3(0.0);
             cov = chan==0 ? cmy.x : (chan==1 ? cmy.y : cmy.z); }
      cov = (u_invert > 0.5) ? 1.0 - cov : cov;
      cov = pow(clamp(cov, 0.0, 1.0), u_contrast);
      float r = sqrt(cov) * u_rscale;
      if(r*cell <= 0.2) continue;
      float d = dotSDF(cc, r, u_shape);
      if(u_combine > 0.5){ dAcc = u_gooeyK > 0.0 ? smin(dAcc, d, u_gooeyK) : min(dAcc, d); }
      else res *= mix(vec3(1.0), inkCol, aaCov(d*cell));
    }
  }
  if(u_combine > 0.5) res *= mix(vec3(1.0), inkCol, aaCov(dAcc*cell));
}
void main(){
  float cell = max(2.0, u_cell);
  vec2 P = vec2(v_uv.x, 1.0 - v_uv.y) * u_dims;
  vec2 ctr = 0.5 * u_dims;
  if(u_mode > 0.5){
    vec3 res = vec3(1.0);
    cmykScreen(res, P, ctr, cell, 15.0, vec3(0.0, 0.6824, 0.9373), 0);
    cmykScreen(res, P, ctr, cell, 75.0, vec3(0.9255, 0.0, 0.5490), 1);
    cmykScreen(res, P, ctr, cell,  0.0, vec3(1.0, 0.9490, 0.0), 2);
    cmykScreen(res, P, ctr, cell, 45.0, vec3(0.1020, 0.1020, 0.1020), 3);
    o = vec4(res, 1.0); return;
  }
  float ang = radians(u_angle), cs = cos(ang), sn = sin(ang);
  vec2 dP = P - ctr;
  vec2 Q = vec2(cs*dP.x + sn*dP.y, -sn*dP.x + cs*dP.y);
  float diag = ceil(sqrt(dot(u_dims, u_dims)));
  float A = -0.5*diag + 0.5*cell;
  float kx0 = floor((Q.x - A)/cell + 0.5), ky0 = floor((Q.y - A)/cell + 0.5);
  float dAcc = 1e9;
  for(int dy=-1; dy<=1; dy++){
    float ky = ky0 + float(dy);
    float rowOff = (u_stagger > 0.5 && mod(ky,2.0) > 0.5) ? 0.5*cell : 0.0;
    for(int dx=-1; dx<=1; dx++){
      float kx = kx0 + float(dx);
      vec2 C = vec2(A + rowOff + kx*cell, A + ky*cell);
      vec2 cc = (Q - C)/cell;
      vec3 src = cellSource(vec2(cs*C.x - sn*C.y, sn*C.x + cs*C.y) + ctr);
      float cov = 1.0 - luma601(src);
      cov = (u_invert > 0.5) ? 1.0 - cov : cov;
      cov = pow(clamp(cov, 0.0, 1.0), u_contrast);
      float r = sqrt(cov) * u_rscale;
      if(r*cell <= 0.2) continue;
      float d = dotSDF(cc, r, u_shape);
      dAcc = u_gooeyK > 0.0 ? smin(dAcc, d, u_gooeyK) : min(dAcc, d);
    }
  }
  o = vec4(mix(u_paper, u_ink, aaCov(dAcc*cell)), 1.0);
}`),
  set: (gl, at, p, { u }) => {
    const overflow = Math.min(1, Math.max(0, pn(p, "overflow", 0)));
    const gooey = Math.min(1, Math.max(0, pn(p, "gooey", 0)));
    gl.uniform1f(at("u_cell"), Math.max(2, pn(p, "cell", 9) * u));
    gl.uniform1f(at("u_angle"), pn(p, "angle", 45));
    gl.uniform1f(at("u_contrast"), pn(p, "contrast", 1));
    gl.uniform1i(at("u_shape"), HALFTONE_SHAPES.indexOf(ps(p, "dotShape", "circle")));
    gl.uniform1f(at("u_stagger"), pb(p, "stagger", false) ? 1 : 0);
    gl.uniform1f(at("u_invert"), pb(p, "invertCells", false) ? 1 : 0);
    gl.uniform1f(at("u_mode"), ps(p, "mode", "mono") === "cmyk" ? 1 : 0);
    gl.uniform3fv(at("u_ink"), rgb01(ps(p, "ink", "#191512")));
    gl.uniform3fv(at("u_paper"), rgb01(ps(p, "paper", "#f1ece4")));
    gl.uniform1f(at("u_rscale"), 0.71 * (1 + overflow * 0.9));
    gl.uniform1f(at("u_gooeyK"), gooey * 0.4);
    gl.uniform1f(at("u_combine"), overflow > 0 || gooey > 0 ? 1 : 0);
  },
};

// ---------------------------------------------------------------- ordered dither
// Quantizes in linear light against a threshold matrix. The app's blue-noise
// type reads a 128² table and its Floyd–Steinberg types run on the CPU; both
// are left out here.
const dither: Pass = {
  frag: frag(`uniform float u_levels; uniform float u_scale; uniform float u_mono; uniform int u_type; uniform float u_pixelate;
float bayer2(ivec2 p){ int v=(p.y%2)*2+(p.x%2); float t[4]=float[4](0.0,2.0,3.0,1.0); return (t[v]+0.5)/4.0; }
float bayer4(ivec2 p){ int x=p.x%4,y=p.y%4; float m[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return (m[y*4+x]+0.5)/16.0; }
float bayer8(ivec2 p){ int x=p.x%8,y=p.y%8; float m[64]=float[64](
 0.,32.,8.,40.,2.,34.,10.,42.,48.,16.,56.,24.,50.,18.,58.,26.,
 12.,44.,4.,36.,14.,46.,6.,38.,60.,28.,52.,20.,62.,30.,54.,22.,
 3.,35.,11.,43.,1.,33.,9.,41.,51.,19.,59.,27.,49.,17.,57.,25.,
 15.,47.,7.,39.,13.,45.,5.,37.,63.,31.,55.,23.,61.,29.,53.,21.);
 return (m[y*8+x]+0.5)/64.0; }
float stripe8(ivec2 p){ int x=p.x%8,y=p.y%8; return (mod(float(x)*8.0+float(y)*4.0, 64.0)+0.5)/64.0; }
float crossStripe8(ivec2 p){ int x=p.x%8,y=p.y%8; float m[64]=float[64](
 0.,12.,24.,36.,48.,60.,8.,20.,16.,28.,40.,52.,4.,56.,32.,44.,
 8.,20.,0.,12.,24.,36.,48.,60.,40.,52.,16.,28.,4.,56.,32.,44.,
 48.,60.,8.,20.,0.,12.,24.,36.,32.,44.,40.,52.,16.,28.,4.,56.,
 24.,36.,48.,60.,8.,20.,0.,12.,56.,4.,32.,44.,40.,52.,16.,28.);
 return (m[y*8+x]+0.5)/64.0; }
void main(){
  vec2 px=vec2(v_uv.x*u_dims.x,(1.0-v_uv.y)*u_dims.y);
  vec2 srcPx = u_pixelate>0.5 ? floor(px/u_pixelate)*u_pixelate : px;
  vec2 srcUv = clamp(srcPx*u_texel, vec2(0.0), vec2(1.0));
  srcUv.y = 1.0-srcUv.y;
  vec4 c=texture(u_tex,srcUv);
  ivec2 cell=ivec2(floor(px/u_scale));
  float m;
  if(u_type==0)      m=bayer2(cell);
  else if(u_type==2) m=bayer8(cell);
  else if(u_type==4) m=stripe8(cell);
  else if(u_type==5) m=crossStripe8(cell);
  else               m=bayer4(cell);
  m-=0.5;
  float L=u_levels;
  vec3 lin=toLin(c.rgb);
  vec3 rgb;
  if(u_mono>0.5){ float v=luma601(lin); v=clamp(floor(v*(L-1.0)+m+0.5),0.0,L-1.0)/(L-1.0); rgb=toSRGB(vec3(v)); }
  else { rgb=toSRGB(clamp(floor(lin*(L-1.0)+m+0.5),vec3(0.0),vec3(L-1.0))/(L-1.0)); }
  o=vec4(rgb,c.a); }`),
  set: (gl, at, p, { u }) => {
    gl.uniform1i(at("u_type"), DITHER_TYPES[ps(p, "type", "bayer4")] ?? 1);
    gl.uniform1f(at("u_levels"), Math.max(2, Math.round(pn(p, "levels", 3))));
    gl.uniform1f(at("u_scale"), Math.max(1, Math.round(pn(p, "scale", 2) * u)));
    gl.uniform1f(at("u_mono"), pb(p, "mono", false) ? 1 : 0);
    gl.uniform1f(at("u_pixelate"), Math.max(0, Math.round(pn(p, "pixelate", 0) * u)));
  },
};

// ---------------------------------------------------------------- gradient map
// An 8-bit LUT from sorted stops (max 8), keyed by Rec.709 luma.
const gradientMap: Pass = {
  frag: frag(`uniform float u_stopT[8]; uniform vec3 u_stopC[8]; uniform int u_nstops; uniform float u_amount;
void main(){
  vec4 c=texture(u_tex,v_uv);
  if(u_nstops<2){ o=c; return; }
  float t=floor(luma709(c.rgb)*255.0+0.5)/255.0;
  int ai=0, bi=u_nstops-1;
  for(int s=0;s<7;s++){
    if(s>=u_nstops-1) break;
    if(t>=u_stopT[s] && t<=u_stopT[s+1]){ ai=s; bi=s+1; break; }
  }
  float span = (u_stopT[bi]-u_stopT[ai])==0.0 ? 1.0 : (u_stopT[bi]-u_stopT[ai]);
  vec3 ramp=mix(u_stopC[ai],u_stopC[bi],clamp((t-u_stopT[ai])/span,0.0,1.0));
  ramp=floor(ramp*255.0+0.5)/255.0;
  o=vec4(mix(c.rgb,ramp,u_amount),c.a);
}`),
  set: (gl, at, p) => {
    const stops = pstops(p, "stops").toSorted((a, b) => a.t - b.t).slice(0, 8);
    const tArr = new Float32Array(8);
    const cArr = new Float32Array(24);
    stops.forEach((s, i) => {
      tArr[i] = s.t;
      cArr.set(rgb01(s.color), i * 3);
    });
    gl.uniform1fv(at("u_stopT[0]"), tArr);
    gl.uniform3fv(at("u_stopC[0]"), cArr);
    gl.uniform1i(at("u_nstops"), stops.length >= 2 ? stops.length : 0);
    gl.uniform1f(at("u_amount"), pn(p, "amount", 1));
  },
};

// ---------------------------------------------------------------- adjust
const adjust: Pass = {
  frag: frag(`uniform float u_b; uniform float u_c; uniform float u_s; uniform float u_hue;
uniform float u_exp; uniform float u_temp; uniform float u_gamma;
vec3 hueRotate(vec3 c,float deg){ float a=radians(deg); float cs=cos(a),sn=sin(a);
  mat3 m=mat3(0.213,0.213,0.213,0.715,0.715,0.715,0.072,0.072,0.072)
    + cs*mat3(0.787,-0.213,-0.213,-0.715,0.285,-0.715,-0.072,-0.072,0.928)
    + sn*mat3(-0.213,-0.715,0.928,0.143,0.140,-0.283,-0.787,0.715,0.072);
  return c*m; }
void main(){ vec4 col4=texture(u_tex,v_uv); vec3 c=col4.rgb;
  c*=u_b; c=(c-0.5)*u_c+0.5;
  float l=dot(c,vec3(0.213,0.715,0.072)); c=mix(vec3(l),c,u_s);
  c=hueRotate(c,u_hue); c=clamp(c,0.0,1.0);
  c*=pow(2.0,u_exp);
  c.r+=u_temp*40.0/255.0; c.b-=u_temp*40.0/255.0;
  c=clamp(c,0.0,1.0); c=pow(c, vec3(1.0/u_gamma));
  o=vec4(clamp(c,0.0,1.0),col4.a); }`),
  set: (gl, at, p) => {
    gl.uniform1f(at("u_b"), pn(p, "brightness", 1));
    gl.uniform1f(at("u_c"), pn(p, "contrast", 1));
    gl.uniform1f(at("u_s"), pn(p, "saturation", 1));
    gl.uniform1f(at("u_hue"), pn(p, "hue", 0));
    gl.uniform1f(at("u_exp"), pn(p, "exposure", 0));
    gl.uniform1f(at("u_temp"), pn(p, "temperature", 0));
    gl.uniform1f(at("u_gamma"), Math.max(0.01, pn(p, "gamma", 1)));
  },
};

const posterize: Pass = {
  frag: frag(`uniform float u_levels; uniform float u_perch;
float q(float v,float L){ return floor(v*(L-1.0)+0.5)/(L-1.0); }
void main(){ vec4 c=texture(u_tex,v_uv); float L=u_levels;
  if(u_perch>0.5){ o=vec4(q(c.r,L),q(c.g,L),q(c.b,L),c.a); }
  else { float l=luma601(c.rgb); float k= l>0.0? q(l,L)/l : 0.0; o=vec4(clamp(c.rgb*k,0.0,1.0),c.a); } }`),
  set: (gl, at, p) => {
    gl.uniform1f(at("u_levels"), Math.max(2, Math.round(pn(p, "levels", 5))));
    gl.uniform1f(at("u_perch"), pb(p, "perChannel", true) ? 1 : 0);
  },
};

const grayscale: Pass = {
  frag: frag(`uniform float u_amount;
void main(){ vec4 c=texture(u_tex,v_uv); o=vec4(mix(c.rgb,vec3(luma601(c.rgb)),u_amount),c.a); }`),
  set: (gl, at, p) => gl.uniform1f(at("u_amount"), pn(p, "amount", 1)),
};

// ---------------------------------------------------------------- grain
// Integer-hash noise on a cell grid, blended like the CPU op's canvas
// composite. `u_frame` re-seeds per frame when Animate is on.
const grain: Pass = {
  frag: frag(`uniform float u_amount; uniform float u_size; uniform vec2 u_nwh; uniform float u_mono; uniform int u_blend; uniform int u_frame;
uint hash1(ivec2 p, int seed){
  uint h = uint(p.x)*1664525u ^ uint(p.y)*1013904223u ^ uint(seed)*2654435761u;
  h = (h ^ (h>>16u)) * 0x45d9f3bu;
  h = (h ^ (h>>16u)) * 0x45d9f3bu;
  h ^= (h>>16u);
  return h;
}
float hashf(ivec2 p, int seed){ return float(hash1(p, seed)) / 4294967295.0; }
int seedFor(int channel){ int base = int(mod(float(u_frame)*0.61803398875, 1.0)*65536.0); return base + channel*7919; }
vec3 cellNoise(ivec2 cell, ivec2 nwh){
  ivec2 c = clamp(cell, ivec2(0), nwh-1);
  if(u_mono>0.5) return vec3(hashf(c, seedFor(0)));
  return vec3(hashf(c, seedFor(0)), hashf(c, seedFor(1)), hashf(c, seedFor(2)));
}
vec3 blendMul(vec3 d,vec3 s){ return d*s; }
vec3 blendScreen(vec3 d,vec3 s){ return 1.0-(1.0-d)*(1.0-s); }
vec3 blendOverlay(vec3 d,vec3 s){ return mix(2.0*d*s, 1.0-2.0*(1.0-d)*(1.0-s), step(0.5,d)); }
vec3 blendSoft(vec3 d,vec3 s){ return mix(2.0*d*s + d*d*(1.0-2.0*s), sqrt(d)*(2.0*s-1.0)+2.0*d*(1.0-s), step(0.5,s)); }
void main(){
  vec4 c=texture(u_tex,v_uv);
  if(u_amount<=0.0){ o=c; return; }
  ivec2 nwh = ivec2(u_nwh);
  vec2 px = vec2(v_uv.x*u_dims.x, (1.0-v_uv.y)*u_dims.y);
  vec3 nz;
  if(u_size<=1.5){
    nz = cellNoise(ivec2(floor((px+0.5)*u_nwh/u_dims)), nwh);
  } else {
    vec2 n = (px+0.5)*(u_nwh/u_dims) - 0.5;
    vec2 nf = floor(n); vec2 fr = n - nf; ivec2 c00 = ivec2(nf);
    nz = mix(mix(cellNoise(c00, nwh), cellNoise(c00+ivec2(1,0), nwh), fr.x),
             mix(cellNoise(c00+ivec2(0,1), nwh), cellNoise(c00+ivec2(1,1), nwh), fr.x), fr.y);
  }
  vec3 b;
  if(u_blend==0) b=blendMul(c.rgb,nz); else if(u_blend==1) b=blendScreen(c.rgb,nz); else if(u_blend==2) b=blendOverlay(c.rgb,nz); else b=blendSoft(c.rgb,nz);
  o=vec4(mix(c.rgb,b,u_amount),c.a);
}`),
  set: (gl, at, p, { u, t, w, h }) => {
    const size = Math.max(1, pn(p, "size", 1.5) * u);
    gl.uniform1f(at("u_amount"), pn(p, "amount", 0.14));
    gl.uniform1f(at("u_size"), size);
    gl.uniform2f(at("u_nwh"), Math.max(1, Math.round(w / size)), Math.max(1, Math.round(h / size)));
    gl.uniform1f(at("u_mono"), pb(p, "mono", true) ? 1 : 0);
    gl.uniform1i(at("u_blend"), BLEND_INDEX[ps(p, "blend", "soft-light")] ?? 3);
    gl.uniform1i(at("u_frame"), grainFrame(p, t));
  },
};

const vignette: Pass = {
  frag: frag(`uniform float u_amount; uniform float u_radius; uniform float u_softness; uniform vec3 u_color;
void main(){ vec4 c=texture(u_tex,v_uv); float dist=length((v_uv-0.5)*u_dims);
  float mx=length(u_dims)*0.5; float inner=u_radius*(1.0-u_softness)*mx; float outer=u_radius*mx+u_softness*mx;
  float a=u_amount*clamp((dist-inner)/max(1.0,outer-inner),0.0,1.0); o=vec4(mix(c.rgb,u_color,a),c.a); }`),
  set: (gl, at, p) => {
    gl.uniform1f(at("u_amount"), pn(p, "amount", 0.4));
    gl.uniform1f(at("u_radius"), pn(p, "radius", 0.75));
    gl.uniform1f(at("u_softness"), pn(p, "softness", 0.45));
    gl.uniform3fv(at("u_color"), rgb01(ps(p, "color", "#000000")));
  },
};

export const PASSES: Record<EffectType, Pass> = { adjust, posterize, grayscale, dither, halftone, gradientMap, grain, vignette };
