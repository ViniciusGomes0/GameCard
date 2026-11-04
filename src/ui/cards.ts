// Sprite de carta com física de mola: cada carta persegue um alvo (x, y, rot, escala)
// com leve overshoot, balança conforme a velocidade, flutua parada, inclina em 3D
// sob o mouse e "pula" (juice) quando pontua.

import type { Card } from '../core/types';
import { cardChips } from '../core/scoring';
import { typeColor } from './typeColors';

export type Zone = 'hand' | 'play' | 'gone';

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Mola amortecida (semi-implícita). Levemente sub-amortecida → overshoot "elástico". */
function spring(x: number, v: number, target: number, k: number, d: number, dt: number): [number, number] {
  const a = (target - x) * k - v * d;
  const nv = v + a * dt;
  return [x + nv * dt, nv];
}

/** HTML interno de uma carta (sombra + frente + verso). Reutilizado pela tela de título. */
export function cardMarkup(card: Card): string {
  const sp = card.species;
  const t1 = typeColor(sp.types[0]);
  const t2 = typeColor(sp.types[1] ?? sp.types[0]);
  const badges = sp.types
    .map((t) => `<span class="cf-badge" style="background:${typeColor(t)}">${cap(t)}</span>`)
    .join('');
  return `
      <div class="cs-shadow"></div>
      <div class="cs-inner">
        <div class="cs-face cs-front" style="--t1:${t1};--t2:${t2}">
          <div class="cf-head">
            <span class="cf-dex">#${String(sp.id).padStart(3, '0')}</span>
            <span class="cf-chips">${cardChips(card)}</span>
          </div>
          <div class="cf-art"><img src="${sp.sprite}" alt="${sp.name}" draggable="false" /></div>
          <div class="cf-name">${cap(sp.name)}</div>
          <div class="cf-badges">${badges}</div>
          <div class="cf-gloss"></div>
        </div>
        <div class="cs-face cs-back"><div class="cb-ball"></div></div>
      </div>`;
}

export class CardSprite {
  readonly card: Card;
  readonly el: HTMLDivElement;
  private readonly inner: HTMLDivElement;
  private readonly shadow: HTMLDivElement;

  zone: Zone = 'hand';
  selected = false;
  hovered = false;
  dim = false;
  /** Segundos até a carta sair do baralho (compra escalonada). */
  delay = 0;
  /** Alvo atual. */
  tx = 0;
  ty = 0;
  tr = 0;
  ts = 1;
  z = 0;
  /** Onde a carta espera enquanto `delay` > 0 (o baralho). */
  homeX = 0;
  homeY = 0;

  private x = 0;
  private y = 0;
  private r = 0;
  private s = 1;
  private vx = 0;
  private vy = 0;
  private vr = 0;
  private vs = 0;
  /** 1 = verso visível, 0 = frente. */
  private flip = 1;
  private vflip = 0;
  private tiltX = 0;
  private tiltY = 0;
  private ttiltX = 0;
  private ttiltY = 0;
  private mx = 50;
  private my = 50;
  private juice = 0;
  private readonly phase = Math.random() * Math.PI * 2;

