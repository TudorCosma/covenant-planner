import { useState, useMemo, useEffect } from "react";
import { COLORS } from "../data/themes";
import { Card } from "./Card";
import { findRuinAge } from "../lib/interpret";

// Scenario buttons — user-driven what-if exploration.
//
// Design notes (v2.1 — addresses compounding bug):
// - Each scenario's mutation is IDEMPOTENT and absolute against `nowState`.
//   Clicking "Retire +5 yrs" twice gives the same result as clicking once.
// - Multiple scenarios stack from the Now baseline. Toggling one off rebuilds
//   afterState from Now + the remaining active scenarios. No drift.
// - Scenarios in the same `group` are mutually exclusive (e.g. you can't
//   apply "Retire +2" and "Retire +5" at the same time).
// - Because clicking ANY button rebuilds afterState from Now, manual edits
//   the user made in After Advice tabs will be overwritten. This is signposted
//   in the caption — these buttons are for explore mode.
// - "Clear" button wipes the active set back to Now.

const SCENARIOS = [
  {
    id: "retLater2",
    label: "Retire 2 yrs later",
    group: "retire",
    mutate: (s, now) => {
      s.personal.person1.retirementAge = (now.personal.person1.retirementAge || 65) + 2;
      if (s.personal.isCouple) s.personal.person2.retirementAge = (now.personal.person2.retirementAge || 65) + 2;
    },
  },
  {
    id: "retLater5",
    label: "Retire 5 yrs later",
    group: "retire",
    mutate: (s, now) => {
      s.personal.person1.retirementAge = (now.personal.person1.retirementAge || 65) + 5;
      if (s.personal.isCouple) s.personal.person2.retirementAge = (now.personal.person2.retirementAge || 65) + 5;
    },
  },
  {
    id: "addSuper200",
    label: "Add $200/wk to super",
    group: "super",
    mutate: (s, now) => {
      s.income.person1.salarySacrifice = (now.income.person1.salarySacrifice || 0) + 200 * 52;
    },
  },
  {
    id: "downsize70",
    label: "Downsize home at 70",
    group: "home",
    mutate: (s, now) => {
      const startYear = new Date().getFullYear();
      const yearsTo70 = Math.max(1, 70 - (startYear - now.personal.person1.birthYear));
      const primary = s.assets.lifestyleAssets.find(a => a.isPrimaryResidence);
      const primaryNow = now.assets.lifestyleAssets.find(a => a.isPrimaryResidence);
      if (primary) {
        primary.downsizeYear = startYear + yearsTo70;
        primary.downsizeProceeds = Math.round((primaryNow?.value || primary.value || 0) * 0.30);
        primary.downsizeAllocateTo = "joint";
      }
    },
  },
  {
    id: "expensesDown10",
    label: "Reduce expenses 10%",
    group: "expenses",
    mutate: (s, now) => {
      s.expenses.lifestyleExpenses = now.expenses.lifestyleExpenses.map(e => ({ ...e, amount: Math.round((e.amount || 0) * 0.9) }));
    },
  },
];

const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map(s => [s.id, s]));

// Build a fresh afterState by cloning Now and applying every active scenario's mutation.
function buildAfter(nowState, activeIds) {
  const next = structuredClone(nowState);
  for (const id of activeIds) {
    const sc = SCENARIO_BY_ID[id];
    if (sc) sc.mutate(next, nowState);
  }
  return next;
}

// Per-group field extractors. Used to detect whether the user has manually
// edited a what-if's target fields in the After scenario (in which case
// clicking the button would silently overwrite their work). Each function
// returns a serializable snapshot of just the fields that group's mutations
// touch — so equality is JSON.stringify-comparable.
const GROUP_FIELDS = {
  retire: (s) => [s?.personal?.person1?.retirementAge, s?.personal?.person2?.retirementAge],
  super:  (s) => [s?.income?.person1?.salarySacrifice],
  home:   (s) => {
    const p = (s?.assets?.lifestyleAssets || []).find(a => a.isPrimaryResidence);
    return [p?.downsizeYear, p?.downsizeProceeds, p?.downsizeAllocateTo];
  },
  expenses: (s) => (s?.expenses?.lifestyleExpenses || []).map(e => e?.amount),
};

