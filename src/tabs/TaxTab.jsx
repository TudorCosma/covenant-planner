import { useState } from "react";
import { COLORS } from "../data/themes";
import { Input, DateInput, YearSelect, Select, Card, Btn } from "../components";
import { fmt, computeGiftLedger } from "../lib";

// ============================================================
// LEGISLATION TAB — sub-nav: Income Tax / Super / Centrelink / Aged Care / Indexation
// All edits update state.legislation.* live. FY dropdown in header swaps the snapshot.
// ============================================================

const SUBTABS = [
  { id: "tax",       label: "Income Tax & Medicare" },
  { id: "super",     label: "Superannuation" },
  { id: "cl",        label: "Centrelink" },
  { id: "agedcare",  label: "Aged Care Rules" },
  { id: "index",     label: "Indexation" },
];

const LegBadge = ({ text }) => (
  <span style={{ fontSize: 9, background: `${COLORS.accent}20`, color: COLORS.accent, padding: "2px 6px", borderRadius: 4, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: 0.3 }}>{text}</span>
);

export function TaxTab({ state, setState }) {
  const [sub, setSub] = useState("tax");
  const { legislation } = state;
  const gifts = state.gifts || [];
  const currentYear = new Date().getFullYear();

  // ── Generic setters ─────────────────────────────────────────
  const updLeg     = (path, v) => setState(s => setIn(s, ["legislation", ...path], v));
  const updTax     = (i, f, v) => updArr(["taxBrackets"], i, f, v);
  const updSuper   = (f, v)    => updLeg(["superParams", f], v);
  const updLITO    = (f, v)    => updLeg(["lito", f], v);
  const updSAPTO   = (cat, f, v) => updLeg(["sapto", cat, f], v);
  const updMed     = (f, v)    => updLeg(["medicare", f], v);
  const updMLS     = (i, f, v) => updArr(["medicare", "surchargeBrackets"], i, f, v);
  const updCL      = (f, v)    => updLeg(["centrelink", f], v);
  const updACBill  = (f, v)    => updLeg(["agedCare", "bill2013", f], v);
  const updACAct   = (f, v)    => updLeg(["agedCare", "act2024", f], v);
  const updACRoot  = (f, v)    => updLeg(["agedCare", f], v);
  const updHCP     = (f, v)    => updLeg(["agedCare", "homeCarePackages", f], v);
  const updIdx     = (f, v)    => updLeg(["indexation", f], v);
  const updDrawBand = (i, f, v) => updArr(["superParams", "minPensionDrawdownRates"], i, f, v);
  const minDrawRates = legislation.superParams.minPensionDrawdownRates || [];

  const addDrawBand = () => updLeg(["superParams", "minPensionDrawdownRates"], [...minDrawRates, { minAge: 0, maxAge: 999, rate: 0.04 }]);
  const rmDrawBand = (i) => updLeg(["superParams", "minPensionDrawdownRates"], minDrawRates.filter((_, j) => j !== i));

  // Tax settings (refundable franking, MLS toggle, LITO/SAPTO toggles).
  const taxSettings = state.taxSettings || {};
  const updTaxSet  = (f, v) => setState(s => ({ ...s, taxSettings: { ...(s.taxSettings || {}), [f]: v } }));

  // Gifting (lives on state.gifts, used by Centrelink section).
  const addGift = () => setState(s => ({ ...s, gifts: [...(s.gifts || []), { description: "", amount: 0, date: new Date().toISOString().split("T")[0], recipient: "" }] }));
  const updGift = (i, f, v) => { const arr = [...gifts]; arr[i] = { ...arr[i], [f]: v }; setState(s => ({ ...s, gifts: arr })); };
  const rmGift = (i) => setState(s => ({ ...s, gifts: s.gifts.filter((_, j) => j !== i) }));

  function updArr(rootPath, i, f, v) {
    setState(s => {
      const arr = [...getIn(s, ["legislation", ...rootPath])];
      arr[i] = { ...arr[i], [f]: v };
      return setIn(s, ["legislation", ...rootPath], arr);
    });
  }

  return (
    <div>
      <div style={{ padding: "10px 14px", background: `${COLORS.accent}12`, border: `1px solid ${COLORS.accent}30`, borderRadius: 8, marginBottom: 12 }}>
        <p style={{ color: COLORS.accent, fontSize: 11, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
          Editing legislation snapshot: <strong>{legislation.fyLabel || legislation.fyKey}</strong>. Switch financial year using the dropdown in the page header. All projections recalculate live when values are changed.
        </p>
      </div>

      {/* Sub-nav */}
      <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 16, overflowX: "auto" }}>
        {SUBTABS.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{
            background: "none", border: "none",
            borderBottom: sub === t.id ? `2px solid ${COLORS.accent}` : "2px solid transparent",
            color: sub === t.id ? COLORS.accent : COLORS.textDim, padding: "10px 14px", fontSize: 12, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", fontWeight: sub === t.id ? 600 : 400, whiteSpace: "nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      {sub === "tax" && (
        <TaxSection legislation={legislation} taxSettings={taxSettings} updTax={updTax} updLITO={updLITO} updSAPTO={updSAPTO} updMed={updMed} updMLS={updMLS} updTaxSet={updTaxSet} />
      )}
      {sub === "super" && (
        <SuperSection legislation={legislation} updSuper={updSuper} minDrawRates={minDrawRates} addDrawBand={addDrawBand} rmDrawBand={rmDrawBand} updDrawBand={updDrawBand} />
      )}
      {sub === "cl" && (
        <CentrelinkSection legislation={legislation} updCL={updCL} updLeg={updLeg} gifts={gifts} addGift={addGift} updGift={updGift} rmGift={rmGift} currentYear={currentYear} personal={state.personal} />
      )}
      {sub === "agedcare" && (
        <AgedCareRulesSection legislation={legislation} updACBill={updACBill} updACAct={updACAct} updACRoot={updACRoot} updHCP={updHCP} agedCareModel={state.agedCareModel || "act2024"} setModel={(m) => setState(s => ({ ...s, agedCareModel: m }))} />
      )}
      {sub === "index" && (
        <IndexationSection legislation={legislation} updIdx={updIdx} />
      )}
    </div>
  );
}

// ============================================================
// 1. INCOME TAX & MEDICARE
// ============================================================
function TaxSection({ legislation, taxSettings, updTax, updLITO, updSAPTO, updMed, updMLS, updTaxSet }) {
  return (
    <div>
      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Income Tax Brackets <LegBadge text="ITAA 1997 Sch 7" /></span>}>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
          Editing this table changes the marginal rates used for every person in the projection.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8, alignItems: "end" }}>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Range</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Min ($)</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Max ($)</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Rate (%)</span>
        </div>
        {(legislation.taxBrackets || []).map((b, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <span style={{ color: COLORS.text, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{b.label}</span>
            <Input value={b.min} onChange={(v) => updTax(i, "min", v)} small />
            <Input value={b.max === Infinity ? "∞" : b.max} onChange={(v) => updTax(i, "max", v === "∞" ? Infinity : v)} small type="text" />
            <Input value={(b.rate * 100)} onChange={(v) => updTax(i, "rate", v / 100)} suffix="%" small />
          </div>
        ))}
      </Card>

      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Low Income Tax Offset (LITO) <LegBadge text="ITAA 1936 s.159N" /></span>}>
        <ToggleRow label="Apply LITO in projection" value={taxSettings.applyLITO !== false} onChange={(v) => updTaxSet("applyLITO", v)} />
        {legislation.lito && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
            <Input label="Max LITO" value={legislation.lito.max} onChange={(v) => updLITO("max", v)} prefix="$" />
            <Input label="Full Threshold" value={legislation.lito.fullThreshold} onChange={(v) => updLITO("fullThreshold", v)} prefix="$" />
            <Input label="Cutoff" value={legislation.lito.cutoff} onChange={(v) => updLITO("cutoff", v)} prefix="$" />
            <Input label="Taper 1 Rate" value={(legislation.lito.taper1Rate * 100)} onChange={(v) => updLITO("taper1Rate", v / 100)} suffix="%" />
            <Input label="Taper 1 Limit" value={legislation.lito.taper1Limit} onChange={(v) => updLITO("taper1Limit", v)} prefix="$" />
            <Input label="Taper 2 Rate" value={(legislation.lito.taper2Rate * 100)} onChange={(v) => updLITO("taper2Rate", v / 100)} suffix="%" />
          </div>
        )}
      </Card>

      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Seniors & Pensioners Tax Offset (SAPTO) <LegBadge text="ITAA 1936 s.160AAAA" /></span>}>
        <ToggleRow label="Apply SAPTO when person reaches Age Pension age" value={taxSettings.applySAPTO !== false} onChange={(v) => updTaxSet("applySAPTO", v)} />
        {legislation.sapto && ["single", "couple", "illnessSeparated"].map(cat => {
          const c = legislation.sapto[cat];
          if (!c) return null;
          return (
            <div key={cat} style={{ marginTop: 12, padding: 10, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
              <div style={{ color: COLORS.textDim, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "capitalize" }}>{cat === "illnessSeparated" ? "Illness Separated (couple)" : cat}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                <Input label="Max Offset" value={c.max} onChange={(v) => updSAPTO(cat, "max", v)} prefix="$" />
                <Input label="Shade-in" value={c.shadeIn} onChange={(v) => updSAPTO(cat, "shadeIn", v)} prefix="$" />
                <Input label="Cutoff" value={c.cutoff} onChange={(v) => updSAPTO(cat, "cutoff", v)} prefix="$" />
                <Input label="Taper Rate" value={(c.taperRate * 100)} onChange={(v) => updSAPTO(cat, "taperRate", v / 100)} suffix="%" />
              </div>
            </div>
          );
        })}
      </Card>

      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Franking Credits <LegBadge text="ITAA 1997 s.207-45" /></span>}>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
          Cash dividends are grossed up by <code>franking% × 30/70</code>. Imputation credits offset tax liability and (when refundable is on) generate cash refunds when credits exceed tax.
        </p>
        <ToggleRow label="Refundable franking credits (current law)" value={taxSettings.frankingRefundEnabled !== false} onChange={(v) => updTaxSet("frankingRefundEnabled", v)} />
      </Card>

      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Medicare Levy <LegBadge text="Medicare Levy Act 1986" /></span>}>
        <ToggleRow label="Apply low-income shade-in (s.8)" value={taxSettings.applyMedicareShadeIn !== false} onChange={(v) => updTaxSet("applyMedicareShadeIn", v)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
          <Input label="Levy Rate" value={(legislation.medicare.levyRate * 100)} onChange={(v) => updMed("levyRate", v / 100)} suffix="%" />
          <Input label="Shade-in Single Threshold" value={legislation.medicare.shadeInSingle || 0} onChange={(v) => updMed("shadeInSingle", v)} prefix="$" />
          <Input label="Shade-in Family Threshold" value={legislation.medicare.shadeInFamily || 0} onChange={(v) => updMed("shadeInFamily", v)} prefix="$" />
          <Input label="Shade-in Rate" value={((legislation.medicare.shadeInRate || 0.10) * 100)} onChange={(v) => updMed("shadeInRate", v / 100)} suffix="%" />
          <Input label="Senior Shade-in (Single)" value={legislation.medicare.shadeInSenior || 0} onChange={(v) => updMed("shadeInSenior", v)} prefix="$" />
          <Input label="Senior Shade-in (Family)" value={legislation.medicare.shadeInSeniorFamily || 0} onChange={(v) => updMed("shadeInSeniorFamily", v)} prefix="$" />
          <Input label="Shade-in per Dependent Child" value={legislation.medicare.shadeInDependentChild || 0} onChange={(v) => updMed("shadeInDependentChild", v)} prefix="$" />
        </div>
      </Card>

      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Medicare Levy Surcharge (MLS) <LegBadge text="A New Tax System (Medicare Levy Surcharge) Act 1999" /></span>}>
        <ToggleRow label="Apply tiered MLS for taxpayers without private hospital cover" value={taxSettings.applyMLSTiered !== false} onChange={(v) => updTaxSet("applyMLSTiered", v)} />
        <p style={{ color: COLORS.textDim, fontSize: 11, marginTop: 10, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
          MLS applies when income exceeds tier thresholds AND no private hospital cover is held. For couples, family income test applies.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 6, marginBottom: 4, alignItems: "end" }}>
          <span style={{ color: COLORS.textDim, fontSize: 10 }}>Single Min</span>
          <span style={{ color: COLORS.textDim, fontSize: 10 }}>Single Max</span>
          <span style={{ color: COLORS.textDim, fontSize: 10 }}>Family Min</span>
          <span style={{ color: COLORS.textDim, fontSize: 10 }}>Family Max</span>
          <span style={{ color: COLORS.textDim, fontSize: 10 }}>Rate</span>
        </div>
        {(legislation.medicare.surchargeBrackets || []).map((b, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 6, marginBottom: 6, alignItems: "center" }}>
            <Input value={b.minSingle} onChange={(v) => updMLS(i, "minSingle", v)} small />
            <Input value={b.maxSingle === Infinity ? "∞" : b.maxSingle} onChange={(v) => updMLS(i, "maxSingle", v === "∞" ? Infinity : v)} small type="text" />
            <Input value={b.minFamily} onChange={(v) => updMLS(i, "minFamily", v)} small />
            <Input value={b.maxFamily === Infinity ? "∞" : b.maxFamily} onChange={(v) => updMLS(i, "maxFamily", v === "∞" ? Infinity : v)} small type="text" />
            <Input value={(b.rate * 100)} onChange={(v) => updMLS(i, "rate", v / 100)} suffix="%" small />
          </div>
        ))}
        <Input label="Family Threshold Lift per Dependent Child" value={legislation.medicare.familyThresholdPerChild || 0} onChange={(v) => updMed("familyThresholdPerChild", v)} prefix="$" />
      </Card>
    </div>
  );
}

