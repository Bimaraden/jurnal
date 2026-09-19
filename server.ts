import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import { dbService } from "./server-db";
import { Student, Assignment, Period, Submission, SubmissionFile } from "./src/types";

const app = express();
const PORT = 3000;

// Ensure uploads folder exists in public/uploads
const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ----------------------------------------------------
// MIDDLEWARES
// ----------------------------------------------------

app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "*"],
        connectSrc: ["'self'", "ws:", "wss:", "*"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "data:", "blob:"],
        frameAncestors: ["'self'", "*"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use("/uploads", express.static(uploadsDir));

// Simple rate limiter to prevent enumeration & spamming
const rateLimits = new Map<string, { count: number; resetAt: number }>();
function rateLimitMiddleware(limit: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || "unknown";
    const now = Date.now();
    const record = rateLimits.get(ip);

    if (!record || now > record.resetAt) {
      rateLimits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= limit) {
      return res.status(429).json({
        error: "Terlalu banyak permintaan dari IP Anda. Silakan coba beberapa saat lagi.",
      });
    }

    record.count++;
    next();
  };
}

// ----------------------------------------------------
// MULTER FILE CONFIGURATION
// ----------------------------------------------------

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // We generate a temp filename first, then rename it securely in the controller
    // when we have verified the student identity from database.
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `temp-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // default limit 10MB (will be custom validated inside endpoint as well)
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Format file tidak didukung. Hanya menerima JPG, PNG, WEBP, dan PDF."));
    }
  },
});

// Helper: Sanitize string for filenames
function sanitizeForFilename(str: string): string {
  return str
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "") // remove non-alphanumeric except underscore and dash
    .replace(/(\.\.\/|\\|\/|:|\*|\?|"|<|>|\|)/g, ""); // prevent traversal/escapes
}

// Helper: Sanitize CSV values to prevent formula injection (=, +, -, @)
function sanitizeCSVCell(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.startsWith("=") || str.startsWith("+") || str.startsWith("-") || str.startsWith("@")) {
    return `'${str}`; // Prefix with single quote to escape
  }
  return str;
}

// Helper: Sync Student Submission to Google Drive
async function syncSubmissionToDrive(submissionId: string) {
  const submission = dbService.getSubmission(submissionId);
  if (!submission) return;

  const config = dbService.getGoogleDriveConfig();
  if (!config || !config.refreshToken) {
    submission.status = "drive_sync_failed";
    dbService.saveSubmission(submission);
    return;
  }

  // --- DEMO MODE SUPPORT ---
  if (config.refreshToken === "demo_mode") {
    // Simulate a short upload/network latency
    await new Promise((resolve) => setTimeout(resolve, 1500));
    submission.status = "submitted";
    submission.files.forEach((file, index) => {
      const mockId = `demo-gdrive-file-${submission.id}-${index}`;
      file.driveFileId = mockId;
      file.driveUrl = `https://drive.google.com/open?id=${mockId}`;
    });
    submission.updatedAt = new Date().toISOString();
    dbService.saveSubmission(submission);
    return;
  }

  try {
    const clientId = config.clientId || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = config.clientSecret || process.env.GOOGLE_CLIENT_SECRET;
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret
    );
    oauth2Client.setCredentials({
      refresh_token: config.refreshToken
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Use root folder from environment if defined
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "root";

    // 1. Get or create Period folder
    const period = dbService.getPeriods().find((p) => p.id === submission.periodId);
    const periodName = period ? period.name : submission.periodId;
    const periodFolderId = await getOrCreateFolder(drive, periodName, rootFolderId);

    // 2. Get or create Assignment folder
    const assignment = dbService.getAssignments().find((a) => a.id === submission.assignmentId);
    const assignmentName = assignment ? `Tugas ${assignment.number} - ${assignment.title}` : submission.assignmentId;
    const assignmentFolderId = await getOrCreateFolder(drive, assignmentName, periodFolderId);

    // 3. Upload each file
    let hasFailed = false;
    for (const file of submission.files) {
      const localFilePath = path.join(uploadsDir, file.storedName);
      if (!fs.existsSync(localFilePath)) {
        hasFailed = true;
        continue;
      }

      const fileMetadata = {
        name: file.storedName,
        parents: [assignmentFolderId],
      };

      const media = {
        mimeType: file.mimeType,
        body: fs.createReadStream(localFilePath),
      };

      try {
        const response = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: "id, webViewLink",
        });

        if (response.data.id) {
          file.driveFileId = response.data.id;
          file.driveUrl = response.data.webViewLink || `https://drive.google.com/open?id=${response.data.id}`;

          // Make file publicly readable
          try {
            await drive.permissions.create({
              fileId: response.data.id,
              requestBody: {
                role: "reader",
                type: "anyone",
              },
            });
          } catch (errPerm) {
            console.error("Could not set permission for file:", file.storedName, errPerm);
          }
        } else {
          hasFailed = true;
        }
      } catch (errUpload) {
        console.error("File upload to Drive failed:", file.storedName, errUpload);
        hasFailed = true;
      }
    }

    submission.status = hasFailed ? "drive_sync_failed" : "submitted";
    submission.updatedAt = new Date().toISOString();
    dbService.saveSubmission(submission);
  } catch (err) {
    console.error("Error in syncSubmissionToDrive:", err);
    submission.status = "drive_sync_failed";
    dbService.saveSubmission(submission);
  }
}

