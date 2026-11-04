// Tipos fortes do jogo. Núcleo puro: NÃO importa nada de DOM aqui.

/** Os 18 tipos de Pokémon. Funcionam como "naipes". */
export type PokeType =
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice'
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug'
  | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy';

/** Raridade — controla preço na loja e balanceamento. */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

/** Dados cru de uma espécie, vindos do seed gerado da PokeAPI. */
export interface PokemonSpecies {
  /** Número da Pokédex. */
  id: number;
  name: string;
  /** 1 ou 2 tipos. Tipo duplo casa com QUALQUER um dos tipos nos combos. */
  types: PokeType[];
  baseStats: BaseStats;
  /** Soma dos base stats (BST). Base das fichas da carta. */
  bst: number;
  /** Id da linha evolutiva, ex.: 'charmander'. Usado na Sequência Evolutiva. */
  family: string;
  /** Estágio evolutivo: 1, 2 ou 3. */
  stage: number;
  rarity: Rarity;
  /** URL do sprite/artwork. */
  sprite: string;
}

/** Instância jogável de uma espécie (uma carta concreta na mão/baralho). */
export interface Card {
  /** Id único da instância — usado no DOM e na seleção. */
  uid: string;
  species: PokemonSpecies;
}

/** Tipos de combinação ("mãos de poker") suportados. */
export type HandType =
  | 'highCard'
  | 'pair'
  | 'twoPair'
  | 'threeOfAKind'
  | 'evolutionStraight'
  | 'flush'
  | 'fullHouse'
  | 'fourOfAKind';

/** Resultado da detecção de combo sobre as cartas selecionadas. */
export interface HandResult {
  type: HandType;
  /** Nome amigável em PT-BR. */
  label: string;
  /** Cartas que efetivamente pontuam. */
  scoringCards: Card[];
  baseChips: number;
  baseMult: number;
}

/**
 * Efeitos de itens, declarativos. Para adicionar um item novo basta
 * descrever seus efeitos — a lógica de pontuação já sabe aplicá-los.
 */
export type Effect =
  | { kind: 'addChips'; amount: number }
  | { kind: 'addMult'; amount: number }
  | { kind: 'multMult'; factor: number }
  | { kind: 'addChipsPerScoringCard'; amount: number }
  | { kind: 'addMultPerType'; type: PokeType; amount: number }
  | { kind: 'addMultIfHand'; hand: HandType; amount: number };

/** Item de treinador = "coringa". */
export interface TrainerItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  rarity: Rarity;
  effects: Effect[];
  /** URL do sprite do item (PokeAPI). */
  sprite: string;
}

/** Detalhamento final da pontuação de uma jogada. */
export interface ScoreResult {
  hand: HandResult;
  chips: number;
  mult: number;
  /** Pontos = round(chips * mult). */
  score: number;
}

/** Configuração de um ginásio (fase). */
export interface GymConfig {
  id: string;
  name: string;
  leader: string;
  targetScore: number;
  /** Número de jogadas disponíveis. */
  hands: number;
  /** Número de descartes disponíveis. */
  discards: number;
  /** Dinheiro base ganho ao vencer este ginásio. */
  reward: number;
}

export type GameStatus = 'playing' | 'won' | 'lost';

/** Estado completo de uma partida. */
export interface GameState {
  deck: Card[];
  hand: Card[];
  /** uids das cartas selecionadas (até 5). */
  selected: string[];
  handsLeft: number;
  discardsLeft: number;
  score: number;
  gym: GymConfig;
  items: TrainerItem[];
  status: GameStatus;
}
