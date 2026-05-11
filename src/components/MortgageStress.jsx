import { useState } from "react";
import { COLORS } from "../data/themes";
import { fmt } from "../lib";
import { Modal } from "./Modal";
import { Btn } from "./Btn";

export function MortgageStressModal({ debtRepayments, netIncome, dsr, onClose, setTab }) {
  const goTo = (t) => { onClose && onClose(); if (setTab) setTab(t); };
  const linkStyle = { color: COLORS.accent, textDecoration: "underline", cursor: "pointer", background: "none", border: "none", padding: 0, font: "inherit" };
  const dsrPct = `${(dsr * 100).toFixed(1)}%`;

  return (
    <Modal title="Mortgage Stress Detected" onClose={onClose} width={580}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", color: COLORS.text, fontSize: 13, lineHeight: 1.6 }}>
        <div style={{ background: `${COLORS.red}15`, border: `1px solid ${COLORS.red}50`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <strong style={{ color: COLORS.red, fontSize: 14 }}>
            Debt servicing is {dsrPct} of net income — above the 30% mortgage stress threshold.
          </strong>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Annual repayments", value: fmt(debtRepayments), color: COLORS.red },
            { label: "Net income (after tax)", value: fmt(netIncome), color: COLORS.text },
            { label: "Debt servicing ratio", value: dsrPct, color: COLORS.red },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color }}>{value}</div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 0 }}>
          You are experiencing <strong>Mortgage Stress</strong> and should address this urgently. Any unexpected event — redundancy, illness, an interest rate rise, or a major expense — could quickly push you into <strong>mortgage default</strong>.
        </p>
        <p>
          A debt servicing ratio above 30% of net income is widely recognised by ASIC, the RBA, and major lenders as the stress threshold — the point at which households become financially vulnerable to default.
        </p>
        <p>
          Seek professional advice from a <strong>financial advisor</strong> or a <strong>mortgage broker</strong> about your options if you are not able to increase your income or reduce your debt to bring this ratio below 30%.
        </p>

        <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Options to explore</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li style={{ marginBottom: 6 }}>
              <button onClick={() => goTo("income")} style={linkStyle}>Increase income</button>
              {" "}— review salary, rental income, dividends, or other sources in the{" "}
              <button onClick={() => goTo("income")} style={linkStyle}>Income tab</button>.
            </li>
            <li style={{ marginBottom: 6 }}>
              <button onClick={() => goTo("liabilities")} style={linkStyle}>Reduce debt obligations</button>
              {" "}— review loan balances, interest rates, and repayment strategy in the{" "}
              <button onClick={() => goTo("liabilities")} style={linkStyle}>Liabilities tab</button>.
            </li>
            <li style={{ marginBottom: 6 }}>
              Refinance to a lower interest rate or extend the loan term to reduce required repayments.
            </li>
            <li>
              Sell a non-essential asset to reduce the outstanding principal and bring repayments down.
            </li>
          </ul>
        </div>

        <p style={{ color: COLORS.textMuted, fontSize: 11, marginBottom: 16 }}>
          Educational tool only — not financial advice. This ratio uses projected net income after income tax and Medicare levy. Always seek advice from a licensed Australian financial adviser or credit licensee before making decisions about your debt.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn onClick={onClose} color={COLORS.accent}>OK, I understand</Btn>
        </div>
      </div>
    </Modal>
  );
}

export function MortgageStressBadge({ debtRepayments, netIncome, dsr, setTab, size = 16 }) {
  const [open, setOpen] = useState(false);
  if (!dsr || dsr <= 0.3) return null;
  const dsrPct = `${(dsr * 100).toFixed(1)}%`;
  const title = `Mortgage stress: debt repayments are ${dsrPct} of net income (above 30% threshold). Click for details.`;
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
        <MortgageStressModal
          debtRepayments={debtRepayments}
          netIncome={netIncome}
          dsr={dsr}
          setTab={setTab}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
