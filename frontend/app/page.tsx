"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../src/contexts/auth";
import api from "../src/lib/api";

export default function Home() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = mode === "login"
        ? await api.login(username, password)
        : await api.signup(username, password);
      const { access_token, user } = res.data;
      login(user, access_token);
      try {
        await api.getConfig(user.id);
        router.push("/dashboard");
      } catch {
        router.push("/onboarding/subject");
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Có lỗi xảy ra!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden noise-bg"
      style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.18) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(59,130,246,0.12) 0%, transparent 60%), #07080f" }}>

      {/* Ambient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #6366f1, transparent)" }} />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 shadow-2xl animate-float"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 20px 60px rgba(99,102,241,0.4)" }}>
            <span className="text-2xl">🚀</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-1">Routex <span className="gradient-text">AI</span></h1>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm">Lộ trình học thông minh · Powered by Gemini</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-7 shadow-2xl animate-fade-up" style={{ animationDelay: "0.1s" }}>
          {/* Tabs */}
          <div className="flex rounded-2xl p-1 mb-7" style={{ background: "rgba(255,255,255,0.05)" }}>
            {(["login", "signup"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200"
                style={mode === m
                  ? { background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff", boxShadow: "0 4px 20px rgba(59,130,246,0.3)" }
                  : { color: "var(--text-secondary)" }}>
                {m === "login" ? "Đăng nhập" : "Đăng ký"}
              </button>
            ))}
          </div>

          <form onSubmit={handle} className="space-y-4">
            {[
              { label: "Tên đăng nhập", value: username, onChange: setUsername, type: "text", placeholder: "Nhập tên đăng nhập..." },
              { label: "Mật khẩu", value: password, onChange: setPassword, type: "password", placeholder: "Nhập mật khẩu..." },
            ].map(({ label, value, onChange, type, placeholder }) => (
              <div key={label}>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{label}</label>
                <input
                  type={type} value={value} onChange={e => onChange(e.target.value)} required placeholder={placeholder}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.6)"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
                />
              </div>
            ))}

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-red-400 text-sm"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <span>⚠</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 text-white font-bold rounded-xl text-sm transition-all duration-200 disabled:opacity-50 mt-2"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 8px 32px rgba(99,102,241,0.3)" }}
              onMouseOver={e => !loading && ((e.target as HTMLElement).style.transform = "translateY(-1px)", (e.target as HTMLElement).style.boxShadow = "0 12px 40px rgba(99,102,241,0.4)")}
              onMouseOut={e => ((e.target as HTMLElement).style.transform = "", (e.target as HTMLElement).style.boxShadow = "0 8px 32px rgba(99,102,241,0.3)")}>
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" style={{ animation: "spin 1s linear infinite" }} />Đang xử lý...</span>
                : mode === "login" ? "Đăng nhập →" : "Tạo tài khoản →"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
          XGBoost · Gemini AI · Personalized Learning
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
