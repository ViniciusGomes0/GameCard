// Ginásios (fases). Metas calibradas por simulação: o 1º ginásio se vence só com o
// baralho inicial; do 2º em diante é preciso comprar itens na loja.

import type { GymConfig } from '../core/types';

export const GYMS: GymConfig[] = [
  {
    id: 'pewter',
    name: 'Ginásio de Pewter',
    leader: 'Brock',
    targetScore: 1000,
    hands: 4,
    discards: 3,
    reward: 5,
  },
  {
    id: 'cerulean',
    name: 'Ginásio de Cerulean',
    leader: 'Misty',
    targetScore: 3000,
    hands: 4,
    discards: 3,
    reward: 6,
  },
  {
    id: 'vermilion',
    name: 'Ginásio de Vermilion',
    leader: 'Lt. Surge',
    targetScore: 5500,
    hands: 4,
    discards: 4,
    reward: 7,
  },
];

export const PEWTER_GYM = GYMS[0];
