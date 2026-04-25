import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from "recharts";
import { COLORS, THEMES } from "../data/themes";
import { TABS } from "../data/tabs";
import { ASSET_LABELS, DEFAULT_RETURN_PROFILES, DEFAULT_ASSET_RETURNS } from "../data/returnProfiles";
import { DEFAULT_TAX_BRACKETS_2024, DEFAULT_SUPER_PARAMS, DEFAULT_CENTRELINK, DEFAULT_MEDICARE } from "../data/tax2024";
import { Input, DateInput, FYInput, Select, Card, StatCard, Btn, Modal, HeaderBtn, ScenarioToggle, ReturnSummary, FinancialAssistant } from "../components";
import { fmt, pct, calcIncomeTax, calcMedicare, boxMullerRandom, calcDeprivedAssets, calcCentrelinkPension, calcDeemedIncome, getMonthlyEquiv, calcLoanPayoff, runProjection } from "../lib";
export function TaxTab({ state, setState }) {
  const { legislation } = state;
  const gifts = state.gifts || [];
  const currentYear = new Date().getFullYear();

  const updBracket = (i, f, v) => {
    const arr = [...legislation.taxBrackets]; arr[i] = { ...arr[i], [f]: v };
    setState(s => ({ ...s, legislation: { ...s.legislation, taxBrackets: arr } }));
  };
  const updSuper = (f, v) => setState(s => ({ ...s, legislation: { ...s.legislation, superParams: { ...s.legislation.superParams, [f]: v } } }));
  const minDrawRates = legislation.superParams.minPensionDrawdownRates || [];
  const updDrawBand = (i, f, v) => {
    const arr = [...minDrawRates];
    arr[i] = { ...arr[i], [f]: v };
    setState(s => ({ ...s, legislation: { ...s.legislation, superParams: { ...s.legislation.superParams, minPensionDrawdownRates: arr } } }));
  };
  const addDrawBand = () => setState(s => ({ ...s, legislation: { ...s.legislation, superParams: { ...s.legislation.superParams, minPensionDrawdownRates: [...minDrawRates, { minAge: 0, maxAge: 999, rate: 0.04 }] } } }));
  const rmDrawBand = (i) => setState(s => ({ ...s, legislation: { ...s.legislation, superParams: { ...s.legislation.superParams, minPensionDrawdownRates: minDrawRates.filter((_, j) => j !== i) } } }));
  const updCL = (f, v) => setState(s => ({ ...s, legislation: { ...s.legislation, centrelink: { ...s.legislation.centrelink, [f]: v } } }));
  const updMed = (f, v) => setState(s => ({ ...s, legislation: { ...s.legislation, medicare: { ...s.legislation.medicare, [f]: v } } }));
  const addGift = () => setState(s => ({ ...s, gifts: [...(s.gifts || []), { description: "", amount: 0, date: new Date().toISOString().split("T")[0], recipient: "" }] }));
  const updGift = (i, f, v) => { const arr = [...gifts]; arr[i] = { ...arr[i], [f]: v }; setState(s => ({ ...s, gifts: arr })); };
  const rmGift = (i) => setState(s => ({ ...s, gifts: s.gifts.filter((_, j) => j !== i) }));

  const LegBadge = ({ text }) => (
    <span style={{ fontSize: 9, background: `${COLORS.accent}20`, color: COLORS.accent, padding: "2px 6px", borderRadius: 4, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: 0.3 }}>{text}</span>
  );

  return (
    <div>
      <div style={{ padding: "10px 14px", background: `${COLORS.accent}12`, border: `1px solid ${COLORS.accent}30`, borderRadius: 8, marginBottom: 12 }}>
        <p style={{ color: COLORS.accent, fontSize: 11, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
          Rates shown are <strong>2025–26 financial year</strong>. All projections recalculate automatically when values are changed.
        </p>
      </div>

      {/* Income Tax */}
      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Income Tax Brackets <LegBadge text="ITAA 1997 — FY 2025–26" /></span>}>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
          Stage 3 tax cuts effective 1 July 2024. Low income tax offset (LITO) up to $700 applies below $37,500.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8, alignItems: "end" }}>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Range</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Min ($)</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Max ($)</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Rate (%)</span>
        </div>
        {legislation.taxBrackets.map((b, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <span style={{ color: COLORS.text, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{b.label}</span>
            <Input value={b.min} onChange={(v) => updBracket(i, "min", v)} small />
            <Input value={b.max === Infinity ? "∞" : b.max} onChange={(v) => updBracket(i, "max", v === "∞" ? Infinity : v)} small type="text" />
            <Input value={(b.rate * 100)} onChange={(v) => updBracket(i, "rate", v / 100)} suffix="%" small />
          </div>
        ))}
      </Card>

      {/* Medicare */}
      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Medicare Levy <LegBadge text="MLAA 1986 — 2.0% from 2014" /></span>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <Input label="Levy Rate" value={(legislation.medicare.levyRate * 100)} onChange={(v) => updMed("levyRate", v / 100)} suffix="%" />
            <Input label="Surcharge Rate (no private)" value={(legislation.medicare.surchargeRate * 100)} onChange={(v) => updMed("surchargeRate", v / 100)} suffix="%" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <Input label="Surcharge Threshold (Single)" value={legislation.medicare.surchargeThresholdSingle} onChange={(v) => updMed("surchargeThresholdSingle", v)} prefix="$" />
            <Input label="Surcharge Threshold (Family)" value={legislation.medicare.surchargeThresholdFamily} onChange={(v) => updMed("surchargeThresholdFamily", v)} prefix="$" />
          </div>
        </div>
      </Card>

      {/* Superannuation */}
      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Superannuation <LegBadge text="SIS Act 1993 — FY 2025–26" /></span>}>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
          SG rate 12% from 1 Jul 2025. Pension phase earnings tax-exempt. Division 293 applies above ${(legislation.superParams.div293Threshold || 250000).toLocaleString()}.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Concessional Cap" value={legislation.superParams.concessionalCap} onChange={(v) => updSuper("concessionalCap", v)} prefix="$" />
            <Input label="Non-Concessional Cap" value={legislation.superParams.nonConcessionalCap} onChange={(v) => updSuper("nonConcessionalCap", v)} prefix="$" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="SG Rate" value={(legislation.superParams.sgRate * 100)} onChange={(v) => updSuper("sgRate", v / 100)} suffix="%" />
            <Input label="Preservation Age" value={legislation.superParams.preservationAge} onChange={(v) => updSuper("preservationAge", v)} />
            <Input label="Earliest Super Access Age" value={legislation.superParams.earliestSuperAccessAge ?? 60} onChange={(v) => updSuper("earliestSuperAccessAge", v)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Accumulation Tax Rate" value={(legislation.superParams.taxRate * 100)} onChange={(v) => updSuper("taxRate", v / 100)} suffix="%" />
            <Input label="Pension Phase Tax Rate" value={((legislation.superParams.pensionTaxRate || 0) * 100)} onChange={(v) => updSuper("pensionTaxRate", v / 100)} suffix="%" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Div. 293 Threshold" value={legislation.superParams.div293Threshold || 250000} onChange={(v) => updSuper("div293Threshold", v)} prefix="$" />
            <Input label="Div. 293 Extra Tax Rate" value={((legislation.superParams.div293Rate || 0.15) * 100)} onChange={(v) => updSuper("div293Rate", v / 100)} suffix="%" />
          </div>
          <Input label="Transfer Balance Cap" value={legislation.superParams.transferBalanceCap} onChange={(v) => updSuper("transferBalanceCap", v)} prefix="$" />

          {/* Minimum Pension Drawdown Schedule (SIS Reg 1.06(9A)) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 4 }}>
            <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              Account-Based Pension — Minimum Drawdown by Age <LegBadge text="SIS Reg 1.06(9A)" />
            </div>
            <Btn small onClick={addDrawBand} color={COLORS.green}>+ Add Band</Btn>
          </div>
          <p style={{ color: COLORS.textDim, fontSize: 10, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
            Standard schedule effective from 1 Jul 2023 (COVID-19 50% halving has ended). The projection draws the higher of the user-set drawdown % and the age-based minimum.
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
        </div>
      </Card>

      {/* Centrelink */}
      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Age Pension <LegBadge text="Social Security Act 1991 — Mar 2025 indexed" /></span>}>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
          Both assets test and income test are applied. The test yielding the <strong>lower pension</strong> applies. Super in accumulation phase is excluded from assets test until pension age.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Single Max Pension (pa)" value={legislation.centrelink.singleMaxPension} onChange={(v) => updCL("singleMaxPension", v)} prefix="$" />
            <Input label="Couple Max Pension (pa)" value={legislation.centrelink.coupleMaxPension} onChange={(v) => updCL("coupleMaxPension", v)} prefix="$" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Age Qualifying Age" value={legislation.centrelink.ageQualifyingAge} onChange={(v) => updCL("ageQualifyingAge", v)} />
            <Input label="Asset Taper ($3/fn per $1,000 = 7.8% pa)" value={(legislation.centrelink.assetTaperRate * 100).toFixed(1)} onChange={(v) => updCL("assetTaperRate", v / 100)} suffix="%" />
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginTop: 4 }}>Assets Test Thresholds (lower threshold = full pension starts to reduce)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Single Homeowner" value={legislation.centrelink.singleAssetThresholdHomeowner} onChange={(v) => updCL("singleAssetThresholdHomeowner", v)} prefix="$" />
            <Input label="Couple Homeowner" value={legislation.centrelink.coupleAssetThresholdHomeowner} onChange={(v) => updCL("coupleAssetThresholdHomeowner", v)} prefix="$" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Single Non-Homeowner" value={legislation.centrelink.singleAssetThresholdNonHomeowner || 566000} onChange={(v) => updCL("singleAssetThresholdNonHomeowner", v)} prefix="$" />
            <Input label="Couple Non-Homeowner" value={legislation.centrelink.coupleAssetThresholdNonHomeowner || 722000} onChange={(v) => updCL("coupleAssetThresholdNonHomeowner", v)} prefix="$" />
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginTop: 4 }}>Income Test</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Single Free Area (pa)" value={legislation.centrelink.singleIncomeThreshold} onChange={(v) => updCL("singleIncomeThreshold", v)} prefix="$" />
            <Input label="Couple Free Area (pa)" value={legislation.centrelink.coupleIncomeThreshold} onChange={(v) => updCL("coupleIncomeThreshold", v)} prefix="$" />
          </div>
          <Input label="Income Taper Rate" value={(legislation.centrelink.incomeTaperRate * 100)} onChange={(v) => updCL("incomeTaperRate", v / 100)} suffix="%" />
          <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginTop: 4 }}>Deeming Rates (frozen until 30 Jun 2025)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Lower Deeming Rate" value={(legislation.centrelink.deemingRateLower * 100)} onChange={(v) => updCL("deemingRateLower", v / 100)} suffix="%" />
            <Input label="Upper Deeming Rate" value={(legislation.centrelink.deemingRateUpper * 100)} onChange={(v) => updCL("deemingRateUpper", v / 100)} suffix="%" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Deeming Threshold (Single)" value={legislation.centrelink.deemingThresholdSingle} onChange={(v) => updCL("deemingThresholdSingle", v)} prefix="$" />
            <Input label="Deeming Threshold (Couple)" value={legislation.centrelink.deemingThresholdCouple} onChange={(v) => updCL("deemingThresholdCouple", v)} prefix="$" />
          </div>
        </div>
      </Card>

      {/* Gifting Rules */}
      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Centrelink Gifting & Asset Deprivation <LegBadge text="SSA 1991 s.1123–1130 — 5-year rule" /></span>}
            actions={<Btn small onClick={addGift} color={COLORS.green}>+ Add Gift</Btn>}>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
          Gifts up to <strong>$10,000/year</strong> (max $30,000 over 5 years) are exempt. Amounts above these limits are treated as <strong>deprived assets</strong> and continue to count in the assets test for <strong>5 years</strong> from the date of gift.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10, alignItems: "end" }}>
          <Input label="Annual Gifting Allowance" value={legislation.centrelink.giftingFreeAreaPerYear || 10000} onChange={(v) => updCL("giftingFreeAreaPerYear", v)} prefix="$" />
          <Input label="5-Year Rolling Allowance" value={legislation.centrelink.giftingFreeAreaFiveYear || 30000} onChange={(v) => updCL("giftingFreeAreaFiveYear", v)} prefix="$" />
        </div>

        {gifts.map((g, i) => {
          const yearsAgo = currentYear - (g.year || currentYear);
          const expired = yearsAgo >= 5;
          const freeArea = legislation.centrelink.giftingFreeAreaPerYear || 10000;
          const deprived = Math.max(0, (g.amount || 0) - freeArea);
          return (
            <div key={i} style={{ background: expired ? `${COLORS.border}40` : COLORS.infoBg || "#ece8e1", borderRadius: 8, padding: 10, marginBottom: 8, border: `1px solid ${expired ? COLORS.border : deprived > 0 ? COLORS.orange + "60" : COLORS.green + "40"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ color: expired ? COLORS.textDim : deprived > 0 ? COLORS.orange : COLORS.green, fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                    {expired ? "✓ Expired (5yr passed)" : deprived > 0 ? `⚠ Deprived: ${fmt(deprived)}` : "✓ Within limits"}
                  </span>
                </div>
                <button onClick={() => rmGift(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 6, alignItems: "end" }}>
                <Input label="Description" value={g.description} onChange={(v) => updGift(i, "description", v)} type="text" />
                <Input label="Amount" value={g.amount} onChange={(v) => updGift(i, "amount", v)} prefix="$" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
                <DateInput label="Date of Gift (DD/MM/YYYY)" value={g.date || `${currentYear}-01-01`} onChange={(v) => updGift(i, "date", v)} />
                <Input label="Recipient" value={g.recipient} onChange={(v) => updGift(i, "recipient", v)} type="text" />
              </div>
              {!expired && deprived > 0 && (
                <div style={{ marginTop: 6, fontSize: 10, color: COLORS.orange, fontFamily: "'DM Sans', sans-serif" }}>
                  {fmt(deprived)} counts as a deprived asset until {(g.year || currentYear) + 5}
                </div>
              )}
            </div>
          );
        })}
        {gifts.length === 0 && (
          <p style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>No gifts recorded. Add gifts to track Centrelink deprivation rules.</p>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// RETURNS & PORTFOLIO TAB
// ============================================================
