import React, { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2, Filter, X, UserCheck, UserX, AlertCircle, Feather } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Student } from "../../types";

interface MembersProps {
  token: string;
}

export default function Members({ token }: MembersProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [formNisn, setFormNisn] = useState("");
  const [formName, setFormName] = useState("");
  const [formClass, setFormClass] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/students", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setStudents(data);
      } else {
        setError(data.error || "Gagal memuat daftar anggota.");
      }
    } catch (err) {
      setError("Koneksi gagal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [token]);

  // Unique classes for filter dropdown
  const classesList = Array.from(new Set(students.map((s) => s.className))).sort();

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setFormNisn("");
    setFormName("");
    setFormClass("");
    setFormActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setModalMode("edit");
    setFormNisn(student.nisn);
    setFormName(student.name);
    setFormClass(student.className);
    setFormActive(student.active);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleDeleteStudent = async (nisn: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus siswa "${name}" dari sistem Jurnalistik? Semua history pengumpulannya tetap ada, namun dia tidak akan bisa login lagi.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teacher/students/${nisn}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchStudents();
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menghapus siswa.");
      }
    } catch (err) {
      alert("Koneksi gagal.");
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const name = formName.trim();
    const className = formClass.trim();
    const nisn = formNisn.trim();

    if (!nisn || !name || !className) {
      setModalError("Semua data (NISN, Nama Lengkap, Kelas) wajib diisi.");
      return;
    }

    if (nisn.length !== 10 || isNaN(Number(nisn))) {
      setModalError("NISN harus terdiri dari 10 digit angka.");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = modalMode === "create" ? "/api/teacher/students" : `/api/teacher/students/${nisn}`;
      const method = modalMode === "create" ? "POST" : "PUT";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nisn, name, className, active: formActive }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Gagal menyimpan data siswa.");
      } else {
        setIsModalOpen(false);
        fetchStudents();
      }
    } catch (err) {
      setModalError("Terjadi kesalahan koneksi.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = s.name.toLowerCase().includes(q) || s.nisn.includes(q) || s.className.toLowerCase().includes(q);
    const matchClass = selectedClass === "all" || s.className === selectedClass;
    return matchSearch && matchClass;
  });

  return (
    <div className="space-y-6 font-sans">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-[#FFFFFF] border-3 border-[#111111] p-6 shadow-[5px_5px_0px_#111111] relative">
        <div className="absolute top-0 left-0 right-0 h-2 bg-[#18A558]" />
        <div>
          <span className="text-[10px] font-bold text-[#FFFFFF] bg-[#111111] tracking-widest uppercase inline-block mb-2 px-2 py-0.5 font-mono">Manajemen Akun</span>
          <h1 className="font-sans font-black text-xl md:text-2xl uppercase tracking-tight text-[#111111]">Anggota Jurnalistik</h1>
          <p className="text-xs text-[#111111] mt-2 max-w-xl font-semibold">
            Kelola izin masuk siswa, status keaktifan, dan verifikasi profil anggota dewan redaksi sekolah.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-3.5 bg-[#18A558] hover:bg-[#111111] text-[#FFFFFF] border-3 border-[#111111] shadow-[3px_3px_0px_#111111] hover:shadow-[1px_1px_0px_#111111] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer w-full sm:w-auto shrink-0 font-mono font-black text-xs uppercase tracking-widest"
        >
          <Plus className="h-4.5 w-4.5 stroke-[3px]" />
          Tambah Anggota
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-[#111111] border-3 border-[#111111] text-xs text-[#FFFFFF] font-mono">
          <AlertCircle className="h-5 w-5 shrink-0 text-[#FFD21F]" />
          <span className="font-bold uppercase">{error}</span>
        </div>
      )}

      {/* FILTER CONTROL WRAPPER */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#FFFFFF] border-3 border-[#111111] p-5 shadow-[5px_5px_0px_#111111]">
        <div className="relative md:col-span-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#111111] stroke-[3px]" />
          <input
            type="text"
            placeholder="Cari anggota berdasarkan nama, kelas, atau NISN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] text-xs text-[#111111] placeholder-[#888888] focus:outline-none focus:shadow-[2px_2px_0px_#FFD21F] font-bold uppercase transition-all"
          />
        </div>

        <div className="flex items-center bg-[#FFFFFF] border-3 border-[#111111] px-3 py-2 shadow-[2px_2px_0px_#111111]">
          <Filter className="h-4 w-4 text-[#111111] mr-2 shrink-0 stroke-[2px]" />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-transparent text-xs font-black text-[#111111] focus:outline-none w-full cursor-pointer uppercase tracking-wider font-mono"
          >
            <option value="all" className="bg-white text-[#111111]">Semua Kelas</option>
            {classesList.map((cls) => (
              <option key={cls} value={cls} className="bg-white text-[#111111]">Kelas {cls}</option>
            ))}
          </select>
        </div>
      </div>

      {/* MEMBERS LIST */}
      {loading ? (
        <div className="text-center py-12 bg-white border-3 border-[#111111] shadow-[5px_5px_0px_#111111]">
          <div className="h-8 w-8 border-4 border-[#111111] border-t-[#FFD21F] animate-spin mx-auto mb-4"></div>
          <p className="text-xs text-[#111111] uppercase tracking-widest font-black font-mono">Memuat database siswa...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-[#FFFFFF] border-3 border-[#111111] p-12 text-center shadow-[5px_5px_0px_#111111]">
          <UserX className="h-10 w-10 text-[#111111] mx-auto mb-3" />
          <h3 className="font-sans font-black text-lg text-[#111111] uppercase tracking-tight">Anggota Tidak Ditemukan</h3>
          <p className="text-xs text-[#111111] mt-1 max-w-xs mx-auto font-semibold">Tidak ada anggota yang memenuhi kriteria pencarian.</p>
        </div>
      ) : (
        <div className="bg-[#FFFFFF] border-3 border-[#111111] overflow-hidden shadow-[5px_5px_0px_#111111]">
          {/* List layout */}
          <div className="divide-y-3 divide-[#111111]">
            {filteredStudents.map((student) => (
              <div
                key={student.nisn}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-[#F2F2F2]"
              >
                <div className="flex items-center gap-4">
                  <div className={`h-11 w-11 border-3 border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center shrink-0 ${
                    student.active 
                      ? "bg-[#18A558] text-[#FFFFFF]" 
                      : "bg-[#FFD21F] text-[#111111]"
                  }`}>
                    {student.active ? <UserCheck className="h-5 w-5 stroke-[2px]" /> : <UserX className="h-5 w-5 stroke-[2px]" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-[#111111] uppercase tracking-wider">{student.name}</h3>
                      {!student.active && (
                        <span className="text-[9px] font-black text-[#FFFFFF] bg-[#111111] px-2 py-0.5 border border-[#111111] uppercase font-mono tracking-wider">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#111111] block mt-1 font-semibold">
                      NISN <code className="font-mono text-[#111111] font-black bg-[#FFD21F] px-1.5 py-0.5 border-2 border-[#111111] shadow-[1px_1px_0px_#111111]">{student.nisn}</code> • Kelas {student.className}
                    </span>
                  </div>
                </div>

                {/* Operations buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0">
                  <button
                    onClick={() => handleOpenEditModal(student)}
                    className="p-2.5 text-[#111111] hover:bg-[#FFD21F] bg-[#FFFFFF] border-3 border-[#111111] shadow-[2px_2px_0px_#111111] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    <Edit2 className="h-4.5 w-4.5 stroke-[2px]" />
                  </button>
                  <button
                    onClick={() => handleDeleteStudent(student.nisn, student.name)}
                    className="p-2.5 text-[#111111] hover:bg-[#111111] hover:text-[#FFFFFF] bg-[#FFFFFF] border-3 border-[#111111] shadow-[2px_2px_0px_#111111] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-4.5 w-4.5 stroke-[2px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE & EDIT MODAL DIALOG */}
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
                    {modalMode === "create" ? "Tambah Jurnalis Baru" : "Koreksi Profil Siswa"}
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-[#111111] hover:bg-[#111111] hover:text-[#FFFFFF] border-3 border-[#111111] shadow-[2px_2px_0px_#111111] cursor-pointer"
                >
                  <X className="h-4 w-4 stroke-[3px]" />
                </button>
              </div>

              <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
                <div>
                  <label htmlFor="modal-nisn" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                    NISN (10 DIGIT ANGKA)
                  </label>
                  <input
                    id="modal-nisn"
                    type="text"
                    maxLength={10}
                    disabled={modalMode === "edit" || submitting}
                    placeholder="Contoh: 0012345678"
                    value={formNisn}
                    onChange={(e) => setFormNisn(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] text-xs text-[#111111] placeholder-[#888888] focus:outline-none focus:shadow-[2px_2px_0px_#FFD21F] font-mono tracking-widest disabled:opacity-50 rounded-none font-bold"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="modal-name" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                    Nama Lengkap Siswa
                  </label>
                  <input
                    id="modal-name"
                    type="text"
                    disabled={submitting}
                    placeholder="Contoh: Budi Santoso"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] text-xs text-[#111111] placeholder-[#888888] focus:outline-none focus:shadow-[2px_2px_0px_#FFD21F] font-semibold rounded-none"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="modal-class" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                    Kelas
                  </label>
                  <input
                    id="modal-class"
                    type="text"
                    disabled={submitting}
                    placeholder="Contoh: XI-1"
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] text-xs text-[#111111] placeholder-[#888888] focus:outline-none focus:shadow-[2px_2px_0px_#FFD21F] font-semibold rounded-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-3 py-1.5">
                  <input
                    id="modal-active"
                    type="checkbox"
                    disabled={submitting}
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="h-5 w-5 text-[#111111] bg-white border-3 border-[#111111] focus:ring-0 accent-[#111111]"
                  />
                  <label htmlFor="modal-active" className="text-xs font-black text-[#111111] select-none cursor-pointer uppercase tracking-wider font-mono">
                    Izin Akses Aktif
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
                    {submitting ? "Menyimpan..." : "SIMPAN ANGGOTA"}
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
