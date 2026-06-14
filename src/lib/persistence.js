// Local persistence — the entire plan is saved to the user's browser (localStorage)
// after every change, so a refresh, browser close, or accidental tab close never
// loses work. There's no backend; the data never leaves the device.
//
// Versioned key — bump SCHEMA_VERSION if we ever change the shape in a way that
// older saves can't round-trip cleanly. On a version mismatch we fall through to
// DEFAULT_STATE rather than crashing.
import { DEFAULT_STATE } from "../data/defaultState";

const STORAGE_KEY = "covenantPlanner.v1";
// Bumped to 2 (May 2026) when the sample-client baseline was removed from
// DEFAULT_STATE. Any v1 saved plan still contains the Michael/Sarah demo
// numbers; dropping those saves on load forces the wizard to re-run with the
// new blank baseline. Real user data was never durable here anyway — every
// existing v1 save is a half-explored demo, not a finished plan. (If we ever
// ship a true migration, do it inline in loadState() before returning.)
const SCHEMA_VERSION = 2;

export function saveState({ state, afterState, afterDirty, scenario, theme }) {
  try {
    const payload = {
      v: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      state,
      afterState,
      afterDirty,
      scenario,
      theme,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (e) {
    // QuotaExceeded, private-mode block, JSON cycle, etc. — fail quietly; the
    // app still works, the user just loses the autosave guarantee for this session.
    console.warn("[persistence] save failed:", e);
    return false;
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== SCHEMA_VERSION) return null;
    if (!parsed.state) return null;
    return parsed;
  } catch (e) {
    console.warn("[persistence] load failed:", e);
    return null;
  }
}

export function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
}

// Plain-language privacy notice surfaced in the Save menu and import/export UI.
// There is no backend: the plan lives only in this browser's localStorage and in
// any .json file the user exports themselves. Anyone with access to the device /
// browser profile can read it, and clearing browser data erases it.
export const PRIVACY_NOTE =
  "Your plan is stored only in this browser (not encrypted) and never sent to a server. " +
  "Anyone who can use this device can open it. Clearing your browser data will erase it — " +
  "export a backup file to keep a copy.";

// Structural validation for an imported plan. The file is fully untrusted (it can
// come from anyone, be hand-edited, or be a different app's JSON), so we verify the
// shape the app actually relies on before letting it replace live state. We check
// structure, not values — the engine clamps/derives numbers, but a missing object
// (e.g. assets.superAccounts) would crash a tab on first render.
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function validatePlanState(s, who) {
  if (!isObj(s)) throw new Error(`This file's "${who}" data is missing or malformed.`);
  if (!isObj(s.personal) || !isObj(s.personal.person1) || !isObj(s.personal.person2)) {
    throw new Error(`This file's "${who}" data is missing personal details.`);
  }
  if (!isObj(s.income) || !isObj(s.income.person1) || !isObj(s.income.person2)) {
    throw new Error(`This file's "${who}" data is missing income details.`);
  }
  if (!isObj(s.assets) || !isObj(s.assets.superAccounts) || !isObj(s.assets.nonSuper)) {
    throw new Error(`This file's "${who}" data is missing asset details.`);
  }
  if (!isObj(s.expenses)) {
    throw new Error(`This file's "${who}" data is missing expense details.`);
  }
}

// Recursively fill any keys an imported plan omits from DEFAULT_STATE, while letting every
// value the file DOES provide win. This guarantees the engine never hits an undefined nested
// account (e.g. a file with `superAccounts: {}` gets the default p1Super back) even though the
// container-level validation above passed. Arrays are taken wholesale from the file when
// present (so editing one row replaces the list as intended), else cloned from defaults.
function mergeWithDefaults(def, inc) {
  if (Array.isArray(def)) return Array.isArray(inc) ? inc : structuredClone(def);
  if (isObj(def)) {
    if (!isObj(inc)) return structuredClone(def);
    const out = {};
    for (const k of Object.keys(def)) out[k] = mergeWithDefaults(def[k], inc[k]);
    // Preserve keys the file has that defaults don't (custom return profiles, goals, etc.).
    for (const k of Object.keys(inc)) if (!(k in out)) out[k] = inc[k];
    return out;
  }
  return inc === undefined ? def : inc;
}

// Validate an untrusted plan, then default-merge it so it's safe to hand to the engine.
// Throws (with a human-readable message) if the file is fundamentally the wrong shape.
export function coercePlanState(s, who = "Now") {
  validatePlanState(s, who);
  return mergeWithDefaults(DEFAULT_STATE, s);
}

// Download the current plan as a .json file the user can email to themselves,
// keep in iCloud / Drive, or share with their adviser. This is the durable
// backup; localStorage is the day-to-day autosave.
export function exportPlanToFile({ state, afterState, afterDirty, scenario, theme }) {
  const payload = {
    v: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: "Covenant Wealth Planner",
    state, afterState, afterDirty, scenario, theme,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  const who = (state?.personal?.person1?.name || "plan").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  a.href = url;
  a.download = `covenant-plan-${who}-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Read a user-chosen file and return the parsed payload (or throw with a
// human-readable message that the caller can show in a toast/modal).
export function importPlanFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read the file. Please try again."));
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!isObj(parsed)) {
          throw new Error("This file doesn't look like a Covenant Wealth plan.");
        }
        if (parsed.v !== SCHEMA_VERSION) {
          throw new Error(`Plan was saved in a different app version (v${parsed.v}). Cannot import.`);
        }
        // Validate + default-merge the live "Now" scenario, and "After Advice" if present.
        // Merging onto DEFAULT_STATE backfills any keys the file omits so the engine never
        // hits an undefined account, while still letting every provided value win.
        parsed.state = coercePlanState(parsed.state, "Now");
        if (parsed.afterState != null) parsed.afterState = coercePlanState(parsed.afterState, "After Advice");
        // Coerce remaining top-level fields to safe types so a hand-edited file can't
        // inject unexpected shapes downstream.
        if (parsed.scenario !== "now" && parsed.scenario !== "after") parsed.scenario = "now";
        if (typeof parsed.theme !== "string") parsed.theme = undefined;
        parsed.afterDirty = Boolean(parsed.afterDirty);
        resolve(parsed);
      } catch (e) {
        reject(e instanceof Error ? e : new Error("File is not valid JSON."));
      }
    };
    reader.readAsText(file);
  });
}
