export const fmt = (v) => {
  if (v === undefined || v === null || isNaN(v)) return "$0";
  const abs = Math.abs(v);
  if (abs >= 1e6) return (v < 0 ? "-" : "") + "$" + (abs / 1e6).toFixed(1) + "M";
  if (abs >= 1e3) return (v < 0 ? "-" : "") + "$" + Math.round(abs).toLocaleString();
  return (v < 0 ? "-" : "") + "$" + Math.round(abs);
};

export const pct = (v) => (v * 100).toFixed(1) + "%";
