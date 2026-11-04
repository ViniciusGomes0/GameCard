// Tela de título: logo com uma carta girando no meio, pokébolas e cartas flutuando
// com parallax do mouse, e o botão JOGAR. Montada como camada separada sobre o jogo;
// ao jogar, os itens "explodem" para fora, o fundo troca de cor e a camada some.

import type { PokemonSpecies } from '../core/types';
import { makeCard } from '../core/deck';
import { cardMarkup } from './cards';
import { FELT, type Background } from './background';

type BallKind = 'poke' | 'great' | 'ultra' | 'master';
const BALLS: BallKind[] = ['poke', 'poke', 'great', 'great', 'ultra', 'master'];

interface Floater {
  el: HTMLElement;
  inner: HTMLElement | null; // .cs-inner das cartas (giro 3D)
  kind: 'ball' | 'card';
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
  depth: number; // 0.35 (longe) … 1 (perto)
  spinY: number; // giro 3D das cartas (graus/s); 0 = só balança
  flipY: number;
  phase: number;
  juice: number;
}

export interface TitleOptions {
  species: readonly PokemonSpecies[];
  bestScore: number;
  background: Background;
  onPlay: () => void;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

function letters(word: string, offset: number): string {
  return [...word]
    .map((ch, i) => `<span class="t-letter" style="--i:${i + offset}">${ch}</span>`)
    .join('');
}

export class TitleScreen {
  private readonly el: HTMLElement;
  private readonly layer: HTMLElement;
  private readonly logo: HTMLElement;
  private readonly hero: HTMLElement;
  private readonly heroInner: HTMLElement;
  private readonly opts: TitleOptions;
  private floaters: Floater[] = [];
  private heroPool: PokemonSpecies[];
  private heroIdx = 0;
  private heroFlip = 0; // 0..1 durante o flip
  private heroNextFlip = 4.5;
  private heroSwapped = false;
  private heroJuice = 0;
  private heroTilt = { x: 0, y: 0, tx: 0, ty: 0 };
  private mouse = { x: 0.5, y: 0.5, px: -9999, py: -9999 };
  private leaving = false;
  private raf = 0;
  private last = 0;
  private t = 0;
  private readonly reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(host: HTMLElement, opts: TitleOptions) {
    this.opts = opts;
    const shiny = opts.species.filter((s) => s.rarity === 'rare' || s.rarity === 'legendary');
    this.heroPool = shiny.length ? shiny.slice() : opts.species.slice();
    this.heroIdx = Math.floor(Math.random() * this.heroPool.length);

    const el = document.createElement('div');
    el.className = 'title';
    el.innerHTML = `
      <div class="t-layer"></div>
      <div class="t-center">
        <h1 class="t-logo" aria-label="Pokélatro">
          <span class="t-word">${letters('POKÉ', 0)}</span>
          <span class="t-hero-wrap"><div class="cs t-hero"></div></span>
          <span class="t-word">${letters('LATRO', 5)}</span>
        </h1>
        <div class="t-sub">um roguelike de cartas Pokémon</div>
      </div>
      <div class="t-bar">
        <div class="t-best"><span>Recorde</span><b>${Math.round(opts.bestScore).toLocaleString('pt-BR')}</b></div>
        <button class="btn t-play" type="button"><span class="t-play-ball"></span><span>JOGAR</span></button>
        <div class="t-hint">ENTER</div>
      </div>
      <div class="t-ver">v0.1 · Pokélatro</div>`;
    host.appendChild(el);
    this.el = el;
    this.layer = el.querySelector('.t-layer') as HTMLElement;
    this.logo = el.querySelector('.t-logo') as HTMLElement;
    this.hero = el.querySelector('.t-hero') as HTMLElement;
    this.renderHero();
    this.heroInner = this.hero.querySelector('.cs-inner') as HTMLElement;

    this.spawn();

    const play = el.querySelector('.t-play') as HTMLButtonElement;
    play.addEventListener('click', () => this.start());
    play.focus({ preventScroll: true });

    this.hero.addEventListener('pointermove', (e) => {
      const r = this.hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      this.heroTilt.ty = (nx - 0.5) * 30;
      this.heroTilt.tx = -(ny - 0.5) * 30;
      this.hero.classList.add('is-hover');
      (this.hero.querySelector('.cs-inner') as HTMLElement).style.setProperty('--mx', `${nx * 100}%`);
      (this.hero.querySelector('.cs-inner') as HTMLElement).style.setProperty('--my', `${ny * 100}%`);
    });
    this.hero.addEventListener('pointerleave', () => {
      this.heroTilt.tx = this.heroTilt.ty = 0;
      this.hero.classList.remove('is-hover');
    });
    this.hero.addEventListener('click', () => {
      this.heroJuice = 1;
      if (this.heroFlip === 0) this.heroNextFlip = 0;
    });

    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerdown', this.onDown);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('resize', this.onResize);

    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  // ------------------------------------------------------------ montagem

  private renderHero(): void {
    const sp = this.heroPool[this.heroIdx % this.heroPool.length];
    this.hero.dataset.rarity = sp.rarity;
    const inner = this.hero.querySelector('.cs-inner');
    if (!inner) {
      this.hero.innerHTML = cardMarkup(makeCard(sp));
      return;
    }
    // troca só a frente, mantendo o .cs-inner (e a rotação atual)
    const tmp = document.createElement('div');
    tmp.innerHTML = cardMarkup(makeCard(sp));
    const front = tmp.querySelector('.cs-front');
    const old = inner.querySelector('.cs-front');
    if (front && old) old.replaceWith(front);
  }

  private spawn(): void {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const area = W * H;
    const nBalls = Math.round(Math.min(16, Math.max(8, area / 90000)));
    const nCards = Math.round(Math.min(12, Math.max(6, area / 140000)));

    for (let i = 0; i < nBalls + nCards; i++) {
      const isCard = i >= nBalls;
      const depth = rand(0.35, 1);
      const el = document.createElement('div');
      let inner: HTMLElement | null = null;
      let size: number;
      if (isCard) {
        const sp = pick(this.opts.species);
        size = Math.round(70 + depth * 50);
        el.className = 'cs t-fcard';
        el.dataset.rarity = sp.rarity;
        el.style.setProperty('--cw', `${size}px`);
        el.style.setProperty('--ch', `${Math.round(size * 1.4)}px`);
        el.innerHTML = cardMarkup(makeCard(sp));
        inner = el.querySelector('.cs-inner');
      } else {
        size = Math.round(34 + depth * 46);
        el.className = `pb pb-${pick(BALLS)}`;
        el.style.setProperty('--s', `${size}px`);
      }
      el.style.zIndex = String(Math.round(depth * 10));
      if (depth < 0.55) el.classList.add('t-far');
      this.layer.appendChild(el);

      const speed = rand(14, 34) * (0.5 + depth);
      const ang = rand(0, Math.PI * 2);
      this.floaters.push({
        el,
        inner,
        kind: isCard ? 'card' : 'ball',
        size,
        x: rand(0, W),
        y: rand(0, H),
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        r: rand(-30, 30),
        vr: rand(-18, 18),
        depth,
        spinY: isCard && Math.random() < 0.45 ? rand(25, 55) * (Math.random() < 0.5 ? -1 : 1) : 0,
        flipY: rand(0, 360),
        phase: rand(0, Math.PI * 2),
        juice: 0,
      });
    }
  }

  // ------------------------------------------------------------ eventos

  private readonly onMove = (e: PointerEvent): void => {
    this.mouse.x = e.clientX / window.innerWidth;
    this.mouse.y = e.clientY / window.innerHeight;
    this.mouse.px = e.clientX;
    this.mouse.py = e.clientY;
  };

  private readonly onDown = (e: PointerEvent): void => {
    if (this.leaving) return;
    const target = e.target as HTMLElement;
    if (target.closest('.t-play, .t-hero')) return;
    // pokébola mais próxima do clique dá um pulo e gira
    let best: Floater | null = null;
    let bestD = Infinity;
    for (const f of this.floaters) {
      const d = Math.hypot(f.x - e.clientX, f.y - e.clientY);
      if (d < f.size * 0.9 + 10 && d < bestD) {
        best = f;
        bestD = d;
      }
    }
    if (best) {
      best.juice = 1;
      best.vr += (Math.random() < 0.5 ? -1 : 1) * 520;
      const dx = best.x - e.clientX;
      const dy = best.y - e.clientY;
      const d = Math.max(1, Math.hypot(dx, dy));
      best.vx += (dx / d) * 260;
      best.vy += (dy / d) * 260 - 120;
    }
  };

  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.start();
    }
  };

