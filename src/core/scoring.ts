// Pontuação = fichas × multiplicador. Puro e testável.

import type { Card, Effect, HandResult, ScoreResult, TrainerItem } from './types';

/** Fichas de uma carta, derivadas do BST. BST 534 (Charizard) → 53 fichas. */
export function cardChips(card: Card): number {
  return Math.floor(card.species.bst / 10);
}

/** Aplica um efeito de item sobre o acumulado atual. */
function applyEffect(
  effect: Effect,
  acc: { chips: number; mult: number },
  hand: HandResult,
): void {
  switch (effect.kind) {
    case 'addChips':
      acc.chips += effect.amount;
      break;
    case 'addMult':
      acc.mult += effect.amount;
      break;
    case 'multMult':
      acc.mult *= effect.factor;
      break;
    case 'addChipsPerScoringCard':
      acc.chips += effect.amount * hand.scoringCards.length;
      break;
    case 'addMultPerType': {
      const n = hand.scoringCards.filter((c) =>
        c.species.types.includes(effect.type),
      ).length;
      acc.mult += effect.amount * n;
      break;
    }
    case 'addMultIfHand':
      if (hand.type === effect.hand) acc.mult += effect.amount;
      break;
  }
}

/**
 * Calcula a pontuação final de uma jogada.
 * Fichas = fichas-base do combo + soma das fichas das cartas que pontuam.
 * Depois os itens (coringas) aplicam seus efeitos: primeiro todos os bônus
 * somados, depois os multiplicadores (×), para o resultado não depender da
 * ordem em que os itens foram comprados.
 */
export function scoreHand(hand: HandResult, items: TrainerItem[] = []): ScoreResult {
  const acc = {
    chips: hand.baseChips + hand.scoringCards.reduce((a, c) => a + cardChips(c), 0),
    mult: hand.baseMult,
  };

  const effects = items.flatMap((item) => item.effects);
  for (const effect of effects) {
    if (effect.kind !== 'multMult') applyEffect(effect, acc, hand);
  }
  for (const effect of effects) {
    if (effect.kind === 'multMult') applyEffect(effect, acc, hand);
  }

  return {
    hand,
    chips: acc.chips,
    mult: acc.mult,
    score: Math.round(acc.chips * acc.mult),
  };
}
