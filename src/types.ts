/**
 * Domain Entities for TugasHub
 */

export interface Period {
  id: string; // e.g. "2026-09"
  name: string; // e.g. "September 2026"
  month: number; // 1-12
  year: number; // e.g. 2026
  status: "active" | "archived";
}

export interface Student {
  nisn: string; // unique 10-digit number
  name: string;
  className: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type AssignmentType = "photo" | "pdf" | "mixed";

export interface Assignment {
  id: string;
  periodId: string;
  number: number; // sequence number (1, 2, 3, 4)
  title: string;
  description: string;
  type: AssignmentType;
  allowedFileTypes: string[];
  maxFiles: number;
  maxFileSizeMB: number;
  deadline: string; // ISO string
  active: boolean;
}

export interface SubmissionFile {
  originalName: string;
  storedName: string;
  storagePath: string; // firebase storage path or simulated local upload path
  mimeType: string;
  size: number;
  driveFileId?: string;
  driveUrl?: string;
}

export type SubmissionStatus = "submitted" | "drive_sync_failed" | "failed" | "processing";

export interface Submission {
  id: string;
  nisn: string;
  studentName: string;
  className: string;
  periodId: string;
  assignmentId: string;
  version: number; // starts at 1, incremented on revision
  files: SubmissionFile[];
  status: SubmissionStatus;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherUser {
  uid: string;
  email: string;
  displayName: string;
  role: "teacher";
}

export interface DashboardSummary {
  totalMembers: number;
  submittedCount: number;
  notSubmittedCount: number;
  progressPercentage: number;
}
