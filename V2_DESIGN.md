# Covenant Planner V2 — Order-of-Magnitude UX Overhaul

**Status:** design doc, NOT YET BUILT. Awaiting Tudor's review before any code.
**Author:** Replit Agent + Tudor Cosma, CFP
**Date:** 27 May 2026

---

## Why we're doing this

Today the app is *technically powerful* (full Australian tax, super, Centrelink, aged care, Monte Carlo, Now-vs-After scenarios) but *psychologically intimidating* for a non-advisor. A new user lands on an empty Dashboard backed by sample data, sees 13 tabs, and has no idea where to start or what any number means for them. We can't fix that with another tab — only with a fundamentally different way in.

This doc designs four interlocking features that together would change *who can use the app*:

1. **First-run wizard** — guided onboarding instead of blank tabs.
2. **"What this means" layer** — every key number paired with a plain-English interpretation.
3. **Scenario buttons** — one-tap "what if?" experiments on the Dashboard.
4. **Retirement Readiness score** — a single 0–100 number that summarises the whole plan.

Already shipped (referenced here as foundations):
- ✅ Today's-dollar conversion (every figure auto-deflated; toggle removed).
- ✅ Autosave to `localStorage` + Export / Import / Reset.

---

## 1. First-Run Wizard

### Goal
Replace the "land on empty Dashboard" experience with a 5–7 question conversation that produces a personalised projection in under 3 minutes.

### Trigger
Show the wizard automatically when:
- No saved plan exists in `localStorage` (i.e. true first visit), AND
- The user is on the Dashboard tab.

Also expose it from the Save-status menu as **"Restart with the wizard"** so existing users can reset cleanly.

### Question flow

