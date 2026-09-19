import React, { useEffect, useState } from "react";
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Search,
  Eye,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Layers,
  Check,
  Feather,
  Database,
  ArrowUpRight,
  X,
  FileText,
  User,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Period, Assignment, Submission, DashboardSummary } from "../../types";

interface DashboardProps {
  token: string;
  onNavigate: (tab: string) => void;
  currentTab: string;
}

export default function Dashboard({ token, onNavigate, currentTab }: DashboardProps) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [stats, setStats] = useState<DashboardSummary | null>(null);
  const [assignments, setAssignments] = useState<(Assignment & { submittedCount: number; totalCount: number })[]>([]);
  const [incompleteStudents, setIncompleteStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // Search, filter and view states
  const [searchQuery, setSearchQuery] = useState("");
  const [submissionFilter, setSubmissionFilter] = useState<"all" | "done" | "pending">("all");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("all");
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [driveStatus, setDriveStatus] = useState<"loading" | "connected" | "disconnected" | "expired">("loading");
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [driveConnectedAt, setDriveConnectedAt] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualRefreshToken, setManualRefreshToken] = useState("");
  const [manualClientId, setManualClientId] = useState("");
  const [manualClientSecret, setManualClientSecret] = useState("");
  const [savingManualToken, setSavingManualToken] = useState(false);
  const [manualTokenError, setManualTokenError] = useState<string | null>(null);

  const fetchDriveStatus = async () => {
    try {
      const res = await fetch("/api/google/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDriveStatus(data.status);
        setDriveEmail(data.teacherEmail || null);
        setDriveConnectedAt(data.connectedAt || null);
      }
    } catch (err) {
      console.error("Failed to fetch Google Drive status:", err);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!window.confirm("Apakah Anda yakin ingin memutuskan koneksi Google Drive? Siswa tidak akan dapat mengunggah berkas langsung ke Drive Anda lagi.")) {
      return;
    }
    try {
      const res = await fetch("/api/google/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDriveStatus("disconnected");
        setDriveEmail(null);
        setDriveConnectedAt(null);
      }
    } catch (err) {
      alert("Gagal memutuskan koneksi.");
    }
  };

  const handleSaveManualToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRefreshToken.trim()) return;

    setSavingManualToken(true);
    setManualTokenError(null);

    try {
      const res = await fetch("/api/google/save-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          refreshToken: manualRefreshToken.trim(),
          clientId: manualClientId.trim() || undefined,
          clientSecret: manualClientSecret.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDriveStatus(data.status);
        setDriveEmail(data.teacherEmail || null);
        setDriveConnectedAt(new Date().toISOString());
        setShowManualInput(false);
        setManualRefreshToken("");
        setManualClientId("");
        setManualClientSecret("");
      } else {
        const errData = await res.json();
        setManualTokenError(errData.error || "Gagal memverifikasi token.");
      }
    } catch (err) {
      setManualTokenError("Terjadi kesalahan koneksi saat memverifikasi token.");
    } finally {
      setSavingManualToken(false);
    }
  };

  useEffect(() => {
    fetchDriveStatus();
  }, [token]);

  // Load initial periods
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const res = await fetch("/api/teacher/periods", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setPeriods(data);
          const active = data.find((p: Period) => p.status === "active") || data[0];
          if (active) {
            setSelectedPeriodId(active.id);
          }
        }
      } catch (err) {
        setError("Gagal memuat periode.");
      }
    };
    fetchPeriods();
  }, [token]);

  // Load stats, assignments, and submissions when period changes
  const fetchDashboardData = async () => {
    if (!selectedPeriodId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch dashboard stats
      const statsRes = await fetch(`/api/teacher/dashboard?periodId=${selectedPeriodId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsRes.json();
      if (statsRes.ok) {
        setStats(statsData.summary);
        setAssignments(statsData.assignments);
        setIncompleteStudents(statsData.incompleteStudents);
      }

      // 2. Fetch all submissions for current period
      const subRes = await fetch(`/api/teacher/submissions?periodId=${selectedPeriodId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const subData = await subRes.json();
      if (subRes.ok) {
        setSubmissions(subData);
      }

      // 3. Fetch all students to match checklists
      const studRes = await fetch("/api/teacher/students", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const studData = await studRes.json();
      if (studRes.ok) {
        setAllStudents(studData);
      }
    } catch (err) {
      setError("Koneksi ke server terputus.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriodId, token]);

  const handleRetryDriveSync = async (submissionId: string) => {
    setSyncingDrive(true);
    try {
      const res = await fetch(`/api/teacher/submissions/${submissionId}/retry-drive`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        alert("Sinkronisasi Google Drive berhasil diselesaikan!");
        setViewingSubmission(data.submission);
        fetchDashboardData(); // Refresh list
      } else {
        alert(data.error || "Gagal sinkronisasi.");
      }
    } catch (err) {
      alert("Koneksi gagal.");
    } finally {
      setSyncingDrive(false);
    }
  };

  const handleExportCSV = () => {
    if (!selectedPeriodId) return;
    window.open(`/api/teacher/export-csv?periodId=${selectedPeriodId}`, "_blank");
  };

  // Compile Checklist Items based on Selected Assignment & Filter
  const checklistItems = allStudents.map((student) => {
    const activeTasks = selectedAssignmentId === "all" 
      ? assignments 
      : assignments.filter((a) => a.id === selectedAssignmentId);

    const taskSubmissions = activeTasks.map((task) => {
      const sub = submissions.find((s) => s.nisn === student.nisn && s.assignmentId === task.id);
      return {
        task,
        submission: sub || null,
        isDone: !!sub,
      };
    });

    const doneCount = taskSubmissions.filter((ts) => ts.isDone).length;
    const isFullyCompleted = activeTasks.length > 0 && doneCount === activeTasks.length;

    return {
      student,
      taskSubmissions,
      doneCount,
      totalCount: activeTasks.length,
      isFullyCompleted,
    };
  });

  // Filter checklist
  const filteredChecklist = checklistItems.filter((item) => {
    const nameMatch =
      item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.student.nisn.includes(searchQuery) ||
      item.student.className.toLowerCase().includes(searchQuery.toLowerCase());

    if (!nameMatch) return false;

    if (submissionFilter === "done") {
      return item.isFullyCompleted;
    }
    if (submissionFilter === "pending") {
      return !item.isFullyCompleted;
    }

    return true;
  });

  return (
    <div className="space-y-6 text-slate-800 font-sans antialiased">
      
      {/* HEADER SECTION WITH PERIOD TOGGLE & CSV EXPORT */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-mono">
              Panel Pengawas v1
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Dashboard Utama</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pantau perkembangan investigasi, kelayakan naskah, serta persentase pengumpulan karya siswa secara terintegrasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Period drop down */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 min-w-[180px] transition-all">
            <Calendar className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="bg-transparent text-slate-700 focus:outline-none w-full cursor-pointer font-medium"
            >
              <option value="" disabled>Pilih Periode</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.status === "active" ? "(Aktif)" : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={!selectedPeriodId || loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            Ekspor CSV
          </button>
        </div>
      </div>

      {/* GOOGLE DRIVE CONNECTION STATUS CARD */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shrink-0 transition-all ${
              driveStatus === "connected" ? "bg-emerald-50 text-emerald-600" :
              driveStatus === "expired" ? "bg-amber-50 text-amber-600" :
              "bg-slate-50 text-slate-500"
            }`}>
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Arsip Cloud Google Drive
                </h3>
                {driveStatus === "loading" && (
                  <span className="text-[10px] font-semibold text-slate-400 font-mono flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="h-3 w-3 animate-spin text-emerald-500" />
                    Memeriksa...
                  </span>
                )}
                {driveStatus === "connected" && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded">
                    Terkoneksi
                  </span>
                )}
                {driveStatus === "expired" && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded animate-pulse">
                    Sesi Habis
                  </span>
                )}
                {driveStatus === "disconnected" && (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                    Belum Terhubung
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {driveStatus === "connected" 
                  ? `Semua liputan dari siswa saat ini disinkronisasikan langsung ke Google Drive pribadi Anda di ${driveEmail || "akun guru"}.`
                  : "Sambungkan penyimpanan Cloud Google Drive agar setiap unggahan naskah, foto, atau PDF siswa terarsip secara teratur ke akun pribadi Anda."}
              </p>
            </div>
          </div>

          <div className="shrink-0 w-full lg:w-auto flex flex-col sm:flex-row gap-2.5 justify-end">
            {driveStatus === "connected" ? (
              <button
                onClick={handleDisconnectDrive}
                className="w-full sm:w-auto px-3.5 py-2 hover:bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                Putuskan Sambungan
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 rounded-lg transition-all cursor-pointer"
                >
                  {showManualInput ? "Sembunyikan Manual" : "Konfigurasi Token Manual"}
                </button>
                <a
                  href="/api/google/auth"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {driveStatus === "expired" ? "Hubungkan Ulang" : "Hubungkan Google Drive"}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Manual Refresh Token Input Form */}
        {showManualInput && driveStatus !== "connected" && (
          <form onSubmit={handleSaveManualToken} className="border-t border-slate-100 pt-5 mt-5 space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <Info className="h-4 w-4 text-emerald-500" />
                <span>Opsi Pengaturan Lanjutan (Bypass Developer)</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Gunakan menu ini jika Anda ingin memasukkan <code className="bg-white px-1.5 py-0.5 rounded border text-emerald-600">Refresh Token</code> secara manual yang didapat dari Google OAuth Playground atau kredensial Google Cloud Anda.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Client ID (Opsional)</label>
                <input
                  type="text"
                  placeholder="Masukkan Client ID Google Cloud Anda..."
                  value={manualClientId}
                  onChange={(e) => setManualClientId(e.target.value)}
                  disabled={savingManualToken}
                  className="px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium placeholder:text-slate-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Client Secret (Opsional)</label>
                <input
                  type="password"
                  placeholder="Masukkan Client Secret..."
                  value={manualClientSecret}
                  onChange={(e) => setManualClientSecret(e.target.value)}
                  disabled={savingManualToken}
                  className="px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Google Refresh Token (Wajib)</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  placeholder="1//0..."
                  value={manualRefreshToken}
                  onChange={(e) => setManualRefreshToken(e.target.value)}
                  disabled={savingManualToken}
                  className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono placeholder:text-slate-400"
                  required
                />
                <button
                  type="submit"
                  disabled={savingManualToken || !manualRefreshToken.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingManualToken ? "Menyimpan..." : "Simpan Token"}
                </button>
              </div>
            </div>

            {manualTokenError && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{manualTokenError}</span>
              </div>
            )}
          </form>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* KPI DASHBOARD CARDS */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Total Anggota</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.totalMembers}</div>
            <span className="text-[10px] text-slate-400 block mt-1.5 uppercase font-semibold">Siswa Terdaftar</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Tugas Selesai</span>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600">{stats.submittedCount}</div>
            <span className="text-[10px] text-slate-400 block mt-1.5 uppercase font-semibold">Laporan Terkumpul</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Belum Mengumpulkan</span>
              <XCircle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600">{stats.notSubmittedCount}</div>
            <span className="text-[10px] text-slate-400 block mt-1.5 uppercase font-semibold">Menunggu Unggahan</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Persentase Sesi</span>
              <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Aktif</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.progressPercentage}%</div>
            <div className="mt-2.5 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${stats.progressPercentage}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* MID SECTION: Tasks lists + List of Incomplete Students */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tugas bulan ini */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold tracking-tight text-slate-900">Lembar Tugas Terbit</h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilih Rubrik Aktif</span>
          </div>

          {assignments.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">Belum ada tugas diterbitkan untuk periode ini.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {assignments.map((assign) => {
                const pct = assign.totalCount > 0 ? Math.round((assign.submittedCount / assign.totalCount) * 100) : 0;
                const isSelected = selectedAssignmentId === assign.id;
                return (
                  <div
                    key={assign.id}
                    onClick={() => {
                      setSelectedAssignmentId(assign.id);
                      setSubmissionFilter("all");
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-200 text-emerald-950 shadow-sm"
                        : "bg-white hover:bg-slate-50 border-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Tugas {assign.number}</span>
                      <h3 className="text-xs font-bold truncate uppercase">{assign.title}</h3>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-xs font-bold block">
                        {assign.submittedCount}/{assign.totalCount}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 block">{pct}% Selesai</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Belum Lengkap list */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
          <h2 className="text-sm font-bold tracking-tight text-slate-900 mb-4 pb-2 border-b border-slate-100">Wajib Susulan ({incompleteStudents.length})</h2>
          {incompleteStudents.length === 0 ? (
            <div className="text-center py-10 text-emerald-600 text-xs font-semibold uppercase tracking-wider">✓ Sempurna! Semua Tugas Lengkap</div>
          ) : (
            <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
              {incompleteStudents.map(({ student, submittedCount, totalTasks }) => (
                <div key={student.nisn} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-100 transition-all">
                  <div className="min-w-0 pr-2">
                    <h3 className="text-xs font-bold text-slate-800 truncate">{student.name}</h3>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Kelas {student.className}</span>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded">
                    {submittedCount}/{totalTasks} Tugas
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BIG BOTTOM SECTION: MEMBER CHECKLIST & SUBMISSION INSPECT */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900">Checklist Pengumpulan Siswa</h2>
            <p className="text-xs text-slate-400 mt-0.5">Pantau dan periksa berkas kiriman setiap anggota redaksi.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filters */}
            <div className="flex border border-slate-200 bg-slate-50 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setSubmissionFilter("all")}
                className={`px-3 py-1 rounded-md cursor-pointer transition-all ${
                  submissionFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setSubmissionFilter("done")}
                className={`px-3 py-1 rounded-md cursor-pointer transition-all ${
                  submissionFilter === "done" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Lengkap
              </button>
              <button
                onClick={() => setSubmissionFilter("pending")}
                className={`px-3 py-1 rounded-md cursor-pointer transition-all ${
                  submissionFilter === "pending" ? "bg-amber-500 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Kurang
              </button>
            </div>

            {/* Task selector dropdown inside filter bar */}
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Rubrik</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>Tugas {a.number}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="CARI NAMA SISWA, KELAS, ATAU NISN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 transition-all"
          />
        </div>

        {/* CHECKLIST LISTING TABLE/CARDS */}
        {filteredChecklist.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-medium">Tidak ada data siswa yang cocok.</div>
        ) : (
          <div className="space-y-2.5">
            {filteredChecklist.map(({ student, taskSubmissions, isFullyCompleted }) => (
              <div
                key={student.nisn}
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-slate-50/50 ${
                  isFullyCompleted ? "border-emerald-100 bg-emerald-50/10" : "bg-white border-slate-100"
                }`}
              >
                {/* student profile */}
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">{student.name}</h3>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    NISN {student.nisn} • Kelas {student.className}
                  </span>
                </div>

                {/* Submissions statuses in cards */}
                <div className="flex flex-wrap gap-2 md:justify-end items-center">
                  {taskSubmissions.map(({ task, submission }) => (
                    <div key={task.id} className="min-w-0">
                      {submission ? (
                        <button
                          onClick={() => setViewingSubmission(submission)}
                          className="flex items-center gap-1 py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/50 text-[10px] font-bold rounded transition-colors cursor-pointer"
                        >
                          T.{task.number}: v{submission.version}
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      ) : (
                        <div className="py-1 px-2.5 bg-slate-100 border border-slate-200 text-[10px] text-slate-400 font-bold rounded">
                          T.{task.number}: Kosong
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DIALOG FOR VIEWING DETAILED SUBMISSION AND FILES */}
      <AnimatePresence>
        {viewingSubmission && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-100 w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                    Pemeriksaan Berkas
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-1 uppercase tracking-tight">Detail Kiriman Siswa</h3>
                </div>
                <button
                  onClick={() => setViewingSubmission(null)}
                  className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* student cards detail */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 text-xs text-slate-600">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong className="text-slate-400 block mb-0.5 font-semibold text-[10px] uppercase">Nama Anggota</strong>
                      <span className="font-bold text-slate-800">{viewingSubmission.studentName}</span>
                    </div>
                    <div>
                      <strong className="text-slate-400 block mb-0.5 font-semibold text-[10px] uppercase">Kelas</strong>
                      <span className="font-bold text-slate-800">{viewingSubmission.className}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong className="text-slate-400 block mb-0.5 font-semibold text-[10px] uppercase">NISN</strong>
                      <span className="font-mono text-slate-700">{viewingSubmission.nisn}</span>
                    </div>
                    <div>
                      <strong className="text-slate-400 block mb-0.5 font-semibold text-[10px] uppercase">Sesi Versi</strong>
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">v{viewingSubmission.version}</span>
                    </div>
                  </div>
                  <div>
                    <strong className="text-slate-400 block mb-0.5 font-semibold text-[10px] uppercase">Waktu Pengunggahan</strong>
                    <span className="font-medium text-slate-700">{new Date(viewingSubmission.submittedAt).toLocaleString("id-ID")} WIB</span>
                  </div>
                </div>

                {/* files grid listing */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lampiran Pendukung:</h4>
                  {viewingSubmission.files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-150 rounded-xl hover:bg-slate-50 transition-all">
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {file.mimeType.includes("pdf") ? (
                          <div className="h-9 w-9 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
                            <Layers className="h-4.5 w-4.5" />
                          </div>
                        ) : (
                          <img
                            src={file.storagePath}
                            alt={file.originalName}
                            referrerPolicy="no-referrer"
                            className="h-9 w-9 object-cover rounded-lg border border-slate-100 bg-slate-50 shrink-0"
                          />
                        )}
                        <div className="min-w-0 font-mono">
                          <span className="block text-xs font-bold text-slate-800 truncate">
                            {file.storedName}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </div>

                      <a
                        href={file.storagePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-md transition-colors cursor-pointer"
                      >
                        Buka Berkas
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>

                {/* drive retry indicator */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="font-bold text-slate-500 text-[10px] uppercase">Status Cadangan Drive:</span>
                    {viewingSubmission.status === "submitted" ? (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded font-bold text-[9px]">
                        Sukses Terkirim
                      </span>
                    ) : (
                      <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold text-[9px]">
                        Gagal Sinkronisasi
                      </span>
                    )}
                  </div>

                  <button
                    disabled={syncingDrive}
                    onClick={() => handleRetryDriveSync(viewingSubmission.id)}
                    className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-850 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncingDrive ? "animate-spin text-emerald-400" : ""}`} />
                    {syncingDrive ? "Sinkronisasi Ulang..." : "Sinkronkan Ulang ke Google Drive"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
