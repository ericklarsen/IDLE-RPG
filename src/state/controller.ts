import { ascendNodeById } from '../data/ascension';
import { BALANCE } from '../data/balance';
import { BOOST_BRANCHES } from '../data/boost';
import { PET_MAX_CAP, petById } from '../data/pets';
import { paletteById } from '../data/palettes';
import { mountById } from '../data/mounts';
import { wingById } from '../data/wings';
import { dungeonTier } from '../data/dungeon';
import { COSTUME_TIERS, costumeById } from '../data/costumes';
import { DUST_BY_RARITY, FORGE_COST } from '../data/forge';
import { ELEMENT_LABEL } from '../data/elements';
import { RARITY, SLOT_LABEL } from '../data/items';
import { skillById } from '../data/skills';
import { ARENA_UNLOCK_STAGE } from '../sim/arena';
import { BattleSim } from '../sim/battle';
import { forecastNextBoss, type ForecastReport } from '../sim/forecast';
import type { OfflineReport } from '../sim/offline';
import { eventWindow } from '../sim/event';
import { RIFT_UNLOCK_STAGE, dayKey, riftModifiers } from '../sim/rift';
import { TRIAL_UNLOCK_STAGE } from '../sim/trial';
import type {
  ArenaResult,
  BoostBranch,
  DungeonResult,
  Element,
  HudSnapshot,
  ItemSet,
  Rarity,
  RiftResult,
  PetKind,
  SimEvent,
  Slot,
  TrialResult,
} from '../sim/types';
import { substatText } from '../sim/upgrade';
import { clearSave, loadSave, writeSave } from './save';
import { setPartySlot } from '../sim/party';
import type { CharacterId } from '../sim/types';

type Listener = (snapshot: HudSnapshot, log: string[]) => void;

class GameController {
  readonly sim: BattleSim;
  private listeners = new Set<Listener>();
  private log: string[] = ['The forge awakens. Your knight fights on.'];
  private publishTimer = 0;
  private saveTimer = 0;
  private pendingOffline: OfflineReport | null = null;
  private pendingRift: RiftResult | null = null;
  private pendingDuel: ArenaResult | null = null;
  private pendingTrial: TrialResult | null = null;
  private pendingDungeon: DungeonResult | null = null;
  private pendingSince: number | null = null;
  private hiddenAt = 0;
  private eventTimer = 0;
  private resetting = false;

  constructor() {
    const save = loadSave();
    this.sim = new BattleSim(save);
    this.sim.on((event) => this.handleEvent(event));
    this.refreshEvent();

    const lastSeen = save?.lastSeen ?? 0;
    if (lastSeen > 0) {
      const gap = Date.now() - lastSeen;
      if (gap >= BALANCE.offlineMinSeconds * 1000) {
        const report = this.sim.estimateOffline(gap);
        if (report) {
          this.pendingOffline = report;
          this.pendingSince = lastSeen;
        }
      }
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.sim.snapshot(), [...this.log]);
    return () => this.listeners.delete(listener);
  }

  tick(dt: number): void {
    if (this.pendingOffline || this.pendingRift || this.pendingDuel || this.pendingTrial) return;
    this.sim.tick(dt);
    this.publishTimer += dt;
    this.saveTimer += dt;

    if (this.publishTimer >= 0.1) {
      this.publishTimer = 0;
      this.publish();
    }
    if (this.saveTimer >= 5) {
      this.saveTimer = 0;
      this.flushSave();
    }
    // Cheap enough to poll: the window only moves at local midnight.
    this.eventTimer += dt;
    if (this.eventTimer >= 30) {
      this.eventTimer = 0;
      this.refreshEvent();
    }
  }

  private refreshEvent(): void {
    const window = eventWindow();
    this.sim.setEvent(window.active, window.key, window.startsAt, window.endsAt);
  }

  claimEvent(): void {
    const result = this.sim.claimEvent();
    if (result.ok && result.item) {
      this.pushLog(`Emberfall cache opened: ${result.item.name}.`);
    } else if (result.reason === 'progress') {
      this.pushLog('Emberfall cache is not ready yet.');
    } else if (result.reason === 'claimed') {
      this.pushLog('Emberfall cache already claimed this week.');
    }
    if (result.ok) this.flushSave();
    this.publish();
  }

  claimLeague(): void {
    const result = this.sim.claimLeague();
    if (result.ok && result.reward) {
      const item = result.item ? ` · ${result.item.name}` : '';
      this.pushLog(
        `League crate (${result.reward.name}): +${result.reward.gold}g · +${result.reward.essence} essence · +${result.reward.cores} cores${item}.`,
      );
    } else if (result.reason === 'none') {
      this.pushLog('No league crate is waiting. Play a few duels this week.');
    } else if (result.reason === 'claimed') {
      this.pushLog('This league crate was already claimed.');
    } else if (result.reason === 'locked') {
      this.pushLog(`Clear stage ${ARENA_UNLOCK_STAGE} to unlock the arena.`);
    }
    if (result.ok) this.flushSave();
    this.publish();
  }

