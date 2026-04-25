export function getMonthlyEquiv(amount, frequency) {
  if (frequency === "weekly") return amount * 52 / 12;
  if (frequency === "fortnightly") return amount * 26 / 12;
  return amount; // monthly
}

export function calcLoanPayoff(balance, rate, repaymentAmount, frequency, repaymentType, fixedRate, fixedTermMonths, termMonths) {
  if (!balance || balance <= 0) return { payoffMonth: 0, totalInterest: 0, totalPaid: 0 };
  // Simulate at actual payment frequency to capture the benefit of more frequent payments
  const periodsPerYear = frequency === "weekly" ? 52 : frequency === "fortnightly" ? 26 : 12;
  const maxPeriods = (termMonths || 360) / 12 * periodsPerYear;
  const fixedPeriods = (fixedTermMonths || 0) / 12 * periodsPerYear;
  let rem = balance;
  let totalInt = 0;
  let period = 0;
  while (rem > 0.01 && period < maxPeriods) {
    const annualRate = (period < fixedPeriods && fixedRate) ? (fixedRate / 100) : (rate / 100);
    const periodRate = annualRate / periodsPerYear;
    const intPmt = rem * periodRate;
    totalInt += intPmt;
    if (repaymentType === "io") { period++; continue; }
    const pmt = repaymentAmount > 0 ? repaymentAmount : (periodRate > 0 ? (rem * periodRate) / (1 - Math.pow(1 + periodRate, -(maxPeriods - period))) : rem / (maxPeriods - period));
    const princ = Math.max(0, pmt - intPmt);
    rem = Math.max(0, rem - princ);
    period++;
    if (princ <= 0) break;
  }
  const payoffMonths = Math.ceil(period / periodsPerYear * 12);
  return { payoffMonth: payoffMonths, totalInterest: totalInt, totalPaid: totalInt + balance };
}

// ============================================================
// PROJECTION ENGINE
// ============================================================
