import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../core/deck';
import { rollShop } from '../data/shop';
import { buy, collectReward, leaveShop, reroll, sellItem, startRun } from './runState';
import { ITEMS_BY_ID } from '../data/items';
import { GYMS } from '../data/gyms';

describe('startRun', () => {
  it('começa com dinheiro inicial, no primeiro ginásio', () => {
    const run = startRun(mulberry32(1));
    expect(run.money).toBe(4);
    expect(run.phase).toBe('playing');
    expect(run.gymIndex).toBe(0);
    expect(run.game.gym.id).toBe('pewter');
    expect(run.collection.length).toBeGreaterThan(20);
  });
});

describe('collectReward', () => {
  it('soma a recompensa e abre a loja', () => {
    const base = startRun(mulberry32(2));
    const run = { ...base, phase: 'reward' as const, lastReward: { base: 5, handsBonus: 2, interest: 1, total: 8 } };
    const after = collectReward(run);
    expect(after.money).toBe(4 + 8);
    expect(after.phase).toBe('shop');
    expect(after.shop).not.toBeNull();
  });
});

describe('buy', () => {
  it('compra uma carta: debita, marca vendida e adiciona à coleção', () => {
    const base = startRun(mulberry32(3));
    const run = { ...base, phase: 'shop' as const, money: 50, shop: rollShop([], 0, mulberry32(3)) };
    const offer = run.shop.offers[0];
    const before = run.collection.length;
    const after = buy(run, 0);
    expect(after.money).toBe(50 - offer.price);
    expect(after.shop!.offers[0].sold).toBe(true);
    if (offer.kind === 'card') {
      expect(after.collection.length).toBe(before + 1);
    }
  });

  it('não compra sem dinheiro suficiente', () => {
    const base = startRun(mulberry32(4));
    const run = { ...base, phase: 'shop' as const, money: 0, shop: rollShop([], 0, mulberry32(4)) };
    const after = buy(run, 0);
    expect(after.money).toBe(0);
    expect(after.shop!.offers[0].sold).toBe(false);
    expect(after.collection.length).toBe(run.collection.length);
  });
});

describe('leaveShop', () => {
  it('avança para o próximo ginásio', () => {
    const base = startRun(mulberry32(5));
    const run = { ...base, phase: 'shop' as const, shop: rollShop([], 0, mulberry32(5)) };
    const after = leaveShop(run);
    expect(after.gymIndex).toBe(1);
    expect(after.phase).toBe('playing');
    expect(after.game.gym.id).toBe('cerulean');
  });
});

describe('reroll', () => {
  it('cobra o custo atual e sobe o custo do próximo', () => {
    const base = startRun(mulberry32(6));
    const run = { ...base, phase: 'shop' as const, money: 20, rerollCost: 5, shop: rollShop([], 0, mulberry32(6)) };
    const after = reroll(run);
    expect(after.money).toBe(15);
    expect(after.rerollCost).toBe(6);
    expect(after.shopSeq).toBe(run.shopSeq + 1);
  });

  it('não rerola sem dinheiro', () => {
    const base = startRun(mulberry32(7));
    const run = { ...base, phase: 'shop' as const, money: 2, rerollCost: 5, shop: rollShop([], 0, mulberry32(7)) };
    expect(reroll(run)).toBe(run);
  });
});

describe('sellItem', () => {
  it('vende um item pela metade do preço', () => {
    const base = startRun(mulberry32(8));
    const band = ITEMS_BY_ID.get('choice-band')!; // custo 4
    const run = { ...base, phase: 'shop' as const, money: 0, items: [band] };
    const after = sellItem(run, 'choice-band');
    expect(after.money).toBe(2);
    expect(after.items).toHaveLength(0);
  });
});

describe('fim da campanha', () => {
  it('após o último ginásio, a recompensa leva ao título de Campeão (sem loja)', () => {
    const base = startRun(mulberry32(3));
    const run = {
      ...base,
      gymIndex: GYMS.length - 1,
      phase: 'reward' as const,
      lastReward: { base: 7, handsBonus: 1, interest: 0, total: 8 },
    };
    const after = collectReward(run);
    expect(after.phase).toBe('runWon');
    expect(after.money).toBe(4 + 8);
  });
});
