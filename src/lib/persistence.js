// Local persistence — the entire plan is saved to the user's browser (localStorage)
// after every change, so a refresh, browser close, or accidental tab close never
// loses work. There's no backend; the data never leaves the device.
//
// Versioned key — bump SCHEMA_VERSION if we ever change the shape in a way that
// older saves can't round-trip cleanly. On a version mismatch we fall through to
// DEFAULT_STATE rather than crashing.
const STORAGE_KEY = "covenantPlanner.v1";
const SCHEMA_VERSION = 1;

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
        if (!parsed || !parsed.state || !parsed.state.personal) {
          throw new Error("This file doesn't look like a Covenant Wealth plan.");
        }
        if (parsed.v !== SCHEMA_VERSION) {
          throw new Error(`Plan was saved in a different app version (v${parsed.v}). Cannot import.`);
        }
        resolve(parsed);
      } catch (e) {
        reject(e instanceof Error ? e : new Error("File is not valid JSON."));
      }
    };
    reader.readAsText(file);
  });
}
