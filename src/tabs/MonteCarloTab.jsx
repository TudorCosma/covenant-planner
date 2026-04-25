import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from "recharts";
import { COLORS, THEMES } from "../data/themes";
import { TABS } from "../data/tabs";
import { ASSET_LABELS, DEFAULT_RETURN_PROFILES, DEFAULT_ASSET_RETURNS } from "../data/returnProfiles";
import { DEFAULT_TAX_BRACKETS_2024, DEFAULT_SUPER_PARAMS, DEFAULT_CENTRELINK, DEFAULT_MEDICARE } from "../data/tax2024";
import { Input, DateInput, FYInput, Select, Card, StatCard, Btn, Modal, HeaderBtn, ScenarioToggle, ReturnSummary, FinancialAssistant } from "../components";
import { fmt, pct, calcIncomeTax, calcMedicare, boxMullerRandom, calcDeprivedAssets, calcCentrelinkPension, calcDeemedIncome, getMonthlyEquiv, calcLoanPayoff, runProjection } from "../lib";
export function MonteCarloTab({ state, afterState, scenario, onActivateAfter, onActivateNow, onResetAfter }) {
  const [simulations, setSimulations] = useState(500);
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  const activeState = scenario === "after" && afterState ? afterState : state;

  const runSim = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const allRuns = [];
      const years = activeState.personal.projectionYears || 30;
      for (let i = 0; i < simulations; i++) {
        const data = runProjection(activeState, true, i);
        allRuns.push(data);
      }

      // Percentile calculations
      const percentileData = [];
      for (let y = 0; y < years; y++) {
        const netAssetsAtYear = allRuns.map(r => r[y]?.netAssets || 0).sort((a, b) => a - b);
        const p5 = netAssetsAtYear[Math.floor(simulations * 0.05)];
        const p25 = netAssetsAtYear[Math.floor(simulations * 0.25)];
        const p50 = netAssetsAtYear[Math.floor(simulations * 0.50)];
        const p75 = netAssetsAtYear[Math.floor(simulations * 0.75)];
        const p95 = netAssetsAtYear[Math.floor(simulations * 0.95)];
        const mean = netAssetsAtYear.reduce((s, v) => s + v, 0) / simulations;
        percentileData.push({
          year: allRuns[0][y]?.year, age1: allRuns[0][y]?.age1,
          p5, p25, p50, p75, p95, mean,
          range_5_95: p95 - p5, range_25_75: p75 - p25,
        });
      }

      const finalAssets = allRuns.map(r => r[r.length - 1]?.netAssets || 0);
      const successRate = finalAssets.filter(v => v > 0).length / simulations * 100;
      const exhaustionAges = allRuns.map(r => {
        const idx = r.findIndex(d => d.netAssets <= 0);
        return idx >= 0 ? r[idx].age1 : null;
      }).filter(v => v !== null);
      const avgExhaustion = exhaustionAges.length > 0 ? exhaustionAges.reduce((s, v) => s + v, 0) / exhaustionAges.length : null;

      // Distribution histogram
      const bins = 30;
      const minVal = Math.min(...finalAssets);
      const maxVal = Math.max(...finalAssets);
      const binWidth = (maxVal - minVal) / bins || 1;
      const histogram = Array(bins).fill(0);
      finalAssets.forEach(v => {
        const bin = Math.min(bins - 1, Math.floor((v - minVal) / binWidth));
        histogram[bin]++;
      });
      const histData = histogram.map((count, i) => ({ value: Math.round(minVal + i * binWidth), count, pct: (count / simulations * 100).toFixed(1) }));

      setResults({ percentileData, successRate, avgExhaustion, histData, finalAssets, simCount: simulations });
      setRunning(false);
    }, 100);
  }, [activeState, simulations]);

  return (
    <div>
      <ScenarioToggle scenario={scenario} onActivateAfter={onActivateAfter} onActivateNow={onActivateNow} onResetAfter={onResetAfter} afterState={afterState} tabName="Stress Testing" readOnly />

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>
              {scenario === "after" && afterState ? "✨ After Advice Simulation" : "Probability Analysis"}
            </div>
            <p style={{ color: COLORS.textDim, fontSize: 12, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, margin: 0 }}>
              {scenario === "after" && afterState
                ? "Simulating the After Advice scenario with randomised returns. Compare the success rate and median outcome against your baseline."
                : "Models thousands of possible futures using randomised returns based on each asset class's volatility. Shows the range of outcomes from worst to best case."}
            </p>
          </div>
          <div className="flex gap-3 items-end">
            <Input label="Simulations" value={simulations} onChange={setSimulations} />
            <Btn onClick={runSim} color={COLORS.green}>{running ? "Running…" : "Run Simulation"}</Btn>
          </div>
        </div>
      </Card>

      {results && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ color: COLORS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Success Rate</div>
              <div style={{ color: results.successRate >= 90 ? COLORS.green : results.successRate >= 70 ? COLORS.orange : COLORS.red, fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{results.successRate.toFixed(1)}%</div>
              <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Assets remain at end of plan</div>
            </div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ color: COLORS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Median Outcome</div>
              <div style={{ color: COLORS.accent, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(results.percentileData[results.percentileData.length - 1]?.p50)}</div>
              <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>50th percentile final assets</div>
            </div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ color: COLORS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Worst Case</div>
              <div style={{ color: COLORS.red, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(results.percentileData[results.percentileData.length - 1]?.p5)}</div>
              <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>5th percentile final assets</div>
            </div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ color: COLORS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Best Case</div>
              <div style={{ color: COLORS.green, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(results.percentileData[results.percentileData.length - 1]?.p95)}</div>
              <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>95th percentile final assets</div>
            </div>
            {results.avgExhaustion && (
              <div style={{ background: `${COLORS.red}10`, border: `1px solid ${COLORS.red}30`, borderRadius: 10, padding: "14px 16px", gridColumn: "1 / -1" }}>
                <div style={{ color: COLORS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Average Age Assets Run Out</div>
                <div style={{ color: COLORS.red, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(results.avgExhaustion)}</div>
                <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>In scenarios where assets are exhausted</div>
              </div>
            )}
          </div>

          <Card title="Net Assets – Percentile Bands">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={results.percentileData}>
                <defs>
                  <linearGradient id="gBand1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.1} /><stop offset="100%" stopColor={COLORS.accent} stopOpacity={0.05} /></linearGradient>
                  <linearGradient id="gBand2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.2} /><stop offset="100%" stopColor={COLORS.accent} stopOpacity={0.1} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 11 }} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} tickFormatter={fmt} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                <Area type="monotone" dataKey="p95" stroke="none" fill="url(#gBand1)" name="95th" />
                <Area type="monotone" dataKey="p75" stroke="none" fill="url(#gBand2)" name="75th" />
                <Line type="monotone" dataKey="p50" stroke={COLORS.accent} strokeWidth={2.5} dot={false} name="Median" />
                <Area type="monotone" dataKey="p25" stroke="none" fill="url(#gBand2)" name="25th" />
                <Area type="monotone" dataKey="p5" stroke="none" fill="url(#gBand1)" name="5th" />
                <Line type="monotone" dataKey="mean" stroke={COLORS.green} strokeWidth={1.5} dot={false} strokeDasharray="5 5" name="Mean" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Distribution of Final Net Assets">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={results.histData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="value" tick={{ fill: COLORS.textDim, fontSize: 10 }} tickFormatter={fmt} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} />
                <Tooltip formatter={(v, name) => name === "count" ? v : `${v}%`} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} labelFormatter={(v) => `Net Assets: ${fmt(v)}`} />
                <Bar dataKey="count" fill={COLORS.accent} radius={[2, 2, 0, 0]} name="Simulations" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}

// ============================================================
// LIABILITIES TAB
// ============================================================
