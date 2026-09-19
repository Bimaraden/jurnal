import fs from "fs";
import path from "path";
import { Student, Assignment, Period, Submission } from "./src/types";

const DB_FILE = path.join(process.cwd(), "db.json");

interface DatabaseSchema {
  students: Student[];
  assignments: Assignment[];
  periods: Period[];
  submissions: Submission[];
  googleDrive?: {
    refreshToken?: string;
    connected?: boolean;
    connectedAt?: string;
    teacherEmail?: string;
    clientId?: string;
    clientSecret?: string;
  };
}

const INITIAL_DATA: DatabaseSchema = {
  periods: [
    {
      id: "2026-08",
      name: "Agustus 2026",
      month: 8,
      year: 2026,
      status: "archived"
    },
    {
      id: "2026-09",
      name: "September 2026",
      month: 9,
      year: 2026,
      status: "active"
    },
    {
      id: "2026-10",
      name: "Oktober 2026",
      month: 10,
      year: 2026,
      status: "archived"
    }
  ],
  students: [
    {
      nisn: "0012345678",
      name: "Budi Santoso",
      className: "XI-1",
      active: true,
      createdAt: new Date("2026-08-01").toISOString()
    },
    {
      nisn: "0012345679",
      name: "Andi Pratama",
      className: "XI-1",
      active: true,
      createdAt: new Date("2026-08-01").toISOString()
    },
    {
      nisn: "0012345680",
      name: "Citra Ramadhani",
      className: "XI-2",
      active: true,
      createdAt: new Date("2026-08-01").toISOString()
    },
    {
      nisn: "0012345681",
      name: "Dewi Lestari",
      className: "XII-MIPA-3",
      active: true,
      createdAt: new Date("2026-08-01").toISOString()
    }
  ],
  assignments: [
    {
      id: "task-01",
      periodId: "2026-09",
      number: 1,
      title: "Liputan Kegiatan Sekolah",
      description: "Ambil beberapa foto jurnalistik dokumentasi kegiatan sekolah (upacara bendera, bazar, atau rapat OSIS) yang memiliki muatan berita kuat. Sertakan keterangan foto singkat.",
      type: "photo",
      allowedFileTypes: ["image/jpeg", "image/png", "image/webp"],
      maxFiles: 5,
      maxFileSizeMB: 10,
      deadline: "2026-09-25T23:59:59.000Z",
      active: true
    },
    {
      id: "task-02",
      periodId: "2026-09",
      number: 2,
      title: "Foto Jurnalistik (Human Interest)",
      description: "Ambil foto human interest di lingkungan sekolah yang menggambarkan interaksi humanis antara warga sekolah. Foto harus orisinal dan tidak boleh hasil rekayasa.",
      type: "photo",
      allowedFileTypes: ["image/jpeg", "image/png", "image/webp"],
      maxFiles: 3,
      maxFileSizeMB: 10,
      deadline: "2026-09-28T23:59:59.000Z",
      active: true
    },
    {
      id: "task-03",
      periodId: "2026-09",
      number: 3,
      title: "Artikel Berita Kebersihan",
      description: "Tulis sebuah artikel berita mengenai kampanye kebersihan lingkungan sekolah yang baru dirintis. Berkas wajib berformat PDF dengan bahasa jurnalistik baku.",
      type: "pdf",
      allowedFileTypes: ["application/pdf"],
      maxFiles: 1,
      maxFileSizeMB: 10,
      deadline: "2026-09-30T23:59:59.000Z",
      active: true
    },
    {
      id: "task-04",
      periodId: "2026-09",
      number: 4,
      title: "Dokumentasi Ekskul Mingguan",
      description: "Kumpulkan dokumentasi kegiatan kumpul ekskul Jurnalistik minggu ini beserta tulisan refleksi singkat dalam bentuk PDF atau kompilasi foto.",
      type: "mixed",
      allowedFileTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
      maxFiles: 4,
      maxFileSizeMB: 10,
      deadline: "2026-10-02T23:59:59.000Z",
      active: true
    }
  ],
  submissions: [],
  googleDrive: {}
};

