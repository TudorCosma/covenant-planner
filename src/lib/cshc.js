// Commonwealth Seniors Health Card — eligibility test only (the card itself
// has no payment; it confers discounts on PBS scripts, bulk-billed visits, etc.).
// Income test = adjusted taxable income + deemed income from ABPs commenced
// on/after 1 Jan 2015.

import { calcDeemedIncome } from "./centrelink";

export function isCSHCEligible({ age, adjustedTaxableIncome = 0, postJan2015ABPBalance = 0, isCouple = false, illnessSeparated = false, dependentChildren = 0, centrelink, cshc }) {
  if (!cshc || !centrelink) return { eligible: false, reason: "missing legislation" };
  if (age < centrelink.ageQualifyingAge) return { eligible: false, reason: "below age qualifying age" };

  let limit;
  if (illnessSeparated) limit = cshc.illnessSeparatedLimit;
  else if (isCouple)   limit = cshc.coupleIncomeLimit;
  else                 limit = cshc.singleIncomeLimit;
  limit += (dependentChildren || 0) * (cshc.perChildAdjustment || 0);

  let testedIncome = adjustedTaxableIncome || 0;
  if (cshc.deemingApplies && postJan2015ABPBalance > 0) {
    testedIncome += calcDeemedIncome(postJan2015ABPBalance, isCouple, centrelink);
  }

  return { eligible: testedIncome <= limit, testedIncome, limit };
}