// Helper: Get or Create Google Drive Folder
async function getOrCreateFolder(drive: any, folderName: string, parentId: string): Promise<string> {
  try {
    const q = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`;
    const response = await drive.files.list({
      q,
      spaces: "drive",
      fields: "files(id, name)",
    });

    const files = response.data.files || [];
    if (files.length > 0) {
      return files[0].id;
    }

    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    };

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });

    return folder.data.id;
  } catch (err) {
    console.error("Error in getOrCreateFolder:", folderName, err);
    throw err;
  }
}

// ----------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------

// STUDENT: Verify NISN
app.post("/api/student/verify", rateLimitMiddleware(15, 60000), (req, res) => {
  const { nisn } = req.body;
  if (!nisn || typeof nisn !== "string" || nisn.trim().length !== 10) {
    return res.status(400).json({ error: "NISN tidak valid. Harus berupa 10 digit angka." });
  }

  const student = dbService.getStudentByNisn(nisn.trim());
  if (!student) {
    return res.status(404).json({ error: "NISN tidak ditemukan di sistem Jurnalistik." });
  }

  if (!student.active) {
    return res.status(403).json({ error: "Akun siswa Anda sudah dinonaktifkan." });
  }

  // Generate a mock student authorization token (for simple security in demo mode)
  const studentToken = Buffer.from(student.nisn).toString("base64");

  res.json({
    student,
    token: studentToken,
  });
});

// Auth Helpers
function getStudentFromHeaders(req: express.Request): Student | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const base64Nisn = authHeader.substring(7);
    const nisn = Buffer.from(base64Nisn, "base64").toString("utf-8");
    const student = dbService.getStudentByNisn(nisn);
    return student && student.active ? student : null;
  } catch (e) {
    return null;
  }
}

function getTeacherFromHeaders(req: express.Request): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;
  // Simple check for demo token
  return authHeader === "Bearer teacher-super-secret-token";
}

// STUDENT: Get Active Tasks
app.get("/api/student/tasks", (req, res) => {
  const student = getStudentFromHeaders(req);
  if (!student) {
    return res.status(401).json({ error: "Sesi tidak valid. Silakan login kembali dengan NISN Anda." });
  }

  // Find the active period
  const activePeriod = dbService.getPeriods().find((p) => p.status === "active");
  if (!activePeriod) {
    return res.json({ period: null, tasks: [], submissions: [] });
  }

  // Get active assignments for that active period (max 4 as per design rules)
  const tasks = dbService
    .getAssignmentsByPeriod(activePeriod.id)
    .filter((a) => a.active)
    .sort((a, b) => a.number - b.number)
    .slice(0, 4);

  // Get current submissions for this student
  const submissions = dbService.getStudentSubmissions(student.nisn);

  res.json({
    period: activePeriod,
    tasks,
    submissions,
  });
});

// STUDENT: Get Single Task details with existing Submission
app.get("/api/student/tasks/:taskId", (req, res) => {
  const student = getStudentFromHeaders(req);
  if (!student) {
    return res.status(401).json({ error: "Sesi tidak valid." });
  }

  const { taskId } = req.params;
  const assignment = dbService.getAssignments().find((a) => a.id === taskId);
  if (!assignment) {
    return res.status(404).json({ error: "Tugas tidak ditemukan." });
  }

  const submission = dbService.getStudentSubmissionForAssignment(student.nisn, taskId);

  res.json({
    assignment,
    submission: submission || null,
  });
});

// STUDENT: Submit Assignment Form (Handles File uploads & Versioning)
app.post("/api/submissions", rateLimitMiddleware(10, 60000), (req, res) => {
  // We manually run upload.array inside to handle error states gracefully
  const uploadHandler = upload.array("files", 10);

  uploadHandler(req, res, async (err) => {
    const student = getStudentFromHeaders(req);
    if (!student) {
      // Clean up temp uploaded files if user is unauthorized
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((f: any) => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
      }
      return res.status(401).json({ error: "Sesi tidak valid. Silakan verifikasi NISN Anda." });
    }

    if (err) {
      return res.status(400).json({ error: err.message || "Gagal mengunggah berkas." });
    }

    const { assignmentId } = req.body;
    if (!assignmentId) {
      // Cleanup files
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((f: any) => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
      }
      return res.status(400).json({ error: "ID Tugas (assignmentId) wajib diisi." });
    }

    const assignment = dbService.getAssignments().find((a) => a.id === assignmentId);
    if (!assignment) {
      // Cleanup files
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((f: any) => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
      }
      return res.status(404).json({ error: "Tugas tidak ditemukan." });
    }

    if (!assignment.active) {
      // Cleanup files
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((f: any) => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
      }
      return res.status(400).json({ error: "Tugas ini sudah dinonaktifkan." });
    }

    // Server-Side Deadline Check
    const deadlineDate = new Date(assignment.deadline);
    const now = new Date();
    if (now > deadlineDate) {
      // Cleanup files
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((f: any) => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
      }
      return res.status(400).json({ error: "Batas waktu pengumpulan tugas (deadline) sudah lewat." });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Pilih minimal 1 berkas untuk dikumpulkan." });
    }

    // Validate maximum file count
    if (files.length > assignment.maxFiles) {
      files.forEach((f) => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
      return res.status(400).json({
        error: `Jumlah berkas melebihi batas. Maksimal berkas yang diizinkan adalah ${assignment.maxFiles}.`,
      });
    }

    // Validate each file size and MIME type on the server
    for (const f of files) {
      const fileSizeMB = f.size / (1024 * 1024);
      if (fileSizeMB > assignment.maxFileSizeMB) {
        // Cleanup all
        files.forEach((fileToDel) => {
          if (fs.existsSync(fileToDel.path)) fs.unlinkSync(fileToDel.path);
        });
        return res.status(400).json({
          error: `Berkas "${f.originalname}" terlalu besar (${fileSizeMB.toFixed(2)} MB). Maksimal ukuran file adalah ${assignment.maxFileSizeMB} MB.`,
        });
      }

      if (!assignment.allowedFileTypes.includes(f.mimetype)) {
        // Cleanup all
        files.forEach((fileToDel) => {
          if (fs.existsSync(fileToDel.path)) fs.unlinkSync(fileToDel.path);
        });
        return res.status(400).json({
          error: `Tipe berkas "${f.originalname}" tidak diizinkan. Hanya menerima tipe yang sesuai dengan spesifikasi tugas.`,
        });
      }
    }

    // Find previous submission for versioning
    const existingSubmission = dbService.getStudentSubmissionForAssignment(student.nisn, assignmentId);
    const newVersion = existingSubmission ? existingSubmission.version + 1 : 1;

    // Get Period info
    const period = dbService.getPeriods().find((p) => p.id === assignment.periodId);
    const periodNameSanitized = sanitizeForFilename(period ? period.name : assignment.periodId);
    const studentNameSanitized = sanitizeForFilename(student.name);
    const classNameSanitized = sanitizeForFilename(student.className);
    const taskTitleSanitized = sanitizeForFilename(assignment.title);

    // Process and rename uploaded files with clean name standard
    // [NISN]_[NAMA]_[KELAS]_[PERIODE]_[TASK]_[NUMBER]_v[VERSION].[EXT]
    const processedFiles: SubmissionFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const sequenceNum = String(i + 1).padStart(2, "0");
      const ext = path.extname(f.originalname).toLowerCase();
      const finalFilename = `${student.nisn}_${studentNameSanitized}_${classNameSanitized}_${periodNameSanitized}_${taskTitleSanitized}_${sequenceNum}_v${newVersion}${ext}`;
      const finalPath = path.join(uploadsDir, finalFilename);

      try {
        // Rename file on disk to official schema
        fs.renameSync(f.path, finalPath);
        processedFiles.push({
          originalName: f.originalname,
          storedName: finalFilename,
          storagePath: `/uploads/${finalFilename}`,
          mimeType: f.mimetype,
          size: f.size,
        });
      } catch (errMove) {
        console.error("Error renaming uploaded file:", errMove);
        // Fallback with original temp name if rename fails
        processedFiles.push({
          originalName: f.originalname,
          storedName: f.filename,
          storagePath: `/uploads/${f.filename}`,
          mimeType: f.mimetype,
          size: f.size,
        });
      }
    }

    // Save submission to DB
    const submissionId = existingSubmission ? existingSubmission.id : `sub-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    const submission: Submission = {
      id: submissionId,
      nisn: student.nisn,
      studentName: student.name,
      className: student.className,
      periodId: assignment.periodId,
      assignmentId: assignment.id,
      version: newVersion,
      files: processedFiles,
      status: "submitted", // Default to success, Drive sync simulator handled inside
      submittedAt: new Date().toISOString(),
      createdAt: existingSubmission ? existingSubmission.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbService.saveSubmission(submission);

    // Sync to Google Drive in the background if connected
    const driveConfig = dbService.getGoogleDriveConfig();
    if (driveConfig && driveConfig.refreshToken) {
      syncSubmissionToDrive(submission.id).catch((err) => {
        console.error("Failed to initiate background Google Drive sync:", err);
      });
    }

    res.json({
      message: "Tugas berhasil dikumpulkan!",
      submission,
    });
  });
});

