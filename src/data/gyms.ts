// Ginásios divididos em 3 rounds de 3 ginásios cada.
// Round 1 (sem itens): 600 → 900 → 1200
// Round 2 (pós 1ª loja): 900 → 1200 → 2000
// Round 3 (pós 2ª loja): 2000 → 2500 → 3000
// A loja só aparece ao fim de cada round (a cada ROUND_SIZE ginásios).

import type { GymConfig } from '../core/types';

export const ROUND_SIZE = 3;

const ART = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';

export const GYMS: GymConfig[] = [
  // ── Round 1 ──────────────────────────────────────────────
  {
    id: 'pewter',
    name: 'Ginásio de Pewter',
    leader: 'Brock',
    targetScore: 600,
    hands: 4,
    discards: 3,
    reward: 4,
    boss: { name: 'Onix', sprite: `${ART}/95.png` },
  },
  {
    id: 'cerulean',
    name: 'Ginásio de Cerulean',
    leader: 'Misty',
    targetScore: 900,
    hands: 4,
    discards: 3,
    reward: 5,
    boss: { name: 'Starmie', sprite: `${ART}/121.png` },
  },
  {
    id: 'vermilion',
    name: 'Ginásio de Vermilion',
    leader: 'Lt. Surge',
    targetScore: 1200,
    hands: 4,
    discards: 3,
    reward: 6,
    boss: { name: 'Raichu', sprite: `${ART}/26.png` },
  },
  // ── Round 2 ──────────────────────────────────────────────
  {
    id: 'celadon',
    name: 'Ginásio de Celadon',
    leader: 'Erika',
    targetScore: 900,
    hands: 4,
    discards: 3,
    reward: 5,
    boss: { name: 'Vileplume', sprite: `${ART}/45.png` },
  },
  {
    id: 'fuchsia',
    name: 'Ginásio de Fuchsia',
    leader: 'Koga',
    targetScore: 1200,
    hands: 4,
    discards: 3,
    reward: 6,
    boss: { name: 'Weezing', sprite: `${ART}/110.png` },
  },
  {
    id: 'saffron',
    name: 'Ginásio de Saffron',
    leader: 'Sabrina',
    targetScore: 2000,
    hands: 4,
    discards: 4,
    reward: 8,
    boss: { name: 'Alakazam', sprite: `${ART}/65.png` },
  },
  // ── Round 3 ──────────────────────────────────────────────
  {
    id: 'cinnabar',
    name: 'Ginásio de Cinnabar',
    leader: 'Blaine',
    targetScore: 2000,
    hands: 4,
    discards: 4,
    reward: 7,
    boss: { name: 'Arcanine', sprite: `${ART}/59.png` },
  },
  {
    id: 'viridian',
    name: 'Ginásio de Viridian',
    leader: 'Giovanni',
    targetScore: 2500,
    hands: 4,
    discards: 4,
    reward: 9,
    boss: { name: 'Rhydon', sprite: `${ART}/112.png` },
  },
  {
    id: 'indigo',
    name: 'Plateau Indigo',
    leader: 'Campeão',
    targetScore: 3000,
    hands: 5,
    discards: 4,
    reward: 12,
    boss: { name: 'Mewtwo', sprite: `${ART}/150.png` },
  },
];

export const PEWTER_GYM = GYMS[0];