  private readonly onResize = (): void => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    for (const f of this.floaters) {
      f.x = Math.min(f.x, W);
      f.y = Math.min(f.y, H);
    }
  };

  // ------------------------------------------------------------ loop

  private readonly frame = (now: number): void => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    this.step(dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  private step(dt: number): void {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const motion = this.reduced ? 0.15 : 1;
    const mx = this.mouse.x - 0.5;
    const my = this.mouse.y - 0.5;

    for (const f of this.floaters) {
      // empurrão suave para longe do ponteiro
      if (!this.leaving) {
        const dx = f.x - this.mouse.px;
        const dy = f.y - this.mouse.py;
        const d = Math.hypot(dx, dy);
        const R = 130 + f.size;
        if (d < R && d > 0.1) {
          const push = (1 - d / R) * 900 * dt;
          f.vx += (dx / d) * push;
          f.vy += (dy / d) * push;
        }
        // volta devagar para a velocidade de cruzeiro
        const sp = Math.hypot(f.vx, f.vy);
        const cruise = 30 * (0.5 + f.depth);
        if (sp > cruise) {
          const k = Math.exp(-dt * 1.2);
          f.vx *= k + (1 - k) * (cruise / sp);
          f.vy *= k + (1 - k) * (cruise / sp);
        }
        f.vr *= Math.exp(-dt * 0.9);
        if (Math.abs(f.vr) < 6) f.vr += (Math.sign(f.vr) || 1) * dt * 4;
      }

      f.x += f.vx * dt * motion;
      f.y += f.vy * dt * motion;
      f.r += f.vr * dt * motion;
      f.flipY += f.spinY * dt * motion;
      f.juice *= Math.exp(-dt * 4);

      // dá a volta na tela
      const m = f.size * 1.6;
      if (!this.leaving) {
        if (f.x < -m) f.x = W + m;
        else if (f.x > W + m) f.x = -m;
        if (f.y < -m) f.y = H + m;
        else if (f.y > H + m) f.y = -m;
      }

      // parallax: os mais próximos se movem mais com o mouse
      const px = -mx * 60 * f.depth;
      const py = -my * 40 * f.depth;
      const bob = Math.sin(this.t * 1.3 + f.phase) * 6 * f.depth * motion;
      const scale = 1 + f.juice * 0.35;
      f.el.style.transform =
        `translate3d(${(f.x + px).toFixed(1)}px, ${(f.y + py + bob).toFixed(1)}px, 0) ` +
        `translate(-50%, -50%) rotate(${f.r.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      if (f.inner) {
        const ry = f.spinY ? f.flipY : Math.sin(this.t * 0.9 + f.phase) * 22;
        const rx = Math.cos(this.t * 0.7 + f.phase) * 10;
        f.inner.style.transform = `rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg)`;
      }
    }

    // logo: leve parallax contrário
    this.logo.style.transform = `translate(${(mx * 14).toFixed(1)}px, ${(my * 10).toFixed(1)}px)`;

    // carta central: balança, inclina sob o mouse e de tempos em tempos vira
    const ht = this.heroTilt;
    const lerp = 1 - Math.exp(-dt * 10);
    ht.x += (ht.tx - ht.x) * lerp;
    ht.y += (ht.ty - ht.y) * lerp;
    this.heroJuice *= Math.exp(-dt * 5);
    if (!this.leaving) {
      if (this.heroFlip > 0) {
        this.heroFlip = Math.min(1, this.heroFlip + dt / 0.9);
        if (!this.heroSwapped && this.heroFlip >= 0.5) {
          this.heroSwapped = true;
          this.heroIdx++;
          this.renderHero();
        }
        if (this.heroFlip >= 1) {
          this.heroFlip = 0;
          this.heroNextFlip = 5;
        }
      } else {
        this.heroNextFlip -= dt * motion;
        if (this.heroNextFlip <= 0) {
          this.heroFlip = 0.0001;
          this.heroSwapped = false;
        }
      }
    }
    const fk = this.heroFlip;
    const ease = fk < 0.5 ? 4 * fk * fk * fk : 1 - Math.pow(-2 * fk + 2, 3) / 2;
    const flipDeg = ease * 360;
    const swayR = Math.sin(this.t * 1.1) * 6 * motion + Math.sin(this.t * 40) * this.heroJuice * 7;
    const swayY = Math.sin(this.t * 0.8) * 18 * motion;
    const floatY = Math.sin(this.t * 1.6) * 8 * motion;
    const hs = 1 + this.heroJuice * 0.15;
    this.hero.style.transform = `translateY(${floatY.toFixed(1)}px) rotate(${swayR.toFixed(2)}deg) scale(${hs.toFixed(3)})`;
    this.heroInner.style.transform =
      `rotateX(${ht.x.toFixed(1)}deg) rotateY(${(ht.y + swayY + flipDeg).toFixed(1)}deg)`;
  }

  // ------------------------------------------------------------ saída

  private start(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.el.classList.add('is-leaving');
    this.heroJuice = 1;

    // tudo explode para fora do centro
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    for (const f of this.floaters) {
      const dx = f.x - cx;
      const dy = f.y - cy;
      const d = Math.max(1, Math.hypot(dx, dy));
      const power = rand(1300, 2100) * (0.6 + f.depth);
      f.vx = (dx / d) * power;
      f.vy = (dy / d) * power;
      f.vr = rand(-700, 700);
      f.juice = 0.6;
    }

    this.opts.background.setPalette(FELT, 900);
    window.setTimeout(() => this.destroy(), 750);
  }

  private destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('resize', this.onResize);
    this.el.remove();
    this.opts.onPlay();
  }
}
