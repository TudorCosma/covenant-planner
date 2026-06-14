// Australian non-refundable tax offsets that reduce gross income tax but not Medicare.
// LITO and SAPTO defined under ITAA 1936/1997. Both phase out with adjusted income.

// Low Income Tax Offset — applies to every taxpayer below the cutoff.
export function calcLITO(taxableIncome, lito) {
  if (!lito) return 0;
  const ti = Math.max(0, taxableIncome || 0);
  if (ti <= (lito.fullThreshold || 37500)) return lito.max || 700;
  if (ti <= (lito.taper1Limit || 45000)) {
    return Math.max(0, (lito.max || 700) - (ti - lito.fullThreshold) * (lito.taper1Rate || 0.05));
  }
  if (ti <= (lito.cutoff || 66667)) {
    const atTaper1End = (lito.max || 700) - ((lito.taper1Limit || 45000) - (lito.fullThreshold || 37500)) * (lito.taper1Rate || 0.05);
    return Math.max(0, atTaper1End - (ti - (lito.taper1Limit || 45000)) * (lito.taper2Rate || 0.015));
  }
  return 0;
}

// Seniors & Pensioners Tax Offset — only available if eligible for age pension OR
// past Centrelink age qualifying age AND meets the income rebate income test.
// `category` is "single" | "couple" | "illnessSeparated".
export function calcSAPTO(rebateIncome, category, sapto) {
  if (!sapto) return 0;
  const cfg = sapto[category] || sapto.single;
  if (!cfg) return 0;
  const ri = Math.max(0, rebateIncome || 0);
  if (ri <= cfg.shadeIn) return cfg.max;
  if (ri >= cfg.cutoff) return 0;
  return Math.max(0, cfg.max - (ri - cfg.shadeIn) * cfg.taperRate);
}

// Apply all offsets to a gross income-tax amount (returns the reduced tax — never negative).
export function applyOffsets(grossIncomeTax, offsetTotal) {
  return Math.max(0, (grossIncomeTax || 0) - (offsetTotal || 0));
}
