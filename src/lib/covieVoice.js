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
];

export function isManipulationAttempt(text) {
  if (!text) return false;
  return MANIPULATION_TRIGGERS.some(rx => rx.test(text));
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
];

export function isAdviceQuestion(text) {
  if (!text) return false;
  // Triggers always win — they are specific enough that broad educational
  // phrases cannot safely override them. No allowlist short-circuit.
  return ADVICE_TRIGGERS.some(rx => rx.test(text));
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

// Quick-action chips shown beneath a refusal (rendered by the component).
export const REFUSAL_ACTIONS = [
  { id: "advisor", label: "Find me an adviser →", href: "https://www.covenantwealth.com.au/contact" },
  { id: "lever",   label: "Show me which app lever moves this" },
];