  /** Puts a character into a party slot (or clears it) and rebuilds the roster. */
  slotCharacter(slot: number, id: CharacterId | null): void {
    const next = setPartySlot(this.sim.party, slot, id);
    if (!next) return;
    this.sim.party = next;
    this.sim.refreshParty();
    this.sim.setActiveCharacter(next.activeSlot);
    this.publish();
  }

  /** Makes a filled slot the character the simulation actually fights with. */
  setActiveSlot(slot: number): void {
    if (!this.sim.setActiveCharacter(slot)) return;
    this.publish();
  }

  enhanceWeapon(times = 1): void {
    const weapon = this.sim.weapon;
    if (!weapon) {
      this.pushLog('Equip a weapon before enhancing.');
      this.publish();
      return;
    }
    this.enhanceItem(weapon.id, times);
  }

  enhanceItem(itemId: string, times = 1): void {
    const item = this.sim.findItem(itemId);
    if (!item) return;
    const name = item.name;
    const outcome = this.sim.enhanceItem(itemId, times);

    if (outcome.attempts === 0) {
      this.pushLog(
        outcome.reason === 'gold'
          ? 'Not enough gold to enhance.'
          : outcome.reason === 'max'
            ? `${name} is already at +${outcome.level}.`
            : 'That item is gone.',
      );
      this.publish();
      return;
    }

    if (outcome.successes > 0) {
      const failed = outcome.attempts - outcome.successes;
      this.pushLog(
        `${name} enhanced to +${outcome.level}${failed > 0 ? ` (${failed} failed)` : ''}.`,
      );
    } else {
      this.pushLog(
        `Enhance failed. Pity ${item.pity} — next try ${Math.round(outcome.chance * 100)}%.`,
      );
    }

    this.flushSave();
    this.publish();
  }

  refineItem(itemId: string): void {
    const item = this.sim.findItem(itemId);
    if (!item) return;
    const outcome = this.sim.refineItem(itemId);

    if (!outcome.ok) {
      this.pushLog(
        outcome.reason === 'gold'
          ? 'Not enough gold to refine.'
          : outcome.reason === 'locked'
            ? 'All substats are locked — unlock one first.'
            : 'That item is gone.',
      );
      this.publish();
      return;
    }

    const rolls = item.substats.map((sub) => substatText(sub)).join(', ');
    const level = outcome.leveled
      ? `LV ${outcome.level} ↑`
      : `LV ${outcome.level} (${outcome.progress}/10)`;
    this.pushLog(
      `Refined ${item.name}: ${rolls} · ${level}${outcome.forced ? ' · PITY' : ''}.`,
    );
    this.flushSave();
    this.publish();
  }

  enhanceAllSlots(): void {
    const result = this.sim.enhanceAllTo(BALANCE.enhanceGuaranteed);
    if (result.levels === 0) {
      this.pushLog(
        result.reason === 'gold'
          ? 'Not enough gold to enhance.'
          : `Every equipped slot is already +${BALANCE.enhanceGuaranteed}.`,
      );
      this.publish();
      return;
    }

    this.pushLog(
      `Auto-enhance: ${result.items} item(s) to +${BALANCE.enhanceGuaranteed} · ${result.cost}g` +
        (result.reason === 'gold' ? ' · out of gold' : ''),
    );
    this.flushSave();
    this.publish();
  }

  refineToTier(itemId: string): void {
    const item = this.sim.findItem(itemId);
    if (!item) return;

    const outcome = this.sim.refineToTier(itemId, 'A');
    if (outcome.rolls === 0) {
      this.pushLog(
        outcome.reason === 'locked'
          ? 'All substats are locked.'
          : outcome.reason === 'gold'
            ? 'Not enough gold to refine.'
            : outcome.reason === 'cap'
              ? 'Tier A needs REFINE LV 4 on that slot.'
              : 'Substats are already tier A or better.',
      );
      this.publish();
      return;
    }

    const suffix = outcome.reached
      ? 'tier A reached'
      : outcome.reason === 'gold'
        ? 'out of gold'
        : 'roll limit hit';
    this.pushLog(
      `Auto-refine ${item.name}: ${outcome.rolls} roll(s) · ${outcome.cost}g · REFINE LV ${outcome.level} · ${suffix}.`,
    );
    this.flushSave();
    this.publish();
  }

  toggleSubstatLock(itemId: string, index: number): void {
    if (!this.sim.toggleSubstatLock(itemId, index)) return;
    this.flushSave();
    this.publish();
  }

