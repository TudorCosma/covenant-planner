import { describe, it, expect } from 'vitest';
import { runProjection } from '../projection';
import { DEFAULT_STATE } from '../../data/defaultState';

// ---- Test helpers -------------------------------------------------------
// Deep-clone DEFAULT_STATE so each test gets an isolated, mutable scenario.
const baseState = () => structuredClone(DEFAULT_STATE);

// Zero every asset-class return so super/non-super pools neither grow nor earn.
// This makes contribution / tax math exact and deterministic at row 0
// (inflationFactor = 1 in the first year, so deflated == nominal).
const zeroReturns = (s) => {
  for (const k of Object.keys(s.assetReturns)) {
    s.assetReturns[k] = { ...s.assetReturns[k], income: 0, growth: 0, volatility: 0 };
  }
  // Zero account costs too so balances aren't nibbled by fees.
  for (const acc of Object.values(s.assets.superAccounts)) {
    if (acc && typeof acc === 'object' && !Array.isArray(acc)) {
      acc.adminFee = 0; acc.managementCost = 0; acc.adviceCost = 0;
    }
  }
  for (const acc of Object.values(s.assets.nonSuper)) {
    if (acc && typeof acc === 'object') {
      acc.adminFee = 0; acc.managementCost = 0; acc.adviceCost = 0;
    }
  }
  s.cashflowRules = { ...s.cashflowRules, cashRate: 0, debtMargin: 0 };
  return s;
};

describe('T2: contribution cashflow + contributions tax', () => {
  it('subtracts the 15% contributions tax from the super balance', () => {
    const s = zeroReturns(baseState());
    s.personal.projectionYears = 1;
    s.income.person1.salary = 0; // no SG, isolate the personal contribution
    // Keep adjusted taxable income above the LISTO threshold ($37k) so the low-income
    // super tax offset doesn't refund $500 into super — this test isolates contributions tax.
    s.income.person1.otherTaxable = 60000;
    s.income.person1.personalDeductibleSuper = 10000; // concessional
    const row = runProjection(s, false)[0];
    // 10,000 concessional contribution, taxed 15% inside super -> 8,500 lands.
    expect(row.p1Super).toBeCloseTo(8500, 2);
  });

  it('non-concessional contribution moves money, never creates it (no inflation)', () => {
    const s = zeroReturns(baseState());
    s.personal.projectionYears = 1;
    s.income.person1.salary = 0;
    s.income.person1.nonConcessionalSuper = 10000; // after-tax, no contributions tax
    const row = runProjection(s, false)[0];
    // NCC is not concessional -> no 15% tax -> full 10k in super.
    expect(row.p1Super).toBeCloseTo(10000, 2);
    // It was funded from cash (which goes into deficit/debt), so take-home drops by 10k.
    expect(row.totalIncome).toBeCloseTo(-10000, 2);
    // Net assets unchanged: +10k super, -10k debt. Before the fix this read +10k
    // because the contribution was added to super but never removed from cashflow.
    expect(row.netAssets).toBeCloseTo(0, 2);
  });

  it('deductible personal contribution reduces assessable income', () => {
    const s = zeroReturns(baseState());
    s.personal.projectionYears = 1;
    s.income.person1.salary = 0;
    s.income.person1.otherTaxable = 60000;
    const withoutDeduction = runProjection(s, false)[0];
    s.income.person1.personalDeductibleSuper = 15000;
    const withDeduction = runProjection(s, false)[0];
    // Claiming the deduction lowers taxable income, so total tax falls.
    expect(withDeduction.totalTax).toBeLessThan(withoutDeduction.totalTax);
  });
});

describe('T3: Division 293 surcharge', () => {
  it('high earner ($300k) pays Div293 on low-tax contributions above the threshold', () => {
    const s = zeroReturns(baseState());
    s.personal.projectionYears = 1;
    s.income.person1.salary = 300000; // SG = 36,000 -> low-tax contrib capped at 30,000
    const row = runProjection(s, false)[0];
    // Div293 income = 300,000 taxable + 30,000 low-tax contrib = 330,000.
    // Excess over 250,000 = 80,000; surcharge base = min(30,000, 80,000) = 30,000.
    // Div293 = 30,000 * 15% = 4,500.
    expect(row.p1Div293).toBeCloseTo(4500, 2);
  });

  it('mid earner ($150k) pays no Div293', () => {
    const s = zeroReturns(baseState());
    s.personal.projectionYears = 1;
    s.income.person1.salary = 150000;
    const row = runProjection(s, false)[0];
    expect(row.p1Div293).toBe(0);
  });
});

