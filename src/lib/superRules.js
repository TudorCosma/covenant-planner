// Superannuation tax-side rules beyond the basic SG / contribs tax already in projection.js.
// Sources: ITAA 1997 Div 290-295, SIS Act, SIS Regulations.

// Government co-contribution (ITAA 1997 Div 290 Subdiv 290-D).
// Matches personal non-deductible contributions at coContribMatchRate up to coContribMaxAmount.
// Phases out linearly between lower and upper income thresholds.
export function calcCoContribution(personalNonDeductibleContrib, totalIncome, superParams) {
  if (!superParams) return 0;
  const sp = superParams;
  const contrib = Math.max(0, personalNonDeductibleContrib || 0);
  const income = Math.max(0, totalIncome || 0);
  if (income >= sp.coContribUpperThreshold) return 0;
  const maxMatch = Math.min(contrib * (sp.coContribMatchRate || 0.5), sp.coContribMaxAmount || 500);
  if (income <= sp.coContribLowerThreshold) return maxMatch;
  const taperRange = (sp.coContribUpperThreshold || 0) - (sp.coContribLowerThreshold || 0);
  if (taperRange <= 0) return maxMatch;
  const taperFraction = 1 - (income - sp.coContribLowerThreshold) / taperRange;
  return Math.max(0, maxMatch * taperFraction);
}

// Spouse contribution tax offset (ITAA 1997 s.290-235). 18% of contribs up to $3k
// to a spouse whose income is below $37k; phases out to $40k.
export function calcSpouseOffset(spouseContribution, spouseIncome, superParams) {
  if (!superParams) return 0;
  const sp = superParams;
  const contrib = Math.min(spouseContribution || 0, sp.spouseOffsetMaxContrib || 3000);
  const income = Math.max(0, spouseIncome || 0);
  if (income >= sp.spouseOffsetUpperIncome) return 0;
  const fullOffset = contrib * 0.18;
  if (income <= sp.spouseOffsetLowerIncome) return Math.min(fullOffset, sp.spouseOffsetMax || 540);
  const taperFraction = 1 - (income - sp.spouseOffsetLowerIncome) / ((sp.spouseOffsetUpperIncome || 40000) - (sp.spouseOffsetLowerIncome || 37000));
  return Math.max(0, Math.min(fullOffset, sp.spouseOffsetMax || 540) * taperFraction);
}

// Low Income Super Tax Offset (LISTO). Refund of 15% contribs tax up to $500
// for adjusted taxable income up to threshold (no phase-out).
export function calcLISTO(concessionalContributions, adjustedTaxableIncome, superParams) {
  if (!superParams) return 0;
  if ((adjustedTaxableIncome || 0) > (superParams.listoIncomeThreshold || 37000)) return 0;
  const refund = (concessionalContributions || 0) * 0.15;
  return Math.min(refund, superParams.listoMax || 500);
}

// Lump sum tax for the taxable component when withdrawn under preservation age but
// over age 55 (no longer relevant for new cohorts but kept for historical scenarios).
// Returns tax payable on the taxable-taxed component above the low-rate cap.
export function calcLumpSumTax(taxableComponent, age, superParams) {
  if (!superParams) return 0;
  if (age >= 60) return 0;
  const cap = superParams.lumpSumLowRateCap || 245000;
  const aboveCap = Math.max(0, (taxableComponent || 0) - cap);
  return aboveCap * (superParams.lumpSumLowRateTax || 0.15);
}

// Genuine redundancy tax-free amount (ITAA 1997 s.83-170).
export function calcRedundancyTaxFree(yearsOfService, superParams) {
  if (!superParams) return 0;
  return (superParams.redundancyBaseAmount || 0) + (yearsOfService || 0) * (superParams.redundancyServiceAmount || 0);
}

// Preservation age based on date of birth (SIS Reg 6.01). Defaults to 60 for anyone
// born on/after 1 Jul 1964. `dob` is an ISO string ("yyyy-mm-dd") or a Date.
export function getPreservationAge(dob, table) {
  if (!table || !Array.isArray(table) || table.length === 0) return 60;
  const dateStr = dob instanceof Date ? dob.toISOString().slice(0, 10) : String(dob || "");
  // Find first matching band: bornFrom <= dob < bornBefore, with either bound optional.
  for (const band of table) {
    const okFrom = !band.bornFrom || dateStr >= band.bornFrom;
    const okBefore = !band.bornBefore || dateStr < band.bornBefore;
    if (okFrom && okBefore) return band.age;
  }
  return 60;
}

// Bring-forward NCC quota — returns how much NCC is permitted this FY given prior usage.
// `bringForwardYearsUsed` is 0|1|2 (years already triggered). Returns the cap remaining.
export function calcBringForwardNCC(currentYearContrib, bringForwardYearsUsed, totalSuperBalance, superParams) {
  if (!superParams) return 0;
  if (totalSuperBalance >= (superParams.totalSuperBalanceCap || Infinity)) return 0;
  const annual = superParams.nonConcessionalCap || 120000;
  const triennial = superParams.nonConcessionalBringForward3yr || 360000;
  if ((bringForwardYearsUsed || 0) >= 2) return annual; // bring-forward already exhausted
  if ((currentYearContrib || 0) > annual) return triennial; // triggers bring-forward
  return annual;
}