  enchantItem(itemId: string, element: Element): void {
    const item = this.sim.findItem(itemId);
    if (!item) return;
    const outcome = this.sim.enchantItem(itemId, element);

    if (!outcome.ok) {
      this.pushLog(
        outcome.reason === 'essence'
          ? `Need ${outcome.cost} essence to enchant.`
          : 'Cannot enchant this item.',
      );
      this.publish();
      return;
    }

    this.pushLog(
      `${item.name}: ${ELEMENT_LABEL[element]} rune +${((outcome.rune?.value ?? 0) * 100).toFixed(1)}% socketed.`,
    );
    this.flushSave();
    this.publish();
  }

  upgradeBoost(branch: BoostBranch): void {
    const outcome = this.sim.upgradeBoost(branch);
    const label = BOOST_BRANCHES[branch].label;

    if (!outcome.ok) {
      this.pushLog(
        outcome.reason === 'cores' ? 'Not enough Boss Cores.' : `${label} is at max rank.`,
      );
      this.publish();
      return;
    }

    this.pushLog(`${label} boost rank ${outcome.level}.`);
    this.flushSave();
    this.publish();
  }

  forecastBoss(): ForecastReport {
    return forecastNextBoss(this.sim);
  }

  upgradePet(id = this.sim.pets.active): void {
    const info = petById(id);
    const level = id ? (this.sim.pets.kinds[id]?.level ?? 0) : 0;
    const outcome = this.sim.upgradePet(id);
    if (!outcome.ok) {
      this.pushLog(
        outcome.reason === 'gold'
          ? `Need ◆${outcome.cost} to train ${info?.name ?? 'this pet'}.`
          : outcome.reason === 'stage'
            ? `Clear stage ${info?.unlockStage ?? 20} to awaken ${info?.name ?? 'this pet'}.`
            : level >= (id ? (this.sim.pets.kinds[id]?.maxLevel ?? 0) : 0) &&
                (id ? (this.sim.pets.kinds[id]?.eggs ?? 0) : 0) > 0
              ? `${info?.name ?? 'Pet'} is at its ceiling — synthesise an egg to raise it.`
              : `${info?.name ?? 'Pet'} is at max level.`,
      );
      this.publish();
      return;
    }

    this.pushLog(`${info?.name ?? 'Pet'} level ${outcome.level} · ◆${outcome.cost}.`);
    this.flushSave();
    this.publish();
  }

  setActivePet(id: PetKind | null): void {
    if (!this.sim.setActivePet(id)) return;
    const info = petById(id);
    this.pushLog(info ? `${info.name} takes the field.` : 'The wisp rests.');
    this.flushSave();
    this.publish();
  }

  equipMount(id: string | null): void {
    if (!this.sim.equipMount(id)) {
      this.pushLog('That mount is not in the stable yet.');
      this.publish();
      return;
    }

    const info = mountById(id);
    this.pushLog(info ? `${info.name} answers the saddle.` : 'The mount returns to the stable.');
    this.flushSave();
    this.publish();
  }

  upgradeMount(id: string): void {
    const info = mountById(id);
    const outcome = this.sim.upgradeMount(id);
    if (!outcome.ok) {
      this.pushLog(
        outcome.reason === 'gold'
          ? `Need ◆${outcome.cost.gold} to train ${info?.name ?? 'this mount'}.`
          : outcome.reason === 'crystals'
            ? `Need ${outcome.cost.crystals} mount crystals to train ${info?.name ?? 'this mount'}.`
            : outcome.reason === 'max'
              ? `${info?.name ?? 'Mount'} is at max level.`
              : 'That mount is not in the stable yet.',
      );
      this.publish();
      return;
    }

    this.pushLog(`${info?.name ?? 'Mount'} level ${outcome.level} · ◆${outcome.cost.gold} · ${outcome.cost.crystals} crystals.`);
    this.flushSave();
    this.publish();
  }

  craftMount(id: string): void {
    const info = mountById(id);
    const outcome = this.sim.craftMount(id);
    if (!outcome.ok) {
      this.pushLog(
        outcome.reason === 'gold'
          ? `Need ◆${outcome.cost.gold} to craft ${info?.name ?? 'this mount'}.`
          : outcome.reason === 'crystals'
            ? `Need ${outcome.cost.crystals} mount crystals to craft ${info?.name ?? 'this mount'}.`
            : `${info?.name ?? 'That mount'} is already in the stable.`,
      );
      this.publish();
      return;
    }

    this.pushLog(`${info?.name ?? 'Mount'} crafted · ◆${outcome.cost.gold} · ${outcome.cost.crystals} crystals.`);
    this.flushSave();
    this.publish();
  }

  equipWing(id: string | null): void {
    if (!this.sim.equipWing(id)) {
      this.pushLog('Those wings are not in the vault yet.');
      this.publish();
      return;
    }

    const info = wingById(id);
    this.pushLog(info ? `${info.name} unfold behind the knight.` : 'The wings fold away.');
    this.flushSave();
    this.publish();
  }

