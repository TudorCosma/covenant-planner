import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { COLORS, THEMES } from "./data/themes";
import { TABS } from "./data/tabs";
import { COVENANT_LOGO } from "./data/logo";
import { DEFAULT_STATE } from "./data/defaultState";
import { loadLegislation } from "./data/legislation";
import { runProjection } from "./lib/projection";
import { saveState as persistSave, loadState as persistLoad, clearState as persistClear, exportPlanToFile, importPlanFromFile } from "./lib/persistence";
import {
  DashboardTab, PersonalTab, IncomeTab, AssetsTab, ExpensesTab,
  LiabilitiesTab, ProjectionsTab, MonteCarloTab, TaxTab, ReturnsTab, SettingsTab,
  AgedCareTab, CashflowLedgerTab, GoalsTab,
} from "./tabs";
import { FinancialAssistant, FYSelect } from "./components";
import { Wizard } from "./wizard/Wizard";

// Hydrate from localStorage synchronously on first render so the user sees their
// last plan immediately — no flash of DEFAULT_STATE then snap-to-saved.
const SAVED = persistLoad();

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [state, setState] = useState(SAVED?.state || DEFAULT_STATE);
  const [afterState, setAfterStateRaw] = useState(SAVED?.afterState || null);
  // afterDirty tracks whether the user has made an independent edit in the After scenario.
  // While false, After auto-mirrors Now so empty edits never create phantom Value-of-Advice variance.
  const [afterDirty, setAfterDirty] = useState(SAVED?.afterDirty ?? false);
  const [scenario, setScenario] = useState(SAVED?.scenario || "now");
  const [theme, setThemeState] = useState(SAVED?.theme || "Covenant Wealth");
  const [saveStatus, setSaveStatus] = useState(SAVED ? "restored" : "idle"); // idle | saving | saved | restored | error
  const fileInputRef = useRef(null);

  // First-run wizard — show whenever the active plan has no `wizardCompleted` flag
  // (covers truly fresh installs AND legacy saved plans that pre-date V2). Skipped
  // when proMode is on. Re-launchable later by resetting from the header.
  const [showWizard, setShowWizard] = useState(() => {
    const savedState = SAVED?.state;
    const completed = savedState?.wizardCompleted ?? false;
    const proMode = savedState?.proMode ?? DEFAULT_STATE.proMode;
    return !completed && !proMode;
  });

  // FY changer — replaces state.legislation with the registry snapshot for the chosen year.
  // Mirrors the same change into afterState so both scenarios stay on the same rule set.
  const changeFY = useCallback((newFY) => {
    const fresh = loadLegislation(newFY);
    setState(s => ({ ...s, legislationFY: newFY, legislation: fresh }));
    setAfterStateRaw(prev => prev ? { ...prev, legislationFY: newFY, legislation: structuredClone(fresh) } : prev);
  }, []);

  // Pro mode toggle — exposes advisor-level labels (G-codes, technical terms).
  const toggleProMode = useCallback(() => {
    setState(s => ({ ...s, proMode: !s.proMode }));
  }, []);

  const setTheme = (name) => {
    const t = THEMES[name] || THEMES["Covenant Wealth"];
    Object.assign(COLORS, t);
    setThemeState(name);
  };

  useEffect(() => { Object.assign(COLORS, THEMES[theme]); }, []);

  // Hash-based routing — read the initial URL hash to land on the right section
  // (e.g. https://…/covenant-planner/#projections opens the Projections tab directly).
  // replaceState keeps the URL in sync as the user navigates, giving every section a
  // real shareable URL without polluting browser history on every click.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && TABS.find(t => t.id === hash)) setTab(hash);
  }, []);
  useEffect(() => {
    window.history.replaceState(null, "", "#" + tab);
  }, [tab]);

  // Apple theme swaps the global font stack to SF Pro via a body class (inline
  // 'DM Sans' styles are overridden by the !important rule in index.html). Only
  // active for the Apple theme — Default and Covenant Wealth are untouched.
  useEffect(() => {
    document.body.classList.toggle("theme-apple", theme === "Apple");
  }, [theme]);

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
      setAfterStateRaw(structuredClone(state));
    }
  }, [state]); // afterState/afterDirty intentionally omitted — only Now edits trigger a re-sync

  const activateAfter = () => {
    if (!afterState) {
      setAfterStateRaw(structuredClone(state));
      setAfterDirty(false); // fresh clone — no user edits yet, keep auto-sync on
    }
    setScenario("after");
  };
  const activateNow = () => setScenario("now");
  const resetAfter = () => {
    setAfterStateRaw(structuredClone(state));
    setAfterDirty(false); // reset clears user edits — auto-sync resumes
    setScenario("after");
  };

  const activeState = scenario === "after" && afterState ? afterState : state;
  const setActiveState = scenario === "after" ? setAfterState : setState;

  const projectionData = useMemo(() => runProjection(state, false), [state]);
  const afterProjectionData = useMemo(() => afterState ? runProjection(afterState, false) : null, [afterState]);

  // ── AUTOSAVE ──────────────────────────────────────────────────────────────
  // Debounced write to localStorage on every state/scenario/theme change. 600ms
  // means typing in an input field collapses into one save instead of one-per-keystroke.
  // The "restored" status sticks until the user makes their first edit (then it flips
  // to saving/saved on the normal cycle).
  const saveTimerRef = useRef(null);
  const firstAutosaveRef = useRef(true);
  useEffect(() => {
    // Skip the very first run — that's just hydration echoing back, no point re-writing.
    if (firstAutosaveRef.current) { firstAutosaveRef.current = false; return; }
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const ok = persistSave({ state, afterState, afterDirty, scenario, theme });
      setSaveStatus(ok ? "saved" : "error");
    }, 600);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [state, afterState, afterDirty, scenario, theme]);

  const handleExport = () => exportPlanToFile({ state, afterState, afterDirty, scenario, theme });
  const handleImportClick = () => fileInputRef.current?.click();
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file later
    if (!file) return;
    try {
      const parsed = await importPlanFromFile(file);
      setState(parsed.state);
      setAfterStateRaw(parsed.afterState || null);
      setAfterDirty(parsed.afterDirty ?? false);
      setScenario(parsed.scenario || "now");
      if (parsed.theme) setTheme(parsed.theme);
      setSaveStatus("restored");
    } catch (err) {
      alert(err.message || "Import failed.");
    }
  };
  const handleReset = () => {
    if (!confirm("Reset everything and start over? Your current plan will be wiped from this device and the setup wizard will run again. Tip: 'Export plan' first if you want a backup.")) return;
    persistClear();
    setState(structuredClone(DEFAULT_STATE));
    setAfterStateRaw(null);
    setAfterDirty(false);
    setScenario("now");
    setSaveStatus("idle");
    // Re-launch the wizard so reset → start-over is a single button, not
    // "reset then refresh the page". DEFAULT_STATE.wizardCompleted is false
    // but the showWizard React state was set at mount, so set it explicitly.
    setShowWizard(true);
  };

  const isCovenant = theme === "Covenant Wealth";

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "'DM Sans', sans-serif" }}>
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
      <header style={{ background: COLORS.headerBg || COLORS.card, borderBottom: isCovenant ? `3px solid #cfc090` : `1px solid ${COLORS.border}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="flex items-center gap-3">
          {isCovenant ? (
            <>
              <img src={COVENANT_LOGO} alt="Covenant Wealth" style={{ height: 36 }} />
              <h1 style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>Covenant Wealth — Australian Financial Planner</h1>
            </>
          ) : (
            <>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>F</div>
              <div>
                <h1 style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.5, color: COLORS.headerText || COLORS.text, margin: 0 }}>{COLORS.appTitle || "Australian Financial Planner"}</h1>
                <div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: 0.5 }}>{COLORS.appSubtitle || "CASHFLOW · TAX · SUPER · CENTRELINK · MONTE CARLO"}</div>
              </div>
            </>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: isCovenant ? (COLORS.headerText || "#fff") : COLORS.textDim }}>
          <span>{state.personal.person1.name}{state.personal.isCouple ? ` & ${state.personal.person2.name}` : ""}</span>
          <SaveStatusBadge status={saveStatus} isCovenant={isCovenant} onExport={handleExport} onImport={handleImportClick} onReset={handleReset} />
          <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImportFile} style={{ display: "none" }} />
          <FYSelect value={state.legislationFY || "fy2025-26"} onChange={changeFY} />
          <button
            onClick={toggleProMode}
            title={state.proMode ? "Advisor view — showing G-codes and technical labels" : "Consumer view — friendly labels"}
            style={{
              background: state.proMode ? COLORS.accent : "transparent",
              border: `1px solid ${state.proMode ? COLORS.accent : COLORS.border}`,
              color: state.proMode ? "#fff" : (isCovenant ? COLORS.headerText || "#fff" : COLORS.text),
              padding: "3px 8px", borderRadius: 6, fontSize: 10, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {state.proMode ? "PRO" : "Consumer"}
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav aria-label="Planner sections" style={{ background: COLORS.navBg || COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "0 16px", display: "flex", gap: 0, overflowX: "auto" }}>
        {TABS.map(t => (
          <a
            key={t.id}
            href={`#${t.id}`}
            onClick={(e) => { e.preventDefault(); setTab(t.id); }}
            aria-current={tab === t.id ? "page" : undefined}
            style={{
              textDecoration: "none", display: "inline-block",
              borderBottom: tab === t.id ? `2px solid ${COLORS.accent}` : "2px solid transparent",
              color: tab === t.id ? COLORS.accent : COLORS.textDim, padding: "10px 14px", fontSize: 12, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: tab === t.id ? 600 : 400, whiteSpace: "nowrap", transition: "all 0.15s",
            }}
          >
            <span style={{ marginRight: 5 }}>{t.icon}</span>{t.label}
          </a>
        ))}
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 60px" }}>
        {tab === "dashboard" && <DashboardTab state={state} projectionData={projectionData} afterProjectionData={afterProjectionData} afterState={afterState} scenario={scenario} setState={setState} setAfterState={setAfterState} setTab={setTab} />}
        {tab === "goals" && <GoalsTab state={state} setState={setState} />}
        {tab === "personal" && <PersonalTab state={state} setState={setState} />}
        {tab === "income" && <IncomeTab state={activeState} setState={setActiveState} scenario={scenario} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} afterState={afterState} />}
        {tab === "assets" && <AssetsTab state={activeState} setState={setActiveState} scenario={scenario} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} afterState={afterState} />}
        {tab === "expenses" && <ExpensesTab state={activeState} setState={setActiveState} scenario={scenario} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} afterState={afterState} />}
        {tab === "liabilities" && <LiabilitiesTab state={activeState} setState={setActiveState} scenario={scenario} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} afterState={afterState} />}
        {tab === "projections" && <ProjectionsTab state={state} setState={setState} setAfterState={setAfterState} projectionData={projectionData} afterProjectionData={afterProjectionData} scenario={scenario} afterState={afterState} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} setTab={setTab} />}
        {tab === "monte_carlo" && <MonteCarloTab state={state} afterState={afterState} scenario={scenario} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} />}
        {tab === "cashflow" && <CashflowLedgerTab state={state} projectionData={projectionData} afterState={afterState} afterProjectionData={afterProjectionData} scenario={scenario} />}
        {tab === "aged_care" && <AgedCareTab state={state} setState={setState} />}
        {tab === "tax_rates" && <TaxTab state={state} setState={setState} />}
        {tab === "returns" && <ReturnsTab state={state} setState={setState} />}
        {tab === "settings" && <SettingsTab theme={theme} setTheme={setTheme} state={state} setState={setState} />}
      </main>

      {/* AI Financial Literacy Assistant — Covie */}
      <FinancialAssistant tab={tab} />

      {/* First-run wizard — onboards new users into a starter plan + goals */}
      {showWizard && (
        <Wizard
          onComplete={(builtState) => {
            setState({ ...builtState, wizardCompleted: true });
            setShowWizard(false);
            setTab("dashboard");
          }}
          onSkip={() => {
            setState(s => ({ ...s, wizardCompleted: true }));
            setShowWizard(false);
          }}
        />
      )}
    </div>
  );
}

