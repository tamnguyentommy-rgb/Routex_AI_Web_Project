"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../src/contexts/auth";
import api from "../../src/lib/api";
import ChatBot from "../../src/components/ChatBot";

interface DashData {
  user: any;
  config: any;
  overview: any;
  mastery_topics: any[];
  weak_topics: any[];
  weekly_progress: any[];
  learning_path: any[];
}

const SUBJECT_LABEL: Record<string, string> = {
  Toán: "Mathematics", Lý: "Physics", Hóa: "Chemistry", Sinh: "Biology",
};
const SUBJECT_ICON: Record<string, string> = {
  Toán: "∑", Lý: "⚡", Hóa: "⬡", Sinh: "◉",
};
const SUBJECT_COLORS: Record<string, string> = {
  Toán: "linear-gradient(135deg, #3b82f6, #6366f1)",
  Lý: "linear-gradient(135deg, #f59e0b, #ef4444)",
  Hóa: "linear-gradient(135deg, #10b981, #06b6d4)",
  Sinh: "linear-gradient(135deg, #14b8a6, #8b5cf6)",
};

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 40;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 20);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count}{suffix}</>;
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="font-black text-lg leading-none" style={{ background: color, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{value}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

function getTimeRemaining(createdAt: string | null, totalWeeks: number) {
  if (!createdAt || !totalWeeks) return null;
  const start = new Date(createdAt).getTime();
  const end = start + totalWeeks * 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return { days: 0, hours: 0, expired: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return { days, hours, expired: false };
}

function MascotDisplay({ avatarData, size = 48 }: { avatarData: string | null; size?: number }) {
  if (!avatarData) {
    return (
      <div className="rounded-full flex items-center justify-center text-white font-black"
        style={{ width: size, height: size, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", fontSize: size * 0.4 }}>
        R
      </div>
    );
  }
  return (
    <img src={avatarData} alt="Mascot" className="rounded-full object-cover"
      style={{ width: size, height: size, border: "2px solid rgba(139,92,246,0.5)" }} />
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded, logout } = useAuth();
  const [dash, setDash] = useState<DashData | null>(null);
  const [latestRoadmap, setLatestRoadmap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"focus" | "test" | "roadmap" | "profile">("focus");
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; expired: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.push("/"); return; }
    loadDash();
    loadAvatar();
  }, [isLoaded, user]);

  useEffect(() => {
    if (!dash) return;
    requestAnimationFrame(() => setVisible(true));
    import("animejs").then(({ animate }) => {
      const fills = document.querySelectorAll<HTMLElement>(".progress-fill");
      fills.forEach((el, i) => {
        el.style.width = "0%";
        animate(el, { width: el.dataset.width || "0%", duration: 900, delay: 500 + i * 80, ease: "outQuart" });
      });
    });
  }, [dash]);

  useEffect(() => {
    if (!latestRoadmap) return;
    const plan = latestRoadmap?.roadmap_plan;
    if (!plan?.total_weeks || !latestRoadmap?.created_at) return;
    const update = () => setTimeLeft(getTimeRemaining(latestRoadmap.created_at, plan.total_weeks));
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [latestRoadmap]);

  const loadDash = async () => {
    if (!user) return;
    try {
      const [dashRes, roadmapRes] = await Promise.all([
        api.getDashboard(user.id),
        api.getLatestRoadmap(user.id).catch(() => null),
      ]);
      setDash(dashRes.data);
      if (roadmapRes?.data?.status === "success") setLatestRoadmap(roadmapRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvatar = async () => {
    if (!user) return;
    try {
      const res = await api.getAvatar(user.id);
      if (res.data.avatar_data) setAvatarData(res.data.avatar_data);
    } catch {}
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        setAvatarData(base64);
        await api.uploadAvatar(user.id, base64);
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => { logout(); router.push("/"); };

  const goToTopicTest = (topicName?: string, weekNumber?: number) => {
    const subject = dash?.config?.subject || "Toán";
    const grade = dash?.config?.grade || 12;
    sessionStorage.setItem("subject", subject);
    sessionStorage.setItem("grade", String(grade));
    if (topicName) {
      sessionStorage.setItem("testTopic", topicName);
      if (weekNumber !== undefined) {
        sessionStorage.setItem("testWeek", String(weekNumber));
      } else {
        sessionStorage.removeItem("testWeek");
      }
    } else {
      sessionStorage.removeItem("testTopic");
      sessionStorage.removeItem("testWeek");
    }
    router.push("/test");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center noise-bg" style={{ background: "#07080f" }}>
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl text-white mx-auto mb-4 animate-float"
          style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", boxShadow: "0 16px 48px rgba(99,102,241,0.4)" }}>◈</div>
        <div className="dot-loader flex justify-center gap-1 mb-3"><span /><span /><span /></div>
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Đang tải Dashboard...</p>
      </div>
    </div>
  );

  const cfg = dash?.config;
  const ov = dash?.overview;
  const subjectLabel = cfg ? (SUBJECT_LABEL[cfg.subject] || cfg.subject) : "Mathematics";
  const subjectIcon = cfg ? (SUBJECT_ICON[cfg.subject] || "◎") : "◎";
  const subjectGradient = cfg ? (SUBJECT_COLORS[cfg.subject] || SUBJECT_COLORS["Toán"]) : SUBJECT_COLORS["Toán"];
  const progress = ov?.avg_mastery || 0;
  const totalTopics = ov?.total_topics || 0;
  const strongCount = ov?.strong_count || 0;
  const weakCount = ov?.weak_count || 0;
  const lastScore = dash?.weekly_progress?.length
    ? Math.round((dash.weekly_progress[dash.weekly_progress.length - 1].score / 10) * 100)
    : 0;
  const totalStudyTime = dash?.weekly_progress?.reduce((acc: number, w: any) => acc + (w.study_time || 0), 0) || 0;

  const learningPath = dash?.learning_path || [];
  const completed = learningPath.filter((p: any) => p.status === "completed");
  const inProgress = learningPath.find((p: any) => p.status === "in_progress") || learningPath.find((p: any) => p.status !== "completed");
  const upcoming = learningPath.filter((p: any) => p !== inProgress && p.status !== "completed").slice(0, 3);
  const roadmapWeeks = latestRoadmap?.roadmap_plan?.weeks || [];
  const hasValidRoadmap = roadmapWeeks.length > 0;
  const currentWeekIndex = Math.min(completed.length, roadmapWeeks.length - 1);
  const currentWeek = roadmapWeeks[currentWeekIndex];
  const totalWeeks = latestRoadmap?.roadmap_plan?.total_weeks || 0;

  const focusedTopic = currentWeek?.topics?.[0] || null;
  const focusedTopicName = focusedTopic?.name || null;

  const chatContext = {
    username: dash?.user?.username || user?.username || "",
    subject: cfg?.subject || "", grade: cfg?.grade || "", mode: cfg?.mode || "",
    target_score: cfg?.target_score || 0, daily_study_time: cfg?.daily_study_time || 0,
    current_score: dash?.weekly_progress?.length ? dash.weekly_progress[dash.weekly_progress.length - 1].score : (dash?.user?.current_score || 0),
    mastery_avg: ov?.avg_mastery || 0, strong_count: strongCount, weak_count: weakCount,
    total_topics: totalTopics, weak_topics: dash?.weak_topics?.slice(0, 5).map((t: any) => t.topic) || [],
    scenario_name: latestRoadmap?.scenario_name || "", current_week_theme: currentWeek?.theme || "",
  };

  const cardStyle = (i: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "none" : "translateY(20px)",
    transition: `opacity 0.5s ease ${i * 80}ms, transform 0.5s ease ${i * 80}ms`,
  });

  return (
    <div className="min-h-screen pb-28 noise-bg" style={{ background: "#07080f" }}>
      <div className="max-w-md mx-auto px-4 pt-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8" style={cardStyle(0)}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>R</div>
            <div>
              <p className="text-white font-black text-base leading-none">Routex</p>
              <p className="text-[10px] mt-0.5 font-medium" style={{ color: "var(--text-muted)" }}>AI Learning</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab("profile")} className="flex items-center gap-2">
              <MascotDisplay avatarData={avatarData} size={32} />
              <div className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}>
                {user?.username}
              </div>
            </button>
            <button onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171" }}>
              Đăng xuất
            </button>
          </div>
        </div>

        {activeTab === "profile" ? (
          /* ===== PROFILE / MASCOT TAB ===== */
          <div style={cardStyle(1)}>
            <div className="flex items-center gap-2 mb-6">
              <button onClick={() => setActiveTab("focus")} className="text-xs px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>← Quay lại</button>
              <p className="text-white font-black text-lg">Mascot & Hồ sơ</p>
            </div>

            {/* Mascot section */}
            <div className="glass rounded-3xl p-6 mb-4 text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <MascotDisplay avatarData={avatarData} size={96} />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 2px 8px rgba(99,102,241,0.4)" }}>
                    {uploadingAvatar ? "..." : "✎"}
                  </button>
                </div>
              </div>
              <p className="text-white font-black text-xl mb-1">{user?.username}</p>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                {cfg ? `${subjectLabel} · Lớp ${cfg.grade}` : "Chưa có cấu hình"}
              </p>

              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

              <button onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="w-full py-3 rounded-2xl font-bold text-white text-sm transition-all"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 6px 24px rgba(99,102,241,0.3)" }}>
                {uploadingAvatar ? "Đang tải lên..." : avatarData ? "Đổi ảnh mascot →" : "Upload ảnh làm mascot →"}
              </button>
              {!avatarData && (
                <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
                  Tải ảnh của bạn lên để tạo mascot nhắc học mỗi ngày!
                </p>
              )}
            </div>

            {/* Mascot motivational message */}
            <div className="rounded-3xl p-5 mb-4"
              style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.12))", border: "1px solid rgba(99,102,241,0.25)" }}>
              <div className="flex items-start gap-3">
                <MascotDisplay avatarData={avatarData} size={40} />
                <div className="flex-1">
                  <p className="text-white font-bold text-sm mb-1">Mascot nhắc bạn học!</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#c4b5fd" }}>
                    {focusedTopicName
                      ? `Hôm nay hãy tập trung vào "${focusedTopicName}" nhé! Bạn đang làm rất tốt, đừng bỏ cuộc!`
                      : "Hãy bắt đầu hành trình học tập của bạn! Làm bài kiểm tra đầu vào để Routex AI tạo lộ trình riêng cho bạn!"}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="glass rounded-3xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>Thống kê học tập</p>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Điểm gần nhất" value={`${lastScore}%`} color={subjectGradient} />
                <StatCard label="Tổng giờ học" value={`${totalStudyTime}m`} color="linear-gradient(135deg, #f59e0b, #f97316)" />
                <StatCard label="Chủ đề mạnh" value={`${strongCount}`} color="linear-gradient(135deg, #10b981, #06b6d4)" />
                <StatCard label="Cần cải thiện" value={`${weakCount}`} color="linear-gradient(135deg, #ef4444, #f97316)" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ===== FOCUS TAB (default) ===== */}

            {/* Focus header */}
            <div className="mb-6" style={cardStyle(1)}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Đang học</p>
              <h1 className="text-white font-black text-2xl leading-tight">
                Lớp {cfg?.grade}: <span className="gradient-text">{subjectLabel}</span>
              </h1>
            </div>

            {/* Topic focused this week card */}
            {hasValidRoadmap && focusedTopic && (
              <div className="rounded-3xl p-5 mb-4 relative overflow-hidden" style={{
                ...cardStyle(2),
                background: "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(99,102,241,0.12))",
                border: "1px solid rgba(139,92,246,0.3)",
              }}>
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl"
                  style={{ background: "linear-gradient(90deg, #8b5cf6, #6366f1)" }} />

                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
                    ◈ Topic focused this week
                  </span>
                  {timeLeft && !timeLeft.expired && (
                    <span className="text-xs font-bold" style={{ color: timeLeft.days <= 3 ? "#f87171" : "#a3e635" }}>
                      ⏱ {timeLeft.days}d {timeLeft.hours}h
                    </span>
                  )}
                  {timeLeft?.expired && (
                    <span className="text-xs font-bold" style={{ color: "#f87171" }}>Hết hạn!</span>
                  )}
                </div>

                <div className="flex items-start gap-3 mb-3">
                  <MascotDisplay avatarData={avatarData} size={40} />
                  <div className="flex-1">
                    <p className="text-white font-black text-lg leading-tight">{focusedTopic.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#c4b5fd" }}>
                      Tuần {currentWeek.week} · {currentWeek.theme}
                    </p>
                  </div>
                </div>

                {focusedTopic.subtopics?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {focusedTopic.subtopics.slice(0, 4).map((st: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.2)" }}>
                        {st}
                      </span>
                    ))}
                  </div>
                )}

                {focusedTopic.key_idea && (
                  <p className="text-xs mb-4 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", color: "#e2e8f0" }}>
                    💡 {focusedTopic.key_idea}
                  </p>
                )}

                <div className="flex gap-2">
                  <button onClick={() => goToTopicTest(focusedTopicName || undefined, currentWeek?.week)}
                    className="flex-1 py-3 font-black text-white text-sm rounded-2xl transition-all active:scale-98"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", boxShadow: "0 6px 24px rgba(139,92,246,0.3)" }}>
                    Mini Test chủ đề này →
                  </button>
                  <span className="flex items-center px-3 text-xs font-bold" style={{ color: "#c4b5fd" }}>
                    5 câu
                  </span>
                </div>
              </div>
            )}

            {/* Active Roadmap Card */}
            {hasValidRoadmap ? (
              <div className="rounded-3xl p-5 mb-4 relative overflow-hidden" style={{
                ...cardStyle(3),
                background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.12))",
                border: "1px solid rgba(99,102,241,0.25)",
                boxShadow: "0 20px 60px rgba(59,130,246,0.1)"
              }}>
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl"
                  style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }} />

                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(99,102,241,0.2)", color: "#a78bfa", border: "1px solid rgba(99,102,241,0.3)" }}>
                    ◈ LỘ TRÌNH HIỆN TẠI
                  </span>
                  <button onClick={() => router.push(`/roadmap?id=${latestRoadmap.roadmap_id}`)}
                    className="text-xs font-semibold transition-colors"
                    style={{ color: "var(--text-secondary)" }}>
                    Xem đầy đủ →
                  </button>
                </div>

                <p className="text-white font-black text-lg mb-1">{latestRoadmap.scenario_name}</p>
                {currentWeek && (
                  <>
                    <p className="text-sm mb-3" style={{ color: "#93c5fd" }}>Tuần {currentWeek.week}/{totalWeeks}: {currentWeek.theme}</p>
                    <div className="space-y-2 mb-4">
                      {currentWeek.topics.slice(0, 3).map((t: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.06)" }}>
                          <span className="text-xs font-black w-4" style={{ color: "rgba(147,197,253,0.6)" }}>{i + 1}</span>
                          <span className="text-white text-xs font-medium flex-1">{t.name}</span>
                          <span className="text-xs" style={{ color: "rgba(147,197,253,0.5)" }}>⏱ {t.time_minutes}p</span>
                        </div>
                      ))}
                      {currentWeek.topics.length > 3 && (
                        <p className="text-center text-xs" style={{ color: "rgba(147,197,253,0.4)" }}>+{currentWeek.topics.length - 3} chủ đề nữa</p>
                      )}
                    </div>
                  </>
                )}
                <button onClick={() => goToTopicTest(focusedTopicName || undefined, currentWeek?.week)}
                  className="w-full py-3 font-black text-sm rounded-2xl transition-all active:scale-98"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", boxShadow: "0 6px 24px rgba(59,130,246,0.3)" }}>
                  Làm bài kiểm tra tuần này →
                </button>
              </div>
            ) : (
              <div className="glass rounded-3xl p-6 mb-4 text-center" style={{ ...cardStyle(3), border: "1px dashed rgba(255,255,255,0.1)" }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl mx-auto mb-4"
                  style={{ background: "rgba(255,255,255,0.05)" }}>◎</div>
                <p className="text-white font-bold mb-1">Chưa có lộ trình AI</p>
                <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>Làm bài kiểm tra để Gemini tạo lộ trình cá nhân hóa cho bạn!</p>
                <button onClick={() => goToTopicTest()}
                  className="px-6 py-3 font-black text-white rounded-2xl text-sm"
                  style={{ background: subjectGradient, boxShadow: "0 8px 24px rgba(99,102,241,0.3)" }}>
                  Bắt đầu kiểm tra →
                </button>
              </div>
            )}

            {/* Progress Card */}
            <div className="glass rounded-3xl p-5 mb-4" style={cardStyle(4)}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    CURRENT FOCUS
                  </span>
                  <h2 className="text-white font-black text-lg mt-2 leading-snug">
                    {inProgress ? inProgress.topic : `${cfg?.subject || "Môn học"} của bạn`}
                  </h2>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {cfg?.mode === "exam" ? "Chế độ thi cử" : "Học toàn diện"} · Tuần {inProgress?.week || 1}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black text-white flex-shrink-0"
                  style={{ background: subjectGradient }}>
                  {subjectIcon}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total Progress</span>
                  <span className="font-black text-white">{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full progress-fill" data-width={`${progress}%`}
                    style={{ width: "0%", background: subjectGradient }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <StatCard label="Modules" value={`${strongCount}/${totalTopics}`} color={subjectGradient} />
                <StatCard label="Score" value={`${lastScore}%`} color="linear-gradient(135deg, #10b981, #06b6d4)" />
                <StatCard label="Time" value={`${totalStudyTime}m`} color="linear-gradient(135deg, #f59e0b, #f97316)" />
              </div>

              <div className="flex gap-2">
                <button onClick={() => goToTopicTest(focusedTopicName || undefined, currentWeek?.week)}
                  className="flex-1 py-3 font-black text-white rounded-2xl text-sm transition-all active:scale-98"
                  style={{ background: subjectGradient, boxShadow: "0 6px 24px rgba(99,102,241,0.2)" }}>
                  Continue →
                </button>
                {hasValidRoadmap && (
                  <button onClick={() => router.push(`/roadmap?id=${latestRoadmap.roadmap_id}`)}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm transition-all"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}>
                    ◎
                  </button>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3 mb-4" style={cardStyle(5)}>
              <div className="glass rounded-3xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Daily Streak</p>
                <p className="font-black text-2xl leading-none text-white">
                  <AnimatedNumber target={completed.length || 1} />
                  <span className="text-sm ml-1 font-medium" style={{ color: "var(--text-muted)" }}>days</span>
                </p>
                <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min((completed.length / 30) * 100, 100)}%`, background: "linear-gradient(90deg, #f59e0b, #ef4444)" }} />
                </div>
              </div>
              <div className="glass rounded-3xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                  {timeLeft && !timeLeft.expired ? "Còn lại" : "Focus Units"}
                </p>
                {timeLeft && !timeLeft.expired ? (
                  <>
                    <p className="font-black text-2xl leading-none" style={{ color: timeLeft.days <= 3 ? "#f87171" : "white" }}>
                      {timeLeft.days}<span className="text-sm ml-1 font-medium" style={{ color: "var(--text-muted)" }}>ngày</span>
                    </p>
                    <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${Math.min(((totalWeeks * 7 - timeLeft.days) / (totalWeeks * 7)) * 100, 100)}%`, background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }} />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-black text-2xl leading-none text-white">
                      <AnimatedNumber target={weakCount || 0} />
                      <span className="text-sm ml-1 font-medium" style={{ color: "var(--text-muted)" }}>topics</span>
                    </p>
                    <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(((60 - (totalStudyTime % 60)) / 60) * 100, 100)}%`, background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Learning Path */}
            <div className="glass rounded-3xl p-5 mb-4" style={cardStyle(6)}>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>Module Roadmap</p>
              <div className="space-y-2">
                {completed.slice(-2).map((item: any) => (
                  <div key={item.topic} className="flex items-center gap-3 py-2.5 px-3 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <span className="text-[10px] text-emerald-400 font-black">✓</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-through truncate" style={{ color: "var(--text-muted)" }}>{item.topic}</p>
                      <p className="text-[10px]" style={{ color: "rgba(100,116,139,0.6)" }}>Completed · Tuần {item.week}</p>
                    </div>
                  </div>
                ))}

                {inProgress && (
                  <div className="flex items-center gap-3 py-3 px-3 rounded-2xl"
                    style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                      <span className="text-[10px] text-white font-black">▶</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">{inProgress.topic}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#a78bfa" }}>In Progress</p>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  </div>
                )}

                {upcoming.map((item: any, i: number) => (
                  <div key={item.topic + i} className="flex items-center gap-3 py-2.5 px-3 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>◎</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-secondary)" }}>{item.topic}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Up Next · Tuần {item.week}</p>
                    </div>
                  </div>
                ))}

                {learningPath.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-3xl mb-2">◎</p>
                    <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>Chưa có lộ trình. Hãy làm bài kiểm tra!</p>
                    <button onClick={() => router.push("/test")}
                      className="px-5 py-2 font-bold text-white text-sm rounded-xl"
                      style={{ background: subjectGradient }}>
                      Bắt đầu ngay
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Weak Topics */}
            {dash?.weak_topics?.length ? (
              <div className="glass rounded-3xl p-5 mb-4" style={cardStyle(7)}>
                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>◈ Cần Tập Trung</p>
                <div className="space-y-3">
                  {dash.weak_topics.slice(0, 5).map((t: any) => (
                    <div key={t.topic} className="flex items-center gap-3">
                      <p className="text-sm flex-1 truncate" style={{ color: "var(--text-secondary)" }}>{t.topic}</p>
                      <div className="w-20 h-1 rounded-full overflow-hidden flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full progress-fill" data-width={`${t.mastery}%`}
                          style={{ width: "0%", background: "linear-gradient(90deg, #ef4444, #f97316)" }} />
                      </div>
                      <span className="text-xs font-bold w-8 text-right flex-shrink-0" style={{ color: "#f87171" }}>{t.mastery}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40"
        style={{ background: "rgba(7,8,15,0.85)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-md mx-auto flex items-center justify-around px-4 py-3">
          {([
            { id: "focus", label: "Focus", icon: "◉" },
            { id: "test", label: "Test", icon: "◎" },
            { id: "roadmap", label: "Roadmap", icon: "◈" },
            { id: "profile", label: "Profile", icon: "○" },
          ] as const).map((tab) => (
            <button key={tab.id}
              onClick={() => {
                if (tab.id === "test") goToTopicTest(focusedTopicName || undefined, currentWeek?.week);
                else if (tab.id === "roadmap") hasValidRoadmap ? router.push(`/roadmap?id=${latestRoadmap.roadmap_id}`) : goToTopicTest();
                else setActiveTab(tab.id);
              }}
              className="flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all"
              style={activeTab === tab.id
                ? { background: "rgba(99,102,241,0.15)", color: "#a78bfa" }
                : { color: "var(--text-muted)" }}>
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <ChatBot userContext={chatContext} />
    </div>
  );
}