// ============================================================
// 2. SUPERANNUATION
// ============================================================
function SuperSection({ legislation, updSuper, minDrawRates, addDrawBand, rmDrawBand, updDrawBand }) {
  const sp = legislation.superParams;
  return (
    <div>
      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Contribution Caps & Tax Rates <LegBadge text="SIS Act / ITAA Div 290" /></span>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Input label="SG Rate" value={(sp.sgRate * 100)} onChange={(v) => updSuper("sgRate", v / 100)} suffix="%" />
          <Input label="Maximum Super Contrib Base (annual)" value={sp.maxSuperContribBase || 0} onChange={(v) => updSuper("maxSuperContribBase", v)} prefix="$" />
          <Input label="Concessional Cap" value={sp.concessionalCap} onChange={(v) => updSuper("concessionalCap", v)} prefix="$" />
          <Input label="Non-Concessional Cap" value={sp.nonConcessionalCap} onChange={(v) => updSuper("nonConcessionalCap", v)} prefix="$" />
          <Input label="3-Year NCC Bring-forward" value={sp.nonConcessionalBringForward3yr || 0} onChange={(v) => updSuper("nonConcessionalBringForward3yr", v)} prefix="$" />
          <Input label="Carry-forward TSB Threshold" value={sp.carryForwardThreshold || 0} onChange={(v) => updSuper("carryForwardThreshold", v)} prefix="$" />
          <Input label="Contributions Tax Rate" value={(sp.taxRate * 100)} onChange={(v) => updSuper("taxRate", v / 100)} suffix="%" />
          <Input label="Pension Phase Earnings Tax" value={((sp.pensionTaxRate || 0) * 100)} onChange={(v) => updSuper("pensionTaxRate", v / 100)} suffix="%" />
          <Input label="TTR Earnings Tax" value={((sp.ttrTaxRate || 0.15) * 100)} onChange={(v) => updSuper("ttrTaxRate", v / 100)} suffix="%" />
          <Input label="Div 293 Threshold" value={sp.div293Threshold || 250000} onChange={(v) => updSuper("div293Threshold", v)} prefix="$" />
          <Input label="Div 293 Extra Tax Rate" value={((sp.div293Rate || 0.15) * 100)} onChange={(v) => updSuper("div293Rate", v / 100)} suffix="%" />
          <Input label="Transfer Balance Cap" value={sp.transferBalanceCap} onChange={(v) => updSuper("transferBalanceCap", v)} prefix="$" />
          <Input label="Total Super Balance Cap" value={sp.totalSuperBalanceCap || sp.transferBalanceCap} onChange={(v) => updSuper("totalSuperBalanceCap", v)} prefix="$" />
        </div>
      </Card>

      <Card title="Co-Contribution, Spouse Offset & LISTO">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <Input label="Co-Contrib Max" value={sp.coContribMaxAmount || 500} onChange={(v) => updSuper("coContribMaxAmount", v)} prefix="$" />
          <Input label="Co-Contrib Match Rate" value={((sp.coContribMatchRate || 0.5) * 100)} onChange={(v) => updSuper("coContribMatchRate", v / 100)} suffix="%" />
          <Input label="Co-Contrib Lower Threshold" value={sp.coContribLowerThreshold || 0} onChange={(v) => updSuper("coContribLowerThreshold", v)} prefix="$" />
          <Input label="Co-Contrib Upper Threshold" value={sp.coContribUpperThreshold || 0} onChange={(v) => updSuper("coContribUpperThreshold", v)} prefix="$" />
          <Input label="Spouse Offset Max" value={sp.spouseOffsetMax || 540} onChange={(v) => updSuper("spouseOffsetMax", v)} prefix="$" />
          <Input label="Spouse Offset Max Contrib" value={sp.spouseOffsetMaxContrib || 3000} onChange={(v) => updSuper("spouseOffsetMaxContrib", v)} prefix="$" />
          <Input label="Spouse Offset Lower Income" value={sp.spouseOffsetLowerIncome || 37000} onChange={(v) => updSuper("spouseOffsetLowerIncome", v)} prefix="$" />
          <Input label="Spouse Offset Upper Income" value={sp.spouseOffsetUpperIncome || 40000} onChange={(v) => updSuper("spouseOffsetUpperIncome", v)} prefix="$" />
          <Input label="LISTO Max" value={sp.listoMax || 500} onChange={(v) => updSuper("listoMax", v)} prefix="$" />
          <Input label="LISTO Income Threshold" value={sp.listoIncomeThreshold || 37000} onChange={(v) => updSuper("listoIncomeThreshold", v)} prefix="$" />
        </div>
      </Card>

      <Card title="Preservation, Lump Sum & Redundancy">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Input label="Preservation Age" value={sp.preservationAge} onChange={(v) => updSuper("preservationAge", v)} />
          <Input label="Earliest Super Access Age" value={sp.earliestSuperAccessAge ?? 60} onChange={(v) => updSuper("earliestSuperAccessAge", v)} />
          <Input label="Lump Sum Low-Rate Cap" value={sp.lumpSumLowRateCap || 0} onChange={(v) => updSuper("lumpSumLowRateCap", v)} prefix="$" />
          <Input label="Lump Sum Tax (above cap)" value={((sp.lumpSumLowRateTax || 0.15) * 100)} onChange={(v) => updSuper("lumpSumLowRateTax", v / 100)} suffix="%" />
          <Input label="Redundancy Base Amount" value={sp.redundancyBaseAmount || 0} onChange={(v) => updSuper("redundancyBaseAmount", v)} prefix="$" />
          <Input label="Redundancy Per Year of Service" value={sp.redundancyServiceAmount || 0} onChange={(v) => updSuper("redundancyServiceAmount", v)} prefix="$" />
        </div>
      </Card>

      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Minimum Pension Drawdown by Age <LegBadge text="SIS Reg 1.06(9A)" /></span>}
        actions={<Btn small onClick={addDrawBand} color={COLORS.green}>+ Add Band</Btn>}>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
          The projection draws the higher of the user-set drawdown % and the age-band minimum.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 32px", gap: 8, marginBottom: 6, alignItems: "end" }}>
          <span style={{ color: COLORS.textDim, fontSize: 10 }}>Min Age</span>
          <span style={{ color: COLORS.textDim, fontSize: 10 }}>Max Age</span>
          <span style={{ color: COLORS.textDim, fontSize: 10 }}>Min Drawdown %</span>
          <span></span>
        </div>
        {minDrawRates.map((band, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 32px", gap: 8, marginBottom: 6, alignItems: "center" }}>
            <Input value={band.minAge} onChange={(v) => updDrawBand(i, "minAge", v)} small />
            <Input value={band.maxAge === Infinity || band.maxAge == null ? "∞" : band.maxAge} onChange={(v) => updDrawBand(i, "maxAge", v === "∞" ? Infinity : v)} small type="text" />
            <Input value={Math.round(band.rate * 100 * 100) / 100} onChange={(v) => updDrawBand(i, "rate", v / 100)} suffix="%" small />
            <button onClick={() => rmDrawBand(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ============================================================
// 3. CENTRELINK
// ============================================================
function CentrelinkSection({ legislation, updCL, updLeg, gifts, addGift, updGift, rmGift, currentYear, personal }) {
  const updCSHC = (f, v) => updLeg(["cshc", f], v);
  const c = legislation.centrelink;
  // Cumulative deprivation ledger (annual + rolling 5-yr caps applied together).
  const giftLedger = computeGiftLedger(gifts, c, currentYear);
  return (
    <div>
      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Age Pension Rates & Tests <LegBadge text="Social Security Act 1991" /></span>}>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
          Both assets and income tests are applied. The test yielding the <strong>lower pension</strong> applies.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <Input label="Age Qualifying Age" value={c.ageQualifyingAge} onChange={(v) => updCL("ageQualifyingAge", v)} />
          <Input label="Single Max Pension (pa)" value={c.singleMaxPension} onChange={(v) => updCL("singleMaxPension", v)} prefix="$" />
          <Input label="Couple Max Pension (pa)" value={c.coupleMaxPension} onChange={(v) => updCL("coupleMaxPension", v)} prefix="$" />
          <Input label="Illness-Separated Max (combined)" value={c.illnessSeparatedMaxPension || 0} onChange={(v) => updCL("illnessSeparatedMaxPension", v)} prefix="$" />
        </div>
      </Card>

      <Card title="Assets Test">
        <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginBottom: 8 }}>Lower thresholds (full pension starts to reduce)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Input label="Single Homeowner" value={c.singleAssetThresholdHomeowner} onChange={(v) => updCL("singleAssetThresholdHomeowner", v)} prefix="$" />
          <Input label="Couple Homeowner" value={c.coupleAssetThresholdHomeowner} onChange={(v) => updCL("coupleAssetThresholdHomeowner", v)} prefix="$" />
          <Input label="Single Non-Homeowner" value={c.singleAssetThresholdNonHomeowner || 0} onChange={(v) => updCL("singleAssetThresholdNonHomeowner", v)} prefix="$" />
          <Input label="Couple Non-Homeowner" value={c.coupleAssetThresholdNonHomeowner || 0} onChange={(v) => updCL("coupleAssetThresholdNonHomeowner", v)} prefix="$" />
          <Input label="Illness-Sep Homeowner" value={c.illnessSepAssetThresholdHomeowner || 0} onChange={(v) => updCL("illnessSepAssetThresholdHomeowner", v)} prefix="$" />
          <Input label="Illness-Sep Non-Homeowner" value={c.illnessSepAssetThresholdNonHomeowner || 0} onChange={(v) => updCL("illnessSepAssetThresholdNonHomeowner", v)} prefix="$" />
        </div>
        <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginTop: 12, marginBottom: 8 }}>Disqualifying (cut-off) thresholds</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Input label="Single Homeowner Cutoff" value={c.singleAssetCutoffHomeowner || 0} onChange={(v) => updCL("singleAssetCutoffHomeowner", v)} prefix="$" />
          <Input label="Couple Homeowner Cutoff" value={c.coupleAssetCutoffHomeowner || 0} onChange={(v) => updCL("coupleAssetCutoffHomeowner", v)} prefix="$" />
          <Input label="Single Non-Homeowner Cutoff" value={c.singleAssetCutoffNonHomeowner || 0} onChange={(v) => updCL("singleAssetCutoffNonHomeowner", v)} prefix="$" />
          <Input label="Couple Non-Homeowner Cutoff" value={c.coupleAssetCutoffNonHomeowner || 0} onChange={(v) => updCL("coupleAssetCutoffNonHomeowner", v)} prefix="$" />
        </div>
        <Input label="Asset Taper ($3/fn per $1,000 = 7.8% pa)" value={(c.assetTaperRate * 100).toFixed(2)} onChange={(v) => updCL("assetTaperRate", v / 100)} suffix="%" />
      </Card>

      <Card title="Income Test & Deeming">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <Input label="Single Free Area (pa)" value={c.singleIncomeThreshold} onChange={(v) => updCL("singleIncomeThreshold", v)} prefix="$" />
          <Input label="Couple Free Area (pa)" value={c.coupleIncomeThreshold} onChange={(v) => updCL("coupleIncomeThreshold", v)} prefix="$" />
          <Input label="Illness-Sep Free Area (per person)" value={c.illnessSepIncomeThreshold || 0} onChange={(v) => updCL("illnessSepIncomeThreshold", v)} prefix="$" />
          <Input label="Income Taper Rate" value={(c.incomeTaperRate * 100)} onChange={(v) => updCL("incomeTaperRate", v / 100)} suffix="%" />
          <Input label="Work Bonus Fortnightly Exempt" value={c.workBonusFortnightlyExempt || 0} onChange={(v) => updCL("workBonusFortnightlyExempt", v)} prefix="$" />
          <Input label="Work Bonus Annual Bank" value={c.workBonusAnnualBank || 0} onChange={(v) => updCL("workBonusAnnualBank", v)} prefix="$" />
          <Input label="Lower Deeming Rate" value={(c.deemingRateLower * 100)} onChange={(v) => updCL("deemingRateLower", v / 100)} suffix="%" />
          <Input label="Upper Deeming Rate" value={(c.deemingRateUpper * 100)} onChange={(v) => updCL("deemingRateUpper", v / 100)} suffix="%" />
          <Input label="Deeming Threshold (Single)" value={c.deemingThresholdSingle} onChange={(v) => updCL("deemingThresholdSingle", v)} prefix="$" />
          <Input label="Deeming Threshold (Couple)" value={c.deemingThresholdCouple} onChange={(v) => updCL("deemingThresholdCouple", v)} prefix="$" />
        </div>
      </Card>

      <Card title="Rent Assistance">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Input label="Max RA Single (pa)" value={c.rentAssistMaxSingle || 0} onChange={(v) => updCL("rentAssistMaxSingle", v)} prefix="$" />
          <Input label="Max RA Couple (combined)" value={c.rentAssistMaxCouple || 0} onChange={(v) => updCL("rentAssistMaxCouple", v)} prefix="$" />
          <Input label="Min Rent Single" value={c.rentAssistMinRentSingle || 0} onChange={(v) => updCL("rentAssistMinRentSingle", v)} prefix="$" />
          <Input label="Min Rent Couple" value={c.rentAssistMinRentCouple || 0} onChange={(v) => updCL("rentAssistMinRentCouple", v)} prefix="$" />
        </div>
        <Input label="RA Rate ($ per $1 of rent above min)" value={((c.rentAssistRate || 0.75) * 100)} onChange={(v) => updCL("rentAssistRate", v / 100)} suffix="%" />
      </Card>

      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Gifting & Asset Deprivation <LegBadge text="SSA 1991 s.1123-1130" /></span>}
        actions={<Btn small onClick={addGift} color={COLORS.green}>+ Add Gift</Btn>}>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
          Gifts above the free area are treated as <strong>deprived assets</strong> for {c.giftingDeprivationPeriod || 5} years.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
          <Input label="Annual Gifting Allowance" value={c.giftingFreeAreaPerYear || 10000} onChange={(v) => updCL("giftingFreeAreaPerYear", v)} prefix="$" />
          <Input label="5-Year Rolling Allowance" value={c.giftingFreeAreaFiveYear || 30000} onChange={(v) => updCL("giftingFreeAreaFiveYear", v)} prefix="$" />
          <Input label="Deprivation Period (years)" value={c.giftingDeprivationPeriod || 5} onChange={(v) => updCL("giftingDeprivationPeriod", v)} />
        </div>

        {giftLedger.map((entry, i) => {
          const g = gifts[i];
          const expired = new Date() >= (entry.expiryDate || new Date());
          const deprived = entry.deprivedAtGrant || 0;
          const fullyDeprived = deprived > 0 && deprived >= (g.amount || 0) - 0.5;
          return (
            <div key={i} style={{ background: expired ? `${COLORS.border}40` : COLORS.infoBg || "#ece8e1", borderRadius: 8, padding: 10, marginBottom: 8, border: `1px solid ${expired ? COLORS.border : deprived > 0 ? COLORS.orange + "60" : COLORS.green + "40"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: expired ? COLORS.textDim : deprived > 0 ? COLORS.orange : COLORS.green, fontSize: 11, fontWeight: 600 }}>
                  {expired ? "✓ Expired" : deprived > 0 ? (fullyDeprived ? `⚠ Fully deprived: ${fmt(g.amount)}` : `⚠ Deprived: ${fmt(deprived)}`) : "✓ Within limits"}
                </span>
                <button onClick={() => rmGift(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 6 }}>
                <Input label="Description" value={g.description} onChange={(v) => updGift(i, "description", v)} type="text" />
                <Input label="Amount" value={g.amount} onChange={(v) => updGift(i, "amount", v)} prefix="$" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <YearSelect label="Gift Financial Year" value={g.date || `${currentYear}-01-01`} onChange={(v) => updGift(i, "date", v)} personal={personal} mode="date" />
                <Input label="Recipient" value={g.recipient} onChange={(v) => updGift(i, "recipient", v)} type="text" />
              </div>
            </div>
          );
        })}
        {gifts.length === 0 && (
          <p style={{ color: COLORS.textDim, fontSize: 11 }}>No gifts recorded.</p>
        )}
      </Card>


      <Card title="Commonwealth Seniors Health Card (CSHC)">
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10 }}>
          Income test uses Adjusted Taxable Income + deemed income from ABPs commenced after 1 Jan 2015.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Input label="Single Income Limit" value={legislation.cshc?.singleIncomeLimit || 0} onChange={(v) => updCSHC("singleIncomeLimit", v)} prefix="$" />
          <Input label="Couple Income Limit (combined)" value={legislation.cshc?.coupleIncomeLimit || 0} onChange={(v) => updCSHC("coupleIncomeLimit", v)} prefix="$" />
          <Input label="Illness-Separated Limit (combined)" value={legislation.cshc?.illnessSeparatedLimit || 0} onChange={(v) => updCSHC("illnessSeparatedLimit", v)} prefix="$" />
          <Input label="Per-Child Adjustment" value={legislation.cshc?.perChildAdjustment || 0} onChange={(v) => updCSHC("perChildAdjustment", v)} prefix="$" />
        </div>
      </Card>

      <Card title="JobSeeker Allowance">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Input label="Single, No Children (pa)" value={legislation.allowance?.jobSeekerSingleNoChildren || 0} small />
          <Input label="Single, With Children (pa)" value={legislation.allowance?.jobSeekerSingleWithChildren || 0} small />
          <Input label="Couple, Per Person (pa)" value={legislation.allowance?.jobSeekerCouplePerPerson || 0} small />
          <Input label="60+ after 9 months (pa)" value={legislation.allowance?.jobSeeker60Plus9Months || 0} small />
        </div>
        <p style={{ color: COLORS.textDim, fontSize: 10, marginTop: 8 }}>
          Read-only summary — JobSeeker rates indexed automatically with the FY snapshot.
        </p>
      </Card>
    </div>
  );
}

// ============================================================
// 4. AGED CARE RULES
// ============================================================
function AgedCareRulesSection({ legislation, updACBill, updACAct, updACRoot, updHCP, agedCareModel, setModel }) {
  const ac = legislation.agedCare || {};
  const b = ac.bill2013 || {};
  const a = ac.act2024 || {};
  const hcp = ac.homeCarePackages || {};
  return (
    <div>
      <Card title="Active Aged Care Model">
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10 }}>
          The Aged Care Tab calculator uses the model selected here. Both rule sets remain editable below.
        </p>
        <Select label="Model" value={agedCareModel} onChange={setModel} options={[
          { value: "act2024", label: "Aged Care Act 2024 (commenced 1 Jul 2025)" },
          { value: "bill2013", label: "Aged Care Act 1997 — Bill 2013 reforms (historical)" },
        ]} />
        <div style={{ marginTop: 10 }}>
          <Input label="MPIR (Maximum Permissible Interest Rate)" value={((ac.mpir || 0.0834) * 100).toFixed(4)} onChange={(v) => updACRoot("mpir", v / 100)} suffix="%" />
        </div>
      </Card>

      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Aged Care Act 1997 — Bill 2013 Reforms <LegBadge text="historical" /></span>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Input label="Basic Daily Fee (annual)" value={b.basicDailyFee || 0} onChange={(v) => updACBill("basicDailyFee", v)} prefix="$" />
          <Input label="Annual Means-Tested Cap" value={b.meansTestedCareFeeAnnualCap || 0} onChange={(v) => updACBill("meansTestedCareFeeAnnualCap", v)} prefix="$" />
          <Input label="Lifetime Cap" value={b.meansTestedCareFeeLifetimeCap || 0} onChange={(v) => updACBill("meansTestedCareFeeLifetimeCap", v)} prefix="$" />
          <Input label="Income Free Area (Single)" value={b.incomeFreeAreaSingle || 0} onChange={(v) => updACBill("incomeFreeAreaSingle", v)} prefix="$" />
          <Input label="Income Free Area (Couple)" value={b.incomeFreeAreaCouple || 0} onChange={(v) => updACBill("incomeFreeAreaCouple", v)} prefix="$" />
          <Input label="Income Taper Rate" value={((b.incomeTaperRate || 0.5) * 100)} onChange={(v) => updACBill("incomeTaperRate", v / 100)} suffix="%" />
          <Input label="Asset Threshold 1" value={b.assetFirstThreshold || 0} onChange={(v) => updACBill("assetFirstThreshold", v)} prefix="$" />
          <Input label="Asset Threshold 2" value={b.assetSecondThreshold || 0} onChange={(v) => updACBill("assetSecondThreshold", v)} prefix="$" />
          <Input label="Asset Threshold 3" value={b.assetThirdThreshold || 0} onChange={(v) => updACBill("assetThirdThreshold", v)} prefix="$" />
          <Input label="Home Value Cap (Asset Test)" value={b.homeValueCapForAssetTest || 0} onChange={(v) => updACBill("homeValueCapForAssetTest", v)} prefix="$" />
        </div>
      </Card>

      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Aged Care Act 2024 <LegBadge text="commenced 1 Jul 2025" /></span>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Input label="Basic Daily Fee (annual)" value={a.basicDailyFee || 0} onChange={(v) => updACAct("basicDailyFee", v)} prefix="$" />
          <Input label="Hoteling Supplement Max (annual)" value={a.hotelingSupplementMax || 0} onChange={(v) => updACAct("hotelingSupplementMax", v)} prefix="$" />
          <Input label="Non-Clinical Care Contrib Rate" value={((a.nonClinicalCareContributionRate || 0.075) * 100)} onChange={(v) => updACAct("nonClinicalCareContributionRate", v / 100)} suffix="%" />
          <Input label="Non-Clinical Care Lifetime Cap" value={a.nonClinicalCareCap || 0} onChange={(v) => updACAct("nonClinicalCareCap", v)} prefix="$" />
          <Input label="Daily Accommodation Contrib Max" value={a.accommodationContributionDailyMax || 0} onChange={(v) => updACAct("accommodationContributionDailyMax", v)} prefix="$" />
          <Input label="Accommodation Supplement Max (annual)" value={a.accommodationSupplementMax || 0} onChange={(v) => updACAct("accommodationSupplementMax", v)} prefix="$" />
          <Input label="Income Free Area (Single)" value={a.incomeFreeAreaSingle || 0} onChange={(v) => updACAct("incomeFreeAreaSingle", v)} prefix="$" />
          <Input label="Income Free Area (Couple)" value={a.incomeFreeAreaCouple || 0} onChange={(v) => updACAct("incomeFreeAreaCouple", v)} prefix="$" />
          <Input label="Income Taper Rate" value={((a.incomeTaperRate || 0.5) * 100)} onChange={(v) => updACAct("incomeTaperRate", v / 100)} suffix="%" />
          <Input label="Asset Free Area" value={a.assetFreeArea || 0} onChange={(v) => updACAct("assetFreeArea", v)} prefix="$" />
          <Input label="Asset Taper Rate" value={((a.assetTaperRate || 0.001) * 100).toFixed(3)} onChange={(v) => updACAct("assetTaperRate", v / 100)} suffix="%" />
          <Input label="Home Value Cap (Asset Test)" value={a.homeValueCapForAssetTest || 0} onChange={(v) => updACAct("homeValueCapForAssetTest", v)} prefix="$" />
        </div>
      </Card>

      <Card title="Home Care Packages">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
          {[0,1,2,3].map(lvl => (
            <Input key={lvl} label={`Level ${lvl + 1} Subsidy`} value={(hcp.levels || [])[lvl] || 0}
              onChange={(v) => {
                const arr = [...(hcp.levels || [0,0,0,0])];
                arr[lvl] = Number(v) || 0;
                updHCP("levels", arr);
              }} prefix="$" />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
          <Input label="Basic Daily Fee % of Pension" value={((hcp.basicDailyFeeRate || 0.175) * 100)} onChange={(v) => updHCP("basicDailyFeeRate", v / 100)} suffix="%" />
          <Input label="Income-Tested Fee Annual Cap" value={hcp.incomeTestedFeeAnnualCap || 0} onChange={(v) => updHCP("incomeTestedFeeAnnualCap", v)} prefix="$" />
          <Input label="Income-Tested Fee Lifetime Cap" value={hcp.incomeTestedFeeLifetimeCap || 0} onChange={(v) => updHCP("incomeTestedFeeLifetimeCap", v)} prefix="$" />
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// 5. INDEXATION
// ============================================================
function IndexationSection({ legislation, updIdx }) {
  const idx = legislation.indexation || {};
  const buckets = [
    { key: "CPI",                          label: "CPI (general inflation)" },
    { key: "AWE",                          label: "Average Weekly Earnings" },
    { key: "PBLCI",                        label: "Pensioner Living Cost Index" },
    { key: "agePensionIndexation",         label: "Age Pension" },
    { key: "taxThresholdIndexation",       label: "Tax thresholds (typically 0)" },
    { key: "superCapIndexation",           label: "Super caps (AWOTE-linked)" },
    { key: "centrelinkThresholdIndexation", label: "Centrelink thresholds" },
    { key: "agedCareIndexation",           label: "Aged Care fees" },
    { key: "privateHealthIndexation",      label: "Private Health Insurance" },
    { key: "utilitiesIndexation",          label: "Utilities" },
    { key: "medicalIndexation",            label: "Medical" },
    { key: "educationIndexation",          label: "Education" },
    { key: "travelIndexation",             label: "Travel" },
  ];
  return (
    <div>
      <Card title="Indexation Buckets">
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 12 }}>
          These rates control how each expense category (and legislated threshold, where indexed) grows each year. Every expense in the Expenses tab is tagged with one of these buckets.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {buckets.map(b => (
            <Input key={b.key} label={b.label} value={(((idx[b.key] ?? 0)) * 100).toFixed(2)} onChange={(v) => updIdx(b.key, v / 100)} suffix="%" />
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================
function ToggleRow({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 12, color: COLORS.text, fontFamily: "'DM Sans', sans-serif" }}>
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: COLORS.accent, width: 16, height: 16 }} />
      {label}
    </label>
  );
}

function getIn(obj, path) {
  let cur = obj;
  for (const k of path) { if (cur == null) return undefined; cur = cur[k]; }
  return cur;
}
function setIn(obj, path, value) {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const isArr = Array.isArray(obj);
  const copy = isArr ? [...obj] : { ...(obj || {}) };
  copy[head] = setIn(obj == null ? undefined : obj[head], rest, value);
  return copy;
}
