import type { PartyView } from './party';

export type EnemyKind = 'normal' | 'elite' | 'boss';
export type Element = 'fire' | 'ice' | 'lightning' | 'holy' | 'dark';
export type SpriteKey = 'slime' | 'bat' | 'skeleton' | 'goblin' | 'wraith' | 'demon' | 'rival';
export type Slot = 'weapon' | 'helm' | 'armor' | 'boots' | 'ring' | 'amulet';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type ItemSet = 'ashforged' | 'voidbound' | 'oath' | 'emberforged';
export type CostumeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'emerald';
export type SubStatKey = 'atkPct' | 'hpPct' | 'def' | 'crit' | 'speed';
export type BoostBranch = 'offense' | 'defense' | 'fortune' | 'speed' | 'element';
export type Boosts = Record<BoostBranch, number>;
export type Advantage = 'strong' | 'weak' | 'neutral';
export type SkillKind = 'damage' | 'drain' | 'heal' | 'shield' | 'buff';

/** Roster ids; the knight is the starter and always unlocked. */
export type CharacterId = 'knight' | 'ranger' | 'cleric' | 'mage' | 'rogue';

export interface PartyState {
  /** Slot order is battle order: slot 0 stands on the front line. */
  slots: (CharacterId | null)[];
  /** Characters earned so far. */
  unlocked: CharacterId[];
  /** Member whose stats the HUD and the boss tracker report. */
  activeSlot: number;
}

export interface Hero {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  atkSpeed: number;
  crit: number;
  critDmg: number;
}

export interface Enemy {
  id: number;
  name: string;
  kind: EnemyKind;
  sprite: SpriteKey;
  element: Element;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  atkSpeed: number;
  /** True for the arena build currently duelling the hero. */
  rival?: boolean;
}

export interface SubStat {
  key: SubStatKey;
  value: number;
  locked: boolean;
}

export interface SkillLoadout {
  active: (string | null)[];
  passive: string | null;
  levels: Record<string, number>;
}

export interface AscensionState {
  count: number;
  shards: number;
  nodes: Record<string, number>;
}

export interface Rune {
  element: Element;
  value: number;
}

export interface Item {
  id: string;
  slot: Slot;
  rarity: Rarity;
  name: string;
  /** Derived from the item name; null for names outside every set. */
  set?: ItemSet | null;
  level: number;
  atk: number;
  hp: number;
  def: number;
  power: number;
  salvage: number;
  enhance: number;
  pity: number;
  refines: number;
  enchants: number;
  substats: SubStat[];
  runes: (Rune | null)[];
}

export type Equipped = Record<Slot, Item | null>;

/** Refine progress is stored per slot, so swapping gear keeps the investment. */
export interface RefineState {
  /** 0–20; gates the best substat tier an attempt can roll. */
  level: number;
  /** Attempts toward the next level (0 – refineProgress-1). */
  progress: number;
  /** Attempts since the last S-or-better line; forces one at the cap. */
  pity: number;
}

export interface RefineResonance {
  /** Lowest refine level across all six slots. */
  level: number;
  atkPct: number;
  hpPct: number;
  crit: number;
  /** Next threshold (10/15/20), or 0 at max resonance. */
  next: number;
}

export interface RiftModifier {
  id: string;
  label: string;
  desc: string;
  enemyHp?: number;
  enemyAtk?: number;
  enemyAtkSpeed?: number;
  enemyDef?: number;
  heroAtk?: number;
  heroHp?: number;
  chestGold?: number;
}

export interface RiftChest {
  kills: number;
  gold: number;
  essence: number;
  item: boolean;
}

export interface RiftState {
  day: string;
  kills: number;
}

export interface CodexState {
  enemies: string[];
  items: string[];
  modifiers: string[];
  costumes: string[];
  mounts: string[];
  wings: string[];
}

export type PetKind = 'ember' | 'frost' | 'storm';
export type MountId = 'ember-steed' | 'dusk-wolf' | 'frost-stag' | 'storm-gryphon';
export type WingId = 'emberpinions' | 'rimepinions' | 'stormpinions';

export interface MountState {
  level: number;
}

export interface MountsState {
  active: MountId | null;
  owned: Partial<Record<MountId, MountState>>;
}

export interface MountSnapshot {
  id: MountId;
  name: string;
  tier: 1 | 2 | 3;
  element: Element;
  color: string;
  unlocked: boolean;
  level: number;
  maxLevel: number;
  atkPct: number;
  hpPct: number;
  defPct: number;
  skillName: string;
  skillKind: 'damage' | 'heal' | 'shield';
  skillChance: number;
  skillPower: number;
  upgrade: { gold: number; crystals: number };
  craft: { gold: number; crystals: number };
  desc: string;
}

