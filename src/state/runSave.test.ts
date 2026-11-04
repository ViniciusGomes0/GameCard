import { describe, it, expect } from 'vitest';
import { makeCard, mulberry32 } from '../core/deck';
import { collectReward, startRun, toggleSelect } from './runState';
import { deserializeRun, serializeRun } from './runSave';
import { ITEMS_BY_ID } from '../data/items';
import { SPECIES } from '../data/pokemon';

/** Passa pelo JSON como o localStorage faria. */
const roundTrip = (run: ReturnType<typeof startRun>) =>
  deserializeRun(JSON.parse(JSON.stringify(serializeRun(run))));

describe('salvar e continuar a run', () => {
  it('restaura mão, baralho, seleção, tentativas, dinheiro e itens', () => {
    let run = startRun(mulberry32(7));
    run = { ...run, money: 13, items: [ITEMS_BY_ID.get('charcoal')!] };
    run = { ...run, game: { ...run.game, items: run.items, score: 240, handsLeft: 2, discardsLeft: 1 } };
    run = toggleSelect(run, run.game.hand[0].uid);

    const back = roundTrip(run)!;
    expect(back).not.toBeNull();
    expect(back.money).toBe(13);
    expect(back.items.map((i) => i.id)).toEqual(['charcoal']);
    expect(back.game.items.map((i) => i.id)).toEqual(['charcoal']);
    expect(back.game.hand.map((c) => c.uid)).toEqual(run.game.hand.map((c) => c.uid));
    expect(back.game.hand.map((c) => c.species.name)).toEqual(run.game.hand.map((c) => c.species.name));
    expect(back.game.deck.map((c) => c.uid)).toEqual(run.game.deck.map((c) => c.uid));
    expect(back.game.selected).toEqual([run.game.hand[0].uid]);
    expect(back.game.score).toBe(240);
    expect(back.game.handsLeft).toBe(2);
    expect(back.game.discardsLeft).toBe(1);
    expect(back.game.gym.id).toBe(run.game.gym.id);
    expect(back.collection).toHaveLength(run.collection.length);
  });

  it('restaura a loja aberta, com ofertas vendidas e custo de reroll', () => {
    const base = startRun(mulberry32(8));
    let run = collectReward({ ...base, phase: 'reward', lastReward: { base: 5, handsBonus: 0, interest: 0, total: 5 } });
    run = { ...run, rerollCost: 7, shop: { offers: run.shop!.offers.map((o, i) => (i === 0 ? { ...o, sold: true } : o)) } };

    const back = roundTrip(run)!;
    expect(back.phase).toBe('shop');
    expect(back.rerollCost).toBe(7);
    expect(back.shop!.offers.map((o) => o.sold)).toEqual(run.shop!.offers.map((o) => o.sold));
    expect(back.shop!.offers.map((o) => o.price)).toEqual(run.shop!.offers.map((o) => o.price));
  });

  it('cartas criadas depois de carregar não repetem uids do save', () => {
    const run = startRun(mulberry32(9));
    const back = roundTrip(run)!;
    const used = new Set([...back.collection, ...back.game.deck, ...back.game.hand].map((c) => c.uid));
    expect(used.has(makeCard(SPECIES[0]).uid)).toBe(false);
  });

  it('descarta save corrompido ou de fim de run', () => {
    const data = serializeRun(startRun(mulberry32(10)));
    expect(deserializeRun({ ...data, v: 99 })).toBeNull();
    expect(deserializeRun({ ...data, phase: 'lost' })).toBeNull();
    expect(deserializeRun({ ...data, items: ['nao-existe'] })).toBeNull();
    expect(deserializeRun({ ...data, money: Number.NaN })).toBeNull();
  });
});
