import { useMemo } from "react";
import { COLORS } from "../data/themes";
import { Card } from "./Card";
import { findRuinAge } from "../lib/interpret";

// Scenario buttons — user-driven what-if exploration. Each button applies a
// deterministic mutation to afterState; the existing Value-of-Advice card
// handles the before/after delta. Wording is "explore"/"try", never "improve".

const SCENARIOS = [
  {
    id: "retLater2",
    label: "Retire 2 yrs later",
    mutate: (s) => {
      s.personal.person1.retirementAge += 2;
      if (s.personal.isCouple) s.personal.person2.retirementAge += 2;
      return s;
    },
  },
  {
    id: "retLater5",
    label: "Retire 5 yrs later",
    mutate: (s) => {
      s.personal.person1.retirementAge += 5;
      if (s.personal.isCouple) s.personal.person2.retirementAge += 5;
      return s;
    },
  },
  {
    id: "addSuper200",
    label: "Add $200/wk to super",
    mutate: (s) => {
      s.income.person1.salarySacrifice = (s.income.person1.salarySacrifice || 0) + 200 * 52;
      return s;
    },
  },
  {
    id: "downsize70",
    label: "Downsize home at 70",
    mutate: (s) => {
      const startYear = new Date().getFullYear();
      const yearsTo70 = Math.max(1, 70 - (startYear - s.personal.person1.birthYear));
      const primary = s.assets.lifestyleAssets.find(a => a.isPrimaryResidence);
      if (primary) {
        primary.downsizeYear = startYear + yearsTo70;
        primary.downsizeProceeds = Math.round((primary.value || 0) * 0.30);
        primary.downsizeAllocateTo = "joint";
      }
      return s;
    },
  },
  {
    id: "expensesDown10",
    label: "Reduce expenses 10%",
    mutate: (s) => {
      s.expenses.lifestyleExpenses = s.expenses.lifestyleExpenses.map(e => ({ ...e, amount: Math.round((e.amount || 0) * 0.9) }));
      return s;
    },
  },
];

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
  const delta = useMemo(() => computeDelta(nowProjectionData, afterProjectionData), [nowProjectionData, afterProjectionData]);
  // Detect which scenarios are "applied" by comparing afterState vs nowState on the relevant fields.
  // Light heuristic; clear-all reset handled by parent's resetAfter.
  const applied = (id) => {
    if (!afterState) return false;
    if (id === "retLater2") return afterState.personal.person1.retirementAge >= nowState.personal.person1.retirementAge + 2 && afterState.personal.person1.retirementAge < nowState.personal.person1.retirementAge + 5;
    if (id === "retLater5") return afterState.personal.person1.retirementAge >= nowState.personal.person1.retirementAge + 5;
    if (id === "addSuper200") return (afterState.income.person1.salarySacrifice || 0) > (nowState.income.person1.salarySacrifice || 0);
    if (id === "downsize70") return afterState.assets.lifestyleAssets.find(a => a.isPrimaryResidence)?.downsizeYear > 0;
    if (id === "expensesDown10") {
      const nowSum = nowState.expenses.lifestyleExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const afterSum = afterState.expenses.lifestyleExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      return afterSum < nowSum * 0.95;
    }
    return false;
  };

  const handleApply = (sc) => {
    onActivateAfter?.();
    setAfterState(prev => {
      const next = structuredClone(prev || nowState);
      return sc.mutate(next);
    });
  };

  const fmt$ = (n) => `${n >= 0 ? "+" : ""}$${Math.abs(Math.round(n / 1000))}k`;

  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>Try a what-if</div>
      <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 10, lineHeight: 1.5 }}>
        Tap any of these to apply them to your "After Advice" scenario and see the impact. They're your choices to try — not recommendations. <em>Educational only — talk to an advisor for your own situation.</em>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SCENARIOS.map(sc => {
          const isApplied = applied(sc.id);
          return (
            <button
              key={sc.id}
              onClick={() => handleApply(sc)}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${isApplied ? COLORS.accent : COLORS.border}`,
                background: isApplied ? `${COLORS.accent}15` : "transparent",
                color: isApplied ? COLORS.accent : COLORS.text,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {isApplied ? "✓ " : "+ "}{sc.label}
            </button>
          );
        })}
      </div>
      {delta && afterState && (
        <div style={{ marginTop: 10, fontSize: 11, color: COLORS.textDim }}>
          End-of-plan delta vs Now: <strong style={{ color: COLORS.text }}>{fmt$(delta.endDelta)}</strong>
          {delta.ruinNow !== delta.ruinAfter && (
            <span> · Money lasts {delta.ruinAfter ? `to age ${delta.ruinAfter}` : "the full plan"} (was {delta.ruinNow ? `age ${delta.ruinNow}` : "full plan"})</span>
          )}
        </div>
      )}
    </Card>
  );
}
