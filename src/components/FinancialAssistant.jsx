import { useState, useEffect, useRef } from "react";
import { COLORS } from "../data/themes";
import { TAB_CONTEXTS, findEducationalAnswer, QUICK_QUESTIONS, TAB_INTROS } from "../data/knowledgeBase";
import {
  COVIE_INTRO, COVIE_DISCLAIMER, INPUT_MAX_WORDS, wordCount,
  isAdviceQuestion, REFUSAL_ACTIONS, ADVICE_LIMIT, ADVICE_REFUSAL_RESPONSES,
  LOCKOUT_MESSAGE, COVENANT_WEALTH_URL,
  isManipulationAttempt, pickManipulationLine, MANIPULATION_STRIKE_WEIGHT,
  MANIPULATION_LOCKOUT_RESPONSE, MANIPULATION_LOCKOUT_FOOTER,
  isUrgencyAttempt, pickUrgencyLine,
} from "../lib/covieVoice";

// Covie — the AI finance guide. Plain-English education + how-to-use-the-app.
//
// Advice gate: two-strike system. After ADVICE_LIMIT (2) advice questions
// the input is permanently disabled in this browser via localStorage + cookie.
// Strike 1 explains the law and refers to Tudor Cosma at Covenant Wealth.
// Strike 2 is the final warning; lockout triggers immediately after.
//
// Manipulation gate: catches jailbreak / persona-swap / authority-claim
// attempts with a flat response pool. Does NOT count toward the advice limit.
//
// Urgency gate: catches distress / emergency framing; warm response with
// NDH helpline and Covenant Wealth referral. Does NOT count toward advice limit.

// ---- Lockout helpers -------------------------------------------------------

function readLocked() {
  try {
    if (localStorage.getItem("covie_locked") === "1") return true;
    if (document.cookie.split(";").some(c => c.trim() === "covie_locked=1")) return true;
  } catch {}
  return false;
}

function readLockoutReason() {
  try { return localStorage.getItem("covie_lockout_reason") || "advice"; }
  catch { return "advice"; }
}

function writeLocked(reason) {
  try {
    localStorage.setItem("covie_locked", "1");
    localStorage.setItem("covie_lockout_reason", reason);
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    document.cookie = `covie_locked=1; expires=${d.toUTCString()}; path=/; SameSite=Strict`;
  } catch {}
}

function readRefusalCount() {
  try { return parseInt(localStorage.getItem("covie_refusals") || "0", 10); }
  catch { return 0; }
}

function writeRefusalCount(n) {
  try { localStorage.setItem("covie_refusals", String(n)); } catch {}
}

// ---------------------------------------------------------------------------

