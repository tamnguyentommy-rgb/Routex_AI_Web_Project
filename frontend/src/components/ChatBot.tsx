"use client";
import { useState, useRef, useEffect } from "react";
import api from "../lib/api";

interface Message {
  role: "user" | "bot";
  text: string;
}

interface ChatBotProps {
  userContext?: object;
}

export default function ChatBot({ userContext = {} }: ChatBotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Xin chào! Mình là Routex AI. Bạn cần hỏi gì về lộ trình học không?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, open]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const res = await api.chat(msg, userContext);
      setMessages(prev => [...prev, { role: "bot", text: res.data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "bot", text: "Xin lỗi, mình đang bận xíu! Thử lại sau nhé." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-2xl flex items-center justify-center z-50 transition-all duration-200 active:scale-95"
        style={{
          background: open
            ? "rgba(239,68,68,0.15)"
            : "linear-gradient(135deg, #6366f1, #8b5cf6)",
          boxShadow: open
            ? "0 8px 32px rgba(239,68,68,0.3)"
            : "0 8px 32px rgba(99,102,241,0.5)",
          border: open ? "1px solid rgba(239,68,68,0.3)" : "none",
        }}>
        <span className="text-xl transition-transform duration-200" style={{ transform: open ? "rotate(45deg)" : "none" }}>
          {open ? "✕" : "◈"}
        </span>
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-44 right-4 w-80 flex flex-col overflow-hidden z-50 rounded-3xl shadow-2xl animate-fade-up"
          style={{
            height: "420px",
            background: "#0d1117",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)",
          }}>

          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>◈</div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Routex AI</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs" style={{ color: "#6ee7b7" }}>Online · Trợ lý học tập</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "bot" && (
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs mr-2 mt-1 flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>◈</div>
                )}
                <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                  style={m.role === "user"
                    ? { background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", borderBottomRightRadius: "4px" }
                    : { background: "rgba(255,255,255,0.06)", color: "var(--text-primary)", border: "1px solid rgba(255,255,255,0.06)", borderBottomLeftRadius: "4px" }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>◈</div>
                <div className="px-3.5 py-2.5 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderBottomLeftRadius: "4px" }}>
                  <div className="dot-loader flex gap-1"><span /><span /><span /></div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex gap-2 items-center rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Hỏi gì đó..."
                className="flex-1 text-sm bg-transparent outline-none text-white placeholder-slate-600"
              />
              <button onClick={send} disabled={loading || !input.trim()}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-200 disabled:opacity-30"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
