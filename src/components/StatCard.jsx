import { useState, useEffect, useRef } from "react";
import { COLORS } from "../data/themes";

export function StatCard({ label, value, sub, color = COLORS.accent }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: COLORS.radius ?? 10, padding: "16px 20px", boxShadow: COLORS.cardShadow }}>
      <div style={{ color: COLORS.text, fontSize: 12, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ color: COLORS.text, fontSize: 12, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{sub}</div>}
    </div>
  );
}
