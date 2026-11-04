// Ginásios (fases). Metas calibradas por simulação: o 1º ginásio se vence só com o
// baralho inicial; do 2º em diante é preciso comprar itens na loja.

import type { GymConfig } from '../core/types';

const ART = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';

export const GYMS: GymConfig[] = [
  {
    id: 'pewter',
    name: 'Ginásio de Pewter',
    leader: 'Brock',
    targetScore: 1000,
    hands: 4,
    discards: 3,
    reward: 5,
    boss: { name: 'Onix', sprite: `${ART}/95.png` },
  },
  {
    id: 'cerulean',
    name: 'Ginásio de Cerulean',
    leader: 'Misty',
    targetScore: 3000,
    hands: 4,
    discards: 3,
    reward: 6,
    boss: { name: 'Starmie', sprite: `${ART}/121.png` },
  },
  {
    id: 'vermilion',
    name: 'Ginásio de Vermilion',
    leader: 'Lt. Surge',
    targetScore: 5500,
    hands: 4,
    discards: 4,
    reward: 7,
    boss: { name: 'Raichu', sprite: `${ART}/26.png` },
  },
];

export const PEWTER_GYM = GYMS[0];
