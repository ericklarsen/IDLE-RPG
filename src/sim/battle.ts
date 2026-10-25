import { ascendNodeById, shardReward } from '../data/ascension';
import { BALANCE } from '../data/balance';
import { CHARACTERS, characterById } from '../data/characters';
import { BOOST_MAX, boostCost } from '../data/boost';
import { PALETTES } from '../data/palettes';
import {
  MOUNTS,
  mountById,
  mountLevelCost,
  mountSkillChance,
  mountSkillPower,
  mountsForTier,
} from '../data/mounts';
import {
  WINGS,
  wingById,
  wingDropChance,
  wingLevelCost,
  wingSkillChance,
  wingSkillPower,
  wingsForTier,
} from '../data/wings';
import {
  DUNGEON_TICKETS,
  DUNGEON_TICKET_CAP,
  DUNGEON_UNLOCK_STAGE,
  DUNGEON_WAVES,
  DUNGEON_TIERS,
  SHOP_CRYSTAL_CAP,
  dungeonTier,
} from '../data/dungeon';
import {
  PETS,
  PET_BASE_MAX,
  PET_EGG_CHANCE,
  PET_MAX_CAP,
  PET_TRIAL_EGG_CHANCE,
  petById,
  petCost,
  petDamage,
  petDps,
  type PetInfo,
} from '../data/pets';
import {
  COSTUME_BOSS_CHANCE,
  COSTUME_COMPLETE_DUST,
  COSTUME_COMPLETE_ESSENCE,
  COSTUME_PITY,
} from '../data/costumes';
import { elementMultiplier } from '../data/elements';
import {
  SURGE_ATK,
  SURGE_CHARGE_HP,
  SURGE_DURATION,
  SURGE_SPEED,
  SURGE_UNLOCK_STAGE,
} from '../data/surge';
import { DUST_BY_RARITY, FORGE_COST, FUSE_COUNT } from '../data/forge';
import { craftableSets, fuseCandidates, fuseTarget, type ForgeOutcome } from './forge';
import {
  ARENA_POINTS_LOSS,
  ARENA_POINTS_WIN,
  ARENA_RIVAL_COUNT,
  ARENA_SKILL_COOLDOWN,
  ARENA_TICKETS,
  ARENA_UNLOCK_STAGE,
  arenaEggChance,
  arenaResult,
  arenaReward,
  arenaRivals,
  arenaSnapshot as buildArenaSnapshot,
  arenaTierInfo,
  emptyArena,
  normalizeArena,
} from './arena';
import {
  leagueReward,
  leagueRollover,
  leagueSnapshot,
  normalizeLeague,
} from './league';
import { SETS } from '../data/sets';
import {
  TRIAL_FLOORS,
  TRIAL_UNLOCK_STAGE,
  normalizeTrial,
  trialFloor,
  trialFloorInfo,
  trialReward,
  trialRollover,
  trialSnapshot,
} from './trial';
import { pickEnemy } from '../data/enemies';
import {
  MAX_ACTIVE_SKILLS,
  SKILL_GLOBAL_COOLDOWN,
  skillById,
  skillScale,
  type SkillInfo,
} from '../data/skills';
import {
  emptyEquipped,
  INVENTORY_CAP,
  RARITIES,
  SLOTS,
  starterWeapon,
} from '../data/items';
import {
  damageRoll,
  enemyKindForWave,
  enemyStats,
  globalWave,
  heroStats,
  levelUpCost,
  rewardFor,
  type HeroStats,
} from './formulas';
import {
  ascendBonuses,
  nodeCost,
  normalizeAscension,
  type NodeBuyResult,
} from './ascension';
import {
  boostBonuses,
  canUpgradeBoost,
  normalizeBoosts,
  totalBoostRefund,
} from './boost';
import { emptyCodex, normalizeCodex } from './codex';
import {
  addCostume,
  claimCostume,
  costumeBonuses,
  costumeSkill,
  emptyCostume,
  forgeQuote,
  normalizeCostume,
  rollCostume,
  trialCostumeTier,
  type CostumeRoll,
} from './costume';
import {
  activePetInfo,
  activePetState,
  addEgg,
  awakenPet,
  currentPets,
  normalizePets,
  petDpsFor,
  petLevel,
  setActive,
  synthesize,
  trainPet,
} from './pets';
import { EVENT_GOAL, EVENT_SET, EVENT_UNLOCK_STAGE, normalizeEvent } from './event';
import {
  activeCharacterId,
  emptyParty,
  normalizeParty,
  partyMembers,
  type PartyView,
} from './party';
import {
  addMount,
  activeMountInfo,
  activeMountState,
  craftMount as craftMountState,
  currentMounts,
  equipMount as equipMountState,
  missingMounts,
  mountBonuses,
  normalizeMounts,
  trainMount as trainMountState,
} from './mounts';
import {
  addWing,
  activeWingInfo,
  activeWingState,
  craftWing as craftWingState,
  emptyWings,
  equipWing as equipWingState,
  missingWings,
  normalizeWings,
  trainWing as trainWingState,
  wingBonuses,
} from './wings';
import {
  buyCrystal,
  buyTicket,
  crystalPrice,
  dungeonReward,
  dungeonRollover,
  dungeonScaling,
  normalizeDungeon,
  normalizeShop,
  ticketPrice,
} from './dungeon';
import {
  earnPalettes,
  emptyPalette,
  normalizePalette,
  wearPalette as wearPaletteState,
} from './palette';
import { createItem } from './loot';
import {
  offlineDps,
  planOffline,
  stageRates,
  type OfflineReport,
} from './offline';
import { bossTarget } from './readiness';
import {
  RIFT_DURATION_SECONDS,
  RIFT_UNLOCK_STAGE,
  dayKey,
  riftChest,
  riftChestGoldMult,
  riftModifiers,
} from './rift';
import { cloneLoadout, normalizeSkills, passiveBonuses } from './skills';
import {
  attunement,
  enhanceChanceFor,
  enhanceCostFor,
  gearBonuses,
  gearScoreOf,
  itemPower,
  nextRuneSlot,
  normalizeItem,
  refineCostFor,
  refineSubstats,
  rollRune,
  runeCostFor,
  substatTier,
  TIER_MIN,
  TIER_ORDER,
  type Attunement,
  type SubstatTier,
} from './upgrade';
import {
  emptyRefine,
  migrateRefine,
  refineCap,
  refineResonance,
  type RefineMap,
} from './refine';
import type {
  ArenaRival,
  ArenaSnapshot,
  ArenaState,
  AscensionState,
  BoostBranch,
  Boosts,
  CodexState,
  CostumeState,
  Element,
  Enemy,
  EnemyKind,
  Equipped,
  EventState,
  Hero,
  CharacterId,
  HudSnapshot,
  Item,
  ItemSet,
  PartyState,
  DungeonResult,
  DungeonSnapshot,
  DungeonState,
  LeagueState,
  MountId,
  MountsSnapshot,
  MountsState,
  WingId,
  WingsSnapshot,
  WingsState,
  Rarity,
  ShopSnapshot,
  ShopState,
  RiftModifier,
  RiftState,
  Rune,
  PetKind,
  PaletteState,
  PetsState,
  SaveData,
  SimEvent,
  SkillLoadout,
  Slot,
  TrialResult,
  TrialRule,
  TrialSnapshot,
  TrialState,
} from './types';

/**
 * A party member who fights beside the active character. Their gear and
 * wardrobe are their own; boost, Ascension, mounts, and wings stay party-wide.
 */
interface Mate extends Hero {
  id: CharacterId;
  /** Seconds until the next swing. */
  cd: number;
  /** Seconds until this member's signature skill is ready again. */
  skillCd: number;
  /** Downed members stop attacking until the wave clears. */
  down: boolean;
}

/** The caster of a roster signature, so the leader and mates share one path. */
interface SignatureCaster {
  id: CharacterId;
  atk: number;
  /** Party element bonus, added only when the skill matches the attunement. */
  elemBonus: number;
  hp: number;
  maxHp: number;
  setHp: (hp: number) => void;
}

/** One equipment set per character, so a party never shares gear ids. */
function characterGear(): Record<CharacterId, Equipped> {
  const gear = {} as Record<CharacterId, Equipped>;
  for (const entry of CHARACTERS) gear[entry.id] = emptyEquipped();
  return gear;
}

function characterCostumes(): Record<CharacterId, CostumeState> {
  const costumes = {} as Record<CharacterId, CostumeState>;
  for (const entry of CHARACTERS) costumes[entry.id] = emptyCostume();
  return costumes;
}

type Listener = (event: SimEvent) => void;

export type UpgradeBlockReason =
  | 'missing'
  | 'gold'
  | 'essence'
  | 'cores'
  | 'books'
  | 'stage'
  | 'max'
  | 'rift'
  | 'locked';

export interface EnhanceOutcome {
  ok: boolean;
  attempts: number;
  successes: number;
  cost: number;
  level: number;
  chance: number;
  reason?: UpgradeBlockReason;
}

export interface RefineOutcome {
  ok: boolean;
  cost: number;
  level: number;
  progress: number;
  pity: number;
  /** This attempt filled the bar and raised the slot's refine level. */
  leveled: boolean;
  /** The pity counter fired and forced an S-grade line. */
  forced: boolean;
  reason?: UpgradeBlockReason;
}

export interface EnchantOutcome {
  ok: boolean;
  cost: number;
  rune?: Rune;
  reason?: UpgradeBlockReason;
}

export interface BoostOutcome {
  ok: boolean;
  cost: number;
  level: number;
  reason?: UpgradeBlockReason;
}

export interface SkillUpgradeOutcome {
  ok: boolean;
  cost: number;
  level: number;
  reason?: UpgradeBlockReason;
}

export interface BossTrial {
  killed: boolean;
  seconds: number | null;
  deaths: number;
  remainingPct: number;
}

const TRIAL_SECONDS = 300;
const TRIAL_SEED = 0x51f15eed;

