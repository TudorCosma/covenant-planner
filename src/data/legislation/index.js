// Legislation registry — switch FY to load a different rule set. Each file is a
// complete snapshot for that financial year. The active set is stored on state
// as `state.legislation` (the loaded snapshot) and `state.legislationFY` (the key).
import fy2023_24 from "./fy2023-24";
import fy2024_25 from "./fy2024-25";
import fy2025_26 from "./fy2025-26";
import fy2026_27 from "./fy2026-27";

export const LEGISLATION_REGISTRY = {
  "fy2023-24": fy2023_24,
  "fy2024-25": fy2024_25,
  "fy2025-26": fy2025_26,
  "fy2026-27": fy2026_27,
};

export const FY_OPTIONS = [
  { key: "fy2023-24", label: "FY 2023-24 (historical)" },
  { key: "fy2024-25", label: "FY 2024-25 (historical)" },
  { key: "fy2025-26", label: "FY 2025-26 (current)" },
  { key: "fy2026-27", label: "FY 2026-27 (projected)" },
];

export const DEFAULT_FY = "fy2025-26";

// Returns a deep-cloned legislation snapshot for a given FY key. Cloning is
// essential — direct references would let user edits in one scenario leak
// into the registry and contaminate every other scenario.
// `structuredClone` preserves `Infinity` and other non-finite numbers (JSON
// would replace them with `null`, which would silently drop the open-ended top
// tax bracket and top MLS tier — producing $0 tax at high incomes).
export function loadLegislation(fyKey) {
  const src = LEGISLATION_REGISTRY[fyKey] || LEGISLATION_REGISTRY[DEFAULT_FY];
  if (typeof structuredClone === "function") return structuredClone(src);
  // Fallback for old browsers: hand-roll a clone that preserves Infinity.
  return cloneWithInfinity(src);
}

function cloneWithInfinity(v) {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(cloneWithInfinity);
  const out = {};
  for (const k of Object.keys(v)) out[k] = cloneWithInfinity(v[k]);
  return out;
}