| # | Question | Type | Maps to |
|---|----------|------|---------|
| 1 | What's your first name? (and partner's, if you have one) | text + optional text | `personal.person1.name`, `personal.person2.name`, `personal.isCouple` |
| 2 | How old are you both? | number + optional number | `person1.birthYear` (= today's year − age), same for p2 |
| 3 | When would you like to stop working? | number (age) per person | `person1.retirementAge`, `person2.retirementAge` |
| 4 | What's your combined take-home household salary right now? | currency | `income.p1Salary` (split by ratio if couple — default 60/40) |
| 5 | How much is in your super, all up? | currency per person | `assets.super.p1Super.balance`, p2 |
| 6 | What do you spend per month on living costs? (rent/mortgage, food, bills, fun) | currency | `expenses.lifestyleExpenses[0].amount = monthly × 12` |
| 7 | Do you own your home? | yes/no | `personal.homeowner`, default `lifestyleAssets` primary residence if yes |

**Skip logic:** Q4–6 each have a *"I'll set this up later"* link that pre-fills with a plausible default (median ATO/ABS figures for the user's age band).

### After the wizard
- Show the Dashboard with the user's own projection rendered.
- A **"Plan ready! Here's what we set up from your answers"** banner lists the 7 inputs as clickable chips → tapping a chip jumps to the right tab with that field focused.
- Big CTA: **"See what happens if you save more, retire later, or downsize"** → opens the scenario buttons section (feature #3).

### Implementation sketch

```
covenant-planner/src/wizard/
├── Wizard.jsx           // <Wizard onComplete={(state) => setState(state)} />
├── WizardStep.jsx       // shared shell: title, helper text, input(s), Back/Next
└── steps/
    ├── NamesStep.jsx
    ├── AgesStep.jsx
    ├── RetirementStep.jsx
    ├── SalaryStep.jsx
    ├── SuperStep.jsx
    ├── ExpensesStep.jsx
    └── HomeStep.jsx
```

- Wizard owns a `draft` object (subset of full state). On final step, deep-merge into `DEFAULT_STATE` and call `setState`.
- One step per screen, mobile-first: full-screen modal overlay, single input above the fold, no scroll required.
- Progress dots at the top, **Back** always available, **Next** disabled until input is valid.
- **Estimated time saved per question** is shown ("Step 3 of 7 — almost there").

### Out of scope (V2.1+)
- Asset class allocation questions (defaults to G60 Balanced — adjust on Returns tab if you care).
- Multiple kids / dependants.
- Existing investment properties / non-super investments.

---

## 2. "What This Means" Layer

### Goal
Stop showing bare numbers. Every KPI on the Dashboard gets a one-sentence plain-English interpretation written in the second person ("You'll run out of super at 82"), with an actionable next step ("→ Try retiring 2 years later").

### Mechanism
A new component `<Interpretation>` rendered next to each major Dashboard surface. The text is computed by a pure function `interpret(projectionData, state)` in `src/lib/interpret.js` — **not** AI; it's deterministic logic so it's testable, instant, and offline-capable. (The AI Assistant remains for free-form Q&A.)

### Coverage map

| Dashboard surface | Interpretation it gets |
|---|---|
| Net Assets chart | "Your money peaks at age 72 at $1.2M, then runs out at 84. That's 3 years short of your life expectancy of 87." |
| Pension card | "You'll start qualifying for a part age pension at 67, full pension at 81. That's worth ~$280k over your retirement." |
| Tax KPI | "You'll pay $410k in tax over the plan. About 60% of that is super contribution tax — salary sacrificing more could reduce it." |
| Surplus / deficit | "From age 67 your expenses exceed income by $42k/yr. Your investments cover the gap until 84." |
| Value of Advice | "The After-Advice scenario adds $340k to your retirement — mostly from delayed retirement (+$210k) and Conservative re-allocation (+$130k)." |

### `interpret()` function design

```js
// src/lib/interpret.js
export function interpret(projectionData, state) {
  return {
    netAssets: interpretNetAssets(projectionData, state),
    pension: interpretPension(projectionData, state),
    tax: interpretTax(projectionData, state),
    cashflow: interpretCashflow(projectionData, state),
    // ...
  };
}

function interpretNetAssets(data, state) {
  const peak = data.reduce((a, b) => b.netInvestmentAssets > a.netInvestmentAssets ? b : a);
  const ruinYear = data.findIndex(r => r.netInvestmentAssets <= 0);
  const ruinAge = ruinYear >= 0 ? data[ruinYear].age1 : null;
  const lifeExp = state.personal.person1.lifeExpectancy || 90;

  if (ruinAge === null) {
    return {
      verdict: "good",
      headline: `Your savings last the full plan — you finish with $${fmt(data[data.length-1].netInvestmentAssets)} at age ${data[data.length-1].age1}.`,
      action: null,
    };
  }
  if (ruinAge >= lifeExp) {
    return {
      verdict: "ok",
      headline: `Your money lasts until age ${ruinAge}, which matches your life expectancy of ${lifeExp}.`,
      action: { label: "Try building in a safety margin", onClick: "scenario:extendLife" },
    };
  }
  return {
    verdict: "warn",
    headline: `Your money runs out at age ${ruinAge} — ${lifeExp - ruinAge} years short of life expectancy (${lifeExp}).`,
    action: { label: `What if I retired ${Math.min(5, lifeExp - ruinAge)} years later?`, onClick: "scenario:delayRetirement" },
  };
}
```

### UI

Compact card directly under each chart/KPI:

```
┌─────────────────────────────────────────────────────────┐
│ ⚠  Your money runs out at age 84 — 6 years short of    │
│    life expectancy (90).                                 │
│                                                          │
│    [ What if I retired 2 years later? ]   (scenario btn)│
└─────────────────────────────────────────────────────────┘
```

Colour: green (verdict=good), amber (ok), red (warn). Same palette as the existing DeficitWarning.

### Implementation order
1. Build `interpret.js` skeleton + 1 interpreter (`interpretNetAssets`) + `<Interpretation>` component.
2. Wire it into the Net Assets chart on Dashboard. Ship.
3. Add interpreters one-per-day for pension, tax, cashflow, VoA, debt.

---

## 3. Scenario Buttons

### Goal
Replace the "go to tab → edit field → return to Dashboard" loop with one-tap experiments. The user thinks in life decisions ("what if I retire later?"), not in form fields.

### Mechanism

A new component `<ScenarioButtons>` rendered prominently on the Dashboard (above the Net Assets chart). Each button:
1. Activates the After scenario if not active (uses existing `activateAfter`).
2. Applies a deterministic mutation to `afterState`.
3. Marks afterDirty so it stops auto-syncing.
4. Stays selected — user sees the before/after delta in the existing Value-of-Advice card.

Tapping the same button again **toggles** it off (resets that mutation).

### Initial set (8 buttons)

| Button | Mutation | Notes |
|---|---|---|
| Retire 2 yrs later | both retirementAges +2 | The single highest-leverage lever for most users |
| Retire 5 yrs later | both retirementAges +5 | |
| Salary sacrifice $200/wk extra | `income.p1.salarySacrifice += 200 * 52` | Capped at concessional cap with a tooltip |
| Downsize home at 70 | sets `lifestyleAssets[primary].downsizeYear = year + (70-age)`, proceeds = current value × 0.4 | |
| Switch to Conservative at 70 | adds an asset-allocation event at age 70 swapping all super to G30 | Requires a small projection-engine extension to support time-based allocation switches |
| Reduce expenses by 10% | `expenses.lifestyleExpenses.amount *= 0.9` for active phase | |
| Delay age pension to 70 | `income.agePensionStartAge = 70` | Future feature — pension is age-67-locked today |
| Add $50k inheritance at 75 | adds a one-off expenseBucket entry with negative amount | |

### UI

Horizontal scrolling row of pill buttons under the heading **"Try a what-if"**, with the green/red delta shown inside each pill after it's been applied:

```
Try a what-if
[+ Retire +2 yrs  ▲ $84k]  [+ Salary sacrifice $200/wk  ▲ $156k]  [+ Downsize at 70  ▲ $310k] →
```

Tapping a pill that's already on toggles it off. Tapping **"Clear all"** at the right resets After to a clean clone of Now.

### Implementation

```
covenant-planner/src/scenarios/
├── ScenarioButtons.jsx
├── definitions.js     // [{ id, label, apply(state), undo(state), category }]
└── deltas.js          // computeDelta(now, after) → { netAssetsDelta, taxDelta, ruinAgeDelta }
```

Each scenario in `definitions.js` is a pure (state) → state function, applied to a *cloned* afterState. Stored as an array of active scenario IDs in App-level state. Re-applying = walk the active IDs over a fresh clone of Now.

---

## 4. Retirement Readiness Score

### Goal
Give every user a single 0–100 number that summarises their whole plan, prominently at the top of the Dashboard, alongside one sentence saying *what* to do to improve it.

### Score formula (V1, deterministic)

```
score = round(
  0.40 * fundedRatio       +   // years savings lasts / years needed
  0.20 * expenseCoverage   +   // pension+income / required expenses at retirement
  0.15 * taxEfficiency     +   // (1 - tax / income) vs benchmark
  0.10 * pensionCapture    +   // total age pension as % of theoretical max
  0.10 * debtFreedom       +   // 1 if debt-free at retirement, scaled if not
  0.05 * diversification       // n distinct asset classes with >5% weight
) * 100
```

Each sub-metric is clamped [0,1]. Weights are configurable in `src/lib/score.js` so Tudor can tune them with client feedback.

### "Best next action" engine

After computing the score, evaluate each scenario button (#3) in dry-run mode and pick the one that increases the score the most. Display:

> **Retirement Readiness: 73 / 100**
> Biggest impact: **delay retirement by 2 years** (+9 points)

Clicking the recommendation applies the scenario.

### UI placement

Top of Dashboard, above the existing KPI strip. Big circular gauge (Recharts `RadialBarChart`) with the score in the centre, colour-coded:
- 80+ green
- 60–79 amber
- <60 red

### Implementation

```
covenant-planner/src/lib/score.js
├── computeScore(projectionData, state) → { score, breakdown }
└── recommendNextAction(state, scenarios) → { scenarioId, scoreDelta }
```

Renders inside a new `<ReadinessScore>` component on the Dashboard.

---

## Build order & estimated effort

| Order | Feature | Effort | Why this order |
|---|---|---|---|
| 1 | **Wizard** | 2 days | Without this, new users still bounce. Highest acquisition-impact lever. |
| 2 | **"What this means" — Net Assets only** | 0.5 day | Cheapest interpretation; proves the pattern; immediate visible win. |
| 3 | **Scenario buttons (3 most-leveraged)** | 1 day | Pairs perfectly with the interpretation actions. Retire-later, salary-sacrifice, downsize. |
| 4 | **Readiness Score (V1, no recommender)** | 1 day | Gives users a goal to optimise toward. |
| 5 | **Best-next-action recommender** | 0.5 day | Closes the loop: score → action → re-score. |
| 6 | **Remaining interpretations** | 1.5 days | Pension, tax, cashflow, VoA, debt. One per session. |
| 7 | **Remaining scenario buttons** | 1 day | Allocation switch, delay pension, inheritance. |

**Total: ~7.5 working days for full V2.**

---

## Open questions for Tudor

1. **Wizard salary** — capture as combined household, or per person? Per person is more accurate but adds a step.
2. **Scenario "downsize at 70"** — what % of home value should we assume in proceeds? Default 40%?
3. **Readiness score weights** — is 40% fundedRatio + 20% coverage etc. reasonable, or should debt/tax weigh more?
4. **AI Assistant role** — do we still need the chat bubble once "what this means" + scenario buttons exist? I'd argue: keep it but rename to "Ask anything" — now it handles the long tail, not the basics.
5. **Pro-mode** — should the wizard skip entirely when `proMode` is on? Tudor doesn't need a wizard with his own clients.

---

## What we are NOT building in V2

- ☓ Backend / accounts / sync across devices (consumer is single-device; advisors use their own machine)
- ☓ PDF export of "your plan" (worth doing in V3 — pairs naturally with the report-style Action Plan that already exists)
- ☓ URL-shareable scenarios (low ROI vs file export)
- ☓ Mobile-native pickers / iOS keyboard polish (current input scaling works; revisit if real users complain)
- ☓ Push notifications / PWA install (cool but not order-of-magnitude)

Ship V2, gather real user reactions, then decide what V3 should be.
