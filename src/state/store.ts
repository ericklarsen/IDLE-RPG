import { create } from 'zustand';
import type { ForecastReport } from '../sim/forecast';
import type { OfflineReport } from '../sim/offline';
import type {
  ArenaResult,
  BoostBranch,
  DungeonResult,
  Element,
  HudSnapshot,
  ItemSet,
  PetKind,
  Rarity,
  RiftResult,
  Slot,
  TrialResult,
} from '../sim/types';
import { gameController } from './controller';

export interface GameStore extends HudSnapshot {
  log: string[];
  offlineReport: OfflineReport | null;
  riftResult: RiftResult | null;
  duelResult: ArenaResult | null;
  trialResult: TrialResult | null;
  dungeonResult: DungeonResult | null;
  claimOffline: () => void;
  claimEvent: () => void;
  claimLeague: () => void;
  startRift: () => void;
  closeRiftResult: () => void;
  startDuel: (rivalId: string) => boolean;
  startTrial: () => boolean;
  closeTrialResult: () => void;
  closeDuelResult: () => void;
  push: () => void;
  enhanceWeapon: (times?: number) => void;
  enhanceItem: (id: string, times?: number) => void;
  refineItem: (id: string) => void;
  refineToTier: (id: string) => void;
  enhanceAllSlots: () => void;
  toggleSubstatLock: (id: string, index: number) => void;
  enchantItem: (id: string, element: Element) => void;
  upgradeBoost: (branch: BoostBranch) => void;
  upgradePet: (id?: string) => void;
  setActivePet: (id: string | null) => void;
  synthesizePet: (id: string) => void;
  wearPalette: (id: string | null) => void;
  equipMount: (id: string | null) => void;
  upgradeMount: (id: string) => void;
  craftMount: (id: string) => void;
  equipWing: (id: string | null) => void;
  upgradeWing: (id: string) => void;
  craftWing: (id: string) => void;
  cheatGrantMount: (id: string, level?: number) => void;
  cheatGrantWing: (id: string, level?: number) => void;
  cheatGrantResources: (grants: {
    gold?: number;
    crystals?: number;
    dust?: number;
    books?: number;
    cores?: number;
    essence?: number;
  }) => void;
  cheatAddTickets: () => void;
  cheatUnlockStage: (stage: number) => void;
  startDungeon: (tierId: string) => void;
  closeDungeonResult: () => void;
  buyDungeonTicket: () => void;
  buyMountCrystal: () => void;
  forecastBoss: () => ForecastReport;
  respecBoosts: () => void;
  setSkill: (slot: number, id: string | null) => void;
  setPassive: (id: string | null) => void;
  upgradeSkill: (id: string) => void;
  ascend: () => void;
  buyAscendNode: (id: string) => void;
  equipItem: (id: string) => void;
  equipCostume: (id: string | null) => void;
  forgeCostume: (id: string) => void;
  unequip: (slot: Slot) => void;
  salvage: (id: string) => void;
  fuse: (rarity: Rarity) => void;
  craftSetPiece: (slot: Slot, set: ItemSet) => void;
  equipBest: () => void;
  salvageCommons: () => void;
  reset: () => void;
}

const initial = gameController.sim.snapshot();

export const useGameStore = create<GameStore>(() => ({
  ...initial,
  log: gameController.getLog(),
  offlineReport: gameController.getOfflineReport(),
  riftResult: gameController.getRiftResult(),
  duelResult: gameController.getDuelResult(),
  trialResult: gameController.getTrialResult(),
  dungeonResult: gameController.getDungeonResult(),
  claimOffline: () => gameController.claimOffline(),
  claimEvent: () => gameController.claimEvent(),
  claimLeague: () => gameController.claimLeague(),
  startRift: () => gameController.startRift(),
  closeRiftResult: () => gameController.closeRiftResult(),
  startDuel: (rivalId) => gameController.startDuel(rivalId),
  startTrial: () => gameController.startTrial(),
  closeTrialResult: () => gameController.closeTrialResult(),
  closeDuelResult: () => gameController.closeDuelResult(),
  push: () => gameController.push(),
  enhanceWeapon: (times = 1) => gameController.enhanceWeapon(times),
  enhanceItem: (id, times = 1) => gameController.enhanceItem(id, times),
  refineItem: (id) => gameController.refineItem(id),
  refineToTier: (id) => gameController.refineToTier(id),
  enhanceAllSlots: () => gameController.enhanceAllSlots(),
  toggleSubstatLock: (id, index) => gameController.toggleSubstatLock(id, index),
  enchantItem: (id, element) => gameController.enchantItem(id, element),
  upgradeBoost: (branch) => gameController.upgradeBoost(branch),
  upgradePet: (id) => gameController.upgradePet(id as PetKind | undefined),
  setActivePet: (id) => gameController.setActivePet(id as PetKind | null),
  synthesizePet: (id) => gameController.synthesizePet(id as PetKind),
  wearPalette: (id) => gameController.wearPalette(id),
  equipMount: (id) => gameController.equipMount(id),
  upgradeMount: (id) => gameController.upgradeMount(id),
  craftMount: (id) => gameController.craftMount(id),
  equipWing: (id) => gameController.equipWing(id),
  upgradeWing: (id) => gameController.upgradeWing(id),
  craftWing: (id) => gameController.craftWing(id),
  cheatGrantMount: (id, level = 1) => gameController.debugGrantMount(id, level),
  cheatGrantWing: (id, level = 1) => gameController.debugGrantWing(id, level),
  cheatGrantResources: (grants) => gameController.debugGrantResources(grants),
  cheatAddTickets: () => gameController.debugAddTickets(),
  cheatUnlockStage: (stage) => gameController.debugUnlockStage(stage),
  startDungeon: (tierId) => gameController.startDungeon(tierId),
  closeDungeonResult: () => gameController.closeDungeonResult(),
  buyDungeonTicket: () => gameController.buyDungeonTicket(),
  buyMountCrystal: () => gameController.buyMountCrystal(),
  forecastBoss: () => gameController.forecastBoss(),
  respecBoosts: () => gameController.respecBoosts(),
  setSkill: (slot, id) => gameController.setSkill(slot, id),
  setPassive: (id) => gameController.setPassive(id),
  upgradeSkill: (id) => gameController.upgradeSkill(id),
  ascend: () => gameController.ascend(),
  buyAscendNode: (id) => gameController.buyAscendNode(id),
  equipItem: (id) => gameController.equipItem(id),
  equipCostume: (id) => gameController.equipCostume(id),
  forgeCostume: (id) => gameController.forgeCostume(id),
  unequip: (slot) => gameController.unequip(slot),
  salvage: (id) => gameController.salvage(id),
  fuse: (rarity) => gameController.fuse(rarity),
  craftSetPiece: (slot, set) => gameController.craftSetPiece(slot, set),
  equipBest: () => gameController.equipBest(),
  salvageCommons: () => gameController.salvageCommons(),
  reset: () => gameController.reset(),
}));

gameController.subscribe((snapshot, log) => {
  useGameStore.setState({
    ...snapshot,
    log,
    offlineReport: gameController.getOfflineReport(),
    riftResult: gameController.getRiftResult(),
    duelResult: gameController.getDuelResult(),
    trialResult: gameController.getTrialResult(),
    dungeonResult: gameController.getDungeonResult(),
  });
});
