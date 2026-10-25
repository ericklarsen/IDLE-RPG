import { describe, expect, it } from 'vitest';
import { COSTUMES, COSTUME_PITY, COSTUME_TIERS, COSTUME_TIER_ORDER } from '../data/costumes';
import {
  addCostume,
  claimCostume,
  costumeBonuses,
  costumeSkill,
  emptyCostume,
  forgeQuote,
  normalizeCostume,
  rollCostume,
  tierUnlocked,
  trialCostumeTier,
} from './costume';
import type { CostumeState } from './types';

const fixed = (value: number) => () => value;

describe('costume tiers', () => {
  it('menaikkan passive dan skill tiap tier', () => {
    const byTier = COSTUME_TIER_ORDER.map((tier) => COSTUMES.find((item) => item.tier === tier)!);

    for (let index = 1; index < byTier.length; index += 1) {
      const lower = byTier[index - 1];
      const higher = byTier[index];
      expect(higher.atkPct).toBeGreaterThanOrEqual(lower.atkPct);
      expect(higher.hpPct).toBeGreaterThanOrEqual(lower.hpPct);
    }

    // Silver's signature skill is a shield, so only the damage tiers carry a
    // multiplier — the ladder still has to climb from bronze to emerald.
    const damageSkills = byTier
      .filter((costume) => costume.skill.kind === 'damage')
      .map((costume) => costume.skill.multiplier ?? 0);
    expect(damageSkills).toEqual([...damageSkills].sort((a, b) => a - b));
    expect(damageSkills[damageSkills.length - 1]).toBeGreaterThan(damageSkills[0]);

    expect(byTier[0].tier).toBe('bronze');
    expect(byTier[byTier.length - 1].tier).toBe('emerald');
  });

  it('membuka tier mengikuti stage farm', () => {
    expect(tierUnlocked('bronze', COSTUME_TIERS.bronze.stage - 1)).toBe(false);
    expect(tierUnlocked('bronze', COSTUME_TIERS.bronze.stage)).toBe(true);
    expect(tierUnlocked('emerald', COSTUME_TIERS.emerald.stage - 1)).toBe(false);
  });
});

describe('costume state', () => {
  it('membersihkan id asing, duplikat, dan outfit yang tidak dimiliki', () => {
    const normalized = normalizeCostume({
      owned: ['ash-ronin', 'ash-ronin', 'bogus', 42 as unknown as string, 'void-regent'],
      equipped: 'frostveil-shroud',
    });

    expect(normalized.owned).toEqual(['ash-ronin', 'void-regent']);
    expect(normalized.equipped).toBeNull();
  });

  it('menyimpan outfit yang benar-benar dimiliki', () => {
    const normalized = normalizeCostume({ owned: ['void-regent'], equipped: 'void-regent' });
    expect(normalized.equipped).toBe('void-regent');
  });

  it('tidak memberi bonus saat tidak ada outfit', () => {
    expect(costumeBonuses(emptyCostume())).toEqual({
      atkPct: 0,
      hpPct: 0,
      defPct: 0,
      speedPct: 0,
      crit: 0,
    });
    expect(costumeSkill(emptyCostume())).toBeNull();
  });

  it('meneruskan passive dan skill outfit yang dipakai', () => {
    const state = { owned: ['verdant-sovereign'], equipped: 'verdant-sovereign', pity: 0, mastered: false };
    const bonuses = costumeBonuses(state);
    expect(bonuses.atkPct).toBeCloseTo(0.26);
    expect(bonuses.crit).toBeCloseTo(0.05);
    expect(costumeSkill(state)?.name).toBe('Verdant Wrath');
  });
});