// A group is "manually dirty" when After's fields for that group don't match
// what buildAfter(nowState, active) would produce — i.e. the user typed
// something into those fields directly (in the Personal / Income / Assets /
// Expenses tabs) on top of (or instead of) what any active what-if did.
// When a group is dirty we (a) disable the inactive buttons in that group
// so clicking can't silently clobber the manual edit, and (b) preserve
// the dirty group's actual After values when rebuilding for a click in a
// DIFFERENT group (otherwise the full rebuild from Now would wipe them).
function isGroupDirty(group, nowState, afterState, activeIds) {
  if (!afterState) return false;
  const extract = GROUP_FIELDS[group];
  if (!extract) return false;
  const expected = buildAfter(nowState, activeIds);
  try {
    return JSON.stringify(extract(expected)) !== JSON.stringify(extract(afterState));
  } catch {
    return false;
  }
}

// Copy a group's fields from src into dst, in place. Used to re-apply
// manual After edits on top of a fresh buildAfter() so cross-group button
// clicks don't wipe untouched groups.
const GROUP_SETTERS = {
  retire: (dst, src) => {
    if (dst?.personal?.person1 && src?.personal?.person1)
      dst.personal.person1.retirementAge = src.personal.person1.retirementAge;
    if (dst?.personal?.person2 && src?.personal?.person2)
      dst.personal.person2.retirementAge = src.personal.person2.retirementAge;
  },
  super: (dst, src) => {
    if (dst?.income?.person1 && src?.income?.person1)
      dst.income.person1.salarySacrifice = src.income.person1.salarySacrifice;
  },
  home: (dst, src) => {
    const dp = (dst?.assets?.lifestyleAssets || []).find(a => a.isPrimaryResidence);
    const sp = (src?.assets?.lifestyleAssets || []).find(a => a.isPrimaryResidence);
    if (dp && sp) {
      dp.downsizeYear       = sp.downsizeYear;
      dp.downsizeProceeds   = sp.downsizeProceeds;
      dp.downsizeAllocateTo = sp.downsizeAllocateTo;
    }
  },
  expenses: (dst, src) => {
    const sList = src?.expenses?.lifestyleExpenses || [];
    const dList = dst?.expenses?.lifestyleExpenses || [];
    const n = Math.min(sList.length, dList.length);
    for (let i = 0; i < n; i++) dList[i].amount = sList[i].amount;
  },
};

// Build the next afterState from Now + active set, then re-apply any
// manually edited groups that aren't the one being toggled, so an edit in
// group A survives a click in group B.
function rebuildPreservingDirty(nowState, afterState, nextActive, dirtyMap, toggledGroup) {
  const next = buildAfter(nowState, nextActive);
  if (!afterState || !dirtyMap) return next;
  for (const g of Object.keys(GROUP_FIELDS)) {
    if (g === toggledGroup) continue;       // user is intentionally changing this group
    if (!dirtyMap[g]) continue;             // nothing to preserve
    GROUP_SETTERS[g]?.(next, afterState);   // copy dirty fields back in
  }
  return next;
}

function computeDelta(now, after) {
  if (!now?.length || !after?.length) return null;
  const last = (data) => data[data.length - 1];
  const nowEnd = last(now);
  const afterEnd = last(after);
  const endDelta = (afterEnd?.netAssets ?? 0) - (nowEnd?.netAssets ?? 0);
  const ruinNow = findRuinAge(now);
  const ruinAfter = findRuinAge(after);
  return { endDelta, ruinNow, ruinAfter };
}

