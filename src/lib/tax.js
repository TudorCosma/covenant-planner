// Progressive income tax (ITAA 1997). Brackets are { min, max, rate } where `min`
// is the first dollar taxed at `rate` (e.g. 18201) and `max` is the last dollar in
// the band (e.g. 45000). The effective lower edge of a band — the last dollar NOT
// taxed at this rate — is `min - 1`, so the amount taxed in a band is
// `min(income, max) - (min - 1)`. This reproduces the ATO marginal calculation
// exactly (no off-by-one at boundaries).
export function calcIncomeTax(taxableIncome, brackets) {
  const ti = Math.max(0, taxableIncome || 0);
  let tax = 0;
  for (const b of brackets) {
    const lowerEdge = Math.max(0, (b.min || 0) - 1);
    if (ti <= lowerEdge) break;
    const upperEdge = b.max === Infinity ? ti : b.max;
    const amountInBand = Math.min(ti, upperEdge) - lowerEdge;
    if (amountInBand > 0) tax += amountInBand * b.rate;
  }
  return Math.max(0, tax);
}

export function calcMedicare(income, params) {
  return income * params.levyRate;
}

