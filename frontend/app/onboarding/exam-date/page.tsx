"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../src/contexts/auth";

const SUBJECT_COLORS: Record<string, string> = {
  Toán: "linear-gradient(135deg, #3b82f6, #6366f1)",
  Lý: "linear-gradient(135deg, #f59e0b, #ef4444)",
  Hóa: "linear-gradient(135deg, #10b981, #06b6d4)",
  Sinh: "linear-gradient(135deg, #14b8a6, #8b5cf6)",
};

const PRESETS = [
  { label: "2 tuần", sublabel: "Gần rồi, tập trung tối đa!", weeks: 2, icon: "⚡" },
  { label: "1 tháng", sublabel: "Vừa đủ ôn trọng tâm", weeks: 4, icon: "◈" },
  { label: "2 tháng", sublabel: "Có thời gian xây nền", weeks: 8, icon: "◎" },
  { label: "3 tháng", sublabel: "Ôn toàn diện + luyện đề", weeks: 12, icon: "◉" },
];

export default function ExamDatePage() {
  const router = useRouter();
  const { user, isLoaded } = useAuth();
  const [subject, setSubject] = useState("Toán");
  const [selected, setSelected] = useState<number | null>(null);
  const [customDate, setCustomDate] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoaded && !user) { router.push("/"); return; }
    const subj = sessionStorage.getItem("subject") || "Toán";
    setSubject(subj);
    setTimeout(() => setVisible(true), 50);
  }, [isLoaded, user]);

  const subjectGradient = SUBJECT_COLORS[subject] || SUBJECT_COLORS["Toán"];

  const getWeeksFromDate = (dateStr: string): number => {
    const exam = new Date(dateStr);
    const today = new Date();
    const diffMs = exam.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.ceil(diffDays / 7));
  };

  const handleCustomDate = (val: string) => {
    setCustomDate(val);
    if (val) {
      const w = getWeeksFromDate(val);
      setSelected(w);
    }
  };

  const handleContinue = () => {
    const weeks = selected ?? 4;
    sessionStorage.setItem("examDurationWeeks", String(weeks));
    router.push("/test");
  };

  const today = new Date().toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  const canContinue = selected !== null && selected > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 noise-bg relative overflow-hidden"
      style={{ background: "#07080f" }}>

      <div className="absolute top-0 left-0 right-0 h-px opacity-60" style={{ background: subjectGradient }} />
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-8 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #6366f1, transparent)" }} />

      <div className="relative z-10 w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-10"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(16px)", transition: "all 0.5s ease" }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#a78bfa" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Bước 3 / 3 · Thời gian ôn tập
          </div>
          <h1 className="text-3xl font-black text-white mb-3 tracking-tight">
            Kỳ thi của bạn <span style={{ background: subjectGradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>còn bao lâu?</span>
          </h1>
          <p className="text-sm" style={{ color: "#94a3b8" }}>
            Routex sẽ tạo lộ trình phù hợp với thời gian bạn có
          </p>
        </div>

        {/* Quick presets */}
        <div className="grid grid-cols-2 gap-3 mb-5"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)", transition: "all 0.5s ease 0.1s" }}>
          {PRESETS.map((p) => {
            const isActive = selected === p.weeks && !customDate;
            return (
              <button key={p.weeks} type="button"
                onClick={() => { setSelected(p.weeks); setCustomDate(""); }}
                className="relative rounded-2xl p-5 text-left transition-all duration-200 overflow-hidden"
                style={isActive
                  ? { background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.5)", transform: "scale(1.02)", boxShadow: "0 8px 32px rgba(99,102,241,0.2)" }
                  : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: subjectGradient }} />
                )}
                <div className="text-2xl mb-3">{p.icon}</div>
                <p className="font-black text-white text-lg leading-none mb-1">{p.label}</p>
                <p className="text-xs" style={{ color: isActive ? "#a5b4fc" : "#64748b" }}>{p.sublabel}</p>
                {isActive && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: subjectGradient }}>
                    <span className="text-white text-xs font-black">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom date picker */}
        <div className="glass rounded-2xl p-5 mb-6"
          style={{ opacity: visible ? 1 : 0, transition: "all 0.5s ease 0.2s" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#64748b" }}>
            Hoặc chọn ngày thi cụ thể
          </p>
          <input
            type="date"
            min={today}
            max={maxDateStr}
            value={customDate}
            onChange={e => handleCustomDate(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: customDate ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.1)",
              color: customDate ? "#f1f5f9" : "#64748b",
              colorScheme: "dark",
            }}
          />
          {customDate && selected && (
            <p className="text-xs mt-2 font-medium" style={{ color: "#a5b4fc" }}>
              ◈ Còn khoảng <strong style={{ color: "#e2e8f0" }}>{selected} tuần</strong> ({selected * 7} ngày) — lộ trình sẽ được điều chỉnh phù hợp
            </p>
          )}
        </div>

        {/* Continue button */}
        <button onClick={handleContinue} disabled={!canContinue}
          className="w-full py-4 font-black text-white rounded-2xl transition-all duration-200 disabled:opacity-40 text-base"
          style={{
            background: canContinue ? subjectGradient : "rgba(255,255,255,0.08)",
            boxShadow: canContinue ? "0 10px 40px rgba(99,102,241,0.3)" : "none",
            opacity: visible ? 1 : 0,
            transition: "all 0.5s ease 0.25s, background 0.2s, box-shadow 0.2s",
          }}>
          Làm bài kiểm tra →
        </button>

        {/* Step dots */}
        <div className="flex justify-center gap-2 mt-8">
          <span className="h-1.5 w-4 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          <span className="h-1.5 w-4 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          <span className="h-1.5 w-10 rounded-full" style={{ background: subjectGradient }} />
        </div>
      </div>
    </div>
  );
}
