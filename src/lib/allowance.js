// JobSeeker Payment and Commonwealth Seniors Health Card eligibility / payment calcs.
// Asset cut-offs reuse the same thresholds defined in legislation.centrelink.

// JobSeeker annual payment for a single year. Returns 0 if any disqualifier triggers.
export function calcJobSeeker({ age, isWorking = false, fortnightlyIncome = 0, totalAssets = 0, isHomeowner = true, isCouple = false, hasDependents = false, allowance, centrelink }) {
  if (!allowance || !centrelink) return 0;
  if (age < 22 || age >= centrelink.ageQualifyingAge) return 0;
  // Asset test: same thresholds as age pension
  const assetLimit = isCouple
    ? (isHomeowner ? centrelink.coupleAssetCutoffHomeowner : centrelink.coupleAssetCutoffNonHomeowner)
    : (isHomeowner ? centrelink.singleAssetCutoffHomeowner : centrelink.singleAssetCutoffNonHomeowner);
  if (totalAssets > (assetLimit || Infinity)) return 0;

  const annualIncome = (fortnightlyIncome || 0) * 26;
  const freeArea = allowance.jobSeekerIncomeFreeArea || 3380;
  const band1Top = allowance.jobSeekerIncomeTaperBand1 || 5876;
  const band1Rate = allowance.jobSeekerTaperBand1Rate || 0.50;
  const band2Rate = allowance.jobSeekerTaperBand2Rate || 0.60;

  let reduction = 0;
  if (annualIncome > freeArea) {
    const band1Amount = Math.min(annualIncome, band1Top) - freeArea;
    reduction += Math.max(0, band1Amount) * band1Rate;
  }
  if (annualIncome > band1Top) {
    reduction += (annualIncome - band1Top) * band2Rate;
  }

  let maxRate = isCouple
    ? allowance.jobSeekerCouplePerPerson
    : (hasDependents ? allowance.jobSeekerSingleWithChildren : allowance.jobSeekerSingleNoChildren);
  if (age >= 60 && !isCouple) {
    maxRate = Math.max(maxRate, allowance.jobSeeker60Plus9Months || 0);
  }
  return Math.max(0, (maxRate || 0) - reduction);
}
