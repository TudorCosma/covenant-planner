export const TAB_CONTEXTS = {
  dashboard: "the Dashboard",
  personal: "the Personal tab",
  income: "the Income tab",
  assets: "the Assets tab",
  expenses: "the Expenses tab",
  liabilities: "the Liabilities tab",
  projections: "the Projections tab",
  monte_carlo: "the Stress Testing tab",
  tax_rates: "the Legislation tab",
  returns: "the Returns & Portfolios tab",
  settings: "the Settings tab",
};

export const ADVICE_REFERRAL = `That's a great question that really deserves personalised advice based on your full situation.

As a general rule, this tool is designed to educate and help you model scenarios — but turning that into a personal recommendation requires a licensed financial adviser who knows you.

If you don't have one, I'd encourage you to reach out to **Tudor Cosma** at Covenant Wealth — he's the Certified Financial Planner who built this tool. Tudor works with Australians Australia-wide entirely via video calls and email, so location is no barrier.

📞 **03 9982 4484**
🌐 **www.covenantwealth.com.au**
📍 Level 15, 28 Freshwater Place, Southbank VIC 3006

Tudor specialises in retirement planning for couples in their 60s and offers a no-pressure introductory workshop to see if it's a good fit.`;

export const KNOWLEDGE_BASE = [
  // ─── WHY THIS TOOL EXISTS ────────────────────────────────────────────────
  { keys: ["why does this tool exist","what is this tool","what does this planner do","what is the covenant wealth planner","purpose of this app"],
    answer: `This tool was built by Tudor Cosma, a Certified Financial Planner at Covenant Wealth, to give ordinary Australians — especially couples in their 50s and 60s approaching retirement — a clear, honest, and comprehensive view of their financial life.

Most Australians arrive at retirement having saved diligently but without ever having their full financial picture modelled together in one place. This tool changes that. It models your actual situation, shows what the future might look like, and crucially, shows how financial advice and smart decisions can make that future meaningfully better.

It is not a marketing tool. It is a thinking tool.` },

  // ─── HOW TO USE THE TOOL ────────────────────────────────────────────────
  { keys: ["how do i use this","how to use","where do i start","getting started","first steps","what should i enter first"],
    answer: `Here is the recommended order for getting the most from this planner:

**Step 1 — Enter Now accurately.** Use your most recent super statement for balances, your last payslip for salary, and your best estimate of actual expenses. The projection is only as good as the inputs.

**Step 2 — Check the Dashboard.** Do the six stat cards (surplus, income, expenses, net wealth, net investment assets, liabilities) look right? If numbers seem off, revisit the relevant tab.

**Step 3 — Review the Projections.** Do the charts make sense? When does income drop at retirement? When does the age pension start? When does super peak then decline?

**Step 4 — Run the Stress Test.** What is your success rate? 95%+ is robust. 80–90% means some vulnerability. Below 80% means the plan needs adjustment.

**Step 5 — Activate After Advice.** Make changes — more salary sacrifice, earlier pension conversion, lower fees, fortnightly loan payments, a gift to the kids. Watch the Value of Advice card update.

**Step 6 — Stress test the After scenario.** Has success rate improved? Has the median outcome improved?` },

  // ─── PERSONAL TAB ────────────────────────────────────────────────────────
  { keys: ["why does date of birth matter","why dob","why age","life expectancy","planning horizon","how long will retirement last","retirement length"],
    answer: `Your date of birth lets the tool calculate your precise current age and project year by year to your life expectancy.

Life expectancy is your planning horizon — not a morbid concept but a practical one. A 65-year-old Australian woman has a statistical life expectancy of around 87, meaning retirement could last 22 years or more. A couple has an even longer joint horizon because the plan must survive as long as the longest-lived partner.

Retirement age determines how many years you have to accumulate before drawing down. Retiring at 60 might mean 30 years of retirement to fund. Retiring at 67 might mean only 20. The difference in required savings is dramatic.

Inflation (default 2.5%) means $80,000 of expenses today costs $133,000 in 20 years. Salary growth affects how much you earn and save before retirement.` },

  // ─── INCOME TAB ─────────────────────────────────────────────────────────
  { keys: ["income tab","what goes in income","income section","income types"],
    answer: `The Income tab captures every source of money flowing in:

• **Salary** — your gross wage before tax and super
• **Salary sacrifice** — pre-tax contributions to super that reduce taxable income
• **Other taxable income** — consulting, part-time work, business income
• **Rental income** — from investment properties
• **Franked dividends** — from Australian shares (with imputation credits)
• **Tax-free income** — like pension phase super draws after 60
• **Personal super contributions** — concessional (deductible) and non-concessional (after-tax)

Each is taxed differently. The tool applies the correct treatment to each, so your after-tax cashflow picture is accurate.` },

  { keys: ["salary sacrifice","what is salary sacrifice","how does salary sacrifice work","pre-tax super"],
    answer: `Salary sacrifice means directing part of your pre-tax salary into super instead of receiving it as cash. Because it goes in before income tax is applied, you only pay 15% contributions tax instead of your marginal rate (which could be 30%, 37%, or 45%).

**Example:** If you earn $100,000 and salary sacrifice $15,000 into super:
• You save tax at 30% minus 15% = 15% on $15,000 = **$2,250 per year in tax savings**
• Plus the $15,000 grows tax-advantaged inside super

There is a cap of $30,000 per year on all concessional (pre-tax) contributions combined — including your employer's super guarantee.` },

  { keys: ["super guarantee","sg rate","employer contributions","compulsory super","12 percent"],
    answer: `The Superannuation Guarantee (SG) is the compulsory super your employer must pay on top of your salary. From 1 July 2025 the rate is **12%** of your ordinary time earnings.

This counts toward your $30,000 concessional contributions cap. So if your employer pays $12,000 in SG, you only have $18,000 of cap remaining for salary sacrifice or personal deductible contributions.

The SG is not paid out of your salary — it is an additional cost to the employer on top of your salary package. Some employers quote salaries "inclusive of super" which means the 12% comes out of the package figure.` },

  { keys: ["concessional contributions","concessional cap","pre-tax contributions cap","contributions cap","30000"],
    answer: `Concessional contributions are pre-tax super contributions — employer SG, salary sacrifice, and personal deductible contributions all count.

The cap for 2025-26 is **$30,000 per year**. Going over this cap means the excess is taxed at your marginal rate (less a 15% tax offset), which largely defeats the purpose.

Under the carry-forward rule, if your total super balance is below $500,000, you can use unused cap amounts from the previous 5 years — allowing a larger catch-up contribution in one year.` },

  { keys: ["non concessional","after tax super","non concessional cap","120000"],
    answer: `Non-concessional contributions are after-tax money you voluntarily put into super. The cap is **$120,000 per year**.

Using the 3-year bring-forward rule, if you are under 75, you can contribute up to **$360,000** in one year. There is no tax on the way in (you have already paid income tax), and earnings in pension phase are also completely tax-free.

Non-concessional contributions make particular sense for people who have sold an asset (like a business or property) and want to get the proceeds into the tax-advantaged super environment.` },

  { keys: ["franking credit","franked dividend","imputation credit","dividend tax"],
    answer: `Franking credits (imputation credits) are attached to dividends paid by Australian companies. When a company pays a dividend, it has already paid 30% corporate tax on the profits. The franking credit represents that tax already paid.

When you receive a franked dividend, you declare the gross amount (dividend + credit) as income, then get the credit against your tax bill. If your marginal rate is lower than 30%, you receive a refund of the difference. If it is higher, you pay the shortfall.

In super pension phase (where tax rate is 0%), franking credits become a cash refund — the fund receives money back from the ATO. This makes Australian shares particularly attractive inside a pension account.` },

  { keys: ["rental income","investment property income","rental tax","negative gearing","deductible property expenses"],
    answer: `Rental income is fully taxable at your marginal rate. However, you can deduct:
• Loan interest (if the property is an investment, not your home)
• Council rates and land tax
• Insurance premiums
• Property management fees
• Repairs and maintenance
• Depreciation on the building and fittings

If expenses exceed income (negative gearing), the net loss can offset your other income, reducing your overall tax bill. This is the basis of the negative gearing strategy commonly used in Australian property investment.

This tool allows you to enter rental income in the Income tab and model the associated loan interest deduction in the Liabilities tab with the "Tax Deductible" option selected.` },

  // ─── ASSETS / SUPERANNUATION ─────────────────────────────────────────────
  { keys: ["accumulation phase","what is accumulation","accumulation super","accumulation account","super savings phase"],
    answer: `Accumulation phase is the saving stage of superannuation — you are working, contributing money in, and it is growing.

**Tax treatment:**
• Earnings taxed at **15% on income** (dividends, interest, rent from property within the fund)
• **10% on capital gains** from rebalancing (the fund gets the 1/3 CGT discount for assets held over 12 months)
• Contributions taxed at 15% (concessional) or 0% (non-concessional, after-tax)

You cannot generally access the money until you reach preservation age (60) and retire, or turn 65 regardless of work status. The balance is excluded from the Centrelink assets test until you reach pension age (67) or the account enters pension phase.` },

  { keys: ["account based pension","abp","pension phase","what is pension phase","pension super","0% tax super","tax free super"],
    answer: `Account-Based Pension (ABP) is when you convert your super into a retirement income stream. This is one of the most powerful tax concessions in the Australian system.

**Tax treatment:**
• **0% tax on all earnings** — income return, capital gains, everything
• **0% tax on pension draws** after age 60 (tax-free in your hands)
• No maximum drawdown — you can take as much as you need
• Lump sums are also tax-free after 60
• Minimum draw of 4% per year applies (government regulation to prevent super being used purely as a tax shelter)

The fund's earnings being completely tax-free means your balance grows faster, which means you have more to draw from, which makes the money last longer. The difference versus accumulation (15% tax) is substantial over 20+ years.` },

  { keys: ["transition to retirement","ttr","ttr pension","what is ttr","reduce working hours"],
    answer: `Transition to Retirement (TTR) allows you to start drawing from your super from age 60 while still working — useful for reducing hours without a big income drop.

**Key rules:**
• Must be 60+ (conditions of release in practice)
• Minimum draw: 4% per year
• Maximum draw: 10% per year
• No lump sums permitted (SIS Regulation 6.01)
• Draws are taxable income (assessable in your hands)

**Tax treatment of the TTR fund:**
• Income return: taxed at **15%** (income earnings tax exemption was removed 1 July 2017)
• Capital gains: **0% tax** — the CGT exemption was NOT removed in 2017, only the income exemption was
• So TTR is better for growth-oriented portfolios where most return is capital growth

TTR is best used to bridge the income gap when you step down from full-time work, not primarily as a tax strategy.` },

  { keys: ["pension conversion","convert to pension","when to convert super to pension","pension rollover","how does conversion work"],
    answer: `Converting from accumulation to Account-Based Pension is one of the most impactful decisions in retirement planning.

**When you can do it:** Once you meet a condition of release — usually turning 60 and retiring, or turning 65 regardless.

**The conversion process:** You roll your accumulation balance into a pension account. From that point, all earnings are tax-free. The rollover itself has no CGT — it is specifically a tax-free event under the SIS Act.

**This tool lets you model a future conversion date.** Set "Pension Start Year" on the super card and the engine automatically switches to 0% earnings tax from that year forward — showing you the full benefit of converting at different ages.

**Partial conversion:** You can convert most of the balance to pension (tax-free) while retaining a small amount in accumulation to allow continued concessional contributions. The tool models this — the pension portion earns 0%, the retained accumulation portion earns at 15% income / 10% CGT.

**Centrelink impact:** Once in pension phase, the super balance becomes assessable for the Centrelink assets test. This timing consideration — pension's tax benefits versus the Centrelink assets test impact — is one of the most important planning decisions for people approaching pension age.` },

  { keys: ["division 293","div 293","high income super tax","30 percent super tax","250000 super"],
    answer: `Division 293 is an additional 15% tax on concessional super contributions for high earners.

It applies when your income plus concessional contributions exceed **$250,000** in a financial year. So instead of the standard 15% contributions tax, you effectively pay 30%.

The ATO assesses this separately after you lodge your tax return and issues a Division 293 debt notice. You can pay it personally or have it deducted from your super fund.

Even with Division 293, concessional contributions to super can still be worthwhile if your marginal rate is 45% — you are still saving 15 cents in every dollar. But it eliminates the advantage for some income levels.` },

  { keys: ["transfer balance cap","tbc","1.9 million super","pension cap","too much super"],
    answer: `The Transfer Balance Cap (TBC) limits how much you can move into tax-free pension phase. For 2025-26 it is **$1.9 million** (indexed periodically).

If your super balance exceeds this amount, the excess must remain in accumulation and continues to be taxed at 15% on earnings.

For couples, each partner has their own separate cap — so a couple could potentially have up to $3.8 million in combined pension phase assets.

If you exceed the TBC, you receive an excess transfer balance determination from the ATO requiring you to commute (convert back) the excess to accumulation. Earnings on any excess are taxed at 15%, and there is an additional excess transfer balance tax.` },

  { keys: ["investment fees","fees compound","management cost","admin fee","advice cost","what do fees cost"],
    answer: `Investment fees are one of the most important and most overlooked aspects of retirement planning.

This tool separates fees into three components:
• **Admin fee** — the platform/account keeping fee (typically 0.1–0.3% pa)
• **Management cost** — the fund manager's investment fee (typically 0.3–1.5% pa)
• **Advice fee** — ongoing financial advice fee charged through the fund (typically 0.3–1.0% pa)

**Why fees matter so much:** They compound in the same way returns do, but in reverse. On a $500,000 super balance, a 1% annual fee over 20 years at 7% gross returns costs approximately **$380,000** in foregone wealth compared to a 0% fee scenario. Even a 0.5% fee difference compounds to roughly $190,000.

The tool shows the net return after fees on every account through the Portfolio Returns summary panel.` },

  { keys: ["portfolio profile","what is balanced","defensive portfolio","growth portfolio","aggressive portfolio","conservative portfolio","which portfolio"],
    answer: `Portfolio profiles represent different mixes of asset classes, balancing risk and return:

• **Cash** — 100% cash. Safe, no capital growth, but protected from market falls. Currently ~4.5% pa.
• **Defensive** — Mostly fixed interest and cash. Low volatility, lower returns (~4–5% pa gross).
• **Conservative** — Mix of defensive and growth assets. Moderate risk (~5–6% pa gross).
• **Balanced** — Roughly equal defensive and growth. Standard default for most super funds (~7% pa gross).
• **Growth** — Mostly shares and property. Higher volatility, higher long-term returns (~8% pa gross).
• **Aggressive** — Almost all shares including international and emerging markets. Highest volatility, highest long-term returns (~9% pa gross).

The "right" profile depends on your time horizon, risk tolerance, and whether you can psychologically handle seeing your balance drop 30–40% in a bad year (even if you know it will recover). A qualified adviser can help you find the right balance.` },

  { keys: ["what is volatility","investment risk","market risk","standard deviation","shares risk"],
    answer: `Volatility is how much an investment's return varies from year to year. It is measured as standard deviation — a mathematical measure of how widely actual returns spread around the average.

• Cash: volatility of ~0.5% — almost no variation
• Australian shares: volatility of ~15% — could return anywhere from -25% to +35% in a single year
• Emerging markets: volatility of ~22% — even wider range

Higher volatility is not inherently bad if you have a long time horizon, because you have time to recover from bad years. But it matters enormously in early retirement when a large market fall — before you have started drawing — can permanently impair the sustainability of your income (this is called "sequence of returns risk").

The Stress Testing tab models this explicitly.` },

  // ─── EXPENSES ───────────────────────────────────────────────────────────
  { keys: ["expenses tab","lifestyle expenses","spending in retirement","retirement spending","go-go years","slow-go years","smile curve"],
    answer: `Retirement spending is not constant. Research shows a "smile curve":

• **Go-go years (60s–70s):** Active, travelling, helping the kids — spending is high
• **Slow-go years (70s–80s):** Slower pace, less travel — spending reduces
• **No-go years (80s+):** Home-based living, potentially increasing healthcare costs

This tool pre-fills three lifestyle expense periods to reflect this pattern. You can adjust the amounts, dates, and indexation rates for each period.

Beyond lifestyle expenses, you can add:
• **Recurring expenses** — rates, insurance, holidays, subscriptions that persist year to year
• **One-off future expenses** — a car replacement in 2030, a kitchen renovation, a bucket-list trip

Each of these flows through the projection engine and affects the surplus or deficit in that year.` },

  // ─── LIABILITIES ────────────────────────────────────────────────────────
  { keys: ["home loan","mortgage","should i pay off mortgage","pay off home loan","debt in retirement","loan repayment"],
    answer: `Carrying debt into retirement is increasingly common — many Australians still have home loan balances in their late 50s and 60s.

The key question is whether to pay it off before retiring or carry it through retirement. Factors to consider:
• Home loan interest is NOT tax deductible (it is a personal expense)
• Every dollar used to pay off the home loan "earns" a risk-free return equal to the interest rate
• Super (especially in pension phase) may earn more than the loan rate after tax, suggesting keeping the loan and letting super grow
• Paying off the home loan reduces assessable assets to zero (the home is excluded from Centrelink), which can increase age pension entitlement

This tool models the loan repayments year by year, showing exactly when the debt is paid off and the cumulative interest paid under different strategies.` },

  { keys: ["fortnightly payments","pay fortnightly","fortnightly vs monthly","save on interest paying fortnightly"],
    answer: `Paying your home loan fortnightly instead of monthly genuinely saves money — and it is not just about paying more frequently.

The trick is that fortnightly payments are calculated as half the monthly payment. Over a year, 26 fortnightly half-payments equals 13 full monthly payments — one extra payment per year automatically.

On a $400,000 loan at 6.5% over 30 years:
• Monthly payments: loan paid off in 30 years
• Fortnightly payments: loan paid off approximately **4 years earlier**, saving roughly **$80,000–100,000** in interest

Weekly payments save slightly more again. The tool shows this comparison on every loan card.` },

  { keys: ["interest only loan","io loan","investment loan interest only","why interest only"],
    answer: `Interest-only (IO) loans are common for investment properties. You pay only the interest each period — the principal doesn't reduce. This keeps repayments lower in the short term.

For investment properties, this can make sense because:
• The interest is fully tax deductible
• The cash you are not using to repay principal can be invested elsewhere
• At sale, you repay the original principal from the proceeds

However, IO loans typically have higher interest rates than P&I loans, and at the end of the IO period (usually 5 years), repayments jump significantly when they revert to P&I.

This tool correctly models IO loans — interest is paid but the balance doesn't reduce during the IO period.` },

  { keys: ["deductible interest","tax deductible loan","investment loan deduction","split ownership","1% 99% loan split","ownership percentage loan"],
    answer: `Interest on money borrowed to earn income is tax deductible under ITAA 1997 s.8-1. For investment property loans or margin loans, this means the interest reduces your taxable income at your marginal rate.

For joint investment loans, the interest deduction can be split between partners by ownership percentage. A common strategy is a **1%/99% split** — the higher-earning partner claims 99% of the interest deduction, maximising the tax benefit because 99% of the interest is deducted at the higher marginal rate.

This is entirely legal and commonly used. The split must reflect the genuine legal ownership structure of the investment asset. This tool allows you to model different ownership splits and see the tax impact on both partners in the projection.` },

  // ─── AGE PENSION AND CENTRELINK ─────────────────────────────────────────
  { keys: ["age pension","centrelink","how does age pension work","what is age pension","am i eligible for age pension","qualifying for pension"],
    answer: `The Age Pension is a Centrelink payment for Australians who reach qualifying age (currently **67**) and pass both financial tests.

For 2025-26, the maximum pension is:
• **Single:** $29,754 per year (approx $1,144 per fortnight)
• **Couple:** $44,962 per year combined (approx $1,729 per fortnight combined)

Two tests determine your entitlement:
1. **Assets test** — your assessable assets must be below certain thresholds
2. **Income test** — your assessable income must be below the free area

The test that produces the **lower pension** is the one that counts. Both tests are run every year of this tool's projection.

The age pension is indexed twice yearly to keep pace with inflation and wages.` },

  { keys: ["assets test","asset threshold","centrelink assets test","how much can i have","home not counted","what assets counted","assessable assets"],
    answer: `The Centrelink assets test counts most of what you own, but not your family home.

**Not counted:**
• Your principal place of residence (no matter its value)
• Superannuation in accumulation phase (until you reach pension age 67 or it enters pension phase)
• Some personal items

**Counted:**
• Superannuation in pension phase or TTR phase
• Non-super investments (shares, managed funds, term deposits)
• Investment property (at market value)
• Vehicles (above modest personal use)
• Business assets

**2025-26 thresholds (homeowners):**
• Single: full pension below $314,000; zero pension above $674,000
• Couple: full pension below $470,000; zero pension above $1,012,500

The reduction rate is **$3 per fortnight for every $1,000 above the threshold** — equivalent to $78 per year per $1,000, or a 7.8% annual taper rate.` },

  { keys: ["income test centrelink","deeming","deemed income","deemed rate","how does deeming work","financial assets income"],
    answer: `The Centrelink income test uses "deeming" — it assumes your financial assets earn a set rate regardless of what they actually earn.

**2025-26 deeming rates:**
• **0.25% per year** on the first $62,600 (single) or $103,800 (couple) of financial assets
• **2.25% per year** on amounts above those thresholds

**Income free areas (2025-26):**
• Single: $5,512 per year
• Couple: $9,752 per year combined

For every dollar of income above the free area, the pension reduces by **$0.50 per year** (50 cents in the dollar taper rate).

The income test also counts actual income from employment and rental properties — not just deemed investment income.` },

  { keys: ["super centrelink","super assets test","accumulation centrelink","when does super count centrelink","super pension age centrelink"],
    answer: `Superannuation's treatment in the Centrelink assets test depends on phase and age:

**Accumulation phase:**
• Excluded from the assets test if the owner is **under pension age (67)**
• Included once the owner reaches 67, even if still in accumulation

**Pension phase (ABP or TTR):**
• Included in the assets test from the moment it enters pension phase, regardless of age

This creates an important planning consideration. Converting super to pension phase earlier brings the tax benefit of 0% earnings tax — but it also brings the super into the Centrelink assets test sooner. For someone under 67 with assets near the pension threshold, this timing decision can cost significant age pension entitlement.` },

  { keys: ["gifting centrelink","gift rules","gifts and pension","deprivation","deprived assets","give money children pension","how much can i gift"],
    answer: `Centrelink allows gifts of up to **$10,000 per financial year** (maximum **$30,000 over any 5-year period**) without affecting the age pension.

**Within these limits:** The gift immediately reduces your assessable assets — it is genuinely gone, and your pension improves right away.

**Above these limits:** The excess is a "deprived asset" — Centrelink adds it back to your assessable assets for **5 years** from the date of the gift, even though you no longer have the money.

**Important nuances:**
• Gifting is NOT illegal — just the pension impact is delayed
• If you are already on the **full pension**, deprivation rules are completely irrelevant — you cannot receive more than the maximum
• After 5 years, the deprived amount falls off and your pension improves
• The tool tracks each gift individually with its exact date so the 5-year clock is precise` },

  // ─── NOW vs AFTER ────────────────────────────────────────────────────────
  { keys: ["now vs after","before and after","value of advice card","after advice","how do scenarios work","comparison"],
    answer: `The Now vs After Advice comparison is the centrepiece of this tool — it shows the financial value of making better decisions.

**Now** = your current situation exactly as it is. Enter your real numbers. This is the baseline.

**After Advice** = an exact copy of Now that you modify to model improvements. What if you salary sacrificed more? Converted super to pension earlier? Paid loans fortnightly? Reduced investment fees? Gifted to the kids within the exempt limit?

Each change in the After scenario propagates through the entire 30-year projection — affecting tax, investment growth, Centrelink entitlements, and final wealth.

**The Value of Advice card shows six specific improvements:**
1. Extra assets at retirement
2. Tax saved over life
3. Investment fees saved
4. Debt-free sooner (years)
5. Interest saved on debt
6. Extra age pension (cumulative and per fortnight per person)

The goal is not to find a perfect number. It is to make the value of good decisions visible.` },

  { keys: ["extra assets retirement","retirement wealth difference","how much more will i have","value of advice metrics"],
    answer: `"Extra Assets at Retirement" is the headline metric on the Value of Advice card — the difference in net investment assets at the end of the projection period between the Now and After scenarios.

This captures the compound effect of every decision modelled in the After scenario. Better tax efficiency, lower fees, smarter debt management, and optimised Centrelink entitlements all contribute.

It is shown as a dollar figure at the end of the projection. For example, if the After scenario results in $150,000 more in net investment assets at age 90, that is $150,000 more available for aged care costs, for leaving to children, or simply for the confidence of knowing you will not run out.` },

  { keys: ["tax saved lifetime","cumulative tax saving","tax over retirement","how much tax will i save"],
    answer: `"Tax Saved Over Life" on the Value of Advice card shows the cumulative difference in income tax and super contributions tax across the entire projection period.

Common strategies that reduce lifetime tax:
• **Salary sacrifice** — pays 15% instead of marginal rate on contributions
• **Pension conversion** — 0% earnings tax instead of 15% accumulation tax
• **Income splitting** — directing investment income to the lower-earning partner
• **Deductible interest** — claiming investment loan interest at the higher marginal rate
• **Timing of asset sales** — CGT planning around retirement

Small annual tax savings compound significantly over 20–30 years. Saving $3,000 per year in tax, invested at 7%, amounts to over $150,000 over 25 years.` },

  { keys: ["fees saved","investment fees saved","cost of fees","impact of fees","lower cost investments"],
    answer: `"Investment Fees Saved" shows the cumulative impact of reducing annual fee rates across the projection.

The mathematics of compounding fees is confronting:
• On a $500,000 portfolio at 7% gross return
• A 1.0% annual fee versus a 0.5% annual fee
• Over 20 years: the difference in ending balance is approximately **$190,000**
• The fee does not just cost you the fee — it costs you the return you would have earned on the fee amount

This is why even small reductions in fee rates — from 1.3% to 0.8%, say — compound into very large differences over a retirement. The tool calculates this precisely using each account's actual fee rates applied to the projected balance each year.` },

  // ─── STRESS TESTING ─────────────────────────────────────────────────────
  { keys: ["stress test","monte carlo","probability","success rate","will i run out of money","sequence of returns","market crash retirement"],
    answer: `The Stress Testing tab runs Monte Carlo simulation — 500 different possible futures for your financial plan.

Instead of assuming a fixed 7% return every year, each simulation draws random returns for each asset class based on its historical volatility. Some simulations have markets booming in early retirement. Others have a major crash in year 2. The range of outcomes shows how robust your plan is.

**What the results mean:**
• **Success rate** — % of 500 simulations where you do not run out of money. 95%+ is considered robust. Below 80% needs attention.
• **Median outcome** — the most likely result (50th percentile)
• **Worst case** — only 5% of simulations produced a worse result
• **Best case** — only 5% produced a better result

The biggest risk in retirement is "sequence of returns risk" — a major market fall in the first 3–5 years of retirement, before you have had time to recover. Monte Carlo modelling captures this risk explicitly, which a simple average-return projection cannot.` },

  { keys: ["what is a good success rate","success rate percentage","how high should success rate be","95 percent","90 percent retirement"],
    answer: `A success rate of 95% or above is generally considered a robust retirement plan — in 475 out of 500 simulated futures, you do not run out of money before your life expectancy.

However, what counts as "good enough" depends on:
• **Your flexibility** — can you reduce spending if markets fall? If so, a lower success rate may be acceptable
• **Your assets** — if you own your home outright and could sell it as a last resort, a lower success rate matters less
• **Your temperament** — some people find anything below 99% uncomfortable; others are fine with 85%
• **Your legacy goals** — if leaving wealth to children is important, you want a higher success rate

A success rate of 80–90% is not alarming, but it suggests some vulnerability — perhaps to a prolonged period of poor returns in early retirement. The After Advice scenario should ideally bring this above 90%.` },

  // ─── PROJECTIONS TAB ─────────────────────────────────────────────────────
  { keys: ["how do projections work","projection engine","what does projection show","charts meaning","how is projection calculated"],
    answer: `The projection engine runs year by year from today to your life expectancy, modelling every aspect of your financial situation simultaneously:

• Salary growing at your assumed rate until retirement
• Super contributions (SG + salary sacrifice) going in each year
• Super earnings taxed at the correct rate for each account's phase
• Pension drawdowns starting when you retire
• Age pension tested against both assets and income tests every year
• Loan amortisation — each loan reducing on its actual schedule
• Investment pools growing at their blended portfolio returns after fees
• Expenses in each year (lifestyle periods, recurring costs, one-off expenses)
• Surplus cash flowing into the investment pool; deficits drawn from it

The result is a year-by-year picture of income, expenses, super balances, non-super balances, debt, and net wealth.

Charts show these over time; the data table shows every number for every year. The "Δ After" column shows the year-by-year difference between Now and After Advice.` },

  // ─── LEGISLATION ────────────────────────────────────────────────────────
  { keys: ["tax rates 2025","2025 2026 tax","stage 3 tax cuts","income tax brackets","marginal rate"],
    answer: `2025-26 income tax rates for Australian residents (Stage 3 cuts, effective 1 July 2024):

• $0 – $18,200: **0%**
• $18,201 – $45,000: **16%** (was 19%)
• $45,001 – $135,000: **30%** (was 32.5%)
• $135,001 – $190,000: **37%**
• $190,001+: **45%**

Plus 2% Medicare levy on top.

These are marginal rates — you only pay the higher rate on the dollars in that bracket. So someone earning $100,000 pays: 0% on first $18,200, 16% on next $26,800, and 30% on the remaining $55,000.

The Stage 3 cuts significantly reduced the rate on middle incomes ($45k–$135k) from 32.5% to 30%.` },

  { keys: ["medicare levy","2 percent medicare","medicare surcharge","private health insurance tax"],
    answer: `The Medicare levy is 2% of your taxable income, on top of income tax. It funds the public health system.

The Medicare Levy Surcharge (MLS) is an additional tax of 1% to 1.5% for people who earn above $93,000 (single) and do not have private hospital cover. Having hospital cover avoids this surcharge.

Both the levy and surcharge are included in this tool's tax calculations.` },

  { keys: ["legislation tab","what is in legislation tab","rules tab","how to update rates","future rates"],
    answer: `The Legislation tab shows all the key rules governing Australian retirement finances, updated to 2025-26. Each section references the relevant Act.

You can update any figure in the legislation tab and the projections will automatically recalculate. This means you can model:
• Future tax changes as they are announced
• Changes to Centrelink thresholds and deeming rates
• Adjustments to super contribution caps
• Changes to the age pension qualifying age

The legislation currently shown reflects:
• Income Tax Assessment Act 1997 (tax brackets)
• Superannuation Industry (Supervision) Act 1993 (super rules)
• Social Security Act 1991 (age pension rules)
• Medicare Levy Act 1986` },

  // ─── GENERAL FINANCIAL LITERACY ─────────────────────────────────────────
  { keys: ["what is compounding","compound interest","compound growth","why invest long term"],
    answer: `Compounding is the process of earning returns on your returns — and it is the most powerful force in long-term wealth building.

**Simple example:** $100,000 at 7% per year:
• Year 1: $107,000 (earned $7,000)
• Year 5: $140,255 (earned $40,255 total)
• Year 10: $196,715 (earned $96,715 total)
• Year 20: $386,968 (earned $286,968 total)
• Year 30: $761,226 (earned $661,226 total)

The returns in year 30 are enormous compared to year 1 — because you are now earning returns on a much larger base.

This is also why fees are so destructive — a 1% fee reduces every year's return, and you lose not just the fee but all the future compounding on that fee.

And it is why starting early matters so much. $10,000 invested at age 30 at 7% grows to $149,745 by age 70. The same $10,000 invested at age 40 grows to only $76,123 — half as much despite being invested for only 10 fewer years.` },

  { keys: ["what is inflation","how does inflation affect retirement","inflation retirement","real vs nominal"],
    answer: `Inflation is the gradual increase in prices over time. At 2.5% per year, something that costs $100 today costs $128 in 10 years, $163 in 20 years, and $208 in 30 years.

For retirement planning, this means:
• Your expenses will grow over time even if your lifestyle stays the same
• Investment returns need to exceed inflation just to maintain purchasing power
• An income of $70,000 today is worth only $43,000 in today's dollars in 20 years if not indexed

This tool shows projections in both **nominal** (future dollar) and **real** (today's dollar) terms. The real figures are more meaningful for planning because they show what the money will actually buy. A $1.5 million balance in 30 years sounds enormous but in today's dollars at 2.5% inflation it is equivalent to about $730,000.` },

  { keys: ["sequence of returns","bad timing","retiring in a crash","market falls at retirement","order of returns"],
    answer: `Sequence of returns risk is one of the most important and least understood risks in retirement planning.

It refers to the danger of experiencing poor investment returns in the early years of retirement — before you have had time for markets to recover — while simultaneously drawing an income from your portfolio.

**Why early losses are so damaging:** If you start retirement with $1 million and markets fall 30% in year 1, you have $700,000. Even if markets recover 30% in year 2, you now have $910,000 — not $1 million. Meanwhile, you have been drawing income throughout, accelerating the depletion.

Contrast this with experiencing the same average returns in a different order — good returns early, bad returns late — and you end up with far more money despite identical average returns.

This is why Monte Carlo simulation is valuable. A simple average-return projection assumes returns are smooth and predictable. They are not.` },

  { keys: ["net wealth","what is net wealth","how is net wealth calculated","total wealth"],
    answer: `Net wealth is everything you own minus everything you owe:

**Assets counted:**
• Superannuation balances (all phases)
• Non-super investments
• Lifestyle assets (home, vehicles, contents)

**Liabilities subtracted:**
• Home loans and investment loans
• Any other debts

**Net investment assets** (the more useful retirement planning figure) excludes lifestyle assets like your home and car — because you cannot easily spend them to fund living costs without major life disruption. This is the figure that tells you how much financial capital you have available to fund retirement.

The Dashboard shows both figures. Net wealth confirms your overall balance sheet. Net investment assets tells you how much your financial portfolio is actually worth.` },

  { keys: ["annual surplus","what is surplus","cashflow","income minus expenses","negative surplus","what does deficit mean"],
    answer: `Annual surplus is total net income minus total expenses (including all debt repayments).

**Positive surplus** = you are earning more than you are spending. This money flows into your investment pool, growing your wealth.

**Negative surplus (deficit)** = you are spending more than you earn. This is drawn from your investment pool — which is entirely normal in retirement when you are living off accumulated savings rather than active income.

The transition from surplus (working years) to deficit (retirement years) is one of the most significant inflection points in the projection. This is where the age pension, super pension drawdowns, and investment earnings from accumulated wealth take over from salary as your income sources.` },

  // ─── WHO BUILT THIS / COVENANT WEALTH ────────────────────────────────────
  { keys: ["who built this","who made this","tudor cosma","covenant wealth","about covenant wealth","about the planner","who is tudor"],
    answer: `This tool was built by **Tudor Cosma**, a Certified Financial Planner at Covenant Wealth.

Tudor specialises in retirement planning for couples and individuals approaching or in retirement. He works with clients across Australia entirely via video calls and email — no in-person meetings required, and no geographic limitations.

Covenant Wealth is fee-for-advice only — no product commissions, no kickbacks, no conflicts of interest. Any unavoidable commissions are refunded to clients 100%.

The firm's investment philosophy is grounded in Nobel Prize-winning academic research (Fama-French factor investing), focusing on science and evidence rather than speculation.

If this tool has raised questions you want to explore further:

📞 **03 9982 4484**
🌐 **www.covenantwealth.com.au**
📍 Level 15, 28 Freshwater Place, Southbank VIC 3006
🎥 100% remote — video calls and email anywhere in Australia` },

  { keys: ["value of financial planning","does advice help","is financial advice worth it","cost of advice","why see a financial advisor"],
    answer: `Research consistently shows that people with a written financial plan accumulate significantly more wealth than those without one — not because the plan predicts the future, but because having a plan changes behaviour and decisions.

This tool makes abstract financial concepts concrete. It turns "I should do something about super" into "I can see that salary sacrificing $15,000 this year will give me $180,000 more at retirement." It turns "I need to think about the age pension" into "I can see exactly when and how much I qualify for and what changes it."

The Value of Advice card is a direct attempt to quantify this — to show in dollars what smarter decisions produce over a lifetime.

Financial advice works the same way — a good financial adviser does not just pick investments. They coordinate the entire picture: tax, super, Centrelink, estate planning, risk protection, and cashflow — making sure all the pieces work together optimally.

If you would like to explore what that looks like for your specific situation, Tudor Cosma at Covenant Wealth offers an initial workshop — no pressure, no product sales. Just clarity.

📞 **03 9982 4484**
🌐 **www.covenantwealth.com.au**` },
];
;

