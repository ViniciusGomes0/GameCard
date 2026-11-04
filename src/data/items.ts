// Itens de treinador (coringas), definidos de forma DECLARATIVA.
// Para adicionar um item novo, basta descrever seus `effects`.
// Sprites vêm da PokeAPI (pelo id do item).

import type { TrainerItem } from '../core/types';

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';

/** Monta um item já com a URL do sprite derivada do id. */
function item(it: Omit<TrainerItem, 'sprite'>): TrainerItem {
  return { ...it, sprite: `${SPRITE_BASE}/${it.id}.png` };
}

export const ITEMS: TrainerItem[] = [
  item({
    id: 'choice-band',
    name: 'Choice Band',
    description: '+4 de multiplicador.',
    cost: 4,
    rarity: 'common',
    effects: [{ kind: 'addMult', amount: 4 }],
  }),
  item({
    id: 'leftovers',
    name: 'Leftovers',
    description: '+30 fichas.',
    cost: 4,
    rarity: 'common',
    effects: [{ kind: 'addChips', amount: 30 }],
  }),
  item({
    id: 'silk-scarf',
    name: 'Silk Scarf',
    description: '+3 de multiplicador para cada carta Normal que pontua.',
    cost: 4,
    rarity: 'common',
    effects: [{ kind: 'addMultPerType', type: 'normal', amount: 3 }],
  }),
  item({
    id: 'amulet-coin',
    name: 'Amulet Coin',
    description: '+15 fichas para cada carta que pontua.',
    cost: 5,
    rarity: 'uncommon',
    effects: [{ kind: 'addChipsPerScoringCard', amount: 15 }],
  }),
  item({
    id: 'charcoal',
    name: 'Charcoal',
    description: '+3 de multiplicador para cada carta de Fogo que pontua.',
    cost: 5,
    rarity: 'uncommon',
    effects: [{ kind: 'addMultPerType', type: 'fire', amount: 3 }],
  }),
  item({
    id: 'mystic-water',
    name: 'Mystic Water',
    description: '+3 de multiplicador para cada carta de Água que pontua.',
    cost: 5,
    rarity: 'uncommon',
    effects: [{ kind: 'addMultPerType', type: 'water', amount: 3 }],
  }),
  item({
    id: 'magnet',
    name: 'Magnet',
    description: '+3 de multiplicador para cada carta Elétrica que pontua.',
    cost: 5,
    rarity: 'uncommon',
    effects: [{ kind: 'addMultPerType', type: 'electric', amount: 3 }],
  }),
  item({
    id: 'black-belt',
    name: 'Black Belt',
    description: '+3 de multiplicador para cada carta de Lutador que pontua.',
    cost: 5,
    rarity: 'uncommon',
    effects: [{ kind: 'addMultPerType', type: 'fighting', amount: 3 }],
  }),
  item({
    id: 'expert-belt',
    name: 'Expert Belt',
    description: '+6 de multiplicador se a jogada for uma Sequência Evolutiva.',
    cost: 6,
    rarity: 'rare',
    effects: [{ kind: 'addMultIfHand', hand: 'evolutionStraight', amount: 6 }],
  }),
  item({
    id: 'muscle-band',
    name: 'Muscle Band',
    description: '+20 fichas e +2 de multiplicador.',
    cost: 6,
    rarity: 'rare',
    effects: [
      { kind: 'addChips', amount: 20 },
      { kind: 'addMult', amount: 2 },
    ],
  }),
  item({
    id: 'lucky-egg',
    name: 'Lucky Egg',
    description: 'Multiplicador ×1.5 (aplicado por último).',
    cost: 7,
    rarity: 'rare',
    effects: [{ kind: 'multMult', factor: 1.5 }],
  }),
  item({
    id: 'life-orb',
    name: 'Life Orb',
    description: 'Multiplicador ×2 (aplicado por último).',
    cost: 11,
    rarity: 'legendary',
    effects: [{ kind: 'multMult', factor: 2 }],
  }),
];

export const ITEMS_BY_ID: ReadonlyMap<string, TrainerItem> = new Map(
  ITEMS.map((i) => [i.id, i]),
);
