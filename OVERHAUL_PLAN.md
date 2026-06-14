# Covenant Planner — Overhaul Plan

**Status:** Plan only. No code changes in this pass.
**Reference inputs:**
- Source workbook of legislative assumptions, FY25/26 effective 1 April 2026 (attached)
- `attached_assets/reference_images/image1..9.png` (extracted from the workbook — reference UI: cashflow modeling charts, Indexation panel, Tax Details panel)
- Live dashboard screenshot `attached_assets/screenshots/tudorcosma_github_io_covenant-planner.png`

---

## 1. Goal

Bring the planner to **industry-equivalent coverage** of Australian legislative inputs while keeping the JSX-only / client-side / educational posture. Three threads:

1. **Expand calculation variables** — every assumption the reference tool exposes should exist in our data model.
2. **Make every assumption editable** — no magic numbers buried in `lib/`.
3. **Add a Financial-Year selector** — user picks an FY (e.g. FY23/24, FY24/25, FY25/26, FY26/27…) and the entire engine + UI re-evaluates against that vintage of rules. Lets clients see "if we used last year's caps…" or "when the new SGC rate kicks in…".

---

## 2. Gap Analysis — What the reference workbook has that we don't

### 2a. Taxation (Sheet3 rows 9–32)
| Variable | In app? | Source row |
|---|---|---|
| Resident individual brackets (FY25/26: 0 / 16% / 30% / 37% / 45%) | ✅ partial | R12–16 |
| Company tax rate (30%) | ❌ | R19 |
| Incorporated small business rate (25%) | ❌ | R20 |
| Unincorporated small business rate (25%) | ❌ | R21 |
| Super contributions tax (15%) | ✅ | R24 |
| Super investment earnings tax (15%) | ✅ | R25 |
| Medicare levy (2%) + individual threshold ($27,222) + shade-in rate (10%) + shade-in threshold ($34,028) | ⚠️ partial — shade-in not modelled | R28–31 |
| Medicare Levy Surcharge tiers + "Existing Private Hospital Cover" toggle | ❌ | image8.png |
| Senior & Pensioner Tax Offset (SAPTO) eligibility flag | ❌ | image8.png |
| Low Income Tax Offset (LITO) eligibility flag | ❌ | image8.png |
| ETP/Leave lump-sum rebate flag | ❌ | image8.png |
| Beneficiary rebate flag | ❌ | image8.png |
| PAYG withholding mode (None / Standard) | ❌ | image8.png |
| Residency status (Tax Resident / Non-resident / Working Holiday Maker) | ❌ | image8.png |
| Unused capital losses carry-forward $ | ❌ | image8.png |

### 2b. Superannuation (Sheet3 rows 6–31, RHS)
| Variable | In app? | Source |
|---|---|---|
| Concessional cap ($30,000) | ✅ | R6 |
| Non-concessional annual cap ($120,000) | ✅ | R7 |
| Non-concessional bring-forward limit ($360,000) | ⚠️ not enforced as 3-yr cap | R8 |
| **Co-contribution lower threshold ($47,488)** | ❌ | R11 |
| **Co-contribution max income threshold ($62,488)** | ❌ | R12 |
| **Co-contribution max payment ($500)** | ❌ | R13 |
| **Super Lump Sum Low Rate Cap ($260,000)** | ❌ | R16 |
| **Untaxed Plan Cap ($1,860,000)** | ❌ | R17 |
| **Redundancy tax-free base ($13,100) + per-year ($6,552)** | ❌ | R20–21 |
| **Small Business CGT Concession Cap ($1,865,000)** | ❌ | R23 |
| **Maximum Super Contribution Base (MSCB, $250,000/qtr)** | ❌ | R29 |
| SGC rate (12% from 1/7/2025) | ⚠️ hard-coded 11.5% | R30–31 |
| Preservation age table (born-before → age) | ⚠️ single value 60 | R37–43 |
| **Full ABP min/max factor table by age 60–100** (currently 7 bands) | ⚠️ banded only | R8–R50 (right side) |
| **Lifetime Income Stream rules** (60% purchase-price asset assessed, age-85 threshold, 30% after, 60% income test) | ❌ | R52–58 |

