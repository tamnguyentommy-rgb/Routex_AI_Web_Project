"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../src/contexts/auth";
import api, { Question, TestOut } from "../../src/lib/api";

const OPTIONS = ["A", "B", "C", "D"] as const;
const SUBJECT_ICONS: Record<string, string> = { Toán: "∑", Lý: "⚡", Hóa: "⬡", Sinh: "◉" };
const SUBJECT_COLORS: Record<string, string> = {
  Toán: "linear-gradient(135deg, #3b82f6, #6366f1)",
  Lý: "linear-gradient(135deg, #f59e0b, #ef4444)",
  Hóa: "linear-gradient(135deg, #10b981, #06b6d4)",
  Sinh: "linear-gradient(135deg, #14b8a6, #8b5cf6)",
};

export default function TestPage() {
  const router = useRouter();
  const { user, isLoaded } = useAuth();
  const [test, setTest] = useState<TestOut | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showNext, setShowNext] = useState(false);
  const [subject, setSubject] = useState("Toán");
  const [grade, setGrade] = useState(12);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.push("/"); return; }
    const subj = sessionStorage.getItem("subject") || "Toán";
    const gr = parseInt(sessionStorage.getItem("grade") || "12");
    setSubject(subj);
    setGrade(gr);
    loadTest(subj, gr);
  }, [isLoaded, user]);

  const loadTest = async (subj = subject, gr = grade) => {
    setLoading(true); setError("");
    try {
      const res = await api.generateTest(subj, gr);
      setTest(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Lỗi tải đề thi!");
    } finally {
      setLoading(false);
    }
  };

  const pick = (opt: string) => {
    if (showNext || animating) return;
    setSelected(opt);
    setShowNext(true);
  };

  const next = () => {
    if (!test || selected === null) return;
    setAnimating(true);
    const q = test.questions[current];
    const newAnswers = { ...answers, [q.id]: selected };
    setAnswers(newAnswers);

    setTimeout(() => {
      setSelected(null);
      setShowNext(false);
      setAnimating(false);
      if (current + 1 < test.questions.length) {
        setCurrent(c => c + 1);
      } else {
        submitTest(newAnswers);
      }
    }, 250);
  };

  const submitTest = async (finalAnswers: Record<number, string>) => {
    if (!test || !user) return;
    setSubmitting(true);
    try {
      const payload = Object.entries(finalAnswers).map(([qid, ans]) => ({
        question_id: parseInt(qid), selected_answer: ans
      }));
      const res = await api.submitTest(user.id, test.test_id, payload);
      sessionStorage.setItem("testResult", JSON.stringify(res.data));
      router.push("/results");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Lỗi nộp bài!");
      setSubmitting(false);
    }
  };

  const subjectGradient = SUBJECT_COLORS[subject] || SUBJECT_COLORS["Toán"];

  if (loading || submitting) return (
    <div className="min-h-screen flex items-center justify-center noise-bg" style={{ background: "#07080f" }}>
      <div className="text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-2xl animate-float"
          style={{ background: subjectGradient, boxShadow: "0 20px 60px rgba(99,102,241,0.4)" }}>
          {submitting ? "◎" : SUBJECT_ICONS[subject] || "◎"}
        </div>
        <div className="dot-loader mb-4 flex justify-center">
          <span /><span /><span />
        </div>
        <p className="text-white font-bold text-lg">{submitting ? "AI đang phân tích bài làm..." : "Đang tải đề thi..."}</p>
        <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
          {submitting ? "Gemini đang đánh giá điểm mạnh · điểm yếu" : `${subject} · Lớp ${grade}`}
        </p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4 noise-bg" style={{ background: "#07080f" }}>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5"
          style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>⚠</div>
        <p className="text-white font-bold text-lg mb-2">Không tải được đề thi</p>
        <p className="text-sm mb-6" style={{ color: "#94a3b8" }}>{error}</p>
        <button onClick={() => loadTest()} className="px-6 py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: subjectGradient }}>Thử lại</button>
      </div>
    </div>
  );

  if (!test) return null;

  const q = test.questions[current];
  const progress = (current / test.questions.length) * 100;
  const optMap: Record<string, string | undefined> = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
  const answered = Object.keys(answers).length;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 noise-bg relative overflow-hidden"
      style={{ background: "#07080f" }}>

      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: subjectGradient, opacity: 0.5 }} />

      <div className="relative z-10 w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white"
              style={{ background: subjectGradient }}>
              {SUBJECT_ICONS[subject] || "◎"}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{subject} · Lớp {grade}</p>
              <p className="text-xs" style={{ color: "#64748b" }}>{answered} đã trả lời</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white font-black text-lg">{current + 1}<span className="text-sm font-normal" style={{ color: "#64748b" }}>/{test.questions.length}</span></p>
          </div>
        </div>

        {/* Progress */}
        <div className="h-1 rounded-full mb-8 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: subjectGradient }} />
        </div>

        {/* Question card */}
        <div className="glass rounded-3xl p-7 mb-4" style={{ opacity: animating ? 0 : 1, transition: "opacity 0.2s ease" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#64748b" }}>
            Câu hỏi {current + 1}
          </p>
          <p className="text-white text-base leading-relaxed font-medium">{q.content}</p>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6" style={{ opacity: animating ? 0 : 1, transition: "opacity 0.2s ease" }}>
          {OPTIONS.map((opt, idx) => {
            const txt = optMap[opt];
            if (!txt) return null;
            const isSelected = selected === opt;
            return (
              <button key={opt} onClick={() => pick(opt)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200"
                style={isSelected
                  ? { background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.5)", transform: "scale(1.01)" }
                  : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 transition-all duration-200"
                  style={isSelected
                    ? { background: subjectGradient, color: "#fff", boxShadow: "0 4px 16px rgba(99,102,241,0.4)" }
                    : { background: "rgba(255,255,255,0.10)", color: "#94a3b8" }}>
                  {opt}
                </div>
                <span className="text-sm leading-snug font-medium" style={{ color: isSelected ? "#ffffff" : "#e2e8f0" }}>{txt}</span>
              </button>
            );
          })}
        </div>

        {/* Next button */}
        {showNext && (
          <button onClick={next}
            className="w-full py-4 font-black text-white rounded-2xl transition-all duration-200 text-sm animate-fade-up"
            style={{ background: subjectGradient, boxShadow: "0 10px 40px rgba(99,102,241,0.3)" }}>
            {current + 1 === test.questions.length ? "Nộp bài & Xem kết quả →" : "Câu tiếp theo →"}
          </button>
        )}
      </div>
    </div>
  );
}
