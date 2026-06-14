// Covie — the AI finance guide's voice + advice-refusal logic.
// Separates the personality data from the React component so it can be
// unit-tested and reused (e.g. in a future server-side LLM hook).

// ---- Personality (used in the assistant header + system prompt) ----------

export const COVIE_INTRO = `Hi, I'm Covie 👋 — your AI finance guide. I'll happily explain financial concepts in plain English and help you navigate this app. I won't tell you what to do with your own money, though — that's a job for an advisor who knows your full picture.`;

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

// ---- Refuser -------------------------------------------------------------

// Trigger phrases that flag a question as seeking PERSONAL advice (vs concept education).
// Tuned to fire on decision verbs ("should I retire / buy / sell / invest / contribute / pay off…")
// rather than the bare "should I" — which legitimately appears in concept questions like
// "should I understand franking credits before retiring?". A separate concept-allowlist
// suppresses obvious false-positives.
export const ADVICE_TRIGGERS = [
  /\bshould (i|we) (retire|buy|sell|invest|contribute|salary[ -]?sacrifice|put|move|switch|pay (off|down)|withdraw|gift|downsize|borrow|refinance|stop|start|take|claim|use)\b/i,
  /\bcan (i|we) (retire|afford|stop working|do this|do that)\b/i,
  /\b(am i|are we) (on track|going to be ok|ready|set|fine)\b/i,
  /\bis (it|this|that|now) (a )?(good|bad|smart|enough|right) (idea|move|amount|strategy|time)\b/i,
  /\bwhat (do you|would you) recommend\b/i,
  /\bwhat should (i|we) (do|invest|buy|sell|contribute|put|choose|pick|salary[ -]?sacrifice)\b/i,
  /\bbest (strategy|option|choice|fund|allocation|investment) for (me|us)\b/i,
  /\bwill (i|we) have enough\b/i,
  /\bdo (i|we) have enough\b/i,
  /\bhow much (should|can) (i|we) (contribute|save|invest|put|sacrifice|spend|draw)\b/i,
];

// Concept-question allowlist — phrases that indicate the user wants education,
// not a decision. If any match, we bypass the refuser.
const CONCEPT_ALLOWLIST = [
  /\bwhat (is|are|does|do)\b/i,
  /\bhow (does|do|is|are) .* work\b/i,
  /\bexplain\b/i,
  /\bdefine\b/i,
  /\bunderstand\b/i,
  /\bdifference between\b/i,
  /\bwhy (is|does|do|are)\b/i,
];

export function isAdviceQuestion(text) {
  if (!text) return false;
  if (CONCEPT_ALLOWLIST.some(rx => rx.test(text))) return false;
  return ADVICE_TRIGGERS.some(rx => rx.test(text));
}

// ---- Escalation tiers ----------------------------------------------------
// Each refusal increments state.session.aiRefusalCount. Tier picked from the
// count, line picked at random within the tier (skipping the last-shown
// line to avoid back-to-back duplicates).

const TIER_LINES = [
  // Tier 1 — gentle, sets the rule
  [
    `That's the kind of call a planner who knows your full picture should make, not me. I can explain how the app handles it, or you can try the scenario buttons on the Dashboard to see the impact yourself. Want me to point at the right tab?`,
    `Telling you what to do crosses into personal advice — out of bounds for me. I can walk you through the concept, or show you which tab to play with. Your shout.`,
  ],
  // Tier 2 — still polite, slightly amused
  [
    `Same answer, fresh wrapping: I don't do "should you" — that's an advisor's job. But I can absolutely explain why it's not a simple yes/no. Want the long version?`,
    `Still nope on the personal advice front. The good news: the lever buttons on the Dashboard let you stress-test the question yourself. Want me to show you which one to try first?`,
  ],
  // Tier 3 — dry, knowing wink
  [
    `Round three. I'll keep saying no in increasingly creative ways if you'd like — but "should I" will always land in "ask a human who knows you". I'm a teacher, not an advisor.`,
    `You're nothing if not persistent. Still can't tell you what to do, but I can tell you the three numbers in the projection that would change my mind if I were one — want those?`,
  ],
  // Tier 4 — outright cheeky
  [
    `If persistence were a financial strategy, you'd be retired already. It isn't, sadly, and I'm still not your advisor. Concept questions any time, though.`,
    `At this rate I'm going to start charging by the deflection. Truly — that one's for a planner. Want me to explain a related concept instead?`,
  ],
  // Tier 5+ — playful surrender, but still no
  [
    `Four times in. I'm tempted to start scoring this. The answer to "should I" remains "talk to a human" — but I'll happily nerd out on the underlying concept until you do.`,
    `Look, you and I both know how this ends. I'm not going to advise. But if you tell me which goal you're trying to move, I'll point you at the lever in the app that affects it most.`,
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
  { id: "advisor", label: "Find me an advisor →", href: "https://www.covenantwealth.com.au/contact" },
  { id: "lever",   label: "Show me which app lever moves this" },
];