class DBService {
  private data: DatabaseSchema;

  constructor() {
    this.data = { ...INITIAL_DATA };
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(fileContent);
        this.data = {
          periods: parsed.periods || INITIAL_DATA.periods,
          students: parsed.students || INITIAL_DATA.students,
          assignments: parsed.assignments || INITIAL_DATA.assignments,
          submissions: parsed.submissions || INITIAL_DATA.submissions,
          googleDrive: parsed.googleDrive || INITIAL_DATA.googleDrive
        };
      } else {
        this.save();
      }
    } catch (e) {
      console.error("Failed to load local DB, using in-memory state", e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write to local DB", e);
    }
  }

  // --- Periods ---
  getPeriods(): Period[] {
    return this.data.periods;
  }

  savePeriod(period: Period): Period {
    const idx = this.data.periods.findIndex((p) => p.id === period.id);
    if (idx >= 0) {
      this.data.periods[idx] = period;
    } else {
      this.data.periods.push(period);
    }
    this.save();
    return period;
  }

  deletePeriod(id: string): boolean {
    const idx = this.data.periods.findIndex((p) => p.id === id);
    if (idx >= 0) {
      this.data.periods.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  // --- Students ---
  getStudents(): Student[] {
    return this.data.students;
  }

  getStudentByNisn(nisn: string): Student | undefined {
    return this.data.students.find((s) => s.nisn === nisn);
  }

  saveStudent(student: Student): Student {
    const idx = this.data.students.findIndex((s) => s.nisn === student.nisn);
    if (idx >= 0) {
      this.data.students[idx] = { ...this.data.students[idx], ...student, updatedAt: new Date().toISOString() };
    } else {
      this.data.students.push({ ...student, createdAt: new Date().toISOString() });
    }
    this.save();
    return this.getStudentByNisn(student.nisn)!;
  }

  deleteStudent(nisn: string): boolean {
    const idx = this.data.students.findIndex((s) => s.nisn === nisn);
    if (idx >= 0) {
      this.data.students.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  // --- Assignments ---
  getAssignments(): Assignment[] {
    return this.data.assignments;
  }

  getAssignmentsByPeriod(periodId: string): Assignment[] {
    return this.data.assignments.filter((a) => a.periodId === periodId);
  }

  saveAssignment(assignment: Assignment): Assignment {
    const idx = this.data.assignments.findIndex((a) => a.id === assignment.id);
    if (idx >= 0) {
      this.data.assignments[idx] = assignment;
    } else {
      this.data.assignments.push(assignment);
    }
    this.save();
    return assignment;
  }

  deleteAssignment(id: string): boolean {
    const idx = this.data.assignments.findIndex((a) => a.id === id);
    if (idx >= 0) {
      this.data.assignments.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  // --- Submissions ---
  getSubmissions(): Submission[] {
    return this.data.submissions;
  }

  getSubmission(id: string): Submission | undefined {
    return this.data.submissions.find((s) => s.id === id);
  }

  getStudentSubmissions(nisn: string): Submission[] {
    return this.data.submissions.filter((s) => s.nisn === nisn);
  }

  getStudentSubmissionForAssignment(nisn: string, assignmentId: string): Submission | undefined {
    return this.data.submissions.find(
      (s) => s.nisn === nisn && s.assignmentId === assignmentId
    );
  }

  saveSubmission(submission: Submission): Submission {
    const idx = this.data.submissions.findIndex((s) => s.id === submission.id);
    if (idx >= 0) {
      this.data.submissions[idx] = submission;
    } else {
      this.data.submissions.push(submission);
    }
    this.save();
    return submission;
  }

  // --- Google Drive Config ---
  getGoogleDriveConfig() {
    return this.data.googleDrive || {};
  }

  saveGoogleDriveConfig(config: any) {
    this.data.googleDrive = {
      ...(this.data.googleDrive || {}),
      ...config
    };
    this.save();
  }
}

export const dbService = new DBService();
