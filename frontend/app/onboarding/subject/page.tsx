"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../src/contexts/auth";
import { useEffect, useState } from "react";

const SUBJECTS = [
  {
    id: "Toán", label: "Toán học", emoji: "∑", tag: "Mathematics",
    desc: "Đại số · Hình học · Giải tích",
    gradient: "linear-gradient(135deg, #3b82f6, #6366f1)",
    glow: "rgba(59,130,246,0.3)",
  },
  {
    id: "Lý", label: "Vật lý", emoji: "⚡", tag: "Physics",
    desc: "Cơ học · Điện từ · Quang học",
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    glow: "rgba(245,158,11,0.3)",
  },
  {
    id: "Hóa", label: "Hóa học", emoji: "⬡", tag: "Chemistry",
    desc: "Vô cơ · Hữu cơ · Hóa lý",
    gradient: "linear-gradient(135deg, #10b981, #06b6d4)",
    glow: "rgba(16,185,129,0.3)",
  },
  {
    id: "Sinh", label: "Sinh học", emoji: "◉", tag: "Biology",
    desc: "Tế bào · Di truyền · Tiến hóa",
    gradient: "linear-gradient(135deg, #14b8a6, #8b5cf6)",
    glow: "rgba(20,184,166,0.3)",
  },
];

export default function SubjectPage() {
  const router = useRouter();
  const { user, isLoaded } = useAuth();
  const [hovered, setHovered] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoaded && !user) router.push("/");
    setTimeout(() => setVisible(true), 50);
  }, [isLoaded, user]);

  const pick = (subject: string) => {
    sessionStorage.setItem("subject", subject);
    router.push("/onboarding/config");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 noise-bg relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.15) 0%, transparent 70%), #07080f" }}>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-48 opacity-20"
        style={{ background: "linear-gradient(to bottom, transparent, #6366f1, transparent)" }} />

      <div className="relative z-10 w-full max-w-2xl">
        <div className="text-center mb-12"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)", transition: "all 0.6s ease" }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#a78bfa" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Bước 1 / 2 · Chọn môn học
          </div>
          <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
            Bạn muốn học <span className="gradient-text">môn nào?</span>
          </h1>
          <p style={{ color: "var(--text-secondary)" }} className="text-base">
            {user && <>Xin chào, <strong className="text-white">{user.username}</strong> · </>}
            Chọn một môn để Routex tạo lộ trình cá nhân hóa cho bạn
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {SUBJECTS.map((sub, i) => (
            <button key={sub.id} onClick={() => pick(sub.id)}
              onMouseEnter={() => setHovered(sub.id)}
              onMouseLeave={() => setHovered(null)}
              className="relative overflow-hidden rounded-3xl p-6 text-left group"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: hovered === sub.id ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.06)",
                boxShadow: hovered === sub.id ? `0 20px 60px ${sub.glow}` : "none",
                transform: hovered === sub.id ? "translateY(-4px) scale(1.02)" : "none",
                transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                opacity: visible ? 1 : 0,
                transitionDelay: `${i * 80}ms`,
              }}>

              {/* Gradient accent top bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl"
                style={{ background: sub.gradient, opacity: hovered === sub.id ? 1 : 0.4, transition: "opacity 0.25s" }} />

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white mb-5 shadow-lg"
                style={{ background: sub.gradient, boxShadow: `0 8px 32px ${sub.glow}` }}>
                {sub.emoji}
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{sub.tag}</p>
                  <h2 className="text-white font-black text-xl mb-1.5">{sub.label}</h2>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{sub.desc}</p>
                </div>
                <div className="mt-1 text-lg transition-all duration-200"
                  style={{ opacity: hovered === sub.id ? 1 : 0, transform: hovered === sub.id ? "translateX(0)" : "translateX(-8px)", color: "var(--text-secondary)" }}>
                  →
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mt-10">
          <span className="h-1.5 w-10 rounded-full" style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }} />
          <span className="h-1.5 w-4 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
        </div>
      </div>
    </div>
  );
}
