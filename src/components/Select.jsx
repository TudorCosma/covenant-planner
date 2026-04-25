import { useState, useEffect, useRef } from "react";
import { COLORS } from "../data/themes";

export function Select({ label, value, onChange, options, small }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label style={{ color: COLORS.textMuted, fontSize: small ? 11 : 12, fontFamily: "'DM Sans', sans-serif" }}>{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: COLORS.inputBg, border: `1px solid ${COLORS.inputBorder}`, borderRadius: 6, color: COLORS.inputText || COLORS.text, padding: "6px 10px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
