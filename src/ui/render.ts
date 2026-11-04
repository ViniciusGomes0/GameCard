// Interface do jogo. O layout é montado UMA vez; as cartas são sprites persistentes
// animados por um loop de física (ver cards.ts). Atualizações só mexem no que mudou.

import type { Card, GameState, ScoreResult, TrainerItem } from '../core/types';
import type { RunPhase, Reward } from '../state/runState';
import type { Shop } from '../data/shop';
import { cardChips } from '../core/scoring';
import { MAX_SELECTED } from '../state/gameState';
import { CardSprite } from './cards';

export interface UIHandlers {
  onToggle: (uid: string) => void;
  onPlay: () => void;
  onDiscard: () => void;
  onRestart: () => void;
  onCollect: () => void;
  onBuy: (index: number) => void;
  onReroll: () => void;
  onSell: (id: string) => void;
  onLeaveShop: () => void;
}

export interface ViewModel {
  state: GameState;
  preview: ScoreResult | null;
  bestScore: number;
  deckTotal: number;
  money: number;
  gymIndex: number;
  gymCount: number;
  phase: RunPhase;
  reward: Reward | null;
  shop: Shop | null;
  /** Itens possuídos na run (fonte da verdade; o GameState só copia no início do ginásio). */
  items: TrainerItem[];
  maxItems: number;
  rerollCost: number;
  /** Muda quando as ofertas da loja são (re)distribuídas — dispara a animação de entrada. */
  shopSeq: number;
  /** Muda quando uma partida nova começa (novo ginásio / nova run). */
  gameKey: number;
}

type SortMode = 'chips' | 'type';

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function q<T extends HTMLElement>(root: ParentNode, sel: string): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`elemento ${sel} não encontrado`);
  return el;
}

/** Reinicia uma animação CSS de classe (remove, força reflow, adiciona). */
function retrigger(el: HTMLElement, cls: string): void {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('pt-BR');
}