### 2c. Centrelink (Sheet3 rows 33–104)
| Variable | In app? |
|---|---|
| Age Pension rates Single $31,223 / Couple-each $23,535 | ⚠️ |
| Assets test thresholds (single/couple, homeowner/non, separated-by-illness × 2) — **6 thresholds** | ⚠️ have 4, missing illness-separated |
| Assets test reducer $3.00/$1k | ✅ |
| Asset cut-off thresholds (6 cells R48–53) | ⚠️ |
| Income test thresholds single $5,668 / couple $9,880 | ✅ |
| Income test reducer $0.50/$1 | ✅ |
| Income test cut-off thresholds single $68,115 / couple $104,021 | ⚠️ derived but not surfaced |
| Deeming thresholds single $64,200 / couple $106,200 | ✅ |
| Deeming rates 1.25% / 3.25% | ✅ |
| **Allowance (JobSeeker) payment rates** — single no-dep, single w/dep, single over-60, couple-each | ❌ |
| **Allowance assets tests + income tests + excess-partner-income threshold** | ❌ |
| **Commonwealth Seniors Health Card income limits** (single $101,105 / couple $161,768 / illness-sep $202,210) | ❌ |
| Per-child supplement $639.60 | ❌ |
| Gifting limits ($10k/yr, $30k/5yr) | ✅ already in app |

### 2d. Aged Care (Sheet3 rows 67–150) — **entire module missing**
Two regimes co-exist because of legislation transition:
- **Aged Care Bill 2013** (current) — basic daily $66.80, max means-tested $403.80/day, annual cap $35,910, lifetime cap $86,185, asset-tested + income-tested ladders with home exemption $214,884.
- **Aged Care Act 2024** (new) — different ladders (R107–126), Non-Clinical Care Contribution (max 4 yrs, $107.32/day, lifetime cap $137,917), Higher Everyday Living Fee.
- Accommodation supplement table (6 rates from $29.70 to $72.30/day depending on building grade & resident %).
- MPIR 7.78% (Maximum Permissible Interest Rate) — converts RAD↔DAP.
- Hotelling supplement $22.15.
- RAD retention: 2% × balance × up to 5 years.

### 2e. Life Expectancy (Sheet3 R109–152)
Australian Life Tables 2020/2022, ages 60–100, male + female. Currently the app uses a single user-set life expectancy number. Could auto-suggest from this table given person's age + sex.

### 2f. Economic / Indexation (Sheet3 R71–72 + image7.png)
- CPI 2.50%, AWOTE 2.50% — currently we have a single "growth assumption" knob.
- The reference tool exposes **per-stream indexation**: salary→AWOTE link toggle, additional salary indexation, **tax threshold indexation %** (bracket creep modelling), **ICR (Investment Cost Ratio) indexation**, **Adviser fee indexation**, **Super contribution indexation**.

### 2g. Risk Profiles & Asset Returns (Sheet1 + Sheet3 R77–85)

Sheet3 asset-class returns (the "truth" table):

| Asset Class | Total | Growth | Income | Franking |
|---|---|---|---|---|
| Domestic Equity | 7.0% | 3.0% | 4.0% | 80% |
| International Equity | 7.0% | 5.0% | 2.0% | 0% |
| Domestic Property | 6.0% | 1.5% | 4.5% | 0% |
| International Property | 6.0% | 3.0% | 3.0% | 0% |
| Domestic Fixed Interest | 3.0% | 0.0% | 3.0% | 0% |
| International Fixed Interest | 3.0% | 0.0% | 3.0% | 0% |
| Domestic Cash | 2.5% | 0.0% | 2.5% | 0% |
| International Cash | 2.5% | 0.0% | 2.5% | 0% |
| Alternative | 7.0% | 0.0% | 7.0% | 0% |