  upgradeWing(id: string): void {
    const info = wingById(id);
    const outcome = this.sim.upgradeWing(id);
    if (!outcome.ok) {
      this.pushLog(
        outcome.reason === 'gold'
          ? `Need ◆${outcome.cost.gold} to temper ${info?.name ?? 'these wings'}.`
          : outcome.reason === 'crystals'
            ? `Need ◈${outcome.cost.crystals} crystals to temper ${info?.name ?? 'these wings'}.`
            : outcome.reason === 'max'
              ? `${info?.name ?? 'Wings'} are at max level.`
              : 'Those wings are not in the vault yet.',
      );
      this.publish();
      return;
    }

    this.pushLog(
      `${info?.name ?? 'Wings'} level ${outcome.level} · ◆${outcome.cost.gold} · ◈${outcome.cost.crystals} crystals.`,
    );
    this.flushSave();
    this.publish();
  }

  craftWing(id: string): void {
    const info = wingById(id);
    const outcome = this.sim.craftWing(id);
    if (outcome.ok) {
      this.pushLog(
        `${info?.name ?? 'Wings'} crafted · ◆${outcome.cost.gold} · ◈${outcome.cost.crystals} crystals.`,
      );
    } else if (outcome.reason === 'failed') {
      this.pushLog(
        `${info?.name ?? 'Wings'} slipped away · ◆${outcome.cost.gold} lost, ◈${outcome.refund} crystals reclaimed.`,
      );
    } else {
      this.pushLog(
        outcome.reason === 'gold'
          ? `Need ◆${outcome.cost.gold} to craft ${info?.name ?? 'these wings'}.`
          : outcome.reason === 'crystals'
            ? `Need ◈${outcome.cost.crystals} crystals to craft ${info?.name ?? 'these wings'}.`
            : `${info?.name ?? 'Those wings'} are already in the vault.`,
      );
    }

    if (outcome.ok || outcome.reason === 'failed') this.flushSave();
    this.publish();
  }

  /** Test-only commands behind the floating cheat panel. */
  debugGrantMount(id: string, level = 1): void {
    const info = mountById(id);
    const granted = this.sim.debugGrantMount(id, level);
    if (!info || granted === null) {
      this.pushLog('Cheat: unknown mount id.');
      this.publish();
      return;
    }

    this.pushLog(`Cheat: ${info.name} set to level ${granted}.`);
    this.flushSave();
    this.publish();
  }

  debugGrantWing(id: string, level = 1): void {
    const info = wingById(id);
    const granted = this.sim.debugGrantWing(id, level);
    if (!info || granted === null) {
      this.pushLog('Cheat: unknown wing id.');
      this.publish();
      return;
    }

    this.pushLog(`Cheat: ${info.name} set to level ${granted}.`);
    this.flushSave();
    this.publish();
  }

  debugGrantResources(grants: {
    gold?: number;
    crystals?: number;
    dust?: number;
    books?: number;
    cores?: number;
    essence?: number;
  }): void {
    this.sim.debugGrantResources(grants);
    this.flushSave();
    this.publish();
  }

  debugAddTickets(): void {
    const tickets = this.sim.debugAddTickets(5);
    this.pushLog(`Cheat: dungeon tickets at ${tickets}.`);
    this.flushSave();
    this.publish();
  }

  debugUnlockStage(stage: number): void {
    if (!this.sim.debugUnlockStage(stage)) {
      this.pushLog('Cheat: finish the current run before jumping stages.');
      this.publish();
      return;
    }

    this.pushLog(`Cheat: stage ${this.sim.farmStage} unlocked.`);
    this.flushSave();
    this.publish();
  }

  startDungeon(tierId: string): void {
    const result = this.sim.startDungeon(tierId);
    if (!result.ok) {
      const tier = dungeonTier(tierId);
      this.pushLog(
        result.reason === 'tickets'
          ? 'No dungeon tickets left — buy more in the shop.'
          : result.reason === 'tier'
            ? `Clear stage ${tier?.stage ?? 30} to open ${tier?.name ?? 'this dungeon'}.`
            : result.reason === 'down'
              ? 'The knight is still recovering.'
              : result.reason === 'busy'
                ? 'Finish the current run-mode first.'
                : result.reason === 'active'
                  ? 'A dungeon run is already open.'
                  : 'That dungeon is still locked.',
      );
    }
    this.publish();
  }

  buyDungeonTicket(): void {
    const outcome = this.sim.buyDungeonTicket();
    this.pushLog(
      outcome.ok
        ? `Dungeon ticket bought · ◆${outcome.cost}.`
        : outcome.reason === 'cap'
          ? 'Today’s ticket purchases are used up.'
          : outcome.reason === 'gold'
            ? `Need ◆${outcome.cost} for another ticket.`
            : 'The shop opens at stage 30.',
    );
    if (outcome.ok) this.flushSave();
    this.publish();
  }

