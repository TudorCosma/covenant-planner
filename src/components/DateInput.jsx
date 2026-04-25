import { useState, useEffect, useRef } from "react";
import { COLORS } from "../data/themes";

export function DateInput({ label, value, onChange, small }) {
  // Convert stored YYYY-MM-DD → DD/MM/YYYY for display
  const toDisplay = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
    return iso; // already in display format or free text
  };
  // Convert entered DD/MM/YYYY → YYYY-MM-DD for storage
  const toISO = (display) => {
    const parts = display.split("/");
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return display; // pass through if can't parse
  };

  const [localVal, setLocalVal] = useState(() => toDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocalVal(toDisplay(value));
  }, [value, focused]);

  const handleChange = (e) => {
    let raw = e.target.value.replace(/[^0-9/]/g, "");
    // Auto-insert slashes at positions 2 and 5
    if (raw.length === 2 && localVal.length === 1) raw = raw + "/";
    if (raw.length === 5 && localVal.length === 4) raw = raw + "/";
    setLocalVal(raw);
  };

  const handleBlur = () => {
    setFocused(false);
    const iso = toISO(localVal);
    onChange(iso);
    setLocalVal(toDisplay(iso));
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <label style={{ color: COLORS.textMuted, fontSize: small ? 11 : 12, fontFamily: "'DM Sans', sans-serif" }}>{label}</label>}
      <div className="flex items-center" style={{ background: COLORS.inputBg, border: `1px solid ${COLORS.inputBorder}`, borderRadius: 6, overflow: "hidden", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}>
        <input
          type="text"
          inputMode="numeric"
          placeholder="DD/MM/YYYY"
          value={localVal}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          maxLength={10}
          style={{ background: "transparent", border: "none", outline: "none", color: COLORS.inputText || COLORS.text, padding: "6px 10px", fontSize: 13, width: "100%", fontFamily: "'JetBrains Mono', monospace" }}
        />
      </div>
    </div>
  );
}
