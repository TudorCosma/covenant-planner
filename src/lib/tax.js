export function calcIncomeTax(taxableIncome, brackets) {
  let tax = 0;
  for (const b of brackets) {
    if (taxableIncome <= 0) break;
    const upper = b.max === Infinity ? taxableIncome : Math.min(taxableIncome, b.max) - b.min + 1;
    const inBracket = Math.min(Math.max(0, upper), taxableIncome - b.min + 1);
    if (inBracket > 0 && taxableIncome > b.min) {
      const amount = Math.min(inBracket, taxableIncome - b.min);
      tax += amount * b.rate;
    }
  }
  // Simplified progressive calc
  let remaining = taxableIncome;
  tax = 0;
  for (const b of brackets) {
    if (remaining <= 0) break;
    const bracketWidth = b.max === Infinity ? remaining : b.max - b.min + 1;
    const taxable = Math.min(remaining, bracketWidth);
    tax += taxable * b.rate;
    remaining -= taxable;
  }
  return Math.max(0, tax);
}

export function calcMedicare(income, params) {
  return income * params.levyRate;
}

