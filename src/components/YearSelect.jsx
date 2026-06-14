import { useState } from "react";
import { COLORS } from "../data/themes";
import { DateInput } from "./DateInput";
import { FYInput } from "./FYInput";

// Friendly future-point selector for dated items (expenses, gifts, goals).
// Renders a dropdown of upcoming financial years, each annotated with every
// person's first name + their age in that year (e.g. "2026/2027 · Tudor 61 ·
// Jane 56"), plus a "Custom date…" option that reveals a manual entry field
// for an exact date (a retirement date, a trip date, a past gift, etc).
//
//   mode="fy"   → value is a calendar year integer (the FY start year).
//                 Custom reveals an FYInput.
//   mode="date" → value is an ISO date string (YYYY-MM-DD). Picking an FY
//                 stores its 1-July start date; Custom reveals a DateInput.
export function YearSelect({ label, value, onChange, personal, mode = "fy", small, yearsAhead = 50 }) {
  const currentYear = new Date().getFullYear();

  const p1 = personal?.person1 || {};
  const p2 = personal?.person2 || {};
  const isCouple = personal?.isCouple;
  const firstName = (name, fallback) => {
    const t = (name && name.trim().split(/\s+/)[0]) || "";
    return t || fallback;
  };
  const name1 = firstName(p1.name, "You");
  const name2 = firstName(p2.name, "Partner");

  const ageStr = (yr) => {
    const parts = [];
    if (p1.birthYear) parts.push(`${name1} ${yr - p1.birthYear}`);
    if (isCouple && p2.birthYear) parts.push(`${name2} ${yr - p2.birthYear}`);
    return parts.length ? ` · ${parts.join(" · ")}` : "";
  };
  const optLabel = (yr) => `${yr}/${yr + 1}${ageStr(yr)}`;

  // Derive the calendar year currently represented by `value`.
  const valueYear = mode === "date"
    ? (value ? parseInt(String(value).split("-")[0]) : null)
    : (value !== "" && value != null ? parseInt(value) : null);

  // A date that isn't exactly 1 July, or any year outside the dropdown range,
  // is treated as a custom (manually entered) value.
  const isCustomDate = mode === "date" && !!value && !/^\d{4}-07-01$/.test(value);
  const inRange = valueYear != null && valueYear >= currentYear && valueYear <= currentYear + yearsAhead;
  const derivedCustom = isCustomDate || (valueYear != null && !inRange);

  const [forceCustom, setForceCustom] = useState(false);
  const customOpen = forceCustom || derivedCustom;

  const years = [];
  for (let y = currentYear; y <= currentYear + yearsAhead; y++) years.push(y);

  const selectValue = customOpen ? "__custom__" : (valueYear != null ? String(valueYear) : "__none__");

  const handleSelect = (v) => {
    if (v === "__custom__") { setForceCustom(true); return; }
    setForceCustom(false);
    if (v === "__none__") return;
    const yr = parseInt(v);
    onChange(mode === "date" ? `${yr}-07-01` : yr);
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <label style={{ color: COLORS.textMuted, fontSize: small ? 11 : 12, fontFamily: "'DM Sans', sans-serif" }}>{label}</label>}
      <select
        value={selectValue}
        onChange={(e) => handleSelect(e.target.value)}
        style={{ background: COLORS.inputBg, border: `1px solid ${COLORS.inputBorder}`, borderRadius: COLORS.radiusSm ?? 6, color: COLORS.inputText || COLORS.text, padding: small ? "6px 8px" : "6px 10px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", boxShadow: COLORS.inputShadow ?? "inset 0 1px 2px rgba(0,0,0,0.06)", width: "100%" }}
      >
        {valueYear == null && <option value="__none__">Select year…</option>}
        {years.map((y) => <option key={y} value={String(y)}>{optLabel(y)}</option>)}
        <option value="__custom__">Custom date…</option>
      </select>
      {customOpen && (
        <div style={{ marginTop: 4 }}>
          {mode === "date"
            ? <DateInput value={value} onChange={onChange} small={small} />
            : <FYInput value={value} onChange={onChange} small={small} />}
        </div>
      )}
    </div>
  );
}
