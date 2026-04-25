import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { COLORS, THEMES } from "./data/themes";
import { TABS } from "./data/tabs";
import { COVENANT_LOGO } from "./data/logo";
import { DEFAULT_STATE } from "./data/defaultState";
import { runProjection } from "./lib/projection";
import {
  DashboardTab, PersonalTab, IncomeTab, AssetsTab, ExpensesTab,
  LiabilitiesTab, ProjectionsTab, MonteCarloTab, TaxTab, ReturnsTab, SettingsTab,
} from "./tabs";
import { FinancialAssistant } from "./components";

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [state, setState] = useState(DEFAULT_STATE);
  const [afterState, setAfterStateRaw] = useState(null);
  // afterDirty tracks whether the user has made an independent edit in the After scenario.
  // While false, After auto-mirrors Now so empty edits never create phantom Value-of-Advice variance.
  const [afterDirty, setAfterDirty] = useState(false);
  const [scenario, setScenario] = useState("now");
  const [theme, setThemeState] = useState("Covenant Wealth");

  const setTheme = (name) => {
    const t = THEMES[name] || THEMES["Covenant Wealth"];
    Object.assign(COLORS, t);
    setThemeState(name);
  };

  useEffect(() => { Object.assign(COLORS, THEMES[theme]); }, []);

  // Wrapped After setter — every tab edit goes through here so we can mark After as user-edited.
  // Once dirty, After stops auto-syncing from Now and represents an independent advice scenario.
  const setAfterState = useCallback((updater) => {
    setAfterStateRaw(updater);
    setAfterDirty(true);
  }, []);

  // Auto-sync: while After is untouched (afterDirty === false) and exists, any Now edit re-clones into After
  // so the user can enter Now data in any order without creating phantom variance.
  // Skip the very first run (which would re-clone DEFAULT_STATE on mount).
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    if (afterState && !afterDirty) {
      setAfterStateRaw(JSON.parse(JSON.stringify(state)));
    }
  }, [state]); // afterState/afterDirty intentionally omitted — only Now edits trigger a re-sync

  const activateAfter = () => {
    if (!afterState) {
      setAfterStateRaw(JSON.parse(JSON.stringify(state)));
      setAfterDirty(false); // fresh clone — no user edits yet, keep auto-sync on
    }
    setScenario("after");
  };
  const activateNow = () => setScenario("now");
  const resetAfter = () => {
    setAfterStateRaw(JSON.parse(JSON.stringify(state)));
    setAfterDirty(false); // reset clears user edits — auto-sync resumes
    setScenario("after");
  };

  const activeState = scenario === "after" && afterState ? afterState : state;
  const setActiveState = scenario === "after" ? setAfterState : setState;

  const projectionData = useMemo(() => runProjection(state, false), [state]);
  const afterProjectionData = useMemo(() => afterState ? runProjection(afterState, false) : null, [afterState]);

  const isCovenant = theme === "Covenant Wealth";

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>{`
        input, select, textarea {
          font-size: 16px !important;
          transform: scale(0.8);
          transform-origin: left center;
          width: 125% !important;
          margin-right: -25% !important;
        }
        @media (hover: hover) and (pointer: fine) {
          input, select, textarea {
            font-size: 13px !important;
            transform: none !important;
            width: 100% !important;
            margin-right: 0 !important;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: COLORS.headerBg || COLORS.card, borderBottom: isCovenant ? `3px solid #cfc090` : `1px solid ${COLORS.border}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="flex items-center gap-3">
          {isCovenant ? (
            <img src={COVENANT_LOGO} alt="Covenant Wealth" style={{ height: 36 }} />
          ) : (
            <>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>F</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.5, color: COLORS.headerText || COLORS.text }}>{COLORS.appTitle || "Australian Financial Planner"}</div>
                <div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: 0.5 }}>{COLORS.appSubtitle || "CASHFLOW · TAX · SUPER · CENTRELINK · MONTE CARLO"}</div>
              </div>
            </>
          )}
        </div>
        <div style={{ fontSize: 11, color: isCovenant ? (COLORS.headerText || "#fff") : COLORS.textDim }}>
          {state.personal.person1.name}{state.personal.isCouple ? ` & ${state.personal.person2.name}` : ""}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ background: COLORS.navBg || COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "0 16px", display: "flex", gap: 0, overflowX: "auto" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none", border: "none", borderBottom: tab === t.id ? `2px solid ${COLORS.accent}` : "2px solid transparent",
              color: tab === t.id ? COLORS.accent : COLORS.textDim, padding: "10px 14px", fontSize: 12, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: tab === t.id ? 600 : 400, whiteSpace: "nowrap", transition: "all 0.15s",
            }}
          >
            <span style={{ marginRight: 5 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 60px" }}>
        {tab === "dashboard" && <DashboardTab state={state} projectionData={projectionData} afterProjectionData={afterProjectionData} afterState={afterState} scenario={scenario} setState={setState} setAfterState={setAfterState} />}
        {tab === "personal" && <PersonalTab state={state} setState={setState} />}
        {tab === "income" && <IncomeTab state={activeState} setState={setActiveState} scenario={scenario} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} afterState={afterState} />}
        {tab === "assets" && <AssetsTab state={activeState} setState={setActiveState} scenario={scenario} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} afterState={afterState} />}
        {tab === "expenses" && <ExpensesTab state={activeState} setState={setActiveState} scenario={scenario} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} afterState={afterState} />}
        {tab === "liabilities" && <LiabilitiesTab state={activeState} setState={setActiveState} scenario={scenario} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} afterState={afterState} />}
        {tab === "projections" && <ProjectionsTab state={state} setState={setState} setAfterState={setAfterState} projectionData={projectionData} afterProjectionData={afterProjectionData} scenario={scenario} afterState={afterState} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} setTab={setTab} />}
        {tab === "monte_carlo" && <MonteCarloTab state={state} afterState={afterState} scenario={scenario} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} />}
        {tab === "tax_rates" && <TaxTab state={state} setState={setState} />}
        {tab === "returns" && <ReturnsTab state={state} setState={setState} />}
        {tab === "settings" && <SettingsTab theme={theme} setTheme={setTheme} state={state} setState={setState} />}
      </div>

      {/* AI Financial Literacy Assistant */}
      <FinancialAssistant tab={tab} />
    </div>
  );
}