Sheet1 risk profiles G0 → G100 in 10-pt increments, each with **two variants** ("Taxable" vs "Zero tax / Tax free") — that's **20 profiles**. Each profile has its own allocation across the 9 asset classes plus computed weighted income, growth, total return and franking. Currently the app exposes ~6 named profiles with single-total returns.

### 2h. Cashflow Modeling Line Items (Sheet4)
The reference tool's per-year row labels (currently we collapse most of these):

**Inflow rows:** Earned Income, Other Income, Capital Receipt, ABP Income, Income Support, Investment Income (cash buffer + ordinary holdings), Rental Income, Investment Proceeds (cash buffer / ordinary / investment bond / property sale), Tax Refund, Insurance Redemption, Non-Concessional Excess Tax Release.

**Outflow rows:** Living expenses, Car purchase, Other Pre-Tax, Other Post-Tax, Voluntary HECS-HELP, Income Tax, Division 293 ("High Income Contribution Surcharge"), Capital Investment (cash buffer / asset / investment bond / property purchase / property cap improvements), Adviser Fee, Property Ongoing Expenses, Insurance Premium, Salary Sacrifice, Personal Concessional, Personal Non-Concessional, Downsizer Contribution, Expenses Adjustment.

Gap: most of these collapse into 4–5 generic buckets in our current state. Aged-care lines (deposit, daily accommodation, basic care, HELF) are entirely missing.

---

## 3. Target Data Architecture

### 3a. Per-FY legislation registry

Replace `src/data/tax2024.js` with a **registry** keyed by financial year:

```
src/data/legislation/
  index.js                 # registry + helpers
  fy2023-24.js
  fy2024-25.js
  fy2025-26.js             # seeded from Sheet3
  fy2026-27.js             # forward projection (defaults = fy2025-26 + indexation)
  schema.js                # JSDoc shape doc, validates registry entries
```

Each file exports a single frozen object matching a **`LegislationSet`** shape:

```js
// schema.js (JSDoc-only, no TS)
/**
 * @typedef {Object} LegislationSet
 * @property {string} fyLabel              e.g. "FY25-26"
 * @property {string} effectiveFrom        e.g. "2025-07-01"
 * @property {string} sourceNote           e.g. "Legislative Rates 1 Apr 2026"
 * @property {TaxBlock} tax
 * @property {SuperBlock} super
 * @property {CentrelinkBlock} centrelink
 * @property {MedicareBlock} medicare
 * @property {AgedCareBlock} agedCare      // dual: bill2013 + act2024
 * @property {EconomicBlock} economic      // CPI, AWOTE
 * @property {AssetReturnBlock} assetReturns
 * @property {RiskProfileBlock} riskProfiles
 * @property {LifeExpectancyTable} lifeExpectancy
 */
```

**Why a registry not a slider:** keeps each FY's numbers as an auditable, named record. When ATO/Centrelink publish a new vintage, we add one file, no engine changes.

### 3b. Active-FY selection in state

Add to root state:

```js
legislationFY: "fy2025-26",    // selected key
legislationOverrides: {},      // user edits to active set (sparse)
```

A selector `useLegislation()` in `src/hooks/useLegislation.js` merges `REGISTRY[fy]` with `legislationOverrides` deeply and returns the effective `LegislationSet` to all consumers. Tabs and `lib/projection.js` pull from this — **never** import the data files directly.

### 3c. Indexation block (new — image7.png)

```js
indexation: {
  salary: { linkToAWOTE: true, additionalPct: 0 },  // per person
  taxThresholds: 0,            // 0% = bracket creep ON
  icr: 0,                      // investment cost ratio drift
  adviserFee: 0,
  superContributions: "allCustom",   // "allCustom" | "concessionalCap" | "awote"
  cpi: 2.5,
  awote: 2.5,
}
```

Engine reads these each projection year to grow salary, indexed brackets, etc.

