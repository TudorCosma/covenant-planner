# Covenant Planner V2 — Order-of-Magnitude UX Overhaul

**Status:** design doc — APPROVED in principle by Tudor (27 May 2026), revised to remove anything that could be construed as financial advice under Australian regulation.
**Author:** Replit Agent + Tudor Cosma, CFP
**Date:** 27 May 2026 (v2 — post-regulatory-review)

---

## Regulatory constraint (read first)

Under Australian law, providing personal financial advice without a Statement of Advice (SoA) and the full compliance machinery is a breach. **This consumer tool must never tell the user what to do.** It can:

- Show their own numbers
- Show their own goals (that *they* set)
- Show the gap or progress between the two
- Let them try "what-if" scenarios where *they* choose the change
- Explain general concepts (education) and refer to an advisor for personal questions

It must NOT:

- Recommend a course of action ("you should retire later", "you should salary-sacrifice more")
- Score their plan as "good" or "bad" in absolute terms — only progress against *their own* stated goals
- Suggest a "best next action" — that's a recommendation
- Imply the user can or cannot retire — only show whether their plan meets the goals they set

The user is not dumb. If their plan shows 60% progress to their stated retirement income goal, they can draw their own conclusion. Spelling that conclusion out is the line.

---

## Why we're doing this

The app today is technically powerful but psychologically intimidating — a new user lands on an empty Dashboard, sees 13 tabs, and has no idea where to start. This V2 closes that gap with four features that change *who can use the app*, all while staying inside the regulatory line:

1. **First-run wizard** — guided onboarding that captures both their situation AND their goals.
2. **"What this means" facts layer** — every key number paired with a neutral statement of fact relative to their own goals.
3. **Scenario buttons** — one-tap user-driven what-ifs (the user picks, we just show the impact).
4. **Goal Progress tracker** — % progress against the user's own retirement goals (NOT a quality score).

Already shipped (foundations):
- ✅ Today's-dollar conversion (every figure auto-deflated; toggle removed).
- ✅ Autosave to `localStorage` + Export / Import / Reset.

---

## 1. First-Run Wizard

### Goal
Replace the "land on empty Dashboard" experience with a 5-minute conversation that produces a personalised projection AND captures the user's own retirement goals.

### Trigger
- Auto-show on first visit (no saved plan in `localStorage`).
- **Skipped entirely when Pro mode is on** — Tudor doesn't need a wizard with his own clients.
- Re-launchable from the Save-status menu as **"Restart with the wizard"**.

### Question flow (Tudor-approved)

| # | Question | Type | Notes |
|---|----------|------|-------|
| 1 | What's your first name? (and partner's, if you have one) | text + optional text | Sets `isCouple` |
| 2 | How old are you both? | number per person | |
| 3 | When would you like to stop working? | age per person | This is a **goal**, stored as `goals.targetRetirementAge` |
| 4 | What's your combined household take-home salary right now? | currency | Default split 60/40 across couple, with **"edit split"** link |
| 5 | How much is in your super, all up? | currency per person | |
| 6 | What do you spend per month on living costs? | currency | × 12 → annual pre-retirement expense |
| 7 | What income would you like in retirement, per year, in today's dollars? | currency | **Goal**, stored as `goals.targetRetirementIncome` |
| 8 | Do you own your home? | yes/no | Sets `homeowner` + primary residence default |

Each question has a **"I'll set this up later"** link with a sensible default. One screen per question on mobile, progress dots at top, Back always available.

### After completion
- Dashboard renders the user's projection plus their Goal Progress (feature #4) against the goals they just set.
- A **"Plan ready"** banner lists the 8 inputs as chips; tap any chip → jumps to the right tab with that field focused.
- Encouraging CTA: **"Explore what changes if you adjust things"** → opens the scenario buttons. Note the wording — "explore", not "improve".

### Implementation

