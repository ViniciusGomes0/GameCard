// Carrega o seed gerado da PokeAPI e expõe helpers de espécie/baralho inicial.

import type { Card, PokemonSpecies, Rarity } from '../core/types';
import { makeCard } from '../core/deck';
import seed from './pokemon.seed.json';

export const SPECIES: PokemonSpecies[] = seed as unknown as PokemonSpecies[];

export const SPECIES_BY_NAME: ReadonlyMap<string, PokemonSpecies> = new Map(
  SPECIES.map((s) => [s.name, s]),
);

export function getSpecies(name: string): PokemonSpecies {
  const s = SPECIES_BY_NAME.get(name);
  if (!s) throw new Error(`Espécie desconhecida: ${name}`);
  return s;
}

/** Quantas cópias de cada espécie entram no baralho inicial, por raridade. */
const COPIES_BY_RARITY: Record<Rarity, number> = {
  common: 2,
  uncommon: 1,
  rare: 1,
  legendary: 0, // lendários só entram via loja
};

/**
 * Monta o baralho inicial do jogador: cópias de cada espécie não-lendária
 * conforme a raridade. Lendários ficam de fora (comprados depois na loja).
 */
export function buildStarterDeck(): Card[] {
  const deck: Card[] = [];
  for (const species of SPECIES) {
    const copies = COPIES_BY_RARITY[species.rarity];
    for (let i = 0; i < copies; i++) {
      deck.push(makeCard(species));
    }
  }
  return deck;
}
