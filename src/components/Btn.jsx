import { useState, useEffect, useRef } from "react";
import { COLORS } from "../data/themes";

export function Btn({ children, onClick, active, small, color = COLORS.accent, variant = "default" }) {
  const bg = variant === "outline" ? "transparent" : (active ? color : COLORS.card);
  const border = variant === "outline" ? color : (active ? color : COLORS.border);
  return (
    <button
      onClick={onClick}
      style={{
        background: bg, border: `1px solid ${border}`, borderRadius: 6, color: active ? "#fff" : COLORS.text, padding: small ? "4px 10px" : "7px 16px",
        fontSize: small ? 11 : 12, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", fontWeight: 500, transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}
