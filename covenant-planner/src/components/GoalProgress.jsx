import { useMemo } from "react";
import { COLORS } from "../data/themes";
import { computeGoalProgress } from "../lib/goalProgress";
import { Card } from "./Card";

// Goal Progress — one bar per user-set goal. Retirement expands into 3 sub-bars
// (target age, target income, longevity). Below-100% bars expand to show the
// lever-nudge card with the educational disclaimer.

function Bar({ pct, achieved }) {
  const w = Math.max(0, Math.min(1, pct)) * 100;
  const color = achieved ? "#7fb069" : (pct >= 0.66 ? COLORS.accent : "#cfc090");
  return (
    <div style={{ height: 8, background: `${COLORS.border}80`, borderRadius: 4, overflow: "hidden", margin: "4px 0" }}>
      <div style={{ height: "100%", width: `${w}%`, background: color, transition: "width 0.4s ease", borderRadius: 4 }} />
    </div>
  );
}

function LeverNudge({ goalKind, onOpenScenarios }) {
  const levers = {
    retirement: [
      { label: "Working longer or semi-retiring",       principle: "delays drawing on savings and adds contributions — usually the highest-leverage single change" },
      { label: "Reducing regular ongoing expenses",     principle: "compounds over decades — typically more impact than cutting one-off expenses" },
      { label: "Reviewing your savings/investment mix", principle: "small return differences compound into large dollar differences over 20–30 years" },
      { label: "Adjusting the goal itself",             principle: "the goal you set might not be the one that matters to you most" },
    ],
    house:      [{ label: "Reducing non-essential expenses", principle: "frees up surplus that compounds into deposit faster" }, { label: "Increasing savings rate", principle: "the single biggest driver of how soon you reach a fixed-$ goal" }, { label: "Adjusting the target year", principle: "later target gives compounding more time to do the heavy lifting" }],
    sabbatical: [{ label: "Building a separate savings buffer", principle: "ring-fences sabbatical funds from retirement capital" }, { label: "Reducing planned expenses during the break", principle: "lowers the required pot" }],
    debt:       [{ label: "Extra repayments on high-rate debt", principle: "high-interest debt is usually the highest-return 'investment' available" }, { label: "Consolidating debts", principle: "can reduce average rate and simplify payments" }],
  }[goalKind] || [{ label: "Adjust the goal itself", principle: "if it no longer reflects what matters to you" }];

  return (
    <div style={{ marginTop: 10, padding: 12, background: `${COLORS.accent}10`, border: `1px dashed ${COLORS.accent}40`, borderRadius: 8, fontSize: 11, lineHeight: 1.5 }}>
      <div style={{ fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>Levers in this app that tend to move this number</div>
      <ul style={{ margin: 0, paddingLeft: 16, color: COLORS.textDim }}>
        {levers.map((l, i) => (
          <li key={i} style={{ marginBottom: 4 }}>
            <span style={{ color: COLORS.text, fontWeight: 500 }}>{l.label}</span> — {l.principle}
          </li>
        ))}
      </ul>
      {onOpenScenarios && (
        <button onClick={onOpenScenarios} style={{
          marginTop: 8, padding: "5px 10px", background: COLORS.accent, color: "#fff",
          border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
        }}>Try a what-if →</button>
      )}
      <div style={{ marginTop: 8, fontStyle: "italic", color: COLORS.textDim, fontSize: 10 }}>
        Educational information about how to use this tool — not personal financial advice. A planner who knows your full situation can help you decide which (if any) of these makes sense for you. Nothing beats a good second opinion.
      </div>
    </div>
  );
}

export function GoalProgress({ projectionData, state, onEditGoals, onOpenScenarios }) {
  const progress = useMemo(() => computeGoalProgress(projectionData, state), [projectionData, state]);
  const goals = state.goals || [];

  if (goals.length === 0) {
    return (
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>Your goals</div>
          <button onClick={onEditGoals} style={{ background: COLORS.accent, color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>+ Add a goal</button>
        </div>
        <div style={{ fontSize: 12, color: COLORS.textDim, lineHeight: 1.5 }}>
          You haven't set any goals yet. Goals are what you're trying to achieve with your money — retire by a certain age, buy a house, take a sabbatical, etc. Add one and you'll see a progress bar showing how the current plan tracks against it.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>Your goals</div>
        <button onClick={onEditGoals} style={{ background: "transparent", color: COLORS.accent, border: `1px solid ${COLORS.accent}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Edit goals</button>
      </div>
      {progress.map((p, i) => {
        const g = p.goal;
        return (
          <div key={g.id} style={{ paddingBottom: i < progress.length - 1 ? 12 : 0, marginBottom: i < progress.length - 1 ? 12 : 0, borderBottom: i < progress.length - 1 ? `1px solid ${COLORS.border}80` : "none" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>{g.label}</div>
            {p.sub ? (
              p.sub.map(sub => (
                <div key={sub.id} style={{ marginTop: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.textDim, marginBottom: 2 }}>
                    <span>{sub.label}</span>
                    <span style={{ color: sub.achieved ? "#7fb069" : COLORS.text }}>{sub.summary}</span>
                  </div>
                  <Bar pct={sub.pct} achieved={sub.achieved} />
                </div>
              ))
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.textDim, marginBottom: 2 }}>
                  <span>{Math.round((p.pct || 0) * 100)}% of goal</span>
                  <span style={{ color: p.achieved ? "#7fb069" : COLORS.text }}>{p.summary}</span>
                </div>
                <Bar pct={p.pct} achieved={p.achieved} />
              </>
            )}
            {/* Lever nudge for goals tracking below 100% (or whose sub-bars all below 100%) */}
            {!p.achieved && (!p.sub || p.sub.some(s => !s.achieved)) && !p.manual && (
              <LeverNudge goalKind={g.kind} onOpenScenarios={onOpenScenarios} />
            )}
          </div>
        );
      })}
    </Card>
  );
}