export interface MountsSnapshot {
  active: MountId | null;
  crystals: number;
  mounts: MountSnapshot[];
}

export interface WingState {
  level: number;
}

export interface WingsState {
  active: WingId | null;
  owned: Partial<Record<WingId, WingState>>;
}

export interface WingSnapshot {
  id: WingId;
  name: string;
  tier: 1 | 2 | 3;
  element: Element;
  color: string;
  unlocked: boolean;
  level: number;
  maxLevel: number;
  atkPct: number;
  hpPct: number;
  defPct: number;
  skillName: string;
  skillKind: 'damage' | 'heal' | 'shield';
  skillChance: number;
  skillPower: number;
  upgrade: { gold: number; crystals: number };
  craft: { gold: number; crystals: number; chance: number };
  desc: string;
}

export interface WingsSnapshot {
  active: WingId | null;
  wings: WingSnapshot[];
}

export interface DungeonState {
  day: string;
  tickets: number;
}

export interface ShopState {
  day: string;
  /** Tickets bought today, which also sets the next ticket's price. */
  tickets: number;
  crystals: number;
}

export interface DungeonTierSnapshot {
  id: string;
  name: string;
  stage: number;
  unlocked: boolean;
  mountChance: number;
  wingChance: number;
  crystals: { min: number; max: number };
  color: string;
  desc: string;
  mounts: { id: MountId; name: string; owned: boolean }[];
  wings: { id: WingId; name: string; owned: boolean }[];
}

export interface DungeonSnapshot {
  unlocked: boolean;
  tickets: number;
  maxTickets: number;
  active: boolean;
  tier: string | null;
  wave: number;
  waves: number;
  tiers: DungeonTierSnapshot[];
}

export interface ShopSnapshot {
  unlocked: boolean;
  ticketCap: number;
  ticketsBought: number;
  ticketPrice: number;
  crystalCap: number;
  crystalBought: number;
  crystalPrice: number;
}

export interface DungeonResult {
  win: boolean;
  tier: string;
  tierName: string;
  crystals: number;
  gold: number;
  exp: number;
  mount: MountId | null;
  mountName: string | null;
  wing: WingId | null;
  wingName: string | null;
}

export interface PetState {
  /** 0 means the pet has not been awakened yet. */
  level: number;
  /** Level ceiling; duplicates raise it up to the hard cap. */
  maxLevel: number;
  /** Duplicate eggs waiting to be synthesised. */
  eggs: number;
}

export interface PetsState {
  active: PetKind | null;
  kinds: Partial<Record<PetKind, PetState>>;
}

export interface PaletteState {
  /** Accent currently worn; null keeps the outfit's own colours. */
  worn: string | null;
  /** Palette ids earned so far; milestones never remove one. */
  unlocked: string[];
}

export interface PetSnapshot extends PetState {
  id: PetKind;
  name: string;
  element: Element;
  unlocked: boolean;
  damage: number;
  dps: number;
  cost: number;
  upgradeable: boolean;
  synthable: boolean;
}

export interface PetsSnapshot {
  active: PetKind | null;
  pets: PetSnapshot[];
}

/** Legacy v17 shape, kept only so old saves can migrate. */
export interface CompanionState {
  level: number;
}

export interface RiftResult {
  kills: number;
  chest: RiftChest;
  modifiers: RiftModifier[];
  item: Item | null;
}

export interface ArenaRival {
  id: string;
  name: string;
  element: Element;
  hp: number;
  atk: number;
  def: number;
  atkSpeed: number;
  /** Display-only combined stat so the panel can warn before a fight. */
  power: number;
  label: string;
  build: string;
}

export interface ArenaState {
  day: string;
  tickets: number;
  points: number;
  wins: number;
  losses: number;
  rivals: ArenaRival[];
  fought: string[];
}

export interface TrialRule {
  id: string;
  label: string;
  desc: string;
  hp?: number;
  atk?: number;
  atkSpeed?: number;
  def?: number;
}

export interface TrialState {
  /** Local Monday of the week, e.g. "2026-10-19". */
  key: string;
  /** Highest floor cleared this week (0–10). */
  cleared: number;
  /** Losses left this week; a win never spends one. */
  attempts: number;
}

export interface TrialFloorInfo {
  floor: number;
  name: string;
  element: Element;
  hp: number;
  atk: number;
  def: number;
  atkSpeed: number;
  rules: TrialRule[];
}

export interface TrialSnapshot {
  unlocked: boolean;
  key: string;
  cleared: number;
  /** Floor the player would attempt next (1–10). */
  floor: number;
  maxFloor: number;
  attempts: number;
  maxAttempts: number;
  active: boolean;
  done: boolean;
  endsAt: number;
  next: TrialFloorInfo | null;
}

