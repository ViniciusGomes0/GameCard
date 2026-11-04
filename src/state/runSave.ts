// Salvar/continuar a run no localStorage.
// Guarda só ids (espécie, item, ginásio) e números; ao carregar, reconstrói
// os objetos a partir dos dados do jogo. Se algo não bater (versão antiga,
// dado corrompido, espécie removida), descarta o save em vez de quebrar.

import type { Card, GameStatus, TrainerItem } from '../core/types';
import { reserveUids, type RNG } from '../core/deck';
import { SPECIES } from '../data/pokemon';
import { ITEMS_BY_ID } from '../data/items';
import { GYMS } from '../data/gyms';
import type { Offer } from '../data/shop';
import type { Reward, RunPhase, RunState } from './runState';

const KEY = 'pokelatro:run:v1';
const VERSION = 1;

interface SavedCard { u: string; s: number }
type SavedOffer =
  | { kind: 'card'; card: SavedCard; price: number; sold: boolean }
  | { kind: 'item'; item: string; price: number; sold: boolean };

export interface SavedRun {
  v: number;
  collection: SavedCard[];
  items: string[];
  money: number;
  gymIndex: number;
  phase: RunPhase;
  game: {
    deck: SavedCard[];
    hand: SavedCard[];
    selected: string[];
    handsLeft: number;
    discardsLeft: number;
    score: number;
    status: GameStatus;
  };
  shop: SavedOffer[] | null;
  lastReward: Reward | null;
  rerollCost: number;
  shopSeq: number;
}

/** Fases em que vale a pena salvar (fim de run não tem o que continuar). */
function resumable(phase: RunPhase): boolean {
  return phase === 'playing' || phase === 'reward' || phase === 'shop';
}

const saveCard = (c: Card): SavedCard => ({ u: c.uid, s: c.species.id });

export function serializeRun(run: RunState): SavedRun {
  return {
    v: VERSION,
    collection: run.collection.map(saveCard),
    items: run.items.map((i) => i.id),
    money: run.money,
    gymIndex: run.gymIndex,
    phase: run.phase,
    game: {
      deck: run.game.deck.map(saveCard),
      hand: run.game.hand.map(saveCard),
      selected: run.game.selected.slice(),
      handsLeft: run.game.handsLeft,
      discardsLeft: run.game.discardsLeft,
      score: run.game.score,
      status: run.game.status,
    },
    shop: run.shop
      ? run.shop.offers.map((o): SavedOffer =>
          o.kind === 'card'
            ? { kind: 'card', card: saveCard(o.card), price: o.price, sold: o.sold }
            : { kind: 'item', item: o.item.id, price: o.price, sold: o.sold },
        )
      : null,
    lastReward: run.lastReward,
    rerollCost: run.rerollCost,
    shopSeq: run.shopSeq,
  };
}

const SPECIES_BY_ID = new Map(SPECIES.map((s) => [s.id, s]));

class Corrupt extends Error {}

function num(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Corrupt('número inválido');
  return v;
}

function loadCard(c: SavedCard): Card {
  const species = SPECIES_BY_ID.get(c?.s);
  if (!species || typeof c.u !== 'string') throw new Corrupt('carta inválida');
  return { uid: c.u, species };
}

function loadItem(id: string): TrainerItem {
  const item = ITEMS_BY_ID.get(id);
  if (!item) throw new Corrupt('item inválido');
  return item;
}

/** Reconstrói a run salva. Retorna null se o save for inválido. */
export function deserializeRun(data: SavedRun, rng: RNG = Math.random): RunState | null {
  try {
    if (!data || data.v !== VERSION || !resumable(data.phase)) return null;
    const gym = GYMS[num(data.gymIndex)];
    if (!gym) return null;

    const collection = data.collection.map(loadCard);
    const items = data.items.map(loadItem);
    const deck = data.game.deck.map(loadCard);
    const hand = data.game.hand.map(loadCard);
    const handUids = new Set(hand.map((c) => c.uid));

    const offers: Offer[] | null = data.shop
      ? data.shop.map((o): Offer =>
          o.kind === 'card'
            ? { kind: 'card', card: loadCard(o.card), price: num(o.price), sold: !!o.sold }
            : { kind: 'item', item: loadItem(o.item), price: num(o.price), sold: !!o.sold },
        )
      : null;

    // cartas novas não podem reaproveitar um uid que já existe no save
    reserveUids([
      ...collection, ...deck, ...hand,
      ...(offers ?? []).flatMap((o) => (o.kind === 'card' ? [o.card] : [])),
    ].map((c) => c.uid));

    return {
      collection,
      items,
      money: num(data.money),
      gymIndex: data.gymIndex,
      phase: data.phase,
      game: {
        deck,
        hand,
        selected: data.game.selected.filter((u) => handUids.has(u)),
        handsLeft: num(data.game.handsLeft),
        discardsLeft: num(data.game.discardsLeft),
        score: num(data.game.score),
        gym,
        items,
        status: data.game.status,
      },
      shop: offers ? { offers } : null,
      lastReward: data.lastReward,
      rerollCost: num(data.rerollCost),
      shopSeq: num(data.shopSeq),
      rng,
    };
  } catch {
    return null;
  }
}

/** Salva a run atual; em fim de run (vitória/derrota) apaga o save. */
export function saveRun(run: RunState): void {
  try {
    if (resumable(run.phase)) localStorage.setItem(KEY, JSON.stringify(serializeRun(run)));
    else localStorage.removeItem(KEY);
  } catch {
    // localStorage indisponível (modo privado, cota cheia) — segue sem salvar.
  }
}

export function loadRun(rng: RNG = Math.random): RunState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const run = deserializeRun(JSON.parse(raw) as SavedRun, rng);
    if (!run) localStorage.removeItem(KEY);
    return run;
  } catch {
    return null;
  }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignora
  }
}
