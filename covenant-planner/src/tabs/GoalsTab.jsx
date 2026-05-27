import { useState } from "react";
import { COLORS } from "../data/themes";
import { Card, Btn } from "../components";
import { GOAL_KINDS, newGoal } from "../lib/goalProgress";

// Goals tab — list, add, edit, delete goals. Each goal is one of GOAL_KINDS;
// the fields vary by kind but the UI shape is uniform.

const inputStyle = {
  width: "100%", padding: "8px 10px", borderRadius: 6,
  border: `1px solid ${COLORS.inputBorder || COLORS.border}`,
  background: COLORS.inputBg || COLORS.bg, color: COLORS.text,
  fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none",
};
const labelStyle = { fontSize: 11, color: COLORS.textDim, marginBottom: 4, display: "block" };

function GoalEditor({ goal, onChange, onSave, onCancel, onDelete }) {
  const set = (patch) => onChange({ ...goal, ...patch });
  return (
    <div style={{ background: `${COLORS.border}30`, padding: 14, borderRadius: 8, display: "grid", gap: 10 }}>
      <div>
        <label style={labelStyle}>Label</label>
        <input type="text" value={goal.label || ""} onChange={e => set({ label: e.target.value })} style={inputStyle} />
      </div>
      {goal.kind === "retirement" && (<>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div><label style={labelStyle}>Retire by age</label><input type="number" value={goal.targetRetirementAge?.p1 || ""} onChange={e => set({ targetRetirementAge: { p1: Number(e.target.value), p2: Number(e.target.value) } })} style={inputStyle} /></div>
          <div><label style={labelStyle}>Income / year ($)</label><input type="number" value={goal.targetRetirementIncome || ""} onChange={e => set({ targetRetirementIncome: Number(e.target.value) })} style={inputStyle} /></div>
          <div><label style={labelStyle}>Last until age</label><input type="number" value={goal.targetLastUntilAge || ""} onChange={e => set({ targetLastUntilAge: Number(e.target.value) })} style={inputStyle} /></div>
        </div>
      </>)}
      {goal.kind === "house" && (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div><label style={labelStyle}>By year</label><input type="number" value={goal.targetYear || ""} onChange={e => set({ targetYear: Number(e.target.value) })} style={inputStyle} /></div>
        <div><label style={labelStyle}>Deposit ($)</label><input type="number" value={goal.targetDeposit || ""} onChange={e => set({ targetDeposit: Number(e.target.value) })} style={inputStyle} /></div>
      </div>)}
      {goal.kind === "debt" && (
        <div><label style={labelStyle}>Debt-free by year</label><input type="number" value={goal.targetYear || ""} onChange={e => set({ targetYear: Number(e.target.value) })} style={inputStyle} /></div>
      )}
      {["sabbatical", "education", "travel", "purchase"].includes(goal.kind) && (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {goal.kind === "sabbatical"
          ? <div><label style={labelStyle}>At age</label><input type="number" value={goal.targetAge || ""} onChange={e => set({ targetAge: Number(e.target.value) })} style={inputStyle} /></div>
          : <div><label style={labelStyle}>By year</label><input type="number" value={goal.targetYear || ""} onChange={e => set({ targetYear: Number(e.target.value) })} style={inputStyle} /></div>}
        <div><label style={labelStyle}>Cost ($)</label><input type="number" value={goal.targetCost || ""} onChange={e => set({ targetCost: Number(e.target.value) })} style={inputStyle} /></div>
      </div>)}
      {goal.kind === "custom" && (
        <div><label style={labelStyle}>Amount ($, optional)</label><input type="number" value={goal.targetAmount || ""} onChange={e => set({ targetAmount: Number(e.target.value) })} style={inputStyle} /></div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 4 }}>
        <button onClick={onDelete} style={{ background: "transparent", border: `1px solid #c0524a`, color: "#c0524a", padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Delete</button>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          <button onClick={onSave} style={{ background: COLORS.accent, border: "none", color: "#fff", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Save</button>
        </div>
      </div>
    </div>
  );
}

export function GoalsTab({ state, setState }) {
  const goals = state.goals || [];
  const [editing, setEditing] = useState(null); // {goal, isNew}
  const [picking, setPicking] = useState(false);

  const startEdit = (goal) => setEditing({ goal: structuredClone(goal), isNew: false });
  const startAdd  = (kind) => { setEditing({ goal: newGoal(kind), isNew: true }); setPicking(false); };
  const saveEdit = () => {
    setState(s => {
      const next = { ...s };
      const list = [...(next.goals || [])];
      if (editing.isNew) list.push(editing.goal);
      else {
        const idx = list.findIndex(g => g.id === editing.goal.id);
        if (idx >= 0) list[idx] = editing.goal;
      }
      next.goals = list;
      return next;
    });
    setEditing(null);
  };
  const deleteGoal = () => {
    setState(s => ({ ...s, goals: (s.goals || []).filter(g => g.id !== editing.goal.id) }));
    setEditing(null);
  };

  return (
    <div>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>Your goals</div>
            <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 2 }}>What you're trying to achieve. Each one gets a progress bar on the Dashboard.</div>
          </div>
          <button onClick={() => setPicking(true)} style={{ background: COLORS.accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>+ Add goal</button>
        </div>

        {picking && (
          <div style={{ marginTop: 16, padding: 12, background: `${COLORS.accent}10`, border: `1px dashed ${COLORS.accent}50`, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8, fontWeight: 600 }}>What kind of goal?</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {GOAL_KINDS.map(k => (
                <button key={k.id} onClick={() => startAdd(k.id)} style={{
                  padding: "8px 12px", borderRadius: 999, border: `1px solid ${COLORS.border}`,
                  background: "transparent", color: COLORS.text, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                }}>{k.icon} {k.label}</button>
              ))}
              <button onClick={() => setPicking(false)} style={{ background: "none", border: "none", color: COLORS.textDim, fontSize: 11, textDecoration: "underline", cursor: "pointer", padding: "8px 4px", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {goals.length === 0 && !picking && (
            <div style={{ fontSize: 12, color: COLORS.textDim, padding: 16, textAlign: "center", fontStyle: "italic" }}>
              No goals yet. Add one to start tracking progress.
            </div>
          )}
          {goals.map(g => (
            editing?.goal.id === g.id ? (
              <GoalEditor key={g.id} goal={editing.goal} onChange={ng => setEditing(e => ({ ...e, goal: ng }))} onSave={saveEdit} onCancel={() => setEditing(null)} onDelete={deleteGoal} />
            ) : (
              <div key={g.id} style={{ padding: 12, background: `${COLORS.border}30`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{g.label}</div>
                  <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 2 }}>{GOAL_KINDS.find(k => k.id === g.kind)?.label}</div>
                </div>
                <button onClick={() => startEdit(g)} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Edit</button>
              </div>
            )
          ))}
          {editing?.isNew && (
            <GoalEditor goal={editing.goal} onChange={ng => setEditing(e => ({ ...e, goal: ng }))} onSave={saveEdit} onCancel={() => setEditing(null)} onDelete={() => setEditing(null)} />
          )}
        </div>
      </Card>
    </div>
  );
}
