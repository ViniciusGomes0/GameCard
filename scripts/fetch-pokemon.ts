// Roda UMA vez para gerar src/data/pokemon.seed.json a partir da PokeAPI.
// Uso:  npm run seed
//
// Curamos aqui a lista (nome, família evolutiva, estágio, raridade);
// a PokeAPI fornece tipos, base stats (BST) e sprite.
//
// Node 24+ executa .ts diretamente e tem fetch global.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface SeedEntry {
  name: string;
  family: string;
  stage: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

// ~32 Pokémon da Gen 1, organizados por linha evolutiva.
const ROSTER: SeedEntry[] = [
  // Iniciais
  { name: 'bulbasaur', family: 'bulbasaur', stage: 1, rarity: 'common' },
  { name: 'ivysaur', family: 'bulbasaur', stage: 2, rarity: 'uncommon' },
  { name: 'venusaur', family: 'bulbasaur', stage: 3, rarity: 'rare' },
  { name: 'charmander', family: 'charmander', stage: 1, rarity: 'common' },
  { name: 'charmeleon', family: 'charmander', stage: 2, rarity: 'uncommon' },
  { name: 'charizard', family: 'charmander', stage: 3, rarity: 'rare' },
  { name: 'squirtle', family: 'squirtle', stage: 1, rarity: 'common' },
  { name: 'wartortle', family: 'squirtle', stage: 2, rarity: 'uncommon' },
  { name: 'blastoise', family: 'squirtle', stage: 3, rarity: 'rare' },
  // Bug / Flying
  { name: 'caterpie', family: 'caterpie', stage: 1, rarity: 'common' },
  { name: 'metapod', family: 'caterpie', stage: 2, rarity: 'uncommon' },
  { name: 'butterfree', family: 'caterpie', stage: 3, rarity: 'rare' },
  // Normal / Flying
  { name: 'pidgey', family: 'pidgey', stage: 1, rarity: 'common' },
  { name: 'pidgeotto', family: 'pidgey', stage: 2, rarity: 'uncommon' },
  { name: 'pidgeot', family: 'pidgey', stage: 3, rarity: 'rare' },
  // Normal
  { name: 'rattata', family: 'rattata', stage: 1, rarity: 'common' },
  { name: 'raticate', family: 'rattata', stage: 2, rarity: 'uncommon' },
  // Electric
  { name: 'pikachu', family: 'pikachu', stage: 1, rarity: 'common' },
  { name: 'raichu', family: 'pikachu', stage: 2, rarity: 'rare' },
  // Rock / Ground
  { name: 'geodude', family: 'geodude', stage: 1, rarity: 'common' },
  { name: 'graveler', family: 'geodude', stage: 2, rarity: 'uncommon' },
  { name: 'golem', family: 'geodude', stage: 3, rarity: 'rare' },
  // Fighting
  { name: 'machop', family: 'machop', stage: 1, rarity: 'common' },
  { name: 'machoke', family: 'machop', stage: 2, rarity: 'uncommon' },
  { name: 'machamp', family: 'machop', stage: 3, rarity: 'rare' },
  // Ghost / Poison
  { name: 'gastly', family: 'gastly', stage: 1, rarity: 'common' },
  { name: 'haunter', family: 'gastly', stage: 2, rarity: 'uncommon' },
  { name: 'gengar', family: 'gastly', stage: 3, rarity: 'rare' },
  // Lendários (raridade alta, custo alto na loja)
  { name: 'articuno', family: 'articuno', stage: 1, rarity: 'legendary' },
  { name: 'zapdos', family: 'zapdos', stage: 1, rarity: 'legendary' },
  { name: 'moltres', family: 'moltres', stage: 1, rarity: 'legendary' },
  { name: 'mewtwo', family: 'mewtwo', stage: 1, rarity: 'legendary' },
];

const STAT_KEYS = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'spAttack',
  'special-defense': 'spDefense',
  speed: 'speed',
};

async function fetchSpecies(entry: SeedEntry) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${entry.name}`);
  if (!res.ok) {
    throw new Error(`Falha ao buscar ${entry.name}: HTTP ${res.status}`);
  }
  const data = await res.json();

  const baseStats = { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
  let bst = 0;
  for (const s of data.stats) {
    const key = STAT_KEYS[s.stat.name as keyof typeof STAT_KEYS];
    if (key) {
      baseStats[key as keyof typeof baseStats] = s.base_stat;
      bst += s.base_stat;
    }
  }

  const types = data.types
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((t: any) => t.type.name);

  const sprite =
    data.sprites?.other?.['official-artwork']?.front_default ??
    data.sprites?.front_default ??
    '';

  return {
    id: data.id,
    name: entry.name,
    types,
    baseStats,
    bst,
    family: entry.family,
    stage: entry.stage,
    rarity: entry.rarity,
    sprite,
  };
}

async function main() {
  console.log(`Buscando ${ROSTER.length} Pokémon na PokeAPI...`);
  const out = [];
  for (const entry of ROSTER) {
    const species = await fetchSpecies(entry);
    out.push(species);
    console.log(`  ✓ #${String(species.id).padStart(3, '0')} ${species.name} (BST ${species.bst})`);
    await new Promise((r) => setTimeout(r, 120)); // gentil com a API
  }
  out.sort((a, b) => a.id - b.id);

  const here = dirname(fileURLToPath(import.meta.url));
  const target = resolve(here, '..', 'src', 'data', 'pokemon.seed.json');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`\nSeed gravado em ${target} (${out.length} espécies).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
