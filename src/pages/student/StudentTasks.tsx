import React, { useEffect, useState } from "react";
import { LogOut, Calendar, CheckCircle2, Circle, ArrowRight, BookOpen, AlertCircle, Feather } from "lucide-react";
import { motion } from "motion/react";
import { Assignment, Period, Submission } from "../../types";

interface StudentTasksProps {
  student: any;
  token: string;
  onLogout: () => void;
  onSelectTask: (taskId: string) => void;
}

export default function StudentTasks({ student, token, onLogout, onSelectTask }: StudentTasksProps) {
  const [period, setPeriod] = useState<Period | null>(null);
  const [tasks, setTasks] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch("/api/student/tasks", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Gagal memuat tugas.");
        } else {
          setPeriod(data.period);
          setTasks(data.tasks);
          setSubmissions(data.submissions);
        }
      } catch (err) {
        setError("Koneksi gagal. Silakan muat ulang halaman.");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F2] flex items-center justify-center p-8 font-sans">
        <div className="text-center bg-[#FFFFFF] border-3 border-[#111111] p-8 shadow-[5px_5px_0px_#111111]">
          <div className="h-8 w-8 border-4 border-[#111111] border-t-[#FFD21F] animate-spin mx-auto mb-4"></div>
          <p className="text-xs text-[#111111] font-black tracking-widest uppercase font-mono">Memuat tugas Redaksi...</p>
        </div>
      </div>
    );
  }

  // Calculate monthly progress
  const totalTasksCount = tasks.length;
  const completedCount = tasks.filter((t) =>
    submissions.some((s) => s.assignmentId === t.id)
  ).length;
  const progressPercent = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-[#111111] font-sans antialiased relative">
      
      {/* HEADER BAR */}
      <header className="border-b-3 border-[#111111] bg-[#FFFFFF] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-sans font-black text-sm tracking-tight uppercase px-3 py-1 bg-[#111111] text-[#FFFFFF]">
              JURNALISTIK SMAN 90
            </span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#111111] bg-[#FFFFFF] hover:bg-[#111111] hover:text-[#FFFFFF] border-3 border-[#111111] px-4 py-2 shadow-[3px_3px_0px_#111111] hover:shadow-[1px_1px_0px_#111111] transition-all cursor-pointer font-mono"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        </div>
      </header>

      {/* CORE WRAPPER */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        
        {/* STUDENT GREETING & PROFILE CARD */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8 border-b-3 border-[#111111]">
          <div>
            <span className="text-[10px] font-bold text-[#FFFFFF] bg-[#111111] border-2 border-[#111111] px-3 py-1 uppercase tracking-widest font-mono">
              Redaksi Muda
            </span>
            <h1 className="font-sans font-black text-3xl md:text-5xl text-[#111111] mt-4 leading-none uppercase">
              {student.name}
            </h1>
            <div className="inline-flex items-center gap-2 text-xs font-black text-[#111111] bg-[#FFD21F] border-2 border-[#111111] px-2.5 py-1 mt-3 font-mono">
              <span>●</span>
              KELAS {student.className}
            </div>
          </div>

          {/* PROGRESS CHIP */}
          {totalTasksCount > 0 && (
            <div className="bg-[#FFFFFF] border-3 border-[#111111] p-5 shadow-[5px_5px_0px_#111111] min-w-[260px]">
              <span className="text-[10px] font-bold text-[#111111] uppercase tracking-wider block mb-2 font-mono">
                Progress Liputan Bulanan
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-[#111111]">{completedCount}</span>
                <span className="text-xs font-bold text-[#111111] uppercase font-mono">dari {totalTasksCount} penugasan</span>
              </div>
              <div className="mt-3.5 w-full bg-[#FFFFFF] h-4 border-2 border-[#111111] overflow-hidden p-[2px]">
                <div
                  className="bg-[#18A558] h-full transition-all duration-300 border-r-2 border-[#111111]"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <span className="text-[10px] font-black text-[#18A558] block mt-2 text-right font-mono uppercase tracking-wider">
                {progressPercent}% TERKIRIM
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-[#111111] border-3 border-[#111111] text-xs text-[#FFFFFF] mb-8 font-mono">
            <AlertCircle className="h-5 w-5 shrink-0 text-[#FFD21F]" />
            <span className="uppercase font-bold">{error}</span>
          </div>
        )}

        {/* ACTIVE PERIOD HEADING */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-[#111111] font-black uppercase tracking-widest bg-[#FFFFFF] border-3 border-[#111111] py-2 px-4 shadow-[3px_3px_0px_#111111] font-mono">
            <Calendar className="h-4 w-4 text-[#18A558]" />
            <span>Periode: {period ? period.name : "N/A"}</span>
          </div>
          <span className="text-[10px] text-[#111111] font-bold font-mono bg-[#FFD21F] border-2 border-[#111111] px-2 py-0.5 uppercase tracking-widest">EDISI AKTIF</span>
        </div>

        {/* ASSIGNMENTS BLOCK */}
        {tasks.length === 0 ? (
          <div className="bg-[#FFFFFF] border-3 border-[#111111] p-14 text-center shadow-[5px_5px_0px_#111111]">
            <BookOpen className="h-10 w-10 text-[#111111] mx-auto mb-4" />
            <h3 className="font-sans font-black text-lg tracking-tight uppercase">Belum Ada Penugasan</h3>
            <p className="text-xs text-[#111111] mt-2 max-w-sm mx-auto leading-relaxed font-semibold">
              Dewan Redaksi belum menerbitkan lembar penugasan untuk periode aktif ini.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {tasks.map((task, index) => {
              const submission = submissions.find((s) => s.assignmentId === task.id);
              const isSubmitted = !!submission;

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  onClick={() => onSelectTask(task.id)}
                  className="bg-[#FFFFFF] hover:bg-[#F2F2F2] border-3 border-[#111111] hover:border-[#111111] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all cursor-pointer group shadow-[5px_5px_0px_#111111] hover:shadow-[2px_2px_0px_#111111] hover:translate-x-0.5 hover:translate-y-0.5 relative"
                >
                  <div className="flex items-start gap-4 flex-1">
                    {/* Number box - Large Bold Brutalist Box */}
                    <div className="h-12 w-12 shrink-0 bg-[#FFD21F] border-3 border-[#111111] flex items-center justify-center font-mono text-lg font-black text-[#111111] shadow-[2px_2px_0px_#111111]">
                      {String(task.number).padStart(2, "0")}
                    </div>

                    <div className="space-y-2 flex-1">
                      <h3 className="font-sans font-black text-lg text-[#111111] group-hover:text-[#18A558] transition-colors leading-none uppercase tracking-tight">
                        {task.title}
                      </h3>
                      <p className="text-xs text-[#111111] line-clamp-2 pr-4 leading-relaxed font-semibold">
                        {task.description}
                      </p>
                      
                      {/* Deadline details */}
                      <div className="text-[10px] text-[#111111] pt-1.5 flex items-center gap-2 font-mono uppercase tracking-wider font-bold">
                        <span className="inline-block w-2.5 h-2.5 bg-[#FFD21F] border border-[#111111]"></span>
                        BATAS: {new Date(task.deadline).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })} WIB
                      </div>
                    </div>
                  </div>

                  {/* Status column */}
                  <div className="shrink-0 w-full md:w-auto flex items-center justify-between md:justify-end gap-4 pt-4 md:pt-0 border-t-2 border-dashed border-[#111111] md:border-0">
                    <span className="md:hidden text-[9px] font-bold text-[#111111] uppercase tracking-widest font-mono">STATUS</span>
                    {isSubmitted ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-[#FFFFFF] bg-[#18A558] border-2 border-[#111111] py-1.5 px-3.5 uppercase tracking-wider font-mono shadow-[2px_2px_0px_#111111]">
                        <CheckCircle2 className="h-3.5 w-3.5 stroke-[3px]" />
                        v{submission.version} TERKIRIM
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-bold text-[#111111] bg-[#FFD21F] border-2 border-[#111111] py-1.5 px-3.5 uppercase tracking-wider font-mono shadow-[2px_2px_0px_#111111]">
                        <Circle className="h-3.5 w-3.5 stroke-[3px]" />
                        BELUM DIKIRIM
                      </div>
                    )}

                    <div className="hidden md:block">
                      <div className="h-9 w-9 bg-[#FFFFFF] border-3 border-[#111111] group-hover:bg-[#18A558] flex items-center justify-center transition-all shadow-[2px_2px_0px_#111111]">
                        <ArrowRight className="h-4 w-4 text-[#111111] stroke-[3px] transition-all transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
