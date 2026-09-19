import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Calendar, Check, Archive, X, AlertCircle, Feather } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Period } from "../../types";

interface PeriodsProps {
  token: string;
}

export default function Periods({ token }: PeriodsProps) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formMonth, setFormMonth] = useState(9);
  const [formYear, setFormYear] = useState(2026);
  const [formStatus, setFormStatus] = useState<"active" | "archived">("archived");
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/periods", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPeriods(data);
      } else {
        setError(data.error || "Gagal memuat periode.");
      }
    } catch (err) {
      setError("Koneksi gagal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, [token]);

  // Handle month/year changes to auto generate clean string ID (e.g. 2026-09)
  useEffect(() => {
    if (modalMode === "create") {
      const mStr = String(formMonth).padStart(2, "0");
      setFormId(`${formYear}-${mStr}`);
    }
  }, [formMonth, formYear, modalMode]);

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setFormMonth(new Date().getMonth() + 1);
    setFormYear(2026);
    setFormName("");
    setFormStatus("archived");
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (period: Period) => {
    setModalMode("edit");
    setFormId(period.id);
    setFormName(period.name);
    setFormMonth(period.month);
    setFormYear(period.year);
    setFormStatus(period.status);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleDeletePeriod = async (id: string, name: string) => {
    if (!window.confirm(`Hapus periode "${name}"? Semua data tugas dan pengumpulan yang terhubung juga akan terpengaruh.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teacher/periods/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchPeriods();
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menghapus periode.");
      }
    } catch (err) {
      alert("Koneksi gagal.");
    }
  };

  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const name = formName.trim();
    if (!name) {
      setModalError("Nama periode (misal: September 2026) wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = modalMode === "create" ? "/api/teacher/periods" : `/api/teacher/periods/${formId}`;
      const method = modalMode === "create" ? "POST" : "PUT";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: formId,
          name,
          month: formMonth,
          year: formYear,
          status: formStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Gagal menyimpan periode.");
      } else {
        setIsModalOpen(false);
        fetchPeriods();
      }
    } catch (err) {
      setModalError("Kesalahan sistem.");
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
          <span className="text-[10px] font-bold text-[#FFFFFF] bg-[#111111] tracking-widest uppercase inline-block mb-2 px-2 py-0.5 font-mono">Penjadwalan Redaksi</span>
          <h1 className="font-sans font-black text-xl md:text-2xl uppercase tracking-tight text-[#111111]">Periode Penugasan</h1>
          <p className="text-xs text-[#111111] mt-2 max-w-xl font-semibold">
            Atur siklus penugasan bulanan, batasi pengumpulan jurnal siswa, dan lakukan pengarsipan edisi terbitan berkala.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-3.5 bg-[#FFD21F] hover:bg-[#111111] hover:text-[#FFFFFF] text-[#111111] border-3 border-[#111111] shadow-[3px_3px_0px_#111111] hover:shadow-[1px_1px_0px_#111111] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer w-full sm:w-auto shrink-0 font-mono font-black text-xs uppercase tracking-widest"
        >
          <Plus className="h-4.5 w-4.5 stroke-[3px]" />
          Tambah Periode
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-[#111111] border-3 border-[#111111] text-xs text-[#FFFFFF] font-mono">
          <AlertCircle className="h-5 w-5 shrink-0 text-[#FFD21F]" />
          <span className="font-bold uppercase">{error}</span>
        </div>
      )}

      {/* PERIOD LIST */}
      {loading ? (
        <div className="text-center py-12 bg-white border-3 border-[#111111] shadow-[5px_5px_0px_#111111]">
          <div className="h-8 w-8 border-4 border-[#111111] border-t-[#18A558] animate-spin mx-auto mb-4"></div>
          <p className="text-xs text-[#111111] uppercase tracking-widest font-black font-mono">Memuat agenda periode...</p>
        </div>
      ) : periods.length === 0 ? (
        <div className="bg-[#FFFFFF] border-3 border-[#111111] p-12 text-center shadow-[5px_5px_0px_#111111]">
          <Calendar className="h-10 w-10 text-[#111111] mx-auto mb-3" />
          <h3 className="font-sans font-black text-lg text-[#111111] uppercase tracking-tight">Edisi Periode Belum Dibuat</h3>
          <p className="text-xs text-[#111111] mt-1 max-w-xs mx-auto font-semibold">Silakan tetapkan siklus bulanan penerbitan naskah baru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {periods.map((period) => {
            const isActive = period.status === "active";
            return (
              <div
                key={period.id}
                className={`bg-[#FFFFFF] border-3 p-6 shadow-[5px_5px_0px_#111111] relative flex flex-col justify-between min-h-[175px] transition-all ${
                  isActive ? "border-[#111111] shadow-[5px_5px_0px_#18A558]" : "border-[#111111]"
                }`}
              >
                {/* top indicator */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-[10px] font-mono font-black text-[#111111] bg-[#FFD21F] border-2 border-[#111111] px-2 py-0.5 shadow-[1px_1px_0px_#111111]">{period.id}</span>
                    {isActive ? (
                      <span className="flex items-center gap-1 text-[9px] font-mono font-black text-[#FFFFFF] bg-[#18A558] border-2 border-[#111111] py-0.5 px-2.5 uppercase tracking-wider">
                        <Check className="h-3.5 w-3.5 stroke-[3px]" /> AKTIF
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[9px] font-mono font-black text-[#111111] bg-[#F2F2F2] border-2 border-[#111111] py-0.5 px-2.5 uppercase tracking-wider">
                        <Archive className="h-3.5 w-3.5 stroke-[2px]" /> DIARSIP
                      </span>
                    )}
                  </div>

                  <h3 className="font-sans font-black text-base text-[#111111] mb-1.5 uppercase tracking-wider">{period.name}</h3>
                  <p className="text-xs text-[#111111] font-bold">
                    Siklus Bulan ke-{period.month}, Edisi {period.year}
                  </p>
                </div>

                {/* footer buttons */}
                <div className="flex items-center justify-end gap-2 pt-4 mt-5 border-t-2 border-dashed border-[#111111]">
                  <button
                    onClick={() => handleOpenEditModal(period)}
                    className="p-2 text-[#111111] hover:bg-[#FFD21F] bg-[#FFFFFF] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] transition-all cursor-pointer text-xs font-black flex items-center gap-1 uppercase font-mono"
                  >
                    <Edit2 className="h-3.5 w-3.5 stroke-[2.5px]" /> Ubah
                  </button>
                  <button
                    onClick={() => handleDeletePeriod(period.id, period.name)}
                    className="p-2 text-[#111111] hover:bg-[#111111] hover:text-[#FFFFFF] bg-[#FFFFFF] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] transition-all cursor-pointer text-xs font-black flex items-center gap-1 uppercase font-mono"
                  >
                    <Trash2 className="h-3.5 w-3.5 stroke-[2.5px]" /> Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT PERIOD MODAL */}
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
                    {modalMode === "create" ? "Buat Periode Baru" : "Koreksi Sesi Periode"}
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-[#111111] hover:bg-[#111111] hover:text-[#FFFFFF] border-3 border-[#111111] shadow-[2px_2px_0px_#111111] cursor-pointer"
                >
                  <X className="h-4 w-4 stroke-[3px]" />
                </button>
              </div>

              <form onSubmit={handleSavePeriod} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="modal-month" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                      BULAN BERJALAN
                    </label>
                    <select
                      id="modal-month"
                      value={formMonth}
                      onChange={(e) => setFormMonth(Number(e.target.value))}
                      disabled={modalMode === "edit" || submitting}
                      className="w-full px-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] text-[#111111] rounded-none text-xs focus:outline-none focus:shadow-[2px_2px_0px_#FFD21F] cursor-pointer font-bold uppercase"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m} className="bg-white">
                          {new Date(2026, m - 1).toLocaleDateString("id-ID", { month: "long" }).toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="modal-year" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                      TAHUN
                    </label>
                    <input
                      id="modal-year"
                      type="number"
                      min={2020}
                      max={2035}
                      disabled={modalMode === "edit" || submitting}
                      value={formYear}
                      onChange={(e) => setFormYear(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] text-[#111111] focus:outline-none focus:shadow-[2px_2px_0px_#FFD21F] rounded-none text-xs transition-all font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="modal-id" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                    ID SISTEM (KODE UNIK)
                  </label>
                  <input
                    id="modal-id"
                    type="text"
                    disabled
                    value={formId}
                    className="w-full px-4 py-3 bg-[#F2F2F2] border-3 border-[#111111] rounded-none text-xs text-[#111111] font-mono font-black"
                  />
                </div>

                <div>
                  <label htmlFor="modal-name" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                    NAMA PERIODE (TAMPILAN)
                  </label>
                  <input
                    id="modal-name"
                    type="text"
                    disabled={submitting}
                    placeholder="Contoh: September 2026"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] focus:outline-none focus:shadow-[2px_2px_0px_#FFD21F] rounded-none text-xs text-[#111111] placeholder-[#888888] font-bold uppercase transition-all"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="modal-status" className="block text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-2 font-mono">
                    STATUS AKTIF
                  </label>
                  <select
                    id="modal-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    disabled={submitting}
                    className="w-full px-4 py-3 bg-[#FFFFFF] border-3 border-[#111111] text-[#111111] rounded-none text-xs focus:outline-none focus:shadow-[2px_2px_0px_#FFD21F] cursor-pointer font-bold uppercase"
                  >
                    <option value="archived" className="bg-white">DIARSIP (SELESAI & KUNCI)</option>
                    <option value="active" className="bg-white">AKTIF (SESI PENGUMPULAN BERLANGSUNG)</option>
                  </select>
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
                    {submitting ? "Menyimpan..." : "SIMPAN PERIODE"}
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