function trialRng(): () => number {
  let state = TRIAL_SEED >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export class BattleSim {
  hero: Hero;
  /** The monster in front; always the first entry of `pack`. */
  enemy!: Enemy;
  /**
   * Everything still standing in the current wave, front first. A solo party
   * faces one monster, exactly as before; every extra member adds one, so the
   * content grows with the party instead of staying a single-target fight.
   */
  private pack: Enemy[] = [];
  /** Monsters the wave spawned, so each kill pays its share of the reward. */
  private packSize = 1;
  stage: number;
  wave: number;
  level: number;
  exp: number;
  expToNext: number;
  gold: number;
  essence: number;
  cores: number;
  books: number;
  dust: number;
  boosts: Boosts;
  skills: SkillLoadout;
  ascension: AscensionState;
  codex: CodexState = emptyCodex();
  pets: PetsState = currentPets();
  palette: PaletteState = emptyPalette();
  mounts: MountsState = currentMounts();
  wings: WingsState = emptyWings();
  refine: RefineMap = emptyRefine();
  crystals = 0;
  dungeon!: DungeonState;
  shop!: ShopState;
  dungeonActive = false;
  dungeonTier: string | null = null;
  dungeonWave = 1;
  shield = 0;
  shieldTimer = 0;
  buffTimer = 0;
  buffPct = 0;
  enemySlowTimer = 0;
  enemySlowPct = 0;
  kills: number;
  maxStage: number;
  farmStage: number;
  deathsHere = 0;
  rift: RiftState | null;
  event: EventState = { key: '', bosses: 0, claimed: false };
  eventActive = false;
  eventStartsAt = 0;
  eventEndsAt = 0;
  riftActive = false;
  riftRemaining = 0;
  arena: ArenaState;
  league: LeagueState;
  trial: TrialState;
  duelActive = false;
  trialActive = false;
  inventory: Item[] = [];
  /** Everyone except the active member; they swing on their own cooldown. */
  mates: Mate[] = [];
  /** Party order and unlocks; the getters below expose the active member. */
  party: PartyState = emptyParty();
  /** Save v24 keeps gear and wardrobe per character. */
  gear: Record<CharacterId, Equipped> = characterGear();
  costumes: Record<CharacterId, CostumeState> = characterCostumes();

  get equipped(): Equipped {
    return this.gear[activeCharacterId(this.party)];
  }

  set equipped(next: Equipped) {
    this.gear[activeCharacterId(this.party)] = next;
  }

  get costume(): CostumeState {
    return this.costumes[activeCharacterId(this.party)];
  }

  set costume(next: CostumeState) {
    this.costumes[activeCharacterId(this.party)] = next;
  }

  /** The living wave for the arena; never mutated by readers. */
  get enemies(): Enemy[] {
    return this.pack;
  }

  /** How many monsters are left in the wave, for the HUD counter. */
  get enemyCount(): number {
    return this.pack.length;
  }
  deadTimer = 0;
  time = 0;

  private heroCd = 0;
  /** Seconds until the leader's own roster signature is ready. */
  private signatureCd = 0;
  /** Which character that timer was started for; a swap restarts it. */
  private signatureId: CharacterId | null = null;
  private enemyCd = 0;
  private petCd = 0;
  private burnTimer = 0;
  private burnDps = 0;
  private burnBank = 0;
  private enemySeq = 0;
  private itemSeq = 0;
  private skillCd = Array.from({ length: MAX_ACTIVE_SKILLS }, () => 0);
  private skillGcd = 0;
  /** Outfit skill runs on its own timer so it never steals a loadout slot. */
  private costumeCd = 0;
  private listeners = new Set<Listener>();
  private damageMarks: { t: number; dmg: number }[] = [];
  private riftDay = '';
  private riftKillsAtStart = 0;
  private riftMods: RiftModifier[] = [];
  private riftReturn: { stage: number; wave: number } | null = null;
  private duelRival: ArenaRival | null = null;
  private duelReturn: { stage: number; wave: number; deaths: number } | null = null;
  private duelSkillCd = 0;
  private trialReturn: { stage: number; wave: number; deaths: number } | null = null;
  private dungeonReturn: { stage: number; wave: number; deaths: number } | null = null;
  private trialRules: TrialRule[] = [];
  private trialName = '';
  private surgeCharge = 0;
  private surgeTimer = 0;
  private riftEnemyHp = 1;
  private riftEnemyAtk = 1;
  private riftEnemySpeed = 1;
  private riftEnemyDef = 1;
  private riftHeroAtk = 1;
  private riftHeroHp = 1;
  private riftChestMult = 1;
  private rng: () => number;
  /** Costume drops roll on their own stream so loot never reshuffles combat. */
  private lootRng: () => number;

  constructor(
    save?: SaveData | null,
    rng: () => number = Math.random,
    lootRng: () => number = Math.random,
  ) {
    this.rng = rng;
    this.lootRng = lootRng;
    this.level = Math.max(1, Math.floor(save?.level ?? 1));
    this.exp = Math.max(0, save?.exp ?? 0);
    this.gold = Math.max(0, save?.gold ?? 0);
    this.essence = Math.max(0, Math.floor(save?.essence ?? 0));
    this.cores = Math.max(0, Math.floor(save?.cores ?? 0));
    this.books = Math.max(0, Math.floor(save?.books ?? 0));
    this.dust = Math.max(0, Math.floor(save?.dust ?? 0));
    this.boosts = normalizeBoosts(save?.boosts);
    this.skills = normalizeSkills(save?.skills);
    this.ascension = normalizeAscension(save?.ascension);
    this.maxStage = Math.max(1, Math.floor(save?.maxStage ?? 1));
    // Older saves have no farm stage; treat everything reached as cleared once.
    this.farmStage = Math.max(
      1,
      Math.min(this.maxStage, Math.floor(save?.farmStage ?? this.maxStage)),
    );
    // Resume farming or the push attempt the player left off on.
    const savedStage = Math.floor(save?.stage ?? this.maxStage);
    this.stage = Math.max(this.farmStage, Math.min(this.farmStage + 1, savedStage));
    this.wave = 1;
    this.kills = Math.max(0, save?.kills ?? 0);
    this.rift =
      save?.rift && typeof save.rift.day === 'string'
        ? { day: save.rift.day, kills: Math.max(0, Math.floor(save.rift.kills ?? 0)) }
        : null;
    this.expToNext = levelUpCost(this.level);
    this.itemSeq = Math.max(0, Math.floor(save?.itemSeq ?? 0));
    this.codex = normalizeCodex(save?.codex);
    this.event = normalizeEvent(save?.event);
    this.pets = normalizePets(
      save?.pets ??
        (save?.companion?.level
          ? {
              active: 'ember',
              kinds: {
                ember: { level: save.companion.level, maxLevel: PET_BASE_MAX, eggs: 0 },
              },
            }
          : undefined),
    );
    this.syncPetUnlock();

    if (save?.inventory) {
      this.inventory = save.inventory
        .filter((item) => this.isValidItem(item))
        .slice(0, INVENTORY_CAP)
        .map(normalizeItem);
    }
    // v24 stores gear and wardrobe per character. Older saves carry a single
    // set, which belongs to the knight; the other characters start empty.
    this.party = normalizeParty(save?.party, Math.max(1, save?.maxStage ?? 1));
    this.gear = characterGear();
    this.costumes = characterCostumes();

    for (const entry of CHARACTERS) {
      const slot = save?.gear?.[entry.id];
      if (!slot) continue;
      for (const kind of SLOTS) {
        const item = slot[kind];
        if (item && item.slot === kind && this.isValidItem(item)) {
          this.gear[entry.id][kind] = normalizeItem(item);
        }
      }
    }
    if (!save?.gear && save?.equipped) {
      for (const slot of SLOTS) {
        const item = save.equipped[slot];
        if (item && item.slot === slot && this.isValidItem(item)) {
          this.gear.knight[slot] = normalizeItem(item);
        }
      }
    }

    for (const entry of CHARACTERS) {
      const legacy = entry.id === 'knight' ? save?.costume : null;
      this.costumes[entry.id] = normalizeCostume(save?.costumes?.[entry.id] ?? legacy);
    }
    // A worn wardrobe is already a discovery; older saves may lack the codex entry.
    for (const entry of CHARACTERS) {
      for (const id of this.costumes[entry.id].owned) this.learn('costumes', id);
    }

    if (!save) {
      this.gear.knight.weapon = starterWeapon();
      this.itemSeq = Math.max(this.itemSeq, 1);
    }

    // Refine levels live on the slot, so they survive gear swaps. Saves from
    // before v23 only carry a per-item roll count; migrate what is equipped.
    this.refine = migrateRefine(this.equipped, save?.refine);

    // Mounts and wings feed computeStats, so they must be restored before the
    // hero is built.
    this.mounts = normalizeMounts(save?.mounts);
    this.wings = normalizeWings(save?.wings);
    // Anything already owned is a discovery, even if the save predates the
    // codex section that records it.
    for (const id of Object.keys(this.mounts.owned)) this.learn('mounts', id);
    for (const id of Object.keys(this.wings.owned)) this.learn('wings', id);
    this.crystals = Math.max(0, Math.floor(save?.crystals ?? 0));
    const day = dayKey();
    this.dungeon = normalizeDungeon(save?.dungeon, day);
    this.shop = normalizeShop(save?.shop, day);

    const stats = this.computeStats();
    this.hero = { ...stats, hp: stats.maxHp };
    this.refreshParty();
    this.spawnPack();
    this.arena = normalizeArena(save?.arena) ?? emptyArena(dayKey());
    this.league = normalizeLeague(save?.league);
    this.trial = normalizeTrial(save?.trial);
    this.palette = normalizePalette(save?.palette);
    this.refreshTrial();
    this.refreshArena();
    // A save that already met a milestone (older version, hand edit) earns the
    // palette on load instead of waiting for the feat to be repeated.
    this.syncPalettes();
  }

  /** Wears an earned palette; unhooked ids and unknown colours are refused. */
  wearPalette(id: string | null): boolean {
    const next = wearPaletteState(this.palette, id);
    if (!next || next.worn === this.palette.worn) return false;
    this.palette = next;
    this.emit({ type: 'palette', id: next.worn ?? 'none' });
    return true;
  }

  get dungeonUnlocked(): boolean {
    return this.farmStage >= DUNGEON_UNLOCK_STAGE;
  }

  /** A new local day refills the free tickets and the shop allowances. */
  private refreshDungeon(): void {
    const result = dungeonRollover(this.dungeon, this.shop, dayKey());
    if (!result.reset) return;
    this.dungeon = result.dungeon;
    this.shop = result.shop;
  }

  mountView(): MountsSnapshot {
    return {
      active: this.mounts.active,
      crystals: this.crystals,
      mounts: MOUNTS.map((info) => {
        const mount = this.mounts.owned[info.id];
        const level = mount?.level ?? 0;
        return {
          id: info.id,
          name: info.name,
          tier: info.tier,
          element: info.element,
          color: info.color,
          unlocked: level > 0,
          level,
          maxLevel: info.maxLevel,
          atkPct: info.atkPctPerLevel * level,
          hpPct: info.hpPctPerLevel * level,
          defPct: info.defPctPerLevel * level,
          skillName: info.skill.name,
          skillKind: info.skill.kind,
          skillChance: mountSkillChance(info, level),
          skillPower: mountSkillPower(info, level),
          upgrade: mountLevelCost(info, level),
          craft: { ...info.craft },
          desc: info.desc,
        };
      }),
    };
  }

  wingView(): WingsSnapshot {
    return {
      active: this.wings.active,
      wings: WINGS.map((info) => {
        const wing = this.wings.owned[info.id];
        const level = wing?.level ?? 0;
        return {
          id: info.id,
          name: info.name,
          tier: info.tier,
          element: info.element,
          color: info.color,
          unlocked: level > 0,
          level,
          maxLevel: info.maxLevel,
          atkPct: info.atkPctPerLevel * level,
          hpPct: info.hpPctPerLevel * level,
          defPct: info.defPctPerLevel * level,
          skillName: info.skill.name,
          skillKind: info.skill.kind,
          skillChance: wingSkillChance(info, level),
          skillPower: wingSkillPower(info, level),
          upgrade: wingLevelCost(info, level),
          craft: { ...info.craft },
          desc: info.desc,
        };
      }),
    };
  }

  dungeonView(): DungeonSnapshot {
    this.refreshDungeon();
    return {
      unlocked: this.dungeonUnlocked,
      tickets: this.dungeon.tickets,
      maxTickets: DUNGEON_TICKETS + DUNGEON_TICKET_CAP,
      active: this.dungeonActive,
      tier: this.dungeonTier,
      wave: this.dungeonActive ? this.dungeonWave : 0,
      waves: DUNGEON_WAVES,
      tiers: DUNGEON_TIERS.map((tier, index) => ({
        id: tier.id,
        name: tier.name,
        stage: tier.stage,
        unlocked: this.farmStage >= tier.stage,
        mountChance: tier.mountChance,
        wingChance: wingDropChance(index + 1),
        crystals: { ...tier.crystals },
        color: tier.color,
        desc: tier.desc,
        mounts: mountsForTier(index + 1).map((mount) => ({
          id: mount.id,
          name: mount.name,
          owned: Boolean(this.mounts.owned[mount.id]),
        })),
        wings: wingsForTier(index + 1).map((wing) => ({
          id: wing.id,
          name: wing.name,
          owned: Boolean(this.wings.owned[wing.id]),
        })),
      })),
    };
  }

  shopView(): ShopSnapshot {
    this.refreshDungeon();
    return {
      unlocked: this.dungeonUnlocked,
      ticketCap: DUNGEON_TICKET_CAP,
      ticketsBought: this.shop.tickets,
      ticketPrice: ticketPrice(this.shop.tickets, this.farmStage),
      crystalCap: SHOP_CRYSTAL_CAP,
      crystalBought: this.shop.crystals,
      crystalPrice: crystalPrice(this.farmStage),
    };
  }

  /** Rides an owned mount; null sends it back to the stable. */
  equipMount(id: string | null): boolean {
    const next = equipMountState(this.mounts, id as MountId | null);
    if (!next || next.active === this.mounts.active) return false;

    this.mounts = next;
    this.recomputeStats(true);
    this.emit({ type: 'mount', id: next.active, level: 0 });
    return true;
  }

  upgradeMount(id: string): {
    ok: boolean;
    cost: { gold: number; crystals: number };
    level: number;
    reason?: 'locked' | 'max' | 'gold' | 'crystals';
  } {
    const info = mountById(id);
    const mount = this.mounts.owned[id as MountId];
    if (!info || !mount) {
      return { ok: false, cost: { gold: 0, crystals: 0 }, level: 0, reason: 'locked' };
    }
    if (mount.level >= info.maxLevel) {
      return { ok: false, cost: { gold: 0, crystals: 0 }, level: mount.level, reason: 'max' };
    }

    const cost = mountLevelCost(info, mount.level);
    if (this.gold < cost.gold) {
      return { ok: false, cost, level: mount.level, reason: 'gold' };
    }
    if (this.crystals < cost.crystals) {
      return { ok: false, cost, level: mount.level, reason: 'crystals' };
    }

    const trained = trainMountState(this.mounts, info.id, this.gold, this.crystals);
    if (!trained) {
      return { ok: false, cost, level: mount.level, reason: 'crystals' };
    }

    this.gold -= trained.cost.gold;
    this.crystals -= trained.cost.crystals;
    this.mounts = trained.mounts;
    this.recomputeStats(true);
    this.emit({ type: 'mount', id: info.id, level: trained.level });
    return { ok: true, cost: trained.cost, level: trained.level };
  }

  craftMount(id: string): {
    ok: boolean;
    cost: { gold: number; crystals: number };
    reason?: 'owned' | 'gold' | 'crystals';
  } {
    const info = mountById(id);
    if (!info) return { ok: false, cost: { gold: 0, crystals: 0 }, reason: 'owned' };
    if (this.mounts.owned[info.id]) {
      return { ok: false, cost: { ...info.craft }, reason: 'owned' };
    }
    if (this.gold < info.craft.gold) {
      return { ok: false, cost: { ...info.craft }, reason: 'gold' };
    }
    if (this.crystals < info.craft.crystals) {
      return { ok: false, cost: { ...info.craft }, reason: 'crystals' };
    }

    const crafted = craftMountState(this.mounts, info.id, this.gold, this.crystals);
    if (!crafted) return { ok: false, cost: { ...info.craft }, reason: 'crystals' };

    this.gold -= crafted.cost.gold;
    this.crystals -= crafted.cost.crystals;
    this.mounts = crafted.mounts;
    this.learn('mounts', info.id);
    this.recomputeStats(true);
    this.emit({ type: 'mount', id: info.id, level: 1 });
    return { ok: true, cost: crafted.cost };
  }

  /** Wears a pair of wings; null folds them away. */
  equipWing(id: string | null): boolean {
    const next = equipWingState(this.wings, id as WingId | null);
    if (!next || next.active === this.wings.active) return false;

    this.wings = next;
    this.recomputeStats(true);
    this.emit({ type: 'wing', id: next.active, level: 0 });
    return true;
  }

  upgradeWing(id: string): {
    ok: boolean;
    cost: { gold: number; crystals: number };
    level: number;
    reason?: 'locked' | 'max' | 'gold' | 'crystals';
  } {
    const info = wingById(id);
    const wing = this.wings.owned[id as WingId];
    if (!info || !wing) {
      return { ok: false, cost: { gold: 0, crystals: 0 }, level: 0, reason: 'locked' };
    }
    if (wing.level >= info.maxLevel) {
      return { ok: false, cost: { gold: 0, crystals: 0 }, level: wing.level, reason: 'max' };
    }

    const cost = wingLevelCost(info, wing.level);
    if (this.gold < cost.gold) {
      return { ok: false, cost, level: wing.level, reason: 'gold' };
    }
    if (this.crystals < cost.crystals) {
      return { ok: false, cost, level: wing.level, reason: 'crystals' };
    }

    const trained = trainWingState(this.wings, info.id, this.gold, this.crystals);
    if (!trained) {
      return { ok: false, cost, level: wing.level, reason: 'crystals' };
    }

    this.gold -= trained.cost.gold;
    this.crystals -= trained.cost.crystals;
    this.wings = trained.wings;
    this.recomputeStats(true);
    this.emit({ type: 'wing', id: info.id, level: trained.level });
    return { ok: true, cost: trained.cost, level: trained.level };
  }

  /**
   * One craft attempt. The roll can fail, burning the gold and half the
   * crystals; the dungeon drop is still the cheaper route.
   */
  craftWing(id: string): {
    ok: boolean;
    cost: { gold: number; crystals: number };
    chance: number;
    refund: number;
    reason?: 'owned' | 'gold' | 'crystals' | 'failed';
  } {
    const info = wingById(id);
    if (!info) {
      return {
        ok: false,
        cost: { gold: 0, crystals: 0 },
        chance: 0,
        refund: 0,
        reason: 'owned',
      };
    }

    const outcome = craftWingState(this.wings, info.id, this.gold, this.crystals, this.rng());
    if (!outcome.ok && outcome.reason !== 'failed') {
      return {
        ok: false,
        cost: outcome.cost,
        chance: outcome.chance,
        refund: 0,
        reason: outcome.reason,
      };
    }

    this.gold -= outcome.cost.gold;
    this.crystals = this.crystals - outcome.cost.crystals + outcome.refund;
    if (outcome.ok) {
      this.wings = outcome.wings;
      this.learn('wings', info.id);
      this.recomputeStats(true);
      this.emit({ type: 'wing', id: info.id, level: 1 });
    }

    return {
      ok: outcome.ok,
      cost: outcome.cost,
      chance: outcome.chance,
      refund: outcome.refund,
      reason: outcome.ok ? undefined : 'failed',
    };
  }

  /**
   * Test-only: puts a mount in the stable at a level, free of charge. An owned
   * mount is re-levelled, so the cheat panel's level button is the same call.
   * Nothing in normal play calls this.
   */
  debugGrantMount(id: string, level = 1): number | null {
    const info = mountById(id);
    if (!info) return null;

    const clamped = Math.max(1, Math.min(info.maxLevel, Math.floor(level)));
    this.mounts = {
      active: this.mounts.active ?? info.id,
      owned: { ...this.mounts.owned, [info.id]: { level: clamped } },
    };
    this.learn('mounts', info.id);
    this.recomputeStats(true);
    this.emit({ type: 'mount', id: info.id, level: clamped });
    return clamped;
  }

  /** Test-only: same deal for a pair of wings; an owned pair is re-levelled. */
  debugGrantWing(id: string, level = 1): number | null {
    const info = wingById(id);
    if (!info) return null;

    const clamped = Math.max(1, Math.min(info.maxLevel, Math.floor(level)));
    this.wings = {
      active: this.wings.active ?? info.id,
      owned: { ...this.wings.owned, [info.id]: { level: clamped } },
    };
    this.learn('wings', info.id);
    this.recomputeStats(true);
    this.emit({ type: 'wing', id: info.id, level: clamped });
    return clamped;
  }

  /** Test-only: tops up the currencies, so a tester never has to farm first. */
  debugGrantResources(grants: {
    gold?: number;
    crystals?: number;
    dust?: number;
    books?: number;
    cores?: number;
    essence?: number;
  }): void {
    const add = (value?: number): number =>
      typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

    this.gold += add(grants.gold);
    this.crystals += add(grants.crystals);
    this.dust += add(grants.dust);
    this.books += add(grants.books);
    this.cores += add(grants.cores);
    this.essence += add(grants.essence);
  }

  /** Test-only: refills dungeon tickets up to the daily cap. */
  debugAddTickets(amount = 5): number {
    this.refreshDungeon();
    const cap = DUNGEON_TICKETS + DUNGEON_TICKET_CAP;
    this.dungeon = {
      ...this.dungeon,
      tickets: Math.min(cap, this.dungeon.tickets + Math.max(0, Math.floor(amount))),
    };
    return this.dungeon.tickets;
  }

  /**
   * Test-only: jumps the ladder so dungeon tiers are reachable without a run.
   * Refused in the middle of a mode that owns the stage, where it would desync.
   */
  debugUnlockStage(stage: number): boolean {
    if (this.riftActive || this.duelActive || this.trialActive || this.dungeonActive) return false;

    const target = Math.max(1, Math.min(999, Math.floor(stage)));
    this.maxStage = Math.max(this.maxStage, target);
    this.farmStage = Math.max(this.farmStage, target);
    this.stage = target;
    this.wave = 1;
    this.deathsHere = 0;
    this.deadTimer = 0;
    this.hero.hp = this.hero.maxHp;
    this.spawnPack();
    this.emit({ type: 'spawn', enemy: this.enemy });
    return true;
  }

  /** Buys one extra dungeon ticket with gold; the price climbs all day. */
  buyDungeonTicket(): { ok: boolean; cost: number; reason?: 'locked' | 'cap' | 'gold' } {
    this.refreshDungeon();
    if (!this.dungeonUnlocked) return { ok: false, cost: 0, reason: 'locked' };
    if (this.shop.tickets >= DUNGEON_TICKET_CAP) return { ok: false, cost: 0, reason: 'cap' };

    const price = ticketPrice(this.shop.tickets, this.farmStage);
    if (this.gold < price) return { ok: false, cost: price, reason: 'gold' };

    const bought = buyTicket(this.dungeon, this.shop, this.gold, this.farmStage);
    if (!bought) return { ok: false, cost: price, reason: 'gold' };

    this.dungeon = bought.dungeon;
    this.shop = bought.shop;
    this.gold = bought.gold;
    return { ok: true, cost: bought.cost };
  }

  /** Buys one mount crystal with gold, twice a day at most. */
  buyMountCrystal(): { ok: boolean; cost: number; reason?: 'locked' | 'cap' | 'gold' } {
    this.refreshDungeon();
    if (!this.dungeonUnlocked) return { ok: false, cost: 0, reason: 'locked' };
    if (this.shop.crystals >= SHOP_CRYSTAL_CAP) return { ok: false, cost: 0, reason: 'cap' };

    const price = crystalPrice(this.farmStage);
    if (this.gold < price) return { ok: false, cost: price, reason: 'gold' };

    const bought = buyCrystal(this.shop, this.gold, this.farmStage);
    if (!bought) return { ok: false, cost: price, reason: 'gold' };

    this.shop = bought.shop;
    this.gold = bought.gold;
    this.crystals += 1;
    return { ok: true, cost: bought.cost };
  }

  /** Starts a dungeon run: three trash waves, then the tier boss. */
  startDungeon(tierId: string): {
    ok: boolean;
    reason?: 'locked' | 'tier' | 'tickets' | 'busy' | 'down' | 'active';
  } {
    this.refreshDungeon();
    if (this.dungeonActive) return { ok: false, reason: 'active' };
    if (this.riftActive || this.duelActive || this.trialActive) {
      return { ok: false, reason: 'busy' };
    }
    if (!this.dungeonUnlocked) return { ok: false, reason: 'locked' };
    if (this.deadTimer > 0) return { ok: false, reason: 'down' };

    const tier = dungeonTier(tierId);
    if (!tier || this.farmStage < tier.stage) return { ok: false, reason: 'tier' };
    if (this.dungeon.tickets <= 0) return { ok: false, reason: 'tickets' };

    this.dungeon.tickets -= 1;
    this.dungeonReturn = { stage: this.stage, wave: this.wave, deaths: this.deathsHere };
    this.dungeonTier = tier.id;
    this.dungeonWave = 1;
    this.dungeonActive = true;
    this.stage = tier.stage;
    this.wave = 1;
    this.deathsHere = 0;
    this.deadTimer = 0;
    this.shield = 0;
    this.shieldTimer = 0;
    this.buffTimer = 0;
    this.buffPct = 0;
    this.enemySlowTimer = 0;
    this.burnTimer = 0;
    this.burnDps = 0;
    this.burnBank = 0;
    this.skillCd = Array.from({ length: MAX_ACTIVE_SKILLS }, () => 0);
    this.skillGcd = 0;
    this.costumeCd = 0;
    this.recomputeStats(false);
    this.hero.hp = this.hero.maxHp;
    this.spawnPack(1.2);
    this.emit({ type: 'dungeonstart', tier: tier.id });
    this.emit({ type: 'spawn', enemy: this.enemy });
    return { ok: true };
  }

  /** Leaves the dungeon early; the ticket is already spent. */
  cancelDungeon(): boolean {
    if (!this.dungeonActive) return false;
    this.restoreFromDungeon();
    this.emit({ type: 'spawn', enemy: this.enemy });
    return true;
  }

  private restoreFromDungeon(): void {
    const back = this.dungeonReturn ?? { stage: this.stage, wave: this.wave, deaths: 0 };
    this.dungeonActive = false;
    this.dungeonTier = null;
    this.dungeonWave = 1;
    this.dungeonReturn = null;
    this.stage = back.stage;
    this.wave = back.wave;
    this.deathsHere = back.deaths;
    this.deadTimer = 0;
    this.shield = 0;
    this.shieldTimer = 0;
    this.buffTimer = 0;
    this.buffPct = 0;
    this.enemySlowTimer = 0;
    this.burnTimer = 0;
    this.burnDps = 0;
    this.burnBank = 0;
    this.recomputeStats(false);
    this.hero.hp = this.hero.maxHp;
    this.spawnPack();
  }

  private finishDungeon(win: boolean): void {
    if (!this.dungeonActive) return;

    const tier = dungeonTier(this.dungeonTier ?? '');
    const result: DungeonResult = {
      win,
      tier: tier?.id ?? '',
      tierName: tier?.name ?? '',
      crystals: 0,
      gold: 0,
      exp: 0,
      mount: null,
      mountName: null,
      wing: null,
      wingName: null,
    };

    if (win && tier) {
      const reward = dungeonReward(tier, this.lootRng);
      result.gold = reward.gold;
      result.exp = reward.exp;
      result.crystals = reward.crystals;

      const tierIndex = DUNGEON_TIERS.findIndex((entry) => entry.id === tier.id) + 1;
      const candidates = missingMounts(this.mounts, tierIndex);
      if (candidates.length === 0) {
        // Every mount of this tier is owned: the lucky roll pays crystals instead.
        result.crystals += 2;
      } else if (this.lootRng() < tier.mountChance) {
        const picked = candidates[Math.floor(this.lootRng() * candidates.length)] ?? candidates[0];
        const next = addMount(this.mounts, picked.id);
        if (next) {
          this.mounts = next;
          this.learn('mounts', picked.id);
          this.recomputeStats(true);
          result.mount = picked.id;
          result.mountName = picked.name;
          this.emit({ type: 'mount', id: picked.id, level: 1 });
        }
      }

      // Wings are a much rarer roll than mounts and never compete with them:
      // a clear can pay a mount, a wing, both, or neither.
      const wingCandidates = missingWings(this.wings, tierIndex);
      if (wingCandidates.length === 0) {
        result.crystals += 3;
      } else if (this.lootRng() < wingDropChance(tierIndex)) {
        const wing = wingCandidates[Math.floor(this.lootRng() * wingCandidates.length)] ?? wingCandidates[0];
        const next = addWing(this.wings, wing.id);
        if (next) {
          this.wings = next;
          this.learn('wings', wing.id);
          this.recomputeStats(true);
          result.wing = wing.id;
          result.wingName = wing.name;
          this.emit({ type: 'wing', id: wing.id, level: 1 });
        }
      }

      this.gold += result.gold;
      this.exp += result.exp;
      this.crystals += result.crystals;
      this.gainExp();
    }

    this.restoreFromDungeon();
    this.emit({ type: 'dungeonend', result });
    this.emit({ type: 'spawn', enemy: this.enemy });
  }

  /** Grants any palette whose milestone is now met; ownership is permanent. */
  private syncPalettes(): void {
    if (this.palette.unlocked.length >= PALETTES.length) return;

    const result = earnPalettes(this.palette, {
      ascensions: this.ascension.count,
      arenaPoints: this.arena.points,
      trialCleared: this.trial.cleared,
      eventClaimed: this.event.claimed,
      farmStage: this.farmStage,
    });
    if (result.earned.length === 0) return;

    this.palette = result.palette;
    for (const id of result.earned) this.emit({ type: 'palette', id, earned: true });
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get dps(): number {
    const cutoff = this.time - BALANCE.dpsWindowSeconds;
    while (this.damageMarks.length > 0 && this.damageMarks[0].t < cutoff) {
      this.damageMarks.shift();
    }
    const total = this.damageMarks.reduce((sum, mark) => sum + mark.dmg, 0);
    const window = Math.max(1, Math.min(BALANCE.dpsWindowSeconds, this.time));
    return Math.round(total / window);
  }

  get gearScore(): number {
    return gearScoreOf(this.equipped);
  }

  /** Fighting a stage beyond the last cleared one. */
  get pushing(): boolean {
    return this.stage > this.farmStage;
  }

  /** There is a retreated stage waiting for the player to push again. */
  get canPush(): boolean {
    return (
      !this.pushing &&
      !this.riftActive &&
      !this.duelActive &&
      !this.trialActive &&
      !this.dungeonActive &&
      this.farmStage < this.maxStage
    );
  }

  get trialUnlocked(): boolean {
    return this.farmStage >= TRIAL_UNLOCK_STAGE;
  }

  get riftUnlocked(): boolean {
    return this.farmStage >= RIFT_UNLOCK_STAGE;
  }

  get eventUnlocked(): boolean {
    return this.farmStage >= EVENT_UNLOCK_STAGE;
  }

  get arenaUnlocked(): boolean {
    return this.farmStage >= ARENA_UNLOCK_STAGE;
  }

  /**
   * Rolls the daily board over and, when needed, takes the rival snapshot.
   * Rivals are only frozen while the player is unlocked: a fresh save that
   * reaches stage 30 later the same day still gets opponents at its own power.
   */
  private refreshArena(): void {
    if (this.duelActive) return;
    this.refreshLeague();
    const day = dayKey();
    if (this.arena.day !== day) {
      this.arena = { ...this.arena, day, tickets: ARENA_TICKETS, rivals: [], fought: [] };
    }
    if (this.arenaUnlocked && this.arena.rivals.length !== ARENA_RIVAL_COUNT) {
      // Snapshot without a transient surge, so a mid-surge refresh cannot hand
      // the rival a permanent +25% ATK.
      const base = this.computeStats(false);
      this.arena.rivals = arenaRivals(day, {
        atk: base.atk,
        maxHp: base.maxHp,
        def: base.def,
        atkSpeed: base.atkSpeed,
      });
    }
  }

  /** Settles the week once: points in, division up or down, crate unlocked. */
  private refreshLeague(): void {
    const result = leagueRollover(this.league);
    if (result.settled) this.league = result.league;
  }

  arenaView(): ArenaSnapshot {
    this.refreshArena();
    return {
      ...buildArenaSnapshot(this.arena, this.arenaUnlocked, this.duelActive),
      league: leagueSnapshot(this.league, this.farmStage),
    };
  }

  /** Season points move with the ladder, so the league is earned, not waited out. */
  private addSeasonPoints(delta: number): void {
    this.league = {
      ...this.league,
      points: Math.max(0, this.league.points + delta),
    };
  }

  /**
   * Claims the crate the last settled season earned. Gold, essence, and cores
   * land immediately; Gold and Prismatic also hand over a set piece through the
   * usual loot path, so auto-salvage rules still apply.
   */
  claimLeague(): {
    ok: boolean;
    reason?: 'locked' | 'none' | 'claimed';
    item?: Item;
    reward?: ReturnType<typeof leagueReward>;
    egg?: { id: PetKind; eggs: number } | null;
  } {
    this.refreshArena();
    if (!this.arenaUnlocked) return { ok: false, reason: 'locked' };
    if (this.league.rewardDivision === null) return { ok: false, reason: 'none' };
    if (this.league.rewardClaimed) return { ok: false, reason: 'claimed' };

    const reward = leagueReward(this.league.rewardDivision, this.farmStage);
    this.gold += reward.gold;
    this.essence += reward.essence;
    this.cores += reward.cores;
    this.league = { ...this.league, rewardClaimed: true };

    let item: Item | undefined;
    if (reward.setPiece) {
      const sets = Object.values(SETS).filter((set) => set.id !== EVENT_SET);
      const set = sets[Math.floor(this.rng() * sets.length)] ?? sets[0];
      item = createItem(globalWave(this.farmStage, 1), 'boss', this.rng, `it_${++this.itemSeq}`, {
        rarity: 'epic',
        set: set.id,
      });
      const autoSalvaged = this.stashItem(item);
      this.emit({ type: 'loot', item, autoSalvaged });
    }

    const egg = reward.egg ? this.grantPetEgg() : null;
    return { ok: true, item, reward, egg };
  }

  /** Starts a duel against one of today's frozen rivals. */
  startDuel(
    rivalId: string,
  ): {
    ok: boolean;
    reason?: 'locked' | 'tickets' | 'fought' | 'active' | 'busy' | 'missing' | 'down';
  } {
    this.refreshArena();
    if (this.duelActive) return { ok: false, reason: 'active' };
    if (!this.arenaUnlocked) return { ok: false, reason: 'locked' };
    if (this.riftActive || this.trialActive || this.dungeonActive) {
      return { ok: false, reason: 'busy' };
    }
    if (this.deadTimer > 0) return { ok: false, reason: 'down' };
    if (this.arena.tickets <= 0) return { ok: false, reason: 'tickets' };

    const rival = this.arena.rivals.find((entry) => entry.id === rivalId);
    if (!rival) return { ok: false, reason: 'missing' };
    if (this.arena.fought.includes(rival.id)) return { ok: false, reason: 'fought' };

    this.arena.tickets -= 1;
    this.arena.fought = [...this.arena.fought, rival.id];
    this.duelActive = true;
    this.duelRival = rival;
    this.duelReturn = { stage: this.stage, wave: this.wave, deaths: this.deathsHere };
    this.duelSkillCd = ARENA_SKILL_COOLDOWN;
    this.shield = 0;
    this.shieldTimer = 0;
    this.buffTimer = 0;
    this.buffPct = 0;
    this.enemySlowTimer = 0;
    this.burnTimer = 0;
    this.burnDps = 0;
    this.burnBank = 0;
    this.skillCd = Array.from({ length: MAX_ACTIVE_SKILLS }, () => 0);
    this.skillGcd = 0;
    this.costumeCd = 0;
    this.recomputeStats(false);
    this.hero.hp = this.hero.maxHp;
    this.fieldSoloEnemy(this.buildRivalEnemy(rival), 1.2);
    this.emit({ type: 'duelstart', rival });
    this.emit({ type: 'spawn', enemy: this.enemy });
    return { ok: true };
  }

  /** Abandons the duel (used when the tab is hidden) without changing the ladder. */
  cancelDuel(): boolean {
    if (!this.duelActive) return false;
    this.restoreFromDuel();
    this.emit({ type: 'duelcancel' });
    this.emit({ type: 'spawn', enemy: this.enemy });
    return true;
  }

  private buildRivalEnemy(rival: ArenaRival): Enemy {
    this.enemySeq += 1;
    return {
      id: this.enemySeq,
      kind: 'normal',
      name: rival.name,
      sprite: 'rival',
      element: rival.element,
      hp: rival.hp,
      maxHp: rival.hp,
      atk: rival.atk,
      def: rival.def,
      atkSpeed: rival.atkSpeed,
      rival: true,
    };
  }

  private restoreFromDuel(): void {
    const back = this.duelReturn ?? { stage: this.stage, wave: this.wave, deaths: 0 };
    this.duelActive = false;
    this.duelRival = null;
    this.duelReturn = null;
    this.duelSkillCd = 0;
    this.stage = back.stage;
    this.wave = back.wave;
    this.deadTimer = 0;
    this.deathsHere = back.deaths;
    this.shield = 0;
    this.shieldTimer = 0;
    this.buffTimer = 0;
    this.buffPct = 0;
    this.enemySlowTimer = 0;
    this.burnTimer = 0;
    this.burnDps = 0;
    this.burnBank = 0;
    this.recomputeStats(false);
    this.hero.hp = this.hero.maxHp;
    this.spawnPack();
  }

  private finishDuel(win: boolean): void {
    const rival = this.duelRival;
    if (!this.duelActive || !rival) return;

    const before = arenaTierInfo(this.arena.points);
    const delta = win ? ARENA_POINTS_WIN : -ARENA_POINTS_LOSS;
    this.arena.points = Math.max(0, this.arena.points + delta);
    this.addSeasonPoints(delta);
    this.syncPalettes();
    if (win) this.arena.wins += 1;
    else this.arena.losses += 1;
    const after = arenaTierInfo(this.arena.points);

    const reward = arenaReward(win, this.arena.points, this.farmStage);
    this.gold += reward.gold;
    this.essence += reward.essence;
    this.cores += reward.cores;

    let egg: { id: PetKind; eggs: number } | null = null;
    if (win && this.lootRng() < arenaEggChance(after.index)) egg = this.grantPetEgg();

    const result = arenaResult({
      win,
      rival: rival.name,
      element: rival.element,
      points: delta,
      pointsAfter: this.arena.points,
      rank: after.name,
      rankUp: after.index > before.index,
      gold: reward.gold,
      essence: reward.essence,
      cores: reward.cores,
      tickets: this.arena.tickets,
      egg,
    });

    this.restoreFromDuel();
    this.emit({ type: 'duelend', result });
    this.emit({ type: 'spawn', enemy: this.enemy });
  }

  private rivalStrike(): void {
    const rival = this.duelRival;
    if (!this.duelActive || !rival) return;

    const heroElement = this.attuned.element;
    const elemMult = elementMultiplier(rival.element, heroElement ?? rival.element);
    const roll = damageRoll(rival.atk * 1.75, this.hero.def, 0, 1, this.rng, { elemMult });
    let incoming = roll.damage;

    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, incoming);
      this.shield -= absorbed;
      incoming -= absorbed;
    }

    this.hero.hp -= incoming;
    this.emit({
      type: 'rivalSkill',
      name: `${rival.element.toUpperCase()} STRIKE`,
      element: rival.element,
      damage: incoming,
    });

    if (this.hero.hp <= 0) {
      this.hero.hp = 0;
      this.finishDuel(false);
    }
  }

  /** Settles a new week: cleared floors and retries both reset on Monday. */
  private refreshTrial(): void {
    const result = trialRollover(this.trial);
    if (result.settled) this.trial = result.trial;
  }

  trialView(): TrialSnapshot {
    this.refreshTrial();
    return trialSnapshot(this.trial, this.farmStage, this.trialActive);
  }

  /**
   * Enters the next uncleared floor. A win never spends a retry, so the three
   * attempts are a failure budget: they stop a weak build from banging its head
   * against the same boss all week.
   */
  startTrial(): {
    ok: boolean;
    reason?: 'locked' | 'active' | 'busy' | 'down' | 'attempts' | 'done';
  } {
    this.refreshTrial();
    if (this.trialActive) return { ok: false, reason: 'active' };
    if (this.riftActive || this.duelActive || this.dungeonActive) {
      return { ok: false, reason: 'busy' };
    }
    if (!this.trialUnlocked) return { ok: false, reason: 'locked' };
    if (this.deadTimer > 0) return { ok: false, reason: 'down' };
    if (this.trial.cleared >= TRIAL_FLOORS) return { ok: false, reason: 'done' };
    if (this.trial.attempts <= 0) return { ok: false, reason: 'attempts' };

    const floor = trialFloor(this.trial);
    const info = trialFloorInfo(this.trial.key, floor, this.farmStage);

    this.trialReturn = { stage: this.stage, wave: this.wave, deaths: this.deathsHere };
    this.trialActive = true;
    this.trialRules = info.rules;
    this.trialName = info.name;
    this.shield = 0;
    this.shieldTimer = 0;
    this.buffTimer = 0;
    this.buffPct = 0;
    this.enemySlowTimer = 0;
    this.burnTimer = 0;
    this.burnDps = 0;
    this.burnBank = 0;
    this.skillCd = Array.from({ length: MAX_ACTIVE_SKILLS }, () => 0);
    this.skillGcd = 0;
    this.costumeCd = 0;
    this.recomputeStats(false);
    this.hero.hp = this.hero.maxHp;
    this.fieldSoloEnemy(this.buildTrialEnemy(info), 1.2);
    this.emit({ type: 'trialstart', floor, name: info.name, rules: info.rules });
    this.emit({ type: 'spawn', enemy: this.enemy });
    return { ok: true };
  }

  /** Leaves the tower without spending a retry (used when the tab is hidden). */
  cancelTrial(): boolean {
    if (!this.trialActive) return false;
    this.restoreFromTrial();
    this.emit({ type: 'trialcancel' });
    this.emit({ type: 'spawn', enemy: this.enemy });
    return true;
  }

  private buildTrialEnemy(info: ReturnType<typeof trialFloorInfo>): Enemy {
    this.enemySeq += 1;
    return {
      id: this.enemySeq,
      kind: 'boss',
      name: info.name,
      sprite: 'demon',
      element: info.element,
      hp: info.hp,
      maxHp: info.hp,
      atk: info.atk,
      def: info.def,
      atkSpeed: info.atkSpeed,
    };
  }

  private restoreFromTrial(): void {
    const back = this.trialReturn ?? { stage: this.stage, wave: this.wave, deaths: 0 };
    this.trialActive = false;
    this.trialReturn = null;
    this.trialRules = [];
    this.trialName = '';
    this.stage = back.stage;
    this.wave = back.wave;
    this.deadTimer = 0;
    this.deathsHere = back.deaths;
    this.shield = 0;
    this.shieldTimer = 0;
    this.buffTimer = 0;
    this.buffPct = 0;
    this.enemySlowTimer = 0;
    this.burnTimer = 0;
    this.burnDps = 0;
    this.burnBank = 0;
    this.recomputeStats(false);
    this.hero.hp = this.hero.maxHp;
    this.spawnPack();
  }

  private finishTrial(win: boolean): void {
    if (!this.trialActive) return;

    const floor = trialFloor(this.trial);
    const rules = this.trialRules;
    const reward = win
      ? trialReward(floor, this.farmStage)
      : { gold: 0, dust: 0, essence: 0, cores: 0, cache: false };

    let item: Item | null = null;
    let costumeId: string | null = null;
    let costumeDust = 0;
    if (win) {
      this.gold += reward.gold;
      this.dust += reward.dust;
      this.essence += reward.essence;
      this.cores += reward.cores;

      const costumeTier = trialCostumeTier(floor);
      const roll = costumeTier
        ? rollCostume(this.costume, this.farmStage, this.lootRng, costumeTier)
        : null;
      if (roll) {
        const gained = this.grantCostume(roll);
        costumeId = roll.costume.id;
        costumeDust = gained.dust;
      }

      if (this.lootRng() < PET_TRIAL_EGG_CHANCE) this.grantPetEgg();

      if (reward.cache) {
        item = createItem(globalWave(this.farmStage, 1), 'boss', this.rng, `it_${++this.itemSeq}`, {
          rarity: 'epic',
        });
        const autoSalvaged = this.stashItem(item);
        this.emit({ type: 'loot', item, autoSalvaged });
      }
      this.trial = { ...this.trial, cleared: Math.max(this.trial.cleared, floor) };
    } else {
      this.trial = { ...this.trial, attempts: Math.max(0, this.trial.attempts - 1) };
    }

    this.syncPalettes();

    const result: TrialResult = {
      win,
      floor,
      name: this.trialName,
      cleared: this.trial.cleared,
      attempts: this.trial.attempts,
      gold: reward.gold,
      dust: reward.dust,
      essence: reward.essence,
      cores: reward.cores,
      cache: reward.cache,
      item,
      costume: costumeId,
      costumeDust,
      rules,
    };

    this.restoreFromTrial();
    this.emit({ type: 'trialend', result });
    this.emit({ type: 'spawn', enemy: this.enemy });
  }

  /**
   * The controller owns the calendar, so it pushes the current window in here.
   * The key identifies the cycle: a new Friday wipes the counter and the cache
   * flag, which also clears the panel as soon as the weekend is over.
   */
  setEvent(active: boolean, key: string, startsAt: number, endsAt: number): void {
    this.eventStartsAt = startsAt;
    this.eventEndsAt = endsAt;
    this.eventActive = active;
    // A new key resets progress even while the window is closed, so Monday shows
    // the coming week at 0/5 instead of last weekend's finished counter.
    if (this.event.key !== key) this.event = { key, bosses: 0, claimed: false };
  }

  /** Weekly cache: one guaranteed Emberforged piece once the boss goal is met. */
  claimEvent(): { ok: boolean; item?: Item; reason?: 'locked' | 'inactive' | 'progress' | 'claimed' } {
    if (!this.eventUnlocked) return { ok: false, reason: 'locked' };
    if (!this.eventActive) return { ok: false, reason: 'inactive' };
    if (this.event.claimed) return { ok: false, reason: 'claimed' };
    if (this.event.bosses < EVENT_GOAL) return { ok: false, reason: 'progress' };

    this.event.claimed = true;
    this.syncPalettes();
    const item = createItem(
      globalWave(this.farmStage, 1),
      'boss',
      this.rng,
      `it_${++this.itemSeq}`,
      { set: EVENT_SET, allowEventSet: true },
    );
    const autoSalvaged = this.stashItem(item);
    this.emit({ type: 'loot', item, autoSalvaged });
    return { ok: true, item };
  }

  get weapon(): Item | null {
    return this.equipped.weapon;
  }

  get attuned(): Attunement {
    return attunement(this.equipped);
  }

  get elemBonus(): number {
    return this.attuned.bonus + boostBonuses(this.boosts).elemBonus;
  }

  get attackPower(): number {
    return this.hero.atk * (1 + (this.buffTimer > 0 ? this.buffPct : 0));
  }

  get surgeUnlocked(): boolean {
    return this.farmStage >= SURGE_UNLOCK_STAGE;
  }

  get surgeActive(): boolean {
    return this.surgeTimer > 0;
  }

  /** Meter fill in 0…1; stays at 1 while the surge is running. */
  get surgeMeter(): number {
    return this.surgeTimer > 0 ? 1 : this.surgeCharge;
  }

  get surgeRemaining(): number {
    return this.surgeTimer;
  }

  /**
   * Every point of damage the hero deals fills the meter, so faster kills mean
   * faster surges. Damage already charged cannot charge again while active.
   */
  private addSurgeCharge(damage: number): void {
    if (!this.surgeUnlocked || this.surgeTimer > 0 || damage <= 0) return;

    this.surgeCharge += damage / Math.max(1, this.hero.maxHp * SURGE_CHARGE_HP);
    if (this.surgeCharge < 1) return;

    this.surgeCharge = 1;
    this.surgeTimer = SURGE_DURATION;
    this.recomputeStats(true);
    this.emit({ type: 'surge', phase: 'start' });
  }

  get ascendBonuses() {
    return ascendBonuses(this.ascension.nodes);
  }

  /** Rates and rewards for time spent away; does not mutate the game yet. */
  estimateOffline(elapsedMs: number): OfflineReport | null {
    // Away time is farmed on the safe stage; the hero never pushes unattended.
    const rates = stageRates(this.farmStage);
    const dps = offlineDps({
      attackPower: this.attackPower,
      atkSpeed: this.hero.atkSpeed,
      crit: this.hero.crit,
      critDmg: this.hero.critDmg,
      def: rates.def,
      skills: this.skills,
      attuned: this.attuned.element,
      elemBonus: this.elemBonus,
      enemyElement: this.enemy.element,
      petDps: petDpsFor(this.pets, this.hero.atk),
    });

    const plan = planOffline({
      elapsedMs,
      stage: this.farmStage,
      level: this.level,
      exp: this.exp,
      dps,
      rates,
      goldPct: boostBonuses(this.boosts).goldPct + this.ascendBonuses.goldPct,
      capSeconds: this.ascendBonuses.offlineCapSeconds,
    });
    if (!plan) return null;

    const kept = Math.min(plan.drops, BALANCE.offlineItemCap);
    const items: Item[] = [];
    for (let i = 0; i < kept; i += 1) {
      items.push(
        createItem(globalWave(this.farmStage, 1), 'normal', this.rng, `it_${++this.itemSeq}`),
      );
    }

    const salvaged = plan.drops - kept;
    return {
      seconds: plan.seconds,
      capSeconds: this.ascendBonuses.offlineCapSeconds,
      capped: plan.capped,
      efficiency: BALANCE.offlineEfficiency,
      kills: plan.kills,
      gold: plan.gold,
      exp: plan.exp,
      levels: plan.levels,
      items,
      drops: plan.drops,
      salvaged,
      salvageGold: Math.floor(salvaged * (3 + this.stage * 1.2) * 2),
      essence: plan.essence,
      cores: plan.cores,
      books: plan.books,
    };
  }

  /**
   * Opens the daily rift: a fixed 60-second gauntlet on the farm stage with
   * modifiers. The main run is restored when the timer ends.
   */
  startRift(
    day: string,
    modifiers: RiftModifier[],
  ): { ok: boolean; reason?: 'locked' | 'active' | 'done' } {
    if (this.riftActive || this.duelActive || this.trialActive || this.dungeonActive) {
      return { ok: false, reason: 'active' };
    }
    if (!this.riftUnlocked) return { ok: false, reason: 'locked' };
    if (this.rift?.day === day) return { ok: false, reason: 'done' };

    this.riftReturn = { stage: this.stage, wave: this.wave };
    this.riftDay = day;
    this.riftActive = true;
    this.riftRemaining = RIFT_DURATION_SECONDS;
    this.riftKillsAtStart = this.kills;
    this.riftMods = modifiers;
    this.riftChestMult = riftChestGoldMult(modifiers);

    const mult = (key: 'enemyHp' | 'enemyAtk' | 'enemyAtkSpeed' | 'enemyDef' | 'heroAtk' | 'heroHp') =>
      modifiers.reduce((value, modifier) => value * (modifier[key] ?? 1), 1);
    this.riftEnemyHp = mult('enemyHp');
    this.riftEnemyAtk = mult('enemyAtk');
    this.riftEnemySpeed = mult('enemyAtkSpeed');
    this.riftEnemyDef = mult('enemyDef');
    this.riftHeroAtk = mult('heroAtk');
    this.riftHeroHp = mult('heroHp');

    this.stage = this.farmStage;
    this.wave = 1;
    this.deathsHere = 0;
    this.deadTimer = 0;
    this.shield = 0;
    this.shieldTimer = 0;
    this.buffTimer = 0;
    this.buffPct = 0;
    this.enemySlowTimer = 0;
    this.recomputeStats(false);
    this.hero.hp = this.hero.maxHp;
    this.spawnPack();
    for (const modifier of modifiers) this.learn('modifiers', modifier.id);
    this.emit({ type: 'riftstart', modifiers });
    this.emit({ type: 'spawn', enemy: this.enemy });
    return { ok: true };
  }

  /** Leaves the rift early and restores the main run without a chest. */
  cancelRift(): number {
    if (!this.riftActive) return 0;
    const kills = this.kills - this.riftKillsAtStart;
    this.restoreFromRift();
    return kills;
  }

  private restoreFromRift(): void {
    const back = this.riftReturn ?? { stage: this.farmStage, wave: 1 };

    this.riftActive = false;
    this.riftRemaining = 0;
    this.riftReturn = null;
    this.riftMods = [];
    this.riftKillsAtStart = this.kills;
    this.riftEnemyHp = 1;
    this.riftEnemyAtk = 1;
    this.riftEnemySpeed = 1;
    this.riftEnemyDef = 1;
    this.riftHeroAtk = 1;
    this.riftHeroHp = 1;
    this.riftChestMult = 1;

    this.stage = back.stage;
    this.wave = back.wave;
    this.deathsHere = 0;
    this.deadTimer = 0;
    this.shield = 0;
    this.shieldTimer = 0;
    this.buffTimer = 0;
    this.buffPct = 0;
    this.enemySlowTimer = 0;
    this.recomputeStats(false);
    this.hero.hp = this.hero.maxHp;
    this.spawnPack();
  }

  private endRift(): void {
    const kills = this.kills - this.riftKillsAtStart;
    const chest = riftChest(kills, this.farmStage, this.riftChestMult);
    const modifiers = this.riftMods;

    this.restoreFromRift();
    this.rift = { day: this.riftDay || dayKey(), kills };

    this.gold += chest.gold;
    this.essence += chest.essence;
    const item = chest.item
      ? createItem(globalWave(this.farmStage, 1), 'boss', this.rng, `it_${++this.itemSeq}`)
      : null;
    if (item) this.stashItem(item);

    this.emit({ type: 'riftend', kills, chest, modifiers, item });
    this.emit({ type: 'spawn', enemy: this.enemy });
  }

  /**
   * Retries the stage beyond the farm stage after a retreat. Returns false when
   * the knight is still recovering or there is nothing left to push.
   */
  push(): { ok: boolean; stage: number; reason?: 'dead' | 'pushing' | 'locked' } {
    if (this.riftActive || this.duelActive || this.trialActive || this.dungeonActive) {
      return { ok: false, stage: this.stage, reason: 'locked' };
    }
    if (this.deadTimer > 0) return { ok: false, stage: this.stage, reason: 'dead' };
    if (this.pushing) return { ok: false, stage: this.stage, reason: 'pushing' };
    if (!this.canPush) return { ok: false, stage: this.stage, reason: 'locked' };

    this.stage = this.farmStage + 1;
    this.wave = 1;
    this.deathsHere = 0;
    this.spawnPack();
    this.emit({ type: 'push', stage: this.stage });
    this.emit({ type: 'spawn', enemy: this.enemy });
    return { ok: true, stage: this.stage };
  }

  applyOffline(report: OfflineReport): void {
    this.gold += report.gold + report.salvageGold;
    this.exp += report.exp;
    this.essence += report.essence;
    this.cores += report.cores;
    this.books += report.books;

    for (const item of report.items) {
      this.learn('items', item.name);
      if (this.inventory.length < INVENTORY_CAP) this.inventory.push(item);
      else this.gold += item.salvage;
    }

    this.gainExp();
  }

  tick(dt: number): void {
    const step = Math.min(Math.max(dt, 0), 0.1);
    if (step <= 0) return;

    this.time += step;
    this.syncPalettes();

    if (this.riftActive) {
      this.riftRemaining -= step;
      if (this.riftRemaining <= 0) {
        this.riftRemaining = 0;
        this.endRift();
        return;
      }
    }

    if (this.deadTimer > 0) {
      this.deadTimer -= step;
      if (this.deadTimer <= 0) {
        this.deadTimer = 0;
        this.hero.hp = this.hero.maxHp;
        this.emit({ type: 'revive' });
      }
      return;
    }

    this.heroCd -= step;
    if (this.heroCd <= 0) {
      this.heroCd += 1 / this.hero.atkSpeed;
      this.heroAttack();
    }

    // The rest of the party swings and casts on its own timers.
    for (const mate of this.mates) {
      if (mate.down) continue;
      mate.cd -= step;
      if (mate.cd <= 0) {
        mate.cd += 1 / Math.max(0.2, mate.atkSpeed);
        const target = this.enemy.id;
        this.mateAttack(mate);
        // A swing that cleared the wave spawned the next one; the member keeps
        // its cooldown for that new target instead of dumping it instantly.
        if (this.enemy.id !== target) continue;
      }

      mate.skillCd -= step;
      if (mate.skillCd > 0) continue;

      const signature = characterById(mate.id)?.skill;
      mate.skillCd = signature?.cooldown ?? 10;
      if (signature) this.mateCast(mate, signature);
    }

    if (this.deadTimer > 0) return;

    this.updateTimers(step);
    this.updatePet(step);
    this.castReadySkill();
    this.castCostumeSkill();
    this.castLeaderSignature(step);

    if (this.deadTimer > 0) return;

    this.enemyCd -= step;
    if (this.enemyCd <= 0) {
      const slow = this.enemySlowTimer > 0 ? 1 - this.enemySlowPct : 1;
      this.enemyCd += 1 / Math.max(0.2, this.enemy.atkSpeed * slow);
      this.enemyAttack();
    }

    // A rival also winds up a heavier elemental strike now and then.
    if (this.duelActive) {
      this.duelSkillCd -= step;
      if (this.duelSkillCd <= 0) {
        this.duelSkillCd = ARENA_SKILL_COOLDOWN;
        this.rivalStrike();
      }
    }
  }

  private updateTimers(step: number): void {
    if (this.shieldTimer > 0) {
      this.shieldTimer -= step;
      if (this.shieldTimer <= 0) {
        this.shieldTimer = 0;
        this.shield = 0;
      }
    }

    if (this.buffTimer > 0) {
      this.buffTimer -= step;
      if (this.buffTimer <= 0) {
        this.buffTimer = 0;
        this.buffPct = 0;
      }
    }

    if (this.enemySlowTimer > 0) this.enemySlowTimer = Math.max(0, this.enemySlowTimer - step);

    for (let i = 0; i < this.skillCd.length; i += 1) {
      if (this.skillCd[i] > 0) this.skillCd[i] = Math.max(0, this.skillCd[i] - step);
    }
    if (this.skillGcd > 0) this.skillGcd = Math.max(0, this.skillGcd - step);
    if (this.costumeCd > 0) this.costumeCd = Math.max(0, this.costumeCd - step);

    if (this.surgeTimer > 0) {
      this.surgeTimer = Math.max(0, this.surgeTimer - step);
      if (this.surgeTimer === 0) {
        this.surgeCharge = 0;
        this.recomputeStats(true);
        this.emit({ type: 'surge', phase: 'end' });
      }
    }
  }

  /** Slots are priority order: slot 1 is tried first, then 2 … 6. */
  private castReadySkill(): void {
    if (this.skillGcd > 0) return;

    for (let slot = 0; slot < this.skills.active.length; slot += 1) {
      const skillId = this.skills.active[slot];
      if (!skillId || this.skillCd[slot] > 0) continue;

      const info = skillById(skillId);
      if (!info) continue;

      this.skillCd[slot] = info.cooldown ?? 10;
      this.skillGcd = SKILL_GLOBAL_COOLDOWN;
      this.castSkill(info, this.skills.levels[skillId] ?? 1);
      return;
    }
  }

  /**
   * The leader's roster signature, on its own timer like a mate's: the loadout
   * and outfit skills sit on top of it, they do not replace it.
   */
  private castLeaderSignature(step: number): void {
    const id = activeCharacterId(this.party);
    // A swap starts the incoming leader's timer from scratch, so a charged
    // signature is never handed to whoever walks in.
    if (this.signatureId !== id) {
      this.signatureId = id;
      this.signatureCd = characterById(id)?.skill.cooldown ?? 10;
    }

    if (this.signatureCd > 0) {
      this.signatureCd = Math.max(0, this.signatureCd - step);
      return;
    }

    const info = characterById(id)?.skill;
    this.signatureCd = info?.cooldown ?? 10;
    if (!info) return;

    this.castSignature(
      {
        id,
        atk: this.attackPower,
        elemBonus: this.elemBonus,
        hp: this.hero.hp,
        maxHp: this.hero.maxHp,
        setHp: (hp) => {
          this.hero.hp = hp;
        },
      },
      info,
    );
  }

  /** The outfit's signature skill: one extra cast, gated by the same GCD. */
  private castCostumeSkill(): void {
    const info = costumeSkill(this.costume);
    if (!info) return;
    if (this.costumeCd > 0 || this.skillGcd > 0) return;

    this.costumeCd = info.cooldown ?? 12;
    this.castSkill(info, 1);
  }

  private castSkill(info: SkillInfo, level: number): void {
    const scale = skillScale(level);

    if (info.kind === 'damage' || info.kind === 'drain') {
      const elemMult = elementMultiplier(info.element ?? null, this.enemy.element);
      const damage = this.skillDamage(info, scale);

      this.enemy.hp -= damage;
      this.damageMarks.push({ t: this.time, dmg: damage });
      this.addSurgeCharge(damage);
      this.emit({
        type: 'hit',
        target: 'enemy',
        damage,
        crit: false,
        advantage: elemMult > 1 ? 'strong' : elemMult < 1 ? 'weak' : 'neutral',
      });
      if (info.kind === 'drain') {
        const healed = Math.min(
          this.hero.maxHp - this.hero.hp,
          Math.round(damage * (info.drainPct ?? 0) * scale),
        );
        this.hero.hp += healed;
        this.emit({ type: 'skill', name: info.name, kind: 'drain', amount: healed });
      } else {
        this.emit({ type: 'skill', name: info.name, kind: 'damage', amount: damage });
      }

      if (info.healPct) {
        const healed = Math.min(
          this.hero.maxHp - this.hero.hp,
          Math.round(this.hero.maxHp * info.healPct * scale),
        );
        if (healed > 0) {
          this.hero.hp += healed;
          this.emit({ type: 'skill', name: info.name, kind: 'heal', amount: healed });
        }
      }

      if (info.slowPct) {
        this.enemySlowPct = info.slowPct * scale;
        this.enemySlowTimer = info.duration ?? 4;
      }

      if (this.enemy.hp <= 0) {
        this.killEnemy();
        return;
      }
      return;
    }

    if (info.kind === 'heal') {
      const before = this.hero.hp;
      this.hero.hp = Math.min(
        this.hero.maxHp,
        this.hero.hp + Math.round(this.hero.maxHp * (info.healPct ?? 0.15) * scale),
      );
      this.emit({
        type: 'skill',
        name: info.name,
        kind: 'heal',
        amount: Math.round(this.hero.hp - before),
      });
      return;
    }

    if (info.kind === 'shield') {
      const amount = Math.round(this.hero.maxHp * (info.shieldPct ?? 0.2) * scale);
      this.shield = Math.max(this.shield, amount);
      this.shieldTimer = info.duration ?? 8;
      this.emit({ type: 'skill', name: info.name, kind: 'shield', amount });
      return;
    }

    this.buffPct = (info.buffPct ?? 0.25) * scale;
    this.buffTimer = info.duration ?? 6;
    this.emit({
      type: 'skill',
      name: info.name,
      kind: 'buff',
      amount: Math.round(this.buffPct * 100),
    });
  }

  private skillDamage(info: SkillInfo, scale: number): number {
    const elemMult = elementMultiplier(info.element ?? null, this.enemy.element);
    const bonus = info.element && this.attuned.element === info.element ? this.elemBonus : 0;
    return Math.max(
      1,
      Math.round(this.attackPower * (info.multiplier ?? 1) * scale * elemMult * (1 + bonus)),
    );
  }

  findItem(itemId: string): Item | null {
    for (const slot of SLOTS) {
      if (this.equipped[slot]?.id === itemId) return this.equipped[slot];
    }
    return this.inventory.find((item) => item.id === itemId) ?? null;
  }

  /**
   * Spends gold up to `times` attempts. Failures raise pity, which raises the
   * next success chance instead of wasting the attempt entirely.
   */
  enhanceItem(itemId: string, times = 1): EnhanceOutcome {
    const item = this.findItem(itemId);
    if (!item) {
      return { ok: false, attempts: 0, successes: 0, cost: 0, level: 0, chance: 0, reason: 'missing' };
    }

    let attempts = 0;
    let successes = 0;
    let cost = 0;
    let reason: UpgradeBlockReason | undefined;

    for (let i = 0; i < Math.max(1, times); i += 1) {
      if (item.enhance >= BALANCE.enhanceMax) {
        reason = 'max';
        break;
      }

      const attemptCost = enhanceCostFor(item);
      if (this.gold < attemptCost) {
        reason = 'gold';
        break;
      }

      this.gold -= attemptCost;
      cost += attemptCost;
      attempts += 1;

      if (this.rng() < enhanceChanceFor(item)) {
        item.enhance += 1;
        item.pity = 0;
        successes += 1;
      } else {
        item.pity += 1;
      }
    }

    if (attempts > 0) this.recomputeStats(true);

    if (successes > 0 && SLOTS.some((slot) => this.equipped[slot] === item)) {
      this.emit({ type: 'enhance', level: item.enhance });
    }

    return {
      ok: attempts > 0,
      attempts,
      successes,
      cost,
      level: item.enhance,
      chance: enhanceChanceFor(item),
      reason,
    };
  }

  /**
   * One refine attempt: flat price, progress toward the slot's next level, and
   * a pity counter that forces an S line after `refinePity` dry rolls.
   */
  refineItem(itemId: string): RefineOutcome {
    const item = this.findItem(itemId);
    if (!item) {
      return {
        ok: false,
        cost: 0,
        level: 0,
        progress: 0,
        pity: 0,
        leveled: false,
        forced: false,
        reason: 'missing',
      };
    }

    const state = this.refine[item.slot] ?? { level: 0, progress: 0, pity: 0 };
    const cost = refineCostFor(item);
    const blocked = {
      ok: false as const,
      cost,
      level: state.level,
      progress: state.progress,
      pity: state.pity,
      leveled: false,
      forced: false,
    };

    if (item.substats.length > 0 && item.substats.every((sub) => sub.locked)) {
      return { ...blocked, reason: 'locked' };
    }
    if (this.gold < cost) return { ...blocked, reason: 'gold' };

    const force = state.pity >= BALANCE.refinePity - 1;
    this.gold -= cost;
    item.substats = refineSubstats(item, this.rng, { cap: refineCap(state.level), force });
    item.refines += 1;

    const sOrBetter = item.substats.some(
      (sub) => TIER_ORDER[substatTier(sub, item)] >= TIER_ORDER.S,
    );
    const pity = sOrBetter ? 0 : Math.min(BALANCE.refinePity, state.pity + 1);

    let level = state.level;
    let progress = state.progress + 1;
    let leveled = false;
    if (level >= BALANCE.refineMax) {
      progress = 0;
    } else if (progress >= BALANCE.refineProgress) {
      level += 1;
      progress = 0;
      leveled = true;
    }

    this.refine = { ...this.refine, [item.slot]: { level, progress, pity } };
    this.recomputeStats(true);
    return { ok: true, cost, level, progress, pity, leveled, forced: force };
  }

  /**
   * Enhances every equipped item up to `target` and stops when gold runs out.
   * +5 is guaranteed, so this is the safe batch the forge button uses.
   */
  enhanceAllTo(target = BALANCE.enhanceGuaranteed): {
    items: number;
    levels: number;
    cost: number;
    reason?: UpgradeBlockReason;
  } {
    const cap = Math.max(0, Math.min(BALANCE.enhanceMax, Math.floor(target)));
    let items = 0;
    let levels = 0;
    let cost = 0;
    let reason: UpgradeBlockReason | undefined;

    for (const slot of SLOTS) {
      const item = this.equipped[slot];
      if (!item || item.enhance >= cap) continue;

      let changed = false;
      while (item.enhance < cap) {
        const outcome = this.enhanceItem(item.id, 1);
        if (outcome.attempts === 0) {
          reason = outcome.reason;
          break;
        }
        cost += outcome.cost;
        levels += outcome.successes;
        if (outcome.successes > 0) changed = true;
      }

      if (changed) items += 1;
      if (reason) break;
    }

    return { items, levels, cost, reason };
  }

  /**
   * Rerolls unlocked substats until every one reaches `tier` or gold runs out.
   * Locked substats are kept as-is by the refine roll.
   */
  refineToTier(
    itemId: string,
    tier: SubstatTier = 'A',
    maxRolls = 40,
  ): {
    ok: boolean;
    rolls: number;
    cost: number;
    reached: boolean;
    level: number;
    reason?: 'missing' | 'gold' | 'locked' | 'cap';
  } {
    const item = this.findItem(itemId);
    if (!item) {
      return { ok: false, rolls: 0, cost: 0, reached: false, level: 0, reason: 'missing' };
    }
    const level = this.refine[item.slot]?.level ?? 0;
    if (!item.substats.some((sub) => !sub.locked)) {
      return { ok: false, rolls: 0, cost: 0, reached: false, level, reason: 'locked' };
    }
    // The slot's level caps the best tier a roll can reach; a target above the
    // cap would burn gold forever, so refuse up front.
    if (refineCap(level) < TIER_MIN[tier]) {
      return { ok: false, rolls: 0, cost: 0, reached: false, level, reason: 'cap' };
    }

    const target = TIER_ORDER[tier];
    const belowTarget = (): boolean =>
      item.substats.some(
        (sub) => !sub.locked && TIER_ORDER[substatTier(sub, item)] < target,
      );

    let rolls = 0;
    let cost = 0;
    let reason: 'gold' | 'locked' | undefined;

    while (rolls < Math.max(1, maxRolls) && belowTarget()) {
      const attempt = this.refineItem(itemId);
      if (!attempt.ok) {
        reason = attempt.reason === 'locked' ? 'locked' : 'gold';
        break;
      }
      cost += attempt.cost;
      rolls += 1;
    }

    return {
      ok: rolls > 0,
      rolls,
      cost,
      reached: !belowTarget(),
      level: this.refine[item.slot]?.level ?? level,
      reason,
    };
  }

  toggleSubstatLock(itemId: string, index: number): boolean {
    const item = this.findItem(itemId);
    const sub = item?.substats[index];
    if (!sub) return false;
    sub.locked = !sub.locked;
    return true;
  }

  /**
   * Spends Rune Essence to socket a rune of the chosen element. Empty slots are
   * filled first, then the weakest rune is replaced.
   */
  enchantItem(itemId: string, element: Element): EnchantOutcome {
    const item = this.findItem(itemId);
    if (!item) return { ok: false, cost: 0, reason: 'missing' };

    const cost = runeCostFor(item);
    if (this.essence < cost) return { ok: false, cost, reason: 'essence' };

    const slot = nextRuneSlot(item);
    if (slot < 0) return { ok: false, cost, reason: 'max' };

    const rune = rollRune(item, element, this.rng);
    item.runes[slot] = rune;
    item.enchants += 1;
    this.essence -= cost;
    this.recomputeStats(true);
    return { ok: true, cost, rune };
  }

  upgradeBoost(branch: BoostBranch): BoostOutcome {
    const level = this.boosts[branch] ?? 0;
    if (level >= BOOST_MAX) return { ok: false, cost: 0, level, reason: 'max' };

    const cost = boostCost(level);
    if (!canUpgradeBoost(level, this.cores)) {
      return { ok: false, cost, level, reason: 'cores' };
    }

    this.cores -= cost;
    this.boosts[branch] = level + 1;
    this.recomputeStats(true);
    return { ok: true, cost, level: level + 1 };
  }

  respecBoosts(): number {
    const refund = totalBoostRefund(this.boosts);
    if (refund <= 0) return 0;
    this.cores += refund;
    this.boosts = normalizeBoosts();
    this.recomputeStats(true);
    return refund;
  }

  buyAscendNode(nodeId: string): NodeBuyResult {
    const info = ascendNodeById(nodeId);
    if (!info) return { ok: false, cost: 0, level: 0, reason: 'missing' };

    const level = this.ascension.nodes[nodeId] ?? 0;
    if (level >= info.max) return { ok: false, cost: 0, level, reason: 'max' };

    const cost = nodeCost(nodeId, this.ascension.nodes);
    if (this.ascension.shards < cost) {
      return { ok: false, cost, level, reason: 'shards' };
    }

    this.ascension.shards -= cost;
    this.ascension.nodes[nodeId] = level + 1;
    this.recomputeStats(true);
    return { ok: true, cost, level: level + 1 };
  }

  /** Resets the run and keeps the permanent Ascension tree. */
  ascend(): { ok: boolean; shards: number; stage: number; reason?: UpgradeBlockReason } {
    if (this.riftActive || this.duelActive || this.trialActive || this.dungeonActive) {
      return { ok: false, shards: 0, stage: this.stage, reason: 'rift' };
    }

    if (this.maxStage < BALANCE.ascendStage) {
      return { ok: false, shards: 0, stage: this.stage, reason: 'stage' };
    }

    const reward = shardReward(this.maxStage);
    this.ascension = {
      count: this.ascension.count + 1,
      shards: this.ascension.shards + reward,
      nodes: { ...this.ascension.nodes },
    };

    const startStage = this.ascendBonuses.startStage;
    this.level = 1;
    this.exp = 0;
    this.expToNext = levelUpCost(1);
    this.gold = 0;
    this.essence = 0;
    this.cores = 0;
    this.books = 0;
    this.dust = 0;
    this.kills = 0;
    this.inventory = [];
    // Ascension strips every character's gear, then re-arms the active member.
    this.gear = characterGear();
    this.equipped.weapon = starterWeapon();
    this.itemSeq = 1;
    this.boosts = normalizeBoosts();
    this.skills = normalizeSkills({ ...this.skills, levels: {} });
    // The ladder survives a reset, but rival snapshots were taken at the old
    // power level; fresh ones are dealt once stage 30 is reached again.
    this.arena = { ...this.arena, rivals: [], fought: [] };
    this.stage = startStage;
    this.maxStage = startStage;
    this.farmStage = startStage;
    this.deathsHere = 0;
    this.wave = 1;
    this.deadTimer = 0;
    this.shield = 0;
    this.shieldTimer = 0;
    this.buffTimer = 0;
    this.buffPct = 0;
    this.enemySlowTimer = 0;
    this.skillCd = Array.from({ length: MAX_ACTIVE_SKILLS }, () => 0);
    this.skillGcd = 0;
    this.costumeCd = 0;
    this.surgeCharge = 0;
    this.surgeTimer = 0;
    this.hero = { ...this.computeStats(), hp: 0 };
    this.hero.hp = this.hero.maxHp;
    this.spawnPack();
    this.syncPalettes();

    this.emit({ type: 'ascend', stage: this.stage, shards: reward });
    this.emit({ type: 'spawn', enemy: this.enemy });

    return { ok: true, shards: reward, stage: this.stage };
  }

  setSkill(slot: number, skillId: string | null): boolean {
    if (!Number.isInteger(slot) || slot < 0 || slot >= this.skills.active.length) return false;
    const info = skillById(skillId);
    if (skillId && info?.type !== 'active') return false;

    this.skills.active[slot] = skillId;
    this.skillCd[slot] = 0;
    return true;
  }

  setPassive(skillId: string | null): boolean {
    const info = skillById(skillId);
    if (skillId && info?.type !== 'passive') return false;

    this.skills.passive = skillId;
    this.recomputeStats(true);
    return true;
  }

  upgradeSkill(skillId: string): SkillUpgradeOutcome {
    const info = skillById(skillId);
    const level = this.skills.levels[skillId] ?? 1;
    if (!info) return { ok: false, cost: 0, level, reason: 'missing' };
    if (level >= 10) return { ok: false, cost: 0, level, reason: 'max' };

    const cost = level;
    if (this.books < cost) return { ok: false, cost, level, reason: 'books' };

    this.books -= cost;
    this.skills.levels[skillId] = level + 1;
    if (this.skills.passive === skillId) this.recomputeStats(true);
    return { ok: true, cost, level: level + 1 };
  }

  equip(itemId: string): boolean {
    const index = this.inventory.findIndex((item) => item.id === itemId);
    if (index < 0) return false;

    const item = this.inventory[index];
    const previous = this.equipped[item.slot];
    this.equipped[item.slot] = item;
    this.inventory.splice(index, 1);
    if (previous) this.inventory.push(previous);

    this.recomputeStats(true);
    return true;
  }

  unequip(slot: Slot): boolean {
    const item = this.equipped[slot];
    if (!item || this.inventory.length >= INVENTORY_CAP) return false;

    this.equipped[slot] = null;
    this.inventory.push(item);
    this.recomputeStats(true);
    return true;
  }

  salvage(itemId: string): Item | null {
    const index = this.inventory.findIndex((item) => item.id === itemId);
    if (index < 0) return null;

    const [item] = this.inventory.splice(index, 1);
    this.gold += item.salvage;
    this.dust += DUST_BY_RARITY[item.rarity];
    if (item.rarity !== 'common') this.essence += 1;
    return item;
  }

  salvageCommons(): { count: number; gold: number; dust: number } {
    let count = 0;
    let gold = 0;
    let dust = 0;

    for (let i = this.inventory.length - 1; i >= 0; i -= 1) {
      const item = this.inventory[i];
      if (item.rarity !== 'common' || item.enhance > 0 || item.refines > 0) continue;
      gold += item.salvage;
      dust += DUST_BY_RARITY[item.rarity];
      count += 1;
      this.inventory.splice(i, 1);
    }

    this.gold += gold;
    this.dust += dust;
    return { count, gold, dust };
  }

  /** Three weakest items of one rarity become one of the next tier. */
  fuse(rarity: Rarity): ForgeOutcome {
    const target = fuseTarget(rarity);
    if (!target) return { ok: false, reason: 'rarity' };

    const consumed = fuseCandidates(this.inventory, rarity);
    if (consumed.length < FUSE_COUNT) return { ok: false, reason: 'items' };

    const ids = new Set(consumed.map((item) => item.id));
    this.inventory = this.inventory.filter((item) => !ids.has(item.id));

    const item = createItem(
      globalWave(this.farmStage, 1),
      'normal',
      this.rng,
      `it_${++this.itemSeq}`,
      { rarity: target },
    );
    const autoSalvaged = this.stashItem(item);
    this.emit({ type: 'loot', item, autoSalvaged });
    return { ok: true, item, consumed };
  }

  /** Guaranteed Epic set piece, paid with dust and essence. */
  craftSetPiece(slot: Slot, set: ItemSet): ForgeOutcome {
    if (!SLOTS.includes(slot)) return { ok: false, reason: 'slot' };
    if (!craftableSets(this.codex.items).includes(set)) return { ok: false, reason: 'set' };
    if (this.dust < FORGE_COST.dust) return { ok: false, reason: 'dust' };
    if (this.essence < FORGE_COST.essence) return { ok: false, reason: 'essence' };

    this.dust -= FORGE_COST.dust;
    this.essence -= FORGE_COST.essence;
    const item = createItem(
      globalWave(this.farmStage, 1),
      'boss',
      this.rng,
      `it_${++this.itemSeq}`,
      { rarity: 'epic', slot, set },
    );
    const autoSalvaged = this.stashItem(item);
    this.emit({ type: 'loot', item, autoSalvaged });
    return { ok: true, item };
  }

  /**
   * Headless boss attempt for the forecast. Works on a detached copy, so the
   * live run, its gold, and its gear are never touched.
   */
  trialBoss(
    stage: number,
    options: { seconds?: number; mutate?: (sim: BattleSim) => void } = {},
  ): BossTrial {
    const prepared = new BattleSim(this.trialSave(stage), trialRng());
    options.mutate?.(prepared);

    // Rebuild from the mutated save with a fresh fixed seed so every candidate
    // fights the same boss with the same crit/loot rolls.
    const trial = new BattleSim(prepared.saveData(), trialRng());
    trial.stage = stage;
    trial.farmStage = Math.max(1, stage - 1);
    trial.maxStage = Math.max(trial.maxStage, stage + 1);
    trial.wave = BALANCE.bossWave;
    trial.deathsHere = 0;
    trial.deadTimer = 0;
    trial.hero.hp = trial.hero.maxHp;
    trial.enemy = trial.buildEnemy();
    trial.enemyCd = 1.1;

    const cap = options.seconds ?? TRIAL_SECONDS;
    let killed = false;
    let seconds: number | null = null;
    let deaths = 0;

    trial.on((event) => {
      if (event.type === 'kill' && event.kind === 'boss') {
        killed = true;
        seconds = trial.time;
      }
      if (event.type === 'death') deaths += 1;
    });

    while (trial.time < cap && !killed && deaths < BALANCE.retreatAfterDeaths) {
      trial.tick(1 / 30);
    }

    return {
      killed,
      seconds: seconds === null ? null : Math.round(seconds * 10) / 10,
      deaths,
      remainingPct:
        killed || trial.enemy.hp <= 0
          ? 0
          : Math.max(0, Math.min(100, Math.round((trial.enemy.hp / trial.enemy.maxHp) * 100))),
    };
  }

  /** Forecast-only enhance: adds levels without spending gold or rolling. */
  trialEnhance(itemId: string, levels = 1): boolean {
    const item = this.findItem(itemId);
    if (!item || levels <= 0) return false;
    item.enhance = Math.min(BALANCE.enhanceMax, item.enhance + levels);
    item.power = itemPower(item);
    this.recomputeStats(false);
    return true;
  }

  private trialSave(stage: number): SaveData {
    const data = this.saveData();
    return {
      ...data,
      stage,
      farmStage: Math.max(1, stage - 1),
      maxStage: Math.max(data.maxStage, stage),
      inventory: [...this.inventory],
      equipped: { ...this.equipped },
      pets: { active: this.pets.active, kinds: { ...this.pets.kinds } },
    };
  }

  equipBest(): number {
    let count = 0;

    // Two passes: the first can complete a set, the second re-scores the other
    // slots against that new bonus. Scores only ever rise, so this settles.
    for (let pass = 0; pass < 2; pass += 1) {
      let changed = false;

      for (const slot of SLOTS) {
        const current = this.equipped[slot];
        let bestId: string | null = null;
        let bestScore = gearScoreOf(this.equipped);

        for (const item of this.inventory) {
          if (item.slot !== slot || item.id === current?.id) continue;
          const score = gearScoreOf({ ...this.equipped, [slot]: item });
          if (score > bestScore) {
            bestScore = score;
            bestId = item.id;
          }
        }

        if (bestId && this.equip(bestId)) {
          count += 1;
          changed = true;
        }
      }

      if (!changed) break;
    }

    return count;
  }

  /** Awakens every pet whose stage has been cleared. */
  private syncPetUnlock(): void {
    let awakened = false;
    for (const info of PETS) {
      if (this.farmStage < info.unlockStage) continue;
      if ((this.pets.kinds[info.id]?.level ?? 0) > 0) continue;

      this.pets = awakenPet(this.pets, info.id);
      this.emit({ type: 'pet', id: info.id, level: 1 });
      awakened = true;
    }
    // One timer for the wisp that actually fights, not the last one awakened.
    if (awakened) this.petCd = activePetInfo(this.pets)?.interval ?? 0;
  }

  /** Picks the wisp that fights for the knight. */
  setActivePet(id: PetKind | null): boolean {
    const next = setActive(this.pets, id);
    if (!next || next.active === this.pets.active) return false;

    this.pets = next;
    const info = activePetInfo(this.pets);
    this.petCd = info?.interval ?? 0;
    this.emit({ type: 'pet', id: this.pets.active ?? 'ember', level: petLevel(this.pets) });
    return true;
  }

  /** Spends one duplicate egg to raise a pet's level ceiling. */
  synthesizePet(id: PetKind): { ok: boolean; maxLevel?: number } {
    const result = synthesize(this.pets, id);
    if (!result) return { ok: false };

    this.pets = result.pets;
    this.emit({ type: 'petSynth', id, maxLevel: result.maxLevel });
    return { ok: true, maxLevel: result.maxLevel };
  }

  upgradePet(id: PetKind | null = this.pets.active): {
    ok: boolean;
    cost: number;
    level: number;
    reason?: UpgradeBlockReason;
  } {
    const petId = id ?? this.pets.active;
    const pet = petId ? this.pets.kinds[petId] : null;
    const info = petById(petId);
    if (!petId || !pet || !info || pet.level <= 0) {
      return { ok: false, cost: 0, level: 0, reason: 'stage' };
    }
    if (pet.level >= pet.maxLevel) {
      return { ok: false, cost: 0, level: pet.level, reason: 'max' };
    }

    const trained = trainPet(this.pets, petId, this.gold);
    if (!trained) {
      return { ok: false, cost: petCost(info, pet.level), level: pet.level, reason: 'gold' };
    }

    this.gold -= trained.cost;
    this.pets = trained.pets;
    this.emit({ type: 'pet', id: petId, level: trained.level });
    return { ok: true, cost: trained.cost, level: trained.level };
  }

  private updatePet(step: number): void {
    const pet = activePetState(this.pets);
    const info = activePetInfo(this.pets);
    if (!pet || !info || pet.level <= 0) return;

    this.petCd -= step;
    if (this.petCd <= 0) {
      this.petCd += info.interval;
      this.petAttack(info);
      if (this.deadTimer > 0) return;
    }

    if (this.burnTimer > 0 && this.enemy.hp > 0) {
      const slice = Math.min(step, this.burnTimer);
      const damage = this.burnDps * slice;
      this.enemy.hp -= damage;
      this.damageMarks.push({ t: this.time, dmg: damage });
      this.burnTimer = Math.max(0, this.burnTimer - step);
      this.burnBank += damage;

      if (this.burnBank >= 1) {
        this.emit({ type: 'burn', damage: Math.max(1, Math.round(this.burnBank)) });
        this.burnBank = 0;
      }

      if (this.enemy.hp <= 0) {
        this.burnTimer = 0;
        this.burnDps = 0;
        this.burnBank = 0;
        this.killEnemy();
      }
    }
  }

  private petAttack(info: PetInfo): void {
    const level = activePetState(this.pets)?.level ?? 0;
    const damage = petDamage(info, this.hero.atk, level);
    if (damage <= 0) return;

    this.enemy.hp -= damage;
    this.damageMarks.push({ t: this.time, dmg: damage });
    this.emit({ type: 'companionHit', damage });

    if (info.effect === 'burn') {
      this.burnTimer = info.burnSeconds ?? 3;
      this.burnDps = damage * (info.burnRatio ?? 0.15);
      this.burnBank = 0;
    }

    if (info.effect === 'slow') {
      this.enemySlowPct = info.slowPct ?? 0.2;
      this.enemySlowTimer = info.slowSeconds ?? 2.5;
    }

    if (info.effect === 'chain' && this.enemy.hp > 0) {
      const extra = Math.max(1, Math.round(damage * (info.chainRatio ?? 0.6)));
      this.enemy.hp -= extra;
      this.damageMarks.push({ t: this.time, dmg: extra });
      this.emit({ type: 'companionHit', damage: extra });
    }

    if (this.enemy.hp <= 0) this.killEnemy();
  }

  snapshot(): HudSnapshot {
    const weapon = this.equipped.weapon;
    const attuned = this.attuned;
    return {
      stage: this.stage,
      maxStage: this.maxStage,
      farmStage: this.farmStage,
      pushing: this.pushing,
      canPush: this.canPush,
      deathsHere: this.deathsHere,
      deathsToRetreat: BALANCE.retreatAfterDeaths,
      arena: this.arenaView(),
      trial: this.trialView(),
      rift: {
        unlocked: this.riftUnlocked,
        active: this.riftActive,
        remaining: Math.ceil(this.riftRemaining),
        kills: this.riftActive ? this.kills - this.riftKillsAtStart : 0,
        todayDone: !this.riftActive && this.rift?.day === dayKey(),
        lastKills: this.rift?.kills ?? 0,
        modifiers: this.riftActive ? this.riftMods : riftModifiers(dayKey()),
      },
      surge: {
        unlocked: this.surgeUnlocked,
        active: this.surgeActive,
        charge: Math.round(this.surgeMeter * 1000) / 1000,
        remaining: Math.round(this.surgeTimer * 10) / 10,
      },
      event: {
        unlocked: this.eventUnlocked,
        active: this.eventActive,
        key: this.event.key,
        bosses: this.event.bosses,
        goal: EVENT_GOAL,
        claimed: this.event.claimed,
        startsAt: this.eventStartsAt,
        endsAt: this.eventEndsAt,
      },
      target: bossTarget(
        {
          atk: this.hero.atk,
          atkSpeed: this.hero.atkSpeed,
          crit: this.hero.crit,
          critDmg: this.hero.critDmg,
          def: this.hero.def,
          maxHp: this.hero.maxHp,
          skills: this.skills,
          element: attuned.element,
          elemBonus: attuned.bonus + boostBonuses(this.boosts).elemBonus,
          petDps: petDpsFor(this.pets, this.hero.atk),
        },
        this.pushing || !this.canPush ? this.stage : this.farmStage + 1,
      ),
      wave: this.wave,
      kind: this.enemy.kind,
      enemyName: this.enemy.name,
      enemyHp: Math.max(0, Math.ceil(this.enemy.hp)),
      enemyMaxHp: this.enemy.maxHp,
      enemyCount: this.pack.length,
      heroHp: Math.max(0, Math.ceil(this.hero.hp)),
      heroMaxHp: this.hero.maxHp,
      level: this.level,
      exp: this.exp,
      expToNext: this.expToNext,
      gold: this.gold,
      costume: {
        owned: [...this.costume.owned],
        equipped: this.costume.equipped,
        pity: this.costume.pity,
        mastered: this.costume.mastered,
      },
      enhanceLevel: weapon?.enhance ?? 0,
      enhanceCost: weapon ? enhanceCostFor(weapon) : 0,
      enhanceChance: weapon ? enhanceChanceFor(weapon) : 0,
      hasWeapon: Boolean(weapon),
      essence: this.essence,
      cores: this.cores,
      heroElement: attuned.element,
      elemBonus: Math.round((attuned.bonus + boostBonuses(this.boosts).elemBonus) * 1000) / 10,
      enemyElement: this.enemy.element,
      boosts: { ...this.boosts },
      books: this.books,
      dust: this.dust,
      skills: cloneLoadout(this.skills),
      shield: Math.max(0, Math.round(this.shield)),
      shards: this.ascension.shards,
      ascensions: this.ascension.count,
      ascendNodes: { ...this.ascension.nodes },
      atk: this.hero.atk,
      dps: this.dps,
      kills: this.kills,
      dead: this.deadTimer > 0,
      party: this.partyView(),
      gearScore: this.gearScore,
      equipped: { ...this.equipped },
      inventory: [...this.inventory],
      codex: {
        enemies: [...this.codex.enemies],
        items: [...this.codex.items],
        modifiers: [...this.codex.modifiers],
        costumes: [...this.codex.costumes],
        mounts: [...this.codex.mounts],
        wings: [...this.codex.wings],
      },
      palette: { worn: this.palette.worn, unlocked: [...this.palette.unlocked] },
      mounts: this.mountView(),
      wings: this.wingView(),
      refine: {
        slots: Object.fromEntries(
          SLOTS.map((slot) => [slot, { ...(this.refine[slot] ?? { level: 0, progress: 0, pity: 0 }) }]),
        ) as HudSnapshot['refine']['slots'],
        resonance: refineResonance(this.refine),
      },
      dungeon: this.dungeonView(),
      shop: this.shopView(),
      pets: {
        active: this.pets.active,
        pets: PETS.map((info) => {
          const pet = this.pets.kinds[info.id] ?? {
            level: 0,
            maxLevel: PET_BASE_MAX,
            eggs: 0,
          };
          const cost = petCost(info, pet.level);
          return {
            ...pet,
            id: info.id,
            name: info.name,
            element: info.element,
            unlocked: pet.level > 0,
            damage: petDamage(info, this.hero.atk, pet.level),
            dps: petDps(info, this.hero.atk, pet.level),
            cost,
            upgradeable: pet.level > 0 && pet.level < pet.maxLevel && this.gold >= cost,
            synthable: pet.eggs > 0 && pet.maxLevel < PET_MAX_CAP,
          };
        }),
      },
    };
  }

  saveData(): SaveData {
    return {
      version: 24,
      level: this.level,
      exp: this.exp,
      gold: this.gold,
      essence: this.essence,
      cores: this.cores,
      books: this.books,
      dust: this.dust,
      boosts: { ...this.boosts },
      skills: cloneLoadout(this.skills),
      ascension: {
        count: this.ascension.count,
        shards: this.ascension.shards,
        nodes: { ...this.ascension.nodes },
      },
      maxStage: this.maxStage,
      farmStage: this.farmStage,
      stage: this.stage,
      rift: this.rift ? { ...this.rift } : undefined,
      arena: {
        ...this.arena,
        rivals: this.arena.rivals.map((rival) => ({ ...rival })),
        fought: [...this.arena.fought],
      },
      league: { ...this.league },
      trial: { ...this.trial },
      costume: {
        owned: [...this.costume.owned],
        equipped: this.costume.equipped,
        pity: this.costume.pity,
        mastered: this.costume.mastered,
      },
      event: { ...this.event },
      codex: {
        enemies: [...this.codex.enemies],
        items: [...this.codex.items],
        modifiers: [...this.codex.modifiers],
        costumes: [...this.codex.costumes],
        mounts: [...this.codex.mounts],
        wings: [...this.codex.wings],
      },
      pets: { active: this.pets.active, kinds: { ...this.pets.kinds } },
      palette: { worn: this.palette.worn, unlocked: [...this.palette.unlocked] },
      mounts: {
        active: this.mounts.active,
        owned: Object.fromEntries(
          Object.entries(this.mounts.owned).map(([id, mount]) => [id, { ...mount }]),
        ),
      },
      wings: {
        active: this.wings.active,
        owned: Object.fromEntries(
          Object.entries(this.wings.owned).map(([id, wing]) => [id, { ...wing }]),
        ),
      },
      refine: Object.fromEntries(
        SLOTS.map((slot) => [slot, { ...(this.refine[slot] ?? { level: 0, progress: 0, pity: 0 }) }]),
      ),
      crystals: this.crystals,
      dungeon: { ...this.dungeon },
      shop: { ...this.shop },
      kills: this.kills,
      inventory: [...this.inventory],
      equipped: { ...this.equipped },
      itemSeq: this.itemSeq,
      party: {
        slots: [...this.party.slots],
        unlocked: [...this.party.unlocked],
        activeSlot: this.party.activeSlot,
      },
      gear: Object.fromEntries(
        CHARACTERS.map((entry) => [entry.id, { ...this.gear[entry.id] }]),
      ) as Record<CharacterId, Equipped>,
      costumes: Object.fromEntries(
        CHARACTERS.map((entry) => [
          entry.id,
          { ...this.costumes[entry.id], owned: [...this.costumes[entry.id].owned] },
        ]),
      ) as Record<CharacterId, CostumeState>,
    };
  }

  /** What the PARTY screen renders: slots, roster, and who is on their feet. */
  partyView(): PartyView {
    const active = activeCharacterId(this.party);
    const info = (id: CharacterId) => characterById(id) ?? CHARACTERS[0];
    const members: PartyView['members'] = [
      {
        id: active,
        slot: this.party.activeSlot,
        name: info(active).name,
        color: info(active).color,
        element: info(active).element,
        hp: Math.max(0, Math.round(this.hero.hp)),
        maxHp: this.hero.maxHp,
        active: true,
        down: this.deadTimer > 0,
      },
      ...this.mates.map((mate) => ({
        id: mate.id,
        slot: this.party.slots.findIndex((id) => id === mate.id),
        name: info(mate.id).name,
        color: info(mate.id).color,
        element: info(mate.id).element,
        hp: Math.max(0, Math.round(mate.hp)),
        maxHp: mate.maxHp,
        active: false,
        down: mate.down,
      })),
    ];

    return {
      slots: [...this.party.slots],
      unlocked: [...this.party.unlocked],
      activeSlot: this.party.activeSlot,
      members,
    };
  }

  private heroAttack(): void {
    const element = this.attuned.element;
    const elemMult = elementMultiplier(element, this.enemy.element);
    const roll = damageRoll(
      this.attackPower,
      this.enemy.def,
      this.hero.crit,
      this.hero.critDmg,
      this.rng,
      { elemMult, elemBonus: element ? this.elemBonus : 0 },
    );
    this.enemy.hp -= roll.damage;
    this.damageMarks.push({ t: this.time, dmg: roll.damage });
    this.emit({
      type: 'hit',
      target: 'enemy',
      damage: roll.damage,
      crit: roll.crit,
      advantage: elemMult > 1 ? 'strong' : elemMult < 1 ? 'weak' : 'neutral',
    });
    this.addSurgeCharge(roll.damage);
    this.maybeMountSkill();
    this.maybeWingSkill();

    if (this.enemy.hp <= 0) {
      this.killEnemy();
    }
  }

  /** The ridden mount's chance skill, fired off the knight's own attack. */
  private maybeMountSkill(): void {
    const info = activeMountInfo(this.mounts);
    const mount = activeMountState(this.mounts);
    if (!info || !mount || this.enemy.hp <= 0) return;
    if (this.rng() > mountSkillChance(info, mount.level)) return;

    const power = mountSkillPower(info, mount.level);
    if (info.skill.kind === 'damage') {
      const damage = Math.max(1, Math.round(this.attackPower * power));
      this.enemy.hp -= damage;
      this.damageMarks.push({ t: this.time, dmg: damage });
      this.emit({ type: 'mountSkill', name: info.skill.name, kind: 'damage', amount: damage });
      return;
    }

    if (info.skill.kind === 'heal') {
      const healed = Math.min(
        this.hero.maxHp - this.hero.hp,
        Math.round(this.hero.maxHp * power),
      );
      if (healed > 0) {
        this.hero.hp += healed;
        this.emit({ type: 'mountSkill', name: info.skill.name, kind: 'heal', amount: healed });
      }
      return;
    }

    const amount = Math.round(this.hero.maxHp * power);
    this.shield = Math.max(this.shield, amount);
    this.shieldTimer = Math.max(this.shieldTimer, 6);
    this.emit({ type: 'mountSkill', name: info.skill.name, kind: 'shield', amount });
  }

  /** The worn wings' chance skill, fired off the knight's own attack. */
  private maybeWingSkill(): void {
    const info = activeWingInfo(this.wings);
    const wing = activeWingState(this.wings);
    if (!info || !wing || this.enemy.hp <= 0) return;
    if (this.rng() > wingSkillChance(info, wing.level)) return;

    const power = wingSkillPower(info, wing.level);
    if (info.skill.kind === 'damage') {
      const damage = Math.max(1, Math.round(this.attackPower * power));
      this.enemy.hp -= damage;
      this.damageMarks.push({ t: this.time, dmg: damage });
      this.emit({ type: 'wingSkill', name: info.skill.name, kind: 'damage', amount: damage });
      return;
    }

    if (info.skill.kind === 'heal') {
      const healed = Math.min(
        this.hero.maxHp - this.hero.hp,
        Math.round(this.hero.maxHp * power),
      );
      if (healed > 0) {
        this.hero.hp += healed;
        this.emit({ type: 'wingSkill', name: info.skill.name, kind: 'heal', amount: healed });
      }
      return;
    }

    const amount = Math.round(this.hero.maxHp * power);
    this.shield = Math.max(this.shield, amount);
    this.shieldTimer = Math.max(this.shieldTimer, 6);
    this.emit({ type: 'wingSkill', name: info.skill.name, kind: 'shield', amount });
  }

  /**
   * Every monster still standing swings on the same beat. A solo party faces
   * one, exactly as before; a full pack lands √count times a single hit.
   */
  private enemyAttack(): void {
    for (const enemy of [...this.pack]) {
      if (enemy.hp <= 0) continue;
      if (this.hero.hp <= 0 || this.deadTimer > 0) return;
      this.enemyStrike(enemy);
    }
  }

  private enemyStrike(enemy: Enemy): void {
    // Two in five swings land on whoever else is standing in front, so a
    // bigger party spreads the damage instead of leaving the leader to soak it.
    const standing = this.mates.filter((mate) => !mate.down);
    if (standing.length > 0 && this.rng() < 0.4) {
      const mate = standing[Math.floor(this.rng() * standing.length)];
      const hit = damageRoll(enemy.atk, mate.def, 0, 1, this.rng);
      mate.hp -= hit.damage;
      this.emit({ type: 'hit', target: 'hero', damage: hit.damage, crit: false });
      if (mate.hp <= 0) {
        mate.hp = 0;
        mate.down = true;
      }
      return;
    }

    const roll = damageRoll(enemy.atk, this.hero.def, 0, 1, this.rng);
    let incoming = roll.damage;

    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, incoming);
      this.shield -= absorbed;
      incoming -= absorbed;
    }

    this.hero.hp -= incoming;
    this.emit({ type: 'hit', target: 'hero', damage: incoming, crit: false });

    if (this.hero.hp <= 0 && this.trialActive) {
      this.hero.hp = 0;
      this.finishTrial(false);
      return;
    }

    if (this.hero.hp <= 0 && this.duelActive) {
      this.hero.hp = 0;
      this.finishDuel(false);
      return;
    }

    if (this.hero.hp <= 0 && this.dungeonActive) {
      this.hero.hp = 0;
      this.finishDungeon(false);
      return;
    }

    if (this.hero.hp <= 0) {
      this.hero.hp = 0;
      this.deadTimer = BALANCE.respawnSeconds;
      this.shield = 0;
      this.shieldTimer = 0;
      this.buffTimer = 0;
      this.buffPct = 0;
      this.enemySlowTimer = 0;
      if (this.surgeTimer > 0) {
        this.surgeTimer = 0;
        this.surgeCharge = 0;
        this.recomputeStats(false);
        this.emit({ type: 'surge', phase: 'end' });
      }
      this.emit({ type: 'death' });
      this.registerDeath();
    }
  }

  private registerDeath(): void {
    if (this.riftActive) {
      this.deathsHere = 0;
      return;
    }

    if (!this.pushing) {
      this.deathsHere = 0;
      return;
    }

    this.deathsHere += 1;
    if (this.deathsHere < BALANCE.retreatAfterDeaths) return;

    this.stage = this.farmStage;
    this.wave = 1;
    this.deathsHere = 0;
    this.spawnPack();
    this.emit({ type: 'retreat', stage: this.stage });
    this.emit({ type: 'spawn', enemy: this.enemy });
  }

  private killEnemy(): void {
    // A cleared target gets the downed members back on their feet.
    for (const mate of this.mates) {
      if (!mate.down && mate.hp === mate.maxHp) continue;
      mate.hp = mate.maxHp;
      mate.down = false;
    }

    if (this.trialActive) {
      this.finishTrial(true);
      return;
    }

    if (this.duelActive) {
      this.finishDuel(true);
      return;
    }

    if (this.dungeonActive) {
      const { kind, name } = this.enemy;
      this.emit({ type: 'kill', name, kind, gold: 0, exp: 0 });
      this.advanceDungeon();
      return;
    }

    const { kind, name } = this.enemy;
    this.burnTimer = 0;
    this.burnDps = 0;
    this.burnBank = 0;
    const reward = rewardFor(this.stage, this.wave, kind);
    // A wave can hold several monsters; each pays a share of the single-monster
    // reward, so clearing five is not five times the gold of clearing one.
    const share = 1 / Math.sqrt(this.packSize);
    const exp = Math.round(reward.exp * share);
    const goldPct = boostBonuses(this.boosts).goldPct + this.ascendBonuses.goldPct;
    const gold = Math.ceil(reward.gold * share * (1 + goldPct));
    this.gold += gold;
    this.exp += exp;
    this.kills += 1;

    let essence = 0;
    let cores = 0;
    let books = 0;
    if (kind === 'elite') essence = BALANCE.eliteEssence;
    if (kind === 'boss') {
      essence = BALANCE.bossEssence;
      cores = BALANCE.bossCoreBase + Math.floor((this.stage - 1) / 10);
      books = BALANCE.bossBookBase + Math.floor((this.stage - 1) / 20);
    }
    this.essence += essence;
    this.cores += cores;
    this.books += books;

    if (kind === 'boss' && this.eventActive && this.eventUnlocked && !this.riftActive) {
      this.event.bosses += 1;
    }

    this.emit({ type: 'kill', name, kind, gold, exp });
    if (essence > 0 || cores > 0 || books > 0) {
      this.emit({ type: 'resource', essence, cores, books });
    }

    this.maybeDropLoot(kind, this.packSize);
    this.maybeDropCostume(kind);
    this.maybeDropPetEgg(kind);
    this.gainExp();

    // Monsters are still standing: the wave goes on with the next one in front.
    this.pack.shift();
    if (this.pack.length > 0) {
      this.enemy = this.pack[0];
      this.emit({ type: 'spawn', enemy: this.enemy, next: true });
      return;
    }

    if (kind === 'boss') {
      if (this.riftActive) {
        // The rift loops its waves; it never advances the main run.
        this.wave = 1;
      } else {
        this.farmStage = Math.max(this.farmStage, this.stage);
        this.stage += 1;
        this.maxStage = Math.max(this.maxStage, this.stage);
        this.wave = 1;
        this.deathsHere = 0;
        this.syncPetUnlock();
        this.emit({ type: 'stageup', stage: this.stage });
      }
    } else {
      this.wave = Math.min(BALANCE.wavePerStage, this.wave + 1);
    }

    this.spawnPack();
    this.emit({ type: 'spawn', enemy: this.enemy });
  }

  /** Trash waves spawn the next fight; the boss wave settles the run. */
  private advanceDungeon(): void {
    this.burnTimer = 0;
    this.burnDps = 0;
    this.burnBank = 0;

    if (this.dungeonWave < DUNGEON_WAVES) {
      this.dungeonWave += 1;
      this.wave = this.dungeonWave;
      this.spawnPack();
      this.emit({ type: 'spawn', enemy: this.enemy });
      return;
    }

    this.finishDungeon(true);
  }

  private maybeDropLoot(kind: EnemyKind, split = 1): void {
    const base = kind === 'boss' ? 1 : kind === 'elite' ? 0.45 : 0.16;
    // Split across the wave so a five-monster pack does not flood the bag.
    const chance = Math.min(1, (base + this.ascendBonuses.dropChance) / Math.max(1, split));
    if (this.rng() > chance) return;

    // During Emberfall, bosses drop the exclusive set instead of ordinary gear.
    const eventDrop =
      kind === 'boss' && this.eventActive && this.eventUnlocked && !this.riftActive;
    const item = createItem(
      globalWave(this.stage, this.wave),
      kind,
      this.rng,
      `it_${++this.itemSeq}`,
      eventDrop ? { set: EVENT_SET, allowEventSet: true } : {},
    );

    const autoSalvaged = this.stashItem(item);
    this.emit({ type: 'loot', item, autoSalvaged });
  }

  /** Adds an item, salvaging the weakest one when the bag is full. */
  private stashItem(item: Item): boolean {
    this.learn('items', item.name);
    let autoSalvaged = false;
    if (this.inventory.length >= INVENTORY_CAP) {
      let weakestIndex = 0;
      let weakestPower = itemPower(this.inventory[0]);
      for (let i = 1; i < this.inventory.length; i += 1) {
        const power = itemPower(this.inventory[i]);
        if (power < weakestPower) {
          weakestPower = power;
          weakestIndex = i;
        }
      }
      const [weakest] = this.inventory.splice(weakestIndex, 1);
      this.gold += weakest.salvage;
      this.dust += DUST_BY_RARITY[weakest.rarity];
      autoSalvaged = true;
    }

    this.inventory.push(item);
    return autoSalvaged;
  }

  private gainExp(): void {
    let guard = 0;
    while (this.exp >= this.expToNext && guard < 500) {
      this.exp -= this.expToNext;
      this.level += 1;
      this.expToNext = levelUpCost(this.level);
      const previousMax = this.hero.maxHp;
      const stats = this.computeStats();
      this.hero.maxHp = stats.maxHp;
      this.hero.atk = stats.atk;
      this.hero.def = stats.def;
      this.hero.hp = Math.min(
        stats.maxHp,
        this.hero.hp + Math.max(0, stats.maxHp - previousMax),
      );
      this.emit({ type: 'levelup', level: this.level });
      guard += 1;
    }
  }

  /** Wears an owned costume, or takes the outfit off with `null`. */
  equipCostume(id: string | null): boolean {
    if (id !== null && !this.costume.owned.includes(id)) return false;
    if (this.costume.equipped === id) return false;

    this.costume = { ...this.costume, equipped: id };
    this.recomputeStats(true);
    this.costumeCd = 0;
    this.emit({ type: 'outfit', id });
    return true;
  }

  /** Forges a tier directly, paid with the dust duplicates leave behind. */
  forgeCostume(id: string): {
    ok: boolean;
    reason?: 'missing' | 'owned' | 'dust' | 'essence';
  } {
    const quote = forgeQuote(id);
    if (!quote) return { ok: false, reason: 'missing' };
    if (this.costume.owned.includes(id)) return { ok: false, reason: 'owned' };
    if (this.dust < quote.dust) return { ok: false, reason: 'dust' };
    if (this.essence < quote.essence) return { ok: false, reason: 'essence' };

    this.dust -= quote.dust;
    this.essence -= quote.essence;
    const gained = addCostume(this.costume, id);
    this.costume = gained.costume;
    this.learn('costumes', id);
    if (gained.completed) this.completeWardrobe();
    this.emit({ type: 'costume', id, duplicate: false, dust: 0 });
    return { ok: true };
  }

  private maybeDropCostume(kind: EnemyKind): void {
    if (kind !== 'boss') return;

    const pity = Math.min(COSTUME_PITY, this.costume.pity + 1);
    const chance = Math.min(1, COSTUME_BOSS_CHANCE + this.ascendBonuses.dropChance);
    const forced = pity >= COSTUME_PITY;
    if (!forced && this.lootRng() > chance) {
      this.costume = { ...this.costume, pity };
      return;
    }

    const roll = rollCostume(this.costume, this.farmStage, this.lootRng);
    if (!roll) {
      this.costume = { ...this.costume, pity };
      return;
    }

    this.grantCostume(roll);
  }

  /** Boss kills occasionally leave an egg, which a pet turns into a higher cap. */
  private maybeDropPetEgg(kind: EnemyKind): void {
    if (kind !== 'boss') return;
    if (this.lootRng() > PET_EGG_CHANCE) return;
    this.grantPetEgg();
  }

  private grantPetEgg(): { id: PetKind; eggs: number } | null {
    const candidates = PETS.filter((info) => {
      const pet = this.pets.kinds[info.id];
      return Boolean(pet && pet.level > 0 && pet.maxLevel < PET_MAX_CAP);
    });
    if (candidates.length === 0) return null;

    const index = Math.min(candidates.length - 1, Math.floor(this.lootRng() * candidates.length));
    const picked = candidates[Math.max(0, index)];
    const added = addEgg(this.pets, picked.id);
    if (!added) return null;

    this.pets = added.pets;
    this.emit({ type: 'petEgg', id: picked.id, eggs: added.eggs });
    return { id: picked.id, eggs: added.eggs };
  }

  /** Applies one roll, pays duplicates in dust, and records the discovery. */
  private grantCostume(roll: CostumeRoll): { duplicate: boolean; dust: number } {
    const claimed = claimCostume(this.costume, roll);
    this.costume = { ...claimed.costume, pity: 0 };
    this.dust += claimed.dust;
    this.learn('costumes', roll.costume.id);
    if (claimed.completed) this.completeWardrobe();
    this.emit({
      type: 'costume',
      id: roll.costume.id,
      duplicate: roll.duplicate,
      dust: claimed.dust,
    });
    return { duplicate: roll.duplicate, dust: claimed.dust };
  }

  private completeWardrobe(): void {
    this.dust += COSTUME_COMPLETE_DUST;
    this.essence += COSTUME_COMPLETE_ESSENCE;
    this.emit({ type: 'wardrobe' });
  }

  private recomputeStats(preserveRatio: boolean): void {
    const previousMax = this.hero.maxHp;
    const ratio = previousMax > 0 ? this.hero.hp / previousMax : 1;
    const stats = this.computeStats();

    this.hero.maxHp = stats.maxHp;
    this.hero.atk = stats.atk;
    this.hero.def = stats.def;
    this.hero.atkSpeed = stats.atkSpeed;
    this.hero.crit = stats.crit;
    this.hero.critDmg = stats.critDmg;
    this.hero.hp = preserveRatio
      ? Math.max(1, Math.min(stats.maxHp, Math.round(ratio * stats.maxHp)))
      : Math.min(this.hero.hp, stats.maxHp);
  }

  /**
   * Stats for one party member. Gear and wardrobe are read from that character,
   * while boost, Ascension, mounts, wings, and skills stay party-wide; the
   * character's own multipliers are applied last.
   */
  private computeStats(
    includeSurge = true,
    member: CharacterId = activeCharacterId(this.party),
  ): HeroStats {
    const who = characterById(member) ?? CHARACTERS[0];
    const base = heroStats(this.level);
    const gear = gearBonuses(this.gear[member]);
    const boost = boostBonuses(this.boosts);
    const passive = passiveBonuses(this.skills);
    const outfit = costumeBonuses(this.costumes[member]);
    const mount = mountBonuses(this.mounts);
    const wing = wingBonuses(this.wings);
    const resonance = refineResonance(this.refine);
    const ascension = this.ascendBonuses;

    const surging = includeSurge && this.surgeTimer > 0;
    const surgeAtk = surging ? SURGE_ATK : 1;
    const surgeSpeed = surging ? SURGE_SPEED : 1;

    const atk =
      (base.atk + gear.atk) *
      (1 +
        gear.atkPct +
        boost.atkPct +
        passive.atkPct +
        outfit.atkPct +
        mount.atkPct +
        wing.atkPct +
        resonance.atkPct +
        ascension.atkPct) *
      this.riftHeroAtk *
      surgeAtk;
    const maxHp = Math.round(
      (base.maxHp + gear.hp) *
        (1 +
          gear.hpPct +
          boost.hpPct +
          passive.hpPct +
          outfit.hpPct +
          mount.hpPct +
          wing.hpPct +
          resonance.hpPct +
          ascension.hpPct) *
        this.riftHeroHp,
    );

    return {
      ...base,
      maxHp: Math.round(maxHp * who.hp),
      atk: Math.round(atk * who.atk * 10) / 10,
      def:
        Math.round(
          (base.def + gear.def) * (1 + outfit.defPct + mount.defPct + wing.defPct) * who.def * 10,
        ) / 10,
      atkSpeed:
        Math.round(
          base.atkSpeed *
            (1 + gear.speed + boost.speedPct + passive.speedPct + outfit.speedPct) *
            surgeSpeed *
            who.atkSpeed *
            1000,
        ) / 1000,
      crit: Math.min(
        BALANCE.heroCritCap,
        base.crit + gear.crit + outfit.crit + resonance.crit + who.crit,
      ),
    };
  }

  /**
   * Makes another party member the one the simulation fights with. The stat
   * block is rebuilt from that member's own gear and wardrobe, so swapping is
   * a real change and not a skin.
   */
  setActiveCharacter(slot: number): boolean {
    if (!Number.isInteger(slot) || slot < 0 || slot >= this.party.slots.length) return false;
    if (!this.party.slots[slot]) return false;
    if (slot === this.party.activeSlot) return true;

    this.rememberHp();
    this.party = { ...this.party, activeSlot: slot };
    const stats = this.computeStats(false);
    // The incoming leader returns with the HP they last had, clamped to their
    // own bar; only a character with no history starts full.
    this.hero = { ...stats, hp: Math.max(1, this.recalledHp(activeCharacterId(this.party), stats.maxHp)) };
    this.refreshParty();
    return true;
  }

  /**
   * Rebuilds the fighting roster from the party slots: everyone but the active
   * member becomes a mate with its own stats, ready to swing. Call it after
   * changing the party in the UI or loading a save.
   */
  refreshParty(): void {
    // Record who is hurt before the roster changes shape: LEAD and party edits
    // must never hand out a free party heal.
    this.rememberHp();

    const active = activeCharacterId(this.party);
    const ids = this.party.slots.filter(
      (id): id is CharacterId => Boolean(id) && id !== active,
    );
    const before = new Map(this.mates.map((mate) => [mate.id, mate]));

    this.mates = ids.map((id) => {
      const stats = this.computeStats(false, id);
      const old = before.get(id);
      const hp = this.recalledHp(id, stats.maxHp);

      return {
        ...stats,
        hp,
        id,
        cd: 1 / Math.max(0.2, stats.atkSpeed),
        // A fresh member waits out its first cooldown, so swapping or loading a
        // save mid-wave never dumps several signatures at once.
        skillCd: old?.skillCd ?? characterById(id)?.skill.cooldown ?? 10,
        // Only a member that was already down stays down; an emptied bar also
        // counts, so nobody stands up just because the roster was rebuilt.
        down: hp <= 0 || (old?.down ?? false),
      };
    });
  }

  /** HP held for each roster member across LEAD and party edits. */
  private rosterHp = new Map<CharacterId, number>();

  /** Captures the live HP of everyone currently fighting. */
  private rememberHp(): void {
    this.rosterHp.set(activeCharacterId(this.party), this.hero.hp);
    for (const mate of this.mates) this.rosterHp.set(mate.id, mate.hp);
  }

  /** Remembered HP for a character, or a full bar the first time they join. */
  private recalledHp(id: CharacterId, maxHp: number): number {
    const remembered = this.rosterHp.get(id);
    return remembered === undefined ? maxHp : Math.min(Math.max(0, remembered), maxHp);
  }

  /** A mate's own swing: no loadout skills, no mount or wing procs. */
  private mateAttack(mate: Mate): void {
    if (this.enemy.hp <= 0) return;

    const info = characterById(mate.id);
    const elemMult = elementMultiplier(info?.element ?? null, this.enemy.element);
    const roll = damageRoll(mate.atk, this.enemy.def, mate.crit, mate.critDmg, this.rng, {
      elemMult,
      elemBonus: 0,
    });

    this.enemy.hp -= roll.damage;
    this.damageMarks.push({ t: this.time, dmg: roll.damage });
    this.emit({
      type: 'hit',
      target: 'enemy',
      damage: roll.damage,
      crit: roll.crit,
      advantage: elemMult > 1 ? 'strong' : elemMult < 1 ? 'weak' : 'neutral',
    });
    // Mates feed the surge meter at half rate, so a full party cannot double
    // the uptime the meter was calibrated against.
    this.addSurgeCharge(roll.damage * 0.5);

    if (this.enemy.hp <= 0) this.killEnemy();
  }

  /**
   * A mate's signature skill: damage and drain scale off that member's own ATK
   * and element, heals land on the whole party, and a shield feeds the same
   * party barrier direct enemy hits chew through before HP.
   */
  private mateCast(mate: Mate, info: SkillInfo): void {
    this.castSignature(
      {
        id: mate.id,
        atk: mate.atk,
        elemBonus: 0,
        hp: mate.hp,
        maxHp: mate.maxHp,
        setHp: (hp) => {
          mate.hp = hp;
        },
      },
      info,
    );
  }

  /**
   * One roster signature, cast the same way by the leader and by every mate:
   * damage and drain scale off the caster's ATK and element, heals land on the
   * whole party, and a shield feeds the party barrier direct hits chew through.
   */
  private castSignature(caster: SignatureCaster, info: SkillInfo): void {
    const element = characterById(caster.id)?.element ?? null;

    if (info.kind === 'damage' || info.kind === 'drain') {
      if (this.enemy.hp <= 0) return;
      const elemMult = elementMultiplier(info.element ?? element, this.enemy.element);
      const bonus =
        info.element && this.attuned.element === info.element ? caster.elemBonus : 0;
      const damage = Math.max(
        1,
        Math.round(caster.atk * (info.multiplier ?? 1) * elemMult * (1 + bonus)),
      );

      this.enemy.hp -= damage;
      this.damageMarks.push({ t: this.time, dmg: damage });
      // Half charge, like a mate's basic swing: signatures must not inflate
      // the surge uptime the meter was calibrated against.
      this.addSurgeCharge(damage * 0.5);
      this.emit({ type: 'skill', name: info.name, kind: info.kind, amount: damage });

      if (info.kind === 'drain') {
        const healed = Math.min(
          caster.maxHp - caster.hp,
          Math.round(damage * (info.drainPct ?? 0)),
        );
        if (healed > 0) caster.setHp(caster.hp + healed);
      }

      if (info.slowPct) {
        this.enemySlowPct = info.slowPct;
        this.enemySlowTimer = info.duration ?? 4;
      }

      if (this.enemy.hp <= 0) this.killEnemy();
      return;
    }

    if (info.kind === 'heal') {
      const share = info.healPct ?? 0.15;
      let healed = Math.min(
        this.hero.maxHp - this.hero.hp,
        Math.round(this.hero.maxHp * share),
      );
      if (healed > 0) this.hero.hp += healed;

      for (const other of this.mates) {
        if (other.down) continue;
        const gain = Math.min(other.maxHp - other.hp, Math.round(other.maxHp * share));
        if (gain <= 0) continue;
        other.hp += gain;
        healed += gain;
      }

      this.emit({ type: 'skill', name: info.name, kind: 'heal', amount: healed });
      return;
    }

    if (info.kind === 'shield') {
      const amount = Math.round(this.hero.maxHp * (info.shieldPct ?? 0.2));
      this.shield = Math.max(this.shield, amount);
      this.shieldTimer = Math.max(this.shieldTimer, info.duration ?? 8);
      this.emit({ type: 'skill', name: info.name, kind: 'shield', amount });
      return;
    }

    this.buffPct = Math.max(this.buffPct, info.buffPct ?? 0.25);
    this.buffTimer = Math.max(this.buffTimer, info.duration ?? 6);
    this.emit({
      type: 'skill',
      name: info.name,
      kind: 'buff',
      amount: Math.round(this.buffPct * 100),
    });
  }

  private isValidItem(item: Item): boolean {
    return (
      typeof item?.id === 'string' &&
      typeof item.name === 'string' &&
      SLOTS.includes(item.slot) &&
      RARITIES.includes(item.rarity) &&
      Number.isFinite(item.atk) &&
      Number.isFinite(item.hp) &&
      Number.isFinite(item.def) &&
      Number.isFinite(item.power) &&
      Number.isFinite(item.salvage)
    );
  }

  /**
   * Builds the wave for the ladder: one monster per party member on a normal
   * wave, a single one for elites, bosses and every side mode. HP and ATK are
   * split by √count so a five-member party faces a wider fight, not five
   * separate full-strength fights.
   */
  private buildPack(): Enemy[] {
    const first = this.buildEnemy();
    if (first.kind !== 'normal') return [first];
    if (this.riftActive || this.duelActive || this.trialActive || this.dungeonActive) {
      return [first];
    }

    const count = Math.min(BALANCE.enemyPackCap, partyMembers(this.party).length);
    if (count <= 1) return [first];

    const share = 1 / Math.sqrt(count);
    const pack = [first];
    for (let i = 1; i < count; i += 1) pack.push(this.buildEnemy());
    for (const enemy of pack) {
      enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * share));
      enemy.hp = enemy.maxHp;
      enemy.atk = Math.max(1, Math.round(enemy.atk * share));
    }
    return pack;
  }

  /** Puts the wave on the field without announcing it; callers emit `spawn`. */
  private spawnPack(delay = 1.1): void {
    this.pack = this.buildPack();
    this.packSize = this.pack.length;
    this.enemy = this.pack[0];
    this.enemyCd = delay;
  }

  /** A hand-built enemy (duel rival, trial boss) always fights alone. */
  private fieldSoloEnemy(enemy: Enemy, delay: number): void {
    this.pack = [enemy];
    this.packSize = 1;
    this.enemy = enemy;
    this.enemyCd = delay;
  }

  private buildEnemy(): Enemy {
    if (this.dungeonActive) return this.buildDungeonEnemy();
    const waveKind = enemyKindForWave(this.wave);
    const identity = pickEnemy(this.stage, this.wave, waveKind);
    this.learn('enemies', identity.name);
    const stats = enemyStats(this.stage, this.wave);
    const rift = this.riftActive;
    const hp = rift ? Math.max(1, Math.round(stats.hp * this.riftEnemyHp)) : stats.hp;

    this.enemySeq += 1;
    return {
      id: this.enemySeq,
      kind: waveKind,
      ...identity,
      hp,
      maxHp: hp,
      atk: rift ? Math.max(1, Math.round(stats.atk * this.riftEnemyAtk)) : stats.atk,
      def: rift ? Math.max(0, Math.round(stats.def * this.riftEnemyDef)) : stats.def,
      atkSpeed: rift
        ? Math.round(stats.atkSpeed * this.riftEnemySpeed * 1000) / 1000
        : stats.atkSpeed,
    };
  }

  /** Dungeon waves reuse the normal enemy identities at the tier's power. */
  private buildDungeonEnemy(): Enemy {
    const tier = dungeonTier(this.dungeonTier ?? '') ?? DUNGEON_TIERS[0];
    const scaling = dungeonScaling(this.dungeonWave);
    const identity = pickEnemy(tier.stage, this.dungeonWave, scaling.kind);
    this.learn('enemies', identity.name);
    const stats = enemyStats(tier.stage, this.dungeonWave);
    const hp = Math.max(1, Math.round(stats.hp * scaling.hp));

    this.enemySeq += 1;
    return {
      id: this.enemySeq,
      kind: scaling.kind,
      ...identity,
      hp,
      maxHp: hp,
      atk: Math.max(1, Math.round(stats.atk * scaling.atk)),
      def: Math.max(0, Math.round(stats.def * scaling.def)),
      atkSpeed: stats.atkSpeed,
    };
  }

  /** Records a discovery once; the input is already a known catalog value. */
  private learn(group: keyof CodexState, value: string): void {
    const found = this.codex[group];
    if (!found.includes(value)) found.push(value);
  }

  private emit(event: SimEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
