# Covenant Wealth Australian Financial Planner

## Project Purpose

A comprehensive Australian retirement and financial planning tool built by **Tudor Cosma, CFP** at Covenant Wealth.

**Dual audience:**
1. **Professional use** — Tudor's own client work as a Certified Financial Planner (19 years experience).
2. **Standalone consumer tool** — published for DIY users for **educational purposes only**, while they manage their own personal finances.

**Design principle:** Powerful enough for professional use, simple enough for a non-advisor to follow. Always include the "educational only — not financial advice" disclaimer in user-facing surfaces.

## Stack

- **Framework:** React 18 + Vite 5 (JSX, no TypeScript — keep it accessible)
- **Charts:** Recharts
- **State:** Single in-memory React state object (no backend, no persistence yet)
- **Deployment:** GitHub Pages, "Deploy from a branch" mode (source = `main` branch, `/docs` path).
  - Live URL: **https://tudorcosma.github.io/covenant-planner/**
  - Production base path: `/covenant-planner/` (set via `BASE_PATH` env var read in `vite.config.js`).
  - Dev base path: `/` (default when `BASE_PATH` is unset).
  - **To publish updates:** build locally with `BASE_PATH=/covenant-planner/ npm run build`, copy `dist/*` to `docs/`, commit + push to `main`. GitHub Pages auto-rebuilds within ~30s. Tudor cannot navigate the Replit/GitHub UI from his phone, so the agent does this via the GitHub REST API using the connector token (`listConnections('github')[0].settings.access_token`).
  - **No GitHub Actions workflow** — the connector OAuth token lacks the `workflow` scope, so workflow files cannot be modified from the agent. Switching to "branch deploy" sidesteps this. If the workflow scope is later added, restoring `.github/workflows/deploy.yml` (build job that runs `npm ci && npm run build` and uploads `dist/`) would let Pages rebuild automatically on every push without the manual build step.
- **Local dev:** Replit workflow `Covenant Planner` runs `npm run dev` on port 5000

## Repo Layout

The cloned project lives at `covenant-planner/` inside this Replit workspace. Everything under `covenant-planner/` is the actual app; the rest of the workspace (`artifacts/`, `lib/`, etc.) is the Replit monorepo scaffold and is not used by this project.

Inside `covenant-planner/`:
- `src/main.jsx` — React entry point
- `src/App.jsx` — slim app shell (~125 lines): tabs router, global state, theme, Now/After scenario, mounts the AI Assistant
- `src/data/` — static data and constants (no logic)
  - `tax2024.js` — `DEFAULT_TAX_BRACKETS_2024`, `DEFAULT_SUPER_PARAMS`, `DEFAULT_CENTRELINK`, `DEFAULT_MEDICARE`
  - `returnProfiles.js` — return profiles, asset returns, asset labels
  - `themes.js` — `THEMES` palette + mutable `COLORS` object
  - `tabs.js` — `TABS` menu array
  - `defaultState.js` — `DEFAULT_STATE` (initial form values)
  - `knowledgeBase.js` — AI assistant Q&A: `KNOWLEDGE_BASE`, `findAnswer`, `QUICK_QUESTIONS`, `TAB_INTROS`, `TAB_CONTEXTS`, `ADVICE_REFERRAL`
  - `logo.js` — `COVENANT_LOGO` base64 image
- `src/lib/` — pure calculation functions (no React)
  - `format.js` — `fmt`, `pct`
  - `tax.js` — `calcIncomeTax`, `calcMedicare`
  - `centrelink.js` — `calcCentrelinkPension`, `calcDeemedIncome`, `calcDeprivedAssets`
  - `loans.js` — `getMonthlyEquiv`, `calcLoanPayoff`
  - `monteCarlo.js` — `boxMullerRandom`
  - `projection.js` — `runProjection` (the master engine)
  - `index.js` — barrel re-export
