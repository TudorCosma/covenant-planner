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

// ---- Advice-refuser ------------------------------------------------------
// Trigger phrases that flag a question as seeking PERSONAL advice rather than
// concept education. Triggers are specific — they require a decision verb
// paired with a personal pronoun, not bare opinion words on their own.
// Triggers always win: no allowlist can override them.

export const ADVICE_TRIGGERS = [
  /\bshould (i|we) (retire|buy|sell|invest|contribute|salary[ -]?sacrifice|put|move|switch|pay (off|down)|withdraw|gift|downsize|borrow|refinance|stop|start|take|claim|use|keep|maintain|cancel|get|drop|convert|rollover)\b/i,
  /\bcan (i|we) (retire|afford|stop working|do this|do that|live on|manage on)\b/i,
  /\b(am i|are we) (on track|going to be ok|ready|set|fine|doing ok|in good shape)\b/i,
  /\bis (it|this|that|now) (a )?(good|bad|smart|enough|right|worthwhile|worth it) (idea|move|amount|strategy|time|decision)\b/i,
  /\bwhat (do you|would you) recommend\b/i,
  /\bwhat should (i|we) (do|invest|buy|sell|contribute|put|choose|pick|salary[ -]?sacrifice|focus on|prioritis[e]?|prioritiz[e]?)\b/i,
  /\bbest (strategy|option|choice|fund|allocation|investment|approach|plan) for (me|us)\b/i,
  /\bwill (i|we) have enough\b/i,
  /\bdo (i|we) have enough\b/i,
  /\bhow much (should|can) (i|we) (contribute|save|invest|put|sacrifice|spend|draw|withdraw)\b/i,
  /\b(advise|recommend) (me|us)\b/i,
  /\btell (me|us) (what|which) (to |i should|we should)/i,
  /\bwhen (should|can) (i|we) (retire|stop working|quit|step down|draw down)\b/i,
  /\b(my|our) (best option|best bet|best move|best strategy)\b/i,
  /\bwhich (fund|option|strategy|portfolio|investment) (should|is best for|would work for|suits) (me|us)\b/i,
  /\bhow much (do i need|should i have) (in super|for retirement|saved|to retire|put away)\b/i,
  /\b(is it|am i) too late (to|for)\b/i,
  /\b(can you|could you) (advise|recommend|tell me what to do|tell me which)\b/i,
  /\bhow (does|do) (my|our) (plan|situation|numbers) (look|compare|stack up)\b/i,
  /\b(is it|is this) (worth|worthwhile)\b/i,
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
