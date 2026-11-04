import { describe, it, expect } from 'vitest';
import { cardChips, scoreHand } from './scoring';
import { evaluateHand } from './combos';
import { card } from './test-utils';
import { ITEMS_BY_ID } from '../data/items';

describe('cardChips', () => {
  it('fichas = floor(BST / 10)', () => {
    expect(cardChips(card({ name: 'charizard', bst: 534 }))).toBe(53);
    expect(cardChips(card({ name: 'mewtwo', bst: 680 }))).toBe(68);
  });
});

describe('scoreHand', () => {
  it('pontua Par sem itens: (base + fichas) × mult', () => {
    const hand = evaluateHand([
      card({ name: 'a', types: ['fire'], bst: 300 }), // 30 fichas
      card({ name: 'b', types: ['fire'], bst: 400 }), // 40 fichas
    ]);
    // base par = 10 chips / 2 mult; fichas = 10 + 30 + 40 = 80; score = 160
    const r = scoreHand(hand);
    expect(r.hand.type).toBe('pair');
    expect(r.chips).toBe(80);
    expect(r.mult).toBe(2);
    expect(r.score).toBe(160);
  });

  it('Choice Band soma +4 ao multiplicador', () => {
    const hand = evaluateHand([
      card({ name: 'a', types: ['fire'], bst: 300 }),
      card({ name: 'b', types: ['fire'], bst: 400 }),
    ]);
    const r = scoreHand(hand, [ITEMS_BY_ID.get('choice-band')!]);
    // mult 2 + 4 = 6; chips 80 → 480
    expect(r.mult).toBe(6);
    expect(r.score).toBe(480);
  });

  it('Charcoal soma +3 de mult por carta de Fogo que pontua', () => {
    const hand = evaluateHand([
      card({ name: 'a', types: ['fire'], bst: 300 }),
      card({ name: 'b', types: ['fire'], bst: 300 }),
    ]);
    const r = scoreHand(hand, [ITEMS_BY_ID.get('charcoal')!]);
    // 2 cartas fire → mult 2 + 6 = 8
    expect(r.mult).toBe(8);
  });

  it('Lucky Egg aplica ×1.5 no multiplicador', () => {
    const hand = evaluateHand([
      card({ name: 'a', types: ['fire'], bst: 300 }),
      card({ name: 'b', types: ['fire'], bst: 300 }),
    ]);
    const r = scoreHand(hand, [ITEMS_BY_ID.get('lucky-egg')!]);
    expect(r.mult).toBe(3); // 2 × 1.5
  });
});