// ----------------------------------------------------
// GOOGLE DRIVE OAUTH 2.0 WEB SERVER FLOW
// ----------------------------------------------------

app.get("/api/google/auth", (req, res) => {
  const host = req.get("host");
  const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const redirectUri = `${protocol}://${host}/api/google/callback`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
    prompt: "consent",
  });

  res.redirect(authUrl);
});

app.get("/api/google/callback", async (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== "string") {
    return res.status(400).send("Authorization code is missing.");
  }

  try {
    const host = req.get("host");
    const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const redirectUri = `${protocol}://${host}/api/google/callback`;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (tokens.refresh_token) {
      dbService.saveGoogleDriveConfig({
        refreshToken: tokens.refresh_token,
        connected: true,
        connectedAt: new Date().toISOString(),
        teacherEmail: "",
      });

      // Try to get teacher's email for a nicer display on the dashboard
      try {
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        if (userInfo.data.email) {
          dbService.saveGoogleDriveConfig({
            teacherEmail: userInfo.data.email,
          });
        }
      } catch (errUser) {
        console.error("Failed to fetch Google userinfo:", errUser);
      }

      res.redirect("/teacher/dashboard");
    } else {
      const existing = dbService.getGoogleDriveConfig();
      if (existing && existing.refreshToken) {
        dbService.saveGoogleDriveConfig({
          connected: true,
          connectedAt: new Date().toISOString(),
        });
        res.redirect("/teacher/dashboard");
      } else {
        res.status(400).send(
          "No refresh token returned. Please go to your Google Account Settings -> Security -> Third-party apps with account access, remove TugasHub/Connect to Google Drive, and authorize again."
        );
      }
    }
  } catch (err) {
    console.error("Error in Google OAuth callback:", err);
    res.status(500).send("Gagal mengautentikasi dengan Google Drive: " + (err instanceof Error ? err.message : String(err)));
  }
});

