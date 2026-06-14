// Medicare levy (Medicare Levy Act 1986) with low-income shade-in (s.8)
// and tiered Medicare Levy Surcharge (Health Insurance Act 1973, s.8B).
// Replaces the simpler legacy calcMedicare in lib/tax.js while keeping that
// export for backward compatibility.

// Levy with shade-in: 0 below shadeIn threshold; phases in at shadeInRate per $ above
// until the full levyRate is reached at the "phase-in stops" point.
// Phase-in formula (ATO): levy = min(levyRate × MLI, shadeInRate × (MLI − threshold))
export function calcMedicareLevy(taxableIncome, medicare, opts = {}) {
  if (!medicare) return 0;
  const ti = Math.max(0, taxableIncome || 0);
  const isCouple = !!opts.isCouple;
  const isSenior = !!opts.isSenior;
  const dependents = opts.dependents || 0;

  const baseThreshold = isSenior
    ? (isCouple ? medicare.shadeInSeniorFamily : medicare.shadeInSenior)
    : (isCouple ? medicare.shadeInFamily : medicare.shadeInSingle);
  const threshold = (baseThreshold || 0) + dependents * (medicare.shadeInDependentChild || 0);
  const shadeRate = medicare.shadeInRate || 0.10;
  const levyRate = medicare.levyRate || 0.02;

  if (ti <= threshold) return 0;
  const phaseIn = (ti - threshold) * shadeRate;
  const fullLevy = ti * levyRate;
  return Math.min(phaseIn, fullLevy);
}

// MLS: tiered, only applies if no private hospital cover AND income above lowest threshold.
// Uses the "for MLS purposes" income — taxable + reportable fringe benefits + reportable super.
export function calcMLS(mlsIncome, medicare, opts = {}) {
  if (!medicare) return 0;
  if (opts.hasPrivateHealth) return 0;
  const ti = Math.max(0, mlsIncome || 0);
  const isCouple = !!opts.isCouple;
  const dependents = opts.dependents || 0;
  const childAdj = Math.max(0, dependents - 1) * (medicare.familyThresholdPerChild || 1500);
  const brackets = medicare.surchargeBrackets || [];

  for (const b of brackets) {
    if (isCouple) {
      const lo = (b.minFamily || 0) + (childAdj * (b.minFamily ? 1 : 0));
      const hi = (b.maxFamily === Infinity) ? Infinity : (b.maxFamily + childAdj);
      if (ti >= lo && ti <= hi) return ti * (b.rate || 0);
    } else {
      if (ti >= (b.minSingle || 0) && ti <= (b.maxSingle === Infinity ? Infinity : b.maxSingle)) {
        return ti * (b.rate || 0);
      }
    }
  }
  // Fallback: legacy single-threshold rate
  const legacyThreshold = isCouple ? medicare.surchargeThresholdFamily : medicare.surchargeThresholdSingle;
  if (legacyThreshold && ti > legacyThreshold) return ti * (medicare.surchargeRate || 0.01);
  return 0;
}

// Convenience: total Medicare (levy + MLS).
export function calcMedicareTotal(taxableIncome, medicare, opts = {}) {
  return calcMedicareLevy(taxableIncome, medicare, opts) + calcMLS(taxableIncome, medicare, opts);
}
