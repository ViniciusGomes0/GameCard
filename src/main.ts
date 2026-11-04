import './ui/styles.css';
import { preview } from './state/gameState';
import {
  buy,
  collectReward,
  discardSelected,
  leaveShop,
  playSelected,
  reroll,
  sellItem,
  startRun,
  MAX_ITEMS,
  toggleSelect,
  type RunState,
} from './state/runState';
import { GYMS } from './data/gyms';
import { GameUI } from './ui/render';
import { startBackground, TITLE } from './ui/background';
import { TitleScreen } from './ui/title';
import { SPECIES } from './data/pokemon';
import { loadProgress, recordResult } from './state/save';
import { initSettings } from './ui/settings';
import { clearRun, loadRun, saveRun } from './state/runSave';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('#app não encontrado');

// Run salva (se houver): oferecida como CONTINUAR na tela de título.
const saved = loadRun();
let run: RunState = saved ?? startRun();
let gameKey = 0;
let best = loadProgress().bestScore;
let animating = false;

const ui = new GameUI(root, {
  onToggle(uid: string): void {
    if (animating) return;
    run = toggleSelect(run, uid);
    sync();
  },
  async onPlay(): Promise<void> {
    if (animating) return;
    const fromScore = run.game.score;
    const { run: next, result } = playSelected(run);
    if (!result) return;
    animating = true;
    await ui.playSequence(result, fromScore);
    run = next;
    animating = false;
    if (run.game.status !== 'playing') {
      best = recordResult(run.game.gym.id, run.game.score, run.game.status === 'won').bestScore;
    }
    sync();
  },
  async onDiscard(): Promise<void> {
    if (animating) return;
    const next = discardSelected(run);
    if (next.game === run.game) return;
    animating = true;
    await ui.discardSequence();
    run = next;
    animating = false;
    sync();
  },
  onReroll(): void {
    run = reroll(run);
    sync();
  },
  onSell(id: string): void {
    run = sellItem(run, id);
    sync();
  },
  onCollect(): void {
    run = collectReward(run);
    sync();
  },
  onBuy(index: number): void {
    run = buy(run, index);
    sync();
  },
  onLeaveShop(): void {
    run = leaveShop(run);
    gameKey++;
    sync();
  },
  onRestart(): void {
    clearRun();
    run = startRun();
    gameKey++;
    animating = false;
    sync();
  },
});

function sync(): void {
  saveRun(run);
  ui.update({
    state: run.game,
    preview: preview(run.game),
    bestScore: best,
    deckTotal: run.collection.length,
    money: run.money,
    gymIndex: run.gymIndex,
    gymCount: GYMS.length,
    phase: run.phase,
    reward: run.lastReward,
    shop: run.shop,
    items: run.items,
    maxItems: MAX_ITEMS,
    rerollCost: run.rerollCost,
    shopSeq: run.shopSeq,
    gameKey,
  });
}

const bg = startBackground(ui.canvas, TITLE);

// Tela de título antes da primeira partida; o jogo só é distribuído ao clicar em JOGAR.
root.classList.add('title-on');
new TitleScreen(root, {
  species: SPECIES,
  bestScore: best,
  background: bg,
  resume: saved ? { gym: saved.gymIndex + 1, gymCount: GYMS.length, money: saved.money } : null,
  onPlay(mode) {
    if (mode === 'new' && saved) {
      clearRun();
      run = startRun();
      gameKey++;
    }
    root.classList.remove('title-on');
    sync();
  },
});

// Menu de configurações (engrenagem): gráficos e skins de baralho.
initSettings();