app.get("/api/google/status", async (req, res) => {
  if (!getTeacherFromHeaders(req)) {
    return res.status(403).json({ error: "Akses ditolak." });
  }

  const config = dbService.getGoogleDriveConfig();
  if (!config || !config.refreshToken) {
    return res.json({ status: "disconnected" });
  }

  // --- DEMO MODE SUPPORT ---
  if (config.refreshToken === "demo_mode") {
    return res.json({
      status: "connected",
      teacherEmail: "demo-guru@tugashub.com",
      connectedAt: config.connectedAt || new Date().toISOString(),
      isDemo: true
    });
  }

  try {
    const clientId = config.clientId || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = config.clientSecret || process.env.GOOGLE_CLIENT_SECRET;
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret
    );
    oauth2Client.setCredentials({
      refresh_token: config.refreshToken,
    });

    const { token } = await oauth2Client.getAccessToken();
    if (!token) {
      return res.json({ status: "expired", teacherEmail: config.teacherEmail });
    }

    return res.json({
      status: "connected",
      teacherEmail: config.teacherEmail,
      connectedAt: config.connectedAt,
    });
  } catch (err) {
    console.error("Google Drive status connection check failed:", err);
    return res.json({ status: "expired", teacherEmail: config.teacherEmail });
  }
});

app.post("/api/google/enable-demo", (req, res) => {
  if (!getTeacherFromHeaders(req)) {
    return res.status(403).json({ error: "Akses ditolak." });
  }

  dbService.saveGoogleDriveConfig({
    refreshToken: "demo_mode",
    connected: true,
    connectedAt: new Date().toISOString(),
    teacherEmail: "demo-guru@tugashub.com",
  });

  res.json({
    message: "Demo Mode diaktifkan!",
    status: "connected",
    teacherEmail: "demo-guru@tugashub.com",
  });
});

