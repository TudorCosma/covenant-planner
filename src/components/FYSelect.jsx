import { FY_OPTIONS } from "../data/legislation";
import { COLORS } from "../data/themes";

// Compact FY selector for the header. Changing the FY replaces state.legislation
// with the registry snapshot for the chosen year (user-confirmed if they had edits).
export function FYSelect({ value, onChange, hasCustomEdits = false }) {
  const handle = (newKey) => {
    if (newKey === value) return;
    if (hasCustomEdits) {
      const ok = window.confirm("You have customised legislation values. Switching financial year will replace them with the standard rule set for that year. Continue?");
      if (!ok) return;
    }
    onChange(newKey);
  };
  return (
    <select
      value={value}
      onChange={(e) => handle(e.target.value)}
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        color: COLORS.text,
        padding: "4px 8px",
        borderRadius: 6,
        fontSize: 11,
        fontFamily: "'DM Sans', sans-serif",
        cursor: "pointer",
      }}
      title="Financial year — switches all tax, super, Centrelink, and Aged Care rules to the rule set for the selected year."
    >
      {FY_OPTIONS.map(o => (
        <option key={o.key} value={o.key}>{o.label}</option>
      ))}
    </select>
  );
}
