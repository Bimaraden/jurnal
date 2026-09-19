import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Calendar, BookOpen, Clock, AlertTriangle, X, AlertCircle, Feather, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Assignment, Period, AssignmentType } from "../../types";

interface AssignmentsProps {
  token: string;
}

export default function Assignments({ token }: AssignmentsProps) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [formId, setFormId] = useState("");
  const [formNumber, setFormNumber] = useState(1);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState<AssignmentType>("photo");
  const [formMaxFiles, setFormMaxFiles] = useState(3);
  const [formMaxSize, setFormMaxSize] = useState(10);
  const [formDeadline, setFormDeadline] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch initial periods list
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
          if (active) setSelectedPeriodId(active.id);
        }
      } catch (err) {
        setError("Gagal memuat periode.");
      }
    };
    fetchPeriods();
  }, [token]);

  // Fetch assignments on period selection change
  const fetchAssignments = async () => {
    if (!selectedPeriodId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/assignments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        // Filter by selected period
        const filtered = data.filter((a: Assignment) => a.periodId === selectedPeriodId);
        filtered.sort((a: Assignment, b: Assignment) => a.number - b.number);
        setAssignments(filtered);
      } else {
        setError(data.error || "Gagal memuat tugas.");
      }
    } catch (err) {
      setError("Koneksi gagal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [selectedPeriodId, token]);

  const handleOpenCreateModal = () => {
    if (assignments.length >= 4) {
      alert("Batas maksimal 4 tugas per periode telah tercapai. Anda tidak dapat menambahkan tugas baru untuk periode ini.");
      return;
    }
    setModalMode("create");
    setFormTitle("");
    setFormDesc("");
    setFormNumber(assignments.length + 1);
    setFormType("photo");
    setFormMaxFiles(3);
    setFormMaxSize(10);
    // Set default deadline to 7 days from now
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23, 59, 0, 0);
    setFormDeadline(nextWeek.toISOString().slice(0, 16));
    setFormActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (assign: Assignment) => {
    setModalMode("edit");
    setFormId(assign.id);
    setFormTitle(assign.title);
    setFormDesc(assign.description);
    setFormNumber(assign.number);
    setFormType(assign.type);
    setFormMaxFiles(assign.maxFiles);
    setFormMaxSize(assign.maxFileSizeMB);
    // Convert UTC deadline to local datetime-local format
    const localDl = new Date(assign.deadline);
    const tzOffset = localDl.getTimezoneOffset() * 60000;
    const localISOTime = new Date(localDl.getTime() - tzOffset).toISOString().slice(0, 16);
    setFormDeadline(localISOTime);
    setFormActive(assign.active);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleDeleteAssignment = async (id: string, title: string) => {
    if (!window.confirm(`Hapus tugas "${title}"? Semua pengumpulan tugas yang terkait juga akan terpengaruh.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teacher/assignments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchAssignments();
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menghapus tugas.");
      }
    } catch (err) {
      alert("Koneksi gagal.");
    }
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const title = formTitle.trim();
    const description = formDesc.trim();

    if (!title || !description || !formDeadline) {
      setModalError("Semua data tugas wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = modalMode === "create" ? "/api/teacher/assignments" : `/api/teacher/assignments/${formId}`;
      const method = modalMode === "create" ? "POST" : "PUT";

      // Convert local date back to UTC ISO
      const deadlineISO = new Date(formDeadline).toISOString();

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          periodId: selectedPeriodId,
          number: formNumber,
          title,
          description,
          type: formType,
          maxFiles: formMaxFiles,
          maxFileSizeMB: formMaxSize,
          deadline: deadlineISO,
          active: formActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Gagal menyimpan draf tugas.");
      } else {
        setIsModalOpen(false);
        fetchAssignments();
      }
    } catch (err) {
      setModalError("Kesalahan koneksi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-[#FFFFFF] border-3 border-[#111111] p-6 shadow-[5px_5px_0px_#111111] relative">
        <div className="absolute top-0 left-0 right-0 h-2 bg-[#FFD21F]" />
        <div>
          <span className="text-[10px] font-bold text-[#FFFFFF] bg-[#111111] tracking-widest uppercase inline-block mb-2 px-2 py-0.5 font-mono">Topik Liputan</span>
          <h1 className="font-sans font-black text-xl md:text-2xl uppercase tracking-tight text-[#111111]">Kelola Lembar Tugas</h1>
          <p className="text-xs text-[#111111] mt-2 max-w-xl font-semibold">
            Tentukan rubrik liputan berita, batas ukuran berkas, tenggat waktu, dan status draf instruksi tugas siswa.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
          {/* Period drop down selector */}
          <div className="flex items-center bg-[#FFFFFF] border-3 border-[#111111] px-3 py-2.5 shadow-[2px_2px_0px_#111111] w-full sm:w-auto">
            <Calendar className="h-4.5 w-4.5 text-[#18A558] mr-2 shrink-0 stroke-[3px]" />
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="bg-transparent text-xs font-black text-[#111111] focus:outline-none w-full cursor-pointer uppercase tracking-wider font-mono"
            >
              <option value="" disabled className="bg-white text-[#111111]">Pilih Periode</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id} className="bg-white text-[#111111]">{p.name.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenCreateModal}
            disabled={!selectedPeriodId || assignments.length >= 4}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-[#18A558] hover:bg-[#111111] text-[#FFFFFF] border-3 border-[#111111] shadow-[3px_3px_0px_#111111] hover:shadow-[1px_1px_0px_#111111] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer w-full sm:w-auto font-mono font-black text-xs uppercase tracking-widest disabled:opacity-40"
          >
            <Plus className="h-4.5 w-4.5 stroke-[3px]" />
            Tugas Baru
          </button>
        </div>
      </div>

      {assignments.length >= 4 && (
        <div className="flex items-start gap-3.5 p-5 bg-[#FFD21F]/15 border-3 border-[#111111] shadow-[3px_3px_0px_#111111]">
          <AlertTriangle className="h-5.5 w-5.5 text-[#111111] shrink-0 mt-0.5 stroke-[2.5px]" />
          <div className="leading-relaxed text-xs text-[#111111] font-medium">
            <strong className="text-[#111111] uppercase tracking-wider font-mono block mb-1 font-black">Batas Tugas Tercapai:</strong> 
            Periode ini sudah memiliki maksimal <strong className="font-black text-[#18A558] bg-[#FFFFFF] px-1 border border-[#111111]">4 tugas</strong>. Sesuai arsitektur kurikulum Jurnalistik, batas penugasan ini dijaga untuk menunjang kualitas riset serta kenyamanan pengerjaan laporan siswa.
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 bg-[#111111] border-3 border-[#111111] text-xs text-[#FFFFFF] font-mono">
          <AlertCircle className="h-5 w-5 shrink-0 text-[#FFD21F]" />
          <span className="font-bold uppercase">{error}</span>
        </div>
      )}

      {/* ASSIGNMENTS GRID */}
      {loading ? (
        <div className="text-center py-12 bg-[#FFFFFF] border-3 border-[#111111] shadow-[5px_5px_0px_#111111]">
          <div className="h-8 w-8 border-4 border-[#111111] border-t-[#FFD21F] animate-spin mx-auto mb-4"></div>
          <p className="text-xs text-[#111111] uppercase tracking-widest font-black font-mono">Memuat agenda tugas...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-[#FFFFFF] border-3 border-[#111111] p-12 text-center shadow-[5px_5px_0px_#111111]">
          <BookOpen className="h-10 w-10 text-[#111111] mx-auto mb-3" />
          <h3 className="font-sans font-black text-lg text-[#111111] uppercase tracking-tight">Lembar Tugas Kosong</h3>
          <p className="text-xs text-[#111111] mt-1 max-w-xs mx-auto font-semibold">Silakan tambahkan draf tugas investigasi baru untuk diunggah siswa.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((assign) => (
            <div
              key={assign.id}
              className={`bg-[#FFFFFF] border-3 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[5px_5px_0px_#111111] transition-all ${
                assign.active ? "border-[#111111]" : "border-[#111111]/50 opacity-60"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 shrink-0 bg-[#FFD21F] border-3 border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center font-mono text-sm font-black text-[#111111]">
                  {String(assign.number).padStart(2, "0")}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-sm font-black text-[#111111] uppercase tracking-wider">{assign.title}</h3>
                    <span className="text-[9px] font-black text-white bg-[#111111] border border-[#111111] px-2.5 py-0.5 uppercase tracking-widest">
                      {assign.type === "photo" ? "FOTO" : assign.type === "pdf" ? "PDF" : "CAMPURAN"}
                    </span>
                    {!assign.active && (
                      <span className="text-[9px] font-black text-[#111111] bg-[#FFD21F] border border-[#111111] px-2.5 py-0.5 uppercase tracking-widest">
                        DRAF DRAFT
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#111111] font-semibold max-w-xl leading-relaxed whitespace-pre-line bg-[#F2F2F2] p-4 border-2 border-[#111111] shadow-[1px_1px_0px_#111111] mt-1">
                    {assign.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#111111] mt-3.5 font-mono font-bold">
                    <div className="flex items-center gap-1.5 text-[#18A558] font-black">
                      <Clock className="h-4 w-4 stroke-[3px]" />
                      Tenggat: {new Date(assign.deadline).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })} WIB
                    </div>
                    <span className="font-black">•</span>
                    <div>MAKS: {assign.maxFiles} FILE ({assign.maxFileSizeMB} MB)</div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 md:pt-0 border-t-2 border-dashed border-[#111111] md:border-0 shrink-0">
                <button
                  onClick={() => handleOpenEditModal(assign)}
                  className="p-2.5 text-[#111111] hover:bg-[#FFD21F] bg-[#FFFFFF] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer text-xs font-black flex items-center gap-1.5 uppercase font-mono"
                >
                  <Edit2 className="h-4 w-4 stroke-[2.5px]" /> Koreksi
                </button>
                <button
                  onClick={() => handleDeleteAssignment(assign.id, assign.title)}
                  className="p-2.5 text-[#111111] hover:bg-[#111111] hover:text-[#FFFFFF] bg-[#FFFFFF] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer text-xs font-black flex items-center gap-1.5 uppercase font-mono"
                >
                  <Trash2 className="h-4 w-4 stroke-[2.5px]" /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE & EDIT TASK MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#FFFFFF] border-3 border-[#111111] w-full max-w-md overflow-hidden shadow-[6px_6px_0px_#111111] relative"
            >
              <div className="absolute top-0 left-0 right-0 h-4 bg-[#111111]" />
              <div className="p-6 border-b-3 border-[#111111] flex justify-between items-center bg-[#F2F2F2] mt-4">
                <div className="flex items-center gap-2">
                  <Feather className="h-5 w-5 text-[#111111]" />
                  <h2 className="font-sans font-black text-sm text-[#111111] tracking-wide uppercase">
                    {modalMode === "create" ? "Terbitkan Rubrik Baru" : "Koreksi Lembar Tugas"}
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-[#111111] hover:bg-[#111111] hover:text-[#FFFFFF] border-3 border-[#111111] shadow-[2px_2px_0px_#111111] cursor-pointer"
                >
                  <X className="h-4 w-4 stroke-[3px]" />
                </button>
              </div>

              <form onSubmit={handleSaveAssignment} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="modal-num" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                      NOMOR URUT TUGAS
                    </label>
                    <select
                      id="modal-num"
                      value={formNumber}
                      onChange={(e) => setFormNumber(Number(e.target.value))}
                      disabled={submitting}
                      className="w-full px-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] text-[#111111] rounded-none text-xs focus:outline-none focus:shadow-[2px_2px_0px_#FFD21F] cursor-pointer font-bold"
                    >
                      <option value={1} className="bg-white">01</option>
                      <option value={2} className="bg-white">02</option>
                      <option value={3} className="bg-white">03</option>
                      <option value={4} className="bg-white">04</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="modal-type" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                      FORMAT BERKAS WAJIB
                    </label>
                    <select
                      id="modal-type"
                      value={formType}
                      onChange={(e) => {
                        const type = e.target.value as AssignmentType;
                        setFormType(type);
                        setFormMaxFiles(type === "pdf" ? 1 : 3);
                      }}
                      disabled={submitting}
                      className="w-full px-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] text-[#111111] rounded-none text-xs focus:outline-none focus:shadow-[2px_2px_0px_#FFD21F] cursor-pointer font-bold uppercase"
                    >
                      <option value="photo" className="bg-white">FOTO JURNALISTIK (JPG/PNG)</option>
                      <option value="pdf" className="bg-white">LAPORAN BERITA (PDF)</option>
                      <option value="mixed" className="bg-white">CAMPURAN (FOTO & PDF)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="modal-title" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                    JUDUL LEMBAR TUGAS
                  </label>
                  <input
                    id="modal-title"
                    type="text"
                    disabled={submitting}
                    placeholder="Contoh: Foto Jurnalistik (Human Interest)"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] focus:outline-none focus:shadow-[2px_2px_0px_#FFD21F] rounded-none text-xs text-[#111111] placeholder-[#888888] font-bold uppercase transition-all"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="modal-desc" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                    PETUNJUK INVESTIGASI DETAIL
                  </label>
                  <textarea
                    id="modal-desc"
                    disabled={submitting}
                    placeholder="Tuliskan petunjuk penugasan detail untuk siswa..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] focus:outline-none focus:shadow-[2px_2px_0px_#FFD21F] rounded-none text-xs text-[#111111] leading-relaxed resize-none placeholder-[#888888] font-semibold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="modal-max-files" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                      MAKS. BERKAS
                    </label>
                    <input
                      id="modal-max-files"
                      type="number"
                      min={1}
                      max={10}
                      disabled={submitting || formType === "pdf"}
                      value={formMaxFiles}
                      onChange={(e) => setFormMaxFiles(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] text-[#111111] focus:outline-none focus:shadow-[2px_2px_0px_#FFD21F] rounded-none text-xs font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="modal-max-size" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                      UKURAN FILE MAKS (MB)
                    </label>
                    <input
                      id="modal-max-size"
                      type="number"
                      min={1}
                      max={50}
                      disabled={submitting}
                      value={formMaxSize}
                      onChange={(e) => setFormMaxSize(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] text-[#111111] focus:outline-none focus:shadow-[2px_2px_0px_#FFD21F] rounded-none text-xs font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="modal-deadline" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                    TENGGAT PENGUMPULAN
                  </label>
                  <input
                    id="modal-deadline"
                    type="datetime-local"
                    disabled={submitting}
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] focus:outline-none focus:shadow-[2px_2px_0px_#FFD21F] text-[#111111] rounded-none text-xs transition-all cursor-pointer font-mono font-bold"
                    required
                  />
                </div>

                <div className="flex items-center gap-3 py-1.5">
                  <input
                    id="modal-active-task"
                    type="checkbox"
                    disabled={submitting}
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="h-5 w-5 text-[#111111] bg-white border-3 border-[#111111] focus:ring-0 accent-[#111111]"
                  />
                  <label htmlFor="modal-active-task" className="text-xs font-black text-[#111111] select-none cursor-pointer uppercase tracking-wider font-mono">
                    Terbitkan Langsung ke Siswa
                  </label>
                </div>

                {modalError && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-[#111111] border-3 border-[#111111] text-xs text-white font-mono">
                    <AlertCircle className="h-5 w-5 shrink-0 text-[#FFD21F]" />
                    <span className="font-bold uppercase">{modalError}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t-3 border-dashed border-[#111111]">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 px-4 bg-[#18A558] hover:bg-[#111111] hover:text-[#FFFFFF] text-white font-black text-xs border-3 border-[#111111] shadow-[3px_3px_0px_#111111] transition-all cursor-pointer disabled:opacity-50 uppercase tracking-widest font-mono"
                  >
                    {submitting ? "Menyimpan..." : "SIMPAN TUGAS"}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setIsModalOpen(false)}
                    className="py-3 px-4 bg-[#FFFFFF] hover:bg-[#111111] hover:text-[#FFFFFF] text-[#111111] font-black text-xs border-3 border-[#111111] shadow-[3px_3px_0px_#111111] transition-all cursor-pointer uppercase tracking-widest font-mono"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