app.post("/api/google/disconnect", (req, res) => {
  if (!getTeacherFromHeaders(req)) {
    return res.status(403).json({ error: "Akses ditolak." });
  }

  dbService.saveGoogleDriveConfig({
    refreshToken: null,
    connected: false,
    connectedAt: null,
    teacherEmail: null,
  });

  res.json({ message: "Koneksi Google Drive berhasil diputuskan." });
});

app.post("/api/google/save-token", async (req, res) => {
  if (!getTeacherFromHeaders(req)) {
    return res.status(403).json({ error: "Akses ditolak." });
  }

  const { refreshToken, teacherEmail, clientId, clientSecret } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token wajib diisi." });
  }

  try {
    const finalClientId = clientId || process.env.GOOGLE_CLIENT_ID;
    const finalClientSecret = clientSecret || process.env.GOOGLE_CLIENT_SECRET;

    const oauth2Client = new google.auth.OAuth2(
      finalClientId,
      finalClientSecret
    );
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { token } = await oauth2Client.getAccessToken();
    if (!token) {
      return res.status(400).json({ error: "Refresh token tidak valid atau telah kedaluwarsa." });
    }

    // Set access token explicitly to ensure API calls are authenticated
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
      access_token: token,
    });

    let email = teacherEmail || "";
    if (!email) {
      try {
        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        email = userInfo.data.email || "";
      } catch (e) {
        // Userinfo scope may not be authorized in custom playground, which is expected.
        // We log it as a benign debug log instead of console.error to prevent system alerts.
        console.log("Note: Google User Info scope not authorized or inaccessible. Using fallback email.");
      }
    }

    dbService.saveGoogleDriveConfig({
      refreshToken,
      clientId: clientId || undefined,
      clientSecret: clientSecret || undefined,
      connected: true,
      connectedAt: new Date().toISOString(),
      teacherEmail: email || "manual-input@google.com",
    });

    res.json({
      message: "Google Drive berhasil terhubung secara manual!",
      status: "connected",
      teacherEmail: email || "manual-input@google.com",
    });
  } catch (err) {
    console.error("Manual token validation failed:", err);
    res.status(500).json({ error: "Gagal memverifikasi token: " + (err instanceof Error ? err.message : String(err)) });
  }
});

// TEACHER: Login
app.post("/api/teacher/login", (req, res) => {
  const { email, password } = req.body;
  const envEmail = process.env.TEACHER_EMAIL || "guru@jurnalistik.com";
  const envPassword = process.env.TEACHER_PASSWORD || "guruadmin123";

  if (!email || !password) {
    return res.status(400).json({ error: "Email dan kata sandi wajib diisi." });
  }

  if (email.trim().toLowerCase() === envEmail.toLowerCase() && password === envPassword) {
    res.json({
      token: "teacher-super-secret-token",
      teacher: {
        uid: "teacher-01",
        email: envEmail,
        displayName: "Guru Jurnalistik",
        role: "teacher",
      },
    });
  } else {
    res.status(401).json({ error: "Email atau kata sandi pengawas salah." });
  }
});

// TEACHER: Dashboard Statistics
app.get("/api/teacher/dashboard", (req, res) => {
  if (!getTeacherFromHeaders(req)) {
    return res.status(403).json({ error: "Akses ditolak. Hanya untuk Guru/Pengawas Jurnalistik." });
  }

  const selectedPeriodId = (req.query.periodId as string) || dbService.getPeriods().find((p) => p.status === "active")?.id;
  if (!selectedPeriodId) {
    return res.json({
      summary: { totalMembers: 0, submittedCount: 0, notSubmittedCount: 0, progressPercentage: 0 },
      assignments: [],
      missingSubmissions: [],
    });
  }

  const students = dbService.getStudents().filter((s) => s.active);
  const assignments = dbService.getAssignmentsByPeriod(selectedPeriodId);
  const submissions = dbService.getSubmissions().filter((sub) => sub.periodId === selectedPeriodId);

  // Stats
  const totalStudents = students.length;
  const totalPossibleSubmissions = totalStudents * assignments.length;
  const actualSubmissions = submissions.length;

  const progressPercentage = totalPossibleSubmissions > 0
    ? Math.round((actualSubmissions / totalPossibleSubmissions) * 100)
    : 0;

  // Compile statistics per assignment
  const assignmentStats = assignments.map((assign) => {
    const subCount = submissions.filter((s) => s.assignmentId === assign.id).length;
    return {
      ...assign,
      submittedCount: subCount,
      totalCount: totalStudents,
    };
  });

  // Students with incomplete work
  const incompleteStudents = students
    .map((stud) => {
      const studSubs = submissions.filter((s) => s.nisn === stud.nisn);
      const missingCount = assignments.length - studSubs.length;
      return {
        student: stud,
        submittedCount: studSubs.length,
        totalTasks: assignments.length,
        missingCount,
      };
    })
    .filter((item) => item.missingCount > 0)
    .sort((a, b) => b.missingCount - a.missingCount)
    .slice(0, 10); // top 10

  res.json({
    summary: {
      totalMembers: totalStudents,
      submittedCount: actualSubmissions,
      notSubmittedCount: Math.max(0, totalPossibleSubmissions - actualSubmissions),
      progressPercentage,
    },
    assignments: assignmentStats,
    incompleteStudents,
  });
});

