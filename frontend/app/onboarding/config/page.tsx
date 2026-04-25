"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../src/contexts/auth";
import api from "../../../src/lib/api";

const GRADES = [10, 11, 12];
const MODES = [
  { id: "general", label: "Học Toàn Diện", icon: "◎", desc: "Ôn toàn bộ chương trình, cân bằng lý thuyết và bài tập" },
  { id: "exam", label: "Chuẩn bị Thi", icon: "◈", desc: "Tập trung trọng tâm, luyện đề và các dạng bài thường gặp" },
];

const SUBJECT_ICONS: Record<string, string> = { Toán: "∑", Lý: "⚡", Hóa: "⬡", Sinh: "◉" };
const SUBJECT_COLORS: Record<string, string> = {
  Toán: "linear-gradient(135deg, #3b82f6, #6366f1)",
  Lý: "linear-gradient(135deg, #f59e0b, #ef4444)",
  Hóa: "linear-gradient(135deg, #10b981, #06b6d4)",
  Sinh: "linear-gradient(135deg, #14b8a6, #8b5cf6)",
};

export default function ConfigPage() {
  const router = useRouter();
  const { user, isLoaded } = useAuth();
  const [grade, setGrade] = useState(12);
  const [mode, setMode] = useState("general");
  const [target, setTarget] = useState(8.0);
  const [daily, setDaily] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState("Toán");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setSubject(sessionStorage.getItem("subject") || "Toán");
    setTimeout(() => setVisible(true), 50);
  }, []);

  useEffect(() => { if (isLoaded && !user) router.push("/"); }, [isLoaded, user]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true); setError("");
    try {
      await api.saveConfig(user.id, { subject, grade, mode, target_score: target, daily_study_time: daily });
      sessionStorage.setItem("grade", String(grade));
      sessionStorage.setItem("mode", mode);
      if (mode === "exam") {
        router.push("/onboarding/exam-date");
      } else {
        sessionStorage.setItem("examDurationWeeks", "26");
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Lỗi khi lưu cài đặt!");
    } finally {
      setLoading(false);
    }
  };

  const subjectGradient = SUBJECT_COLORS[subject] || SUBJECT_COLORS["Toán"];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 noise-bg relative overflow-hidden"
      style={{ background: "#07080f" }}>

      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #6366f1, transparent)" }} />

      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8" style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(16px)", transition: "all 0.5s ease" }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#a78bfa" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            {mode === "exam" ? "Bước 2 / 3" : "Bước 2 / 2"} · Thiết lập lộ trình
          </div>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-xl"
              style={{ background: subjectGradient }}>
              {SUBJECT_ICONS[subject] || "◎"}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Môn đã chọn</p>
              <h1 className="text-3xl font-black text-white">{subject}</h1>
            </div>
          </div>
        </div>

        <form onSubmit={handle} className="space-y-5" style={{ opacity: visible ? 1 : 0, transition: "all 0.5s ease 0.1s" }}>

          {/* Grade */}
          <div className="glass rounded-2xl p-5">
            <label className="block text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-secondary)" }}>Lớp học</label>
            <div className="grid grid-cols-3 gap-3">
              {GRADES.map(g => (
                <button key={g} type="button" onClick={() => setGrade(g)}
                  className="py-3 rounded-xl font-black text-base transition-all duration-200"
                  style={grade === g
                    ? { background: subjectGradient, color: "#fff", boxShadow: "0 6px 24px rgba(59,130,246,0.3)", transform: "scale(1.03)" }
                    : { background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  Lớp {g}
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div className="glass rounded-2xl p-5">
            <label className="block text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-secondary)" }}>Mục tiêu học tập</label>
            <div className="space-y-3">
              {MODES.map(m => (
                <button key={m.id} type="button" onClick={() => setMode(m.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200"
                  style={mode === m.id
                    ? { background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.35)" }
                    : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
                    style={mode === m.id
                      ? { background: subjectGradient, color: "#fff" }
                      : { background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                    {m.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">{m.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{m.desc}</p>
                  </div>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={mode === m.id
                      ? { background: subjectGradient }
                      : { border: "2px solid rgba(255,255,255,0.15)" }}>
                    {mode === m.id && <span className="text-white text-xs">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Target score */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Điểm mục tiêu</label>
              <span className="text-2xl font-black" style={{ background: subjectGradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{target.toFixed(1)}</span>
            </div>
            <input type="range" min={5} max={10} step={0.5} value={target} onChange={e => setTarget(parseFloat(e.target.value))} className="w-full" />
            <div className="flex justify-between text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              <span>5.0 · Trung bình</span><span>10.0 · Tối đa</span>
            </div>
          </div>

          {/* Daily time */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Thời gian học/ngày</label>
              <span className="text-2xl font-black" style={{ background: subjectGradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{daily}<span className="text-sm font-semibold"> phút</span></span>
            </div>
            <input type="range" min={30} max={180} step={15} value={daily} onChange={e => setDaily(parseInt(e.target.value))} className="w-full" />
            <div className="flex justify-between text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              <span>30 phút</span><span>3 giờ</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-red-400 text-sm"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              ⚠ {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-4 font-black text-white rounded-2xl transition-all duration-200 disabled:opacity-50 text-base"
            style={{ background: subjectGradient, boxShadow: "0 10px 40px rgba(99,102,241,0.3)" }}>
            {loading
              ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" style={{ animation: "spin 1s linear infinite" }} />Đang lưu...</span>
              : mode === "exam" ? "Tiếp theo →" : "Vào Dashboard →"}
          </button>

          <div className="flex justify-center gap-2 pt-2">
            <span className="h-1.5 w-4 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            <span className="h-1.5 w-10 rounded-full" style={{ background: subjectGradient }} />
            {mode === "exam" && <span className="h-1.5 w-4 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />}
          </div>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
