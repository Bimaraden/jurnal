import React, { useState } from "react";
import { ArrowRight, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface StudentVerifyProps {
  onVerifySuccess: (student: any, token: string) => void;
  onAdminTrigger?: () => void;
}

export default function StudentVerify({ onVerifySuccess, onAdminTrigger }: StudentVerifyProps) {
  const [nisn, setNisn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedNisn = nisn.trim();
    if (!trimmedNisn) {
      setError("NISN wajib diisi.");
      return;
    }

    // Direct routing for admin trigger key
    if (trimmedNisn === "N4Z-205") {
      if (onAdminTrigger) {
        onAdminTrigger();
      }
      return;
    }

    if (trimmedNisn.length !== 10 || isNaN(Number(trimmedNisn))) {
      setError("NISN harus terdiri dari 10 digit angka.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/student/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nisn: trimmedNisn }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memverifikasi NISN.");
      } else {
        onVerifySuccess(data.student, data.token);
      }
    } catch (err) {
      setError("Koneksi ke server gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-[#111111] flex flex-col items-center justify-center p-6 relative font-sans">
      
      {/* Identification Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-[#FFFFFF] border-3 border-[#111111] p-8 md:p-10 shadow-[6px_6px_0px_#111111] relative"
      >
        {/* Top colored thick header banner to give a poster/zine look */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-[#111111]" />

        <div className="mb-8 mt-2">
          <h2 className="font-sans font-black text-xl tracking-tight uppercase">Autentikasi Anggota</h2>
          <p className="text-xs text-[#111111] mt-2 font-medium">
            Masukkan 10 digit NISN Anda untuk masuk ke sistem penugasan dan memeriksa tenggat pengumpulan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="nisn" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
              Nomor Induk Siswa Nasional (NISN)
            </label>
            <input
              id="nisn"
              type="text"
              maxLength={10}
              placeholder="0012345678"
              value={nisn}
              onChange={(e) => {
                const val = e.target.value;
                setNisn(val);
                if (val.trim() === "N4Z-205") {
                  if (onAdminTrigger) {
                    onAdminTrigger();
                  }
                }
              }}
              disabled={loading}
              className="w-full px-4 py-3.5 bg-[#FFFFFF] border-3 border-[#111111] text-lg text-[#111111] font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:text-[#888888] focus:outline-none focus:bg-[#FFFFFF] focus:border-[#18A558] focus:shadow-[4px_4px_0px_#FFD21F] transition-all rounded-none"
              required
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-2.5 p-4 bg-[#111111] border-3 border-[#111111] text-xs text-[#FFFFFF]"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-[#FFD21F]" />
              <span className="font-bold uppercase font-mono">{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-5 bg-[#FFD21F] hover:bg-[#18A558] hover:text-[#FFFFFF] disabled:opacity-50 text-[#111111] font-black text-xs uppercase tracking-widest border-3 border-[#111111] shadow-[4px_4px_0px_#111111] hover:shadow-[2px_2px_0px_#111111] active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
          >
            {loading ? "MEMVERIFIKASI..." : "AKSES PENUGASAN"}
            <ArrowRight className="h-4 w-4 stroke-[3px]" />
          </button>
        </form>
      </motion.div>
      
      <div className="mt-8 text-[10px] text-[#111111]/60 font-bold uppercase tracking-wider font-mono text-center max-w-xs leading-relaxed">
        EKSKUL JURNAL SMAN 90 JAKARTA <br />
        <span className="text-[#18A558]">MADE BY PIJARDEV</span>
      </div>
    </div>
  );
}
