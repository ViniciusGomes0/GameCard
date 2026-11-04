// Ginásios (fases). MVP: um único ginásio jogável.

import type { GymConfig } from '../core/types';

export const GYMS: GymConfig[] = [
  {
    id: 'pewter',
    name: 'Ginásio de Pewter',
    leader: 'Brock',
    targetScore: 600,
    hands: 4,
    discards: 3,
    reward: 5,
  },
  {
    id: 'cerulean',
    name: 'Ginásio de Cerulean',
    leader: 'Misty',
    targetScore: 1000,
    hands: 4,
    discards: 3,
    reward: 6,
  },
  {
    id: 'vermilion',
    name: 'Ginásio de Vermilion',
    leader: 'Lt. Surge',
    targetScore: 1600,
    hands: 4,
    discards: 4,
    reward: 7,
  },
];

export const PEWTER_GYM = GYMS[0];
