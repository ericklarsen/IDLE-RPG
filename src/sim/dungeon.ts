import {
  DUNGEON_SCALE,
  DUNGEON_TICKETS,
  DUNGEON_TICKET_CAP,
  DUNGEON_WAVES,
  SHOP_CRYSTAL_CAP,
  dungeonTier,
  type DungeonTierInfo,
} from '../data/dungeon';
import { rewardFor } from './formulas';
import type { DungeonState, ShopState } from './types';

/**
 * Dungeon and shop bookkeeping.
 *
 * Both reset on the same local day. A dungeon clear pays crystals and the boss
 * gold; tickets are the only gate on entering, and the shop only sells extra
 * tickets and a small crystal allowance, so gold cannot replace the run itself.
 */

export function emptyDungeon(day: string): DungeonState {
  return { day, tickets: DUNGEON_TICKETS };
}

export function emptyShop(day: string): ShopState {
  return { day, tickets: 0, crystals: 0 };
}

export function normalizeDungeon(raw?: Partial<DungeonState> | null, day = ''): DungeonState {
  const tickets = Number(raw?.tickets);
  const cap = DUNGEON_TICKETS + DUNGEON_TICKET_CAP;
  return {
    day: typeof raw?.day === 'string' && raw.day.length > 0 ? raw.day.slice(0, 10) : day,
    tickets: Number.isFinite(tickets)
      ? Math.max(0, Math.min(cap, Math.floor(tickets)))
      : DUNGEON_TICKETS,
  };
}

export function normalizeShop(raw?: Partial<ShopState> | null, day = ''): ShopState {
  const tickets = Number(raw?.tickets);
  const crystals = Number(raw?.crystals);
  return {
    day: typeof raw?.day === 'string' && raw.day.length > 0 ? raw.day.slice(0, 10) : day,
    tickets: Number.isFinite(tickets)
      ? Math.max(0, Math.min(DUNGEON_TICKET_CAP, Math.floor(tickets)))
      : 0,
    crystals: Number.isFinite(crystals)
      ? Math.max(0, Math.min(SHOP_CRYSTAL_CAP, Math.floor(crystals)))
      : 0,
  };
}

/** A new day refills the free tickets and reopens both shop allowances. */
export function dungeonRollover(
  dungeon: DungeonState,
  shop: ShopState,
  day: string,
): { dungeon: DungeonState; shop: ShopState; reset: boolean } {
  if (dungeon.day === day && shop.day === day) return { dungeon, shop, reset: false };
  return {
    dungeon: dungeon.day === day ? dungeon : emptyDungeon(day),
    shop: shop.day === day ? shop : emptyShop(day),
    reset: true,
  };
}

export function ticketsLeft(dungeon: DungeonState): number {
  return Math.max(0, Math.floor(dungeon.tickets));
}

export function ticketPrice(bought: number, farmStage: number): number {
  const base = Math.max(1_500, Math.round(rewardFor(farmStage, 1, 'normal').gold * 6));
  return Math.round(base * Math.pow(1.6, Math.max(0, bought)));
}

export function crystalPrice(farmStage: number): number {
  return Math.max(5_000, Math.round(rewardFor(farmStage, 1, 'normal').gold * 30));
}

/** One bought ticket, priced by how many were already bought today. */
export function buyTicket(
  dungeon: DungeonState,
  shop: ShopState,
  gold: number,
  farmStage: number,
): { dungeon: DungeonState; shop: ShopState; gold: number; cost: number } | null {
  if (shop.tickets >= DUNGEON_TICKET_CAP) return null;

  const cost = ticketPrice(shop.tickets, farmStage);
  if (gold < cost) return null;

  return {
    dungeon: {
      ...dungeon,
      tickets: Math.min(DUNGEON_TICKETS + DUNGEON_TICKET_CAP, dungeon.tickets + 1),
    },
    shop: { ...shop, tickets: shop.tickets + 1 },
    gold: gold - cost,
    cost,
  };
}

/** One crystal, capped per day so the shop is a supplement, not a source. */
export function buyCrystal(
  shop: ShopState,
  gold: number,
  farmStage: number,
): { shop: ShopState; gold: number; cost: number } | null {
  if (shop.crystals >= SHOP_CRYSTAL_CAP) return null;

  const cost = crystalPrice(farmStage);
  if (gold < cost) return null;

  return { shop: { ...shop, crystals: shop.crystals + 1 }, gold: gold - cost, cost };
}

export function tierUnlocked(tier: DungeonTierInfo, farmStage: number): boolean {
  return farmStage >= tier.stage;
}

/** Crystal and gold payout for one clear; the mount roll lives in the battle sim. */
export function dungeonReward(
  tier: DungeonTierInfo,
  rng: () => number,
): { crystals: number; gold: number; exp: number } {
  const { min, max } = tier.crystals;
  const crystals = min + Math.floor(rng() * (max - min + 1));
  // The boss pays at its tier's power, not the player's farm stage, so a
  // high-stage player cannot farm the first tier for inflated gold.
  const boss = rewardFor(tier.stage, DUNGEON_WAVES, 'boss');
  return {
    crystals,
    gold: Math.round(boss.gold * 1.5),
    exp: boss.exp,
  };
}

/** Enemy multipliers for a dungeon wave; the last wave is the boss. */
export function dungeonScaling(wave: number): {
  kind: 'normal' | 'boss';
  hp: number;
  atk: number;
  def: number;
} {
  const boss = wave >= DUNGEON_WAVES;
  return boss
    ? { kind: 'boss', hp: DUNGEON_SCALE.bossHp, atk: DUNGEON_SCALE.bossAtk, def: DUNGEON_SCALE.bossDef }
    : { kind: 'normal', hp: DUNGEON_SCALE.trashHp, atk: DUNGEON_SCALE.trashAtk, def: 1 };
}

export { dungeonTier };
