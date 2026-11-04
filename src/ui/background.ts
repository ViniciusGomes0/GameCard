// Fundo animado: "tinta" girando em baixa resolução (visual pixelado), via WebGL.
// Se WebGL não estiver disponível, o CSS do body serve de fallback.

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 res;
uniform float t;
uniform vec3 c1;
uniform vec3 c2;
uniform vec3 c3;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y);
  float r = length(uv);
  // giro mais forte no centro
  float ang = 1.6 * exp(-r * 1.2) + t * 0.05;
  float s = sin(ang), c = cos(ang);
  vec2 p = mat2(c, -s, s, c) * uv * 2.4;

  float tt = t * 0.22;
  for (int i = 1; i < 6; i++) {
    float fi = float(i);
    p.x += 0.55 / fi * sin(fi * p.y + tt + 0.7 * fi);
    p.y += 0.55 / fi * cos(fi * p.x + tt * 1.2 + 1.3 * fi);
  }

  float v = 0.5 + 0.5 * sin(p.x * 1.3 + p.y * 0.9);
  float w = 0.5 + 0.5 * sin(p.y * 2.1 - p.x * 0.6 + tt);

  // posteriza levemente para o look de pixel art
  v = floor(v * 7.0) / 7.0;
  w = floor(w * 5.0) / 5.0;

  vec3 col = mix(c1, c2, v);
  col = mix(col, c3, w * 0.35);
  // vinheta
  col *= 1.0 - 0.45 * smoothstep(0.35, 1.25, r);
  gl_FragColor = vec4(col, 1.0);
}
`;

function hex(h: string): [number, number, number] {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export type Palette = [string, string, string];

export interface Background {
  /** Troca as cores do fundo com transição suave. */
  setPalette(p: Palette, ms?: number): void;
}

export const FELT: Palette = ['#1f6b4a', '#3b9a6a', '#7ad19a'];
export const TITLE: Palette = ['#b3261e', '#1d4f9e', '#ff7a6b'];

const NOOP: Background = { setPalette() {} };

export function startBackground(canvas: HTMLCanvasElement, initial: Palette = FELT): Background {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) {
    canvas.remove();
    return NOOP;
  }
  const g = gl;

  function shader(type: number, src: string): WebGLShader | null {
    const sh = g.createShader(type);
    if (!sh) return null;
    g.shaderSource(sh, src);
    g.compileShader(sh);
    return g.getShaderParameter(sh, g.COMPILE_STATUS) ? sh : null;
  }
  const vs = shader(g.VERTEX_SHADER, VERT);
  const fs = shader(g.FRAGMENT_SHADER, FRAG);
  const prog = g.createProgram();
  if (!vs || !fs || !prog) {
    canvas.remove();
    return NOOP;
  }
  g.attachShader(prog, vs);
  g.attachShader(prog, fs);
  g.linkProgram(prog);
  if (!g.getProgramParameter(prog, g.LINK_STATUS)) {
    canvas.remove();
    return NOOP;
  }
  g.useProgram(prog);

  const buf = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, buf);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
  const loc = g.getAttribLocation(prog, 'p');
  g.enableVertexAttribArray(loc);
  g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);

  const uRes = g.getUniformLocation(prog, 'res');
  const uT = g.getUniformLocation(prog, 't');
  type RGB = [number, number, number];
  const uC = [g.getUniformLocation(prog, 'c1'), g.getUniformLocation(prog, 'c2'), g.getUniformLocation(prog, 'c3')];
  let from: RGB[] = initial.map(hex);
  let to: RGB[] = from;
  let mixStart = 0;
  let mixMs = 1;
  function current(now: number): RGB[] {
    const k = Math.min(1, (now - mixStart) / mixMs);
    const e = k * k * (3 - 2 * k);
    return from.map((a, i) => a.map((v, j) => v + (to[i][j] - v) * e) as RGB);
  }
  function applyColors(now: number): void {
    current(now).forEach((c, i) => g.uniform3f(uC[i], c[0], c[1], c[2]));
  }
  applyColors(0);

  const SCALE = 0.25; // renderiza em 1/4 da resolução → pixelado e barato
  function resize(): void {
    canvas.width = Math.max(1, Math.round(window.innerWidth * SCALE));
    canvas.height = Math.max(1, Math.round(window.innerHeight * SCALE));
    g.viewport(0, 0, canvas.width, canvas.height);
    g.uniform2f(uRes, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  let last = 0;
  function frame(now: number): void {
    // ~30fps é suficiente para o fundo
    if (now - last > 33) {
      last = now;
      applyColors(now);
      g.uniform1f(uT, reduced ? 4 : (now - t0) / 1000);
      g.drawArrays(g.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    setPalette(p: Palette, ms = 900): void {
      const now = performance.now();
      from = current(now); // parte da cor atual, mesmo no meio de outra transição
      to = p.map(hex);
      mixStart = now;
      mixMs = Math.max(1, ms);
    },
  };
}
