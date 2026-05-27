// 9-asset-class truth table + 11 G-coded risk profiles (G0..G100).
// Source reference: institutional industry-standard asset-class breakdown used by
// Australian financial planning software. Numbers are illustrative defaults — every
// value is editable by the user in the Returns & Portfolios tab.
//
// Tax treatment note: there is intentionally ONE set of profiles. The "Taxable" vs
// "Zero-tax" variants previously stored here were identical allocations — the tax
// treatment is applied downstream by the projection engine based on the envelope
// holding the assets (super accumulation = 15% on income/realised gains, super
// pension = 0%, non-super = marginal rates with franking credits). Carrying two
// copies of the same allocation per band only created confusion.

// ----- 9 asset classes -----
export const ASSET_LABELS = {
  cash:        "Cash",
  auFixedInt:  "Domestic Fixed Interest",
  intFixedInt: "International Fixed Interest",
  auShares:    "Domestic Equity",
  intShares:   "International Equity",
  property:    "Domestic Property",
  intProperty: "International Property",
  emergingMkt: "Emerging Markets",
  alternative: "Alternative Assets",
};

// Per-asset-class assumptions: income yield, capital growth, franking %, volatility.
// Franking % matters when state.taxSettings.frankingRefundEnabled is true — the projection
// grosses up income by franking/(1-30%) and refunds excess credits.
export const DEFAULT_ASSET_RETURNS = {
  cash:        { income: 0.0425, growth: 0.000, franking: 0.00, volatility: 0.005 },
  auFixedInt:  { income: 0.0450, growth: 0.005, franking: 0.00, volatility: 0.040 },
  intFixedInt: { income: 0.0400, growth: 0.005, franking: 0.00, volatility: 0.050 },
  auShares:    { income: 0.0400, growth: 0.045, franking: 0.75, volatility: 0.150 },
  intShares:   { income: 0.0200, growth: 0.060, franking: 0.00, volatility: 0.160 },
  property:    { income: 0.0500, growth: 0.030, franking: 0.00, volatility: 0.100 },
  intProperty: { income: 0.0450, growth: 0.030, franking: 0.00, volatility: 0.110 },
  emergingMkt: { income: 0.0250, growth: 0.060, franking: 0.00, volatility: 0.220 },
  alternative: { income: 0.0300, growth: 0.045, franking: 0.00, volatility: 0.120 },
};

// 11 "G-codes" — Growth-weight bands from G0 (100% defensive) to G100 (100% growth).
// Allocations sum to 1.0 across the 9 classes. Defensive = cash + AU FI + Intl FI.
// Growth = auShares + intShares + property + intProperty + emergingMkt + alternative.
const buildBand = (defensiveWeight, growthWeight) => {
  const d = defensiveWeight;
  const g = growthWeight;
  return {
    cash:        +(d * 0.25).toFixed(4),
    auFixedInt:  +(d * 0.45).toFixed(4),
    intFixedInt: +(d * 0.30).toFixed(4),
    auShares:    +(g * 0.35).toFixed(4),
    intShares:   +(g * 0.25).toFixed(4),
    property:    +(g * 0.15).toFixed(4),
    intProperty: +(g * 0.10).toFixed(4),
    emergingMkt: +(g * 0.08).toFixed(4),
    alternative: +(g * 0.07).toFixed(4),
  };
};

// G-code → growth weight (as a fraction). 11 bands from 0% to 100% in 10% steps.
// Friendly names follow the standard industry risk-tolerance ladder.
const G_BANDS = [
  { gCode: "G0",   growth: 0.00, friendly: "Cash" },
  { gCode: "G10",  growth: 0.10, friendly: "Capital Stable" },
  { gCode: "G20",  growth: 0.20, friendly: "Defensive" },
  { gCode: "G30",  growth: 0.30, friendly: "Conservative" },
  { gCode: "G40",  growth: 0.40, friendly: "Moderately Conservative" },
  { gCode: "G50",  growth: 0.50, friendly: "Moderate" },
  { gCode: "G60",  growth: 0.60, friendly: "Balanced" },
  { gCode: "G70",  growth: 0.70, friendly: "Moderately Aggressive" },
  { gCode: "G80",  growth: 0.80, friendly: "Growth" },
  { gCode: "G90",  growth: 0.90, friendly: "High Growth" },
  { gCode: "G100", growth: 1.00, friendly: "Aggressive" },
];

