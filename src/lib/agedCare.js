// Aged Care fee calculators — two models:
//   * Aged Care Act 1997 (Bill 2013 reforms) — historical
//   * Aged Care Act 2024 (commenced 1 Jul 2025)
// User-selectable via state.agedCareModel.

// MPIR ↔ RAD/DAP conversion. RAD = lump sum bond. DAP = daily payment.
// DAP = RAD × MPIR / 365. A combined payment is allowed.
export function radToDap(rad, mpir) {
  return ((rad || 0) * (mpir || 0)) / 365;
}
export function dapToRad(dap, mpir) {
  if (!mpir) return 0;
  return ((dap || 0) * 365) / mpir;
}

// Means-tested care fee under the Aged Care Act 1997 (Bill 2013 reforms).
// Inputs: assessableIncome (annual), assessableAssets (incl. capped home value),
// isCouple, agedCareCfg (the legislation.agedCare.bill2013 object).
// Returns { dailyFee, annualFee, annualCapApplied, lifetimeCapApplied }.
export function calcAgedCareBill2013({ assessableIncome = 0, assessableAssets = 0, isCouple = false, lifetimeFeesPaid = 0, agedCareCfg }) {
  if (!agedCareCfg) return { dailyFee: 0, annualFee: 0 };
  const c = agedCareCfg;
  const incomeFree = isCouple ? c.incomeFreeAreaCouple : c.incomeFreeAreaSingle;
  const incomeComponent = Math.max(0, assessableIncome - incomeFree) * c.incomeTaperRate;

  let assetComponent = 0;
  const a = Math.max(0, assessableAssets);
  if (a > c.assetFirstThreshold) {
    const band1 = Math.min(a, c.assetSecondThreshold) - c.assetFirstThreshold;
    assetComponent += band1 * 365 * (c.assetTaperRate1 || 0);
  }
  if (a > c.assetSecondThreshold) {
    const band2 = Math.min(a, c.assetThirdThreshold) - c.assetSecondThreshold;
    assetComponent += band2 * (c.assetTaperRate2 || 0);
  }
  if (a > c.assetThirdThreshold) {
    const band3 = a - c.assetThirdThreshold;
    assetComponent += band3 * (c.assetTaperRate3 || 0);
  }

  let annual = Math.max(0, incomeComponent + assetComponent);
  const annualCap = c.meansTestedCareFeeAnnualCap || Infinity;
  const annualCapApplied = annual > annualCap;
  annual = Math.min(annual, annualCap);

  const lifetimeRemaining = Math.max(0, (c.meansTestedCareFeeLifetimeCap || Infinity) - (lifetimeFeesPaid || 0));
  const lifetimeCapApplied = annual > lifetimeRemaining;
  annual = Math.min(annual, lifetimeRemaining);

  return {
    dailyFee: annual / 365,
    annualFee: annual,
    annualCapApplied,
    lifetimeCapApplied,
    basicDailyFee: c.basicDailyFee / 365,
    basicAnnualFee: c.basicDailyFee,
  };
}

// Aged Care Act 2024 — simplified single asset taper + non-clinical care contribution cap.
// Key change from Bill 2013: rent derived from former PPR is fully assessable.
export function calcAgedCareAct2024({ assessableIncome = 0, assessableAssets = 0, isCouple = false, lifetimeContributionsPaid = 0, agedCareCfg }) {
  if (!agedCareCfg) return { dailyFee: 0, annualFee: 0 };
  const c = agedCareCfg;
  const incomeFree = isCouple ? c.incomeFreeAreaCouple : c.incomeFreeAreaSingle;
  const incomeComp = Math.max(0, assessableIncome - incomeFree) * c.incomeTaperRate;
  const assetComp = Math.max(0, assessableAssets - (c.assetFreeArea || 0)) * (c.assetTaperRate || 0.001) * 365;
  let nonClinicalContrib = Math.max(0, (incomeComp + assetComp)) * (c.nonClinicalCareContributionRate || 0.075);

  const lifetimeRemaining = Math.max(0, (c.nonClinicalCareCap || Infinity) - (lifetimeContributionsPaid || 0));
  const lifetimeCapApplied = nonClinicalContrib > lifetimeRemaining;
  nonClinicalContrib = Math.min(nonClinicalContrib, lifetimeRemaining);

  return {
    dailyFee: nonClinicalContrib / 365,
    annualFee: nonClinicalContrib,
    basicDailyFee: c.basicDailyFee / 365,
    basicAnnualFee: c.basicDailyFee,
    accommodationContribDailyMax: c.accommodationContributionDailyMax || 0,
    hotelingSupplementMax: c.hotelingSupplementMax || 0,
    lifetimeCapApplied,
  };
}

// Home Care Package — annual subsidy + basic daily fee + income-tested fee.
export function calcHomeCarePackage({ packageLevel = 1, assessableIncome = 0, agePensionRate = 29754, hcpCfg }) {
  if (!hcpCfg) return { annualSubsidy: 0, basicDailyFee: 0, incomeTestedFee: 0 };
  const subsidy = hcpCfg.levels[Math.max(0, Math.min(3, packageLevel - 1))] || 0;
  const basicDailyFee = agePensionRate * (hcpCfg.basicDailyFeeRate || 0.175);
  const incomeTestedFee = Math.min(hcpCfg.incomeTestedFeeMax || 0, Math.max(0, assessableIncome - 30000) * 0.5);
  return { annualSubsidy: subsidy, basicDailyFee, incomeTestedFee, total: subsidy - basicDailyFee - incomeTestedFee };
}

// Dispatcher — pick the model based on state.agedCareModel.
export function calcAgedCare(model, opts) {
  if (model === "bill2013" && opts.legislation?.agedCare?.bill2013) {
    return calcAgedCareBill2013({ ...opts, agedCareCfg: opts.legislation.agedCare.bill2013 });
  }
  if (opts.legislation?.agedCare?.act2024) {
    return calcAgedCareAct2024({ ...opts, agedCareCfg: opts.legislation.agedCare.act2024 });
  }
  return { dailyFee: 0, annualFee: 0 };
}
