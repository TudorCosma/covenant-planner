import { useState, useEffect, useRef } from "react";
import { COLORS } from "../data/themes";
import { TAB_CONTEXTS, ADVICE_REFERRAL, KNOWLEDGE_BASE, findAnswer, QUICK_QUESTIONS, TAB_INTROS } from "../data/knowledgeBase";

export function FinancialAssistant({ tab }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // Reset messages when tab changes or panel opens on a new tab
  const prevTabRef = useRef(tab);
  useEffect(() => {
    if (tab !== prevTabRef.current) {
      prevTabRef.current = tab;
      setMessages([]);
      // If panel is open, set new intro
      if (open) {
        setMessages([{ role: "assistant", content: `${TAB_INTROS[tab] || "You switched tabs."}\n\nWhat would you like to understand about this section?` }]);
      }
    }
  }, [tab]);

  // Show intro when panel opens
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `Hi! I'm your financial literacy guide 👋\n\n${TAB_INTROS[tab] || ""}\n\nI can explain how anything here works in plain English — no jargon. What would you like to understand?`,
      }]);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (userText) => {
    if (!userText?.trim()) return;
    setInput("");
    const answer = findAnswer(userText);
    setMessages(prev => [
      ...prev,
      { role: "user", content: userText },
      { role: "assistant", content: answer },
    ]);
  };

  const renderText = (text) => {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part
      );
      return <span key={i}>{parts}{i < text.split("\n").length - 1 && <br />}</span>;
    });
  };

  const questions = QUICK_QUESTIONS[tab] || ["How does this section work?", "What should I enter here?"];

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 24, right: 20, zIndex: 1000,
          width: 52, height: 52, borderRadius: "50%",
          background: open ? COLORS.textDim : COLORS.accent,
          border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, transition: "all 0.2s", color: "#fff",
        }}
      >{open ? "✕" : "?"}</button>

      {open && (
        <div style={{
          position: "fixed", bottom: 86, right: 12, left: 12, zIndex: 999,
          maxWidth: 480, margin: "0 auto",
          background: COLORS.card, borderRadius: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,0.20)",
          border: `1px solid ${COLORS.border}`,
          display: "flex", flexDirection: "column", height: "70vh", maxHeight: 560,
        }}>
          <div style={{ background: COLORS.accent, borderRadius: "16px 16px 0 0", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✨</div>
            <div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Financial Guide</div>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}>Plain-English financial literacy</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "88%", padding: "9px 12px",
                  borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: m.role === "user" ? COLORS.accent : COLORS.infoBg || "#ece8e1",
                  color: m.role === "user" ? "#fff" : COLORS.text,
                  fontSize: 12, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6,
                }}>
                  {renderText(m.content)}
                </div>
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

          <div style={{ padding: "8px 12px 12px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send(input)}
              placeholder="Ask anything about this section..."
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 20,
                border: `1px solid ${COLORS.inputBorder}`, background: COLORS.inputBg,
                color: COLORS.text, fontSize: 16, fontFamily: "'DM Sans', sans-serif", outline: "none",
              }}
            />
            <button onClick={() => send(input)} style={{
              width: 36, height: 36, borderRadius: "50%", border: "none",
              background: input.trim() ? COLORS.accent : COLORS.border,
              color: "#fff", cursor: "pointer", fontSize: 16, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>↑</button>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// DEFAULT STATE
// ============================================================
