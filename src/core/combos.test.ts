import { describe, it, expect } from 'vitest';
import { evaluateHand } from './combos';
import { card } from './test-utils';

describe('evaluateHand', () => {
  it('detecta Par por mesma espécie', () => {
    const r = evaluateHand([
      card({ name: 'pidgey', id: 16, family: 'pidgey', types: ['normal', 'flying'] }),
      card({ name: 'pidgey', id: 16, family: 'pidgey', types: ['normal', 'flying'] }),
      card({ name: 'gastly', id: 92, family: 'gastly', types: ['ghost', 'poison'] }),
    ]);
    expect(r.type).toBe('pair');
    expect(r.scoringCards).toHaveLength(2);
  });

  it('detecta Par por mesmo tipo (espécies diferentes)', () => {
    const r = evaluateHand([
      card({ name: 'charmander', types: ['fire'] }),
      card({ name: 'growlithe', types: ['fire'] }),
    ]);
    expect(r.type).toBe('pair');
  });

  it('tipo duplo casa com qualquer tipo', () => {
    // Charizard (fire/flying) + Pidgey (normal/flying) formam par por "flying".
    const r = evaluateHand([
      card({ name: 'charizard', types: ['fire', 'flying'] }),
      card({ name: 'pidgey', types: ['normal', 'flying'] }),
    ]);
    expect(r.type).toBe('pair');
  });

  it('detecta Trinca por mesmo tipo', () => {
    const r = evaluateHand([
      card({ name: 'squirtle', types: ['water'] }),
      card({ name: 'poliwag', types: ['water'] }),
      card({ name: 'psyduck', types: ['water'] }),
    ]);
    expect(r.type).toBe('threeOfAKind');
    expect(r.scoringCards).toHaveLength(3);
  });

  it('detecta Mesmo Tipo (Flush) com 5 cartas do mesmo tipo', () => {
    const r = evaluateHand([
      card({ name: 'a', types: ['water'] }),
      card({ name: 'b', types: ['water'] }),
      card({ name: 'c', types: ['water'] }),
      card({ name: 'd', types: ['water'] }),
      card({ name: 'e', types: ['water'] }),
    ]);
    expect(r.type).toBe('flush');
    expect(r.scoringCards).toHaveLength(5);
  });

  it('detecta Sequência Evolutiva (estágios 1-2-3 da mesma família)', () => {
    const r = evaluateHand([
      card({ name: 'charmander', family: 'charmander', stage: 1, types: ['fire'] }),
      card({ name: 'charmeleon', family: 'charmander', stage: 2, types: ['fire'] }),
      card({ name: 'charizard', family: 'charmander', stage: 3, types: ['fire', 'flying'] }),
    ]);
    expect(r.type).toBe('evolutionStraight');
    expect(r.scoringCards).toHaveLength(3);
  });

  it('Sequência Evolutiva vence a Trinca quando ambas existem', () => {
    // As 3 cartas são todas 'fire' (trinca) E a linha evolutiva (sequência).
    const r = evaluateHand([
      card({ name: 'charmander', family: 'charmander', stage: 1, types: ['fire'] }),
      card({ name: 'charmeleon', family: 'charmander', stage: 2, types: ['fire'] }),
      card({ name: 'charizard', family: 'charmander', stage: 3, types: ['fire'] }),
    ]);
    expect(r.type).toBe('evolutionStraight');
  });

  it('detecta Dois Pares (par de Água + par de Fogo)', () => {
    const r = evaluateHand([
      card({ name: 'w1', types: ['water'] }),
      card({ name: 'w2', types: ['water'] }),
      card({ name: 'f1', types: ['fire'] }),
      card({ name: 'f2', types: ['fire'] }),
      card({ name: 'e1', types: ['electric'] }),
    ]);
    expect(r.type).toBe('twoPair');
    expect(r.scoringCards).toHaveLength(4);
  });

  it('detecta Full House (trinca da mesma espécie + par)', () => {
    const r = evaluateHand([
      card({ name: 'charmander', id: 4, types: ['fire'] }),
      card({ name: 'charmander', id: 4, types: ['fire'] }),
      card({ name: 'charmander', id: 4, types: ['fire'] }),
      card({ name: 'squirtle', id: 7, types: ['water'] }),
      card({ name: 'squirtle', id: 7, types: ['water'] }),
    ]);
    expect(r.type).toBe('fullHouse');
    expect(r.scoringCards).toHaveLength(5);
  });

  it('detecta Quadra (4 cartas da mesma espécie)', () => {
    const r = evaluateHand([
      card({ name: 'rattata', id: 19, types: ['normal'] }),
      card({ name: 'rattata', id: 19, types: ['normal'] }),
      card({ name: 'rattata', id: 19, types: ['normal'] }),
      card({ name: 'rattata', id: 19, types: ['normal'] }),
      card({ name: 'pidgey', id: 16, types: ['normal', 'flying'] }),
    ]);
    expect(r.type).toBe('fourOfAKind');
    expect(r.scoringCards).toHaveLength(4);
  });

  it('5 cartas do mesmo tipo (espécies distintas) continua sendo Flush', () => {
    const r = evaluateHand([
      card({ name: 'a', types: ['water'] }),
      card({ name: 'b', types: ['water'] }),
      card({ name: 'c', types: ['water'] }),
      card({ name: 'd', types: ['water'] }),
      card({ name: 'e', types: ['water'] }),
    ]);
    expect(r.type).toBe('flush');
  });

  it('Carta Alta quando não há combinação', () => {
    const r = evaluateHand([
      card({ name: 'pikachu', types: ['electric'], bst: 320 }),
      card({ name: 'geodude', types: ['rock', 'ground'], bst: 300 }),
    ]);
    expect(r.type).toBe('highCard');
    expect(r.scoringCards).toHaveLength(1);
    expect(r.scoringCards[0].species.name).toBe('pikachu'); // maior BST
  });
});