```
covenant-planner/src/wizard/
├── Wizard.jsx           // <Wizard onComplete={(state) => setState(state)} />
├── WizardStep.jsx       // shared shell
└── steps/
    ├── NamesStep.jsx
    ├── AgesStep.jsx
    ├── RetirementAgeStep.jsx   // → goals.targetRetirementAge
    ├── SalaryStep.jsx
    ├── SuperStep.jsx
    ├── ExpensesStep.jsx
    ├── RetirementIncomeStep.jsx // → goals.targetRetirementIncome
    └── HomeStep.jsx
```

New top-level `state.goals` object:
```js
goals: {
  targetRetirementAge: { p1: 65, p2: 65 },   // what they typed in wizard Q3
  targetRetirementIncome: 80000,             // wizard Q7 (today's $)
  targetLastUntilAge: 90,                    // editable on a future Goals tab
}
```

---

## 2. "What This Means" Facts Layer

### Goal
Every key number on the Dashboard is paired with a **neutral statement of fact** that compares the projection to the user's own goal. No recommendations, no prescriptions, no "you should". The user draws their own conclusions.

### Tone, before and after

| ❌ Advice (forbidden) | ✅ Fact relative to user's goal (allowed) |
|---|---|
| "Your money runs out at 84 — try retiring 2 years later." | "Your money lasts until age 84. Your stated goal is to last until 90." |
| "You'll get a part age pension at 67 — salary sacrifice more to delay it." | "Your plan begins drawing age pension at 67." |
| "You'll pay too much tax — switch to a TTR strategy." | "Total tax paid over the plan: $410k." |
| "You can retire comfortably." | (do not say this) |

### Mechanism

Pure function `interpret(projectionData, state)` in `src/lib/interpret.js`. Deterministic, offline, testable. Returns plain-language strings per KPI, each comparing the projected outcome against `state.goals.*` where one exists.

```js
function interpretLongevity(data, state) {
  const ruinAge = findRuinAge(data);
  const goalAge = state.goals.targetLastUntilAge;
  if (ruinAge == null) {
    return { fact: `Your savings last the full plan (to age ${data[data.length-1].age1}).` };
  }
  if (ruinAge >= goalAge) {
    return { fact: `Your savings last to age ${ruinAge}, meeting your goal of ${goalAge}.` };
  }
  return { fact: `Your savings last to age ${ruinAge}. Your stated goal is to last to age ${goalAge}.` };
}
```

No `verdict: "good" | "bad"`, no `action: { label, onClick }`. Just facts.

### Coverage

| Dashboard surface | Fact shown |
|---|---|
| Net Assets chart | Peak age + value, longevity vs `goals.targetLastUntilAge` |
| Pension card | "Plan begins drawing age pension at X. Total over plan: $Y." |
| Tax KPI | "Total tax paid: $X. Of which super contributions tax: $Y." |
| Cashflow | "From age X expenses exceed income by $Y/yr; investments cover the gap until age Z." |
| Value of Advice | (only shown when After scenario differs from Now) "After-Advice plan ends at $X vs $Y for Now." |
| Retirement income | "Average retirement income in plan: $X/yr. Your goal: $Y/yr." |

### UI

Subtle text card directly under each chart/KPI. Single colour (neutral grey-blue), no traffic lights, no warning icons except where the projection itself is broken (e.g. cashflow deficit already handled by `<DeficitWarning>`).

---

## 3. Scenario Buttons

### Goal
Let the user run their own what-if experiments without leaving the Dashboard. **The user chooses what to try** — the app just applies the mutation and shows the resulting numbers. This is exploration, not recommendation.

### Mechanism