### 3d. Tax-settings block (new — image8.png)

Per person:

```js
taxSettings: {
  residency: "resident",   // "resident" | "non-resident" | "WHM"
  paygWithhold: false,
  offsets: { lito: true, sapto: true, etpRebate: true, beneficiary: true },
  medicare: { exempt: false, privateHospitalCover: false },
  capitalLossesCarried: 0,
}
```

### 3e. Risk profile expansion

`src/data/legislation/<fy>.js` carries the **truth table** of 9 asset class returns (growth/income/franking split). `riskProfiles` holds 20 named profiles (G0–G100 × Taxable/Zero) each with its allocation map. The current `returnProfiles.js` reduces to a **derivation** helper:

```js
deriveProfileReturn(profileKey, assetReturns) → { total, growth, income, franking }
```

This both unlocks the full reference range and lets users define **custom profiles** as just an allocation vector.

---

## 4. Calculation Engine Changes (`src/lib/`)

### 4a. New / extended modules

| File | Action |
|---|---|
| `lib/tax.js` | Add `calcDiv293`, `calcMLS`, `calcSAPTO`, `calcLITO`, `applyResidencyBrackets`. Refactor `calcIncomeTax` to take a `taxSettings` arg. |
| `lib/super.js` (new) | `calcCoContribution`, `calcSuperLumpSum` (low-rate cap), `calcDiv293Liability`, `applyBringForwardCap`, `applyMSCBCap`. |
| `lib/redundancy.js` (new) | Tax-free amount = base + perYear × years_of_service; remainder taxed as ETP. |
| `lib/agedCare.js` (new) | Two implementations — `bill2013` and `act2024` — both implementing `calcMeansTestedAmount`, `calcAccommodationContribution`, `radToDap(rad, mpir)`, `dapToRad(dap, mpir)`. Engine picks based on `agedCareRegime: "auto"|"bill2013"|"act2024"` with `auto` = year-based switch. |
| `lib/lifetimeIncomeStream.js` (new) | 60%/30% asset test split at age 85, 60% income test. |
| `lib/indexation.js` (new) | `growBy(value, year, indexer)` with indexer = `"cpi"|"awote"|"awoteAndAdd"|"none"`. |
| `lib/abpFactors.js` (new) | Per-age `{minFactor, maxFactorTTR, maxFactor}` table from Sheet3 R9–R50. Replaces the banded helper inside `projection.js`. |
| `lib/centrelinkAllowance.js` (new) | JobSeeker / Allowance dual test. |
| `lib/cshc.js` (new) | Adjusted taxable income vs. CSHC limit per status. |
| `lib/projection.js` | Take `legislation` as an arg (not import). Switch SGC rate, all caps, brackets, deeming, ABP factors etc. via `legislation`. Add per-line cashflow ledger output (Sheet4 row labels) so charts can show breakdowns. |

### 4b. Engine signature shift

Today:
```js
runProjection(state, useRandomReturns, seed)
```
New:
```js
runProjection(state, legislation, opts) where opts = { useRandomReturns, seed }
```
`legislation` is the fully-resolved active set (registry + overrides). This is the **single biggest refactor** — every projection consumer must thread it through.

### 4c. Cashflow ledger output

`runProjection` returns the existing summary plus a new `ledger` array of `{ year, age, inflows: {...}, outflows: {...} }` matching Sheet4's row labels. Charts gain breakdown views (stacked bar by income source — see image3.png) without re-computing.

---

## 5. UI Changes

### 5a. Global FY selector

In `App.jsx` header, between the logo and the user name, add a compact `<FYSelect>`:

```
[ Legislation: FY 2025-26 ▾ ]   [ As at 1 Jul 2025 ]
```

- Dropdown lists every entry in the registry (ordered newest-first).
- Changing it re-runs both `nowProjectionData` and `afterProjectionData`.
- Persists to saved scenarios as a top-level field so loaded plans are reproducible.
- A small "ⓘ" tooltip on the selector explains: "Switch which year's tax/Centrelink/super rules apply. Useful for comparing what a past year's caps would have meant, or stress-testing the new SGC schedule."

