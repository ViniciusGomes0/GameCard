// Loja entre fases: gera ofertas de Pokémon e itens, com preços por raridade.

import type { Card, PokemonSpecies, Rarity, TrainerItem } from '../core/types';
import type { RNG } from '../core/deck';
import { makeCard } from '../core/deck';
import { SPECIES } from './pokemon';
import { ITEMS } from './items';

export interface CardOffer {
  kind: 'card';
  card: Card;
  price: number;
  sold: boolean;
}

export interface ItemOffer {
  kind: 'item';
  item: TrainerItem;
  price: number;
  sold: boolean;
}

export type Offer = CardOffer | ItemOffer;

export interface Shop {
  offers: Offer[];
}

/** Preço de um Pokémon por raridade. Lendários são caros de propósito. */
export const CARD_PRICE: Record<Rarity, number> = {
  common: 3,
  uncommon: 5,
  rare: 8,
  legendary: 14,
};

const CARDS_IN_SHOP = 2;
const ITEMS_IN_SHOP = 2;

/** Escolhe `n` elementos distintos de `arr`. */
function sample<T>(arr: readonly T[], n: number, rng: RNG): T[] {
  const pool = arr.slice();
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

/**
 * Raridades liberadas conforme o progresso (gymIndex = ginásio atual, base 0).
 * Raros desde a 1ª loja; lendários só a partir da 2ª (rumo ao 3º ginásio).
 */
export function allowedRarities(gymIndex: number): Rarity[] {
  const r: Rarity[] = ['common', 'uncommon', 'rare'];
  if (gymIndex >= 1) r.push('legendary');
  return r;
}

/**
 * Monta uma loja: alguns Pokémon e alguns itens ainda não possuídos,
 * filtrados pelas raridades liberadas no ponto atual da run.
 */
export function rollShop(
  ownedItemIds: readonly string[],
  gymIndex: number,
  rng: RNG = Math.random,
): Shop {
  const rarities = new Set(allowedRarities(gymIndex));

  const speciesPool = SPECIES.filter((s) => rarities.has(s.rarity));
  const speciesPicks: PokemonSpecies[] = sample(speciesPool, CARDS_IN_SHOP, rng);
  const cardOffers: CardOffer[] = speciesPicks.map((s) => ({
    kind: 'card',
    card: makeCard(s),
    price: CARD_PRICE[s.rarity],
    sold: false,
  }));

  const itemPool = ITEMS.filter((i) => rarities.has(i.rarity) && !ownedItemIds.includes(i.id));
  const itemPicks = sample(itemPool.length > 0 ? itemPool : ITEMS, ITEMS_IN_SHOP, rng);
  const itemOffers: ItemOffer[] = itemPicks.map((it) => ({
    kind: 'item',
    item: it,
    price: it.cost,
    sold: false,
  }));

  return { offers: [...cardOffers, ...itemOffers] };
}
