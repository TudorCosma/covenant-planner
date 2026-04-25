import { calcIncomeTax, calcMedicare } from './tax';
import { calcCentrelinkPension, calcDeemedIncome, calcDeprivedAssets } from './centrelink';
import { calcLoanPayoff, getMonthlyEquiv } from './loans';
import { boxMullerRandom } from './monteCarlo';

export function runProjection(state, useRandomReturns = false, seed = 0) {
  const { personal, income, assets, expenses, legislation, returnProfiles, assetReturns } = state;
  const currentYear = new Date().getFullYear();
  const years = personal.projectionYears || 30;
  const inflation = (personal.inflationRate || 2.5) / 100;
  const salaryGrowth = (personal.salaryGrowth || 3) / 100;
  const isCouple = personal.isCouple;

  // Age calculation — use full DOB if available for accuracy, fall back to birth year
  const calcAgeInYear = (dob, birthYear, targetYear) => {
    if (dob) {
      const d = new Date(dob);
      // Age at start of FY (1 July of target year)
      const fyStart = new Date(`${targetYear}-07-01`);
      let age = fyStart.getFullYear() - d.getFullYear();
      if (fyStart < new Date(`${fyStart.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)) age--;
      return age;
    }
    return targetYear - (birthYear || 1970);
  };
  const age1Start = calcAgeInYear(personal.person1.dob, personal.person1.birthYear, currentYear);
  const age2Start = isCouple ? calcAgeInYear(personal.person2.dob, personal.person2.birthYear, currentYear) : 0;
  const retAge1 = personal.person1.retirementAge || 67;
  const retAge2 = isCouple ? (personal.person2.retirementAge || 67) : 999;

  // Helper: generate per-asset-class random returns for a year
  const getAssetClassReturns = (random) => {
    const returns = {};
    for (const [key, r] of Object.entries(assetReturns)) {
      const base = r.income + r.growth;
      returns[key] = random ? base + r.volatility * boxMullerRandom() : base;
    }
    return returns;
  };

  // Helper: grow a pool by tracking each asset class separately, then rebalance annually
  // investmentCostRate: total annual % fee deducted from pool (admin + management + advice)
  const growPool = (holdings, profileName, classReturns, investmentCostRate = 0) => {
    const profile = returnProfiles[profileName] || returnProfiles["Balanced"];
    let newTotal = 0;

    // Apply each asset class's return to its portion
    for (const [assetClass] of Object.entries(profile)) {
      const currentValue = holdings[assetClass] || 0;
      const ret = classReturns[assetClass] || 0;
      newTotal += currentValue * (1 + ret);
    }

    // Deduct investment costs
    newTotal = newTotal * (1 - investmentCostRate);

    // Rebalance back to target weights annually
    const rebalancedHoldings = {};
    if (newTotal > 0) {
      for (const [assetClass, weight] of Object.entries(profile)) {
        rebalancedHoldings[assetClass] = newTotal * weight;
      }
    }

    return { holdings: rebalancedHoldings, total: newTotal };
  };

  // Initialise holdings for each pool based on their profile allocation
  const initHoldings = (balance, profileName) => {
    const profile = returnProfiles[profileName] || returnProfiles["Balanced"];
    const h = {};
    for (const [assetClass, weight] of Object.entries(profile)) {
      h[assetClass] = (balance || 0) * weight;
    }
    return h;
  };

  const superProfile = assets.superAccounts.p1Super?.profile || "Balanced";
  const nonSuperProfile = assets.nonSuper.joint?.profile || "Balanced";

  let p1SuperBal = (assets.superAccounts.p1Super?.balance || 0) + (assets.superAccounts.p1Pension?.balance || 0)
    + (assets.superAccounts.p1Extra || []).reduce((s, a) => s + (a.balance || 0), 0);
  let p2SuperBal = (assets.superAccounts.p2Super?.balance || 0) + (assets.superAccounts.p2Pension?.balance || 0)
    + (assets.superAccounts.p2Extra || []).reduce((s, a) => s + (a.balance || 0), 0);
  // Non-super balances: route by owner field. Joint-owned assets use the joint pool.
  const getOwner = (acc, defaultOwner) => acc?.owner || defaultOwner;
  const p1NSBases = [
    getOwner(assets.nonSuper.p1NonSuper, "p1") === "p1" ? (assets.nonSuper.p1NonSuper?.balance || 0) : 0,
    getOwner(assets.nonSuper.p1NonSuper2, "p1") === "p1" ? (assets.nonSuper.p1NonSuper2?.balance || 0) : 0,
  ];
  const p2NSBases = [
    getOwner(assets.nonSuper.p2NonSuper, "p2") === "p2" ? (assets.nonSuper.p2NonSuper?.balance || 0) : 0,
    getOwner(assets.nonSuper.p2NonSuper2, "p2") === "p2" ? (assets.nonSuper.p2NonSuper2?.balance || 0) : 0,
  ];
  const jointBases = [
    getOwner(assets.nonSuper.p1NonSuper, "p1") === "joint" ? (assets.nonSuper.p1NonSuper?.balance || 0) : 0,
    getOwner(assets.nonSuper.p2NonSuper, "p2") === "joint" ? (assets.nonSuper.p2NonSuper?.balance || 0) : 0,
    getOwner(assets.nonSuper.p1NonSuper2, "p1") === "joint" ? (assets.nonSuper.p1NonSuper2?.balance || 0) : 0,
    getOwner(assets.nonSuper.p2NonSuper2, "p2") === "joint" ? (assets.nonSuper.p2NonSuper2?.balance || 0) : 0,
    assets.nonSuper.joint?.balance || 0, // legacy joint pool
  ];
  let p1NonSuperBal = p1NSBases.reduce((a, b) => a + b, 0);
  let p2NonSuperBal = p2NSBases.reduce((a, b) => a + b, 0);
  let jointNonSuperBal = jointBases.reduce((a, b) => a + b, 0);

  // Single-person scenario: zero out partner balances so any leftover defaults
  // (e.g. p2Super = $120k from DEFAULT_STATE) don't leak into totals, charts or the data table.
  if (!isCouple) {
    p2SuperBal = 0;
    p2NonSuperBal = 0;
  }

  let p1SuperH = initHoldings(p1SuperBal, superProfile);
  let p2SuperH = initHoldings(p2SuperBal, assets.superAccounts.p2Super?.profile || superProfile);
  let p1NonSuperH = initHoldings(p1NonSuperBal, assets.nonSuper.p1NonSuper?.profile || nonSuperProfile);
  let p2NonSuperH = initHoldings(p2NonSuperBal, assets.nonSuper.p2NonSuper?.profile || nonSuperProfile);
  let jointNonSuperH = initHoldings(jointNonSuperBal, nonSuperProfile);

  // Cashflow management: cash buffer account (earns cash rate when positive) and
  // a debt account (interest = cash rate + margin). The user-configurable rules
  // dictate the surplus destination and the order in which deficits are funded.
  const cfRules = state.cashflowRules || {};
  const cashRate = (cfRules.cashRate ?? 4.5) / 100;
  const debtRate = cashRate + (cfRules.debtMargin ?? 3.0) / 100;
  const surplusDest = cfRules.surplusDestination || "cash";
  const deficitOrder = [
    cfRules.deficitStep1 || "cash",
    cfRules.deficitStep2 || "nonSuper",
    cfRules.deficitStep3 || "debt",
  ];
  let cashAccount = Math.max(0, cfRules.openingCash || 0);
  let debtAccount = Math.max(0, cfRules.openingDebt || 0);

  const data = [];

  for (let y = 0; y < years; y++) {
    const year = currentYear + y;
    const age1 = age1Start + y;
    const age2 = age2Start + y;
    const inflationFactor = Math.pow(1 + inflation, y);
    const isP1Working = age1 < retAge1;
    const isP2Working = age2 < retAge2;

    // Income
    const p1Salary = isP1Working ? (income.person1.salary || 0) * Math.pow(1 + salaryGrowth, y) : 0;
    const p2Salary = (isCouple && isP2Working) ? (income.person2.salary || 0) * Math.pow(1 + salaryGrowth, y) : 0;

    // Super contributions
    const p1SG = p1Salary * legislation.superParams.sgRate;
    const p2SG = p2Salary * legislation.superParams.sgRate;
    const p1SalSac = isP1Working ? (income.person1.salarySacrifice || 0) : 0;
    const p2SalSac = (isCouple && isP2Working) ? (income.person2.salarySacrifice || 0) : 0;

    // Generate this year's asset class returns (same across all pools for consistency)
    const classReturns = getAssetClassReturns(useRandomReturns);

    // Blended return for reporting
    const superReturnBlended = Object.entries(returnProfiles[superProfile] || {}).reduce((s, [k, w]) => s + (classReturns[k] || 0) * w, 0);

    // Determine effective account types this year (respect future conversion dates)
    const p1AccType = (() => {
      const acc = assets.superAccounts.p1Super;
      if (acc.type !== "accumulation") return acc.type;
      if (acc.pensionConversionYear && year >= parseInt(acc.pensionConversionYear)) return "pension";
      return "accumulation";
    })();
    const p2AccType = isCouple ? (() => {
      const acc = assets.superAccounts.p2Super;
      if (acc.type !== "accumulation") return acc.type;
      if (acc.pensionConversionYear && year >= parseInt(acc.pensionConversionYear)) return "pension";
      return "accumulation";
    })() : "accumulation";

    // Pension and TTR income draws
    // TTR: requires age 60+, min 4% pa, max 10% pa, no lump sums (SIS Reg 6.01)
    // ABP: requires preservation age (60), age-based minimum per SIS Reg 1.06(9A), no max
    // SIS Act condition of release: no super withdrawals before earliestSuperAccessAge
    // (default 60). Hardship / total & permanent incapacity provisions are out of scope.
    const earliestSuperAge = legislation.superParams.earliestSuperAccessAge ?? 60;
    // Normalise the band list defensively so a malformed saved scenario (non-array,
    // null entries, missing fields, NaN) cannot crash the projection.
    const rawBands = Array.isArray(legislation.superParams.minPensionDrawdownRates)
      ? legislation.superParams.minPensionDrawdownRates
      : [];
    const minDrawRates = rawBands
      .filter(b => b && typeof b === "object")
      .map(b => ({
        minAge: Number.isFinite(+b.minAge) ? +b.minAge : 0,
        maxAge: b.maxAge === Infinity || b.maxAge == null ? Infinity : (Number.isFinite(+b.maxAge) ? +b.maxAge : Infinity),
        rate: Number.isFinite(+b.rate) ? +b.rate : 0.04,
      }));
    const safeBands = minDrawRates.length > 0 ? minDrawRates : [{ minAge: 0, maxAge: Infinity, rate: 0.04 }];
    const getMinDrawForAge = (age) => {
      const band = safeBands.find(r => age >= r.minAge && age <= r.maxAge);
      if (band) return band.rate;
      // No band matched — fall back to the highest-age band rate (safer than 4%
      // if user defined bands that don't reach this age).
      const sorted = [...safeBands].sort((a, b) => b.minAge - a.minAge);
      return sorted[0]?.rate ?? 0.04;
    };

    // Drawdown rate selection: prefer p1Super.drawdownPct (the account user edits); only
    // use p1Pension.drawdownPct when p1Pension actually has a balance (i.e. user has a
    // separate pension account). This fixes the bug where editing main super drawdown
    // had no effect because the empty p1Pension default of 5% always won the OR-chain.
    const pickDrawPct = (mainAcc, pensionAcc) => {
      const pensionHasBal = (pensionAcc?.balance || 0) > 0;
      const raw = pensionHasBal && pensionAcc?.drawdownPct != null
        ? pensionAcc.drawdownPct
        : (mainAcc?.drawdownPct ?? 5);
      return raw / 100;
    };

    const p1DrawPct = pickDrawPct(assets.superAccounts.p1Super, assets.superAccounts.p1Pension);
    const p1TTRDrawPct = Math.min(0.10, Math.max(0.04, p1DrawPct)); // clamped 4–10%
    const p1MinDraw = getMinDrawForAge(age1);
    const p1PensionDraw = (() => {
      if (age1 < earliestSuperAge) return 0; // SIS Act: no access before earliest age
      if (p1AccType === "ttr") {
        // TTR: condition of release requires age 60+ AND still working (income replacement)
        return p1SuperBal * p1TTRDrawPct;
      }
      if (p1AccType === "pension" || (!isP1Working && age1 >= legislation.superParams.preservationAge)) {
        return p1SuperBal * Math.max(p1MinDraw, p1DrawPct); // ABP: age-based minimum, no max
      }
      return 0;
    })();

    const p2DrawPct = isCouple ? pickDrawPct(assets.superAccounts.p2Super, assets.superAccounts.p2Pension) : 0;
    const p2TTRDrawPct = Math.min(0.10, Math.max(0.04, p2DrawPct));
    const p2MinDraw = isCouple ? getMinDrawForAge(age2) : 0.04;
    const p2PensionDraw = isCouple ? (() => {
      if (age2 < earliestSuperAge) return 0; // SIS Act: no access before earliest age
      if (p2AccType === "ttr") {
        return p2SuperBal * p2TTRDrawPct;
      }
      if (p2AccType === "pension" || (!isP2Working && age2 >= legislation.superParams.preservationAge)) {
        return p2SuperBal * Math.max(p2MinDraw, p2DrawPct);
      }
      return 0;
    })() : 0;

    // Age pension — accumulation excluded from assets test until pension age OR in pension/TTR phase
    const p1InPensionPhase = p1AccType === "pension" || p1AccType === "ttr";
    const p2InPensionPhase = isCouple && (p2AccType === "pension" || p2AccType === "ttr");
    const p1SuperForAssetTest = (p1InPensionPhase || age1 >= legislation.centrelink.ageQualifyingAge) ? p1SuperBal : 0;
    const p2SuperForAssetTest = isCouple ? ((p2InPensionPhase || age2 >= legislation.centrelink.ageQualifyingAge) ? p2SuperBal : 0) : 0;
    const totalFinancialAssets = p1SuperForAssetTest + p2SuperForAssetTest + p1NonSuperBal + p2NonSuperBal + jointNonSuperBal + Math.max(0, cashAccount);
    // Deprived assets from gifts (5-year rule)
    const deprivedAssets = calcDeprivedAssets(state?.gifts || [], year, legislation.centrelink);
    // Other income for income test (salary already net but we pass gross employment for deeming)
    const grossEmploymentIncome = Math.max(0, p1Salary - p1SalSac) + Math.max(0, p2Salary - p2SalSac);
    const deemedIncome = calcDeemedIncome(totalFinancialAssets, isCouple, legislation.centrelink);
    const agePension = calcCentrelinkPension(totalFinancialAssets, deemedIncome, isCouple, personal.isHomeowner, legislation.centrelink, age1, age2, grossEmploymentIncome, deprivedAssets);

    // Loan repayments — calculated BEFORE tax so deductible interest can reduce taxable income
    const loanData = (assets.loans || []).map(loan => {
      const bal = loan.balance || 0;
      if (bal <= 0) return { payment: 0, interest: 0, principal: 0, remaining: 0, deductible: loan.deductible, owner: loan.owner, p1Pct: loan.p1Pct ?? 50, p2Pct: loan.p2Pct ?? 50 };
      const monthsElapsed = y * 12;
      const fixedEnd = loan.fixedTermMonths || 0;
      const rate = (monthsElapsed < fixedEnd && loan.fixedRate) ? (loan.fixedRate || 0) / 100 : (loan.variableRate || 0) / 100;
      const monthlyRate = rate / 12;
      const termMonths = loan.termMonths || 360;
      const remainingMonths = Math.max(0, termMonths - monthsElapsed);
      if (remainingMonths <= 0) return { payment: 0, interest: 0, principal: 0, remaining: 0, deductible: loan.deductible, owner: loan.owner, p1Pct: loan.p1Pct ?? 50, p2Pct: loan.p2Pct ?? 50 };
      const initRate = (loan.fixedTermMonths > 0 && loan.fixedRate ? loan.fixedRate : loan.variableRate || 6) / 100 / 12;
      const minMonthly = loan.repaymentType === "pi" ? (initRate > 0 ? (bal * initRate) / (1 - Math.pow(1 + initRate, -termMonths)) : bal / termMonths) : bal * initRate;
      const extraMonthly = getMonthlyEquiv(loan.extraRepayment || 0, loan.frequency);
      const totalMonthlyPmt = minMonthly + extraMonthly;
      let remaining = bal;
      for (let m = 0; m < Math.min(monthsElapsed, termMonths); m++) {
        const mRate = (m < fixedEnd && loan.fixedRate) ? (loan.fixedRate || 0) / 100 / 12 : (loan.variableRate || 0) / 100 / 12;
        const intPmt = remaining * mRate;
        if (loan.repaymentType !== "io") {
          remaining = Math.max(0, remaining - Math.max(0, totalMonthlyPmt - intPmt));
        }
      }
      const annualInterest = remaining * rate;
      const annualPayment = loan.repaymentType === "io" ? annualInterest : Math.min(remaining + annualInterest, totalMonthlyPmt * 12);
      const annualPrincipal = Math.max(0, annualPayment - annualInterest);
      return { payment: annualPayment, interest: annualInterest, principal: annualPrincipal, remaining, deductible: loan.deductible, owner: loan.owner, p1Pct: loan.p1Pct ?? 50, p2Pct: loan.p2Pct ?? 50 };
    });
    const liabilityPayments = loanData.reduce((s, l) => s + l.payment, 0);
    const totalDebtRemaining = loanData.reduce((s, l) => s + l.remaining, 0);

    // Split deductible interest per person based on ownership %
    // p1 loans → 100% to p1; p2 loans → 100% to p2; joint → split by p1Pct/p2Pct
    const p1DeductibleInterest = loanData.filter(l => l.deductible).reduce((s, l) => {
      if (l.owner === "p1") return s + l.interest;
      if (l.owner === "joint") return s + l.interest * (l.p1Pct / 100);
      return s;
    }, 0);
    const p2DeductibleInterest = isCouple ? loanData.filter(l => l.deductible).reduce((s, l) => {
      if (l.owner === "p2") return s + l.interest;
      if (l.owner === "joint") return s + l.interest * (l.p2Pct / 100);
      return s;
    }, 0) : 0;
    const deductibleInterest = p1DeductibleInterest + p2DeductibleInterest;

    // Tax - detailed breakdown per person
    // ABP draws: tax-free after age 60 (ITAA 1997 s.303-10). TTR draws: assessable income.
    // Deductible investment loan interest reduces taxable income (ITAA 1997 s.8-1)
    const p1DrawTaxable = p1AccType === "ttr"
      ? p1PensionDraw
      : (age1 >= 60 ? 0 : p1PensionDraw * 0.85);
    const p1Taxable = Math.max(0, p1Salary - p1SalSac + (income.person1.otherTaxable || 0) + (income.person1.rentalIncome || 0) + p1DrawTaxable + (income.person1.frankedDividends || 0) * 1.3 - p1DeductibleInterest);
    const p1IncomeTax = calcIncomeTax(p1Taxable, legislation.taxBrackets);
    const p1Medicare = calcMedicare(p1Taxable, legislation.medicare);
    const p1Tax = p1IncomeTax + p1Medicare;
    const p1NetIncome = p1Salary - p1SalSac - p1Tax + (income.person1.taxFreeIncome || 0) + (income.person1.otherTaxable || 0) + (income.person1.rentalIncome || 0) + (income.person1.frankedDividends || 0);

    let p2NetIncome = 0;
    let p2IncomeTax = 0;
    let p2Medicare = 0;
    let p2Tax = 0;
    let p2Taxable = 0;
    if (isCouple) {
      const p2DrawTaxable = p2AccType === "ttr"
        ? p2PensionDraw
        : (age2 >= 60 ? 0 : p2PensionDraw * 0.85);
      p2Taxable = Math.max(0, p2Salary - p2SalSac + (income.person2.otherTaxable || 0) + (income.person2.rentalIncome || 0) + p2DrawTaxable + (income.person2.frankedDividends || 0) * 1.3 - p2DeductibleInterest);
      p2IncomeTax = calcIncomeTax(p2Taxable, legislation.taxBrackets);
      p2Medicare = calcMedicare(p2Taxable, legislation.medicare);
      p2Tax = p2IncomeTax + p2Medicare;
      p2NetIncome = p2Salary - p2SalSac - p2Tax + (income.person2.taxFreeIncome || 0) + (income.person2.otherTaxable || 0) + (income.person2.rentalIncome || 0) + (income.person2.frankedDividends || 0);
    }

    // Super tax on contributions (15% contributions tax)
    const p1SuperContribTax = (p1SG + p1SalSac + (income.person1.personalDeductibleSuper || 0)) * legislation.superParams.taxRate;
    const p2SuperContribTax = isCouple ? (p2SG + p2SalSac + (income.person2.personalDeductibleSuper || 0)) * legislation.superParams.taxRate : 0;
    const totalTax = p1Tax + p2Tax;
    const totalSuperTax = p1SuperContribTax + p2SuperContribTax;

    const totalNetIncome = p1NetIncome + p2NetIncome + p1PensionDraw + p2PensionDraw + agePension;

    // Expenses — lifestyle periods
    const lifestyleExp = (expenses.lifestyleExpenses || []).reduce((s, e) => {
      if (year >= (e.startYear || 0) && year <= (e.endYear || 9999)) {
        const yearsFromStart = year - (e.startYear || currentYear);
        return s + (e.amount || 0) * Math.pow(1 + (e.indexation || 2.5) / 100, yearsFromStart);
      }
      return s;
    }, 0);
    // Legacy support: fallback to annualLiving if no lifestyle periods
    const baseExp = lifestyleExp > 0 ? lifestyleExp : (expenses.annualLiving || 0) * Math.pow(1 + ((expenses.reducingIndex || 2.5) / 100), y);
    const recurringExp = (expenses.baseExpenses || []).reduce((s, e) => {
      if (year >= (e.startYear || 0) && year <= (e.endYear || 9999)) {
        const yearsFromStart = Math.max(0, year - (e.startYear || currentYear));
        return s + (e.amount || 0) * Math.pow(1 + (e.indexation || 2.5) / 100, yearsFromStart);
      }
      return s;
    }, 0);
    const futureExp = expenses.futureExpenses.filter(e => year >= e.startYear && year <= e.endYear).reduce((s, e) => s + (e.amount || 0) * Math.pow(1 + (e.indexation || 2.5) / 100, y - (e.startYear - currentYear)), 0);
    const totalExp = baseExp + recurringExp + futureExp;
    const surplus = totalNetIncome - totalExp - liabilityPayments;

    // === Grow assets using per-asset-class returns with annual rebalancing ===
    // Capture pre-growth balances for investment earnings calculation
    const preGrowthTotal = p1SuperBal + p2SuperBal + p1NonSuperBal + p2NonSuperBal + jointNonSuperBal;

    // Investment cost rates (admin + management + advice) / 100
    const p1SuperCostRate = ((assets.superAccounts.p1Super?.adminFee || 0) + (assets.superAccounts.p1Super?.managementCost || 0) + (assets.superAccounts.p1Super?.adviceCost || 0)) / 100;
    const p1PenCostRate = ((assets.superAccounts.p1Pension?.adminFee || 0) + (assets.superAccounts.p1Pension?.managementCost || 0) + (assets.superAccounts.p1Pension?.adviceCost || 0)) / 100;
    const p2SuperCostRate = ((assets.superAccounts.p2Super?.adminFee || 0) + (assets.superAccounts.p2Super?.managementCost || 0) + (assets.superAccounts.p2Super?.adviceCost || 0)) / 100;
    const p2PenCostRate = ((assets.superAccounts.p2Pension?.adminFee || 0) + (assets.superAccounts.p2Pension?.managementCost || 0) + (assets.superAccounts.p2Pension?.adviceCost || 0)) / 100;
    const p1NSCostRate = ((assets.nonSuper.p1NonSuper?.adminFee || 0) + (assets.nonSuper.p1NonSuper?.managementCost || 0) + (assets.nonSuper.p1NonSuper?.adviceCost || 0)) / 100;
    const p2NSCostRate = ((assets.nonSuper.p2NonSuper?.adminFee || 0) + (assets.nonSuper.p2NonSuper?.managementCost || 0) + (assets.nonSuper.p2NonSuper?.adviceCost || 0)) / 100;
    const jointCostRate = ((assets.nonSuper.joint?.adminFee || 0) + (assets.nonSuper.joint?.managementCost || 0) + (assets.nonSuper.joint?.adviceCost || 0)) / 100;

    // P1 Super
    const p1SuperGrown = growPool(p1SuperH, superProfile, classReturns, p1SuperCostRate);
    const p1SuperContribs = p1SG + p1SalSac + (income.person1.personalDeductibleSuper || 0) + (income.person1.nonConcessionalSuper || 0);
    p1SuperBal = p1SuperGrown.total + p1SuperContribs - p1PensionDraw;

    const p1ConvYear = assets.superAccounts.p1Super?.pensionConversionYear;
    const p1IsPartial = assets.superAccounts.p1Super?.pensionConversionType === "partial";
    const p1ConvActive = p1ConvYear && year >= parseInt(p1ConvYear);
    const p1IsConversionYear = p1ConvYear && year === parseInt(p1ConvYear);

    // Weighted income and growth returns for the profile
    const p1IncomeRet = Object.entries(returnProfiles[superProfile] || {}).reduce((s, [k, w]) => s + (assetReturns[k]?.income || 0) * w, 0);
    const p1GrowthRet = Object.entries(returnProfiles[superProfile] || {}).reduce((s, [k, w]) => s + (assetReturns[k]?.growth || 0) * w, 0);

    if (p1AccType === "pension" && !p1IsPartial) {
      // Full pension or full rollover: 0% tax on all earnings. Rollover itself is tax-free — no CGT.
    } else if (p1AccType === "pension" && p1IsPartial && p1ConvActive) {
      // Partial rollover: pension portion = 0% tax. Retained accumulation portion:
      //   - 15% on income return (distributions/interest — taxed as earned)
      //   - 10% CGT on rebalancing growth (15% rate × 2/3 after 1/3 CGT discount for assets held >12m)
      //   - NO CGT in the conversion year itself (rollover is tax-free event under SIS Act)
      const retainAmt = assets.superAccounts.p1Super?.pensionRetainAmount ?? 5000;
      const accumPortion = Math.min(retainAmt, p1SuperBal);
      const pensionPortion = Math.max(0, p1SuperBal - accumPortion);
      const accumIncomeTax = accumPortion * p1IncomeRet * 0.15;
      const accumCGT = p1IsConversionYear ? 0 : accumPortion * p1GrowthRet * 0.10;
      p1SuperBal = pensionPortion + (accumPortion - accumIncomeTax - accumCGT);
    } else {
      // Accumulation or TTR:
      //   - 15% on income return (always taxed as earned)
      //   - 15% on income return (distributions, interest — income tax exemption removed for TTR from 1 Jul 2017)
      //   - 0% CGT on rebalancing growth (TTR retains full CGT exemption — only income exemption was removed)
      //   - No CGT in conversion year (rollover to pension is tax-free under SIS Act)
      const incomeTax = p1SuperBal * p1IncomeRet * 0.15;
      const cgt = (p1IsConversionYear || p1AccType === "ttr") ? 0 : p1SuperBal * p1GrowthRet * 0.10;
      p1SuperBal -= (incomeTax + cgt);
    }

    // Division 293: extra 15% on concessional contributions if income > $250k
    const p1Div293 = (p1Salary + (income.person1.otherTaxable || 0)) > (legislation.superParams.div293Threshold || 250000)
      ? (p1SG + p1SalSac) * (legislation.superParams.div293Rate || 0.15) : 0;
    p1SuperBal -= p1Div293;
    p1SuperH = initHoldings(p1SuperBal, superProfile);

    // P2 Super
    let p2SuperGrown = { total: 0, holdings: {} };
    if (isCouple) {
      const p2Profile = assets.superAccounts.p2Super?.profile || superProfile;
      p2SuperGrown = growPool(p2SuperH, p2Profile, classReturns, p2SuperCostRate);
      const p2SuperContribs = p2SG + p2SalSac + (income.person2.personalDeductibleSuper || 0) + (income.person2.nonConcessionalSuper || 0);
      p2SuperBal = p2SuperGrown.total + p2SuperContribs - p2PensionDraw;

      const p2ConvYear = assets.superAccounts.p2Super?.pensionConversionYear;
      const p2IsPartial = assets.superAccounts.p2Super?.pensionConversionType === "partial";
      const p2ConvActive = p2ConvYear && year >= parseInt(p2ConvYear);
      const p2IsConversionYear = p2ConvYear && year === parseInt(p2ConvYear);

      const p2IncomeRet = Object.entries(returnProfiles[p2Profile] || {}).reduce((s, [k, w]) => s + (assetReturns[k]?.income || 0) * w, 0);
      const p2GrowthRet = Object.entries(returnProfiles[p2Profile] || {}).reduce((s, [k, w]) => s + (assetReturns[k]?.growth || 0) * w, 0);

      if (p2AccType === "pension" && !p2IsPartial) {
        // Full pension: 0% tax. Rollover tax-free.
      } else if (p2AccType === "pension" && p2IsPartial && p2ConvActive) {
        const retainAmt2 = assets.superAccounts.p2Super?.pensionRetainAmount ?? 5000;
        const accumPortion2 = Math.min(retainAmt2, p2SuperBal);
        const pensionPortion2 = Math.max(0, p2SuperBal - accumPortion2);
        const accumIncomeTax2 = accumPortion2 * p2IncomeRet * 0.15;
        const accumCGT2 = p2IsConversionYear ? 0 : accumPortion2 * p2GrowthRet * 0.10;
        p2SuperBal = pensionPortion2 + (accumPortion2 - accumIncomeTax2 - accumCGT2);
      } else {
        const incomeTax2 = p2SuperBal * p2IncomeRet * 0.15;
        const cgt2 = (p2IsConversionYear || p2AccType === "ttr") ? 0 : p2SuperBal * p2GrowthRet * 0.10;
        p2SuperBal -= (incomeTax2 + cgt2);
      }
      const p2Div293 = (p2Salary + (income.person2?.otherTaxable || 0)) > (legislation.superParams.div293Threshold || 250000)
        ? (p2SG + p2SalSac) * (legislation.superParams.div293Rate || 0.15) : 0;
      p2SuperBal -= p2Div293;
      p2SuperH = initHoldings(p2SuperBal, p2Profile);
    }

    // Non-super pools
    const p1NSProfile = assets.nonSuper.p1NonSuper?.profile || nonSuperProfile;
    const p2NSProfile = assets.nonSuper.p2NonSuper?.profile || nonSuperProfile;

    // Direct property running costs deducted from non-super pools
    const p1PropCosts = assets.nonSuper.p1NonSuper?.isDirectProperty ? ((assets.nonSuper.p1NonSuper?.councilRates || 0) + (assets.nonSuper.p1NonSuper?.propertyInsurance || 0) + (p1NonSuperBal * (assets.nonSuper.p1NonSuper?.agentFee || 0) / 100) + (assets.nonSuper.p1NonSuper?.repairs || 0)) : 0;
    const p2PropCosts = (isCouple && assets.nonSuper.p2NonSuper?.isDirectProperty) ? ((assets.nonSuper.p2NonSuper?.councilRates || 0) + (assets.nonSuper.p2NonSuper?.propertyInsurance || 0) + (p2NonSuperBal * (assets.nonSuper.p2NonSuper?.agentFee || 0) / 100) + (assets.nonSuper.p2NonSuper?.repairs || 0)) : 0;
    const jointPropCosts = assets.nonSuper.joint?.isDirectProperty ? ((assets.nonSuper.joint?.councilRates || 0) + (assets.nonSuper.joint?.propertyInsurance || 0) + (jointNonSuperBal * (assets.nonSuper.joint?.agentFee || 0) / 100) + (assets.nonSuper.joint?.repairs || 0)) : 0;

    const p1NSGrown = growPool(p1NonSuperH, p1NSProfile, classReturns, p1NSCostRate);
    p1NonSuperBal = p1NSGrown.total - p1PropCosts;
    p1NonSuperH = initHoldings(Math.max(0, p1NonSuperBal), p1NSProfile);

    // P2 non-super: only process when couple. Single-person scenarios keep p2NonSuperBal at 0.
    let p2NSGrown = { total: 0, holdings: {} };
    if (isCouple) {
      p2NSGrown = growPool(p2NonSuperH, p2NSProfile, classReturns, p2NSCostRate);
      p2NonSuperBal = p2NSGrown.total - p2PropCosts;
      p2NonSuperH = initHoldings(Math.max(0, p2NonSuperBal), p2NSProfile);
    }

    const jointGrown = growPool(jointNonSuperH, nonSuperProfile, classReturns, jointCostRate);
    jointNonSuperBal = jointGrown.total - jointPropCosts;

    // === Cashflow waterfall ===
    // 1) Accrue interest on cash (if positive) and on the debt account.
    //    Cash earns the cash rate only when in credit; debt always accrues at cash rate + margin.
    if (cashAccount > 0) cashAccount = cashAccount * (1 + cashRate);
    if (debtAccount > 0) debtAccount = debtAccount * (1 + debtRate);

    // Helpers for spreading deposits/withdrawals across the non-super pools
    // proportionally (so couples keep their balance split intact).
    const nsTotalNow = () => Math.max(0, jointNonSuperBal) + Math.max(0, p1NonSuperBal) + (isCouple ? Math.max(0, p2NonSuperBal) : 0);
    const drawNonSuperProportional = (amount) => {
      const total = nsTotalNow();
      if (total <= 0 || amount <= 0) return amount;
      const take = Math.min(amount, total);
      const ratio = take / total;
      jointNonSuperBal -= Math.max(0, jointNonSuperBal) * ratio;
      p1NonSuperBal   -= Math.max(0, p1NonSuperBal)   * ratio;
      if (isCouple) p2NonSuperBal -= Math.max(0, p2NonSuperBal) * ratio;
      return amount - take;
    };
    const addNonSuperProportional = (amount) => {
      const total = nsTotalNow();
      if (total <= 0) { jointNonSuperBal += amount; return; }
      jointNonSuperBal += amount * (Math.max(0, jointNonSuperBal) / total);
      p1NonSuperBal   += amount * (Math.max(0, p1NonSuperBal)   / total);
      if (isCouple) p2NonSuperBal += amount * (Math.max(0, p2NonSuperBal) / total);
    };

    // 2) Surplus distribution
    if (surplus > 0) {
      let remaining = surplus;
      if (surplusDest === "debt") {
        const repay = Math.min(debtAccount, remaining);
        debtAccount -= repay;
        remaining   -= repay;
        if (remaining > 0) cashAccount += remaining; // overflow → cash
      } else if (surplusDest === "nonSuper") {
        addNonSuperProportional(remaining);
      } else { // "cash" (default)
        cashAccount += remaining;
      }
    }

    // 3) Deficit funding (waterfall through user-defined steps)
    if (surplus < 0) {
      let need = -surplus;
      for (const step of deficitOrder) {
        if (need <= 0) break;
        if (step === "cash") {
          const take = Math.min(Math.max(0, cashAccount), need);
          cashAccount -= take;
          need -= take;
        } else if (step === "nonSuper") {
          need = drawNonSuperProportional(need);
        } else if (step === "debt") {
          debtAccount += need;
          need = 0;
        }
      }
      // Anything left over (e.g. user removed the debt step and ran out of every
      // other source) is absorbed by the debt account so the projection stays
      // self-consistent rather than silently dropping the shortfall.
      if (need > 0) { debtAccount += need; need = 0; }
    }

    // Rebalance all holdings after cashflows
    jointNonSuperH = initHoldings(Math.max(0, jointNonSuperBal), nonSuperProfile);
    p1NonSuperH = initHoldings(Math.max(0, p1NonSuperBal), p1NSProfile);
    if (isCouple) p2NonSuperH = initHoldings(Math.max(0, p2NonSuperBal), p2NSProfile);

    // Downsize (PPR) and non-PPR asset sale injection: inject proceeds BEFORE computing totalAssets.
    // Single-person scenarios redirect any stale "p2NonSuper" allocation back to p1 so proceeds can't vanish.
    assets.lifestyleAssets.forEach(a => {
      if (a.isPrimaryResidence && a.downsizeYear && year === a.downsizeYear && (a.downsizeProceeds || 0) > 0) {
        const proceeds = a.downsizeProceeds || 0;
        let dest = a.downsizeAllocateTo || "joint";
        if (!isCouple && dest === "p2NonSuper") dest = "p1NonSuper";
        if (dest === "p1NonSuper") { p1NonSuperBal += proceeds; p1NonSuperH = initHoldings(Math.max(0, p1NonSuperBal), p1NSProfile); }
        else if (dest === "p2NonSuper") { p2NonSuperBal += proceeds; p2NonSuperH = initHoldings(Math.max(0, p2NonSuperBal), p2NSProfile); }
        else { jointNonSuperBal += proceeds; jointNonSuperH = initHoldings(Math.max(0, jointNonSuperBal), nonSuperProfile); }
      }
      if (!a.isPrimaryResidence && a.saleYear && year === a.saleYear && (a.saleProceeds || 0) > 0) {
        const proceeds = a.saleProceeds || 0;
        let dest = a.saleAllocateTo || "joint";
        if (!isCouple && dest === "p2NonSuper") dest = "p1NonSuper";
        if (dest === "p1NonSuper") { p1NonSuperBal += proceeds; p1NonSuperH = initHoldings(Math.max(0, p1NonSuperBal), p1NSProfile); }
        else if (dest === "p2NonSuper") { p2NonSuperBal += proceeds; p2NonSuperH = initHoldings(Math.max(0, p2NonSuperBal), p2NSProfile); }
        else { jointNonSuperBal += proceeds; jointNonSuperH = initHoldings(Math.max(0, jointNonSuperBal), nonSuperProfile); }
      }
    });

    const totalAssets = Math.max(0, p1SuperBal) + Math.max(0, p2SuperBal) + Math.max(0, p1NonSuperBal) + Math.max(0, p2NonSuperBal) + Math.max(0, jointNonSuperBal) + Math.max(0, cashAccount);
    const totalLiab = totalDebtRemaining + Math.max(0, debtAccount);

    // Investment earnings = growth from all pools
    const postGrowthTotal = p1SuperGrown.total + (isCouple ? p2SuperGrown.total : 0) + p1NSGrown.total + p2NSGrown.total + jointGrown.total;
    const investEarnings = Math.max(0, postGrowthTotal - preGrowthTotal);

    // Grow lifestyle assets individually — EXCLUDE primary residence from investment calculations
    let lifestyleTotal = 0;
    assets.lifestyleAssets.forEach(a => {
      if (a.isPrimaryResidence) return; // PPR excluded entirely
      if (a.saleYear && year >= a.saleYear) return; // sold — remove from lifestyle chart too
      const growthRate = (a.growth || 0) / 100;
      const grownValue = (a.value || 0) * Math.pow(1 + growthRate, y);
      lifestyleTotal += Math.max(0, grownValue);
    });
    const netInvestmentAssets = totalAssets - totalLiab;

    data.push({
      year, age1, age2, period: y + 1,
      p1Salary, p2Salary, p1SG, p2SG, p1PensionDraw, p2PensionDraw, agePension, investEarnings: Math.max(0, investEarnings),
      // Tax breakdown
      p1Taxable, p2Taxable, p1IncomeTax, p2IncomeTax, p1Medicare, p2Medicare, p1Tax, p2Tax,
      p1SuperContribTax, p2SuperContribTax, totalTax, totalSuperTax,
      totalIncome: totalNetIncome, totalExpenses: totalExp + liabilityPayments,
      surplus,
      p1Super: Math.max(0, p1SuperBal), p2Super: Math.max(0, p2SuperBal),
      p1NonSuper: Math.max(0, p1NonSuperBal), p2NonSuper: Math.max(0, p2NonSuperBal), jointNonSuper: Math.max(0, jointNonSuperBal),
      cashAccount: Math.max(0, cashAccount), debtAccount: Math.max(0, debtAccount),
      cashRate, debtRate,
      totalAssets, totalLiabilities: totalLiab, deductibleInterest, totalDebtRemaining, liabilityPayments,
      netAssets: netInvestmentAssets + lifestyleTotal,
      netInvestmentAssets,
      lifestyleAssets: lifestyleTotal,
      netAssetsNominal: netInvestmentAssets + lifestyleTotal,
      netInvestmentNominal: netInvestmentAssets,
      lifestyleNominal: lifestyleTotal,
      netAssetsReal: (netInvestmentAssets + lifestyleTotal) / inflationFactor,
      netInvestmentReal: netInvestmentAssets / inflationFactor,
      lifestyleReal: lifestyleTotal / inflationFactor,
      inflationFactor,
    });
  }
  return data;
}

// ============================================================
// PROJECTIONS TAB
// ============================================================
