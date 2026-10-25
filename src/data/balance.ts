export const BALANCE = {
  wavePerStage: 10,
  bossWave: 10,
  eliteWave: 5,

  // Enemy power grows quadratically with the global wave. Player power grows
  // roughly linearly (levels + item level), so later stages take longer but
  // never outrun the hero forever. Tuned with scripts/pacing.ts.
  enemyHpBase: 40,
  enemyHpPerWave: 80,
  enemyHpQuad: 1.2,
  enemyHpCubic: 0.01,
  enemyAtkBase: 4,
  enemyAtkPerWave: 0.55,
  enemyDefBase: 0,
  enemyDefPerWave: 0.35,
  eliteHpMult: 1.8,
  eliteAtkMult: 1.3,
  bossHpMult: 6,
  bossAtkMult: 1.4,
  enemyAtkSpeed: 0.7,
  eliteAtkSpeed: 0.8,
  bossAtkSpeed: 0.6,
  // A normal wave fields one monster per party member, up to this many. Each
  // one's HP and ATK is divided by √count, so the wave grows, not the numbers.
  enemyPackCap: 5,
  // Share of a hit on the front monster that also lands on every monster
  // behind it. The splash can never kill, so the wave still clears front to
  // back; it only stops a five-monster wave from being five solo fights in a
  // row. Solo runs face one monster, so their curve is untouched.
  packSplash: 0.3,

  // Item drop chance per kill, by enemy kind. Offline reads these too, so the
  // expedition report and the live run agree on what an hour is worth.
  dropNormal: 0.16,
  dropElite: 0.45,
  dropBoss: 1,
  // Gear is per character now, so five characters chase five six-slot sets.
  // Drops scale with the roster instead of raising the base rate: a solo run
  // keeps exactly the numbers every pacing run and balance test was measured
  // on, while a full party gets 2.5x the items per kill. Measured with
  // scripts/pacing.ts (solo arc unchanged) and counted through kill events.
  dropPartyStep: 0.375,

  // Rewards track enemy HP so later stages stay worth farming.
  goldBase: 5,
  goldPerHp: 0.015,
  bossGoldMult: 10,
  expBase: 5,
  expPerHp: 0.02,
  bossExpMult: 8,

  heroHpBase: 120,
  heroHpPerLevel: 15,
  heroAtkBase: 18,
  heroAtkPerLevel: 4,
  heroDefBase: 3,
  heroDefPerLevel: 1,
  heroAtkSpeed: 1.2,
  heroCrit: 0.08,
  heroCritDmg: 1.5,
  heroCritCap: 0.75,

  // Per-item enhancement: +12% of the item's own stats per level.
  enhanceMax: 15,
  enhanceItemPerLevel: 0.12,
  enhanceGuaranteed: 5,
  enhanceChanceStart: 0.9,
  enhanceChanceStep: 0.06,
  enhanceChanceMin: 0.2,
  enhancePityStep: 0.05,
  enhanceCostBase: 10,
  enhanceCostPerLevel: 1.5,
  enhanceCostGrowth: 1.55,

  // Refine: rerolls substats at a flat price and raises a per-slot refine
  // level. Level gates how good a roll can be, so the chase is progress, not
  // an exploding bill.
  refineMax: 20,
  /** Attempts per level; a bad roll still moves the bar. */
  refineProgress: 10,
  refineCostBase: 120,
  refineCostPerLevel: 6,
  /** Highest roll quality (0–1) at level 0, and the gain per level. */
  refineCapBase: 0.5,
  refineCapPerLevel: 0.025,
  /** Rolls without an S-or-better line before one is forced. */
  refinePity: 30,
  refinePityQuality: 0.9,

  substatSlots: {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 3,
    mythic: 4,
  },
  substatMult: {
    common: 1,
    rare: 1.15,
    epic: 1.3,
    legendary: 1.5,
    mythic: 1.7,
  },
  substatAtkPct: { min: 0.02, max: 0.05 },
  substatHpPct: { min: 0.02, max: 0.06 },
  substatCrit: { min: 0.005, max: 0.015 },
  substatSpeed: { min: 0.01, max: 0.03 },
  substatDefPerLevel: 0.3,

  // Enchant: spend Rune Essence to socket an elemental rune.
  maxRunes: 3,
  essenceCostBase: 2,
  essenceCostGrowth: 1.35,
  runeValueMin: 0.02,
  runeValueMax: 0.04,
  runeResonanceMult: 1.5,
  runePowerWeight: 300,
  eliteEssence: 1,
  bossEssence: 2,

  // Boost: permanent tree paid with Boss Cores.
  boostMax: 10,
  bossCoreBase: 1,
  bossBookBase: 1,

  levelExpBase: 25,
  levelExpGrowth: 1.3,

  respawnSeconds: 3,
  dpsWindowSeconds: 5,
  // Two deaths while pushing a stage send the knight back to the farm stage.
  retreatAfterDeaths: 2,

  // Offline expedition: 85% of the active farm rate, capped at 8 hours.
  offlineEfficiency: 0.85,
  offlineCapSeconds: 8 * 60 * 60,
  offlineMinSeconds: 60,
  offlineItemCap: 8,
  offlineKillFloorSeconds: 0.5,

  // Ascension: reset the run for permanent Star Shard upgrades.
  ascendStage: 50,
  ascendStartStageStep: 2,
  ascendOfflineHoursPerRank: 2,
  ascendMightAtk: 0.08,
  ascendVigorHp: 0.08,
  ascendProsperityGold: 0.08,
  ascendScavengerDrop: 0.03,
} as const;
