import { useState, useEffect, useRef } from "react";
import { COLORS } from "../data/themes";

export function Card({ title, children, className = "", actions }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16, marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }} className={className}>
      {(title || actions) && (
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          {title && <h3 style={{ color: COLORS.text, fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>{title}</h3>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
