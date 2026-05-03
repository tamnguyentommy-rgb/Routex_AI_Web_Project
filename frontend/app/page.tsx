"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "../src/contexts/auth";
import api from "../src/lib/api";

const HERO_IMG = "https://images.pexels.com/photos/9159001/pexels-photo-9159001.jpeg?auto=compress&cs=tinysrgb&w=1200";

const STATS = [
  { value: "4 môn", label: "Toán · Lý · Hoá · Sinh" },
  { value: "Lớp 10–12", label: "Chương trình THPT" },
  { value: "AI", label: "Cá nhân hoá thực sự" },
  { value: "THPT", label: "Format đề chuẩn quốc gia" },
];

const FEATURES = [
  {
    icon: "🗺",
    title: "Lộ trình cá nhân hoá",
    desc: "Routex phân tích mục tiêu, thời gian và năng lực để tạo kế hoạch học theo tuần — không copy-paste cho mọi học sinh.",
    color: "#3b82f6",
  },
  {
    icon: "📊",
    title: "Đánh giá thích nghi",
    desc: "Mini-test hàng tuần tự động phát hiện điểm yếu và điều chỉnh độ khó, giúp bạn cải thiện đúng chỗ cần cải thiện.",
    color: "#8b5cf6",
  },
  {
    icon: "🤖",
    title: "Gia sư AI 24/7",
    desc: "Hỏi bất cứ câu gì khi đọc lý thuyết — AI trả lời tức thì, có context, không cần tìm kiếm thêm.",
    color: "#10b981",
  },
  {
    icon: "📝",
    title: "Thi thử THPT",
    desc: "50 câu, 90 phút, thang điểm 10. Đề được tạo từ ngân hàng câu hỏi + AI bổ sung, sát đề thi thật.",
    color: "#f59e0b",
  },
  {
    icon: "🔁",
    title: "Ôn tập thông minh (SM-2)",
    desc: "Hệ thống nhắc bạn ôn đúng lúc sắp quên, dựa trên thuật toán Spaced Repetition khoa học.",
    color: "#ec4899",
  },
  {
    icon: "🌅",
    title: "Briefing hàng ngày",
    desc: "Mỗi sáng có tóm tắt tiến độ và gợi ý học cho ngày hôm nay từ mascot AI của bạn.",
    color: "#06b6d4",
  },
];

const STEPS = [
  { num: "01", title: "Tạo tài khoản", desc: "Đăng ký miễn phí trong 30 giây, không cần thẻ tín dụng." },
  { num: "02", title: "Cấu hình mục tiêu", desc: "Chọn môn, lớp, điểm mục tiêu và thời gian học mỗi ngày." },
  { num: "03", title: "Bắt đầu học", desc: "Routex tạo lộ trình và mini-test ngay, bắt đầu từ hôm nay." },
];

