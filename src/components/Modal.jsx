import { useState, useEffect, useRef } from "react";
import { COLORS } from "../data/themes";

export function Modal({ title, onClose, children, width = 680 }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)", width: "90%", maxWidth: width, maxHeight: "80vh", display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: COLORS.text, fontFamily: "'DM Sans', sans-serif" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textDim, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