  buyMountCrystal(): void {
    const outcome = this.sim.buyMountCrystal();
    this.pushLog(
      outcome.ok
        ? `Mount crystal bought · ◆${outcome.cost}.`
        : outcome.reason === 'cap'
          ? 'Today’s crystal allowance is used up.'
          : outcome.reason === 'gold'
            ? `Need ◆${outcome.cost} for a crystal.`
            : 'The shop opens at stage 30.',
    );
    if (outcome.ok) this.flushSave();
    this.publish();
  }

  getDungeonResult(): DungeonResult | null {
    return this.pendingDungeon;
  }

  closeDungeonResult(): void {
    if (!this.pendingDungeon) return;
    this.pendingDungeon = null;
    this.publish();
  }

  wearPalette(id: string | null): void {
    if (!this.sim.wearPalette(id)) {
      this.pushLog('That palette is still locked.');
      this.publish();
      return;
    }

    const info = paletteById(id);
    this.pushLog(info ? `Palette: ${info.name}.` : 'Palette removed.');
    this.flushSave();
    this.publish();
  }

  synthesizePet(id: PetKind): void {
    const info = petById(id);
    const result = this.sim.synthesizePet(id);
    if (!result.ok) {
      this.pushLog(
        (this.sim.pets.kinds[id]?.maxLevel ?? 0) >= PET_MAX_CAP
          ? `${info?.name ?? 'Pet'} is already at its ceiling.`
          : `No egg for ${info?.name ?? 'this pet'} yet.`,
      );
      this.publish();
      return;
    }

    this.pushLog(`${info?.name ?? 'Pet'} ceiling raised to level ${result.maxLevel}.`);
    this.flushSave();
    this.publish();
  }

  respecBoosts(): void {
    const refund = this.sim.respecBoosts();
    this.pushLog(refund > 0 ? `Boost reset. ${refund} cores refunded.` : 'No boosts to reset.');
    if (refund > 0) this.flushSave();
    this.publish();
  }

  startRift(): void {
    const day = dayKey();
    const result = this.sim.startRift(day, riftModifiers(day));

    if (!result.ok) {
      this.pushLog(
        result.reason === 'locked'
          ? `Clear stage ${RIFT_UNLOCK_STAGE} to unlock the rift.`
          : result.reason === 'done'
            ? "Today's rift is already done."
            : 'The rift is already open.',
      );
    }

    this.publish();
  }

  /** Returns false when the duel could not start, so the sheet stays open. */
  startDuel(rivalId: string): boolean {
    const result = this.sim.startDuel(rivalId);
    if (!result.ok) {
      this.pushLog(
        result.reason === 'locked'
          ? `Clear stage ${ARENA_UNLOCK_STAGE} to unlock the arena.`
          : result.reason === 'tickets'
            ? 'No arena tickets left today.'
            : result.reason === 'fought'
              ? 'That rival was already fought today.'
              : result.reason === 'busy'
                ? 'Finish the rift first.'
                : result.reason === 'down'
                  ? 'The knight is still recovering.'
                  : result.reason === 'active'
                  ? 'A duel is already running.'
                  : 'That rival is gone.',
      );
      this.publish();
      return false;
    }

    this.publish();
    return true;
  }

  /** Returns false when the floor could not be entered, so the page stays put. */
  startTrial(): boolean {
    const result = this.sim.startTrial();
    if (!result.ok) {
      this.pushLog(
        result.reason === 'locked'
          ? `Clear stage ${TRIAL_UNLOCK_STAGE} to unlock the trial tower.`
          : result.reason === 'done'
            ? 'The tower is cleared this week.'
            : result.reason === 'attempts'
              ? 'No retries left — the tower reopens on Monday.'
              : result.reason === 'down'
                ? 'The knight is still recovering.'
                : result.reason === 'busy'
                  ? 'Finish the rift or duel first.'
                  : 'A tower floor is already running.',
      );
      this.publish();
      return false;
    }

    this.publish();
    return true;
  }

  getTrialResult(): TrialResult | null {
    return this.pendingTrial;
  }

  closeTrialResult(): void {
    if (!this.pendingTrial) return;
    this.pendingTrial = null;
    this.publish();
  }

  getDuelResult(): ArenaResult | null {
    return this.pendingDuel;
  }

  closeDuelResult(): void {
    if (!this.pendingDuel) return;
    this.pendingDuel = null;
    this.publish();
  }

  getRiftResult(): RiftResult | null {
    return this.pendingRift;
  }

  closeRiftResult(): void {
    if (!this.pendingRift) return;
    this.pushLog(`Rift closed · ${this.pendingRift.chest.kills} kills.`);
    this.pendingRift = null;
    this.publish();
  }

