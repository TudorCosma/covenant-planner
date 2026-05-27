import { useState, useMemo } from "react";
import { COLORS } from "../data/themes";
import { Input, Select, Card, StatCard, Btn } from "../components";
import { fmt } from "../lib";
import { calcAgedCare, radToDap, dapToRad, calcHomeCarePackage } from "../lib/agedCare";

// ============================================================
// AGED CARE TAB — fee estimator
// Two pathways: Residential Care (RAD/DAP + means-tested fees) and Home Care Packages.
// Uses the active legislation snapshot (Bill 2013 vs Act 2024) per state.agedCareModel.
// ============================================================

const PATHWAYS = [
  { id: "residential", label: "Residential Care" },
  { id: "hcp",         label: "Home Care Packages" },
];

export function AgedCareTab({ state, setState }) {
  const [path, setPath] = useState("residential");
  const [resident, setResident] = useState({
    isCouple: state.personal?.isCouple || false,
    assessableIncome: 35000,
    assessableAssets: 600000,
    radAmount: 450000,
    dapDaily: 0,
    lifetimeFeesPaid: 0,
    mpirOverride: 0,        // 0 = use legislation MPIR; otherwise overrides it (entered as %, e.g. 7.96)
    retentionRatePct: 2.0,  // Annual % retained from RAD (legal max 2% pa × 5 yrs under both Bill 2013 & Act 2024)
    retentionYears: 5,
  });
  const [hcp, setHcp] = useState({
    packageLevel: 3,
    assessableIncome: 35000,
  });
  const [planEntryAge, setPlanEntryAge] = useState(85);
  const [planYears, setPlanYears] = useState(4);
  const [dapIndexationPct, setDapIndexationPct] = useState(2.5); // CPI quarterly indexation, modelled annually

  const model = state.agedCareModel || "act2024";
  const legislation = state.legislation;
  // MPIR: prefer user override (if > 0), else legislation snapshot, else 8.34% fallback.
  // MPIR is set quarterly by the federal government; users often need to enter the
  // exact rate at the date of admission to match a provider's accommodation agreement.
  const mpir = (resident.mpirOverride > 0 ? resident.mpirOverride / 100 : (legislation?.agedCare?.mpir || 0.0834));

  const result = useMemo(() => calcAgedCare(model, { ...resident, legislation }), [model, resident, legislation]);
  const hcpResult = useMemo(() => calcHomeCarePackage({
    packageLevel: hcp.packageLevel,
    assessableIncome: hcp.assessableIncome,
    agePensionRate: legislation?.centrelink?.singleMaxPension || 29754,
    hcpCfg: legislation?.agedCare?.homeCarePackages,
  }), [hcp, legislation]);

  // resident.dapDaily holds the DAILY DAP rate in $ (input field is "DAP (daily)").
  // dapToRad already multiplies by 365 internally — passing daily * 365 squared
  // the conversion and produced absurd results ($254M for a $164/day DAP).
  const dapEquivOfRad = radToDap(resident.radAmount, mpir);
  const radEquivOfDap = dapToRad(resident.dapDaily, mpir);

  const setModel = (m) => setState(s => ({ ...s, agedCareModel: m }));

  return (
    <div>
      <div style={{ padding: "10px 14px", background: `${COLORS.accent}12`, border: `1px solid ${COLORS.accent}30`, borderRadius: 8, marginBottom: 12 }}>
        <p style={{ color: COLORS.accent, fontSize: 11, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
          <strong>Educational tool only — not financial advice.</strong> Use the Legislation tab to adjust the underlying fee schedules. Active model: <strong>{model === "act2024" ? "Aged Care Act 2024" : "Aged Care Act 1997 (Bill 2013)"}</strong>.
        </p>
      </div>

      <Card title="Active Model">
        <Select label="Aged Care Model" value={model} onChange={setModel} options={[
          { value: "act2024",  label: "Aged Care Act 2024 (commenced 1 Jul 2025)" },
          { value: "bill2013", label: "Aged Care Act 1997 — Bill 2013 reforms (historical)" },
        ]} />
      </Card>

      <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 16, marginTop: 12 }}>
        {PATHWAYS.map(p => (
          <button key={p.id} onClick={() => setPath(p.id)} style={{
            background: "none", border: "none",
            borderBottom: path === p.id ? `2px solid ${COLORS.accent}` : "2px solid transparent",
            color: path === p.id ? COLORS.accent : COLORS.textDim, padding: "10px 14px", fontSize: 12, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", fontWeight: path === p.id ? 600 : 400,
          }}>{p.label}</button>
        ))}
      </div>

      {path === "residential" && (
        <>
          <Card title="Resident Profile">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Select label="Single / Couple" value={resident.isCouple ? "couple" : "single"} onChange={(v) => setResident({ ...resident, isCouple: v === "couple" })} options={[
                { value: "single", label: "Single" }, { value: "couple", label: "Couple (combined)" },
              ]} />
              <Input label="Lifetime Means-Tested Fees Already Paid" value={resident.lifetimeFeesPaid} onChange={(v) => setResident({ ...resident, lifetimeFeesPaid: Number(v) || 0 })} prefix="$" />
              <Input label="Assessable Income (annual)" value={resident.assessableIncome} onChange={(v) => setResident({ ...resident, assessableIncome: Number(v) || 0 })} prefix="$" />
              <Input label="Assessable Assets (incl. capped home)" value={resident.assessableAssets} onChange={(v) => setResident({ ...resident, assessableAssets: Number(v) || 0 })} prefix="$" />
            </div>
          </Card>

          <Card title={`Accommodation Payment — MPIR ${(mpir * 100).toFixed(2)}%${resident.mpirOverride > 0 ? " (override)" : ""}`}>
            <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10 }}>
              Choose RAD (Refundable Accommodation Deposit, refunded on exit) or DAP (Daily Accommodation Payment, rent-like). Calculator converts between them at MPIR. MPIR is set quarterly by the federal government — leave the override blank to use the {(((legislation?.agedCare?.mpir) || 0.0834) * 100).toFixed(2)}% from the active legislation snapshot, or enter the exact rate from your accommodation agreement.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Input label="RAD (lump sum)" value={resident.radAmount} onChange={(v) => setResident({ ...resident, radAmount: Number(v) || 0 })} prefix="$" />
              <Input label="DAP (daily)" value={resident.dapDaily} onChange={(v) => setResident({ ...resident, dapDaily: Number(v) || 0 })} prefix="$" />
              <Input label="MPIR override (blank = use legislation)" value={resident.mpirOverride || ""} onChange={(v) => setResident({ ...resident, mpirOverride: Math.min(25, Math.max(0, Number(v) || 0)) })} suffix="%" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <StatCard label="DAP equivalent of RAD" value={fmt(dapEquivOfRad)} sub="per day" />
              <StatCard label="RAD equivalent of DAP" value={fmt(radEquivOfDap)} sub="lump sum" />
            </div>

            {/* ── RAD retention modelling ─────────────────────────── */}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
              <div style={{ color: COLORS.text, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>RAD retention (if paying RAD lump sum)</div>
              <p style={{ color: COLORS.textDim, fontSize: 10, marginBottom: 8, lineHeight: 1.5 }}>
                Providers may retain a fixed % of the RAD each year — capped at <strong>2% pa for a maximum of 5 years</strong> under both Bill 2013 and the Act 2024. The retained amount is deducted from the refund paid out on exit. Treat this as a real cost of paying RAD even though it doesn't appear as recurring cashflow.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <Input label="Retention rate" value={resident.retentionRatePct} onChange={(v) => setResident({ ...resident, retentionRatePct: Math.min(2.0, Math.max(0, Number(v) || 0)) })} suffix="% pa" />
                <Input label="Retention years" value={resident.retentionYears} onChange={(v) => setResident({ ...resident, retentionYears: Math.min(5, Math.max(0, Number(v) || 0)) })} suffix="yrs (max 5)" />
              </div>
              {(() => {
                const annualRetention = (resident.radAmount || 0) * (resident.retentionRatePct / 100);
                const totalRetention = annualRetention * (resident.retentionYears || 0);
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <StatCard label="Annual retention" value={fmt(annualRetention)} sub={`${resident.retentionRatePct}% of RAD`} />
                    <StatCard label={`Total retained over ${resident.retentionYears} yrs`} value={fmt(totalRetention)} sub="deducted from refund" />
                  </div>
                );
              })()}
            </div>
          </Card>

          <Card title="Estimated Fees">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <StatCard label="Basic Daily Fee" value={fmt(result.basicAnnualFee || 0)} sub="per year" />
              <StatCard label={model === "act2024" ? "Non-Clinical Care Contribution" : "Means-Tested Care Fee"} value={fmt(result.annualFee || 0)} sub="per year" />
              <StatCard label="Accommodation (if DAP)" value={fmt(dapEquivOfRad * 365)} sub="per year" />
            </div>
            {(() => {
              const totalCareAnnual = (result.basicAnnualFee || 0) + (result.annualFee || 0);
              const totalWithAccom = totalCareAnnual + (dapEquivOfRad * 365);
              return (
                <div style={{ marginTop: 10, padding: 12, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
                  <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Total annual care fees: {fmt(totalCareAnnual)}
                  </div>
                  <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    Total incl. DAP accommodation: {fmt(totalWithAccom)} per year
                  </div>
                  <div style={{ color: COLORS.textDim, fontSize: 11 }}>
                    If you pay the {fmt(resident.radAmount)} RAD as a lump sum instead, the {fmt(dapEquivOfRad * 365)} accommodation line disappears (lump sum refunded on exit, no recurring cost).
                  </div>
                  {result.lifetimeCapApplied && (
                    <div style={{ color: COLORS.green, fontSize: 11, marginTop: 6, fontWeight: 600 }}>
                      ✓ Lifetime cap reached — care contribution capped.
                    </div>
                  )}
                  {result.annualCapApplied && (
                    <div style={{ color: COLORS.orange, fontSize: 11, marginTop: 6 }}>
                      ⚠ Annual cap on means-tested fee has been applied.
                    </div>
                  )}
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <Input label="Entry age" value={planEntryAge} onChange={(v) => setPlanEntryAge(Math.max(0, Number(v) || 0))} />
                      <Input label="Years in care" value={planYears} onChange={(v) => setPlanYears(Math.max(1, Number(v) || 1))} />
                      <Input label="DAP indexation" value={dapIndexationPct} onChange={(v) => setDapIndexationPct(Math.max(0, Number(v) || 0))} suffix="% pa" />
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <Btn onClick={() => {
                        const currentYear = new Date().getFullYear();
                        // Compute P1's current age from DOB (preferred) or birthYear.
                        const p1 = state.personal?.person1 || {};
                        let currentAge;
                        if (p1.dob) {
                          const d = new Date(p1.dob);
                          currentAge = currentYear - d.getFullYear() - ((new Date()) < new Date(currentYear, d.getMonth(), d.getDate()) ? 1 : 0);
                        } else if (p1.birthYear) {
                          currentAge = currentYear - p1.birthYear;
                        } else {
                          currentAge = 65;
                        }
                        const yearsUntilEntry = Math.max(0, planEntryAge - currentAge);
                        const startYear = currentYear + yearsUntilEntry;
                        // Inclusive endYear: startYear + (planYears - 1) so exactly planYears years are billed
                        // (matches projection filter `year >= startYear && year <= endYear`).
                        const endYear = startYear + Math.max(0, planYears - 1);
                        setState(s => ({
                          ...s,
                          expenses: {
                            ...s.expenses,
                            agedCareExpenses: [
                              ...(s.expenses.agedCareExpenses || []),
                              // Note: deliberately omit `indexationBucket` so the per-line `indexation`
                              // value (the user's chosen DAP indexation %) is authoritative. Setting a
                              // bucket here would cause bucketRate() in projection.js to prefer the
                              // legislation CPI rate and silently ignore the user's input.
                              { description: `Aged Care — ${model === "act2024" ? "Act 2024" : "Bill 2013"} (Residential, DAP)`, amount: Math.round(totalWithAccom), startYear, endYear, indexation: dapIndexationPct, type: "essential" },
                            ],
                          },
                        }));
                      }}>+ Add to Projection Expenses ({fmt(totalWithAccom)}/yr × {planYears}yr{planYears !== 1 ? "s" : ""} from age {planEntryAge})</Btn>
                      <span style={{ fontSize: 10, color: COLORS.textDim }}>
                        Feeds Projections, Dashboard, and Cashflow tabs.
                      </span>
                    </div>
                  </div>
                  {(state.expenses?.agedCareExpenses || []).length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 11, color: COLORS.textDim }}>
                      <strong>Currently scheduled aged-care expenses:</strong>
                      <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                        {state.expenses.agedCareExpenses.map((e, i) => (
                          <li key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {e.description}: {fmt(e.amount)}/yr · {e.startYear}–{e.endYear}
                            <button onClick={() => setState(s => ({ ...s, expenses: { ...s.expenses, agedCareExpenses: s.expenses.agedCareExpenses.filter((_, j) => j !== i) } }))} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 11 }}>✕</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </Card>
        </>
      )}

      {path === "hcp" && (
        <>
          <Card title="Home Care Package Estimator">
            <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10 }}>
              Government-subsidised in-home care. Four package levels reflect care intensity. Income-tested fee may apply for higher-income recipients.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Select label="Package Level" value={String(hcp.packageLevel)} onChange={(v) => setHcp({ ...hcp, packageLevel: Number(v) })} options={[
                { value: "1", label: "Level 1 — basic care" },
                { value: "2", label: "Level 2 — low-level care" },
                { value: "3", label: "Level 3 — intermediate care" },
                { value: "4", label: "Level 4 — high-level care" },
              ]} />
              <Input label="Assessable Income (annual)" value={hcp.assessableIncome} onChange={(v) => setHcp({ ...hcp, assessableIncome: Number(v) || 0 })} prefix="$" />
            </div>
          </Card>

          <Card title="HCP Estimated Annual Amounts">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <StatCard label="Government Subsidy" value={fmt(hcpResult.annualSubsidy)} sub="per year" />
              <StatCard label="Basic Daily Fee" value={fmt(hcpResult.basicDailyFee)} sub="per year" />
              <StatCard label="Income-Tested Fee" value={fmt(hcpResult.incomeTestedFee)} sub="per year" />
            </div>
            <div style={{ marginTop: 10, padding: 12, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
              <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 600 }}>
                Net care available after fees: {fmt(Math.max(0, (hcpResult.annualSubsidy || 0) - (hcpResult.basicDailyFee || 0) - (hcpResult.incomeTestedFee || 0)))} per year
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
