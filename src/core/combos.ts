// Detecção de combos ("mãos") sobre as cartas selecionadas. Puro e testável.
//
// Regras (naipe = tipo; tipo duplo casa com QUALQUER um dos tipos):
//   - Par ...................... 2 cartas mesma espécie OU mesmo tipo
//   - Trinca ................... 3 cartas mesma espécie OU mesmo tipo
//   - Mesmo Tipo (Flush) ....... 5 cartas que compartilham um tipo
//   - Sequência Evolutiva ...... 3 cartas de uma linha evolutiva (estágios 1-2-3)
//   - Carta Alta ............... nenhuma combinação (pontua a maior carta)

import type { Card, HandResult, HandType, PokeType } from './types';
import { cardChips } from './scoring';

/** Prioridade de desempate: mão de maior rank vence quando ambas existem. */
const RANK: Record<HandType, number> = {
  highCard: 0,
  pair: 1,
  twoPair: 2,
  threeOfAKind: 3,
  evolutionStraight: 4,
  flush: 5,
  fullHouse: 6,
  fourOfAKind: 7,
};

const BASE: Record<HandType, { chips: number; mult: number }> = {
  highCard: { chips: 5, mult: 1 },
  pair: { chips: 10, mult: 2 },
  twoPair: { chips: 20, mult: 2 },
  threeOfAKind: { chips: 20, mult: 3 },
  evolutionStraight: { chips: 30, mult: 4 },
  flush: { chips: 35, mult: 4 },
  fullHouse: { chips: 40, mult: 4 },
  fourOfAKind: { chips: 60, mult: 7 },
};

const LABEL: Record<HandType, string> = {
  highCard: 'Carta Alta',
  pair: 'Par',
  twoPair: 'Dois Pares',
  threeOfAKind: 'Trinca',
  evolutionStraight: 'Sequência Evolutiva',
  flush: 'Mesmo Tipo',
  fullHouse: 'Full House',
  fourOfAKind: 'Quadra',
};

function chipsDesc(a: Card, b: Card): number {
  return cardChips(b) - cardChips(a);
}

function sumChips(cards: Card[]): number {
  return cards.reduce((acc, c) => acc + cardChips(c), 0);
}

/** Melhor grupo de `n` cartas que são da MESMA espécie. */
function bestSameSpecies(cards: Card[], n: number): Card[] | null {
  const groups = new Map<number, Card[]>();
  for (const c of cards) {
    const g = groups.get(c.species.id) ?? [];
    g.push(c);
    groups.set(c.species.id, g);
  }
  let best: Card[] | null = null;
  for (const g of groups.values()) {
    if (g.length >= n) {
      const pick = g.slice().sort(chipsDesc).slice(0, n);
      if (!best || sumChips(pick) > sumChips(best)) best = pick;
    }
  }
  return best;
}

/** Melhor grupo de `n` cartas que compartilham UM tipo (tipo duplo casa com qualquer). */
function bestSameType(cards: Card[], n: number): Card[] | null {
  const groups = new Map<PokeType, Card[]>();
  for (const c of cards) {
    for (const t of c.species.types) {
      const g = groups.get(t) ?? [];
      g.push(c);
      groups.set(t, g);
    }
  }
  let best: Card[] | null = null;
  for (const g of groups.values()) {
    if (g.length >= n) {
      const pick = g.slice().sort(chipsDesc).slice(0, n);
      if (!best || sumChips(pick) > sumChips(best)) best = pick;
    }
  }
  return best;
}

/** Melhor grupo de `n` cartas por espécie OU tipo (o de maior pontuação). */
function bestGroup(cards: Card[], n: number): Card[] | null {
  const a = bestSameSpecies(cards, n);
  const b = bestSameType(cards, n);
  if (!a) return b;
  if (!b) return a;
  return sumChips(a) >= sumChips(b) ? a : b;
}

