import { useState, useEffect, useRef } from "react";
import { COLORS } from "../data/themes";

export function FYInput({ label, value, onChange, small }) {
  // Convert stored calendar year → FY display e.g. 2025 → "FY 25/26"
  const toDisplay = (yr) => {
    const n = parseInt(yr);
    if (!n || isNaN(n)) return "";
    const short1 = String(n).slice(2);
    const short2 = String(n + 1).slice(2);
    return `FY ${short1}/${short2}`;
  };
  // Parse "FY 25/26" or "25/26" or "2025" → 2025
  const toYear = (display) => {
    if (!display) return null;
    // "FY 25/26" or "25/26"
    const match = display.replace(/FY\s*/i, "").trim().match(/^(\d{2})\/(\d{2})$/);
    if (match) {
      const century = parseInt(match[1]) >= 90 ? "19" : "20";
      return parseInt(century + match[1]);
    }
    // Plain 4-digit year
    const plain = parseInt(display);
    if (!isNaN(plain) && plain > 1900) return plain;
    return null;
  };

  const [localVal, setLocalVal] = useState(() => toDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocalVal(toDisplay(value));
  }, [value, focused]);

  const handleChange = (e) => {
    let raw = e.target.value;
    // Auto-format: strip non-digits/slash, insert FY prefix and slash
    const digits = raw.replace(/[^0-9]/g, "");
    if (digits.length === 0) { setLocalVal(""); return; }
    if (digits.length <= 2) { setLocalVal(`FY ${digits}`); return; }
    if (digits.length <= 4) { setLocalVal(`FY ${digits.slice(0,2)}/${digits.slice(2)}`); return; }
    setLocalVal(`FY ${digits.slice(0,2)}/${digits.slice(2,4)}`);
  };

  const handleBlur = () => {
    setFocused(false);
    const yr = toYear(localVal);
    if (yr) {
      onChange(yr);
      setLocalVal(toDisplay(yr));
    } else {
      setLocalVal(toDisplay(value));
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <label style={{ color: COLORS.textMuted, fontSize: small ? 11 : 12, fontFamily: "'DM Sans', sans-serif" }}>{label}</label>}
      <div className="flex items-center" style={{ background: COLORS.inputBg, border: `1px solid ${COLORS.inputBorder}`, borderRadius: 6, overflow: "hidden", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}>
        <input
          type="text"
          inputMode="numeric"
          placeholder="FY 25/26"
          value={localVal}
          onChange={handleChange}
          onFocus={() => { setFocused(true); setLocalVal(""); }}
          onBlur={handleBlur}
          maxLength={8}
          style={{ background: "transparent", border: "none", outline: "none", color: COLORS.inputText || COLORS.text, padding: "6px 10px", fontSize: 13, width: "100%", fontFamily: "'JetBrains Mono', monospace" }}
        />
      </div>
    </div>
  );
}
