// Estado da partida e transições. Puro (sem DOM) e testável.

import type { Card, GameState, GameStatus, GymConfig, ScoreResult, TrainerItem } from '../core/types';
import { drawUpTo, shuffle, type RNG } from '../core/deck';
import { evaluateHand } from '../core/combos';
import { scoreHand } from '../core/scoring';
import { buildStarterDeck } from '../data/pokemon';

export const HAND_SIZE = 8;
export const MAX_SELECTED = 5;

/**
 * Inicia uma partida contra um ginásio usando a coleção do jogador.
 * `collection` não é modificada — o baralho é um embaralhamento (cópia) dela.
 * Sem `collection`, usa o baralho inicial (compatível com uso de partida única).
 */
export function createGame(
  gym: GymConfig,
  collection: Card[] = buildStarterDeck(),
  rng: RNG = Math.random,
  items: TrainerItem[] = [],
): GameState {
  const deck = shuffle(collection, rng);
  const hand: Card[] = [];
  drawUpTo(deck, hand, HAND_SIZE);
  return {
    deck,
    hand,
    selected: [],
    handsLeft: gym.hands,
    discardsLeft: gym.discards,
    score: 0,
    gym,
    items,
    status: 'playing',
  };
}

/** Cartas atualmente selecionadas (na ordem em que estão na mão). */
export function selectedCards(state: GameState): Card[] {
  return state.hand.filter((c) => state.selected.includes(c.uid));
}

/** Alterna a seleção de uma carta (respeita o limite de 5). */
export function toggleSelect(state: GameState, uid: string): GameState {
  if (state.status !== 'playing') return state;
  const already = state.selected.includes(uid);
  if (already) {
    return { ...state, selected: state.selected.filter((u) => u !== uid) };
  }
  if (state.selected.length >= MAX_SELECTED) return state;
  if (!state.hand.some((c) => c.uid === uid)) return state;
  return { ...state, selected: [...state.selected, uid] };
}

/** Pré-visualiza a pontuação da seleção atual (sem jogar). */
export function preview(state: GameState): ScoreResult | null {
  const cards = selectedCards(state);
  if (cards.length === 0) return null;
  return scoreHand(evaluateHand(cards), state.items);
}

function status(score: number, handsLeft: number, gym: GymConfig): GameStatus {
  if (score >= gym.targetScore) return 'won';
  if (handsLeft <= 0) return 'lost';
  return 'playing';
}

/** Joga as cartas selecionadas: pontua, consome uma jogada e recompra. */
export function playSelected(state: GameState): { state: GameState; result: ScoreResult | null } {
  if (state.status !== 'playing' || state.selected.length === 0 || state.handsLeft <= 0) {
    return { state, result: null };
  }
  const cards = selectedCards(state);
  const result = scoreHand(evaluateHand(cards), state.items);

  const newScore = state.score + result.score;
  const hand = state.hand.filter((c) => !state.selected.includes(c.uid));
  const deck = state.deck.slice();
  drawUpTo(deck, hand, HAND_SIZE);
  const handsLeft = state.handsLeft - 1;

  return {
    state: {
      ...state,
      deck,
      hand,
      selected: [],
      score: newScore,
      handsLeft,
      status: status(newScore, handsLeft, state.gym),
    },
    result,
  };
}

/** Descarta as cartas selecionadas: consome um descarte e recompra. */
export function discardSelected(state: GameState): GameState {
  if (state.status !== 'playing' || state.selected.length === 0 || state.discardsLeft <= 0) {
    return state;
  }
  const hand = state.hand.filter((c) => !state.selected.includes(c.uid));
  const deck = state.deck.slice();
  drawUpTo(deck, hand, HAND_SIZE);
  return {
    ...state,
    deck,
    hand,
    selected: [],
    discardsLeft: state.discardsLeft - 1,
  };
}
