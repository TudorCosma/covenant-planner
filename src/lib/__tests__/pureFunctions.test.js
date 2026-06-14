import { describe, it, expect } from 'vitest';
import { calcIncomeTax } from '../tax';
import { calcMedicareLevy, calcMLS } from '../medicare';
import { calcLITO, calcSAPTO } from '../taxOffsets';
import { calcCoContribution, calcLISTO, calcSpouseOffset } from '../superRules';
import { calcCentrelinkPension, calcDeemedIncome, calcDeprivedAssets } from '../centrelink';
import {
  TAX_BRACKETS,
  LITO,
  SAPTO,
  MEDICARE,
  SUPER_PARAMS,
  CENTRELINK,
} from '../../data/legislation/fy2025-26';

// Golden-master tests: locked to ATO / Centrelink published FY25-26 worked examples.
// These guard the pure calculation functions against regressions during the engine overhaul.

describe('calcIncomeTax (FY25-26 Stage 3 brackets)', () => {
  it('tax-free threshold', () => {
    expect(calcIncomeTax(0, TAX_BRACKETS)).toBe(0);
    expect(calcIncomeTax(18200, TAX_BRACKETS)).toBe(0);
  });
  it('matches ATO marginal calc at bracket boundaries', () => {
    expect(calcIncomeTax(45000, TAX_BRACKETS)).toBeCloseTo(4288, 2);
    expect(calcIncomeTax(135000, TAX_BRACKETS)).toBeCloseTo(31288, 2);
    expect(calcIncomeTax(190000, TAX_BRACKETS)).toBeCloseTo(51638, 2);
    expect(calcIncomeTax(200000, TAX_BRACKETS)).toBeCloseTo(56138, 2);
  });
  it('mid-bracket values', () => {
    // 90,000: 4288 + (90000-45000)*0.30 = 4288 + 13500 = 17788
    expect(calcIncomeTax(90000, TAX_BRACKETS)).toBeCloseTo(17788, 2);
  });
});

describe('calcLITO', () => {
  it('full offset below full threshold', () => {
    expect(calcLITO(30000, LITO)).toBe(700);
  });
  it('taper band 1 (5c/$)', () => {
    expect(calcLITO(40000, LITO)).toBeCloseTo(575, 2);
  });
  it('taper band 2 (1.5c/$)', () => {
    expect(calcLITO(50000, LITO)).toBeCloseTo(250, 2);
  });
  it('zero above cutoff', () => {
    expect(calcLITO(70000, LITO)).toBe(0);
  });
});

describe('calcSAPTO (single)', () => {
  it('full offset below shade-in', () => {
    expect(calcSAPTO(30000, 'single', SAPTO)).toBe(2230);
  });
  it('tapers at 12.5c/$ above shade-in', () => {
    expect(calcSAPTO(40000, 'single', SAPTO)).toBeCloseTo(1264.875, 3);
  });
  it('zero at/above cutoff', () => {
    expect(calcSAPTO(50119, 'single', SAPTO)).toBe(0);
    expect(calcSAPTO(60000, 'single', SAPTO)).toBe(0);
  });
});

describe('calcMedicareLevy', () => {
  it('zero below shade-in threshold', () => {
    expect(calcMedicareLevy(27000, MEDICARE, { isCouple: false })).toBe(0);
  });
  it('shade-in zone (10c/$)', () => {
    expect(calcMedicareLevy(30000, MEDICARE, { isCouple: false })).toBeCloseTo(277.8, 2);
  });
  it('full 2% levy above shade-in', () => {
    expect(calcMedicareLevy(50000, MEDICARE, { isCouple: false })).toBeCloseTo(1000, 2);
  });
});

describe('calcMLS (tiered surcharge)', () => {
  it('no surcharge with private health cover', () => {
    expect(calcMLS(100000, MEDICARE, { isCouple: false, hasPrivateHealth: true })).toBe(0);
  });
  it('no surcharge below first tier', () => {
    expect(calcMLS(80000, MEDICARE, { isCouple: false })).toBe(0);
  });
  it('1% surcharge in tier 1', () => {
    expect(calcMLS(100000, MEDICARE, { isCouple: false })).toBeCloseTo(1000, 2);
  });
});

