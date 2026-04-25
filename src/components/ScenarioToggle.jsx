import { useState, useEffect, useRef } from "react";
import { COLORS } from "../data/themes";
import { Btn } from "./Btn";

export function ScenarioToggle({ scenario, onActivateAfter, onActivateNow, onResetAfter, afterState, tabName, readOnly }) {
  return (
    <div style={{ marginBottom: 16, borderRadius: 10, overflow: "hidden", border: `2px solid ${scenario === "after" ? COLORS.green : COLORS.border}` }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <button
          onClick={onActivateNow}
          style={{
            background: scenario === "now" ? COLORS.accent : COLORS.card,
            border: "none", padding: "12px 16px", cursor: "pointer", textAlign: "left",
            borderRight: `1px solid ${COLORS.border}`,
          }}
        >
          <div style={{ color: scenario === "now" ? "#fff" : COLORS.text, fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>📍 Now</div>
          <div style={{ color: scenario === "now" ? "#ffffffcc" : COLORS.textDim, fontSize: 10, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>Current situation — baseline</div>
        </button>
        <button
          onClick={onActivateAfter}
          style={{
            background: scenario === "after" ? COLORS.green : COLORS.card,
            border: "none", padding: "12px 16px", cursor: "pointer", textAlign: "left",
          }}
        >
          <div style={{ color: scenario === "after" ? "#fff" : COLORS.text, fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>✨ After Advice</div>
          <div style={{ color: scenario === "after" ? "#ffffffcc" : COLORS.textDim, fontSize: 10, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
            {afterState ? "Showing recommended changes" : "Tap to start modelling improvements"}
          </div>
        </button>
      </div>
      {scenario === "after" && !readOnly && (
        <div style={{ background: `${COLORS.green}15`, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: COLORS.green, fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
            ✨ You are editing the <strong>After Advice</strong> scenario for {tabName}. Changes here won't affect the baseline.
          </span>
          <button onClick={onResetAfter} style={{ background: "none", border: `1px solid ${COLORS.green}`, borderRadius: 6, color: COLORS.green, fontSize: 10, padding: "3px 8px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", marginLeft: 8 }}>
            Reset to Now
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// RETURN SUMMARY — reusable panel showing income/growth/costs/net
// ============================================================
