import { useState, useEffect, useRef } from "react";
import { COLORS } from "../data/themes";

export function StatCard({ label, value, sub, color = COLORS.accent }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ color: COLORS.textDim, fontSize: 11, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{sub}</div>}
    </div>
  );
}