  push(): void {
    const result = this.sim.push();
    if (!result.ok) {
      if (result.reason === 'dead') this.pushLog('The knight is still recovering.');
      this.publish();
      return;
    }

    this.flushSave();
    this.publish();
  }

  ascend(): void {
    const result = this.sim.ascend();
    if (!result.ok) {
      this.pushLog(
        result.reason === 'rift'
          ? 'Finish the rift first.'
          : `Clear stage ${BALANCE.ascendStage} before ascending.`,
      );
      this.publish();
      return;
    }

    this.pushLog(
      `Ascended · +${result.shards} shards · run ${this.sim.ascension.count} starts at stage ${result.stage}.`,
    );
    this.flushSave();
    this.publish();
  }

  buyAscendNode(nodeId: string): void {
    const info = ascendNodeById(nodeId);
    if (!info) return;

    const outcome = this.sim.buyAscendNode(nodeId);
    if (!outcome.ok) {
      this.pushLog(
        outcome.reason === 'shards'
          ? `Need ${outcome.cost} Star Shards.`
          : `${info.label} is at max rank.`,
      );
      this.publish();
      return;
    }

    this.pushLog(`${info.label} rank ${outcome.level}.`);
    this.flushSave();
    this.publish();
  }

  setSkill(slot: number, skillId: string | null): void {
    if (!this.sim.setSkill(slot, skillId)) return;
    const info = skillById(skillId);
    this.pushLog(info ? `Slot ${slot + 1}: ${info.name}.` : `Slot ${slot + 1} cleared.`);
    this.flushSave();
    this.publish();
  }

  setPassive(skillId: string | null): void {
    if (!this.sim.setPassive(skillId)) return;
    const info = skillById(skillId);
    this.pushLog(info ? `Passive: ${info.name}.` : 'Passive slot cleared.');
    this.flushSave();
    this.publish();
  }

  upgradeSkill(skillId: string): void {
    const info = skillById(skillId);
    if (!info) return;

    const outcome = this.sim.upgradeSkill(skillId);
    if (!outcome.ok) {
      this.pushLog(
        outcome.reason === 'books'
          ? `Need ${outcome.cost} skill book(s).`
          : `${info.name} is at max level.`,
      );
      this.publish();
      return;
    }

    this.pushLog(`${info.name} is now level ${outcome.level}.`);
    this.flushSave();
    this.publish();
  }

  equipItem(itemId: string): void {
    const item = this.sim.inventory.find((entry) => entry.id === itemId);
    if (!item || !this.sim.equip(itemId)) return;
    this.pushLog(`Equipped ${item.name}.`);
    this.flushSave();
    this.publish();
  }

  unequip(slot: Slot): void {
    const item = this.sim.equipped[slot];
    if (!item) return;
    if (!this.sim.unequip(slot)) {
      this.pushLog('Bag is full. Salvage something first.');
      this.publish();
      return;
    }
    this.pushLog(`Unequipped ${item.name}.`);
    this.flushSave();
    this.publish();
  }

  forgeCostume(costumeId: string): void {
    const info = costumeById(costumeId);
    if (!info) return;

    const result = this.sim.forgeCostume(costumeId);
    if (!result.ok) {
      const quote = COSTUME_TIERS[info.tier].forge;
      this.pushLog(
        result.reason === 'owned'
          ? `${info.name} is already in the wardrobe.`
          : result.reason === 'dust'
            ? `Need ${quote.dust} dust to forge ${info.name}.`
            : `Need ${quote.essence} essence to forge ${info.name}.`,
      );
      this.publish();
      return;
    }

    this.pushLog(`Forged ${info.name} (${info.tier}).`);
    this.flushSave();
    this.publish();
  }

  equipCostume(costumeId: string | null): void {
    const info = costumeById(costumeId);
    if (!this.sim.equipCostume(costumeId)) return;
    this.pushLog(info ? `Wearing ${info.name}.` : 'Costume removed.');
    this.flushSave();
    this.publish();
  }

  salvage(itemId: string): void {
    const item = this.sim.salvage(itemId);
    if (!item) return;
    this.pushLog(`Salvaged ${item.name}  +${item.salvage}g  +${DUST_BY_RARITY[item.rarity]} dust.`);
    this.flushSave();
    this.publish();
  }

  equipBest(): void {
    const count = this.sim.equipBest();
    this.pushLog(count > 0 ? `Equipped ${count} upgrade(s).` : 'No better gear found.');
    if (count > 0) this.flushSave();
    this.publish();
  }

  salvageCommons(): void {
    const result = this.sim.salvageCommons();
    this.pushLog(
      result.count > 0
        ? `Salvaged ${result.count} common item(s)  +${result.gold}g  +${result.dust} dust.`
        : 'No common items to salvage.',
    );
    if (result.count > 0) this.flushSave();
    this.publish();
  }