- `src/components/` — shared UI primitives + cross-tab widgets
  - Primitives: `Input`, `DateInput`, `FYInput`, `Select`, `Card`, `StatCard`, `Btn`, `Modal`, `HeaderBtn`
  - Widgets: `ScenarioToggle`, `ReturnSummary`, `FinancialAssistant`
  - `index.js` — barrel re-export
- `src/tabs/` — one file per tab (flat structure)
  - `DashboardTab`, `PersonalTab` (reference module), `IncomeTab`, `AssetsTab`, `ExpensesTab`, `LiabilitiesTab`, `ProjectionsTab`, `MonteCarloTab`, `TaxTab` (Legislation), `ReturnsTab` (Returns & Portfolios), `SettingsTab`
  - `index.js` — barrel re-export
- `src/App.jsx.bak`, `src/App.jsx.monolith` — pre-refactor backups (safe to delete once you're confident the refactor is stable)
- `index.html`, `vite.config.js`, `package.json` — standard Vite setup
- `docs/` — published bundle served by GitHub Pages (see Deployment section above). Don't hand-edit; regenerate via `npm run build` then copy `dist/*` → `docs/`.

**Conventions for working with the new structure:**
- When adding a new tab, drop a file in `src/tabs/`, add it to `tabs/index.js` barrel, register it in `data/tabs.js` (TABS array), and wire it into `App.jsx`'s tab switch.
- When adding a calculation, drop a function in the relevant `lib/` file (or create a new one) and add it to `lib/index.js`.
- When adding a reusable UI piece, drop it in `components/` and add to `components/index.js`.
- All tabs use a "kitchen sink" import block at the top — adding new shared exports automatically becomes available without editing every tab's imports.
- `COLORS` is intentionally mutable: `Object.assign(COLORS, ...)` updates it in place so all components see the new theme. Don't replace the object reference.

## Tabs (Menu Structure)

| Tab | Purpose | State |
|---|---|---|
| Dashboard | Read-only summary, charts, "Now vs After Advice" comparison | Working |
| Personal | Couple/single, homeowner, ages, retirement age, life expectancy, growth assumptions | **Most complete — reference module** |
| Income | Salary, sacrifice, dividends, rental, super contributions per person | In progress |
| Assets | Super (accumulation/pension), non-super investments, lifestyle assets, downsizer | In progress |
| Expenses | Lifestyle phases (pre/go-go/slow-go), base expenses, future one-offs | In progress |
| Liabilities | Loans with payoff modelling | In progress |
| Projections | Year-by-year cashflow, super, age pension projection | In progress |
| Stress Testing | Monte Carlo simulation | In progress |
| Legislation | Editable tax brackets, super params, Centrelink, Medicare | In progress |
| Returns & Portfolios | Editable return profiles and asset class returns | In progress |
| Settings | Cashflow waterfall rules (cash buffer + debt account) and theme switcher | Working |

Plus an **AI Financial Assistant** (`FinancialAssistant` component) — context-aware Q&A keyed off the current tab, with a built-in `KNOWLEDGE_BASE` and "refer to advisor" fallback.

## Core Calculation Engine

All in `src/App.jsx` today (will move to `src/lib/` in refactor):

- `runProjection(state, useRandomReturns, seed)` — master year-by-year engine
- `calcIncomeTax(taxableIncome, brackets)` — Australian tax brackets
- `calcMedicare(income, params)` — Medicare levy + surcharge
- `calcCentrelinkPension(...)` — age pension dual test (assets + income)
- `calcDeemedIncome(financialAssets, isCouple, params)` — Centrelink deeming
- `calcDeprivedAssets(gifts, projectionYear, params)` — gifting / 5-year rule
- `calcLoanPayoff(...)` — loan amortisation
- `boxMullerRandom()` — Monte Carlo normal sampling

## Scenario Comparison (Now vs After Advice)

The app keeps two parallel state trees:
- `state` — the "Now" baseline (current situation)
- `afterState` — the "After Advice" scenario (deep-cloned from `state`, then edited)

A `scenario` flag (`"now" | "after"`) determines which is being edited. Most tabs accept `scenario`, `onActivateAfter`, `onActivateNow`, `onResetAfter`, `afterState` props and use the shared `ScenarioToggle` component.

`DashboardTab` and `ProjectionsTab` receive both scenarios explicitly: `nowState`/`setNowState`/`nowProjectionData` and `afterState`/`setAfterState`/`afterProjectionData`. Inside each tab a local `state`/`setState`/`projectionData` alias points to the **active** scenario (After if `scenario === "after"` and `afterState` exists, else Now) so all editor popups, charts, tables, and KPI cards reflect what the user is currently viewing. The Value of Advice card and Action Plan report always read `nowProjectionData`/`nowState` vs `afterProjectionData`/`afterState` so the comparison stays consistent regardless of which scenario is on screen.

## Default Australian Regulatory Data (FY 2025-26)

Stored as constants at the top of `App.jsx`:
- `DEFAULT_TAX_BRACKETS_2024` — income tax brackets
- `DEFAULT_SUPER_PARAMS` — concessional/non-concessional caps, contribution tax rates, preservation age
- `DEFAULT_CENTRELINK` — assets test thresholds, income test, deeming rates, gifting limits
- `DEFAULT_MEDICARE` — levy rate, MLS thresholds
- `DEFAULT_RETURN_PROFILES` — Conservative/Balanced/Growth/etc. with asset allocations
- `DEFAULT_ASSET_RETURNS` — per-asset-class expected returns

These can be overridden by the user in the Legislation and Returns tabs.

## Conventions for Future Work

- **No TypeScript** — keep it JSX so non-programmers can read it.
- **No new dependencies unless essential.** Current stack is React + Recharts only.
- **No authentication, no backend, no database** for the consumer version — runs entirely client-side.
- **Always include the disclaimer:** "Educational tool only — not financial advice."
- **Australian context only** — all rules, rates, terminology should reflect ATO / Centrelink / APRA.
- **Tax year format:** Australian financial year (1 July → 30 June), shown as e.g. "FY25-26".
- **Currency:** AUD, formatted with `fmt()` helper.
- **Use existing primitives** (`Input`, `Select`, `Card`, `StatCard`, `Btn`, `Modal`) for visual consistency.
- **Personal tab is the reference** — match its structure and style when building/refactoring other tabs.

## Key Commands (run from `covenant-planner/`)

- `npm run dev` — local dev server (port 5000)
- `npm run build` — production build (with `/covenant-planner/` base path)
- `npm run preview` — preview production build

## Today's-Dollars Convention (May 2026)

**Every $ value displayed anywhere in the app is in today's dollars** (real terms, deflated by `personal.inflationRate`, default 2.5%). There is no nominal/real toggle — it was removed because mentally discounting future nominal figures was the single biggest source of user confusion.

Mechanics, in `src/lib/projection.js`:
- The engine computes year-by-year in **nominal** terms internally (tax brackets, super caps, Centrelink thresholds are nominal in legislation and must apply to nominal income/balances).
- At the bottom of each year's loop the row is built nominally as `nominalRow`, then every numeric field is divided by `inflationFactor = (1+inflation)^y`, producing `deflatedRow`. Deflated values are pushed under the canonical field names (`netAssets`, `totalTax`, `p1Super`, etc.).
- `__nominal` on each row preserves the original nominal numbers for debugging, but **no UI consumer should ever read `__nominal`**.
- Non-dollar fields excluded from deflation: `year, age1, age2, period, cashRate, debtRate, inflationFactor`.

If you add a new $ field to projection output, just add it to `nominalRow` — it will be deflated automatically.

## Local Persistence & Backup (May 2026)

`src/lib/persistence.js` handles autosave to `localStorage` (key `covenantPlanner.v1`, `SCHEMA_VERSION = 1`):
- `saveState(...)`, `loadState()` (null on missing/corrupt/version mismatch), `clearState()`, `exportPlanToFile(...)`, `importPlanFromFile(file)`

Wired in `App.jsx`:
- `const SAVED = persistLoad()` runs synchronously before mount so users see their plan immediately — no flash of DEFAULT_STATE.
- Debounced (600ms) `useEffect` writes to localStorage on every change to state/afterState/afterDirty/scenario/theme.
- Header pill `<SaveStatusBadge>` shows live save state (idle / saving / saved / restored / error) and opens a menu with Export / Import / Reset.

If you bump the schema, increment `SCHEMA_VERSION` AND write a migration in `loadState()` — do not silently drop old saves once the app has real users.

See `covenant-planner/V2_DESIGN.md` for the wizard / interpretation layer / scenario buttons / readiness score design.

## V2 Features (May 2026, shipped)

V2 is live on GitHub Pages. New surfaces:

- **First-run Wizard** (`src/wizard/Wizard.jsx`) — single-file, 9 steps, multi-goal loop (retirement, house, debt, sabbatical, education, travel, big purchase, custom), captures Other Investments before finishing. Auto-shown when the active plan has no `wizardCompleted` flag (covers fresh installs AND legacy pre-V2 saves) and `proMode === false`. Skips entirely in pro mode. On finish, merges into `state` with `wizardCompleted: true`.
- **Goals system** — `state.goals: []`, each `{id, kind, label, ...kind-specific}`. Kinds defined in `src/lib/goalProgress.js` (`GOAL_KINDS`). New **Goals tab** (`src/tabs/GoalsTab.jsx`) to add / edit / delete.
- **Goal Progress bars** (`src/components/GoalProgress.jsx`) — injected at top of Dashboard. Retirement goal expands into 3 sub-bars. Each bar below 100% expands to a lever-nudge card from `src/lib/interpret.js` (LEVERS) pointing at the inputs that move the number, with the educational-only DISCLAIMER.
- **Scenario buttons** (`src/components/ScenarioButtons.jsx`) — 5 deterministic what-ifs below GoalProgress: Retire +2y / +5y, +$200/wk super, Downsize at 70, –10% expenses. Each mutates `afterState` and shows the end-of-plan delta vs Now.
- **Covie** (renamed `FinancialAssistant.jsx`) — warm AU finance educator persona, dry humour, 500-word input cap with live counter, `isAdviceQuestion` regex refuser with a concept-question allowlist (`what is`, `how does X work`, `explain`, `understand`, `difference between`) so concept questions aren't blocked. 5 escalating tiers of refusal lines in `src/lib/covieVoice.js`; tier picked from a per-session refusal count, line picked at random skipping the last-shown.

**Critical field-name contract** — the V2 progress/interpret layer reads from `runProjection` rows. Canonical names emitted by `src/lib/projection.js`: `p1NonSuper`, `p2NonSuper`, `jointNonSuper`, `totalDebtRemaining`, `totalLiabilities`, `netInvestmentAssets`, `netAssets`, `totalIncome`, `totalExpenses`. **Do not invent variants** (`p1NonSuperBal`, `jointBal`, `totalDebt`, `loanBalance` etc.) — `goalProgress.js` and `interpret.js` will silently report zeros.

## Known Issues / Current Focus

- `src/App.jsx` is a ~4,800-line monolith. Refactor planned: split into `lib/`, `data/`, `components/`, `tabs/`.
- README states "much of it is not working yet" — per-tab status above reflects current state.
- Dashboard depends on completed projection engine; verify all tabs feed it correctly after refactor.

## Now/After Scenario Auto-Sync

The "After Advice" scenario starts as a clone of "Now" and **auto-mirrors** the Now scenario whenever Now changes — until the user makes their first independent edit in After. Tracked via `afterDirty` boolean in `App.jsx`:

- `setAfterStateRaw` — raw React setter (used by `activateAfter`, `resetAfter`, mount).
- `setAfterState` — wrapped setter passed to all tabs; calls `setAfterStateRaw` AND `setAfterDirty(true)`. Any tab edit in After scenario marks dirty.
- `useEffect([state])` — when Now changes and `afterDirty===false` and `afterState` exists, deep-clones nowState into afterState. This ensures: if the user clicks "After Advice" before entering Now data, then later enters Now data, the After scenario follows along and Value-of-Advice cards stay at $0 (no phantom variance).
- `resetAfter` clears `afterDirty` so auto-sync resumes.
- Loading a saved scenario with `setAfterState(json.after)` marks dirty (intentional snapshot, shouldn't be overwritten by Now edits).

If you add a new way to populate `afterState`, decide deliberately whether to use the raw setter (keeps auto-sync on) or the wrapped one (marks dirty).

## Superannuation Drawdown Rules

The projection enforces three Australian super legislation rules. All values live in `legislation.superParams` and are user-editable in the Tax & Legislation tab so they can be adjusted when regulations change.

### 1. Age-based minimum drawdown (SIS Reg 1.06(9A))
For account-based pensions, the annual drawdown must be at least the age-band minimum:

| Age | Minimum |
|---|---|
| Under 65 | 4% |
| 65–74 | 5% |
| 75–79 | 6% |
| 80–84 | 7% |
| 85–89 | 9% |
| 90–94 | 11% |
| 95+ | 14% |

Stored as `legislation.superParams.minPensionDrawdownRates` — an array of `{minAge, maxAge, rate}` bands. Editable as a table in TaxTab. Projection uses `Math.max(ageMinimum, userDrawdownPct)` so the user's own pct can override upward but never go below the legal minimum for their age. (The COVID-19 50% halving expired on 30 Jun 2023 and is not modelled.)

### 2. SIS Act condition of release — no super before age 60
Stored as `legislation.superParams.earliestSuperAccessAge` (default 60). Both ABP and TTR draws return 0 when the person is younger than this age. Hardship and total-and-permanent-incapacity provisions are explicitly out of scope — the model assumes none apply.

### 3. Drawdown rate selection (bug-fix)
Each person has both a `p1Super` (the main editable account) and a `p1Pension` (rarely used legacy slot, default balance 0). The previous OR-chain `p1Pension?.drawdownPct || p1Super?.drawdownPct || 5` always returned the empty p1Pension's default 5%, so editing the main super drawdown had no effect. Fixed via `pickDrawPct()` — uses the pension account's pct only when its balance > 0, otherwise the main account's pct.

## Single-Person Scenario Invariant

When `personal.isCouple === false`, the projection engine **must not** include any P2 values in totals, charts, the data table, the Action Plan report, or Centrelink calcs. Enforced at these gating points:

- `lib/projection.js` — at initialization, `p2SuperBal` and `p2NonSuperBal` are zeroed when `!isCouple`.
- `lib/projection.js` — P2 super growth (`if (isCouple)` block ~line 361), P2 non-super growth (~line 413), P2 prop costs (~line 404), P2 deficit drawdown step (~line 426), P2 holdings rebalance (~line 432), and P2 medicare/income tax (~line 264) are all gated.
- `lib/projection.js` — downsize/sale `dest === "p2NonSuper"` is rewritten to `"p1NonSuper"` when single, so stale couple-mode allocations don't make proceeds vanish.
- `lib/centrelink.js` — `calcCentrelinkPension` uses single thresholds when `!isCouple` (already correct).
- `tabs/DashboardTab.jsx` — Action Plan iterates `["p1Super","p1Pension"]` only when single (P2 keys excluded). All chart bars and tax summary rows for P2 are gated by `isCouple &&`.
- `tabs/ProjectionsTab.jsx`, `AssetsTab.jsx`, `IncomeTab.jsx`, `LiabilitiesTab.jsx`, `PersonalTab.jsx` — all P2 inputs and dropdown options gated by `isCouple`.

If you add new P2-related projection state or UI, gate it here too.
