import { useState } from "react";
import { COLORS } from "../data/themes";
import { fmt } from "../lib";
import { Modal } from "./Modal";
import { Btn } from "./Btn";

// Full warning modal — same content shown by ProjectionsTab and triggered from any
// dashboard card / chart that has a DeficitWarningBadge.
export function DeficitWarningModal({ deficitInfo, state, onClose, setTab, scenarioLabel }) {
  if (!deficitInfo) return null;
  const f = deficitInfo.first;
  const goTo = (t) => { onClose && onClose(); if (setTab) setTab(t); };
  const linkStyle = { color: COLORS.accent, textDecoration: "underline", cursor: "pointer", background: "none", border: "none", padding: 0, font: "inherit" };

  const incomeLines = [
    f.p1Salary > 0 && [`${state.personal?.person1?.name || "Person 1"} salary`, f.p1Salary],
    state.personal?.isCouple && f.p2Salary > 0 && [`${state.personal?.person2?.name || "Person 2"} salary`, f.p2Salary],
    f.p1PensionDraw > 0 && [`${state.personal?.person1?.name || "Person 1"} super pension draw`, f.p1PensionDraw],
    state.personal?.isCouple && f.p2PensionDraw > 0 && [`${state.personal?.person2?.name || "Person 2"} super pension draw`, f.p2PensionDraw],
    f.agePension > 0 && ["Age Pension", f.agePension],
  ].filter(Boolean);

  const title = scenarioLabel ? `Unsustainable cashflow detected — ${scenarioLabel} scenario` : "Unsustainable cashflow detected";
  return (
    <Modal title={title} onClose={onClose} width={620}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", color: COLORS.text, fontSize: 13, lineHeight: 1.55 }}>
        <div style={{ background: `${COLORS.red}15`, border: `1px solid ${COLORS.red}50`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <strong style={{ color: COLORS.red, fontSize: 14 }}>Unsustainable spending based on income — reduce spending or increase income.</strong>
        </div>
        <p style={{ marginTop: 0 }}>
          The first deficit appears in <strong>{f.year}</strong>
          {state.personal?.isCouple
            ? ` (when ${state.personal?.person1?.name || "P1"} is ${f.age1} and ${state.personal?.person2?.name || "P2"} is ${f.age2})`
            : ` (when ${state.personal?.person1?.name || "P1"} is ${f.age1})`}
          , and continues for <strong>{deficitInfo.consecutive} consecutive year{deficitInfo.consecutive === 1 ? "" : "s"}</strong>{" "}
          (<strong>{deficitInfo.count}</strong> deficit year{deficitInfo.count === 1 ? "" : "s"} total across the projection).
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textDim, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              <button onClick={() => goTo("income")} style={linkStyle}>Income</button> — {f.year}
            </div>
            {incomeLines.length === 0 ? (
              <div style={{ fontSize: 12, color: COLORS.textMuted, fontStyle: "italic" }}>No income sources active</div>
            ) : incomeLines.map(([label, amt]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: COLORS.textMuted }}>{label}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(amt)}</span>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${COLORS.border}`, marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 12 }}>
              <span>Total income</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(f.totalIncome)}</span>
            </div>
          </div>
          <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textDim, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              <button onClick={() => goTo("expenses")} style={linkStyle}>Expenses</button> — {f.year}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: COLORS.textMuted }}>Living + recurring + one-off</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(f.totalExpenses - f.liabilityPayments)}</span>
            </div>
            {f.liabilityPayments > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: COLORS.textMuted }}>Loan repayments</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(f.liabilityPayments)}</span>
              </div>
            )}
            <div style={{ borderTop: `1px solid ${COLORS.border}`, marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 12 }}>
              <span>Total expenses</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(f.totalExpenses)}</span>
            </div>
          </div>
        </div>

        <div style={{ background: `${COLORS.red}10`, border: `1px solid ${COLORS.red}40`, borderRadius: 8, padding: 10, marginBottom: 14, display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
          <span>Net (income − expenses) for {f.year}</span>
          <span style={{ color: COLORS.red, fontVariantNumeric: "tabular-nums" }}>{fmt(f.surplus)}</span>
        </div>

        {deficitInfo.drivers.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Likely contributors this year:</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {deficitInfo.drivers.map((d, i) => (
                <li key={i} style={{ fontSize: 12, marginBottom: 3 }}>
                  <button onClick={() => goTo(d.kind === "income" ? "income" : "expenses")} style={linkStyle}>
                    {d.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p style={{ marginTop: 0 }}>
          In real life a household cashflow deficit cannot be sustained for long — usually only weeks or months, not years —
          because no bank will lend money to fund ongoing living expenses. Most people can only cope with a very brief period
          of negative cashflow before savings run out.
        </p>
        <p>
          <strong>Years of deficits should be considered a failed plan</strong> that needs emergency restructuring. If this
          model reflects a real-life scenario, please seek professional financial advice immediately.
        </p>
        <p style={{ color: COLORS.textMuted, fontSize: 11, marginBottom: 16 }}>
          Use the <button onClick={() => goTo("income")} style={linkStyle}>Income</button> tab to increase earnings, or the{" "}
          <button onClick={() => goTo("expenses")} style={linkStyle}>Expenses</button> tab to reduce spending.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn onClick={onClose} color={COLORS.accent}>OK, I understand</Btn>
        </div>
      </div>
    </Modal>
  );
}

// Small clickable red warning icon. Renders only when deficitInfo is provided. Pops the
// shared DeficitWarningModal on click. Place inside Card `actions` prop or absolutely-position
// within chart containers.
export function DeficitWarningBadge({ deficitInfo, state, setTab, scenarioLabel, size = 16, title = "Unsustainable cashflow detected — click for details" }) {
  const [open, setOpen] = useState(false);
  if (!deficitInfo) return null;
  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title={title}
        aria-label={title}
        style={{
          background: COLORS.red,
          color: "#fff",
          border: "none",
          borderRadius: "50%",
          width: size + 6,
          height: size + 6,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: Math.max(10, size - 2),
          fontWeight: 700,
          fontFamily: "'DM Sans', sans-serif",
          lineHeight: 1,
          padding: 0,
          boxShadow: `0 0 0 2px ${COLORS.red}40`,
        }}
      >!</button>
      {open && (
        <DeficitWarningModal
          deficitInfo={deficitInfo}
          state={state}
          setTab={setTab}
          scenarioLabel={scenarioLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