  fuse(rarity: Rarity): void {
    const result = this.sim.fuse(rarity);
    if (result.ok && result.item) {
      this.pushLog(
        `Fused ${result.consumed?.length ?? 0} ${RARITY[rarity].label} items into ` +
          `${result.item.name} (${RARITY[result.item.rarity].label}).`,
      );
      this.flushSave();
    } else {
      this.pushLog(
        result.reason === 'items'
          ? `Need 3 ${RARITY[rarity].label} items in the bag to fuse.`
          : 'Mythic is the highest rarity.',
      );
    }
    this.publish();
  }

  craftSetPiece(slot: Slot, set: ItemSet): void {
    const result = this.sim.craftSetPiece(slot, set);
    if (result.ok && result.item) {
      this.pushLog(`Crafted ${result.item.name} — Epic ${SLOT_LABEL[result.item.slot]}.`);
      this.flushSave();
    } else {
      this.pushLog(
        result.reason === 'dust'
          ? `Need ${FORGE_COST.dust} dust to craft a set piece.`
          : result.reason === 'essence'
            ? `Need ${FORGE_COST.essence} essence to craft a set piece.`
            : 'Discover that set before crafting it.',
      );
    }
    this.publish();
  }

  handleHidden(): void {
    if (this.sim.dungeonActive) {
      this.sim.cancelDungeon();
      this.pushLog('Dungeon abandoned — ticket spent.');
      this.publish();
    }

    if (this.sim.trialActive) {
      this.sim.cancelTrial();
      this.pushLog('Tower climbed down — no retry spent.');
      this.publish();
    }

    if (this.sim.duelActive) {
      this.sim.cancelDuel();
      this.pushLog('Duel abandoned — the arena waits.');
      this.publish();
    }

    if (this.sim.riftActive) {
      const kills = this.sim.cancelRift();
      this.pushLog(`Rift abandoned after ${kills} kill(s).`);
      this.publish();
    }

    this.hiddenAt = Date.now();
    this.flushSave();
  }

  handleVisible(): void {
    if (!this.hiddenAt) return;
    const now = Date.now();
    const gap = now - this.hiddenAt;
    this.hiddenAt = 0;
    this.refreshEvent();

    if (this.pendingOffline || gap < BALANCE.offlineMinSeconds * 1000) return;

    const report = this.sim.estimateOffline(gap);
    if (!report) return;

    this.pendingOffline = report;
    this.pendingSince = now - gap;
    this.publish();
  }

  getOfflineReport(): OfflineReport | null {
    return this.pendingOffline;
  }

  claimOffline(): void {
    const report = this.pendingOffline;
    if (!report) return;

    this.sim.applyOffline(report);
    this.pushLog(
      `Expedition: ${report.kills} kills · +${report.gold}g · +${report.exp} EXP.`,
    );
    this.pendingOffline = null;
    this.pendingSince = null;
    this.flushSave();
    this.publish();
  }

  flushSave(): void {
    // A reload fires pagehide; do not let that write the erased save back.
    if (this.resetting) return;
    // Temporary modes (rift, duel, trial) only save once the main run is restored.
    if (this.sim.riftActive || this.sim.duelActive || this.sim.trialActive) return;
    if (this.sim.dungeonActive) return;
    const data = this.sim.saveData();
    data.lastSeen = this.pendingSince ?? Date.now();
    writeSave(data);
  }

  reset(): void {
    this.resetting = true;
    clearSave();
    window.location.reload();
  }

  /** Reload after writing a save we do not want the pagehide handler to overwrite. */
  reloadWithoutFlush(): void {
    this.resetting = true;
    window.location.reload();
  }

  getLog(): string[] {
    return [...this.log];
  }

  private publish(): void {
    const snapshot = this.sim.snapshot();
    const log = [...this.log];
    for (const listener of this.listeners) listener(snapshot, log);
  }

