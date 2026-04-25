import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from "recharts";
import { COLORS, THEMES } from "../data/themes";
import { TABS } from "../data/tabs";
import { ASSET_LABELS, DEFAULT_RETURN_PROFILES, DEFAULT_ASSET_RETURNS } from "../data/returnProfiles";
import { DEFAULT_TAX_BRACKETS_2024, DEFAULT_SUPER_PARAMS, DEFAULT_CENTRELINK, DEFAULT_MEDICARE } from "../data/tax2024";
import { Input, DateInput, FYInput, Select, Card, StatCard, Btn, Modal, HeaderBtn, ScenarioToggle, ReturnSummary, FinancialAssistant } from "../components";
import { fmt, pct, calcIncomeTax, calcMedicare, boxMullerRandom, calcDeprivedAssets, calcCentrelinkPension, calcDeemedIncome, getMonthlyEquiv, calcLoanPayoff, runProjection } from "../lib";
export function ReturnsTab({ state, setState }) {
  const updReturn = (asset, field, val) => setState(s => ({ ...s, assetReturns: { ...s.assetReturns, [asset]: { ...s.assetReturns[asset], [field]: val } } }));
  const updProfile = (profile, asset, val) => setState(s => ({ ...s, returnProfiles: { ...s.returnProfiles, [profile]: { ...s.returnProfiles[profile], [asset]: val / 100 } } }));

  const selectedProfile = Object.keys(state.returnProfiles)[0];
  const [viewProfile, setViewProfile] = useState(selectedProfile);

  return (
    <div>
      <Card title="Asset Class Return Assumptions">
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 , alignItems: "end" }}>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Asset Class</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Income Yield %</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Capital Growth %</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Volatility (σ) %</span>
        </div>
        {Object.entries(state.assetReturns).map(([key, r]) => (
          <div key={key} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <span style={{ color: COLORS.text, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{ASSET_LABELS[key]}</span>
            <Input value={(r.income * 100)} onChange={(v) => updReturn(key, "income", v / 100)} suffix="%" small />
            <Input value={(r.growth * 100)} onChange={(v) => updReturn(key, "growth", v / 100)} suffix="%" small />
            <Input value={(r.volatility * 100)} onChange={(v) => updReturn(key, "volatility", v / 100)} suffix="%" small />
          </div>
        ))}
      </Card>

      <Card title="Portfolio Allocation Profiles">
        <div className="flex gap-2" style={{ marginBottom: 16, flexWrap: "wrap" }}>
          {Object.keys(state.returnProfiles).map(p => (
            <Btn key={p} small active={viewProfile === p} onClick={() => setViewProfile(p)}>{p}</Btn>
          ))}
        </div>
        {viewProfile && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 8 , alignItems: "end" }}>
              <span style={{ color: COLORS.textDim, fontSize: 11 }}>Asset Class</span>
              <span style={{ color: COLORS.textDim, fontSize: 11 }}>Allocation %</span>
              <span style={{ color: COLORS.textDim, fontSize: 11 }}>Expected Return</span>
            </div>
            {Object.entries(state.returnProfiles[viewProfile]).map(([asset, alloc]) => {
              const ret = state.assetReturns[asset];
              const totalReturn = ret ? (ret.income + ret.growth) : 0;
              return (
                <div key={asset} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <span style={{ color: COLORS.text, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{ASSET_LABELS[asset]}</span>
                  <Input value={(alloc * 100).toFixed(0)} onChange={(v) => updProfile(viewProfile, asset, Number(v))} suffix="%" small />
                  <span style={{ color: COLORS.cyan, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{pct(totalReturn)}</span>
                </div>
              );
            })}
            <div style={{ marginTop: 12, padding: 10, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
              <span style={{ color: COLORS.textDim, fontSize: 11 }}>Weighted Expected Return: </span>
              <span style={{ color: COLORS.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>
                {pct(Object.entries(state.returnProfiles[viewProfile]).reduce((s, [a, w]) => {
                  const r = state.assetReturns[a]; return s + (r ? (r.income + r.growth) * w : 0);
                }, 0))}
              </span>
            </div>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={Object.entries(state.returnProfiles[viewProfile] || {}).map(([k, v]) => ({ name: ASSET_LABELS[k], allocation: v * 100 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="name" tick={{ fill: COLORS.textDim, fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} />
              <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
              <Bar dataKey="allocation" fill={COLORS.accent} radius={[4, 4, 0, 0]} name="Allocation %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