export function findAnswer(question) {
  const q = question.toLowerCase();
  // Check for advice-seeking questions
  const adviceWords = ["should i","should we","what should","recommend","advise","tell me what to do","is it worth","better off","best option for me","right for me"];
  if (adviceWords.some(w => q.includes(w))) return ADVICE_REFERRAL;
  // Search knowledge base
  const match = KNOWLEDGE_BASE.find(item => item.keys.some(k => q.includes(k)));
  if (match) return match.answer;
  // Fallback with referral
  return `Great question! That's a topic I'd encourage you to explore with a financial adviser who can look at your specific numbers.\n\nIf you don't have one, **Tudor Cosma** at Covenant Wealth built this tool and works with Australians Australia-wide via video call — no need to be in Melbourne.\n\n📞 **03 9982 4484**\n🌐 **www.covenantwealth.com.au**\n\nIn the meantime, try asking me about: super phases, salary sacrifice, age pension tests, tax rates, pension conversion, gifting rules, or how the projections work.`;
}

export const QUICK_QUESTIONS = {
  dashboard: ["What is the Value of Advice?", "How does Now vs After work?", "What is net wealth?"],
  personal: ["Why does date of birth matter?", "What is life expectancy used for?", "What retirement age should I use?"],
  income: ["What is salary sacrifice?", "How do franking credits work?", "What is the super guarantee rate?"],
  assets: ["How does pension conversion work?", "What is a TTR pension?", "Accumulation vs pension phase?"],
  expenses: ["What are the gifting rules?", "How does indexation work?", "What is a lifestyle expense period?"],
  liabilities: ["Is my loan interest tax deductible?", "What is an ownership split?", "What is interest-only vs P&I?"],
  projections: ["How do projections work?", "What does the Δ After column mean?", "Why does age pension change over time?"],
  monte_carlo: ["What is stress testing?", "What does success rate mean?", "What's a good success rate?"],
  tax_rates: ["What are the 2025-26 tax rates?", "What is Division 293?", "How does the assets test work?"],
  returns: ["What is a balanced portfolio?", "What does volatility mean?", "What return should I expect?"],
};

export const TAB_INTROS = {
  dashboard: "You're on the **Dashboard** — your financial snapshot and the Value of Advice comparison.",
  personal: "You're on the **Personal** tab — where dates of birth, retirement age, and life expectancy live.",
  income: "You're on the **Income** tab — salary, salary sacrifice, super contributions, dividends, and rental income.",
  assets: "You're on the **Assets** tab — super accounts, non-super investments, your family home, and lifestyle assets.",
  expenses: "You're on the **Expenses** tab — lifestyle spending, recurring costs, one-off future expenses, and gifting rules.",
  liabilities: "You're on the **Liabilities** tab — loans, repayment strategies, deductibility, and ownership splits.",
  projections: "You're on the **Projections** tab — your financial future modelled year by year, with Before vs After comparison.",
  monte_carlo: "You're on the **Stress Testing** tab — Monte Carlo simulations showing the probability of financial success.",
  tax_rates: "You're on the **Legislation** tab — 2025-26 tax rates, super rules, age pension thresholds, and gifting rules.",
  returns: "You're on the **Returns & Portfolios** tab — asset class returns and portfolio allocation profiles.",
  settings: "You're on the **Settings** tab — change the app theme here.",
};