export default function Home() {
  const [showAuth, setShowAuth] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warming, setWarming] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let done = false;
    const ping = async () => {
      try {
        const start = Date.now();
        await api.ping();
        if (!done && Date.now() - start < 3000) setWarming(false);
      } catch { } finally { done = true; setWarming(false); }
    };
    timer = setTimeout(() => { if (!done) setWarming(true); }, 2000);
    ping();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!showAuth) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowAuth(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [showAuth]);

  const openAuth = (m: "login" | "signup") => {
    setMode(m); setError(""); setUsername(""); setPassword("");
    setShowAuth(true);
  };

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = mode === "login"
        ? await api.login(username, password)
        : await api.signup(username, password);
      const { access_token, user } = res.data;
      login(user, access_token);
      try { await api.getConfig(user.id); router.push("/dashboard"); }
      catch { router.push("/onboarding/subject"); }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Có lỗi xảy ra!");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: "#070b14", color: "#f1f5f9" }}>

      {/* ── NAVBAR ──────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(7,11,20,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "none",
        }}>
        <nav className="max-w-7xl mx-auto px-5 lg:px-10 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base text-white"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #059669)" }}>
              R
            </div>
            <span className="text-white font-black text-lg tracking-tight">Routex</span>
          </div>

          {/* Nav links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-7">
            {["Tính năng", "Lộ trình", "Thi thử"].map((label) => (
              <button key={label} className="text-sm font-medium transition-colors hover:text-white"
                style={{ color: "rgba(148,163,184,0.8)" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={() => openAuth("login")}
              className="hidden sm:block px-4 py-2 text-sm font-semibold rounded-xl transition-all hover:text-white"
              style={{ color: "#94a3b8", background: "transparent" }}>
              Đăng nhập
            </button>
            <button
              onClick={() => openAuth("signup")}
              className="px-4 py-2 text-sm font-bold rounded-xl text-white transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #1d4ed8, #059669)",
                boxShadow: "0 4px 18px rgba(29,78,216,0.35)",
              }}>
              Bắt đầu miễn phí
            </button>
          </div>
        </nav>
      </header>

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">

        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src={HERO_IMG}
            alt="Student studying"
            className="w-full h-full object-cover object-center"
            style={{ filter: "brightness(0.22) saturate(0.6)" }}
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, rgba(7,11,20,0.92) 0%, rgba(7,11,20,0.55) 100%)" }} />
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse 80% 60% at 20% 50%, rgba(29,78,216,0.22) 0%, transparent 70%)" }} />
          {/* Aurora nebula top-right */}
          <div className="absolute" style={{ width: 800, height: 800, top: -300, right: -300, background: "radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)", borderRadius: "50%", animation: "float 14s ease-in-out infinite" }} />
          {/* Aurora nebula bottom-left */}
          <div className="absolute" style={{ width: 600, height: 600, bottom: -200, left: -200, background: "radial-gradient(circle, rgba(16,185,129,0.10), transparent 70%)", borderRadius: "50%", animation: "float 18s ease-in-out infinite", animationDelay: "6s" }} />
          <div className="absolute bottom-0 left-0 right-0 h-48"
            style={{ background: "linear-gradient(to top, #070b14, transparent)" }} />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-10 pt-28 pb-24 w-full">
          <div className="max-w-3xl">

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-7"
              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#6ee7b7" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#34d399" }} />
              Dành cho học sinh THPT lớp 10 – 12 · Toán · Lý · Hoá · Sinh
            </div>

            <h1 className="font-black tracking-tight leading-[1.06] mb-6"
              style={{ fontSize: "clamp(2.4rem, 5.5vw, 4rem)" }}>
              Lộ trình học THPT
              <br />
              <span style={{
                backgroundImage: "linear-gradient(135deg, #60a5fa 0%, #34d399 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>được cá nhân hoá</span>
              <br />
              bởi AI — cho từng em.
            </h1>

            <p className="text-lg mb-10 max-w-xl leading-relaxed" style={{ color: "#94a3b8" }}>
              Routex phân tích mục tiêu, thời gian và năng lực của bạn để tạo kế hoạch học thực tế,
              đo tiến bộ bằng bài kiểm tra thích nghi mỗi tuần.
            </p>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => openAuth("signup")}
                className="px-7 py-3.5 text-white font-bold rounded-2xl text-base transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #1d4ed8, #059669)", boxShadow: "0 12px 40px rgba(29,78,216,0.4)" }}>
                Bắt đầu miễn phí →
              </button>
              <button onClick={() => openAuth("login")}
                className="px-7 py-3.5 font-semibold rounded-2xl text-base transition-all hover:border-white/20"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#cbd5e1" }}>
                Đăng nhập
              </button>
            </div>

            {warming && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-amber-300 text-xs"
                style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                <span className="w-3 h-3 rounded-full border-2 border-amber-300/40 border-t-amber-300 inline-block"
                  style={{ animation: "spin 1s linear infinite" }} />
                Máy chủ đang khởi động…
              </div>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 opacity-40">
          <span className="text-xs" style={{ color: "#64748b" }}>Cuộn xuống</span>
          <div className="w-px h-8" style={{ background: "linear-gradient(to bottom, #64748b, transparent)" }} />
        </div>
      </section>

      {/* ── STATS BAR ──────────────────────────────── */}
      <section style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-7xl mx-auto px-5 lg:px-10 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x" style={{ "--divide-color": "rgba(255,255,255,0.07)" } as any}>
            {STATS.map((s) => (
              <div key={s.value} className="text-center lg:px-8">
                <p className="text-2xl font-black text-white mb-1">{s.value}</p>
                <p className="text-xs" style={{ color: "#64748b" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 lg:px-10">

          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#3b82f6" }}>
              Tính năng
            </p>
            <h2 className="text-3xl lg:text-4xl font-black text-white mb-4">
              Mọi thứ bạn cần để ôn thi THPT
            </h2>
            <p className="max-w-xl mx-auto" style={{ color: "#64748b" }}>
              Routex kết hợp AI, khoa học học tập và nội dung chương trình SGK thành một nền tảng duy nhất.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title}
                className="rounded-2xl p-6 group transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-5"
                  style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}>
                  {f.icon}
                </div>
                <h3 className="text-white font-bold text-base mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────── */}
      <section className="py-20 lg:py-24" style={{ background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-7xl mx-auto px-5 lg:px-10">

          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#10b981" }}>
              Bắt đầu thế nào
            </p>
            <h2 className="text-3xl lg:text-4xl font-black text-white">Chỉ 3 bước để bắt đầu</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-10 max-w-4xl mx-auto">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+28px)] right-0 h-px"
                    style={{ background: "rgba(255,255,255,0.07)" }} />
                )}
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg mb-4 mx-auto"
                    style={{
                      background: "linear-gradient(135deg, rgba(29,78,216,0.25), rgba(5,150,105,0.25))",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#60a5fa",
                    }}>
                    {s.num}
                  </div>
                  <h3 className="text-white font-bold text-base mb-2">{s.title}</h3>
                  <p className="text-sm" style={{ color: "#64748b" }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button onClick={() => openAuth("signup")}
              className="px-8 py-4 text-white font-bold rounded-2xl text-base transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #059669)", boxShadow: "0 12px 40px rgba(29,78,216,0.35)" }}>
              Tạo tài khoản miễn phí →
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-5 lg:px-10 py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm text-white"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #059669)" }}>
              R
            </div>
            <div>
              <p className="text-white font-bold text-sm">Routex</p>
              <p className="text-xs" style={{ color: "#475569" }}>Một sản phẩm của Mio and Midoru</p>
            </div>
          </div>
          <p className="text-xs" style={{ color: "#475569" }}>
            © {new Date().getFullYear()} Routex · Mio and Midoru · Dành cho học sinh THPT Việt Nam
          </p>
        </div>
      </footer>

      {/* ── AUTH MODAL ─────────────────────────────── */}
      {showAuth && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAuth(false); }}>

          <div ref={modalRef}
            className="w-full max-w-sm rounded-3xl p-8 relative"
            style={{
              background: "#0f1623",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
              animation: "modalIn 0.22s ease",
            }}>

            {/* Close */}
            <button onClick={() => setShowAuth(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full transition-colors text-lg"
              style={{ color: "#64748b", background: "rgba(255,255,255,0.05)" }}>
              ×
            </button>

            {/* Header */}
            <div className="mb-7">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white mb-5"
                style={{ background: "linear-gradient(135deg, #1d4ed8, #059669)" }}>
                R
              </div>
              <h2 className="text-xl font-black text-white">
                {mode === "login" ? "Chào mừng trở lại" : "Bắt đầu hành trình"}
              </h2>
              <p className="text-sm mt-1" style={{ color: "#64748b" }}>
                {mode === "login"
                  ? "Đăng nhập vào Routex để tiếp tục."
                  : "Tạo tài khoản miễn phí, không cần thẻ tín dụng."}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl p-1 mb-6 gap-1"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {(["login", "signup"] as const).map((m) => (
                <button key={m}
                  onClick={() => { setMode(m); setError(""); }}
                  className="flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200"
                  style={mode === m
                    ? { background: "linear-gradient(135deg, #1d4ed8, #059669)", color: "#fff", boxShadow: "0 4px 14px rgba(29,78,216,0.35)" }
                    : { color: "#64748b", background: "transparent" }}>
                  {m === "login" ? "Đăng nhập" : "Đăng ký"}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handle} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: "#64748b" }}>Tên đăng nhập</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  required placeholder="vd: nguyenvana" autoComplete="username"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
                  onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: "#64748b" }}>Mật khẩu</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="Tối thiểu 6 ký tự"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
                  onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                  <span className="flex-shrink-0 mt-0.5">⚠</span> {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3.5 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 mt-1"
                style={{ background: "linear-gradient(135deg, #1d4ed8, #059669)", boxShadow: "0 8px 28px rgba(29,78,216,0.35)" }}>
                {loading
                  ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" style={{ animation: "spin 1s linear infinite" }} />
                    Đang xử lý…
                  </span>
                  : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
              </button>
            </form>

            <p className="text-center text-[11px] mt-5" style={{ color: "#334155" }}>
              Khi tiếp tục, bạn đồng ý với điều khoản sử dụng của Routex.
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
