import { useState, useEffect, useRef } from "react";
import { COLORS } from "../data/themes";

export function HeaderBtn({ children, onClick, color = COLORS.textDim }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", color, fontWeight: 500, fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", padding: "8px 6px", textAlign: "right",
        textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3, width: "100%",
      }}
      title="Click to edit"
    >
      {children}
    </button>
  );
}