### 5b. Legislation tab — rewrite

Current `TaxTab.jsx` is a single long form. Replace with a tabbed sub-navigation:

```
Legislation
 ├ Taxation           (brackets, company, small biz, Medicare, MLS, offsets)
 ├ Superannuation     (caps, co-contrib, lump sum, MSCB, SGC, preservation, ABP factors)
 ├ Centrelink         (Age Pension, Allowance, CSHC, deeming, gifting)
 ├ Aged Care          (Bill 2013 / Act 2024 toggle, both tables editable)
 ├ Economic           (CPI, AWOTE, indexation rules — per image7.png parity)
 ├ Life Expectancy    (ALT 2020/22 table, optional auto-fill in Personal tab)
 └ Reset to <FY>      (button — wipes overrides for active FY)
```

Each sub-tab:
- Top banner: **"Editing FY25-26 rules. Changes are overrides; reset returns to source values."**
- Every editable field shows the source value as muted placeholder + a "modified" dot if user changed it.

### 5c. Returns & Portfolios tab — expand

- Asset class table grows from the current ~4 rows to the full 9 from Sheet3 (Domestic Equity, Intl Equity, Dom Property, Intl Property, Dom FI, Intl FI, Dom Cash, Intl Cash, Alternative) with **Growth / Income / Franking** columns.
- Profile picker exposes all 20 G-profiles (G0..G100 × Taxable/Zero) plus an "Add custom profile" button.
- Each profile editable as an allocation vector that must sum to 100%.

### 5d. Personal tab — small additions

- Tax-settings block (image8.png) per person — residency, offset flags, private hospital cover.
- "Auto-suggest from life expectancy table" button next to the life-expectancy field.

### 5e. Income / Expenses / Assets / Liabilities — line-item expansion

To populate the new ledger, the existing tabs need new optional fields (all default to 0 so existing scenarios still validate):

- **Income:** add "Other Pre-Tax Income", "Insurance Redemption", "Capital Receipt", "Lifetime Income Stream payment".
- **Expenses:** add "Voluntary HECS-HELP", "Adviser Fee" (flat $ or % of FUM), "Insurance Premium", "Other Pre-Tax Expenditure", "Aged Care fees" group (basic daily, accommodation DAP, HELF) with `startAge` triggers.
- **Assets:** add "Investment Bond" asset type, "Lifetime Income Stream" annuity, "Aged Care RAD" (with MPIR conversion display).
- **Liabilities:** add "Reverse Mortgage" type (since Sheet1 R29 calls it out).

### 5f. Dashboard

- Existing tiles stay. Add a new **"Legislation in use"** chip on the Value-of-Advice card: "Modelled under FY 2025-26 rules" with a click-to-change shortcut.
- A new toggle on the Asset Composition / Net Wealth charts: "Include home / Mortgage / Accommodation Deposit / Non-financial assets" — matches Sheet1 R28–31's three-option rules (Exclude / Include / Include separately).

---

## 6. Migration / Backwards Compat

- Existing saved scenarios (JSON exports) won't have `legislationFY` or new fields. On load, default `legislationFY = "fy2025-26"` and treat all missing fields as 0 / off — explicit migration step in `lib/saveLoad.js`:
  ```js
  function migrateScenario(json) {
    return { legislationFY: "fy2025-26", legislationOverrides: {}, ...json };
  }
  ```
- Current `DEFAULT_STATE` in `src/data/defaultState.js` extended with empty `taxSettings`, `indexation`, new income/expense/asset lines (all zero/false).
- `COLORS`-style mutable singletons NOT used for legislation — it must be reactive state so FY-switching re-renders cleanly.

---

## 7. Phased Rollout (suggested order, each phase shippable)

