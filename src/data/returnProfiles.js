export const DEFAULT_RETURN_PROFILES = {
  "Cash":        { cash: 1.00, auFixedInt: 0.00, intFixedInt: 0.00, property: 0.00, auShares: 0.00, intShares: 0.00, emergingMkt: 0.00, other: 0.00 },
  "Defensive":   { cash: 0.10, auFixedInt: 0.25, intFixedInt: 0.15, property: 0.05, auShares: 0.20, intShares: 0.15, emergingMkt: 0.05, other: 0.05 },
  "Conservative":{ cash: 0.08, auFixedInt: 0.20, intFixedInt: 0.12, property: 0.10, auShares: 0.25, intShares: 0.15, emergingMkt: 0.05, other: 0.05 },
  "Balanced":    { cash: 0.05, auFixedInt: 0.15, intFixedInt: 0.10, property: 0.12, auShares: 0.28, intShares: 0.18, emergingMkt: 0.07, other: 0.05 },
  "Growth":      { cash: 0.03, auFixedInt: 0.10, intFixedInt: 0.07, property: 0.14, auShares: 0.32, intShares: 0.20, emergingMkt: 0.09, other: 0.05 },
  "Aggressive":  { cash: 0.02, auFixedInt: 0.05, intFixedInt: 0.03, property: 0.15, auShares: 0.35, intShares: 0.22, emergingMkt: 0.13, other: 0.05 },
};

export const DEFAULT_ASSET_RETURNS = {
  cash: { income: 0.045, growth: 0.0, volatility: 0.005 },
  auFixedInt: { income: 0.04, growth: 0.015, volatility: 0.04 },
  intFixedInt: { income: 0.035, growth: 0.01, volatility: 0.05 },
  property: { income: 0.04, growth: 0.04, volatility: 0.10 },
  auShares: { income: 0.04, growth: 0.055, volatility: 0.15 },
  intShares: { income: 0.02, growth: 0.06, volatility: 0.16 },
  emergingMkt: { income: 0.015, growth: 0.07, volatility: 0.22 },
  other: { income: 0.03, growth: 0.04, volatility: 0.12 },
};

export const ASSET_LABELS = { cash: "Cash", auFixedInt: "AU Fixed Interest", intFixedInt: "Int'l Fixed Interest", property: "Property", auShares: "AU Shares", intShares: "Int'l Shares", emergingMkt: "Emerging Markets", other: "Other" };