/** Remove de `cards` todas as cartas presentes em `remove` (por uid). */
function without(cards: Card[], remove: Card[]): Card[] {
  const uids = new Set(remove.map((c) => c.uid));
  return cards.filter((c) => !uids.has(c.uid));
}

/** Dois Pares: um par + outro par disjunto (4 cartas). */
function twoPair(cards: Card[]): Card[] | null {
  const first = bestGroup(cards, 2);
  if (!first) return null;
  const second = bestGroup(without(cards, first), 2);
  if (!second) return null;
  return [...first, ...second];
}

/**
 * Full House: uma trinca da MESMA ESPÉCIE + um par disjunto (5 cartas).
 * A trinca é por espécie (eixo "valor") para não colidir com o Flush (eixo "tipo").
 */
function fullHouse(cards: Card[]): Card[] | null {
  const trip = bestSameSpecies(cards, 3);
  if (!trip) return null;
  const pair = bestGroup(without(cards, trip), 2);
  if (!pair) return null;
  return [...trip, ...pair];
}

/** 3 cartas de uma mesma família cobrindo estágios 1-2-3. */
function evolutionStraight(cards: Card[]): Card[] | null {
  const families = new Map<string, Card[]>();
  for (const c of cards) {
    const g = families.get(c.species.family) ?? [];
    g.push(c);
    families.set(c.species.family, g);
  }
  let best: Card[] | null = null;
  for (const g of families.values()) {
    // melhor carta de cada estágio
    const byStage = new Map<number, Card>();
    for (const c of g) {
      const cur = byStage.get(c.species.stage);
      if (!cur || cardChips(c) > cardChips(cur)) byStage.set(c.species.stage, c);
    }
    // procura 3 estágios consecutivos presentes
    for (let start = 1; start <= 1; start++) {
      const run = [start, start + 1, start + 2];
      if (run.every((s) => byStage.has(s))) {
        const pick = run.map((s) => byStage.get(s)!);
        if (!best || sumChips(pick) > sumChips(best)) best = pick;
      }
    }
  }
  return best;
}

function build(type: HandType, scoringCards: Card[]): HandResult {
  return {
    type,
    label: LABEL[type],
    scoringCards,
    baseChips: BASE[type].chips,
    baseMult: BASE[type].mult,
  };
}

/**
 * Avalia as cartas selecionadas e retorna o MELHOR combo encontrado.
 * `selected` deve ter de 1 a 5 cartas.
 */
export function evaluateHand(selected: Card[]): HandResult {
  if (selected.length === 0) {
    return build('highCard', []);
  }

  const candidates: HandResult[] = [];

  // Quadra = 4 da MESMA ESPÉCIE (eixo "valor"), distinta do Flush (eixo "tipo").
  const quadra = bestSameSpecies(selected, 4);
  if (quadra) candidates.push(build('fourOfAKind', quadra));

  const full = fullHouse(selected);
  if (full) candidates.push(build('fullHouse', full));

  const flush = selected.length >= 5 ? bestSameType(selected, 5) : null;
  if (flush) candidates.push(build('flush', flush));

  const straight = evolutionStraight(selected);
  if (straight) candidates.push(build('evolutionStraight', straight));

  const trinca = bestGroup(selected, 3);
  if (trinca) candidates.push(build('threeOfAKind', trinca));

  const dois = twoPair(selected);
  if (dois) candidates.push(build('twoPair', dois));

  const par = bestGroup(selected, 2);
  if (par) candidates.push(build('pair', par));

  if (candidates.length === 0) {
    const high = selected.slice().sort(chipsDesc)[0];
    return build('highCard', [high]);
  }

  // Maior rank vence; empate (não ocorre entre tipos distintos) usa mais fichas.
  candidates.sort((a, b) => {
    if (RANK[b.type] !== RANK[a.type]) return RANK[b.type] - RANK[a.type];
    return sumChips(b.scoringCards) - sumChips(a.scoringCards);
  });
  return candidates[0];
}

export { BASE as HAND_BASE, LABEL as HAND_LABEL, RANK as HAND_RANK };
