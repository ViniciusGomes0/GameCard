// Fábricas para testes — cartas determinísticas sem depender do seed.

import type { Card, PokeType, PokemonSpecies } from './types';

let n = 0;

export function species(partial: Partial<PokemonSpecies> & { name: string }): PokemonSpecies {
  const bst = partial.bst ?? 300;
  return {
    id: partial.id ?? ++n,
    name: partial.name,
    types: partial.types ?? (['normal'] as PokeType[]),
    baseStats: partial.baseStats ?? {
      hp: 50, attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 50,
    },
    bst,
    family: partial.family ?? partial.name,
    stage: partial.stage ?? 1,
    rarity: partial.rarity ?? 'common',
    sprite: partial.sprite ?? '',
  };
}

export function card(partial: Partial<PokemonSpecies> & { name: string }): Card {
  return { uid: `t${++n}`, species: species(partial) };
}