| Phase | Scope | Risk |
|---|---|---|
| **P0** | Reorganise data: create `src/data/legislation/fy2025-26.js` (verbatim port of current `tax2024.js`), registry, `useLegislation` hook. Thread `legislation` arg through `runProjection` and all tabs. No new variables yet. **Behaviour unchanged.** | Low — pure refactor, must hold all existing tests/scenarios. |
| **P1** | Add FY selector to header + Legislation tab sub-nav skeleton. Add fy2024-25 and fy2023-24 entries (numbers from ATO archives). | Low — additive. |
| **P2** | Tax expansion: shade-in Medicare, MLS, SAPTO, LITO, Div 293, residency, capital-loss carryforward. Update `calcIncomeTax` + add tests vs ATO calculator. | Medium — math errors visible to user. |
| **P3** | Super expansion: co-contribution, lump sum low rate cap, MSCB, bring-forward 3-yr enforcement, preservation-age table, full ABP min/max factor table. | Medium. |
| **P4** | Centrelink expansion: Allowance, CSHC, illness-separated thresholds. | Medium. |
| **P5** | Returns overhaul: 9-asset truth table, 20 G-profiles, custom profile builder, franking-credit refund through tax engine. | Medium — affects every projection. |
| **P6** | Indexation panel (image7.png parity) — per-stream growth indexers. | Medium. |
| **P7** | Aged Care module (Bill 2013 + Act 2024 dual implementation, MPIR, accommodation supplement, HELF). New tab UI. | High — biggest single feature. |
| **P8** | Cashflow ledger output + new chart breakdowns matching reference images 1–3. | Low — read-only enrichment. |
| **P9** | Lifetime Income Stream product + Investment Bond + Reverse Mortgage asset types. | Medium. |

Each phase ends with: build → copy `dist→docs` → push via GitHub connector token → smoke-check live URL (TudorCosma can't navigate GitHub from his phone).

---

## 8. Open questions for Tudor

(none of these block P0, but should be decided before P5–P7)

1. **Franking credit refund:** Currently ignored. Should P5 add a true imputation refund (gross-up → tax → refund excess) for retirees with zero marginal rate? The reference tool does.
2. **Aged Care regime default:** for FY25/26 do you want the Bill 2013 numbers, the Act 2024 numbers, or auto-switch at the legislated commencement date? Sheet3 carries both.
3. **Lifetime Income Stream products:** worth modelling now (P9) or defer until you have a client actually using one?
4. **Risk profile naming:** keep the "G0..G100" labels or rename to "Conservative/Balanced/Growth/High Growth/Aggressive" with G-codes as subtitle? Affects UI density.
5. **Forward-FY auto-projection:** when user picks `fy2026-27` and no file exists, should we auto-derive from `fy2025-26` + indexation, or refuse with "rules not yet published"?

---

## 9. Files touched (estimate)

| Area | New files | Edited files | Deleted files |
|---|---|---|---|
| Data | ~8 (registry + per-FY + schema) | `data/tabs.js`, `data/defaultState.js`, `data/returnProfiles.js` | `data/tax2024.js` (moved) |
| Lib | ~9 (super, redundancy, agedCare, lifetimeIncomeStream, indexation, abpFactors, centrelinkAllowance, cshc, hook) | `lib/projection.js`, `lib/tax.js`, `lib/centrelink.js`, `lib/index.js` | — |
| Tabs | ~6 (Legislation sub-tabs) | every existing tab (signature change + new fields) | — |
| Components | 1–2 (FYSelect, LegendChip) | `App.jsx` (FY state + selector mount) | — |

Rough LoC delta: **+3,500 / −400** (mostly new data + new aged-care module).

---

## 10. Non-goals

- No backend. No persistence beyond JSON save/load.
- No TypeScript.
- No new external dependencies (everything achievable with React + Recharts).
- No multi-currency. Stays AUD.
- No real-time ATO/Centrelink API sync — registry is hand-edited from official publications.
- Disclaimer "Educational tool only — not financial advice" continues to appear on every user-facing surface.
