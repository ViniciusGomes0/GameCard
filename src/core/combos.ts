// Detecção de combos ("mãos") sobre as cartas selecionadas. Puro e testável.
//
// Regras (naipe = tipo; tipo duplo casa com QUALQUER um dos tipos):
//   - Par ...................... 2 cartas mesma espécie OU mesmo tipo
//   - Trinca ................... 3 cartas mesma espécie OU mesmo tipo
//   - Quadra ................... 4 cartas mesma espécie OU mesmo tipo
//   - Dois Pares ............... 2 pares disjuntos (a melhor combinação, não a gulosa)
//   - Mesmo Tipo (Flush) ....... 5 cartas que compartilham um tipo (a mão mais forte)
//   - Full House ............... Trinca + Par disjunto (espécie OU tipo). Se as 5
//                                cartas têm um tipo em comum, conta como Mesmo Tipo,
//                                a menos que a trinca seja da mesma espécie.
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
  fullHouse: 5,
  fourOfAKind: 6,
  // 5 cartas de um tipo contêm uma Quadra por tipo — então precisa valer mais que ela
  flush: 7,
};

// Valores calibrados por simulação (jogador guloso, 600 partidas): as fichas das
// cartas já pesam muito, então combos fáceis por tipo (Dois Pares, Full House,
// Quadra) têm base contida e a Sequência Evolutiva, mais rara, vale mais.
const BASE: Record<HandType, { chips: number; mult: number }> = {
  highCard: { chips: 5, mult: 1 },
  pair: { chips: 10, mult: 2 },
  twoPair: { chips: 15, mult: 2 },
  threeOfAKind: { chips: 25, mult: 3 },
  evolutionStraight: { chips: 40, mult: 4 },
  fullHouse: { chips: 30, mult: 3 },
  fourOfAKind: { chips: 45, mult: 4 },
  flush: { chips: 70, mult: 6 },
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

/** Todas as combinações de `k` cartas (a mão tem no máximo 5, então é barato). */
function combinations(cards: Card[], k: number): Card[][] {
  const out: Card[][] = [];
  const pick: Card[] = [];
  const rec = (start: number): void => {
    if (pick.length === k) {
      out.push(pick.slice());
      return;
    }
    for (let i = start; i < cards.length; i++) {
      pick.push(cards[i]);
      rec(i + 1);
      pick.pop();
    }
  };
  rec(0);
  return out;
}

function sameSpecies(cards: Card[]): boolean {
  return cards.every((c) => c.species.id === cards[0].species.id);
}

function sharedType(cards: Card[]): boolean {
  return cards[0].species.types.some((t) => cards.every((c) => c.species.types.includes(t)));
}

/** Um grupo (par/trinca) vale se todas as cartas são da mesma espécie OU têm um tipo em comum. */
function isGroup(cards: Card[]): boolean {
  return sameSpecies(cards) || sharedType(cards);
}

/** Melhor de várias opções pelo total de fichas. */
function bestBy(options: Card[][]): Card[] | null {
  let best: Card[] | null = null;
  for (const o of options) if (!best || sumChips(o) > sumChips(best)) best = o;
  return best;
}

/**
 * Dois Pares: dois pares disjuntos (4 cartas). Testa todas as divisões
 * possíveis — escolher primeiro o par de mais fichas pode impedir o segundo.
 */
function twoPair(cards: Card[]): Card[] | null {
  const options: Card[][] = [];
  for (const first of combinations(cards, 2)) {
    if (!isGroup(first)) continue;
    for (const second of combinations(without(cards, first), 2)) {
      if (isGroup(second)) options.push([...first, ...second]);
    }
  }
  return bestBy(options);
}

/**
 * Full House: trinca + par disjunto (5 cartas), cada um por espécie OU tipo.
 * Ex.: 3 Voadores + 2 Terrestres. Se as 5 cartas compartilham um tipo, isso é
 * Mesmo Tipo — então a trinca por tipo não vale ali (só a trinca por espécie).
 */
function fullHouse(cards: Card[]): Card[] | null {
  if (cards.length < 5) return null;
  const options: Card[][] = [];
  for (const trip of combinations(cards, 3)) {
    const bySpecies = sameSpecies(trip);
    if (!bySpecies && !sharedType(trip)) continue;
    for (const pair of combinations(without(cards, trip), 2)) {
      if (!isGroup(pair)) continue;
      const five = [...trip, ...pair];
      if (!bySpecies && sharedType(five)) continue;
      options.push(five);
    }
  }
  return bestBy(options);
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

  // Quadra = 4 da mesma espécie OU com um tipo em comum.
  const quadra = bestGroup(selected, 4);
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
