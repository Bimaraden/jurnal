import React, { useState } from "react";
import { ArrowLeft, KeyRound, AlertCircle, Sparkles, Feather } from "lucide-react";
import { motion } from "motion/react";

interface TeacherLoginProps {
  onLoginSuccess: (token: string, teacher: any) => void;
  onBackToStudent: () => void;
}

export default function TeacherLogin({ onLoginSuccess, onBackToStudent }: TeacherLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/teacher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal masuk.");
      } else {
        onLoginSuccess(data.token, data.teacher);
      }
    } catch (err) {
      setError("Koneksi gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-[#111111] flex items-center justify-center p-6 relative font-sans">
      
      <div className="w-full max-w-md relative">
        {/* BACK TO STUDENT PORTAL */}
        <button
          onClick={onBackToStudent}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#111111] bg-[#FFFFFF] hover:bg-[#111111] hover:text-[#FFFFFF] mb-6 transition-all cursor-pointer px-4 py-2.5 border-3 border-[#111111] shadow-[3px_3px_0px_#111111] hover:shadow-[1px_1px_0px_#111111] font-mono"
        >
          <ArrowLeft className="h-4 w-4 stroke-[3px]" />
          Portal Pengumpulan Siswa
        </button>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[#FFFFFF] border-3 border-[#111111] p-8 md:p-10 shadow-[6px_6px_0px_#111111] relative"
        >
          {/* Top visual zine block */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-[#111111]" />

          {/* BRANDING */}
          <div className="flex items-center gap-2.5 mb-8 mt-2">
            <span className="text-[10px] font-bold text-[#FFFFFF] bg-[#111111] border border-[#111111] px-2.5 py-0.5 uppercase font-mono">
              REDAKTUR SMAN 90 JAKARTA
            </span>
          </div>

          <div className="mb-6">
            <h1 className="font-sans font-black text-xl md:text-2xl text-[#111111] uppercase tracking-tight">
              Masuk Konsol Pengawas
            </h1>
            <p className="text-xs text-[#111111] mt-2 leading-relaxed font-semibold">
              Autentikasi menggunakan akun pembina, pengawas, atau redaktur ekskul Jurnalistik.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                Email Pengawas
              </label>
              <input
                id="email"
                type="email"
                placeholder="guru@jurnalistik.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] text-sm focus:outline-none focus:border-[#18A558] focus:shadow-[3px_3px_0px_#FFD21F] transition-all text-[#111111] placeholder:text-[#888888] rounded-none font-semibold"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                Sandi Keamanan
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] text-sm focus:outline-none focus:border-[#18A558] focus:shadow-[3px_3px_0px_#FFD21F] transition-all text-[#111111] placeholder:text-[#888888] rounded-none font-semibold"
                required
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-2.5 p-4 bg-[#111111] border-3 border-[#111111] text-xs text-[#FFFFFF] font-mono"
              >
                <AlertCircle className="h-5 w-5 shrink-0 text-[#FFD21F]" />
                <span className="font-bold uppercase">{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-5 bg-[#FFD21F] hover:bg-[#18A558] hover:text-[#FFFFFF] text-[#111111] font-black text-xs uppercase tracking-widest border-3 border-[#111111] shadow-[4px_4px_0px_#111111] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer mt-2 flex items-center justify-center gap-2 font-mono"
            >
              <KeyRound className="h-4 w-4 stroke-[3px]" />
              {loading ? "MENANDATANGANI SESI..." : "MASUK KONSOL PENGAWAS"}
            </button>
          </form>

          {/* HELP NOTE */}
          <div className="mt-8 pt-6 border-t-3 border-dashed border-[#111111] flex flex-col gap-2.5 text-xs text-[#111111] bg-[#FFD21F]/10 p-4 border-2 border-[#111111] font-mono">
            <div className="flex items-center gap-1.5 text-[#111111] font-black text-[10px] tracking-wider uppercase">
              <Sparkles className="h-4 w-4 text-[#18A558]" />
              KREDENSIAL DEMO:
            </div>
            <div className="text-[11px] space-y-1 font-semibold">
              <div>Email: <code className="bg-[#FFFFFF] px-1.5 py-0.5 border border-[#111111] text-[#111111]">guru@jurnalistik.com</code></div>
              <div>Sandi: <code className="bg-[#FFFFFF] px-1.5 py-0.5 border border-[#111111] text-[#111111]">guruadmin123</code></div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