// TEACHER: Members Management (CRUD)
app.get("/api/teacher/students", (req, res) => {
  if (!getTeacherFromHeaders(req)) return res.status(403).json({ error: "Akses ditolak." });
  res.json(dbService.getStudents());
});

app.post("/api/teacher/students", (req, res) => {
  if (!getTeacherFromHeaders(req)) return res.status(403).json({ error: "Akses ditolak." });
  const { nisn, name, className, active } = req.body;

  if (!nisn || !name || !className) {
    return res.status(400).json({ error: "Semua data (NISN, Nama Lengkap, Kelas) wajib diisi." });
  }

  if (nisn.trim().length !== 10 || isNaN(Number(nisn))) {
    return res.status(400).json({ error: "NISN harus berupa 10 digit angka." });
  }

  if (dbService.getStudentByNisn(nisn.trim())) {
    return res.status(400).json({ error: "NISN tersebut sudah terdaftar di sistem." });
  }

  const newStudent = dbService.saveStudent({
    nisn: nisn.trim(),
    name: name.trim(),
    className: className.trim(),
    active: active !== undefined ? active : true,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json(newStudent);
});

app.put("/api/teacher/students/:nisn", (req, res) => {
  if (!getTeacherFromHeaders(req)) return res.status(403).json({ error: "Akses ditolak." });
  const { nisn } = req.params;
  const { name, className, active } = req.body;

  const existing = dbService.getStudentByNisn(nisn);
  if (!existing) {
    return res.status(404).json({ error: "Siswa tidak ditemukan." });
  }

  if (name !== undefined) existing.name = name.trim();
  if (className !== undefined) existing.className = className.trim();
  if (active !== undefined) existing.active = !!active;

  const updated = dbService.saveStudent(existing);
  res.json(updated);
});

app.delete("/api/teacher/students/:nisn", (req, res) => {
  if (!getTeacherFromHeaders(req)) return res.status(403).json({ error: "Akses ditolak." });
  const { nisn } = req.params;

  const success = dbService.deleteStudent(nisn);
  if (!success) {
    return res.status(404).json({ error: "Siswa tidak ditemukan." });
  }
  res.json({ message: "Siswa berhasil dihapus." });
});

// TEACHER: Periods Management (CRUD)
app.get("/api/teacher/periods", (req, res) => {
  if (!getTeacherFromHeaders(req)) return res.status(403).json({ error: "Akses ditolak." });
  res.json(dbService.getPeriods());
});

app.post("/api/teacher/periods", (req, res) => {
  if (!getTeacherFromHeaders(req)) return res.status(403).json({ error: "Akses ditolak." });
  const { id, name, month, year, status } = req.body;

  if (!id || !name || !month || !year) {
    return res.status(400).json({ error: "Semua data periode wajib diisi." });
  }

  // If status is active, archive other periods since only one should be active at a time
  if (status === "active") {
    dbService.getPeriods().forEach((p) => {
      if (p.id !== id) {
        p.status = "archived";
        dbService.savePeriod(p);
      }
    });
  }

  const newPeriod = dbService.savePeriod({
    id,
    name,
    month: Number(month),
    year: Number(year),
    status: status || "archived",
  });

  res.status(201).json(newPeriod);
});

app.put("/api/teacher/periods/:id", (req, res) => {
  if (!getTeacherFromHeaders(req)) return res.status(403).json({ error: "Akses ditolak." });
  const { id } = req.params;
  const { name, month, year, status } = req.body;

  const periods = dbService.getPeriods();
  const period = periods.find((p) => p.id === id);
  if (!period) {
    return res.status(404).json({ error: "Periode tidak ditemukan." });
  }

  if (name !== undefined) period.name = name;
  if (month !== undefined) period.month = Number(month);
  if (year !== undefined) period.year = Number(year);
  if (status !== undefined) {
    period.status = status;
    if (status === "active") {
      periods.forEach((p) => {
        if (p.id !== id) {
          p.status = "archived";
          dbService.savePeriod(p);
        }
      });
    }
  }

  dbService.savePeriod(period);
  res.json(period);
});

app.delete("/api/teacher/periods/:id", (req, res) => {
  if (!getTeacherFromHeaders(req)) return res.status(403).json({ error: "Akses ditolak." });
  const { id } = req.params;

  const success = dbService.deletePeriod(id);
  if (!success) {
    return res.status(404).json({ error: "Periode tidak ditemukan." });
  }
  res.json({ message: "Periode berhasil dihapus." });
});

// TEACHER: Assignments Management (CRUD)
app.get("/api/teacher/assignments", (req, res) => {
  if (!getTeacherFromHeaders(req)) return res.status(403).json({ error: "Akses ditolak." });
  res.json(dbService.getAssignments());
});

app.post("/api/teacher/assignments", (req, res) => {
  if (!getTeacherFromHeaders(req)) return res.status(403).json({ error: "Akses ditolak." });
  const { periodId, number, title, description, type, maxFiles, maxFileSizeMB, deadline, active } = req.body;

  if (!periodId || !number || !title || !description || !type || !maxFiles || !maxFileSizeMB || !deadline) {
    return res.status(400).json({ error: "Semua data tugas wajib diisi." });
  }

  // Max 4 assignments per period rule
  const existingCount = dbService.getAssignmentsByPeriod(periodId).length;
  if (existingCount >= 4) {
    return res.status(400).json({ error: "Batas maksimal 4 tugas per periode telah tercapai." });
  }

  const allowedFileTypesMap = {
    photo: ["image/jpeg", "image/png", "image/webp"],
    pdf: ["application/pdf"],
    mixed: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  };

  const newAssignment = dbService.saveAssignment({
    id: `task-${Date.now()}`,
    periodId,
    number: Number(number),
    title: title.trim(),
    description: description.trim(),
    type,
    allowedFileTypes: allowedFileTypesMap[type as keyof typeof allowedFileTypesMap] || [],
    maxFiles: Number(maxFiles),
    maxFileSizeMB: Number(maxFileSizeMB),
    deadline,
    active: active !== undefined ? active : true,
  });

  res.status(201).json(newAssignment);
});

app.put("/api/teacher/assignments/:id", (req, res) => {
  if (!getTeacherFromHeaders(req)) return res.status(403).json({ error: "Akses ditolak." });
  const { id } = req.params;
  const { title, description, type, maxFiles, maxFileSizeMB, deadline, active, number } = req.body;

  const assignments = dbService.getAssignments();
  const assignment = assignments.find((a) => a.id === id);
  if (!assignment) {
    return res.status(404).json({ error: "Tugas tidak ditemukan." });
  }

  if (title !== undefined) assignment.title = title.trim();
  if (description !== undefined) assignment.description = description.trim();
  if (number !== undefined) assignment.number = Number(number);
  if (type !== undefined) {
    assignment.type = type;
    const allowedFileTypesMap = {
      photo: ["image/jpeg", "image/png", "image/webp"],
      pdf: ["application/pdf"],
      mixed: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    };
    assignment.allowedFileTypes = allowedFileTypesMap[type as keyof typeof allowedFileTypesMap] || [];
  }
  if (maxFiles !== undefined) assignment.maxFiles = Number(maxFiles);
  if (maxFileSizeMB !== undefined) assignment.maxFileSizeMB = Number(maxFileSizeMB);
  if (deadline !== undefined) assignment.deadline = deadline;
  if (active !== undefined) assignment.active = !!active;

  dbService.saveAssignment(assignment);
  res.json(assignment);
});

app.delete("/api/teacher/assignments/:id", (req, res) => {
  if (!getTeacherFromHeaders(req)) return res.status(403).json({ error: "Akses ditolak." });
  const { id } = req.params;

  const success = dbService.deleteAssignment(id);
  if (!success) {
    return res.status(404).json({ error: "Tugas tidak ditemukan." });
  }
  res.json({ message: "Tugas berhasil dihapus." });
});

// TEACHER: Get All Submissions (With Search, Filter & Version list)
app.get("/api/teacher/submissions", (req, res) => {
  if (!getTeacherFromHeaders(req)) return res.status(403).json({ error: "Akses ditolak." });

  const { search, assignmentId, periodId } = req.query;
  let list = dbService.getSubmissions();

  if (periodId) {
    list = list.filter((s) => s.periodId === periodId);
  }
  if (assignmentId) {
    list = list.filter((s) => s.assignmentId === assignmentId);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.nisn.includes(q) ||
        s.className.toLowerCase().includes(q)
    );
  }

  // Sort descending by submission date
  list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  res.json(list);
});

// TEACHER: Retry Google Drive upload (real background task execution)
app.post("/api/teacher/submissions/:id/retry-drive", async (req, res) => {
  if (!getTeacherFromHeaders(req)) return res.status(403).json({ error: "Akses ditolak." });
  const { id } = req.params;

  const submission = dbService.getSubmission(id);
  if (!submission) {
    return res.status(404).json({ error: "Pengumpulan tugas tidak ditemukan." });
  }

  const config = dbService.getGoogleDriveConfig();
  if (!config || !config.refreshToken) {
    return res.status(400).json({ error: "Google Drive belum terhubung. Hubungkan terlebih dahulu di pengaturan." });
  }

  submission.status = "processing";
  dbService.saveSubmission(submission);

  try {
    await syncSubmissionToDrive(submission.id);
    const updated = dbService.getSubmission(id);
    if (updated?.status === "drive_sync_failed") {
      return res.status(500).json({ error: "Gagal menyinkronkan berkas ke Google Drive.", submission: updated });
    }
    res.json({ message: "Sinkronisasi Google Drive berhasil!", submission: updated });
  } catch (err) {
    console.error("Retry sync failed:", err);
    res.status(500).json({ error: "Gagal melakukan sinkronisasi: " + (err instanceof Error ? err.message : String(err)) });
  }
});

// TEACHER: Export CSV with Formula Injection Sanitization
app.get("/api/teacher/export-csv", (req, res) => {
  if (!getTeacherFromHeaders(req)) return res.status(403).json({ error: "Akses ditolak." });

  const { periodId } = req.query;
  if (!periodId) {
    return res.status(400).send("Parameter periodId wajib diisi.");
  }

  const period = dbService.getPeriods().find((p) => p.id === periodId);
  const students = dbService.getStudents().filter((s) => s.active);
  const assignments = dbService.getAssignmentsByPeriod(periodId as string);
  const submissions = dbService.getSubmissions().filter((s) => s.periodId === periodId);

  // Headers
  let csvContent = "\uFEFF"; // UTF-8 BOM to prevent excel character rendering bugs
  csvContent += "NISN,Nama Siswa,Kelas,Tugas,Status,Tanggal Pengumpulan,Versi,Berkas,Google Drive URL\n";

  // Construct tabular data safely
  students.forEach((stud) => {
    assignments.forEach((assign) => {
      const sub = submissions.find((s) => s.nisn === stud.nisn && s.assignmentId === assign.id);

      const cellNisn = sanitizeCSVCell(stud.nisn);
      const cellName = sanitizeCSVCell(stud.name);
      const cellClass = sanitizeCSVCell(stud.className);
      const cellTask = sanitizeCSVCell(assign.title);
      const cellStatus = sub ? "SUDAH DIKUMPULKAN" : "BELUM DIKUMPULKAN";
      const cellDate = sub ? new Date(sub.submittedAt).toLocaleString("id-ID") : "-";
      const cellVersion = sub ? `v${sub.version}` : "-";

      const fileNames = sub ? sub.files.map((f) => f.storedName).join(" | ") : "-";
      const cellFiles = sanitizeCSVCell(fileNames);

      const driveUrls = sub ? sub.files.map((f) => f.driveUrl || "-").join(" | ") : "-";
      const cellDrive = sanitizeCSVCell(driveUrls);

      csvContent += `"${cellNisn}","${cellName}","${cellClass}","${cellTask}","${cellStatus}","${cellDate}","${cellVersion}","${cellFiles}","${cellDrive}"\n`;
    });
  });

  const filename = `TugasHub_Laporan_${sanitizeForFilename(period ? period.name : String(periodId))}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(csvContent);
});

// ----------------------------------------------------
// VITE OR STATIC SERVING RUNNER
// ----------------------------------------------------

const isProduction = process.env.NODE_ENV === "production";
const isVercel = Boolean(process.env.VERCEL);

if (isProduction) {
  // Production serving compiled React static assets (mounted synchronously at module load time)
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));

  // Wildcard fallback for SPA (React Router), except for /api endpoints
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  // Only bind a local socket when not running inside Vercel serverless runtime.
  if (!isVercel) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Production server running on port ${PORT}`);
    });
  }
} else {
  // Development server with Vite running inside (asynchronously initialized)
  createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  })
    .then((vite) => {
      app.use(vite.middlewares);

      if (!isVercel) {
        app.listen(PORT, "0.0.0.0", () => {
          console.log(`Development server running on http://localhost:${PORT}`);
        });
      }
    })
    .catch((err) => {
      console.error("Failed to start Vite dev server:", err);
    });
}

export default app;
