import { useState, useEffect, useRef } from "react";
import { COLORS } from "../data/themes";
import { TAB_CONTEXTS, ADVICE_REFERRAL, KNOWLEDGE_BASE, findAnswer, QUICK_QUESTIONS, TAB_INTROS } from "../data/knowledgeBase";
import { COVIE_INTRO, COVIE_DISCLAIMER, INPUT_MAX_WORDS, wordCount, isAdviceQuestion, pickRefusalLine, REFUSAL_ACTIONS } from "../lib/covieVoice";

// Covie — the AI finance guide. Plain-English education + how-to-use-the-app.
// Refuses prescriptive personal-advice questions via escalating tiers of refusal
// lines, picked from src/lib/covieVoice.js. Maintains a session-only refusal
// counter (no persistence) so each successive refusal feels fresh.

export function FinancialAssistant({ tab }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [refusalCount, setRefusalCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Reset messages when tab changes; if open, show a short tab-context intro
  const prevTabRef = useRef(tab);
  useEffect(() => {
    if (tab !== prevTabRef.current) {
      prevTabRef.current = tab;
      setMessages([]);
      if (open) {
        setMessages([{ role: "assistant", content: `You moved to ${TAB_CONTEXTS[tab] || "a new tab"}. ${TAB_INTROS[tab] || ""}\n\nAsk me anything about how this section works.` }]);
      }
    }
  }, [tab]);

  // Initial intro when panel opens
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `${COVIE_INTRO}\n\n${TAB_INTROS[tab] || ""}`,
      }]);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const wc = wordCount(input);
  const overLimit = wc > INPUT_MAX_WORDS;

  const send = (userText) => {
    if (!userText?.trim()) return;
    if (wordCount(userText) > INPUT_MAX_WORDS) return; // safety
    setInput("");

    // Personal-advice gate — never search KB for these; route to escalating refusal.
    if (isAdviceQuestion(userText)) {
      const newCount = refusalCount + 1;
      setRefusalCount(newCount);
      const refusalLine = pickRefusalLine(newCount);
      setMessages(prev => [
        ...prev,
        { role: "user", content: userText },
        { role: "assistant", content: refusalLine, kind: "refusal" },
      ]);
      return;
    }

    // Normal educational answer (existing KB) with Covie's disclaimer footer.
    const answer = findAnswer(userText);
    const composed = `${answer}\n\n${COVIE_DISCLAIMER}`;
    setMessages(prev => [
      ...prev,
      { role: "user", content: userText },
      { role: "assistant", content: composed },
    ]);
  };

  const renderText = (text) => {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={j}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("_") && part.endsWith("_")) return <em key={j} style={{ color: COLORS.textDim, fontSize: 10 }}>{part.slice(1, -1)}</em>;
        return part;
      });
      return <span key={i}>{parts}{i < text.split("\n").length - 1 && <br />}</span>;
    });
  };

  const questions = QUICK_QUESTIONS[tab] || ["How does this section work?", "What goes in this tab?"];

  return (
    <>
      {/* Floating bubble (slightly smaller — secondary tool, not headline) */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Talk to Covie"
        style={{
          position: "fixed", bottom: 20, right: 18, zIndex: 1000,
          width: 46, height: 46, borderRadius: "50%",
          background: open ? COLORS.textDim : COLORS.accent,
          border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, transition: "all 0.2s", color: "#fff", fontWeight: 700,
        }}
      >{open ? "✕" : "C"}</button>

      {open && (
        <div style={{
          position: "fixed", bottom: 76, right: 12, left: 12, zIndex: 999,
          maxWidth: 460, margin: "0 auto",
          background: COLORS.card, borderRadius: 14,
          boxShadow: "0 8px 36px rgba(0,0,0,0.22)",
          border: `1px solid ${COLORS.border}`,
          display: "flex", flexDirection: "column", height: "70vh", maxHeight: 580,
        }}>
          <div style={{ background: COLORS.accent, borderRadius: "14px 14px 0 0", padding: "11px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>C</div>
            <div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Covie</div>
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}>Your AI finance guide · education only</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "90%", padding: "9px 12px",
                  borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: m.role === "user" ? COLORS.accent : (m.kind === "refusal" ? `${COLORS.accent}15` : COLORS.infoBg || "#ece8e1"),
                  color: m.role === "user" ? "#fff" : COLORS.text,
                  fontSize: 12, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6,
                  border: m.kind === "refusal" ? `1px dashed ${COLORS.accent}50` : "none",
                }}>
                  {renderText(m.content)}
                </div>
                {m.kind === "refusal" && (
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

          {messages.length <= 2 && (
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
            <button onClick={() => !overLimit && send(input)} disabled={overLimit || !input.trim()} title={overLimit ? "Trim it down to 500 words or fewer — I'll lose the thread otherwise." : "Send"} style={{
              width: 34, height: 34, borderRadius: "50%", border: "none",
              background: (input.trim() && !overLimit) ? COLORS.accent : COLORS.border,
              color: "#fff", cursor: (input.trim() && !overLimit) ? "pointer" : "default", fontSize: 15, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>↑</button>
          </div>
        </div>
      )}
    </>
  );
}
