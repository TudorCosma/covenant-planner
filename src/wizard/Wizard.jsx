import { useState } from "react";
import { COLORS } from "../data/themes";
import { DEFAULT_STATE } from "../data/defaultState";
import { GOAL_KINDS, newGoal } from "../lib/goalProgress";

// 5-minute first-run wizard. Captures situation + goals, then hands the
// completed state to App.jsx. Skipped entirely when Pro mode is on.
//
// Single-file design (all steps inline) — simpler than splitting into 8 files
// for ~600 lines of fairly linear UI.

const CURRENT_YEAR = new Date().getFullYear();

const labelStyle = { fontSize: 11, color: COLORS.textDim, marginBottom: 4, fontWeight: 500 };
const inputStyle = (border) => ({
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: `1px solid ${border || COLORS.inputBorder || COLORS.border}`,
  background: COLORS.inputBg || COLORS.bg, color: COLORS.text,
  fontSize: 16, fontFamily: "'DM Sans', sans-serif", outline: "none",
});

// Select-all on focus so any pre-existing "0" (or auto-filled value) is
// replaced the instant the user starts typing — same fix as the shared
// Input component, but the wizard uses its own raw <input>.
const selectOnFocus = (e) => {
  const el = e.target;
  setTimeout(() => { try { el.select(); } catch {} }, 0);
};

function NumberField({ label, value, onChange, prefix, suffix, min, max, placeholder }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {prefix && <span style={{ color: COLORS.textDim, fontSize: 13 }}>{prefix}</span>}
        <input type="number" value={value ?? ""} placeholder={placeholder}
          onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}
          onFocus={selectOnFocus}
          min={min} max={max} style={inputStyle()} />
        {suffix && <span style={{ color: COLORS.textDim, fontSize: 13 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <input type="text" value={value || ""} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} onFocus={selectOnFocus} style={inputStyle()} />
    </div>
  );
}

function PrimaryBtn({ children, onClick, disabled }) {
  return <button onClick={onClick} disabled={disabled} style={{
    padding: "10px 18px", borderRadius: 8, border: "none",
    background: disabled ? COLORS.border : COLORS.accent,
    color: "#fff", fontSize: 13, fontWeight: 600, cursor: disabled ? "default" : "pointer",
    fontFamily: "'DM Sans', sans-serif",
  }}>{children}</button>;
}

function GhostBtn({ children, onClick }) {
  return <button onClick={onClick} style={{
    padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
    background: "transparent", color: COLORS.text, fontSize: 12, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  }}>{children}</button>;
}

function SkipLink({ onClick }) {
  return <button onClick={onClick} style={{
    background: "none", border: "none", color: COLORS.textDim,
    fontSize: 11, textDecoration: "underline", cursor: "pointer", padding: 0,
    fontFamily: "'DM Sans', sans-serif",
  }}>I'll set this up later</button>;
}

// ---- Goal sub-form (rendered after a chip is picked) ---------------------

function GoalDetailForm({ kind, goal, onChange }) {
  if (kind === "retirement") return (<div style={{ display: "grid", gap: 10 }}>
    <NumberField label="Retire by what age?" value={goal.targetRetirementAge?.p1} onChange={v => onChange({ ...goal, targetRetirementAge: { ...(goal.targetRetirementAge || {}), p1: v, p2: v } })} suffix="yrs" min={40} max={90} />
    <NumberField label="Retirement income wanted (per year, today's $)" value={goal.targetRetirementIncome} onChange={v => onChange({ ...goal, targetRetirementIncome: v })} prefix="$" min={0} />
    <NumberField label="Savings should last until what age?" value={goal.targetLastUntilAge} onChange={v => onChange({ ...goal, targetLastUntilAge: v })} suffix="yrs" min={70} max={110} />
  </div>);
  if (kind === "house") return (<div style={{ display: "grid", gap: 10 }}>
    <NumberField label="By what year?" value={goal.targetYear} onChange={v => onChange({ ...goal, targetYear: v })} min={CURRENT_YEAR} />
    <NumberField label="Deposit needed" value={goal.targetDeposit} onChange={v => onChange({ ...goal, targetDeposit: v })} prefix="$" min={0} />
  </div>);
  if (kind === "debt") return (
    <NumberField label="Debt-free by what year?" value={goal.targetYear} onChange={v => onChange({ ...goal, targetYear: v })} min={CURRENT_YEAR} />
  );
  if (["sabbatical", "education", "travel", "purchase"].includes(kind)) {
    const ageOrYear = kind === "sabbatical"
      ? <NumberField label="At what age?" value={goal.targetAge} onChange={v => onChange({ ...goal, targetAge: v })} suffix="yrs" min={20} max={90} />
      : <NumberField label="By what year?" value={goal.targetYear} onChange={v => onChange({ ...goal, targetYear: v })} min={CURRENT_YEAR} />;
    return (<div style={{ display: "grid", gap: 10 }}>
      {ageOrYear}
      <NumberField label="Cost / amount needed" value={goal.targetCost} onChange={v => onChange({ ...goal, targetCost: v })} prefix="$" min={0} />
    </div>);
  }
  return (<div style={{ display: "grid", gap: 10 }}>
    <NumberField label="Amount you're tracking ($, optional)" value={goal.targetAmount} onChange={v => onChange({ ...goal, targetAmount: v })} prefix="$" min={0} />
    <div style={{ fontSize: 11, color: COLORS.textDim }}>Custom goals are tracked manually — you'll see them listed on the Goals tab.</div>
  </div>);
}

