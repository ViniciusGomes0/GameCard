import type { PokeType } from '../core/types';

/** Cor característica de cada tipo (para badges e brilho das cartas). */
export const TYPE_COLORS: Record<PokeType, string> = {
  normal: '#9099a1',
  fire: '#ff9d55',
  water: '#4d90d5',
  electric: '#f4d23c',
  grass: '#63bc5a',
  ice: '#73cec0',
  fighting: '#ce4069',
  poison: '#ab6ac8',
  ground: '#d97845',
  flying: '#8fa9de',
  psychic: '#fa7179',
  bug: '#90c12c',
  rock: '#c7b78b',
  ghost: '#5269ac',
  dragon: '#0a6dc4',
  dark: '#5a5366',
  steel: '#5a8ea2',
  fairy: '#ec8fe6',
};

export function typeColor(t: PokeType): string {
  return TYPE_COLORS[t];
}