export interface TrialResult {
  win: boolean;
  floor: number;
  name: string;
  cleared: number;
  attempts: number;
  gold: number;
  dust: number;
  essence: number;
  cores: number;
  cache: boolean;
  item: Item | null;
  /** Costume id found in the floor cache, if any. */
  costume: string | null;
  /** Dust paid instead when the cache rolled an owned costume. */
  costumeDust: number;
  rules: TrialRule[];
}

export interface CostumeState {
  /** Costume ids the player has found; each one is unique. */
  owned: string[];
  equipped: string | null;
  /** Boss kills since the last costume drop, for the guaranteed drop. */
  pity: number;
  /** True once the whole wardrobe paid out its one-time reward. */
  mastered: boolean;
}

export interface LeagueState {
  /** Local Monday of the season, e.g. "2026-10-19". */
  key: string;
  points: number;
  division: number;
  /** Division settled by the last rollover; null when nothing waits to be claimed. */
  rewardDivision: number | null;
  rewardClaimed: boolean;
}

export interface LeagueReward {
  division: number;
  name: string;
  gold: number;
  essence: number;
  cores: number;
  setPiece: boolean;
  /** Gold and Prismatic also carry one duplicate wisp egg. */
  egg: boolean;
  claimed: boolean;
}

export interface LeagueSnapshot {
  key: string;
  division: number;
  divisionName: string;
  /** Season points, reset every Monday. */
  points: number;
  promoteAt: number | null;
  keepAt: number;
  nextName: string | null;
  endsAt: number;
  reward: LeagueReward | null;
}

export interface ArenaSnapshot {
  unlocked: boolean;
  day: string;
  tickets: number;
  maxTickets: number;
  points: number;
  tier: string;
  tierIndex: number;
  nextTier: string | null;
  into: number;
  span: number;
  wins: number;
  losses: number;
  rivals: (ArenaRival & { fought: boolean })[];
  duelActive: boolean;
  league: LeagueSnapshot;
}

export interface ArenaResult {
  win: boolean;
  rival: string;
  element: Element;
  /** Ladder change this duel (negative on a loss). */
  points: number;
  pointsAfter: number;
  rank: string;
  rankUp: boolean;
  gold: number;
  essence: number;
  cores: number;
  tickets: number;
  /** Duplicate wisp egg won at Champion or above, if the roll landed. */
  egg: { id: PetKind; eggs: number } | null;
}

export interface RiftSnapshot {
  unlocked: boolean;
  active: boolean;
  remaining: number;
  kills: number;
  todayDone: boolean;
  lastKills: number;
  modifiers: RiftModifier[];
}

export interface BossTarget {
  stage: number;
  name: string;
  element: Element;
  hp: number;
  dps: number;
  requiredDps: number;
  gapPct: number;
  ready: boolean;
}

export interface EventState {
  key: string;
  bosses: number;
  claimed: boolean;
}

export interface EventSnapshot {
  unlocked: boolean;
  active: boolean;
  key: string;
  bosses: number;
  goal: number;
  claimed: boolean;
  startsAt: number;
  endsAt: number;
}

export interface SaveData {
  version: number;
  level: number;
  exp: number;
  gold: number;
  maxStage: number;
  farmStage?: number;
  stage?: number;
  rift?: RiftState;
  arena?: ArenaState;
  league?: LeagueState;
  trial?: TrialState;
  costume?: Partial<CostumeState>;
  event?: EventState;
  codex?: Partial<CodexState>;
  pets?: Partial<PetsState>;
  mounts?: Partial<MountsState>;
  wings?: Partial<WingsState>;
  refine?: Partial<Record<Slot, Partial<RefineState>>>;
  crystals?: number;
  dungeon?: Partial<DungeonState>;
  shop?: Partial<ShopState>;
  palette?: Partial<PaletteState>;
  /** Legacy single wisp; migrated into `pets` on load. */
  companion?: CompanionState;
  kills: number;
  essence?: number;
  cores?: number;
  books?: number;
  dust?: number;
  boosts?: Partial<Boosts>;
  skills?: Partial<SkillLoadout>;
  ascension?: Partial<AscensionState>;
  inventory?: Item[];
  equipped?: Partial<Equipped>;
  /** v24: party slots and unlocks. */
  party?: PartyState;
  /** v24: gear per character; `equipped` stays as the knight's legacy copy. */
  gear?: Partial<Record<CharacterId, Equipped>>;
  /** v24: wardrobe per character; `costume` stays as the knight's copy. */
  costumes?: Partial<Record<CharacterId, CostumeState>>;
  itemSeq?: number;
  lastSeen?: number;
}