  constructor(card: Card, startX: number, startY: number, onClick: (s: CardSprite) => void) {
    this.card = card;
    this.x = this.tx = this.homeX = startX;
    this.y = this.ty = this.homeY = startY;

    const el = document.createElement('div');
    el.className = 'cs';
    el.dataset.rarity = card.species.rarity;
    el.innerHTML = cardMarkup(card);
    this.el = el;
    this.inner = el.querySelector('.cs-inner') as HTMLDivElement;
    this.shadow = el.querySelector('.cs-shadow') as HTMLDivElement;

    el.addEventListener('pointerenter', () => {
      if (this.zone !== 'hand') return;
      this.hovered = true;
      this.bump(0.18);
    });
    el.addEventListener('pointerleave', () => {
      this.hovered = false;
      this.ttiltX = 0;
      this.ttiltY = 0;
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.hovered) return;
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      this.ttiltY = (nx - 0.5) * 26;
      this.ttiltX = -(ny - 0.5) * 26;
      this.mx = nx * 100;
      this.my = ny * 100;
    });
    el.addEventListener('click', () => {
      if (this.zone === 'hand') onClick(this);
    });
  }

  /** Dá um "pulo" na carta (escala + tremida). */
  bump(amount = 1): void {
    this.juice = Math.max(this.juice, amount);
  }

  /** Empurrão de velocidade (ex.: ao ser selecionada). */
  kick(vx: number, vy: number, vr = 0): void {
    this.vx += vx;
    this.vy += vy;
    this.vr += vr;
  }

  update(dt: number, t: number): void {
    let tx = this.tx;
    let ty = this.ty;
    let tflip = 0;
    if (this.delay > 0) {
      this.delay -= dt;
      // ainda dentro do baralho: fica grudada nele, virada para baixo
      tx = this.x = this.homeX;
      ty = this.y = this.homeY;
      this.vx = this.vy = 0;
      tflip = 1;
    }

    [this.x, this.vx] = spring(this.x, this.vx, tx, 150, 15, dt);
    [this.y, this.vy] = spring(this.y, this.vy, ty, 150, 15, dt);
    [this.r, this.vr] = spring(this.r, this.vr, this.tr, 170, 14, dt);
    [this.s, this.vs] = spring(this.s, this.vs, this.ts, 320, 16, dt);
    [this.flip, this.vflip] = spring(this.flip, this.vflip, tflip, 120, 16, dt);

    const lerp = 1 - Math.exp(-dt * 14);
    this.tiltX += (this.ttiltX - this.tiltX) * lerp;
    this.tiltY += (this.ttiltY - this.tiltY) * lerp;
    this.juice *= Math.exp(-dt * 5.5);
    if (this.juice < 0.002) this.juice = 0;

    // balanço por velocidade horizontal (a carta "arrasta" no ar)
    const sway = Math.max(-16, Math.min(16, this.vx * 0.018));
    // flutuação ociosa
    const idle = this.zone !== 'gone' && !this.hovered && this.delay <= 0 ? 1 : 0;
    const floatY = idle * Math.sin(t * 1.7 + this.phase) * 2.4;
    const floatR = idle * Math.sin(t * 1.15 + this.phase) * 0.9;
    // juice: escala + tremida rápida
    const jScale = this.juice * 0.24;
    const jRot = Math.sin(t * 42 + this.phase) * this.juice * 8;

    const rot = this.r + sway + floatR + jRot;
    const scale = this.s * (1 + jScale);
    this.el.style.transform = `translate3d(${this.x.toFixed(2)}px, ${(this.y + floatY).toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
    this.el.style.zIndex = String(this.z);

    // verso → frente durante a compra (rotateY 180 → 0)
    const flipDeg = Math.max(0, Math.min(1.08, this.flip)) * 180;
    this.inner.style.transform = `rotateX(${this.tiltX.toFixed(2)}deg) rotateY(${(this.tiltY + flipDeg).toFixed(2)}deg)`;
    this.inner.style.setProperty('--mx', `${this.mx.toFixed(1)}%`);
    this.inner.style.setProperty('--my', `${this.my.toFixed(1)}%`);

    // sombra cresce quando a carta "levanta"
    const lift = (this.hovered ? 1 : 0) + (this.selected ? 0.8 : 0) + this.juice * 1.5;
    this.shadow.style.transform = `translate(${(4 + lift * 6 - sway * 0.4).toFixed(1)}px, ${(6 + lift * 10).toFixed(1)}px)`;
    this.shadow.style.opacity = String(0.55 - lift * 0.08);

    this.el.classList.toggle('is-selected', this.selected);
    this.el.classList.toggle('is-hover', this.hovered);
    this.el.classList.toggle('is-dim', this.dim);
  }
}
