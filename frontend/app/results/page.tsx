"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../src/contexts/auth";
import api from "../../src/lib/api";
import ReactMarkdown from "react-markdown";

const SCENARIO_STYLES = [
  { gradient: "linear-gradient(135deg, #3b82f6, #6366f1)", glow: "rgba(59,130,246,0.25)", label: "BALANCED" },
  { gradient: "linear-gradient(135deg, #8b5cf6, #a855f7)", glow: "rgba(139,92,246,0.25)", label: "STANDARD" },
  { gradient: "linear-gradient(135deg, #ef4444, #f97316)", glow: "rgba(239,68,68,0.25)", label: "INTENSIVE" },
];

export default function ResultsPage() {
  const router = useRouter();
  const { user, isLoaded } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [selectingScenario, setSelectingScenario] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const didGenerate = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.push("/"); return; }
    const stored = sessionStorage.getItem("testResult");
    if (!stored) { router.push("/test"); return; }
    if (didGenerate.current) return;
    didGenerate.current = true;
    const r = JSON.parse(stored);
    setResult(r);
    generateRoadmap(r);
    setTimeout(() => setVisible(true), 100);
  }, [isLoaded, user]);

  const generateRoadmap = async (r: any) => {
    if (!user) return;
    setLoadingRoadmap(true);
    try {
      const totalQ = r.total_questions || 10;
      const score = r.score || 5;
      const weakRatio = r.weak_topics?.length ? r.weak_topics.length / totalQ : 0.3;
      const res = await api.generateRoadmap(user.id, {
        current_score: score, mastery_avg: score / 10, mastery_std: 0.15,
        weak_ratio: weakRatio, improvement_last_week: 0, prev_week_time: 120
      });
      setRoadmap(res.data.data);
    } catch (err) {
      console.error("Roadmap error:", err);
    } finally {
      setLoadingRoadmap(false);
    }
  };

  const selectScenario = async (name: string) => {
    if (!roadmap || selectingScenario || selectedScenario) return;
    setSelectingScenario(name);
    const durationWeeks = parseInt(sessionStorage.getItem("examDurationWeeks") || "4");
    try {
      await api.selectRoadmap(roadmap.roadmap_id, name, durationWeeks);
      setSelectedScenario(name);
      setTimeout(() => router.push(`/roadmap?id=${roadmap.roadmap_id}`), 700);
    } catch (e: any) {
      if (e?.response?.status >= 500 || !e?.response) {
        setSelectedScenario(name);
        setTimeout(() => router.push(`/roadmap?id=${roadmap.roadmap_id}`), 700);
      } else {
        setSelectingScenario(null);
      }
    }
  };

  if (!result) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#07080f" }}>
      <div className="dot-loader flex gap-1"><span /><span /><span /></div>
    </div>
  );

  const pct = Math.round((result.correct_count / result.total_questions) * 100);
  const score = result.score;
  const scoreGradient = score >= 8
    ? "linear-gradient(135deg, #10b981, #06b6d4)"
    : score >= 5
    ? "linear-gradient(135deg, #f59e0b, #f97316)"
    : "linear-gradient(135deg, #ef4444, #dc2626)";
  const scoreLabel = score >= 8 ? "Xuất sắc" : score >= 6.5 ? "Khá tốt" : score >= 5 ? "Trung bình" : "Cần cải thiện";

  const cardStyle = (delay: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "none" : "translateY(20px)",
    transition: `all 0.5s ease ${delay}ms`,
  });

  return (
    <div className="min-h-screen pb-10 noise-bg" style={{ background: "#07080f" }}>
      <div className="max-w-2xl mx-auto px-4 pt-8">

        {/* Back */}
        <button onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-sm mb-8 transition-colors group"
          style={{ color: "var(--text-muted)" }}>
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          <span className="group-hover:text-white transition-colors">Dashboard</span>
        </button>

        {/* Score Card */}
        <div className="glass rounded-3xl p-8 mb-5 text-center relative overflow-hidden" style={cardStyle(0)}>
          <div className="absolute inset-0 opacity-5" style={{ background: scoreGradient }} />
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>Kết quả kiểm tra</p>

          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-4 text-white font-black text-4xl shadow-2xl"
            style={{ background: scoreGradient }}>
            {score.toFixed(1)}
          </div>

          <p className="text-white font-bold text-lg mb-1">{scoreLabel}</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{result.correct_count}/{result.total_questions} câu đúng · {pct}%</p>

          {/* Score bar */}
          <div className="mt-5 h-1.5 rounded-full mx-4" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: scoreGradient }} />
          </div>

          {result.weak_topics?.length > 0 && (
            <div className="mt-5 p-4 rounded-2xl text-left"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#f87171" }}>
                ◎ Topics cần cải thiện
              </p>
              <div className="flex flex-wrap gap-2">
                {result.weak_topics.map((t: string) => (
                  <span key={t} className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.2)" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Advisor */}
        {loadingRoadmap ? (
          <div className="glass rounded-3xl p-8 text-center mb-5" style={cardStyle(100)}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl animate-float"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>◈</div>
            <p className="text-white font-bold mb-2">AI đang tạo lộ trình cá nhân hóa...</p>
            <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>Gemini đang phân tích kết quả của bạn</p>
            <div className="dot-loader flex justify-center gap-1"><span /><span /><span /></div>
          </div>
        ) : roadmap && (
          <div className="space-y-4">
            {/* AI Advisor message */}
            <div className="glass rounded-3xl p-6 relative overflow-hidden" style={cardStyle(150)}>
              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl"
                style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #3b82f6)" }} />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>◈</div>
                <div>
                  <p className="text-white font-bold text-sm">AI Advisor</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Powered by Gemini</p>
                </div>
              </div>
              {roadmap.ai_advisor_message && !roadmap.ai_advisor_message.startsWith("⚠️") ? (
                <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  <ReactMarkdown>{roadmap.ai_advisor_message}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  AI Advisor tạm thời không khả dụng. Hãy chọn một trong 3 lộ trình bên dưới — AI dự đoán điểm số dựa trên kết quả bài test của bạn.
                </p>
              )}
            </div>

            {/* 3 Scenarios */}
            {roadmap.scenarios?.length > 0 && (
              <div style={cardStyle(200)}>
                <h2 className="text-white font-black text-base mb-4 flex items-center gap-2">
                  <span className="text-violet-400">◈</span> 3 Lộ trình cho tuần này
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {roadmap.scenarios.map((s: any, i: number) => {
                    const style = SCENARIO_STYLES[i] || SCENARIO_STYLES[0];
                    const isSelected = selectedScenario === s.name;
                    const isSelecting = selectingScenario === s.name;
                    const isDisabled = (selectedScenario !== null && !isSelected) || selectingScenario !== null;
                    return (
                      <div key={i} className="rounded-3xl p-5 relative overflow-hidden transition-all duration-300"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: isSelected ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(255,255,255,0.06)",
                          boxShadow: isSelected ? "0 0 40px rgba(16,185,129,0.15)" : "none",
                          transform: isSelected ? "scale(1.02)" : "none",
                        }}>
                        {/* Color bar */}
                        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl" style={{ background: style.gradient }} />

                        <div className="mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{style.label}</span>
                        </div>
                        <h3 className="text-white font-black text-base mb-4">{s.name}</h3>

                        <div className="space-y-2 text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
                          <div className="flex justify-between items-center">
                            <span>⏱ Thời gian</span>
                            <span className="font-bold text-white">{s.action?.action_planned_time} phút/tuần</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>📚 Chủ đề</span>
                            <span className="font-bold text-white">{s.action?.action_topic_count}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>🔥 Độ khó</span>
                            <span className="font-bold text-white">{(s.action?.action_avg_difficulty * 10).toFixed(1)}/10</span>
                          </div>
                        </div>

                        <div className="rounded-2xl p-3 mb-4 text-center"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>AI dự đoán điểm</p>
                          <p className="text-3xl font-black"
                            style={{ background: style.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            {s.predicted_score?.toFixed(1)}
                          </p>
                        </div>

                        <button onClick={() => selectScenario(s.name)} disabled={isDisabled}
                          className="w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200"
                          style={isSelected
                            ? { background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff" }
                            : isSelecting
                            ? { background: "rgba(255,255,255,0.1)", color: "var(--text-muted)" }
                            : isDisabled
                            ? { background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", cursor: "not-allowed" }
                            : { background: style.gradient, color: "#fff", boxShadow: `0 6px 20px ${style.glow}` }}>
                          {isSelected ? "✓ Đã chọn" : isSelecting ? "Đang xử lý..." : "Chọn lộ trình này"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button onClick={() => router.push("/dashboard")}
              style={{ ...cardStyle(300), background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              className="w-full py-4 font-bold text-white rounded-2xl text-sm transition-all duration-200">
              ← Về Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