export function ScenarioButtons({ nowState, setAfterState, afterState, onActivateAfter, nowProjectionData, afterProjectionData }) {
  // Component-local active set. Not persisted across reloads — the caption
  // makes it clear these are exploratory toggles.
  const [active, setActive] = useState(() => new Set());

  // If the user nukes afterState (Reset After), drop the active flags too so the UI matches.
  useEffect(() => {
    if (!afterState && active.size > 0) setActive(new Set());
  }, [afterState]);

  const delta = useMemo(() => computeDelta(nowProjectionData, afterProjectionData), [nowProjectionData, afterProjectionData]);

  // Compute per-group dirty flags ONCE per render so each button can look itself
  // up. A group is dirty when the user has manually edited its target fields
  // in After — at which point that group's buttons get disabled to prevent
  // silent overwrite. The currently-active scenario in a dirty group is the
  // exception: we still let the user click it off to remove the what-if.
  const groupDirty = useMemo(() => {
    const out = {};
    for (const g of Object.keys(GROUP_FIELDS)) {
      out[g] = isGroupDirty(g, nowState, afterState, [...active]);
    }
    return out;
  }, [nowState, afterState, active]);

  const anyDirty = Object.values(groupDirty).some(Boolean);

  const toggle = (sc) => {
    const next = new Set(active);
    if (next.has(sc.id)) {
      next.delete(sc.id);
    } else {
      // Group exclusivity — remove any other scenario in the same group first.
      if (sc.group) {
        for (const other of SCENARIOS) {
          if (other.group === sc.group && other.id !== sc.id) next.delete(other.id);
        }
      }
      next.add(sc.id);
    }
    setActive(next);
    onActivateAfter?.();
    // Rebuild afterState from Now + active mutations, preserving any
    // manual edits in groups OTHER than the one we're toggling. This keeps
    // a hand-edit in (say) "retirement age" alive when the user clicks a
    // button in "expenses" — without it, the rebuild would silently wipe
    // the retirement edit because buildAfter starts from Now every time.
    setAfterState(rebuildPreservingDirty(nowState, afterState, [...next], groupDirty, sc.group));
  };

  const clear = () => {
    setActive(new Set());
    setAfterState(structuredClone(nowState));
  };

  const fmt$ = (n) => `${n >= 0 ? "+" : ""}$${Math.abs(Math.round(n / 1000))}k`;

  return (
    <Card>
      <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>Try a what-if</div>
      <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 10, lineHeight: 1.5 }}>
        Tap any of these to add it to your "After Advice" scenario. Tap again to remove it. Each toggle rebuilds After from your Now baseline plus whatever's selected, so the result is always honest — no accumulation. All $ shown are <strong>today's dollars</strong> (the engine projects in real terms so future amounts are directly comparable to today). <em>Educational only — talk to an advisor for your own situation.</em>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SCENARIOS.map(sc => {
          const isApplied = active.has(sc.id);
          // Disable when the user has manually edited this group's fields and
          // the button isn't currently the active one in the group. (We always
          // leave the active button clickable so they can switch the what-if
          // off without having to hunt for the underlying field.)
          const dirty = sc.group ? groupDirty[sc.group] : false;
          const disabled = dirty && !isApplied;
          const title = disabled
            ? `You've manually edited ${dirtyGroupLabel(sc.group)} in your After Advice scenario. Clicking this would overwrite that. Clear the manual edit (or hit "Reset After" at the top of the page) to re-enable.`
            : undefined;
          return (
            <button
              key={sc.id}
              onClick={() => !disabled && toggle(sc)}
              disabled={disabled}
              title={title}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${isApplied ? COLORS.accent : (disabled ? `${COLORS.border}80` : COLORS.border)}`,
                background: isApplied ? `${COLORS.accent}15` : "transparent",
                color: isApplied ? COLORS.accent : (disabled ? COLORS.textDim : COLORS.text),
                fontSize: 11,
                fontWeight: 600,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.55 : 1,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {isApplied ? "✓ " : (disabled ? "🔒 " : "+ ")}{sc.label}
            </button>
          );
        })}
        {active.size > 0 && (
          <button onClick={clear} style={{
            padding: "8px 12px", borderRadius: 999,
            border: `1px dashed ${COLORS.textDim}`, background: "transparent",
            color: COLORS.textDim, fontSize: 11, fontWeight: 600, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>↺ Clear what-ifs</button>
        )}
      </div>
      {anyDirty && (
        <div style={{ marginTop: 10, padding: "8px 10px", fontSize: 11, color: COLORS.text, background: `${COLORS.orange}15`, border: `1px dashed ${COLORS.orange}80`, borderRadius: 6, lineHeight: 1.5 }}>
          🔒 Some buttons are locked because you've manually edited the fields they'd change ({Object.entries(groupDirty).filter(([, v]) => v).map(([g]) => dirtyGroupLabel(g)).join(", ")}). This prevents the buttons from quietly overwriting your hand-typed values. Clear those edits — or hit <em>Reset After</em> at the top of the page — to re-enable them.
        </div>
      )}
      {delta && afterState && (
        <div style={{ marginTop: 10, fontSize: 12, color: COLORS.text }}>
          End-of-plan net assets vs Now (today's $): <strong style={{ color: COLORS.text }}>{fmt$(delta.endDelta)}</strong>
          {delta.ruinNow !== delta.ruinAfter && (
            <span> · Money lasts {delta.ruinAfter ? `to age ${delta.ruinAfter}` : "the full plan"} (was {delta.ruinNow ? `age ${delta.ruinNow}` : "full plan"})</span>
          )}
        </div>
      )}
    </Card>
  );
}

function dirtyGroupLabel(group) {
  return {
    retire:   "retirement age",
    super:    "salary sacrifice into super",
    home:     "home downsize plan",
    expenses: "lifestyle expenses",
  }[group] || group;
}