// Tiny header pill showing autosave state. Click to open a small menu for
// Export / Import / Reset. Keeps the header uncluttered while giving the user
// a one-tap path to back up or wipe their plan.
function SaveStatusBadge({ status, isCovenant, onExport, onImport, onReset }) {
  const [open, setOpen] = useState(false);
  const labels = {
    idle: "Auto-save on",
    saving: "Saving…",
    saved: "Saved ✓",
    restored: "Plan restored ✓",
    error: "Save failed",
  };
  const dotColor = status === "error" ? "#e07a5f" : status === "saving" ? "#cfc090" : "#7fb069";
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Your plan is saved on this device automatically. Click for backup options."
        style={{
          background: "transparent",
          border: `1px solid ${isCovenant ? "rgba(255,255,255,0.3)" : COLORS.border}`,
          color: isCovenant ? (COLORS.headerText || "#fff") : COLORS.text,
          padding: "3px 8px", borderRadius: 6, fontSize: 10, cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, display: "inline-block" }} />
        {labels[status] || labels.idle}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 51,
            background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 230, padding: 6,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <div style={{ padding: "8px 10px", fontSize: 10, color: COLORS.textDim, lineHeight: 1.4 }}>
              Your plan auto-saves to this browser. For a portable backup, export to a file.
            </div>
            {[
              { label: "📤  Export plan to file", onClick: () => { setOpen(false); onExport(); } },
              { label: "📥  Import plan from file", onClick: () => { setOpen(false); onImport(); } },
              { label: "🗑  Reset to defaults", onClick: () => { setOpen(false); onReset(); }, danger: true },
            ].map(item => (
              <button key={item.label} onClick={item.onClick} style={{
                width: "100%", textAlign: "left", padding: "8px 10px", background: "transparent",
                border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer",
                color: item.danger ? "#c0524a" : COLORS.text, fontFamily: "'DM Sans', sans-serif",
              }} onMouseEnter={e => e.currentTarget.style.background = COLORS.bg} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