`<ScenarioButtons>` on the Dashboard. Each button:
1. Activates the After scenario if not active.
2. Applies a deterministic mutation to `afterState` (the user's explicit choice).
3. Marks `afterDirty`.
4. The existing Value-of-Advice card shows the resulting before/after delta in plain numbers.

Tapping the same button toggles it off. "Clear all" resets After to a clone of Now.

### Phrasing rules
- Heading: **"Try a what-if"** (exploration, not "improve your plan").
- Button labels are neutral verbs the user chooses: "Retire 2 years later", "Downsize home at 70", "Add $200/wk to super".
- After applying, the delta is shown as **fact** ("+$84k at age 90") not as evaluation ("better!", "good choice!").
- No "recommended" badge on any button.

### Initial set (8 buttons)

| Button | Mutation | Notes |
|---|---|---|
| Retire 2 yrs later | both retirementAges +2 | |
| Retire 5 yrs later | both retirementAges +5 | |
| Add $200/wk to super | `income.p1.salarySacrifice += 200 * 52` | Tooltip notes the concessional cap |
| Downsize home at 70 | Sets `lifestyleAssets[primary].downsizeYear` = year at age 70, proceeds = **30%** of current value (user can override via tooltip "edit") | |
| Switch super to Conservative at 70 | adds an asset-allocation event at age 70 swapping all super to G30 | Engine extension needed |
| Reduce expenses by 10% | scales active lifestyleExpenses by 0.9 | |
| Delay age pension to 70 | `income.agePensionStartAge = 70` | Engine extension needed |
| Add $50k inheritance at 75 | one-off income event | |

### UI

Horizontal scrolling pills. Inside each pill after it's been applied, show the resulting delta:

```
Try a what-if
[+ Retire +2 yrs   end balance: +$84k]   [+ Add $200/wk   end balance: +$156k]   ...
```

Plain numeric delta. No green/red colour-coding to imply "better/worse" — just the magnitude.

### Implementation

```
covenant-planner/src/scenarios/
├── ScenarioButtons.jsx
├── definitions.js     // pure (state) => state mutators
└── deltas.js          // computeDelta(now, after) → { endBalance, ruinAge, totalTax }
```

---

## 4. Goal Progress Tracker (replaces "Readiness Score")

### Goal
Replace the per-CFP-rejected "0–100 readiness score + best-next-action recommender" with a **neutral progress display** against the user's own goals. No score, no recommendation — just "here's where you are vs where you said you wanted to be".

### What's shown

Three progress bars at the top of the Dashboard, one per goal the user set in the wizard (or on a future Goals tab):

```
┌──────────────────────────────────────────────────────────────┐
│ Your retirement goals                          [Edit goals]  │
├──────────────────────────────────────────────────────────────┤
│ Retire by age 65                                             │
│ ████████████████████░░░░  Plan retires at age 67             │
│                                                              │
│ Retirement income of $80,000/yr                              │
│ ███████████████░░░░░░░░░  Plan delivers avg $62,000/yr (78%) │
│                                                              │
│ Savings last to age 90                                       │
│ ████████████████████████  Plan lasts to age 92 ✓             │
└──────────────────────────────────────────────────────────────┘
```

- Each bar fills up to 100% if the projection meets or exceeds the goal.
- Below 100% = the bar shows the actual %, with the projected vs goal number.
- Above 100% = the bar fills, with a ✓.
- **Never a single composite score.** Three independent goals, three independent bars.

### Phrasing rules
- "Plan retires at age 67" — describes what the model produces given current inputs.
- NOT "you'll retire at 67" (implies inevitability).
- NOT "to hit your goal, do X" (advice).

### Calculation

```js
// src/lib/goalProgress.js
export function computeGoalProgress(projectionData, state) {
  return {
    retirementAge: {
      goal: state.goals.targetRetirementAge.p1,
      actual: state.personal.person1.retirementAge,
      pct: Math.min(1, state.goals.targetRetirementAge.p1 / state.personal.person1.retirementAge),
    },
    retirementIncome: {
      goal: state.goals.targetRetirementIncome,
      actual: avgRetirementIncome(projectionData, state),
      pct: Math.min(1, avgRetirementIncome(projectionData, state) / state.goals.targetRetirementIncome),
    },
    longevity: {
      goal: state.goals.targetLastUntilAge,
      actual: findRuinAge(projectionData) || projectionData[projectionData.length-1].age1,
      pct: Math.min(1, (findRuinAge(projectionData) || projectionData[projectionData.length-1].age1) / state.goals.targetLastUntilAge),
    },
  };
}
```

### Where it lives
- Top of Dashboard, above the existing KPI strip.
- Also a new **"Goals"** tab where the user can edit each goal individually.

---

## 5. AI Financial Assistant — advice guardrails

The chat must **never give personal financial advice**, regardless of how the user phrases the question. Current state already has `ADVICE_REFERRAL` fallback in `knowledgeBase.js`. We harden it:

### Changes
- **Rename** the assistant from "Financial Assistant" to **"Ask about financial concepts"** (sets expectation up front).
- **Pre-pended disclaimer** in every answer: "This is general education only — not personal advice."
- **Hard refuser** for any question matching prescriptive patterns: "should I", "is it a good idea to", "do you recommend", "can I retire", "am I on track" → returns ADVICE_REFERRAL immediately without attempting an answer.
- **Audit the existing KNOWLEDGE_BASE** for any answer that crosses the line (e.g. "the best strategy is…") and rewrite to "one approach is… your advisor can help you decide if it's right for you".
- Shrink the floating bubble visually so it reads as a secondary tool, not a primary feature.

### Refusal patterns (regex, case-insensitive)
```js
const ADVICE_TRIGGERS = [
  /\bshould i\b/i,
  /\bcan i (retire|afford|stop)\b/i,
  /\b(am i|are we) (on track|going to be ok|ready)\b/i,
  /\bis it (a )?good idea\b/i,
  /\bwhat (do you|would you) recommend\b/i,
  /\bwhat should (i|we)\b/i,
  /\bbest (strategy|option|choice) for me\b/i,
];
```

If any match → return `ADVICE_REFERRAL` text, do not search the KB.

---

## Build order & effort (revised)

| Order | Feature | Effort | Notes |
|---|---|---|---|
| 1 | **Wizard** (incl. goal-setting Qs) | 2 days | Skips entirely in Pro mode |
| 2 | **Goal Progress bars** (3 goals) | 1 day | Visible immediately after wizard |
| 3 | **"What this means" facts — top 3 KPIs** | 1 day | Net assets, retirement income, cashflow |
| 4 | **Scenario buttons (4 most-leveraged)** | 1 day | Retire later, add to super, downsize, reduce expenses |
| 5 | **AI guardrails** (refuser + rename + KB audit) | 0.5 day | Compliance-critical, do before public push |
| 6 | **Remaining "what this means" facts** | 1 day | Pension, tax, debt, VoA |
| 7 | **Remaining scenario buttons** | 1 day | Allocation switch, delay pension, inheritance |
| 8 | **Goals tab** (edit goals individually) | 0.5 day | |

**Total: ~8 working days.** AI guardrails (#5) should ship with any public release even if other items slip — it's a compliance gate, not a UX nice-to-have.

---

## Open questions — RESOLVED (27 May 2026)

| Q | Answer |
|---|---|
| 1. Wizard salary capture | **Combined household, with "edit split" link for couples** |
| 2. Downsize scenario % proceeds | **30% of current home value, with "edit" override on the button** |
| 3. Readiness Score weights | **Scrapped entirely** — replaced with neutral Goal Progress bars against user-set goals. Reason: a quality score implies recommendation, breaching ASIC advice rules. |
| 4. AI Assistant future | **Rename + shrink + harden** with regex refuser for prescriptive questions. Must never give advice. |
| 5. Pro mode + wizard | **Pro mode skips wizard entirely** |

---

## What we are NOT building

- ☓ Anything that recommends a course of action ("you should…", "best for you is…")
- ☓ A single composite readiness/quality score
- ☓ "Best next action" recommender
- ☓ Backend / accounts / sync across devices
- ☓ PDF export of "your plan" (V3 candidate)
- ☓ URL-shareable scenarios (low ROI vs file export)
- ☓ Push notifications / PWA install

Ship V2, gather Tudor's feedback against real clients + real DIY users, then decide V3.
