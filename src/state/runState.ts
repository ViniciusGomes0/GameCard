// Estado de uma "run": progressão por ginásios, dinheiro, coleção e loja.
// Envolve o GameState (partida de um ginásio) com a camada de meta-progressão.

import type { Card, GameState, ScoreResult, TrainerItem } from '../core/types';
import type { RNG } from '../core/deck';
import { createGame, discardSelected as discardGame, playSelected as playGame, toggleSelect as toggleGame } from './gameState';
import { buildStarterDeck } from '../data/pokemon';
import { GYMS } from '../data/gyms';
import { rollShop, type Offer, type Shop } from '../data/shop';

export type RunPhase = 'playing' | 'reward' | 'shop' | 'runWon' | 'lost';

export interface Reward {
  base: number;
  handsBonus: number;
  interest: number;
  total: number;
}

export interface RunState {
  /** Coleção de cartas que o jogador possui (persiste entre ginásios). */
  collection: Card[];
  /** Itens/coringas possuídos. */
  items: TrainerItem[];
  money: number;
  gymIndex: number;
  phase: RunPhase;
  game: GameState;
  shop: Shop | null;
  lastReward: Reward | null;
  /** Custo do próximo reroll da loja (sobe +1 a cada reroll, reseta a cada loja). */
  rerollCost: number;
  /** Incrementa a cada (re)abastecimento da loja — a UI usa para animar a distribuição só então. */
  shopSeq: number;
  rng: RNG;
}

const START_MONEY = 4;
const REROLL_BASE = 5;
/** Limite de itens/coringas que o jogador pode carregar. */
export const MAX_ITEMS = 5;

/** Inicia uma nova run a partir do baralho inicial. */
export function startRun(rng: RNG = Math.random): RunState {
  const collection = buildStarterDeck();
  const items: TrainerItem[] = [];
  return {
    collection,
    items,
    money: START_MONEY,
    gymIndex: 0,
    phase: 'playing',
    game: createGame(GYMS[0], collection, rng, items),
    shop: null,
    lastReward: null,
    rerollCost: REROLL_BASE,
    shopSeq: 0,
    rng,
  };
}

export function toggleSelect(run: RunState, uid: string): RunState {
  if (run.phase !== 'playing') return run;
  return { ...run, game: toggleGame(run.game, uid) };
}

function computeReward(run: RunState): Reward {
  const base = GYMS[run.gymIndex].reward;
  const handsBonus = run.game.handsLeft;
  const interest = Math.min(5, Math.floor(run.money / 5));
  return { base, handsBonus, interest, total: base + handsBonus + interest };
}

/** Joga a seleção; se vencer o ginásio vai para a recompensa, se perder encerra. */
export function playSelected(run: RunState): { run: RunState; result: ScoreResult | null } {
  if (run.phase !== 'playing') return { run, result: null };
  const { state: game, result } = playGame(run.game);
  let next: RunState = { ...run, game };
  if (game.status === 'won') {
    next = { ...next, phase: 'reward', lastReward: computeReward(next) };
  } else if (game.status === 'lost') {
    next = { ...next, phase: 'lost' };
  }
  return { run: next, result };
}

export function discardSelected(run: RunState): RunState {
  if (run.phase !== 'playing') return run;
  return { ...run, game: discardGame(run.game) };
}

/** Coleta a recompensa e abre a loja (reabastecida, reroll resetado). */
export function collectReward(run: RunState): RunState {
  if (run.phase !== 'reward' || !run.lastReward) return run;
  // último ginásio: não há fase seguinte para usar compras — vai direto ao título
  if (run.gymIndex >= GYMS.length - 1) {
    return { ...run, money: run.money + run.lastReward.total, phase: 'runWon' };
  }
  return {
    ...run,
    money: run.money + run.lastReward.total,
    shop: rollShop(run.items.map((i) => i.id), run.gymIndex, run.rng),
    phase: 'shop',
    rerollCost: REROLL_BASE,
    shopSeq: run.shopSeq + 1,
  };
}

/** Rerola as ofertas da loja: cobra o custo atual, que então sobe +1. */
export function reroll(run: RunState): RunState {
  if (run.phase !== 'shop' || run.money < run.rerollCost) return run;
  return {
    ...run,
    money: run.money - run.rerollCost,
    shop: rollShop(run.items.map((i) => i.id), run.gymIndex, run.rng),
    rerollCost: run.rerollCost + 1,
    shopSeq: run.shopSeq + 1,
  };
}

/** Vende um item possuído pela metade do preço (arredondado pra cima). */
export function sellItem(run: RunState, id: string): RunState {
  if (run.phase !== 'shop') return run;
  const owned = run.items.find((i) => i.id === id);
  if (!owned) return run;
  return {
    ...run,
    items: run.items.filter((i) => i.id !== id),
    money: run.money + Math.ceil(owned.cost / 2),
  };
}

function buyOffer(run: RunState, index: number): RunState {
  if (run.phase !== 'shop' || !run.shop) return run;
  const offer: Offer | undefined = run.shop.offers[index];
  if (!offer || offer.sold || run.money < offer.price) return run;

  const offers = run.shop.offers.map((o, i) => (i === index ? { ...o, sold: true } : o));
  const money = run.money - offer.price;

  if (offer.kind === 'card') {
    return { ...run, money, collection: [...run.collection, offer.card], shop: { offers } };
  }
  // item: não duplica o mesmo id e respeita o limite de itens
  const alreadyOwned = run.items.some((i) => i.id === offer.item.id);
  if (!alreadyOwned && run.items.length >= MAX_ITEMS) return run;
  const items = alreadyOwned ? run.items : [...run.items, offer.item];
  return { ...run, money, items, shop: { offers } };
}

export function buy(run: RunState, index: number): RunState {
  return buyOffer(run, index);
}

/** Sai da loja e avança para o próximo ginásio (ou vence a run). */
export function leaveShop(run: RunState): RunState {
  if (run.phase !== 'shop') return run;
  const gymIndex = run.gymIndex + 1;
  if (gymIndex >= GYMS.length) {
    return { ...run, phase: 'runWon' };
  }
  return {
    ...run,
    gymIndex,
    game: createGame(GYMS[gymIndex], run.collection, run.rng, run.items),
    shop: null,
    lastReward: null,
    phase: 'playing',
  };
}
