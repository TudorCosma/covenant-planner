import { useState, useEffect, useRef } from "react";
import { COLORS } from "../data/themes";

export function Input({ label, value, onChange, type = "number", prefix, suffix, small, className = "", ...props }) {
  const [localVal, setLocalVal] = useState(() => (value === undefined || value === null) ? "" : String(value));
  const [focused, setFocused] = useState(false);

  // Sync from parent when not focused (external changes)
  useEffect(() => {
    if (!focused) {
      setLocalVal((value === undefined || value === null) ? "" : String(value));
    }
  }, [value, focused]);

  const handleChange = (e) => {
    const raw = e.target.value;
    setLocalVal(raw);
    // For text fields, update parent immediately
    if (type === "text") {
      onChange(raw);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    if (type === "number") {
      if (localVal === "" || localVal === "-") {
        onChange(0);
        setLocalVal("0");
      } else {
        const num = Number(localVal);
        onChange(isNaN(num) ? 0 : num);
        setLocalVal(String(isNaN(num) ? 0 : num));
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }} className={className}>
      {label && <label style={{ color: COLORS.textMuted, fontSize: small ? 11 : 12, fontFamily: "'DM Sans', sans-serif" }}>{label}</label>}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", background: COLORS.inputBg, border: `1px solid ${COLORS.inputBorder}`, borderRadius: 6, overflow: "hidden", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}>
        {prefix && <span style={{ padding: "6px 0 6px 10px", color: COLORS.textDim, fontSize: small ? 12 : 13, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap", flexShrink: 0 }}>{prefix}</span>}
        <input
          type={type === "number" ? "text" : type}
          inputMode={type === "number" ? "decimal" : undefined}
          value={localVal}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          style={{
            background: "transparent", border: "none", outline: "none", color: COLORS.inputText || COLORS.text,
            padding: prefix ? "6px 4px 6px 2px" : "6px 10px",
            fontSize: 13, width: "100%", minWidth: 0, fontFamily: "'JetBrains Mono', monospace", display: "block",
          }}
          {...props}
        />
        {suffix && <span style={{ padding: "6px 10px 6px 0", color: COLORS.textDim, fontSize: small ? 12 : 13, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap", flexShrink: 0 }}>{suffix}</span>}
      </div>
    </div>
  );
}
