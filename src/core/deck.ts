// Primitivas de baralho e aleatoriedade — puras e testáveis.

import type { Card, PokemonSpecies } from './types';

export type RNG = () => number;

/** PRNG determinístico (mulberry32) — útil para testes reproduzíveis. */
export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let uidCounter = 0;

/**
 * Garante que as próximas cartas criadas não reaproveitem uids já em uso
 * (usado ao restaurar uma run salva).
 */
export function reserveUids(uids: readonly string[]): void {
  for (const u of uids) {
    const n = Number(/^c(\d+)$/.exec(u)?.[1]);
    if (Number.isFinite(n) && n > uidCounter) uidCounter = n;
  }
}

/** Cria uma carta (instância jogável) de uma espécie. */
export function makeCard(species: PokemonSpecies): Card {
  uidCounter += 1;
  return { uid: `c${uidCounter}`, species };
}

/** Fisher-Yates — retorna um NOVO array embaralhado. */
export function shuffle<T>(arr: readonly T[], rng: RNG = Math.random): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Completa a mão comprando do topo do baralho (muta os arrays passados).
 * Compra até `handSize` cartas ou até o baralho acabar.
 */
export function drawUpTo(deck: Card[], hand: Card[], handSize: number): void {
  while (hand.length < handSize && deck.length > 0) {
    const card = deck.pop();
    if (card) hand.push(card);
  }
}
