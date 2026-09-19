import React, { useEffect, useState, useRef } from "react";
import { ArrowLeft, UploadCloud, X, FileText, CheckCircle2, AlertCircle, RefreshCw, Eye, Feather } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Assignment, Submission } from "../../types";

interface TaskDetailProps {
  taskId: string;
  token: string;
  onBack: () => void;
}

export default function TaskDetail({ taskId, token, onBack }: TaskDetailProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ url: string; isPdf: boolean }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTaskDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/student/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memuat tugas.");
      } else {
        setAssignment(data.assignment);
        setSubmission(data.submission);
      }
    } catch (err) {
      setError("Koneksi gagal. Silakan muat ulang.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetail();
  }, [taskId, token]);

  // Handle file preview URL generation & revocation
  useEffect(() => {
    const urls = selectedFiles.map((file) => {
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
      return {
        url: isPdf ? "" : URL.createObjectURL(file),
        isPdf,
      };
    });

    setFilePreviews(urls);

    // Clean up urls on changes & unmount to prevent memory leaks
    return () => {
      urls.forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [selectedFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      addFiles(filesArray);
    }
  };

  const addFiles = (files: File[]) => {
    if (!assignment) return;
    setError(null);

    const merged = [...selectedFiles, ...files];
    
    // Check files count limit
    if (merged.length > assignment.maxFiles) {
      setError(`Maksimal berkas yang diizinkan untuk tugas ini adalah ${assignment.maxFiles} file.`);
      return;
    }

    // Validate size and extensions
    for (const f of files) {
      const sizeMB = f.size / (1024 * 1024);
      if (sizeMB > assignment.maxFileSizeMB) {
        setError(`Berkas "${f.name}" terlalu besar. Maksimal ukuran file adalah ${assignment.maxFileSizeMB} MB.`);
        return;
      }

      const fileType = f.type;
      const isAllowed = assignment.allowedFileTypes.includes(fileType) || 
                        (fileType === "" && f.name.endsWith(".pdf") && assignment.allowedFileTypes.includes("application/pdf"));

      if (!isAllowed) {
        setError(`Format berkas "${f.name}" tidak didukung.`);
        return;
      }
    }

    setSelectedFiles(merged);
  };

  const removeFile = (index: number) => {
    const updated = [...selectedFiles];
    updated.splice(index, 1);
    setSelectedFiles(updated);
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setError("Pilih minimal satu berkas terlebih dahulu.");
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(10); // Start progress indication

    try {
      const formData = new FormData();
      formData.append("assignmentId", taskId);
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      // Simple implementation of progress tracking using XMLHttpRequest
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/submissions", true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(10 + Math.round((percent / 100) * 85));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100);
          setUploadSuccess(true);
          setSelectedFiles([]);
          setShowRevisionForm(false);
          fetchTaskDetail();
        } else {
          try {
            const errRes = JSON.parse(xhr.responseText);
            setError(errRes.error || "Gagal mengumpulkan tugas.");
          } catch {
            setError("Gagal memproses unggahan tugas di server.");
          }
        }
        setUploading(false);
      };

      xhr.onerror = () => {
        setError("Koneksi gagal saat mengunggah berkas.");
        setUploading(false);
      };

      xhr.send(formData);
    } catch (err) {
      setError("Terjadi kesalahan sistem saat memproses.");
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F2] flex items-center justify-center p-8 font-sans">
        <div className="text-center bg-[#FFFFFF] border-3 border-[#111111] p-8 shadow-[5px_5px_0px_#111111]">
          <div className="h-8 w-8 border-4 border-[#111111] border-t-[#FFD21F] animate-spin mx-auto mb-4"></div>
          <p className="text-xs text-[#111111] font-black tracking-widest uppercase font-mono">Memuat detail lembar tugas...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-[#F2F2F2] text-[#111111] p-8 flex flex-col items-center justify-center font-sans">
        <AlertCircle className="h-12 w-12 text-[#111111] mb-4" />
        <h3 className="font-sans font-black text-lg tracking-tight uppercase">Tugas Tidak Ditemukan</h3>
        <button onClick={onBack} className="mt-6 text-xs font-bold uppercase tracking-widest bg-[#FFD21F] border-3 border-[#111111] px-5 py-3 shadow-[3px_3px_0px_#111111] cursor-pointer">
          Kembali ke Tugas
        </button>
      </div>
    );
  }

  const isFormActive = !submission || showRevisionForm;

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-[#111111] font-sans antialiased pb-20 relative">
      
      {/* HEADER SECTION */}
      <header className="border-b-3 border-[#111111] bg-[#FFFFFF] sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#111111] bg-[#FFFFFF] hover:bg-[#111111] hover:text-[#FFFFFF] border-3 border-[#111111] px-4 py-2 shadow-[3px_3px_0px_#111111] transition-all cursor-pointer font-mono"
          >
            <ArrowLeft className="h-4 w-4 stroke-[3px]" />
            Kembali
          </button>
          <span className="text-xs font-black text-[#111111] bg-[#FFD21F] border-3 border-[#111111] px-4 py-2 font-mono uppercase tracking-widest shadow-[2px_2px_0px_#111111]">
            Lembar {String(assignment.number).padStart(2, "0")}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-10">
        
        {/* TASK BRIEF DETAILS */}
        <div className="mb-10 bg-[#FFFFFF] border-3 border-[#111111] p-6 md:p-8 shadow-[5px_5px_0px_#111111]">
          <span className="text-[10px] font-bold text-[#FFFFFF] bg-[#111111] uppercase tracking-widest inline-block mb-3 px-2 py-0.5 font-mono">DETAIL PENUGASAN JURNALISTIK</span>
          <h1 className="font-sans font-black text-2xl md:text-4xl text-[#111111] leading-none uppercase tracking-tight mb-4">
            {assignment.title}
          </h1>
          <div className="text-xs text-[#111111] leading-relaxed font-semibold whitespace-pre-line bg-[#F2F2F2] border-2 border-[#111111] p-6">
            {assignment.description}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-[#FFFFFF] border-3 border-[#111111] p-4 text-center shadow-[2px_2px_0px_#111111]">
              <span className="text-[9px] font-bold text-[#111111] uppercase tracking-widest block mb-1 font-mono">Maks. File</span>
              <span className="text-xs font-black text-[#111111] uppercase font-mono">{assignment.maxFiles} Berkas</span>
            </div>
            <div className="bg-[#FFFFFF] border-3 border-[#111111] p-4 text-center shadow-[2px_2px_0px_#111111]">
              <span className="text-[9px] font-bold text-[#111111] uppercase tracking-widest block mb-1 font-mono">Maks. Ukuran</span>
              <span className="text-xs font-black text-[#111111] uppercase font-mono">{assignment.maxFileSizeMB} MB / file</span>
            </div>
            <div className="bg-[#FFFFFF] border-3 border-[#111111] p-4 text-center shadow-[2px_2px_0px_#111111]">
              <span className="text-[9px] font-bold text-[#111111] uppercase tracking-widest block mb-1 font-mono">Format File</span>
              <span className="text-xs font-black text-[#18A558] uppercase tracking-wider block font-mono leading-none pt-0.5">
                {assignment.type === "photo" ? "JPG, PNG, WEBP" : assignment.type === "pdf" ? "PDF" : "Foto / PDF"}
              </span>
            </div>
            <div className="bg-[#FFFFFF] border-3 border-[#111111] p-4 text-center shadow-[2px_2px_0px_#111111]">
              <span className="text-[9px] font-bold text-[#111111] uppercase tracking-widest block mb-1 font-mono">Batas Waktu</span>
              <span className="text-[11px] font-black text-[#111111] block leading-tight font-mono uppercase">
                {new Date(assignment.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-[#111111] border-3 border-[#111111] text-xs text-[#FFFFFF] mb-8 font-mono">
            <AlertCircle className="h-5 w-5 shrink-0 text-[#FFD21F]" />
            <span className="uppercase font-bold">{error}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* SUCCESS OVERLAY STATE */}
          {uploadSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-[#FFFFFF] border-3 border-[#111111] p-8 md:p-10 shadow-[6px_6px_0px_#18A558] text-center mb-8 relative"
            >
              <div className="h-14 w-14 bg-[#18A558] text-[#FFFFFF] border-3 border-[#111111] flex items-center justify-center mx-auto mb-5 shadow-[3px_3px_0px_#111111]">
                <CheckCircle2 className="h-8 w-8 stroke-[3px]" />
              </div>
              <h2 className="font-sans font-black text-2xl text-[#111111] uppercase tracking-tight">Tugas Berhasil Terkirim</h2>
              <p className="text-xs text-[#111111] mt-2 max-w-sm mx-auto leading-relaxed font-semibold">
                Berkas liputan berita Anda telah berhasil diunggah dan disimpan ke server Redaksi Jurnal SMAN 90.
              </p>
              <div className="bg-[#F2F2F2] border-3 border-[#111111] p-4 max-w-xs mx-auto mt-6 text-left space-y-2 font-mono">
                <div className="text-[11px] text-[#111111] truncate font-bold">
                  <span>TUGAS:</span> {assignment.title}
                </div>
                <div className="text-[11px] text-[#111111] font-bold">
                  <span>WAKTU:</span> {new Date().toLocaleString("id-ID")}
                </div>
                <div className="text-[11px] text-[#111111] flex items-center gap-1.5 font-bold">
                  <span>STATUS:</span> <span className="text-[#18A558] font-black">✓ SUCCESS</span>
                </div>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => setUploadSuccess(false)}
                  className="px-5 py-3 bg-[#FFD21F] hover:bg-[#18A558] hover:text-[#FFFFFF] text-[#111111] font-black text-xs uppercase tracking-widest border-3 border-[#111111] shadow-[3px_3px_0px_#111111] transition-all cursor-pointer"
                >
                  Lihat Status Pengiriman
                </button>
                <button
                  onClick={onBack}
                  className="px-5 py-3 bg-[#FFFFFF] hover:bg-[#111111] hover:text-[#FFFFFF] text-[#111111] font-black text-xs uppercase tracking-widest border-3 border-[#111111] shadow-[3px_3px_0px_#111111] transition-all cursor-pointer"
                >
                  Dashboard Utama
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SUBMISSION STATUS PREVIEW */}
        {submission && !showRevisionForm && (
          <div className="bg-[#FFFFFF] border-3 border-[#111111] p-6 md:p-8 shadow-[5px_5px_0px_#18A558] mb-8 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-3 border-dashed border-[#111111]">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#FFFFFF] bg-[#18A558] border-2 border-[#111111] py-1 px-3 rounded-none font-mono uppercase tracking-wider shadow-[2px_2px_0px_#111111]">
                  ✓ BERKAS TERKIRIM
                </span>
                <span className="block text-[11px] text-[#111111] mt-3 font-mono font-bold">
                  Dikirim pada {new Date(submission.submittedAt).toLocaleString("id-ID")} WIB (Versi {submission.version})
                </span>
              </div>
              
              <button
                onClick={() => {
                  setSelectedFiles([]);
                  setShowRevisionForm(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#FFD21F] hover:bg-[#111111] hover:text-[#FFFFFF] text-[#111111] border-3 border-[#111111] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer font-mono shadow-[3px_3px_0px_#111111] hover:shadow-[1px_1px_0px_#111111]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Kirim Revisi (v{submission.version + 1})
              </button>
            </div>

            {/* List of submitted files */}
            <div className="pt-5">
              <h3 className="text-[10px] font-bold text-[#111111] uppercase tracking-widest mb-4 font-mono">Arsip Berkas:</h3>
              <div className="space-y-4">
                {submission.files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 bg-[#F2F2F2] border-3 border-[#111111] shadow-[2px_2px_0px_#111111]">
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      {file.mimeType.includes("pdf") ? (
                        <div className="h-10 w-10 bg-[#FFFFFF] border-2 border-[#111111] flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-[#111111]" />
                        </div>
                      ) : (
                        <img
                          src={file.storagePath}
                          alt={file.originalName}
                          referrerPolicy="no-referrer"
                          className="h-11 w-11 object-cover bg-white shrink-0 border-2 border-[#111111]"
                        />
                      )}
                      <div className="min-w-0 font-mono">
                        <span className="block text-xs font-black text-[#111111] truncate">
                          {file.storedName}
                        </span>
                        <span className="block text-[10px] text-[#111111] mt-0.5 font-bold">
                          {file.originalName} • {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    </div>

                    <a
                      href={file.storagePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#111111] bg-[#FFFFFF] hover:bg-[#111111] hover:text-[#FFFFFF] px-4 py-2 border-3 border-[#111111] transition-colors cursor-pointer font-mono shadow-[2px_2px_0px_#111111]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBMISSION UPLOAD FORM CARD */}
        {isFormActive && !uploadSuccess && (
          <div className="bg-[#FFFFFF] border-3 border-[#111111] p-6 md:p-8 shadow-[5px_5px_0px_#111111] relative">
            <div className="mb-6">
              <h2 className="font-sans font-black text-xl md:text-2xl text-[#111111] uppercase tracking-tight">
                {showRevisionForm ? `Submit Revisi (Versi ${submission ? submission.version + 1 : 2})` : "Kirim Berkas Jurnalistik"}
              </h2>
              <p className="text-xs text-[#111111] mt-1 font-semibold leading-relaxed">
                Lampirkan laporan liputan berita, dokumen PDF, atau foto jurnalistik hasil investigasi lapangan Anda.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* HIDDEN INPUT FOR MULTIPLE FILES */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />

              {/* UPLOAD TRIGGER AREA */}
              <div
                onClick={uploading ? undefined : triggerFileSelect}
                className={`border-3 border-dashed p-8 text-center cursor-pointer transition-all ${
                  uploading
                    ? "bg-[#F2F2F2] border-[#111111] cursor-not-allowed"
                    : "border-[#111111] bg-[#F2F2F2] hover:bg-[#FFD21F]/10"
                }`}
              >
                <UploadCloud className="h-10 w-10 text-[#111111] mx-auto mb-3" />
                <span className="block text-sm font-black text-[#111111] uppercase tracking-wider">
                  PILIH BERKAS DARI GALERI / FOLDER
                </span>
                <span className="block text-[10px] text-[#111111] mt-1 font-mono font-bold">
                  Mendukung JPG, PNG, WEBP, atau PDF (Maks. {assignment.maxFileSizeMB} MB)
                </span>
                <button
                  type="button"
                  disabled={uploading}
                  className="mt-4 px-4 py-2.5 bg-[#FFFFFF] hover:bg-[#111111] hover:text-[#FFFFFF] border-3 border-[#111111] text-[10px] font-black uppercase tracking-widest text-[#111111] transition-colors shadow-[2px_2px_0px_#111111]"
                >
                  + Tambah File
                </button>
              </div>

              {/* LIST OF SELECTED FILES FOR PREVIEW */}
              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-[#111111] uppercase tracking-widest font-mono">
                      {selectedFiles.length} berkas dipilih
                    </h3>
                    {selectedFiles.length > assignment.maxFiles && (
                      <span className="text-xs text-[#111111] font-black uppercase bg-[#FFD21F] px-2 py-0.5 border-2 border-[#111111]">Melebihi batas file!</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {selectedFiles.map((file, index) => {
                      const sizeMB = file.size / (1024 * 1024);
                      const isLarge = sizeMB > assignment.maxFileSizeMB;
                      const preview = filePreviews[index];

                      return (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3.5 border-3 ${
                            isLarge ? "bg-[#111111] text-[#FFFFFF] border-[#111111]" : "bg-[#F2F2F2] border-[#111111]"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-4">
                            {preview?.isPdf ? (
                              <div className="h-10 w-10 bg-[#FFFFFF] border-2 border-[#111111] flex items-center justify-center shrink-0">
                                <FileText className="h-5 w-5 text-[#111111]" />
                              </div>
                            ) : preview?.url ? (
                              <img
                                src={preview.url}
                                alt="Selected preview"
                                className="h-10 w-10 object-cover bg-white shrink-0 border-2 border-[#111111]"
                              />
                            ) : (
                              <div className="h-10 w-10 bg-[#FFFFFF] border-2 border-[#111111] flex items-center justify-center shrink-0">
                                <FileText className="h-5 w-5 text-[#111111]" />
                              </div>
                            )}

                            <div className="min-w-0 font-mono">
                              <span className="block text-xs font-black truncate">
                                {file.name}
                              </span>
                              <span className={`block text-[10px] mt-0.5 font-bold ${isLarge ? "text-[#FFD21F]" : "text-[#111111]"}`}>
                                {sizeMB.toFixed(2)} MB {isLarge && "(BATAS TERLAMPAUI)"}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={uploading}
                            onClick={() => removeFile(index)}
                            className="p-1.5 text-inherit hover:bg-[#111111] hover:text-[#FFFFFF] border-2 border-transparent hover:border-[#111111] transition-all cursor-pointer"
                          >
                            <X className="h-4 w-4 stroke-[3px]" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PROGRESS BAR */}
              {uploading && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[10px] font-black text-[#111111] font-mono">
                    <span>MENGIRIM FILE REDAKSI...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#FFFFFF] h-5 border-3 border-[#111111] overflow-hidden p-[2px]">
                    <div
                      className="bg-[#18A558] h-full transition-all duration-300 border-r-2 border-[#111111]"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* ACTIONS */}
              <div className="flex gap-4 pt-4 border-t-3 border-dashed border-[#111111]">
                <button
                  type="submit"
                  disabled={uploading || selectedFiles.length === 0 || selectedFiles.length > assignment.maxFiles}
                  className="flex-1 py-4 px-6 bg-[#FFD21F] hover:bg-[#18A558] hover:text-[#FFFFFF] text-[#111111] font-black text-xs uppercase tracking-widest border-3 border-[#111111] shadow-[4px_4px_0px_#111111] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 font-mono"
                >
                  {uploading ? "MENGIRIM BERKAS..." : "KIRIM TUGAS JURNALISTIK"}
                </button>

                {showRevisionForm && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => {
                      setSelectedFiles([]);
                      setShowRevisionForm(false);
                    }}
                    className="py-4 px-6 bg-[#FFFFFF] hover:bg-[#111111] hover:text-[#FFFFFF] text-[#111111] font-black border-3 border-[#111111] text-xs uppercase tracking-widest rounded-none shadow-[4px_4px_0px_#111111] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer font-mono"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