describe('costume drops', () => {
  it('tidak menggulir sebelum tier pertama terbuka', () => {
    const stage = COSTUME_TIERS.bronze.stage - 1;
    expect(rollCostume(emptyCostume(), stage, fixed(0))).toBeNull();
  });

  it('hanya memberi tier yang sudah terbuka', () => {
    const roll = rollCostume(emptyCostume(), COSTUME_TIERS.bronze.stage, fixed(0));
    expect(roll?.costume.tier).toBe('bronze');
  });

  it('menghormati batas tier cache', () => {
    for (let index = 0; index < 12; index += 1) {
      const roll = rollCostume(emptyCostume(), 120, fixed(index / 12), 'gold');
      expect(roll).not.toBeNull();
      expect(COSTUME_TIER_ORDER.indexOf(roll!.costume.tier)).toBeLessThanOrEqual(
        COSTUME_TIER_ORDER.indexOf('gold'),
      );
    }
  });

  it('mengubah duplikat menjadi dust', () => {
    const owned = { owned: ['ash-ronin'], equipped: 'ash-ronin', pity: 0, mastered: false };
    const roll = rollCostume(owned, COSTUME_TIERS.bronze.stage, fixed(0));

    expect(roll?.duplicate).toBe(true);
    expect(roll?.dust).toBe(COSTUME_TIERS.bronze.dust);

    const claimed = claimCostume(owned, roll!);
    expect(claimed.costume.owned).toEqual(['ash-ronin']);
    expect(claimed.dust).toBe(COSTUME_TIERS.bronze.dust);
  });

  it('memakai outfit pertama yang ditemukan tanpa mengganti yang sedang dipakai', () => {
    const first = rollCostume(emptyCostume(), 20, fixed(0))!;
    const claimed = claimCostume(emptyCostume(), first);
    expect(claimed.costume.equipped).toBe(first.costume.id);
    expect(claimed.dust).toBe(0);

    const second = rollCostume(claimed.costume, 40, fixed(0.999))!;
    expect(second.costume.id).not.toBe(first.costume.id);
    const again = claimCostume(claimed.costume, second);
    expect(again.costume.equipped).toBe(first.costume.id);
    expect(again.costume.owned).toHaveLength(2);
  });

  it('mendahulukan outfit yang belum dimiliki', () => {
    const state: CostumeState = {
      owned: ['ash-ronin'],
      equipped: 'ash-ronin',
      pity: 0,
      mastered: false,
    };

    for (const value of [0, 0.25, 0.5, 0.75, 0.99]) {
      const roll = rollCostume(state, 60, fixed(value));
      expect(roll?.duplicate).toBe(false);
      expect(roll?.costume.id).not.toBe('ash-ronin');
    }
  });

  it('menghitung harga forge per tier', () => {
    expect(forgeQuote('void-regent')).toEqual(COSTUME_TIERS.diamond.forge);
    expect(forgeQuote('ash-ronin')).toEqual(COSTUME_TIERS.bronze.forge);
    expect(forgeQuote('bogus')).toBeNull();
  });

  it('menandai koleksi lengkap hanya sekali', () => {
    const firstFive = COSTUMES.slice(0, 5).map((costume) => costume.id);
    const state: CostumeState = {
      owned: firstFive,
      equipped: firstFive[0],
      pity: 5,
      mastered: false,
    };

    const gained = addCostume(state, COSTUMES[5].id);
    expect(gained.completed).toBe(true);
    expect(gained.costume.mastered).toBe(true);
    expect(gained.costume.pity).toBe(5);

    const again = addCostume(gained.costume, COSTUMES[5].id);
    expect(again.completed).toBe(false);
    expect(again.costume).toBe(gained.costume);
  });

  it('menjepit pity dan menandai koleksi lengkap saat memuat save', () => {
    const stored = normalizeCostume({
      owned: COSTUMES.map((costume) => costume.id),
      equipped: 'ash-ronin',
      pity: 99,
    });
    expect(stored.pity).toBe(COSTUME_PITY - 1);
    expect(stored.mastered).toBe(true);
  });

  it('memberi cache tower di lantai 5, 8, dan 10', () => {
    expect(trialCostumeTier(4)).toBeNull();
    expect(trialCostumeTier(5)).toBe('gold');
    expect(trialCostumeTier(8)).toBe('platinum');
    expect(trialCostumeTier(10)).toBe('emerald');
  });
});