// ---- Wizard ---------------------------------------------------------------

export function Wizard({ onComplete, onSkip }) {
  // Local working copy of state, seeded from DEFAULT_STATE.
  const [draft, setDraft] = useState(() => structuredClone(DEFAULT_STATE));
  const [step, setStep] = useState(0);
  const [showSplit, setShowSplit] = useState(false);

  // Goal sub-state
  const [goalKind, setGoalKind] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);

  const set = (path, value) => setDraft(d => {
    const next = structuredClone(d);
    const parts = path.split(".");
    let obj = next;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
    return next;
  });

  // Combined salary helper — splits 60/40 by default
  const combinedSalary = (draft.income.person1.salary || 0) + (draft.personal.isCouple ? (draft.income.person2.salary || 0) : 0);
  const setCombinedSalary = (v) => {
    setDraft(d => {
      const next = structuredClone(d);
      if (next.personal.isCouple) {
        next.income.person1.salary = Math.round(v * 0.6);
        next.income.person2.salary = Math.round(v * 0.4);
      } else {
        next.income.person1.salary = v;
      }
      return next;
    });
  };

  // Other investments — append a row to nonSuper.p1NonSuper as an additional asset isn't trivial,
  // so we keep wizard rows in a temporary list and write into existing buckets on finish.
  const [otherInvestments, setOtherInvestments] = useState([]); // {kind, label, value}
  const addInvestment = (kind) => setOtherInvestments(prev => [...prev, { kind, label: "", value: 0, id: `inv_${Date.now()}_${prev.length}` }]);
  const updateInvestment = (id, patch) => setOtherInvestments(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  const removeInvestment = (id) => setOtherInvestments(prev => prev.filter(r => r.id !== id));

  // Finish — apply other investments to draft.assets.nonSuper, then onComplete.
  const finish = () => {
    const final = structuredClone(draft);
    // Sum each kind into the existing nonSuper buckets (joint catches the lot for simplicity).
    const totals = otherInvestments.reduce((acc, r) => {
      const v = r.value || 0;
      if (r.kind === "property") acc.property += v;
      else if (r.kind === "shares") acc.shares += v;
      else if (r.kind === "cash") acc.cash += v;
      else acc.other += v;
      return acc;
    }, { property: 0, shares: 0, cash: 0, other: 0 });
    // Add property as a lifestyle asset; share/cash/other into joint nonSuper bucket with appropriate profile.
    if (totals.property > 0) {
      final.assets.lifestyleAssets.push({
        description: "Investment Property", value: totals.property, growth: 3.0,
        isPrimaryResidence: false,
      });
    }
    if (totals.shares > 0) {
      final.assets.nonSuper.joint.balance = (final.assets.nonSuper.joint.balance || 0) + totals.shares;
      final.assets.nonSuper.joint.profile = "G80"; // shares-heavy
    }
    if (totals.cash > 0) {
      final.assets.nonSuper.joint.balance = (final.assets.nonSuper.joint.balance || 0) + totals.cash;
      // Keep the existing profile blend — adding to G0 would over-bias.
    }
    if (totals.other > 0) {
      final.assets.nonSuper.joint.balance = (final.assets.nonSuper.joint.balance || 0) + totals.other;
    }
    onComplete(final);
  };

  // Steps definition — content + nav handled inline.
  const steps = [
    { id: "welcome" },
    { id: "names" },
    { id: "ages" },
    { id: "salary" },
    { id: "super" },
    { id: "otherInvestments" },
    { id: "expenses" },
    { id: "home" },
    { id: "goalsIntro" },
    { id: "goals" },
    { id: "done" },
  ];
  const cur = steps[step].id;
  const next = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  // ---- Step content ---------------------------------------------------

  const content = () => {
    switch (cur) {
      case "welcome": return (<>
        {/* Covie-led welcome. The user said the old wizard sounded like "two
            different people" (a faceless wizard + a separate Covie cameo). Now
            Covie introduces herself first and runs the whole wizard, and the
            pitch sells the 5 minutes as a route to quick wins. */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
          <div style={{ flexShrink: 0, width: 52, height: 52, borderRadius: "50%", background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 5.5C4 4.12 5.12 3 6.5 3h11C18.88 3 20 4.12 20 5.5v8c0 1.38-1.12 2.5-2.5 2.5H10l-4 3.5V16H6.5C5.12 16 4 14.88 4 13.5v-8z" fill="#fff"/>
              <circle cx="9" cy="9.5" r="1.1" fill={COLORS.accent}/>
              <circle cx="12.5" cy="9.5" r="1.1" fill={COLORS.accent}/>
              <circle cx="16" cy="9.5" r="1.1" fill={COLORS.accent}/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, lineHeight: 1.2 }}>G'day, I'm Covie 👋</div>
            <div style={{ fontSize: 12, color: COLORS.text, marginTop: 2 }}>Your guide to this app — and your money.</div>
          </div>
        </div>
        <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.6, marginTop: 6 }}>
          I'm going to ask you <strong>8 quick questions</strong> — your age, your salary, your super, that sort of thing. Takes about <strong>5 minutes</strong>, and you can change anything later.
        </p>
        <div style={{ marginTop: 14, padding: 14, background: `${COLORS.accent}10`, borderRadius: 10, border: `1px solid ${COLORS.accent}30` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>Why bother with 5 minutes?</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: COLORS.text, lineHeight: 1.65 }}>
            <li>You'll see <strong>where you actually stand</strong> — net wealth, surplus, tax, all in one place.</li>
            <li>I'll show you <strong>how close you are to retirement</strong> (or whatever else you're saving for) with a progress bar per goal.</li>
            <li>Then you can <strong>poke at it</strong> — "what if I work 2 years longer?", "what if I add $200/wk to super?" — and watch the numbers move in real time.</li>
          </ul>
        </div>
        <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, marginTop: 14 }}>
          Once we're done I stick around in the bottom-right corner — tap me any time to ask <em>"what's a concessional contribution?"</em> or <em>"how does the age pension test work?"</em>. I'll explain it in plain English. I <strong>won't</strong> tell you what to do with your money — that's an advisor's job, not mine — but I'm happy to teach you the concepts so you can make smarter calls.
        </p>
        <p style={{ fontSize: 11, color: COLORS.textDim, fontStyle: "italic", lineHeight: 1.5, marginTop: 12 }}>
          Educational tool only — not personal financial advice. The numbers are projections, not guarantees.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <PrimaryBtn onClick={next}>OK Covie, let's go →</PrimaryBtn>
          <GhostBtn onClick={onSkip}>I'll explore on my own</GhostBtn>
        </div>
      </>);

      case "names": return (<>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>What's your first name?</h2>
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <TextField label="Your first name" value={draft.personal.person1.name} onChange={v => set("personal.person1.name", v)} placeholder="e.g. Sarah" />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={draft.personal.isCouple} onChange={e => set("personal.isCouple", e.target.checked)} id="iscouple" />
            <label htmlFor="iscouple" style={{ fontSize: 12, color: COLORS.text }}>I'm planning with a partner</label>
          </div>
          {draft.personal.isCouple && (
            <TextField label="Partner's first name" value={draft.personal.person2.name} onChange={v => set("personal.person2.name", v)} placeholder="e.g. Michael" />
          )}
        </div>
      </>);

      case "ages": return (<>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>How old are you{draft.personal.isCouple ? " both" : ""}?</h2>
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <NumberField label={`${draft.personal.person1.name || "You"} — age now`} value={CURRENT_YEAR - draft.personal.person1.birthYear} onChange={v => set("personal.person1.birthYear", CURRENT_YEAR - (v || 50))} suffix="yrs" min={18} max={100} />
          {draft.personal.isCouple && (
            <NumberField label={`${draft.personal.person2.name || "Partner"} — age now`} value={CURRENT_YEAR - draft.personal.person2.birthYear} onChange={v => set("personal.person2.birthYear", CURRENT_YEAR - (v || 50))} suffix="yrs" min={18} max={100} />
          )}
        </div>
      </>);

      case "salary": return (<>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>What's your combined household salary?</h2>
        <p style={{ fontSize: 12, color: COLORS.textDim, marginTop: 6, lineHeight: 1.5 }}>Gross (before tax). If you're a couple I'll split it 60/40 — you can edit that.</p>
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <NumberField label="Combined gross salary (per year)" value={combinedSalary} onChange={setCombinedSalary} prefix="$" min={0} />
          {draft.personal.isCouple && (<>
            <button onClick={() => setShowSplit(s => !s)} style={{ background: "none", border: "none", color: COLORS.accent, fontSize: 11, textDecoration: "underline", cursor: "pointer", padding: 0, fontFamily: "'DM Sans', sans-serif", textAlign: "left" }}>
              {showSplit ? "Hide split" : "Edit split"}
            </button>
            {showSplit && (<div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", marginTop: 4 }}>
              <NumberField label={draft.personal.person1.name || "You"} value={draft.income.person1.salary} onChange={v => set("income.person1.salary", v)} prefix="$" min={0} />
              <NumberField label={draft.personal.person2.name || "Partner"} value={draft.income.person2.salary} onChange={v => set("income.person2.salary", v)} prefix="$" min={0} />
            </div>)}
          </>)}
        </div>
      </>);

      case "super": return (<>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>How much is in your super?</h2>
        <p style={{ fontSize: 12, color: COLORS.textDim, marginTop: 6, lineHeight: 1.5 }}>Latest balance from your super statement. I'll default to a Balanced (60% growth) allocation with 1% fees — you can adjust on the Returns tab later.</p>
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <NumberField label={`${draft.personal.person1.name || "You"} — super balance`} value={draft.assets.superAccounts.p1Super.balance} onChange={v => set("assets.superAccounts.p1Super.balance", v)} prefix="$" min={0} />
          {draft.personal.isCouple && (
            <NumberField label={`${draft.personal.person2.name || "Partner"} — super balance`} value={draft.assets.superAccounts.p2Super.balance} onChange={v => set("assets.superAccounts.p2Super.balance", v)} prefix="$" min={0} />
          )}
        </div>
      </>);

      case "otherInvestments": return (<>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>What other investments do you have?</h2>
        <p style={{ fontSize: 12, color: COLORS.textDim, marginTop: 6, lineHeight: 1.5 }}>Property (investment, not your home), shares/ETFs, cash. Skip if none. Returns are set automatically based on type — you can fine-tune later.</p>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {otherInvestments.map(row => (
            <div key={row.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr 90px auto", gap: 8, alignItems: "end", padding: 8, background: `${COLORS.border}30`, borderRadius: 8 }}>
              <select value={row.kind} onChange={e => updateInvestment(row.id, { kind: e.target.value })} style={inputStyle()}>
                <option value="property">Property</option>
                <option value="shares">Shares/ETFs</option>
                <option value="cash">Cash/Term Deposit</option>
                <option value="other">Other</option>
              </select>
              <input type="text" placeholder="Label (optional)" value={row.label} onChange={e => updateInvestment(row.id, { label: e.target.value })} onFocus={selectOnFocus} style={inputStyle()} />
              <input type="number" placeholder="Value $" value={row.value || ""} onChange={e => updateInvestment(row.id, { value: Number(e.target.value) })} onFocus={selectOnFocus} style={inputStyle()} />
              <button onClick={() => removeInvestment(row.id)} style={{ background: "none", border: "none", color: COLORS.textDim, fontSize: 14, cursor: "pointer" }}>✕</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button onClick={() => addInvestment("shares")} style={{ padding: "6px 12px", borderRadius: 6, border: `1px dashed ${COLORS.accent}`, background: "transparent", color: COLORS.accent, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>+ Shares/ETFs</button>
            <button onClick={() => addInvestment("property")} style={{ padding: "6px 12px", borderRadius: 6, border: `1px dashed ${COLORS.accent}`, background: "transparent", color: COLORS.accent, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>+ Property</button>
            <button onClick={() => addInvestment("cash")} style={{ padding: "6px 12px", borderRadius: 6, border: `1px dashed ${COLORS.accent}`, background: "transparent", color: COLORS.accent, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>+ Cash</button>
          </div>
        </div>
      </>);

      case "expenses": return (<>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>What do you spend per month?</h2>
        <p style={{ fontSize: 12, color: COLORS.textDim, marginTop: 6, lineHeight: 1.5 }}>All living costs — mortgage/rent, groceries, bills, lifestyle. A rough total is fine.</p>
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <NumberField
            label="Monthly living costs"
            value={Math.round((draft.expenses.lifestyleExpenses[0]?.amount || 0) / 12)}
            onChange={v => {
              setDraft(d => {
                const next = structuredClone(d);
                next.expenses.lifestyleExpenses[0].amount = (v || 0) * 12;
                return next;
              });
            }}
            prefix="$"
            min={0}
          />
          <div style={{ fontSize: 11, color: COLORS.textDim }}>
            That works out to roughly <strong style={{ color: COLORS.text }}>${(((draft.expenses.lifestyleExpenses[0]?.amount || 0))).toLocaleString()}/year</strong>.
          </div>
        </div>
      </>);

      case "home": return (<>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>Do you own your home?</h2>
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => set("personal.isHomeowner", true)} style={{
              padding: "10px 20px", borderRadius: 8,
              border: `1px solid ${draft.personal.isHomeowner ? COLORS.accent : COLORS.border}`,
              background: draft.personal.isHomeowner ? `${COLORS.accent}15` : "transparent",
              color: draft.personal.isHomeowner ? COLORS.accent : COLORS.text,
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>Yes, own it</button>
            <button onClick={() => set("personal.isHomeowner", false)} style={{
              padding: "10px 20px", borderRadius: 8,
              border: `1px solid ${!draft.personal.isHomeowner ? COLORS.accent : COLORS.border}`,
              background: !draft.personal.isHomeowner ? `${COLORS.accent}15` : "transparent",
              color: !draft.personal.isHomeowner ? COLORS.accent : COLORS.text,
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>No, renting</button>
          </div>
          {draft.personal.isHomeowner && (
            <NumberField
              label="Estimated value of your home"
              value={draft.assets.lifestyleAssets[0]?.value}
              onChange={v => setDraft(d => {
                const next = structuredClone(d);
                if (next.assets.lifestyleAssets[0]) next.assets.lifestyleAssets[0].value = v || 0;
                return next;
              })}
              prefix="$"
              min={0}
            />
          )}
        </div>
      </>);

      case "goalsIntro": return (<>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.text }}>Now — what are you wanting to plan for?</h2>
        <p style={{ fontSize: 13, color: COLORS.textDim, marginTop: 12, lineHeight: 1.6 }}>
          Most people are planning for retirement, but maybe you're also saving for a house, a sabbatical, the kids' education, paying off debt, or a big trip. Tell me what matters and I'll show you progress against each one — you can add as many as you like.
        </p>
        <div style={{ marginTop: 24 }}>
          <PrimaryBtn onClick={next}>Add my first goal →</PrimaryBtn>
        </div>
      </>);

      case "goals": {
        // 3 sub-states: choose kind, fill details, list
        if (editingGoal) {
          return (<>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>Tell me about this goal</h2>
            <div style={{ marginTop: 16 }}>
              <TextField label="Label (so you can recognise it)" value={editingGoal.label} onChange={v => setEditingGoal(g => ({ ...g, label: v }))} placeholder="e.g. Retire at 65 with $80k/yr" />
            </div>
            <div style={{ marginTop: 12 }}>
              <GoalDetailForm kind={editingGoal.kind} goal={editingGoal} onChange={setEditingGoal} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <PrimaryBtn onClick={() => {
                setDraft(d => ({ ...d, goals: [...(d.goals || []), editingGoal] }));
                setEditingGoal(null);
                setGoalKind(null);
              }}>Save this goal</PrimaryBtn>
              <GhostBtn onClick={() => { setEditingGoal(null); setGoalKind(null); }}>Cancel</GhostBtn>
            </div>
          </>);
        }
        if (!goalKind) {
          return (<>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>What's the goal?</h2>
            {draft.goals?.length > 0 && (
              <div style={{ marginTop: 12, padding: 10, background: `${COLORS.border}30`, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 6 }}>Goals so far:</div>
                {draft.goals.map(g => <div key={g.id} style={{ fontSize: 12, color: COLORS.text, padding: "3px 0" }}>• {g.label}</div>)}
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              {GOAL_KINDS.map(k => (
                <button key={k.id} onClick={() => { setGoalKind(k.id); setEditingGoal(newGoal(k.id)); }} style={{
                  padding: "10px 14px", borderRadius: 999, border: `1px solid ${COLORS.border}`,
                  background: "transparent", color: COLORS.text, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}>{k.icon} {k.label}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <GhostBtn onClick={() => { if ((draft.goals?.length || 0) > 0) next(); else next(); }}>
                {draft.goals?.length > 0 ? "That'll do for now — I can add more later" : "Skip for now"}
              </GhostBtn>
            </div>
          </>);
        }
        return null;
      }

      case "done": return (<>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.text }}>You're all set 🎉</h2>
        <p style={{ fontSize: 13, color: COLORS.textDim, marginTop: 12, lineHeight: 1.6 }}>
          I've set up a starter plan based on what you told me. Have a look at the Dashboard — your <strong style={{ color: COLORS.text }}>goal progress bars</strong> are at the top, and the <strong style={{ color: COLORS.text }}>"Try a what-if"</strong> buttons let you see how changes (retire later, salary-sacrifice more, downsize, cut spending) move the numbers.
        </p>
        <div style={{ marginTop: 14, padding: 12, background: `${COLORS.accent}10`, borderRadius: 10, border: `1px solid ${COLORS.accent}30`, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 5.5C4 4.12 5.12 3 6.5 3h11C18.88 3 20 4.12 20 5.5v8c0 1.38-1.12 2.5-2.5 2.5H10l-4 3.5V16H6.5C5.12 16 4 14.88 4 13.5v-8z" fill="#fff"/>
              <circle cx="9" cy="9.5" r="1" fill={COLORS.accent}/>
              <circle cx="12.5" cy="9.5" r="1" fill={COLORS.accent}/>
              <circle cx="16" cy="9.5" r="1" fill={COLORS.accent}/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>Stuck on a concept? Ask Covie</div>
            <div style={{ fontSize: 11, color: COLORS.textDim, lineHeight: 1.5 }}>The chat bubble in the bottom-right corner opens Covie. Try things like <em>"what is salary sacrifice"</em>, <em>"how does the age pension assets test work"</em>, or <em>"explain Now vs After"</em>. Covie won't tell you what to do — that's an advisor's call — but is happy to explain almost any financial concept and walk you through the app.</div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: COLORS.textDim, marginTop: 12, lineHeight: 1.6 }}>
          Everything's editable. Hit any tab to fine-tune the numbers, and your plan auto-saves to this browser.
        </p>
        <div style={{ marginTop: 24 }}>
          <PrimaryBtn onClick={finish}>Open my Dashboard →</PrimaryBtn>
        </div>
      </>);

      default: return null;
    }
  };

  const totalProgressDots = steps.length - 2; // exclude welcome + done

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(20, 24, 30, 0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        background: COLORS.card, borderRadius: 14, maxWidth: 520, width: "100%",
        padding: "28px 28px 22px", boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
        maxHeight: "92vh", overflowY: "auto",
      }}>
        {/* Progress dots */}
        {step > 0 && step < steps.length - 1 && (
          <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
            {Array.from({ length: totalProgressDots }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i < step ? COLORS.accent : `${COLORS.border}80`,
              }} />
            ))}
          </div>
        )}

        {content()}

        {/* Nav buttons (skip welcome / done — they have their own buttons) */}
        {!["welcome", "done", "goalsIntro"].includes(cur) && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, paddingTop: 16, borderTop: `1px solid ${COLORS.border}80` }}>
            <GhostBtn onClick={back}>← Back</GhostBtn>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <SkipLink onClick={next} />
              <PrimaryBtn onClick={next}>Next →</PrimaryBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