export interface SurgeSnapshot {
  unlocked: boolean;
  active: boolean;
  /** Meter fill 0…1; 1 while the surge is running. */
  charge: number;
  /** Seconds left on the current surge, 0 when idle. */
  remaining: number;
}

export interface HudSnapshot {
  stage: number;
  maxStage: number;
  farmStage: number;
  pushing: boolean;
  canPush: boolean;
  deathsHere: number;
  deathsToRetreat: number;
  target: BossTarget;
  rift: RiftSnapshot;
  surge: SurgeSnapshot;
  arena: ArenaSnapshot;
  trial: TrialSnapshot;
  event: EventSnapshot;
  wave: number;
  kind: EnemyKind;
  enemyName: string;
  enemyHp: number;
  enemyMaxHp: number;
  /** Monsters left in the wave; 1 on a solo run, elites and bosses. */
  enemyCount: number;
  heroHp: number;
  heroMaxHp: number;
  level: number;
  exp: number;
  expToNext: number;
  gold: number;
  costume: CostumeState;
  enhanceLevel: number;
  enhanceCost: number;
  enhanceChance: number;
  hasWeapon: boolean;
  essence: number;
  cores: number;
  heroElement: Element | null;
  elemBonus: number;
  enemyElement: Element;
  boosts: Boosts;
  books: number;
  dust: number;
  skills: SkillLoadout;
  shield: number;
  shards: number;
  ascensions: number;
  ascendNodes: Record<string, number>;
  atk: number;
  dps: number;
  kills: number;
  dead: boolean;
  gearScore: number;
  equipped: Equipped;
  inventory: Item[];
  codex: CodexState;
  pets: PetsSnapshot;
  mounts: MountsSnapshot;
  wings: WingsSnapshot;
  refine: {
    slots: Record<Slot, RefineState>;
    resonance: RefineResonance;
  };
  dungeon: DungeonSnapshot;
  shop: ShopSnapshot;
  palette: PaletteState;
  /** Live roster for the battle HUD: active member first, then the rest. */
  party: PartyView;
}

export type SimEvent =
  | {
      type: 'hit';
      target: 'enemy' | 'hero';
      damage: number;
      crit: boolean;
      advantage?: Advantage;
    }
  | { type: 'companionHit'; damage: number }
  | { type: 'burn'; damage: number }
  | { type: 'kill'; name: string; kind: EnemyKind; gold: number; exp: number }
  | { type: 'levelup'; level: number }
  | { type: 'stageup'; stage: number }
  | { type: 'retreat'; stage: number }
  | { type: 'push'; stage: number }
  | { type: 'duelstart'; rival: ArenaRival }
  | { type: 'duelend'; result: ArenaResult }
  | { type: 'duelcancel' }
  | { type: 'rivalSkill'; name: string; element: Element; damage: number }
  | { type: 'costume'; id: string; duplicate: boolean; dust: number }
  | { type: 'outfit'; id: string | null }
  | { type: 'wardrobe' }
  | { type: 'trialstart'; floor: number; name: string; rules: TrialRule[] }
  | { type: 'trialend'; result: TrialResult }
  | { type: 'trialcancel' }
  | { type: 'riftstart'; modifiers: RiftModifier[] }
  | {
      type: 'riftend';
      kills: number;
      chest: RiftChest;
      modifiers: RiftModifier[];
      item: Item | null;
    }
  | { type: 'death' }
  | { type: 'revive' }
  | { type: 'enhance'; level: number }
  /** `next` marks the next monster of the same wave stepping up, not a new wave. */
  | { type: 'spawn'; enemy: Enemy; next?: boolean }
  | { type: 'loot'; item: Item; autoSalvaged: boolean }
  | { type: 'resource'; essence: number; cores: number; books: number }
  | {
      type: 'skill';
      name: string;
      kind: 'damage' | 'drain' | 'heal' | 'shield' | 'buff';
      amount: number;
    }
  | { type: 'surge'; phase: 'start' | 'end' }
  | { type: 'ascend'; stage: number; shards: number }
  | { type: 'pet'; id: PetKind; level: number }
  | { type: 'petEgg'; id: PetKind; eggs: number }
  | { type: 'petSynth'; id: PetKind; maxLevel: number }
  | { type: 'palette'; id: string; earned?: boolean }
  | { type: 'mount'; id: MountId | null; level: number }
  | { type: 'mountSkill'; name: string; kind: 'damage' | 'heal' | 'shield'; amount: number }
  | { type: 'wing'; id: WingId | null; level: number }
  | { type: 'wingSkill'; name: string; kind: 'damage' | 'heal' | 'shield'; amount: number }
  | { type: 'dungeonstart'; tier: string }
  | { type: 'dungeonend'; result: DungeonResult };
