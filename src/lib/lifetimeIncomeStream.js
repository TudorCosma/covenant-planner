// Lifetime Income Stream (annuity / lifetime-pension) helpers.
// Implements the Centrelink 60/40 means-test rule (Social Security Act s.9BA):
//   • 60% of the purchase price is assessable as an asset until life expectancy
//     reduces to 1.0× years, then drops to 30%.
//   • 60% of the annual payment is assessable as income (lifetime products only).

const LIFE_EXP_FALLBACK = { male: { 65: 84.9 }, female: { 65: 87.7 } };

function lookupLifeExpectancy(age, gender, table) {
  const src = (table && table[gender]) || (LIFE_EXP_FALLBACK[gender] || LIFE_EXP_FALLBACK.male);
  const ages = Object.keys(src).map(Number).sort((a, b) => a - b);
  if (age <= ages[0]) return src[ages[0]] - age;
  if (age >= ages[ages.length - 1]) return Math.max(0, src[ages[ages.length - 1]] - age);
  for (let i = 0; i < ages.length - 1; i++) {
    if (age >= ages[i] && age <= ages[i + 1]) {
      const f = (age - ages[i]) / (ages[i + 1] - ages[i]);
      return (src[ages[i]] + f * (src[ages[i + 1]] - src[ages[i]])) - age;
    }
  }
  return 15;
}

// Quote the annual payment for a given purchase price assuming a fixed payment ratio.
// `paymentRate` typically 4–6% pa of purchase price for a lifetime annuity at 65.
export function quoteLifetimeIncome({ purchasePrice, paymentRate = 0.055, indexed = false, indexationRate = 0.025 }) {
  return {
    initialAnnual: purchasePrice * paymentRate,
    indexed,
    indexationRate: indexed ? indexationRate : 0,
  };
}

// Centrelink means-test treatment of a lifetime income stream.
// Returns { assessableAsset, assessableIncome }.
export function lifetimeIncomeStreamMeansTest({ purchasePrice, currentAnnualPayment, age, gender = "male", currentAge, lifeExpectancyTable }) {
  const initialLE = lookupLifeExpectancy(age, gender, lifeExpectancyTable);
  const remainingLE = lookupLifeExpectancy(currentAge || age, gender, lifeExpectancyTable);
  const reductionFactor = initialLE > 0 ? (remainingLE / initialLE) : 0;
  // 60% asset value until threshold age, 30% thereafter.
  const assetPct = reductionFactor > 0.5 ? 0.60 : 0.30;
  const assessableAsset = (purchasePrice || 0) * assetPct;
  const assessableIncome = (currentAnnualPayment || 0) * 0.60;
  return { assessableAsset, assessableIncome, initialLE, remainingLE };
}