export function FinancialAssistant({ tab }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [refusalCount, setRefusalCount] = useState(readRefusalCount);
  const [locked, setLocked] = useState(readLocked);
  const [lockoutReason, setLockoutReason] = useState(readLockoutReason);
  const messagesEndRef = useRef(null);

  const triggerLockout = (reason) => {
    writeLocked(reason);
    setLocked(true);
    setLockoutReason(reason);
  };

  // Persist refusal count to localStorage whenever it changes.
  useEffect(() => { writeRefusalCount(refusalCount); }, [refusalCount]);

  // Tab-context note appended (not a wipe) when the user navigates tabs.
  const prevTabRef = useRef(tab);
  useEffect(() => {
    if (tab !== prevTabRef.current) {
      prevTabRef.current = tab;
      if (open) {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: `_— ${TAB_CONTEXTS[tab] || "new section"} —_\n\n${TAB_INTROS[tab] || ""}\n\nAsk me anything about how this section works.`, kind: "tab-context" },
        ]);
      }
    }
  }, [tab, open]);

  // Initial intro when panel first opens.
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: `${COVIE_INTRO}\n\n${TAB_INTROS[tab] || ""}` }]);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const wc = wordCount(input);
  const overLimit = wc > INPUT_MAX_WORDS;

  const send = (userText) => {
    if (locked) return;
    if (!userText?.trim()) return;
    if (wordCount(userText) > INPUT_MAX_WORDS) return;
    setInput("");

    // Urgency / distress gate — warm response + real-help referral, no strike.
    if (isUrgencyAttempt(userText)) {
      setMessages(prev => [...prev,
        { role: "user", content: userText },
        { role: "assistant", content: pickUrgencyLine(), kind: "urgency" },
      ]);
      return;
    }

    // Manipulation / jailbreak gate — 2 strikes on the unified counter (instant lockout).
    // Deliberate bypass attempts carry more compliance risk than advice questions,
    // so they hit the limit faster: any single manipulation attempt locks the input.
    if (isManipulationAttempt(userText)) {
      const newCount = refusalCount + MANIPULATION_STRIKE_WEIGHT;
      setRefusalCount(newCount);
      const isFinal = newCount >= ADVICE_LIMIT;
      setMessages(prev => [...prev,
        { role: "user", content: userText },
        { role: "assistant", content: isFinal ? MANIPULATION_LOCKOUT_RESPONSE : pickManipulationLine(), kind: isFinal ? "final-manipulation" : "manipulation" },
      ]);
      if (isFinal) triggerLockout("manipulation");
      return;
    }

    // Advice gate — two strikes then lockout.
    if (isAdviceQuestion(userText)) {
      const newCount = refusalCount + 1;
      setRefusalCount(newCount);
      const isFinal = newCount >= ADVICE_LIMIT;
      const response = ADVICE_REFUSAL_RESPONSES[Math.min(newCount - 1, ADVICE_REFUSAL_RESPONSES.length - 1)];
      setMessages(prev => [...prev,
        { role: "user", content: userText },
        { role: "assistant", content: response, kind: isFinal ? "final-refusal" : "refusal" },
      ]);
      if (isFinal) triggerLockout("advice");
      return;
    }

    // Educational answer — KB lookup with fallback, disclaimer appended.
    const answer = findEducationalAnswer(userText);
    setMessages(prev => [...prev,
      { role: "user", content: userText },
      { role: "assistant", content: `${answer}\n\n${COVIE_DISCLAIMER}` },
    ]);
  };

  // Renders plain text with **bold**, _italic_, and [link](url) support.
  const renderText = (text) => {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g).map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("_") && part.endsWith("_"))
          return <em key={j} style={{ color: COLORS.textDim, fontSize: 10 }}>{part.slice(1, -1)}</em>;
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link)
          return <a key={j} href={link[2]} target="_blank" rel="noreferrer" style={{ color: COLORS.accent, fontWeight: 600 }}>{link[1]}</a>;
        return part;
      });
      return <span key={i}>{parts}{i < text.split("\n").length - 1 && <br />}</span>;
    });
  };

  const questions = QUICK_QUESTIONS[tab] || ["How does this section work?", "What goes in this tab?"];

  return (
    <>
      {/* Floating bubble */}
      <div style={{ position: "fixed", bottom: 20, right: 18, zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <button
          onClick={() => setOpen(o => !o)}
          title={locked ? "Covie is disabled — contact Covenant Wealth for advice" : "Ask Covie — your AI finance guide"}
          style={{
            width: 54, height: 54, borderRadius: "50%",
            background: locked ? COLORS.textDim : open ? COLORS.textDim : COLORS.accent,
            border: "none", cursor: "pointer", boxShadow: "0 6px 18px rgba(0,0,0,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s", color: "#fff",
          }}
        >
          {open ? (
            <span style={{ fontSize: 18, fontWeight: 600 }}>✕</span>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 5.5C4 4.12 5.12 3 6.5 3h11C18.88 3 20 4.12 20 5.5v8c0 1.38-1.12 2.5-2.5 2.5H10l-4 3.5V16H6.5C5.12 16 4 14.88 4 13.5v-8z" fill="#fff"/>
              <circle cx="9" cy="9.5" r="1.2" fill={locked ? COLORS.textDim : COLORS.accent}/>
              <circle cx="12.5" cy="9.5" r="1.2" fill={locked ? COLORS.textDim : COLORS.accent}/>
              <circle cx="16" cy="9.5" r="1.2" fill={locked ? COLORS.textDim : COLORS.accent}/>
              <path d="M19 2l.6 1.4L21 4l-1.4.6L19 6l-.6-1.4L17 4l1.4-.6L19 2z" fill="#ffd566"/>
            </svg>
          )}
        </button>
        {!open && (
          <div style={{
            background: COLORS.card, color: locked ? COLORS.textDim : COLORS.text,
            padding: "2px 8px", borderRadius: 10,
            fontSize: 10, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            border: `1px solid ${COLORS.border}`,
            pointerEvents: "none",
          }}>{locked ? "Disabled" : "Ask Covie"}</div>
        )}
      </div>

      {open && (
        <div style={{
          position: "fixed", bottom: 76, right: 12, left: 12, zIndex: 999,
          maxWidth: 460, margin: "0 auto",
          background: COLORS.card, borderRadius: 14,
          boxShadow: "0 8px 36px rgba(0,0,0,0.22)",
          border: `1px solid ${locked ? COLORS.textDim : COLORS.border}`,
          display: "flex", flexDirection: "column", height: "70vh", maxHeight: 580,
        }}>
          {/* Header */}
          <div style={{ background: locked ? COLORS.textDim : COLORS.accent, borderRadius: "14px 14px 0 0", padding: "11px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>C</div>
            <div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Covie</div>
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}>
                {locked ? "Disabled for advice questions · contact an adviser" : "Your AI finance guide · education only"}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "90%", padding: "9px 12px",
                  borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: m.role === "user" ? COLORS.accent
                    : m.kind === "urgency"            ? "#fff8e6"
                    : m.kind === "final-manipulation" ? "#fdf0f0"
                    : m.kind === "manipulation"       ? "#7a340010"
                    : m.kind === "final-refusal"      ? "#fdf0f0"
                    : m.kind === "refusal"            ? `${COLORS.accent}15`
                    : m.kind === "tab-context"        ? `${COLORS.border}60`
                    : COLORS.infoBg || "#ece8e1",
                  color: m.role === "user" ? "#fff" : COLORS.text,
                  fontSize: 12, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6,
                  border: m.kind === "urgency"            ? `1px solid #d4a017`
                        : m.kind === "final-manipulation" ? `1px solid #c0524a`
                        : m.kind === "manipulation"       ? `1px dashed #c07a2a60`
                        : m.kind === "final-refusal"      ? `1px solid #c0524a60`
                        : m.kind === "refusal"            ? `1px dashed ${COLORS.accent}50`
                        : "none",
                }}>
                  {renderText(m.content)}
                </div>
                {/* Action chips on 1st advice refusal only — not on final or manipulation messages */}
                {m.kind === "refusal" && !locked && (
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {REFUSAL_ACTIONS.map(a => (
                      a.href ? (
                        <a key={a.id} href={a.href} target="_blank" rel="noreferrer" style={{ padding: "5px 10px", borderRadius: 12, border: `1px solid ${COLORS.accent}`, color: COLORS.accent, fontSize: 10, fontWeight: 600, textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>{a.label}</a>
                      ) : (
                        <button key={a.id} onClick={() => send("What inputs in this app move my goal progress?")} style={{ padding: "5px 10px", borderRadius: 12, border: `1px solid ${COLORS.accent}`, background: "transparent", color: COLORS.accent, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{a.label}</button>
                      )
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick-question chips — hidden once locked or when conversation is underway */}
          {!locked && messages.length <= 2 && (
            <div style={{ padding: "0 12px 8px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {questions.map((q, i) => (
                <button key={i} onClick={() => send(q)} style={{
                  padding: "5px 10px", borderRadius: 20,
                  border: `1px solid ${COLORS.accent}50`,
                  background: `${COLORS.accent}10`, color: COLORS.accent,
                  fontSize: 10, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", fontWeight: 600,
                }}>{q}</button>
              ))}
            </div>
          )}

          {/* Footer — lockout notice or normal input */}
          {locked ? (
            <div style={{ padding: "14px 16px", borderTop: `1px solid ${COLORS.border}`, background: "#fdf0f0" }}>
              <div style={{ fontSize: 11, color: COLORS.text, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, marginBottom: lockoutReason === "advice" ? 12 : 0 }}>
                {renderText(lockoutReason === "manipulation" ? MANIPULATION_LOCKOUT_FOOTER : LOCKOUT_MESSAGE)}
              </div>
              {lockoutReason === "advice" && (
                <a
                  href={COVENANT_WEALTH_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "block", textAlign: "center",
                    padding: "11px 14px", background: COLORS.accent, color: "#fff",
                    borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none",
                    fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.01em",
                  }}
                >
                  Contact Tudor Cosma · Covenant Wealth →
                </a>
              )}
            </div>
          ) : (
            <div style={{ padding: "8px 12px 12px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!overLimit) send(input); } }}
                  placeholder="Ask Covie about a concept or how this app works…"
                  rows={1}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 18,
                    border: `1px solid ${overLimit ? "#c0524a" : COLORS.inputBorder}`, background: COLORS.inputBg,
                    color: COLORS.text, fontSize: 16, fontFamily: "'DM Sans', sans-serif", outline: "none",
                    resize: "none", lineHeight: 1.5, minHeight: 36, maxHeight: 110,
                  }}
                />
                {wc > 0 && (
                  <div style={{
                    position: "absolute", right: 8, bottom: -14, fontSize: 9,
                    color: overLimit ? "#c0524a" : COLORS.textDim,
                  }}>{wc} / {INPUT_MAX_WORDS} words{overLimit ? " — trim it down to 500 words or fewer" : ""}</div>
                )}
              </div>
              <button
                onClick={() => !overLimit && send(input)}
                disabled={overLimit || !input.trim()}
                title={overLimit ? "Trim it down to 500 words or fewer — I'll lose the thread otherwise." : "Send"}
                style={{
                  width: 34, height: 34, borderRadius: "50%", border: "none",
                  background: (input.trim() && !overLimit) ? COLORS.accent : COLORS.border,
                  color: "#fff", cursor: (input.trim() && !overLimit) ? "pointer" : "default", fontSize: 15, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >↑</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