describe('T4: non-super capital gains tax', () => {
  it('realises embedded gain proportionally on drawdown, assessed the next FY', () => {
    const s = zeroReturns(baseState());
    s.personal.isCouple = false;
    s.personal.projectionYears = 3;
    s.income.person1.salary = 0; // no income -> spending must be funded from non-super
    // $500k pool with a $200k embedded (unrealised) gain.
    s.assets.nonSuper.p1NonSuper = {
      ...s.assets.nonSuper.p1NonSuper, balance: 500000, unrealisedGains: 200000, owner: 'p1',
    };
    // $60k/yr spending forces a deficit funded from the non-super pool.
    s.expenses.lifestyleExpenses = [
      { description: 'Living', amount: 60000, indexation: 0, indexationBucket: 'cpi', startYear: 0, endYear: 9999 },
    ];
    const rows = runProjection(s, false);
    // Year 0: 60k drawn from 500k pool. Realised = 500k * (60k/500k) * (200k/500k) = 24,000.
    expect(rows[0].totalRealisedCapitalGain).toBeCloseTo(24000, 0);
    // CGT is assessed with a one-FY lag, so nothing is taxable in year 0...
    expect(rows[0].totalTaxableCapitalGain).toBe(0);
    // ...but the prior-year realised gain is assessed (after the 50% discount) in year 1.
    expect(rows[1].totalTaxableCapitalGain).toBeGreaterThan(0);
  });

  it('carried-forward capital losses offset the realised gain before the discount', () => {
    const make = (lossCF) => {
      const s = zeroReturns(baseState());
      s.personal.isCouple = false;
      s.personal.projectionYears = 3;
      s.income.person1.salary = 0;
      s.income.person1.capitalLossesCarriedForward = lossCF;
      s.assets.nonSuper.p1NonSuper = {
        ...s.assets.nonSuper.p1NonSuper, balance: 500000, unrealisedGains: 200000, owner: 'p1',
      };
      s.expenses.lifestyleExpenses = [
        { description: 'Living', amount: 60000, indexation: 0, indexationBucket: 'cpi', startYear: 0, endYear: 9999 },
      ];
      return runProjection(s, false);
    };
    const noLoss = make(0);
    const withLoss = make(20000); // wipes out most of the 24k realised gain before the discount
    expect(withLoss[1].totalTaxableCapitalGain).toBeLessThan(noLoss[1].totalTaxableCapitalGain);
  });
});

describe('T5: SAPTO phases out on rebate income, not raw taxable', () => {
  // Senior past the SAPTO qualifying age, still working so salary/salary-sacrifice apply.
  const senior = (salary, salSac) => {
    const s = zeroReturns(baseState());
    s.personal.isCouple = false;
    s.personal.projectionYears = 1;
    const cy = new Date().getFullYear();
    s.personal.person1.birthYear = cy - 68; // age 68 — past the 67 qualifying age
    s.personal.person1.dob = '';
    s.personal.person1.retirementAge = 75; // keep working so salary isn't zeroed
    s.income.person1.salary = salary;
    s.income.person1.salarySacrifice = salSac;
    return runProjection(s, false)[0];
  };

  it('reportable super contributions reduce SAPTO at equal taxable income', () => {
    // Both land on $40k taxable; only rebate income differs (40k vs 50k).
    const noSacrifice = senior(40000, 0);
    const withSacrifice = senior(50000, 10000);
    expect(noSacrifice.p1SAPTO).toBeGreaterThan(0);
    expect(withSacrifice.p1SAPTO).toBeLessThan(noSacrifice.p1SAPTO);
  });
});

describe('T7: super offsets, MSCB cap and excess concessional', () => {
  it('capSGAtBase caps employer SG at the maximum super contribution base', () => {
    const mk = (cap) => {
      const s = zeroReturns(baseState());
      s.personal.isCouple = false;
      s.personal.projectionYears = 1;
      s.income.person1.salary = 400000; // well above the MSCB ceiling
      s.income.person1.salarySacrifice = 0;
      s.income.person1.capSGAtBase = cap;
      return runProjection(s, false)[0];
    };
    const uncapped = mk(false);
    const capped = mk(true);
    // Uncapped SG is paid on the full $400k; capped SG stops at MSCB (65,070 x 4 quarters).
    expect(capped.p1Concessional).toBeLessThan(uncapped.p1Concessional);
    expect(capped.p1Concessional).toBeCloseTo(65070 * 4 * 0.12, 0);
  });

  it('concessional contributions above the cap incur excess-concessional tax', () => {
    const s = zeroReturns(baseState());
    s.personal.isCouple = false;
    s.personal.projectionYears = 1;
    s.income.person1.salary = 100000;        // SG = 12,000
    s.income.person1.salarySacrifice = 30000; // total concessional = 42,000
    const row = runProjection(s, false)[0];
    expect(row.p1ExcessConcessional).toBeCloseTo(12000, 0); // 42,000 - 30,000 cap
    expect(row.p1ExcessConcessionalTax).toBeGreaterThan(0);
  });

  it('low-income earner receives LISTO into super', () => {
    const s = zeroReturns(baseState());
    s.personal.isCouple = false;
    s.personal.projectionYears = 1;
    s.income.person1.salary = 30000; // SG = 3,600 concessional; income under the $37k threshold
    const row = runProjection(s, false)[0];
    // LISTO refunds 15% of concessional contributions, capped at $500.
    expect(row.p1LISTO).toBeCloseTo(500, 2);
  });

  it('low-income earner making after-tax contributions gets the government co-contribution', () => {
    const s = zeroReturns(baseState());
    s.personal.isCouple = false;
    s.personal.projectionYears = 1;
    s.income.person1.salary = 40000;             // under the co-contribution lower threshold
    s.income.person1.nonConcessionalSuper = 1000; // personal after-tax contribution
    const row = runProjection(s, false)[0];
    // 50c per $1 of personal NCC, capped at $500.
    expect(row.p1CoContribution).toBeCloseTo(500, 2);
  });

  it('contributing to a low-income spouse super yields the spouse tax offset', () => {
    const mk = (spouseContrib) => {
      const s = zeroReturns(baseState());
      s.personal.isCouple = true;
      s.personal.projectionYears = 1;
      s.income.person1.salary = 80000;
      s.income.person2.salary = 0; // low-income spouse -> full offset band
      s.income.person1.spouseContributionSuper = spouseContrib;
      return runProjection(s, false)[0];
    };
    const without = mk(0);
    const withContrib = mk(3000);
    // Max offset is 18% of $3,000 = $540, capped at the contributor's income tax.
    expect(withContrib.p1SpouseOffset).toBeCloseTo(540, 2);
    expect(withContrib.p1Tax).toBeCloseTo(without.p1Tax - 540, 2);
  });
});
