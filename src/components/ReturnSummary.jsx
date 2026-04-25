import { useState, useEffect, useRef } from "react";
import { COLORS } from "../data/themes";
import { fmt, pct } from "../lib/format";

export function ReturnSummary({ profile, adminFee, managementCost, adviceCost, returnProfiles, assetReturns }) {
  const rp = returnProfiles?.[profile] || returnProfiles?.["Balanced"] || {};
  const ar = assetReturns || {};
  let income = 0, growth = 0;
  for (const [cls, weight] of Object.entries(rp)) {
    const r = ar[cls];
    if (r) { income += r.income * weight; growth += r.growth * weight; }
  }
  const totalReturn = income + growth;
  const totalCosts = ((adminFee || 0) + (managementCost || 0) + (adviceCost || 0)) / 100;
  const netReturn = totalReturn - totalCosts;
  return (
    <div style={{ padding: 10, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
      <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginBottom: 8 }}>Portfolio Returns — {profile}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
        <div>
          <div style={{ color: COLORS.textDim, fontSize: 9 }}>Income Return</div>
          <div style={{ color: COLORS.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>{pct(income)}</div>
        </div>
        <div>
          <div style={{ color: COLORS.textDim, fontSize: 9 }}>Capital Growth</div>
          <div style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>{pct(growth)}</div>
        </div>
        <div>
          <div style={{ color: COLORS.textDim, fontSize: 9 }}>Gross Total</div>
          <div style={{ color: COLORS.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>{pct(totalReturn)}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, borderTop: `1px solid ${COLORS.border}`, paddingTop: 8 }}>
        <div>
          <div style={{ color: COLORS.textDim, fontSize: 9 }}>Investment Costs</div>
          <div style={{ color: COLORS.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>−{pct(totalCosts)}</div>
        </div>
        <div>
          <div style={{ color: COLORS.textDim, fontSize: 9 }}>Net Return</div>
          <div style={{ color: netReturn >= 0 ? COLORS.green : COLORS.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{pct(netReturn)}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ASSETS TAB
// ============================================================
