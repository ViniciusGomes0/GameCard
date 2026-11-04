import { describe, it, expect } from 'vitest';
import { evaluateHand } from './combos';
import { scoreHand } from './scoring';
import { card } from './test-utils';
import { ITEMS_BY_ID } from '../data/items';

describe('regressões de combos', () => {
  it('3 Voadores + 2 Terrestres é Full House (não só Trinca)', () => {
    const r = evaluateHand([
      card({ name: 'pidgey', types: ['normal', 'flying'] }),
      card({ name: 'butterfree', types: ['bug', 'flying'] }),
      card({ name: 'zapdos', types: ['electric', 'flying'] }),
      card({ name: 'geodude', types: ['rock', 'ground'] }),
      card({ name: 'graveler', types: ['rock', 'ground'] }),
    ]);
    expect(r.type).toBe('fullHouse');
    expect(r.scoringCards).toHaveLength(5);
  });

  it('5 cartas com um tipo em comum continuam Mesmo Tipo, mesmo com tipos duplos', () => {
    const r = evaluateHand([
      card({ name: 'charmander', types: ['fire'] }),
      card({ name: 'charmeleon', types: ['fire'] }),
      card({ name: 'growlithe', types: ['fire'] }),
      card({ name: 'charizard', types: ['fire', 'flying'] }),
      card({ name: 'moltres', types: ['fire', 'flying'] }),
    ]);
    expect(r.type).toBe('flush');
  });

  it('Dois Pares acha a divisão certa mesmo quando o par de mais fichas atrapalha', () => {
    // Charizard+Butterfree (Voador) é o par mais forte, mas impede o segundo par.
    const r = evaluateHand([
      card({ name: 'charizard', types: ['fire', 'flying'], bst: 534 }),
      card({ name: 'butterfree', types: ['bug', 'flying'], bst: 395 }),
      card({ name: 'charmander', types: ['fire'], bst: 309 }),
      card({ name: 'metapod', types: ['bug'], bst: 205 }),
    ]);
    expect(r.type).toBe('twoPair');
    expect(scoreHand(r).score).toBe(314); // (15 + 53 + 39 + 30 + 20) × 2
  });
});

describe('Quadra por tipo', () => {
  it('4 cartas com Veneno em comum (Ivysaur, Haunter, Bulbasaur, Gastly) é Quadra', () => {
    const r = evaluateHand([
      card({ name: 'ivysaur', types: ['grass', 'poison'] }),
      card({ name: 'haunter', types: ['ghost', 'poison'] }),
      card({ name: 'bulbasaur', types: ['grass', 'poison'] }),
      card({ name: 'gastly', types: ['ghost', 'poison'] }),
    ]);
    expect(r.type).toBe('fourOfAKind');
    expect(r.scoringCards).toHaveLength(4);
  });

  it('com a 5ª carta do mesmo tipo vira Mesmo Tipo, que vale mais que a Quadra', () => {
    const cards = [
      card({ name: 'ivysaur', types: ['grass', 'poison'] }),
      card({ name: 'haunter', types: ['ghost', 'poison'] }),
      card({ name: 'bulbasaur', types: ['grass', 'poison'] }),
      card({ name: 'gastly', types: ['ghost', 'poison'] }),
      card({ name: 'gengar', types: ['ghost', 'poison'] }),
    ];
    const five = evaluateHand(cards);
    const four = evaluateHand(cards.slice(0, 4));
    expect(five.type).toBe('flush');
    expect(scoreHand(five).score).toBeGreaterThan(scoreHand(four).score);
  });
});

describe('ordem dos itens', () => {
  it('multiplicadores (×) são aplicados por último, independente da ordem de compra', () => {
    const hand = evaluateHand([
      card({ name: 'a', types: ['fire'], bst: 300 }),
      card({ name: 'b', types: ['fire'], bst: 400 }),
    ]);
    const egg = ITEMS_BY_ID.get('lucky-egg')!;
    const band = ITEMS_BY_ID.get('choice-band')!;
    expect(scoreHand(hand, [egg, band]).score).toBe(scoreHand(hand, [band, egg]).score);
    expect(scoreHand(hand, [egg, band]).score).toBe(720); // 80 × (2 + 4) × 1.5
  });
});