function buildProfilesMap() {
  const out = {};
  const friendly = {};
  const gCodes = {};
  G_BANDS.forEach(b => {
    out[b.gCode] = buildBand(1 - b.growth, b.growth);
    const pct = Math.round(b.growth * 100);
    friendly[b.gCode] = `${b.friendly} (${pct}% growth)`;
    gCodes[b.gCode]   = b.gCode;
  });
  return { profiles: out, friendly, gCodes };
}

const built = buildProfilesMap();

export const DEFAULT_RETURN_PROFILES = built.profiles;
// Friendly consumer-facing names for each profile (used when proMode is OFF).
export const RETURN_PROFILE_FRIENDLY = built.friendly;
// G-code lookup (used when proMode is ON; shows advisors the institutional ID).
export const RETURN_PROFILE_GCODES = built.gCodes;

// Return profile display label per UI mode.
export function profileDisplayLabel(profileKey, proMode = false) {
  // Migrate legacy keys (e.g. "G60_Taxable") for display so old saved states render correctly.
  const key = LEGACY_PROFILE_MAP[profileKey] || profileKey;
  if (proMode) {
    return RETURN_PROFILE_GCODES[key] || key;
  }
  return RETURN_PROFILE_FRIENDLY[key] || key;
}

// ----- Legacy compatibility aliases -----
// Maps:
//   1. Old "Conservative"/"Balanced"/"Growth" string names from very early scenarios.
//   2. Old "_Taxable"/"_Zero" suffixed keys from the duplicated-set era.
// Both collapse onto the single current G-code set.
export const LEGACY_PROFILE_MAP = {
  // String-named legacy
  "Cash":         "G0",
  "Defensive":    "G20",
  "Conservative": "G30",
  "Moderate":     "G50",
  "Balanced":     "G60",
  "Growth":       "G80",
  "Aggressive":   "G100",
  // _Taxable / _Zero suffixed legacy (the duplicate set)
  "G0_Taxable":   "G0",   "G0_Zero":   "G0",
  "G10_Taxable":  "G10",  "G10_Zero":  "G10",
  "G20_Taxable":  "G20",  "G20_Zero":  "G20",
  "G30_Taxable":  "G30",  "G30_Zero":  "G30",
  "G40_Taxable":  "G40",  "G40_Zero":  "G40",
  "G50_Taxable":  "G50",  "G50_Zero":  "G50",
  "G60_Taxable":  "G60",  "G60_Zero":  "G60",
  "G70_Taxable":  "G70",  "G70_Zero":  "G70",
  "G80_Taxable":  "G80",  "G80_Zero":  "G80",
  "G90_Taxable":  "G90",  "G90_Zero":  "G90",
  "G100_Taxable": "G100", "G100_Zero": "G100",
};

// Resolve a profile name from any cohort (current keys, legacy keys, or unknown).
// Used by projection.js so old saved scenarios (or in-place state with legacy keys)
// continue to look up the correct allocation without any migration step.
export function resolveProfileKey(name) {
  if (DEFAULT_RETURN_PROFILES[name]) return name;
  if (LEGACY_PROFILE_MAP[name]) return LEGACY_PROFILE_MAP[name];
  return "G60"; // safe default — Balanced 60/40 split
}

// ----- Migration helpers for loaded scenarios -----
//
// Old saved JSON may carry the 22-profile legacy `returnProfiles` object (G##_Taxable
// / G##_Zero) plus account `profile` fields like "G60_Taxable". When loaded, we want
// the state to look identical to a fresh session so every consumer (projection,
// tables, charts, dropdowns) sees only the canonical 11 G-coded keys.
//
// normalizeReturnProfiles(loaded): rebuilds the 11-key map. For each canonical G-code
//   it prefers any matching custom allocation already present in the loaded data
//   (canonical first, then any of its _Taxable/_Zero aliases), otherwise falls back
//   to the current DEFAULT_RETURN_PROFILES. This preserves user-customised
//   allocations from old saves while dropping the duplicate variant.
export function normalizeReturnProfiles(loaded) {
  const src = loaded || {};
  const out = {};
  for (const gCode of Object.keys(DEFAULT_RETURN_PROFILES)) {
    out[gCode] = src[gCode] || src[`${gCode}_Taxable`] || src[`${gCode}_Zero`] || DEFAULT_RETURN_PROFILES[gCode];
  }
  return out;
}

// normalizeAccountProfile(name): runs every account.profile through resolveProfileKey
// so AssetsTab/ProjectionsTab dropdowns find a matching <option> and don't fall back
// to blank. Use during scenario load to migrate legacy values in place.
export function normalizeAccountProfile(name) {
  return resolveProfileKey(name);
}