describe('calcCoContribution', () => {
  it('full match below lower threshold', () => {
    expect(calcCoContribution(1000, 40000, SUPER_PARAMS)).toBe(500);
  });
  it('proportional to contribution', () => {
    expect(calcCoContribution(200, 40000, SUPER_PARAMS)).toBe(100);
  });
  it('tapers across the income band', () => {
    expect(calcCoContribution(1000, 54988, SUPER_PARAMS)).toBeCloseTo(250, 2);
  });
  it('zero at/above upper threshold', () => {
    expect(calcCoContribution(1000, 62488, SUPER_PARAMS)).toBe(0);
  });
});

describe('calcLISTO', () => {
  it('refunds 15% of concessional up to $500', () => {
    expect(calcLISTO(5000, 30000, SUPER_PARAMS)).toBe(500);
    expect(calcLISTO(2000, 30000, SUPER_PARAMS)).toBe(300);
  });
  it('zero above income threshold', () => {
    expect(calcLISTO(5000, 40000, SUPER_PARAMS)).toBe(0);
  });
});

describe('calcSpouseOffset', () => {
  it('full $540 when spouse income below lower limit', () => {
    expect(calcSpouseOffset(3000, 30000, SUPER_PARAMS)).toBe(540);
  });
  it('18% of contribution when under the cap', () => {
    expect(calcSpouseOffset(1000, 30000, SUPER_PARAMS)).toBe(180);
  });
  it('tapers between 37k and 40k', () => {
    expect(calcSpouseOffset(3000, 38500, SUPER_PARAMS)).toBeCloseTo(270, 2);
  });
  it('zero at/above upper income', () => {
    expect(calcSpouseOffset(3000, 40000, SUPER_PARAMS)).toBe(0);
  });
});

describe('calcDeemedIncome', () => {
  it('single: blended lower/upper deeming', () => {
    // 64200*0.0025 + 35800*0.0225 = 160.5 + 805.5 = 966
    expect(calcDeemedIncome(100000, false, CENTRELINK)).toBeCloseTo(966, 2);
  });
  it('couple: higher threshold applies', () => {
    expect(calcDeemedIncome(100000, true, CENTRELINK)).toBeCloseTo(250, 2);
  });
});

describe('calcCentrelinkPension', () => {
  it('full single pension below thresholds', () => {
    expect(
      calcCentrelinkPension(200000, 0, false, true, CENTRELINK, 70, 0, 0, 0)
    ).toBeCloseTo(29754, 2);
  });
  it('single asset test taper (7.8c/$ per fortnight basis annualised)', () => {
    // excess = 400000-314000 = 86000 * 0.078 = 6708 -> 29754 - 6708 = 23046
    expect(
      calcCentrelinkPension(400000, 0, false, true, CENTRELINK, 70, 0, 0, 0)
    ).toBeCloseTo(23046, 2);
  });
  it('full couple pension when both qualify and assets below couple threshold', () => {
    expect(
      calcCentrelinkPension(400000, 0, true, true, CENTRELINK, 70, 70, 0, 0)
    ).toBeCloseTo(44862, 2);
  });
  it('couple, only one qualifying partner: half the couple entitlement under couple thresholds', () => {
    // age1 70 qualifies, age2 60 does not. Combined assets 400k are below the couple
    // homeowner threshold (470k), so full household entitlement 44862, member share = 22431.
    expect(
      calcCentrelinkPension(400000, 0, true, true, CENTRELINK, 70, 60, 0, 0)
    ).toBeCloseTo(22431, 2);
  });
  it('one-of-couple applies the couple asset threshold (470k), not the single (314k)', () => {
    // 450k is above the single homeowner threshold (314k) but below the couple
    // threshold (470k). Under the old single-threshold logic this person would have
    // been tapered; under the correct couple test they keep the full member rate.
    expect(
      calcCentrelinkPension(450000, 0, true, true, CENTRELINK, 70, 60, 0, 0)
    ).toBeCloseTo(22431, 2);
  });
});

describe('calcDeprivedAssets (gifting ledger)', () => {
  it('single gift over annual cap: only excess deprived', () => {
    const gifts = [{ amount: 15000, year: 2025 }];
    expect(calcDeprivedAssets(gifts, 2025, CENTRELINK)).toBeCloseTo(5000, 2);
  });
  it('rolling 5-year cap exhausted: later within-annual gift fully deprived', () => {
    const gifts = [
      { amount: 10000, year: 2025 },
      { amount: 10000, year: 2026 },
      { amount: 10000, year: 2027 },
      { amount: 10000, year: 2028 },
    ];
    // First three consume the $30k rolling pool; the 4th is fully deprived.
    expect(calcDeprivedAssets(gifts, 2028, CENTRELINK)).toBeCloseTo(10000, 2);
  });
});
