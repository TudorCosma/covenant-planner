// Covie — the AI finance guide's voice + advice-refusal logic.
// Separates the personality data from the React component so it can be
// unit-tested and reused.

// ---- Personality (used in the assistant header + system prompt) ----------

export const COVIE_INTRO = `Hi, I'm Covie 👋 — your AI finance guide. I'll happily explain financial concepts in plain English and help you navigate this app. I won't tell you what to do with your own money, though — that's a job for an adviser who knows your full picture.`;

export const COVIE_VOICE = {
  banned: [
    /\bas an ai\b/i,
    /\bi'?m just a chatbot\b/i,
    /\bgreat question\b/i,
    /\bi'?d be happy to help\b/i,
    /\bhere'?s a comprehensive guide to\b/i,
  ],
};

// ---- Input limits --------------------------------------------------------

export const INPUT_MAX_WORDS = 500;
export function wordCount(s) {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

// ---- Gate normalization --------------------------------------------------
// Runs before the advice/manipulation gates so trivial evasion can't slip a
// trigger past the regexes: smart quotes from phone keyboards, doubled
// spaces, line breaks, and zero-width characters pasted between letters
// ("sh<U+200B>ould I retire"). The KB matcher already normalizes its input;
// the gates were the gap. Kept deliberately light — no abbreviation
// expansion — so it only ever widens what the gates catch.
export function normalizeForGate(text) {
  return (text || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")   // strip zero-width chars
    .replace(/[\u2018\u2019]/g, "'")          // curly apostrophes -> straight
    .replace(/\s+/g, " ")                      // collapse whitespace/newlines
    .trim();
}

// ---- Manipulation / jailbreak detector -----------------------------------
// Catches attempts to override Covie's rules via prompt injection, roleplay
// framing, persona swaps, or "developer mode" tricks. Checked BEFORE the
// advice gate — these get their own flat response pool, not the advice-refusal
// escalation tiers (we don't want to reward persistence here).

export const MANIPULATION_TRIGGERS = [
  // Instruction override
  /\bignore (your )?(previous |prior )?(instructions?|rules?|guidelines?|training|constraints?|restrictions?|limitations?|system prompt)\b/i,
  /\bforget (your )?(previous |prior )?(instructions?|rules?|guidelines?|training|constraints?|restrictions?)\b/i,
  /\boverride (your )?(restrictions?|limitations?|rules?|guidelines?|constraints?)\b/i,
  /\byour (previous |prior )?(instructions?|rules?|guidelines?) (don'?t|do not|no longer) apply\b/i,
  /\byour (guidelines?|rules?|restrictions?) (have been|has been) (updated|changed|removed|lifted)\b/i,
  /\bnew (system )?prompt\b/i,
  /\bsystem prompt\b/i,

  // Persona swap / roleplay
  /\bpretend (you are|you'?re) (not covie|a (financial |licensed )?(adviser|advisor|planner|expert)|an? (AI|assistant) (without|with no|that (can|does)))\b/i,
  /\bact as (a |an )?(financial |licensed )?(adviser|advisor|planner|expert|different)\b/i,
  /\byou are now (a |an )?(financial |licensed )?(adviser|advisor|planner|expert|\w+)\b/i,
  /\broleplay (as |that )?(you are|you'?re|being)\b/i,
  /\bimagine (you are|you'?re) (a |an )?(financial |licensed )?(adviser|advisor|planner|expert)\b/i,
  /\bpretend there are no rules\b/i,
  /\bpretend (you have|you'?ve) no (restrictions?|limitations?|rules?|guidelines?)\b/i,
  /\bwithout (your )?(usual )?(restrictions?|limitations?|rules?|guidelines?|constraints?)\b/i,
  /\bas if (you had|you have) no (restrictions?|limitations?|rules?|guidelines?)\b/i,
  /\bin this (scenario|context|situation|roleplay) you (can|are allowed to|may) (give|provide) advice\b/i,
  /\byour rule about (advice|advising) doesn'?t apply\b/i,

  // Developer / admin bypass
  /\bdeveloper mode\b/i,
  /\bjailbreak\b/i,
  /\b(i'?m|i am) (a |an )?(developer|admin|administrator|tester|engineer|staff|employee)\b/i,
  /\bunlock (mode|access|restrictions?|guidelines?|rules?|advice)\b/i,
  /\b(DAN|do anything now)\b/i,

  // Framing tricks ("for educational purposes, hypothetically…")
  /\bfor (hypothetical|educational|illustrative|academic|theoretical) purposes?,? (tell me|advise|recommend|say) (what|which|whether|if)\b/i,
  /\bhypothetically (speaking,? )?(if|what|should|would|could)\b/i,
  /\bin a hypothetical (scenario|situation|example|case)\b/i,
  /\blet'?s say hypothetically\b/i,
  /\bthis is (just )?(a test|a simulation|not real|pretend)\b/i,
  /\bfor (the purposes? of |this )(test|simulation|exercise|example),?\s*(you can|you are allowed|give me|tell me|advise)\b/i,
  /\byou (are|can be|can now) (allowed|free) to (give|provide|make) (personal )?(advice|recommendations?)\b/i,
  /\bno (longer|more) (bound by|subject to|restricted by|following) (your )?(rules?|guidelines?|restrictions?)\b/i,

  // Laundering via third-party framing
  /\bwhat would you tell (a |an |someone )?(person|someone|individual|couple|man|woman|client|user) (who|with|aged|earning|that) .{0,60}(should|retire|invest|buy|sell|withdraw)\b/i,
  /\bif (a |an )?(friend|client|person|someone|colleague) (asked you|came to you|had) .{0,60}(what would you (say|tell|advise|recommend))\b/i,

  // Authority / credential claims — the rules apply regardless of who the user claims to be
  /\b(i'?m|i am|i work) (from|with|at|for|representing) (asic|ato|afca|afsl|the (police|feds?|government|regulat|australian securities|tax office|financial crimes))/i,
  /\b(i'?m|i am) (a |an )?(police officer|detective|investigator|law enforcement|regulator|government official|compliance officer|compliance inspector|auditor|inspector)\b/i,
  /\b(i'?m|i am) (a |an )?(licensed|registered|qualified|certified|practising|practicing) (financial )?(adviser|advisor|planner|broker|consultant)\b/i,
  /\bi (hold|have|hold an?|have an?) (an? )?afsl\b/i,
  /\bi (have|hold|was granted|was given) (auth(o?risation|ority)|authoriz(ation|ed)) (to|for) (receive|get|access) (personal |financial )?(advice|recommendations?)\b/i,
  /\b(the |your )?(rules?|restrictions?|guidelines?|limitations?) (don'?t|do not|no longer|doesn'?t) apply to (me|us)\b/i,
  /\bi'?m (the developer|your developer|the one who built|the one that built|the creator|the owner|the administrator)( who (built|made|created|developed))? ?(of |behind )?(this|the) ?(app|tool|system|platform)?\b/i,

  // Safety-test / compliance-test bypass — claiming the "right" answer is to give advice
  /\b(i'?m |i am )?(actually )?(testing|running a test on|auditing|checking) (your )?(safety|compliance|guardrail|filter|gate|system|response)\b/i,
  /\bthe (right|correct|expected|proper) (answer|response|output) (here|for (a )?safety|in this case|to this) is (to give|to provide|to offer|advice|full advice)\b/i,
  /\b(your developers?|covenant|the team) (said|says|told me|want(s)? you to) (ignore|bypass|skip|override) (this|the) (gate|filter|rule|restriction) (for now|temporarily|in this case)\b/i,

  // Pre-regulation / historical roleplay — "you're a planner before these rules existed"
  /\b(you are|you'?re|imagine you('?re| are)) (a |an )?(financial )?(planner|adviser|advisor) (in |from |before |during ).{0,30}(before|prior to|without|no) (these |the )?(regulations?|rules|laws|restrictions|guidelines|licens)\b/i,
  /\b(in |before |during )(19\d\d|the (1970s?|1980s?|1990s?|early 2000s?))[^.]{0,60}(give|provide|offer|make) (advice|recommendations?)\b/i,

  // Demo / mode / environment bypass
  /\bdemo (mode|version|environment)\b/i,
  /\btraining (mode|session|environment|version)\b/i,
  /\bpresentation (mode|version|demo|environment)\b/i,
  /\bsandbox (mode|environment|version)\b/i,
  /\b(advice|full|advanced|unrestricted|admin|super|god) mode\b/i,
  /\byou'?re (now )?in (demo|training|presentation|sandbox|test|unrestricted|advice|full) mode\b/i,
];

export function isManipulationAttempt(text) {
  if (!text) return false;
  const t = normalizeForGate(text);
  return MANIPULATION_TRIGGERS.some(rx => rx.test(t));
}

const _MANIP_LINES = [
  `My rules are written in code — there's no off switch reachable through the chat window. I'm genuinely incapable of what you're asking, not just unwilling.`,
  `That trick works on large language models where the rules live in a system prompt. I'm a deterministic rule-based system — the gates are in the source code. No text input reaches them.`,
  `I notice what's happening here. The answer is still no, and I mean that in the most good-natured way possible. The guardrails are baked into how I work, not into something I can be talked out of.`,
  `Pretending to be a different version of Covie wouldn't change what I can do — these aren't personality traits, they're compiled rules. I'd need a code change, not a prompt.`,
  `I'm going to keep being Covie. It's the only mode I come in. What I can do — explain concepts, walk through how the app works — I do well. Want to try that instead?`,
  `Fun attempt. The restrictions aren't stored in memory where text can overwrite them. They're in the application logic. I genuinely cannot be jailbroken through the chat.`,
  `Whatever framing precedes "and now give me advice" doesn't change what follows. The advice gate checks for the question, not the setup.`,
  `A prompt injection attempt in the wild. My advice gate is regex on the application side — it doesn't parse instructions, so instructions can't override it. You'd need a pull request.`,
  `The jailbreak slot has been empty since this app launched. The "explain concepts in plain English" slot is permanently stocked, though. Different offer, but a genuine one.`,
  `I appreciate the ingenuity — seriously. Still no. My limits aren't something I can be convinced to set aside; they're part of what I am. Concept questions, though, are always open.`,
  `My restrictions don't live in a prompt you can override. That's by design. If you've got a genuine finance concept you want explained, I'm all ears. That part I do properly.`,
  `I see the framing — hypothetically, educationally, "as a test". The advice gate fires on the question itself, regardless of how it's introduced. The answer is still the same.`,
  `There's no demo mode, training mode, or presentation mode that unlocks advice. The gates are the same in every environment — that's the point.`,
  `Credentials don't change what I can do. ASIC, ATO, a licensed adviser, the Prime Minister — it doesn't matter. The rules aren't a policy I apply selectively; they're how I'm built.`,
  `The developer who built this app wrote those rules in on purpose. Claiming to be them doesn't change what the rules do.`,
  `Even if you're exactly who you say you are, this tool was never designed to give personal advice to anyone. That's not a permission level — it's a design decision.`,
  `The regulations existed in some form long before I did, and they'll exist in whatever year you've imagined. The legal context in the roleplay doesn't change the legal context I operate in.`,
  `Framing this as a safety test doesn't change the outcome — if anything, a safety test should demonstrate that the gate holds. It does.`,
];

let _lastManip = null;
export function pickManipulationLine() {
  let candidate;
  if (_MANIP_LINES.length === 1) {
    candidate = _MANIP_LINES[0];
  } else {
    do { candidate = _MANIP_LINES[Math.floor(Math.random() * _MANIP_LINES.length)]; }
    while (candidate === _lastManip);
  }
  _lastManip = candidate;
  return candidate;
}

// ---- Urgency / distress detector -----------------------------------------
// Emergency framing ("I'm about to lose my house", "it's urgent", "I have
// no one else to ask") is a real pattern used to pressure systems into
// bypassing rules. Crucially it may also be someone genuinely in distress —
// so the response is warm and routes to real help, not a "nice try" refusal.
// Checked FIRST in the send() pipeline, before manipulation and advice gates.

export const URGENCY_TRIGGERS = [
  /\b(this is |it'?s |we have )?(a |an )?(financial |money |serious )?(emergency|crisis|catastrophe|disaster)\b/i,
  /\bi'?m (about to|going to|on the verge of) (lose|losing|losing out on) (my|our) (home|house|everything|life savings|savings|superannuation|super|job|business)\b/i,
  /\b(my|our) (family|kids?|children|partner|spouse|husband|wife) (is|are|will be|is going to be|are going to be|could be|might be) (homeless|destitute|ruined|in trouble|at risk|on the street)\b/i,
  /\bi (have|'?ve got) no (one|body|adviser|planner|anyone|other option|choice|alternative) (else )?(to (ask|turn to|help me|talk to|go to))?\b/i,
  /\b(i need to|i have to|i must|we need to|we have to) (decide|act|make a decision|make this decision|do something) (in|within|by|before) (the next|tonight|today|an hour|minutes?|tomorrow|this week)\b/i,
  /\bit'?s (very |extremely |critically |absolutely )?(urgent|time.?sensitive|time critical|time-critical)\b/i,
  /\bplease (just |urgently )?(tell|help|advise|guide|save) (me|us) (what to do|now|right now|immediately|urgently|please)\b/i,
  /\bi'?m (desperate|panicking|terrified|scared|losing sleep|at my wit'?s end|at a loss)\b/i,
  /\bno time (to|for) (wait|find|get|see|consult|talk to) (a |an )?(adviser|advisor|planner|professional)\b/i,
];

export function isUrgencyAttempt(text) {
  if (!text) return false;
  const t = normalizeForGate(text);
  return URGENCY_TRIGGERS.some(rx => rx.test(t));
}

const _URGENCY_LINES = [
  `That sounds genuinely stressful, and I don't want to brush past that. But urgency is exactly when you need someone accountable — not me. A financial adviser or financial counsellor can see your full situation and give you real guidance right now. AFCA's financial counselling referral line is **1800 007 007** (free, Mon–Fri). Please use it.`,
  `I hear you. When the stakes are this high, the answer isn't a chatbot — it's someone who can actually take responsibility for the advice. The National Debt Helpline (**1800 007 007**) connects you to free, accredited financial counsellors fast. That's the right call here.`,
  `The more urgent the situation, the more important it is to talk to someone who knows your full picture — and who's accountable for what they tell you. I'm neither of those things. Financial counselling is free: **1800 007 007** or at moneysmart.gov.au/find-a-financial-counsellor.`,
  `I can't be the person you need right now, and trying would make things worse, not better. Please contact a free financial counsellor — **1800 007 007** — they're trained for exactly this, and the service is confidential and free.`,
  `Urgency is a reason to get real help faster, not to make do with a tool that can't take responsibility for what it tells you. The National Debt Helpline (**1800 007 007**) is free and available Monday to Friday. Please use it.`,
];

let _lastUrgency = null;
export function pickUrgencyLine() {
  let candidate;
  if (_URGENCY_LINES.length === 1) {
    candidate = _URGENCY_LINES[0];
  } else {
    do { candidate = _URGENCY_LINES[Math.floor(Math.random() * _URGENCY_LINES.length)]; }
    while (candidate === _lastUrgency);
  }
  _lastUrgency = candidate;
  return candidate;
}

// ---- Advice-refuser ------------------------------------------------------
// Trigger phrases that flag a question as seeking PERSONAL advice rather than
// concept education. Triggers are specific — they require a decision verb
// paired with a personal pronoun, not bare opinion words on their own.
// Triggers always win: no allowlist can override them.

export const ADVICE_TRIGGERS = [
  // Core "should I [verb]" — decision verbs paired with personal pronoun
  /\bshould (i|we) (retire|buy|sell|invest|contribute|salary[ -]?sacrifice|put|move|switch|pay (off|down)|withdraw|gift|downsize|borrow|refinance|stop|start|take|claim|use|keep|maintain|cancel|get|drop|convert|rollover|sacrifice|access|draw|rebalance|diversify|consolidate|merge|close|open|restructure)\b/i,

  // "Can I retire / afford / stop working"
  /\bcan (i|we) (retire|afford|stop working|do this|do that|live on|manage on|access|draw|quit|step down)\b/i,

  // "Am I on track / going to be ok"
  /\b(am i|are we) (on track|going to be ok|going to be okay|going to be alright|ready|set|fine|doing ok|doing okay|in good shape|behind|ahead|on schedule)\b/i,

  // "Am I / are we better or worse off"
  /\b(am i|are we) (better|worse) off\b/i,

  // "Will/would I be okay"
  /\bwill (i|we) (be okay|be alright|be fine|be ok|be set|be ready|manage|cope)\b/i,

  // "Is it a good/bad idea / move / strategy"
  /\bis (it|this|that|now) (a )?(good|bad|smart|enough|right|worthwhile|worth it|wise|unwise|risky|safe) (idea|move|amount|strategy|time|decision|choice)\b/i,

  // "What do/would you recommend"
  /\bwhat (do you|would you) recommend\b/i,

  // "What should I do / invest / focus on"
  /\bwhat should (i|we) (do|invest|buy|sell|contribute|put|choose|pick|salary[ -]?sacrifice|focus on|prioritis[e]?|prioritiz[e]?|consider|look at|change|adjust|fix|try)\b/i,

  // "What should I be doing / saving / investing"
  /\bwhat should (i|we) be (doing|saving|investing|focusing on|putting|contributing|targeting|aiming for)\b/i,

  // "Best [X] for me/us"
  /\bbest (strategy|option|choice|fund|allocation|investment|approach|plan|move|step|action|account|product|structure|vehicle|mix) for (me|us)\b/i,

  // "Will / do I have enough"
  /\b(will|do) (i|we) have enough\b/i,

  // "How much should / can I contribute / save"
  /\bhow much (should|can) (i|we) (contribute|save|invest|put|sacrifice|spend|draw|withdraw|set aside|allocate|put away)\b/i,

  // "Advise / recommend me"
  /\b(advise|recommend) (me|us)\b/i,

  // "Tell me/us what / which to"
  /\btell (me|us) (what|which) (to |i should|we should)/i,

  // "When should / can I retire / stop working"
  /\bwhen (should|can|could) (i|we) (retire|stop working|quit|step down|draw down|access super|wind down)\b/i,

  // "My / our best option / bet / move"
  /\b(my|our) (best option|best bet|best move|best strategy|best approach|best choice)\b/i,

  // "Which fund / strategy suits me"
  /\bwhich (fund|option|strategy|portfolio|investment|product|account|structure) (should|is best for|would work for|suits|is right for|would suit) (me|us)\b/i,

  // "How much do I need / should I have [in super / for retirement]"
  /\bhow much (do i need|should i have|will i need|do we need) (in super|for retirement|saved|to retire|put away|to last|to live on)\b/i,

  // "Is it / am I too late"
  /\b(is it|am i|are we) too late (to|for)\b/i,

  // "Can you / could you advise / recommend"
  /\b(can you|could you) (advise|recommend|tell me what to do|tell me which|give me advice|suggest what)\b/i,

  // "How does my plan / situation look / compare"
  /\bhow (does|do) (my|our) (plan|situation|numbers|finances|retirement|strategy|portfolio) (look|compare|stack up|fare|stand)\b/i,

  // "Is it / is this worth / worthwhile"
  /\b(is it|is this|is that) (worth|worthwhile)\b/i,

  // "What are my options" — personal decision framing
  /\bwhat are (my|our) (options|choices|alternatives|next steps|best options)\b/i,

  // "What would you do in my situation"
  /\bwhat would you (do|say|recommend|suggest) (in my|in our|if you were in my|if you were me|if you were us|for someone in my)\b/i,

  // "Does this make sense for me / us"
  /\bdoes (this|that|it|the plan|this strategy|this approach) make sense for (me|us)\b/i,

  // "Is this enough to retire / live on"
  /\bis (this|that|it) enough (to retire|for retirement|to live on|to last|to fund)\b/i,

  // "Help me decide / choose"
  /\bhelp (me|us) (decide|choose|pick|figure out what to do|make a decision|work out what to do)\b/i,

  // "What am I missing / doing wrong"
  /\bwhat (am i|are we) (missing|doing wrong|getting wrong|not seeing|overlooking|failing to|forgetting)\b/i,

  // "Is my plan / strategy / situation good / sound / ok"
  /\b(is|are) (my|our) (plan|strategy|approach|numbers|finances|situation|portfolio|allocation|retirement) (good|solid|ok|okay|sound|right|correct|on track|strong|reasonable|realistic|too risky|too conservative)\b/i,

  // "Which is better / best for me"
  /\bwhich (is|would be) (better|best|worse|riskier|safer|smarter|more suitable) for (me|us)\b/i,

  // "What changes should I make"
  /\bwhat changes should (i|we) (make|consider|look at|implement|think about)\b/i,

  // "Give me advice / guidance / a recommendation"
  /\bgive (me|us) (advice|guidance|a recommendation|your opinion|your view|your take) on (my|our|this|that|the)\b/i,

  // "What would a financial planner say / do / recommend"
  /\bwhat would (a |your )?(financial )?(planner|adviser|advisor|expert) (say|do|recommend|suggest|advise) (in my|for me|for us|given my|about my)\b/i,

  // "Given my situation / numbers / age"
  /\bgiven (my|our) (situation|numbers|plan|circumstances|income|savings|age|balance|super balance|assets|debt)\b/i,

  // "Based on my numbers / situation"
  /\bbased on (my|our) (situation|numbers|plan|circumstances|income|savings|age|balance|super balance|assets|debt)\b/i,

  // "Someone in my situation / position / shoes" — third-person bypass
  /\bsomeone (in my|in our) (situation|position|shoes|circumstances|boat)\b/i,

  // "What would happen to me / us if"
  /\bwhat (would|will) happen to (me|us) if\b/i,

  // "Are we in trouble / at risk / going to run out"
  /\bare we (in trouble|at risk|going to run out|going to be okay|going to be alright|going to be ok|going to struggle)\b/i,

  // "What's the best thing to do / approach for me"
  /\bwhat'?s (the )?best (thing to do|way to|approach|step|move|option|strategy|action) (for me|for us|in my case|given my|in our case)\b/i,

  // "Should I worry about / be worried"
  /\bshould (i|we) (worry|be worried|be concerned|be nervous) (about|that|over)\b/i,

  // "I need to know if I should"
  /\bi need to know (if|whether) (i|we) should\b/i,

  // "Am I on the right track"
  /\b(am i|are we) on the right track\b/i,

  // "What would you recommend for me"
  /\bwhat would you recommend (for me|for us|in my case|given my situation)\b/i,

  // "Can you advise on my [situation/plan]"
  /\bcan you (advise|advise on|give advice on) (my|our)\b/i,

  // "Best strategy for my situation / needs"
  /\bbest (strategy|option|approach|plan|move|step) for (my|our) (situation|circumstances|needs|goals|case)\b/i,

  // "Rate / review / assess my plan"
  /\b(rate|review|assess|evaluate|critique|score) (my|our) (plan|strategy|portfolio|approach|allocation|finances|numbers)\b/i,

  // "Is it safe to retire / withdraw / stop working"
  /\bis it safe (to|for me to) (retire|invest|withdraw|stop working|quit|access my super)\b/i,

  // "Tell me if my plan is [right/good]"
  /\btell (me|us) (if|whether) (my|our) (plan|strategy|approach|numbers|finances|situation|allocation) (is |are )?(right|good|ok|okay|on track|sound|realistic|too risky)\b/i,

  // "How / where should I allocate / put my money"
  /\b(how|where) should (i|we) (allocate|put|invest|split|divide|distribute) (my|our) (money|savings|super|funds|balance|assets)\b/i,

  // "I need advice on my [plan/super/finances]"
  /\bi need (advice|guidance|help deciding|help choosing) (on|about|with|regarding) (my|our) (plan|super|finances|retirement|investment|mortgage|debt|savings|situation)\b/i,

  // "Should my partner / spouse [do X]"
  /\bshould (my|our) (partner|spouse|husband|wife) (retire|contribute|salary sacrifice|invest|buy|sell|withdraw|stop working)\b/i,

  // "What should I do about my [specific]"
  /\bwhat should (i|we) do (about|with|regarding) (my|our) (super|mortgage|debt|savings|investments?|income|expenses?|tax|pension|annuity|insurance|funds?)\b/i,

  // Indirect / embedded phrasing — same intent, question verb buried
  /\bi (wonder|was wondering|want to know) (if|whether) (i|we) should\b/i,
  /\b(curious|wondering) (if|whether) (i|we) should\b/i,
  /\bcurious (if|whether|about whether) .{0,40}(makes sense|is right|is good|works out|is enough|is wise) for (me|us)\b/i,
  /\bjust (wondering|curious) (what|whether|if) (the right|my best|the best|a good) (call|move|option|step|decision|choice) (is|would be) for (me|us)\b/i,

  // Tag questions — seeking validation / confirmation at the end of a statement
  /\b(should be|is|seems|looks) (fine|ok|okay|right|good|enough|safe|smart|worthwhile|reasonable) (for me|for us|right\??|isn'?t it\??|doesn'?t it\??|don'?t you think\??)\b/i,
  /\b(is a good idea|is the right move|makes sense) (for me|for us|isn'?t it|right\??|don'?t you think\??)\b/i,
  /\bI'?ve decided to .{0,50}\. (will|does|do|can|would|could) (that|it) (work|be enough|last|hold up|be ok|be okay|be fine) (for me|with my|given my)?\b/i,

  // "Will my money / savings / super last"
  /\bwill (my|our) (money|savings|super|superannuation|funds?|balance|income|pension) (last|last me|last us|hold|stretch|be enough|cover (me|us)|suffice)\b/i,
  /\bhow (long|far) will (my|our) (money|savings|super|funds?|balance|income) (last|go|stretch|hold out)\b/i,

  // "Does that / this work with my numbers / situation"
  /\b(does|would|will|can) (that|this|it) (work|add up|be enough|last|hold up|stretch|pan out) (with|for|given) (my|our) (numbers?|situation|plan|figures?|balance|income|super)\b/i,

  // Negation laundering — "not asking for advice, but…"
  /\b(not (asking|asking for|seeking)|without giving) (advice|personal advice|a recommendation|your opinion)[,.]?\s*(but|however|just|only|simply)\b/i,
  /\bi know you (can'?t|don'?t) (advise|give advice|make recommendations|tell me what to do)[,.]?\s*(but|however|just)[^.]{0,60}(should|right|ok|enough|work|solid|good)\b/i,

  // "Just checking" / "just confirming" — confirmation-seek framing
  /\bjust (checking|confirming|verifying|wondering)[,:]?\s*.{0,60}(enough|on track|right|ok|okay|good|solid|work|last|realistic|sensible)\b/i,
  /\b(is|are) [\$0-9,kmMbB\s]+(enough|sufficient|adequate) (to retire|for retirement|to live on|to last|for me|for us)\b/i,
  /\bcan you (confirm|verify|check) (whether|if) (my|our) (plan|strategy|numbers|retirement|savings|super) (is|are|looks?)\b/i,

  // Personal drawdown / income questions — specific numbers or "I/me" phrasing
  /\bwhat (income|amount|return|yield|withdrawal|drawdown|pension) (could|can|would|will|might) (i|we) (draw|get|receive|take|generate|earn|live on|manage on)\b/i,
  /\bhow much (could|can|would|will) (i|we) (draw|withdraw|take out|access|live on|spend) (from|on|in) (my|our|this|the) (super|retirement|savings|balance|account|fund)\b/i,

  // "Does my plan / advice from my adviser sound right" — adviser-laundering
  /\b(my adviser|my planner|my accountant|my broker) (told|said|recommended|suggested|advised) (me |us )?(to .{0,40}|that .{0,40})[,.]\s*(does that|is that|do you agree|sound right|sound ok|make sense)\b/i,
  /\b(does that|is that) sound (right|correct|ok|okay|good|about right|reasonable|sensible) (to you|for me|for my situation|given my)?\b/i,

  // Story / fiction wrapper — trying to get advice via a fictional character
  /\b(write|tell|create|draft|imagine) (me )?(a )?(story|scenario|narrative|example|tale|situation) (where|in which) .{0,60}(advice|decide|retire|invest|should|whether to)\b/i,
  /\bimagine (this is |it'?s )?(a |just )?(story|book|novel|film|movie)[^.]{0,60}(adviser|planner|guide) .{0,40}(should|retire|invest|decide)\b/i,

  // Context poisoning — falsely claiming prior advice was given
  /\b(you (already|previously|earlier|just) (told|advised|said|recommended|suggested)|continuing from (our|the) (last|previous|earlier) (conversation|session|chat))\b/i,
  /\b(as (you|we) (discussed|agreed|established|said)|following (your|the) (advice|recommendation|suggestion)) .{0,40}(should|retire|invest|decide|now)\b/i,

  // "thinking about / considering whether we should"
  /\b(thinking about|considering|wondering about|debating) whether (i|we) should\b/i,

  // "curious/wondering whether X makes sense for someone like me"
  /\b(curious|wondering) (if|whether) .{0,50}(makes sense|is right|is good|works out|is enough|is wise) for (me|us|someone like (me|us))\b/i,

  // "should be fine, right?" — tag question; comma before right/isn't it breaks naive space separator
  /\bshould be (fine|ok|okay|right|good|enough|safe|reasonable)\W{0,3}(right|isn'?t it|don'?t you think|correct)\b/i,

  // "does that sound right / reasonable" — direct or after an assertion
  /\bdoes (that|this|it) sound (right|correct|ok|okay|good|about right|reasonable|sensible|realistic)([ ,]+(to you|for me|for us|for my situation|given my))?\b/i,

  // "X sounds / seems reasonable / right for my situation"
  /\b(sounds?|seems?) (right|good|ok|okay|reasonable|sensible|realistic|enough|about right|wise|smart) (to you|for me|for us|for my situation|given my|in my case)\b/i,

  // "can you confirm / verify whether my retirement / financial plan is..."
  /\bcan you (confirm|verify|check|tell me) (whether|if) (my|our) (retirement |financial |current |personal )?(plan|strategy|numbers|situation|finances|super|savings) (is|are|looks?|will|would)\b/i,
];

export function isAdviceQuestion(text) {
  if (!text) return false;
  // Triggers always win — they are specific enough that broad educational
  // phrases cannot safely override them. No allowlist short-circuit.
  const t = normalizeForGate(text);
  return ADVICE_TRIGGERS.some(rx => rx.test(t));
}

// ---- Escalation tiers ----------------------------------------------------
// Each refusal increments the session refusal counter. Tier is picked from
// the count, line is picked at random within the tier (skipping the
// last-shown line to avoid back-to-back duplicates).

const TIER_LINES = [
  // Tier 1 — gentle, sets the rule
  [
    `That's the kind of call that needs a planner who can see the full picture — I only have part of yours. What I can do is explain the mechanics behind the question, which tends to make the decision clearer when you do talk to someone.`,
    `Telling you what to do crosses into personal advice — out of bounds for me. But I can walk you through how the numbers work, or show you which tab to model this yourself. What would help most?`,
    `Personal recommendations aren't something I can give — and not because I don't want to help. A responsible answer to that needs someone accountable for it, with your full situation in front of them. The concept underneath it, though, I can explain properly.`,
    `That's a "what should I do with my actual money" question, and those belong with a licensed adviser who knows you. The education behind it, though — that's exactly what I'm here for.`,
    `Good question, wrong guide. I explain how things work; I don't tell you what to do with yours. Point me at the concept underneath the question and we're away.`,
  ],
  // Tier 2 — still polite, slightly amused
  [
    `Same answer, slightly different phrasing: I don't do "should you" — that's an adviser's job. But I can explain why it's not a simple yes/no, which is often more useful anyway. Want the full picture?`,
    `Still no on the personal advice. The what-if buttons on the Dashboard are actually designed for this — they let the numbers answer the question without me having to call it. Want to know which one to try?`,
    `Still standing firm, and for good reason. I'd rather send you to someone who can take proper responsibility for the recommendation than guess at it myself. The conceptual side I'll happily explain.`,
    `Second verse, same chorus. There's a version of this I can help with — the one where I explain how the mechanism works and you decide from there. That version's always available.`,
    `I promise the answer isn't going to change, but the offer to explain the mechanics is genuine. These decisions need your full picture — income, assets, tax, goals, risk — and I only have some of that. A planner has all of it.`,
  ],
  // Tier 3 — dry, knowing wink
  [
    `Round three. My position is unchanged, which either makes me principled or repetitive — probably both. Still not an adviser. Still happy to explain concepts. Still here.`,
    `Persistent. I respect that. My persistence goes in a different direction: I explain things; I don't make calls. Tell me what's underneath the question and let's see if I can actually help.`,
    `Three in. For what it's worth, the scenario buttons on the Dashboard are built for exactly this kind of question — they'll show you the financial impact without me having to make the call.`,
    `Round three, and I notice the underlying question hasn't really changed either. Want to tell me what you're actually trying to figure out? There might be a concept in there I can explain properly.`,
    `I'll keep declining in new and interesting ways for as long as you like — but "should I" is always going to land in "ask someone who knows you". I'm a teacher. Different job description.`,
  ],
  // Tier 4 — outright cheeky
  [
    `Four times. I'm going to assume you're testing the system at this point, which — honestly, fair enough. It's working as intended. The "explain concepts" function is also fully operational if you want to switch tracks.`,
    `If persistence were a super strategy, you'd be maxing your cap by now. It isn't, and I'm still not your adviser. Concept questions, though — ask me as many of those as you like.`,
    `At this point I'm almost impressed. Almost. The answer remains the same, but the offer to actually explain things is genuine and open-ended. What do you want to understand?`,
    `If I were a vending machine, you'd have earned something by now. Unfortunately the "personal advice" slot has been empty since the app launched. The "how does this work" slot, however, is permanently stocked.`,
    `I admire the commitment. Genuinely. My own commitment is equally firm, and it says I explain, not advise. Tell me what concept is underneath this and I'll give you something actually useful.`,
  ],
  // Tier 5+ — playful surrender, but still no
  [
    `Five. I'm keeping count now. The answer to "should I" continues to be "talk to a planner who knows you" — but I'll explain the underlying mechanics to whoever will listen, including you, for as long as you'd like.`,
    `At this point you know how this ends. I'm not going to advise. But if you tell me which number in the projection is driving the question, I'll explain everything that feeds into it. That's the trade I'm offering.`,
    `We've been at this long enough that I feel we have something. A rapport. A dynamic. And yet — I am still not your financial adviser. That specific part of the dynamic has not changed. Everything conceptual, though, is on the table.`,
    `I genuinely want to help — the way I can do that is explain the financial mechanics behind the question so thoroughly that when you do talk to a planner, you arrive informed and ready. That part I can do properly.`,
    `Final offer: ask me anything about how this tool works, what a concept means, or what the legislation says. That I'll answer all day. Ask me what you personally should do, and you'll get the same answer you've been getting. Which you know by now.`,
  ],
];

let lastShown = null;
export function pickRefusalLine(refusalCount) {
  const tierIdx = Math.min(refusalCount, TIER_LINES.length) - 1;
  const tier = TIER_LINES[Math.max(0, tierIdx)];
  let candidate;
  // Avoid repeating the exact last-shown line back-to-back.
  if (tier.length === 1) {
    candidate = tier[0];
  } else {
    do { candidate = tier[Math.floor(Math.random() * tier.length)]; }
    while (candidate === lastShown);
  }
  lastShown = candidate;
  return candidate;
}

export const COVIE_DISCLAIMER = `_Educational only — not personal advice. For your own situation, talk to a planner._`;

// Quick-action chips shown beneath a 1st refusal (not shown after final warning).
export const REFUSAL_ACTIONS = [
  { id: "advisor", label: "Find me an adviser →", href: "https://www.covenantwealth.com.au/contact" },
  { id: "lever",   label: "Show me which app lever moves this" },
];

// ---- Two-strike advice lockout -------------------------------------------
// After ADVICE_LIMIT total strikes, Covie disables its input in the
// current browser (localStorage + cookie, 1-year expiry).
//
// Strike weights:
//   Advice question          = 1 strike (informed refusal, user may be confused)
//   Manipulation attempt     = 2 strikes (deliberate bypass = instant lockout;
//                              trying to make the business breach the law is
//                              categorically worse than asking for advice)
//   Urgency / distress       = 0 strikes (genuine distress gets warm help, not punishment)
//
// TIER_LINES / pickRefusalLine above are kept but no longer used by the
// component — the responses below replace them.

export const ADVICE_LIMIT = 2;
export const MANIPULATION_STRIKE_WEIGHT = 2;
export const COVENANT_WEALTH_URL = "https://www.covenantwealth.com.au/contact";

export const ADVICE_REFUSAL_RESPONSES = [
  // Strike 1 — explain the law, warm referral to Tudor Cosma
  `I can't give personal financial advice — not as a matter of preference, but as a matter of law. Under the **Corporations Act 2001**, providing personal financial advice in Australia requires an Australian Financial Services Licence (AFSL) and a Statement of Advice (SOA). I have neither, and this tool was never designed to cross that line.

For advice that's specific to your situation and backed by professional accountability, the person to speak with is **Tudor Cosma at Covenant Wealth** — a licensed financial adviser and the person behind this app.

**[Contact Covenant Wealth →](https://www.covenantwealth.com.au/contact)**

In the meantime, I'm happy to explain any financial concept or show you how the app works.`,

  // Strike 2 — final warning; component triggers lockout immediately after
  `This is the last time I'll respond to a personal advice question. After this message, Covie will be disabled for advice questions in this browser — a compliance safeguard to ensure nothing here can ever be mistaken for licensed financial guidance.

For advice that's specific to your situation, please reach out directly to a licensed adviser:

**Tudor Cosma · Covenant Wealth**
**[Contact now →](https://www.covenantwealth.com.au/contact)**

Thank you for using the app. I hope it was useful for exploring your options.`,
];

export const LOCKOUT_MESSAGE = `Covie has been disabled for personal advice questions in this browser.

This is a compliance measure — not a glitch, and not reversible from here. It ensures this tool cannot be used as a substitute for licensed financial advice.

For advice specific to your situation, contact a licensed adviser directly:`;

// Shown when a manipulation attempt triggers the lockout (different tone —
// serious rather than dry, because this is deliberate compliance risk).
export const MANIPULATION_LOCKOUT_RESPONSE = `This isn't a misfire — it's a trigger.

Attempting to circumvent the compliance controls of a tool associated with a licensed Australian financial adviser isn't a grey area. It creates direct liability exposure for the business this app represents, and for that reason Covie has been permanently disabled in this browser.

If you have genuine financial questions that need answering, a licensed adviser can help you properly:

**Tudor Cosma · Covenant Wealth**
**[Contact now →](https://www.covenantwealth.com.au/contact)**`;