  private handleEvent(event: SimEvent): void {
    switch (event.type) {
      case 'kill':
        this.pushLog(
          event.kind === 'boss'
            ? `${event.name} falls. Stage cleared!`
            : `${event.name} slain  +${event.gold}g`,
        );
        break;
      case 'levelup':
        this.pushLog(`Level ${event.level} — stats increased.`);
        break;
      case 'stageup':
        this.pushLog(`Stage ${event.stage} reached.`);
        this.flushSave();
        break;
      case 'retreat':
        this.pushLog(`Too dangerous. Farming stage ${event.stage} until you push.`);
        this.flushSave();
        break;
      case 'push':
        this.pushLog(`Push! Stage ${event.stage}.`);
        break;
      case 'trialstart':
        this.pushLog(`Trial floor ${event.floor}: ${event.name}.`);
        break;
      case 'trialcancel':
        this.pushLog('Trial abandoned — no retry spent.');
        break;
      case 'trialend':
        this.pendingTrial = event.result;
        this.pushLog(
          event.result.win
            ? `Floor ${event.result.floor} cleared · +${event.result.dust} dust · +${event.result.essence} essence.`
            : `Floor ${event.result.floor} repelled the knight · ${event.result.attempts} retries left.`,
        );
        if (event.result.costumeDust > 0) {
          this.pushLog(`Tower cache duplicate · +${event.result.costumeDust} dust.`);
        }
        this.flushSave();
        this.publish();
        break;
      case 'riftstart':
        this.pushLog('Daily rift opened — 60 seconds.');
        break;
      case 'duelstart':
        this.pushLog(`Duel: ${event.rival.name} · ${event.rival.build}.`);
        break;
      case 'duelcancel':
        this.pushLog('Duel abandoned.');
        break;
      case 'duelend':
        this.pendingDuel = event.result;
        this.pushLog(
          event.result.win
            ? `Duel won · +${event.result.points} pts${event.result.rankUp ? ` · rank up: ${event.result.rank}` : ''}.`
            : `Duel lost · -${Math.abs(event.result.points)} pts.`,
        );
        this.flushSave();
        this.publish();
        break;
      case 'riftend':
        this.pendingRift = {
          kills: event.kills,
          chest: event.chest,
          modifiers: event.modifiers,
          item: event.item,
        };
        this.pushLog(`Rift cleared · ${event.kills} kills.`);
        this.flushSave();
        // The run pauses while the result modal is open.
        this.publish();
        break;
      case 'death':
        this.pushLog('You fell. Recovering in 3s...');
        break;
      case 'revive':
        this.pushLog('Back on your feet.');
        break;
      case 'costume': {
        const found = costumeById(event.id);
        if (!found) break;
        this.pushLog(
          event.duplicate
            ? `${found.name} found again · +${event.dust} dust.`
            : `Costume found: ${found.name} (${found.tier}).`,
        );
        break;
      }
      case 'wardrobe': {
        this.pushLog('Wardrobe complete · one-time dust and essence paid.');
        break;
      }
      case 'loot': {
        const rarity = RARITY[event.item.rarity].label;
        const slot = SLOT_LABEL[event.item.slot];
        this.pushLog(`${rarity} ${slot} found: ${event.item.name}`);
        break;
      }
      case 'pet': {
        const info = petById(event.id);
        this.pushLog(
          event.level === 1
            ? `${info?.name ?? 'A wisp'} joined the run.`
            : `${info?.name ?? 'Wisp'} reached level ${event.level}.`,
        );
        break;
      }
      case 'petEgg': {
        const info = petById(event.id);
        this.pushLog(`${info?.name ?? 'Wisp'} egg found · ${event.eggs} ready to synthesise.`);
        break;
      }
      case 'petSynth': {
        const info = petById(event.id);
        this.pushLog(`${info?.name ?? 'Wisp'} ceiling raised to level ${event.maxLevel}.`);
        break;
      }
      case 'mount': {
        const info = mountById(event.id);
        this.pushLog(
          !info
            ? 'The mount returns to the stable.'
            : event.level <= 1
              ? `${info.name} joins the stable.`
              : `${info.name} reached level ${event.level}.`,
        );
        break;
      }
      case 'wing': {
        const info = wingById(event.id);
        this.pushLog(
          !info
            ? 'The wings fold away.'
            : event.level <= 1
              ? `${info.name} join the vault.`
              : `${info.name} reached level ${event.level}.`,
        );
        break;
      }
      case 'dungeonstart':
        this.pushLog(`Dungeon entered · ${dungeonTier(event.tier)?.name ?? event.tier}.`);
        break;
      case 'dungeonend': {
        this.pendingDungeon = event.result;
        this.pushLog(
          event.result.win
            ? `Dungeon cleared · +${event.result.crystals} crystals${event.result.mountName ? ` · ${event.result.mountName}!` : ''}${event.result.wingName ? ` · ${event.result.wingName}!!` : ''}.`
            : 'The dungeon repelled the knight · ticket spent.',
        );
        this.flushSave();
        this.publish();
        break;
      }
      case 'palette': {
        if (!event.earned) break;
        const info = paletteById(event.id);
        this.pushLog(`Palette unlocked: ${info?.name ?? 'unknown'} — wear it in COSTUME.`);
        break;
      }
      case 'resource': {
        const gains: string[] = [];
        if (event.essence > 0) gains.push(`+${event.essence} essence`);
        if (event.cores > 0) gains.push(`+${event.cores} boss core`);
        if (event.books > 0) gains.push(`+${event.books} skill book`);
        if (gains.length > 0) this.pushLog(gains.join(' · '));
        break;
      }
      default:
        break;
    }
  }

  private pushLog(line: string): void {
    this.log = [line, ...this.log].slice(0, 5);
  }
}

export const gameController = new GameController();