/** Multiplicador pode ser decimal (×1.5): mostra até 1 casa para a conta fechar. */
function fmtMult(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

export class GameUI {
  private readonly root: HTMLElement;
  private readonly h: UIHandlers;
  private readonly table: HTMLElement;
  private readonly layer: HTMLElement;
  private readonly fx: HTMLElement;
  private readonly playZone: HTMLElement;
  private readonly handZone: HTMLElement;
  private readonly deckZone: HTMLElement;

  private sprites = new Map<string, CardSprite>();
  private flying: { sp: CardSprite; until: number }[] = [];
  private handOrder: string[] = [];
  private playOrder: string[] = [];
  private sort: SortMode = 'chips';
  private busy = false;
  private vm: ViewModel | null = null;
  private shownScore = 0;

  private cw = 110;
  private ch = 154;
  private tableW = 800;
  private rects = {
    play: { x: 0, y: 0, w: 0, h: 0 },
    hand: { x: 0, y: 0, w: 0, h: 0 },
    deck: { x: 0, y: 0, w: 0, h: 0 },
  };

  constructor(root: HTMLElement, handlers: UIHandlers) {
    this.root = root;
    this.h = handlers;
    root.innerHTML = `
      <canvas class="bg"></canvas>
      <div class="crt"></div>
      <div class="game" id="game">
        <aside class="sidebar">
          <div class="panel blind">
            <div class="blind-title" id="gym-name"></div>
            <div class="blind-body">
              <div class="blind-chip"><span id="gym-initial"></span></div>
              <div class="blind-goal inner">
                <div class="lbl">Pontue ao menos</div>
                <div class="goal-num"><span class="star">✦</span><span id="goal"></span></div>
                <div class="lbl small">Líder: <b id="gym-leader"></b></div>
              </div>
            </div>
          </div>

          <div class="panel round">
            <div class="lbl">Pontos<br/>da rodada</div>
            <div class="inner round-score"><span class="star">✦</span><span id="round-score">0</span></div>
          </div>

          <div class="panel handinfo">
            <div class="hand-label" id="hand-label">&nbsp;</div>
            <div class="calc">
              <div class="box chips-box" id="chips-box">0</div>
              <div class="x">×</div>
              <div class="box mult-box" id="mult-box">0</div>
            </div>
          </div>

          <div class="stats">
            <div class="panel stat"><div class="lbl">Jogadas</div><div class="inner num blue" id="hands-left"></div></div>
            <div class="panel stat"><div class="lbl">Descartes</div><div class="inner num red" id="discards-left"></div></div>
            <div class="panel stat"><div class="lbl">Dinheiro</div><div class="inner num gold" id="money"></div></div>
            <div class="panel stat"><div class="lbl">Ginásio</div><div class="inner num orange" id="gym-index"></div></div>
            <div class="panel stat wide"><div class="lbl">Recorde</div><div class="inner num white" id="best"></div></div>
          </div>
        </aside>

        <main class="table" id="table">
          <div class="items-row">
            <div class="items-slots inner-soft" id="items"></div>
            <div class="items-count" id="items-count"></div>
          </div>
          <div class="play-zone" id="play-zone">
            <div class="burst" id="burst"></div>
          </div>
          <div class="hand-zone inner-soft" id="hand-zone"></div>
          <div class="hand-meta"><span id="sel-count"></span></div>
          <div class="actions">
            <button class="btn blue" id="btn-play">Jogar Mão</button>
            <div class="sorter">
              <div class="sort-lbl">Ordenar</div>
              <div class="sort-btns">
                <button class="btn small orange" data-sort="chips">Fichas</button>
                <button class="btn small orange" data-sort="type">Tipo</button>
              </div>
            </div>
            <button class="btn red" id="btn-discard">Descartar</button>
          </div>
          <div class="deck-zone" id="deck-zone">
            <div class="deck-stack"><div class="cs-back"><div class="cb-ball"></div></div></div>
            <div class="deck-count" id="deck-count"></div>
          </div>
          <div class="card-layer" id="card-layer"></div>
          <div class="fx-layer" id="fx"></div>
        </main>
      </div>
      <div class="overlay-host" id="overlay"></div>`;

    this.table = q(root, '#table');
    this.layer = q(root, '#card-layer');
    this.fx = q(root, '#fx');
    this.playZone = q(root, '#play-zone');
    this.handZone = q(root, '#hand-zone');
    this.deckZone = q(root, '#deck-zone');

    // toque num item mostra/esconde a descrição (no celular não há hover)
    q(root, '#items').addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('.item');
      if (!item) return;
      const wasOpen = item.classList.contains('open');
      root.querySelectorAll('#items .item.open').forEach((el) => el.classList.remove('open'));
      item.classList.toggle('open', !wasOpen);
    });
    q(root, '#btn-play').addEventListener('click', () => this.h.onPlay());
    q(root, '#btn-discard').addEventListener('click', () => this.h.onDiscard());
    root.querySelectorAll<HTMLButtonElement>('[data-sort]').forEach((b) =>
      b.addEventListener('click', () => {
        this.sort = b.dataset.sort as SortMode;
        retrigger(b, 'pressed');
        this.reorderHand();
      }),
    );

    const ro = new ResizeObserver(() => this.measure());
    [this.table, this.playZone, this.handZone, this.deckZone].forEach((el) => ro.observe(el));
    document.fonts?.ready.then(() => this.measure());
    this.measure();
    this.loop();
  }

  get canvas(): HTMLCanvasElement {
    return q(this.root, 'canvas.bg');
  }

  // ---------------------------------------------------------------- layout

  private measure(): void {
    const tr = this.table.getBoundingClientRect();
    this.tableW = tr.width;
    // tamanho da carta acompanha a mesa
    this.cw = Math.round(Math.max(62, Math.min(124, tr.width / 8.6, tr.height / 4.6)));
    this.ch = Math.round(this.cw * 1.4);
    this.root.style.setProperty('--cw', `${this.cw}px`);
    this.root.style.setProperty('--ch', `${this.ch}px`);

    const rel = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - tr.left, y: r.top - tr.top, w: r.width, h: r.height };
    };
    this.rects.play = rel(this.playZone);
    this.rects.hand = rel(this.handZone);
    this.rects.deck = rel(this.deckZone);
  }

  private deckPos(): { x: number; y: number } {
    const d = this.rects.deck;
    return { x: d.x + (d.w - this.cw) / 2, y: d.y + 4 };
  }

  /** Recalcula os alvos de todas as cartas — roda a cada frame. */
  private layoutTargets(): void {
    const { cw, ch } = this;

    // Mão: leque suave
    const n = this.handOrder.length;
    const hz = this.rects.hand;
    const avail = Math.max(cw, hz.w - 24);
    const step = n > 1 ? Math.min(cw * 1.04, (avail - cw) / (n - 1)) : 0;
    const total = step * (n - 1) + cw;
    const startX = hz.x + (hz.w - total) / 2;
    const baseY = hz.y + hz.h - ch - 8;
    const mid = (n - 1) / 2;
    const deck = this.deckPos();
    this.handOrder.forEach((uid, i) => {
      const sp = this.sprites.get(uid);
      if (!sp) return;
      sp.homeX = deck.x;
      sp.homeY = deck.y;
      const off = i - mid;
      sp.tx = startX + i * step;
      sp.ty = baseY + off * off * 1.6 - (sp.selected ? ch * 0.24 : 0) - (sp.hovered ? ch * 0.05 : 0);
      sp.tr = off * 2.4;
      sp.ts = sp.hovered ? 1.1 : 1;
      sp.z = sp.hovered ? 200 : 20 + i;
    });

    // Área de jogo: fileira centralizada
    const m = this.playOrder.length;
    const pz = this.rects.play;
    const pstep = Math.min(cw * 1.12, (pz.w - cw) / Math.max(1, m - 1));
    const ptotal = pstep * (m - 1) + cw;
    const px = pz.x + (pz.w - ptotal) / 2;
    const py = pz.y + (pz.h - ch) / 2 + 10;
    this.playOrder.forEach((uid, i) => {
      const sp = this.sprites.get(uid);
      if (!sp) return;
      sp.tx = px + i * pstep;
      sp.ty = py + (sp.dim ? ch * 0.08 : 0);
      sp.tr = 0;
      sp.ts = 1;
      sp.z = 60 + i;
    });
  }

  private loop(): void {
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      this.layoutTargets();
      for (const sp of this.sprites.values()) sp.update(dt, t);
      this.flying = this.flying.filter((f) => {
        f.sp.update(dt, t);
        if (now > f.until) {
          f.sp.el.remove();
          return false;
        }
        return true;
      });
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- sync

  private sorted(hand: Card[]): Card[] {
    const arr = hand.slice();
    if (this.sort === 'chips') {
      arr.sort((a, b) => cardChips(b) - cardChips(a) || a.species.id - b.species.id);
    } else {
      arr.sort(
        (a, b) =>
          a.species.types[0].localeCompare(b.species.types[0]) || cardChips(b) - cardChips(a),
      );
    }
    return arr;
  }

  private reorderHand(): void {
    if (!this.vm || this.busy) return;
    const before = this.handOrder.join();
    this.handOrder = this.sorted(this.vm.state.hand).map((c) => c.uid);
    if (before !== this.handOrder.join()) {
      for (const uid of this.handOrder) this.sprites.get(uid)?.kick(0, -260);
    }
  }

  /** Sincroniza a interface com o estado (compra cartas novas com animação). */
  update(vm: ViewModel): void {
    const prev = this.vm;
    this.vm = vm;
    const { state } = vm;
    if (this.busy) return;

    // Partida nova (próximo ginásio / nova run): a mão antiga inteira sai voando.
    const newGame = prev !== null && prev.gameKey !== vm.gameKey;
    // Cartas que saíram da mão sem passar por uma sequência também voam fora.
    const inHand = new Set(state.hand.map((c) => c.uid));
    [...this.sprites.values()].forEach((sp, i) => {
      if (newGame || !inHand.has(sp.card.uid)) this.throwAway(sp, i * 40);
    });
    if (newGame) this.handOrder = [];

    // Cartas novas saem do baralho, uma de cada vez, virando no caminho.
    const deck = this.deckPos();
    let stagger = 0;
    const order = this.sorted(state.hand);
    for (const card of order) {
      if (this.sprites.has(card.uid)) continue;
      const sp = new CardSprite(card, deck.x, deck.y, (s) => this.clickCard(s));
      sp.delay = (newGame ? 0.45 : 0.12) + stagger * 0.085;
      stagger++;
      this.sprites.set(card.uid, sp);
      this.layer.appendChild(sp.el);
    }
    this.handOrder = order.map((c) => c.uid);

    // Seleção
    for (const uid of this.handOrder) {
      const sp = this.sprites.get(uid);
      if (!sp) continue;
      const sel = state.selected.includes(uid);
      if (sel !== sp.selected) {
        sp.selected = sel;
        sp.bump(0.35);
        sp.kick(0, sel ? -380 : 260, sel ? 6 : -6);
      }
    }

    this.updatePanels(vm, prev);
  }

  private clickCard(sp: CardSprite): void {
    if (this.busy || !this.vm) return;
    const st = this.vm.state;
    if (!sp.selected && st.selected.length >= MAX_SELECTED) {
      // limite atingido: a carta "nega" com uma tremida
      sp.bump(0.6);
      sp.kick(500, 0);
      return;
    }
    this.h.onToggle(sp.card.uid);
  }

  private setText(id: string, value: string, pulse = false): void {
    const el = q(this.root, `#${id}`);
    if (el.textContent === value) return;
    el.textContent = value;
    if (pulse) retrigger(el, 'pulse');
  }

  private updatePanels(vm: ViewModel, prev: ViewModel | null): void {
    const { state, preview, bestScore, deckTotal } = vm;
    const gc = GYM_COLORS[vm.gymIndex % GYM_COLORS.length];
    this.root.style.setProperty('--gym', gc[0]);
    this.root.style.setProperty('--gym-d', gc[1]);
    this.setText('gym-name', state.gym.name);
    this.setText('gym-initial', state.gym.leader.charAt(0));
    this.setText('gym-leader', state.gym.leader);
    this.setText('goal', fmt(state.gym.targetScore));
    this.setText('hands-left', String(state.handsLeft), true);
    this.setText('discards-left', String(state.discardsLeft), true);
    this.setText('best', fmt(bestScore), true);
    this.setText('money', `$${vm.money}`, true);
    this.setText('gym-index', `${vm.gymIndex + 1}/${vm.gymCount}`, true);
    this.setText('deck-count', `${state.deck.length}/${deckTotal}`);
    this.setText('items-count', `${vm.items.length}/${vm.maxItems}`);
    this.setText('sel-count', `${state.selected.length}/${MAX_SELECTED}`);

    if (this.shownScore !== state.score) {
      this.shownScore = state.score;
      this.setText('round-score', fmt(state.score), true);
    }

    const items = q(this.root, '#items');
    const itemsKey = vm.items.map((i) => i.id).join();
    if (items.dataset.key !== itemsKey) {
      items.dataset.key = itemsKey;
      items.innerHTML = vm.items.length
        ? vm.items.map((i) => this.itemHtml(i)).join('')
        : `<div class="items-empty">Itens de treinador aparecem aqui</div>`;
    }

    // Prévia da mão
    if (preview) {
      this.setText('hand-label', preview.hand.label, true);
      this.setText('chips-box', fmt(preview.chips), true);
      this.setText('mult-box', fmtMult(preview.mult), true);
    } else {
      this.setText('hand-label', ' ');
      this.setText('chips-box', '0');
      this.setText('mult-box', '0');
    }

    const playing = state.status === 'playing';
    const canPlay = playing && state.selected.length > 0 && state.handsLeft > 0;
    const canDiscard = playing && state.selected.length > 0 && state.discardsLeft > 0;
    q<HTMLButtonElement>(this.root, '#btn-play').disabled = !canPlay || this.busy;
    q<HTMLButtonElement>(this.root, '#btn-discard').disabled = !canDiscard || this.busy;
    this.root.querySelectorAll<HTMLButtonElement>('[data-sort]').forEach((b) =>
      b.classList.toggle('active', b.dataset.sort === this.sort),
    );

    const deckStack = q(this.root, '.deck-stack');
    deckStack.style.setProperty('--layers', String(Math.min(6, Math.ceil(state.deck.length / 8))));
    deckStack.classList.toggle('empty', state.deck.length === 0);

    this.renderOverlay(vm, prev);
  }

  // ---------------------------------------------------------------- efeitos

  private popText(x: number, y: number, text: string, cls: string): void {
    const el = document.createElement('div');
    el.className = `pop ${cls}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.fx.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
    // sem animação (movimento reduzido) o animationend nunca dispara
    window.setTimeout(() => el.remove(), 1100);
  }

  private shake(strength: 'soft' | 'hard' = 'soft'): void {
    retrigger(q(this.root, '#game'), strength === 'hard' ? 'shake-hard' : 'shake');
  }

  private throwAway(sp: CardSprite, delayMs: number): void {
    this.sprites.delete(sp.card.uid);
    this.flying.push({ sp, until: performance.now() + delayMs + 1400 });
    window.setTimeout(() => {
      sp.zone = 'gone';
      sp.selected = false;
      sp.hovered = false;
      sp.tx = this.tableW + this.cw * 1.5;
      sp.ty = this.rects.play.y - this.ch * 0.3;
      sp.tr = 25 + Math.random() * 30;
      sp.ts = 0.9;
      sp.z = 300;
      sp.kick(-250, -500, -20);
    }, delayMs);
  }

  private setBusy(b: boolean): void {
    this.busy = b;
    this.root.classList.toggle('is-busy', b);
    if (b) {
      q<HTMLButtonElement>(this.root, '#btn-play').disabled = true;
      q<HTMLButtonElement>(this.root, '#btn-discard').disabled = true;
    }
  }

  private countTo(el: HTMLElement, from: number, to: number, ms: number): Promise<void> {
    return new Promise((resolve) => {
      // timer (não rAF) para não travar a sequência com a aba em segundo plano
      const start = performance.now();
      const id = window.setInterval(() => {
        const k = Math.min(1, (performance.now() - start) / ms);
        const e = 1 - Math.pow(1 - k, 3);
        el.textContent = fmt(from + (to - from) * e);
        if (k >= 1) {
          window.clearInterval(id);
          resolve();
        }
      }, 16);
    });
  }

  // ---------------------------------------------------------------- sequências

  /** Joga as cartas selecionadas: voam ao centro, pontuam uma a uma, somam e saem. */
  async playSequence(result: ScoreResult, fromScore: number): Promise<void> {
    const vm = this.vm;
    if (!vm) return;
    this.setBusy(true);
    const selected = this.handOrder.filter((u) => vm.state.selected.includes(u));
    this.handOrder = this.handOrder.filter((u) => !selected.includes(u));
    this.playOrder = selected;
    selected.forEach((uid, i) => {
      const sp = this.sprites.get(uid);
      if (!sp) return;
      sp.zone = 'play';
      sp.selected = false;
      sp.hovered = false;
      sp.kick(0, -600 - i * 60, (i % 2 ? 1 : -1) * 30);
    });
    await wait(520);

    const scoring = new Set(result.hand.scoringCards.map((c) => c.uid));
    for (const uid of this.playOrder) {
      const sp = this.sprites.get(uid);
      if (sp && !scoring.has(uid)) sp.dim = true;
    }

    const label = q(this.root, '#hand-label');
    const chipsEl = q(this.root, '#chips-box');
    const multEl = q(this.root, '#mult-box');
    let chips = result.hand.baseChips;
    let mult = result.hand.baseMult;
    label.textContent = result.hand.label;
    chipsEl.textContent = fmt(chips);
    multEl.textContent = fmtMult(mult);
    retrigger(label, 'pulse');
    retrigger(chipsEl, 'pulse');
    retrigger(multEl, 'pulse');
    await wait(380);

    // cada carta que pontua: pula, solta "+N" e soma nas fichas
    let i = 0;
    for (const uid of this.playOrder) {
      if (!scoring.has(uid)) continue;
      const sp = this.sprites.get(uid);
      if (!sp) continue;
      const n = cardChips(sp.card);
      sp.bump(1);
      sp.kick(0, -420, 0);
      this.popText(sp.tx + this.cw / 2, sp.ty - 10, `+${n}`, 'chips');
      chips += n;
      chipsEl.textContent = fmt(chips);
      retrigger(chipsEl, 'pulse');
      this.shake('soft');
      await wait(Math.max(230, 430 - i * 45));
      i++;
    }

    // efeitos de itens (se houver): os itens pulam e soltam o bônus
    const pz = this.rects.play;
    if (chips !== result.chips || mult !== result.mult) {
      this.root.querySelectorAll<HTMLElement>('#items .item').forEach((el, k) =>
        window.setTimeout(() => retrigger(el, 'trigger'), k * 90),
      );
    }
    if (chips !== result.chips) {
      this.popText(pz.x + pz.w / 2, pz.y + 20, `+${fmt(result.chips - chips)} fichas`, 'chips');
      chips = result.chips;
      chipsEl.textContent = fmt(chips);
      retrigger(chipsEl, 'pulse');
      await wait(380);
    }
    if (mult !== result.mult) {
      this.popText(pz.x + pz.w / 2, pz.y + 20, `×${fmtMult(result.mult)} mult`, 'mult');
      mult = result.mult;
      multEl.textContent = fmtMult(mult);
      retrigger(multEl, 'pulse');
      await wait(380);
    }
    await wait(200);

    // fichas × mult → explosão do total
    const burst = q(this.root, '#burst');
    burst.textContent = '0';
    retrigger(burst, 'show');
    const big = result.score >= vm.state.gym.targetScore * 0.4;
    this.shake(big ? 'hard' : 'soft');
    const roundEl = q(this.root, '#round-score');
    await Promise.all([
      this.countTo(burst, 0, result.score, 650),
      this.countTo(roundEl, fromScore, fromScore + result.score, 900),
    ]);
    this.shownScore = fromScore + result.score;
    retrigger(roundEl, 'pulse');
    await wait(450);
    burst.classList.remove('show');

    // cartas jogadas saem voando
    this.playOrder.forEach((uid, k) => {
      const sp = this.sprites.get(uid);
      if (sp) this.throwAway(sp, k * 75);
    });
    this.playOrder = [];
    label.innerHTML = '&nbsp;';
    chipsEl.textContent = '0';
    multEl.textContent = '0';
    await wait(380);
    this.setBusy(false);
  }

  /** Descarta as cartas selecionadas: saem voando para a direita. */
  async discardSequence(): Promise<void> {
    const vm = this.vm;
    if (!vm) return;
    this.setBusy(true);
    const selected = this.handOrder.filter((u) => vm.state.selected.includes(u));
    this.handOrder = this.handOrder.filter((u) => !selected.includes(u));
    selected.forEach((uid, i) => {
      const sp = this.sprites.get(uid);
      if (sp) this.throwAway(sp, i * 70);
    });
    await wait(260 + selected.length * 70);
    this.setBusy(false);
  }

  // ---------------------------------------------------------------- overlay

  private itemHtml(item: TrainerItem): string {
    return `<div class="item" data-rarity="${item.rarity}" title="${esc(item.description)}">
      <div class="item-top">
        <img class="item-icon" src="${item.sprite}" alt="" draggable="false" />
        <div class="item-name">${esc(item.name)}</div>
      </div>
      <div class="item-desc">${esc(item.description)}</div>
    </div>`;
  }

  private renderOverlay(vm: ViewModel, prev: ViewModel | null): void {
    const host = q(this.root, '#overlay');
    const { state, phase } = vm;
    if (phase === 'playing') {
      host.innerHTML = '';
      host.dataset.phase = '';
      return;
    }
    const samePhase = host.dataset.phase === phase && host.innerHTML !== '';
    // saiu da partida: limpa textos de bônus que ainda estejam na mesa
    if (!samePhase) this.fx.replaceChildren();
    // na loja, só re-renderiza o conteúdo (sem repetir a animação de entrada)
    if (samePhase && phase !== 'shop') return;
    if (samePhase && prev && prev.shop === vm.shop && prev.money === vm.money && prev.items === vm.items) return;
    // ofertas só "distribuem" de novo quando a loja é (re)rolada, não ao comprar/vender
    const dealIn = !samePhase || (prev !== null && prev.shopSeq !== vm.shopSeq);
    host.dataset.phase = phase;

    let body = '';
    if (phase === 'reward' && vm.reward) {
      const r = vm.reward;
      body = `
        <div class="panel overlay-card won">
          <div class="ov-title">Ginásio vencido!</div>
          <div class="inner ov-body">
            <div class="ov-score"><span class="star">✦</span>${fmt(state.score)}</div>
            <div class="reward-rows">
              <div class="rrow" style="--d:0.2s"><span>Vitória contra ${esc(state.gym.leader)}</span><b>+$${r.base}</b></div>
              <div class="rrow" style="--d:0.35s"><span>${r.handsBonus} ${r.handsBonus === 1 ? 'jogada restante' : 'jogadas restantes'}</span><b>+$${r.handsBonus}</b></div>
              <div class="rrow" style="--d:0.5s"><span>Juros</span><b>+$${r.interest}</b></div>
            </div>
          </div>
          <button class="btn orange wide" id="ov-collect">Receber $${r.total}</button>
        </div>`;
    } else if (phase === 'shop' && vm.shop) {
      const offers = vm.shop.offers
        .map((o, i) => {
          const can = !o.sold && vm.money >= o.price;
          const price = `<button class="btn small ${can ? 'gold' : 'orange'}" data-buy="${i}" ${can ? '' : 'disabled'}>${o.sold ? 'Vendido' : `$${o.price}`}</button>`;
          if (o.kind === 'card') {
            const sp = o.card.species;
            return `<div class="offer ${o.sold ? 'sold' : ''}" style="--i:${i}">
              <div class="mini-card" data-rarity="${sp.rarity}">
                <span class="mc-chips">${cardChips(o.card)}</span>
                <img src="${sp.sprite}" alt="" draggable="false" />
                <span class="mc-name">${cap(sp.name)}</span>
              </div>${price}</div>`;
          }
          return `<div class="offer ${o.sold ? 'sold' : ''}" style="--i:${i}">
            ${this.itemHtml(o.item)}${price}</div>`;
        })
        .join('');
      const owned = vm.items.length
        ? vm.items
            .map(
              (it, i) => `<div class="offer owned" style="--i:${i}">${this.itemHtml(it)}
                <button class="btn small green" data-sell="${esc(it.id)}">Vender $${Math.ceil(it.cost / 2)}</button></div>`,
            )
            .join('')
        : `<div class="items-empty">Nenhum item ainda</div>`;
      const canReroll = vm.money >= vm.rerollCost;
      body = `
        <div class="panel overlay-card shop">
          <div class="ov-title shop-title">Loja <span class="money-tag">$${vm.money}</span></div>
          <div class="inner shop-grid ${dealIn ? 'deal' : ''}">${offers}</div>
          <div class="shop-owned-lbl lbl">Seus itens ${vm.items.length}/${vm.maxItems}</div>
          <div class="inner shop-grid owned-grid">${owned}</div>
          <div class="shop-actions">
            <button class="btn green" id="ov-reroll" ${canReroll ? '' : 'disabled'}>Rerolar $${vm.rerollCost}</button>
            <button class="btn red" id="ov-leave">Próximo ginásio</button>
          </div>
        </div>`;
    } else if (phase === 'runWon') {
      body = `
        <div class="panel overlay-card won">
          <div class="ov-title">Campeão!</div>
          <div class="inner ov-body">
            <div class="lbl">Você venceu todos os ginásios</div>
            <div class="ov-score"><span class="star">✦</span>${fmt(state.score)}</div>
          </div>
          <button class="btn blue wide" id="btn-restart">Nova run</button>
        </div>`;
    } else {
      body = `
        <div class="panel overlay-card lost">
          <div class="ov-title">Fim de jogo</div>
          <div class="inner ov-body">
            <div class="lbl">${esc(state.gym.name)} · meta ${fmt(state.gym.targetScore)}</div>
            <div class="ov-score"><span class="star">✦</span>${fmt(state.score)}</div>
          </div>
          <button class="btn red wide" id="btn-restart">Jogar de novo</button>
        </div>`;
    }
    host.innerHTML = `<div class="overlay ${samePhase ? 'no-anim' : ''}">${body}</div>`;
    host.querySelector('#btn-restart')?.addEventListener('click', () => this.h.onRestart());
    host.querySelector('#ov-collect')?.addEventListener('click', () => this.h.onCollect());
    host.querySelector('#ov-leave')?.addEventListener('click', () => this.h.onLeaveShop());
    host.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach((b) =>
      b.addEventListener('click', () => this.h.onBuy(Number(b.dataset.buy))),
    );
    host.querySelector('#ov-reroll')?.addEventListener('click', () => this.h.onReroll());
    host.querySelectorAll<HTMLButtonElement>('[data-sell]').forEach((b) =>
      b.addEventListener('click', () => this.h.onSell(b.dataset.sell ?? '')),
    );
  }
}

const GYM_COLORS: [string, string][] = [
  ['#d9902f', '#94570f'], // Pewter (pedra)
  ['#2f9be0', '#155f96'], // Cerulean (água)
  ['#e8b81f', '#9a7a0c'], // Vermilion (elétrico)
  ['#4fb35a', '#26702f'],
  ['#c254c9', '#7a2a80'],
];
