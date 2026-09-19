import React, { useState, useEffect } from "react";
import StudentVerify from "./pages/student/StudentVerify";
import StudentTasks from "./pages/student/StudentTasks";
import TaskDetail from "./pages/student/TaskDetail";
import TeacherLogin from "./pages/teacher/TeacherLogin";
import Dashboard from "./pages/teacher/Dashboard";
import Members from "./pages/teacher/Members";
import Periods from "./pages/teacher/Periods";
import Assignments from "./pages/teacher/Assignments";
import { LayoutDashboard, Users, Calendar, BookOpen, LogOut, ShieldAlert, Laptop, Feather } from "lucide-react";
import { motion } from "motion/react";

export default function App() {
  // Routing states
  const [path, setPath] = useState(window.location.pathname);

  // Authentication states
  const [student, setStudent] = useState<any>(null);
  const [studentToken, setStudentToken] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<any>(null);
  const [teacherToken, setTeacherToken] = useState<string | null>(null);

  // Selected student task
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Selected teacher tab
  const [activeTeacherTab, setActiveTeacherTab] = useState("dashboard");

  // Load saved sessions from localStorage on startup
  useEffect(() => {
    const storedStudent = localStorage.getItem("student");
    const storedStudentToken = localStorage.getItem("student_token");
    const storedTeacher = localStorage.getItem("teacher");
    const storedTeacherToken = localStorage.getItem("teacher_token");

    if (storedStudent && storedStudentToken) {
      setStudent(JSON.parse(storedStudent));
      setStudentToken(storedStudentToken);
    }
    if (storedTeacher && storedTeacherToken) {
      setTeacher(JSON.parse(storedTeacher));
      setTeacherToken(storedTeacherToken);
    }

    // Sync state if browser URL updates or on popstate
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  // Helper: Route navigator
  const navigate = (newPath: string) => {
    window.history.pushState({}, "", newPath);
    setPath(newPath);
  };

  // Student auth handlers
  const handleStudentVerifySuccess = (verifiedStudent: any, token: string) => {
    setStudent(verifiedStudent);
    setStudentToken(token);
    localStorage.setItem("student", JSON.stringify(verifiedStudent));
    localStorage.setItem("student_token", token);
    navigate("/student/tasks");
  };

  const handleStudentLogout = () => {
    setStudent(null);
    setStudentToken(null);
    setSelectedTaskId(null);
    localStorage.removeItem("student");
    localStorage.removeItem("student_token");
    navigate("/");
  };

  // Teacher auth handlers
  const handleTeacherLoginSuccess = (token: string, verifiedTeacher: any) => {
    setTeacher(verifiedTeacher);
    setTeacherToken(token);
    localStorage.setItem("teacher", JSON.stringify(verifiedTeacher));
    localStorage.setItem("teacher_token", token);
    navigate("/teacher/dashboard");
  };

  const handleTeacherLogout = () => {
    setTeacher(null);
    setTeacherToken(null);
    localStorage.removeItem("teacher");
    localStorage.removeItem("teacher_token");
    navigate("/");
  };

  // ----------------------------------------------------
  // ROUTING RENDERER LOGIC
  // ----------------------------------------------------

  const isTeacherRoute = path.startsWith("/teacher");

  if (isTeacherRoute) {
    // 1. TEACHER LAND
    if (!teacher) {
      return (
        <TeacherLogin
          onLoginSuccess={handleTeacherLoginSuccess}
          onBackToStudent={() => navigate("/")}
        />
      );
    }

    // Render Teacher Dashboard shell
    return (
      <div className="min-h-screen bg-[#F2F2F2] text-[#111111] flex flex-col md:flex-row antialiased font-sans relative">
        {/* SIDE NAV FOR TEACHER */}
        <aside className="w-full md:w-64 bg-[#FFFFFF] border-b-3 md:border-b-0 md:border-r-3 border-[#111111] flex flex-col justify-between md:sticky md:top-0 md:h-screen shrink-0 z-40">
          <div>
            {/* BRANDING */}
            <div className="p-6 border-b-3 border-[#111111] flex flex-col bg-[#FFD21F]">
              <span className="font-sans font-black text-sm tracking-tight text-[#111111] uppercase block">
                SMAN 90 JAKARTA
              </span>
              <span className="text-[10px] font-bold text-[#111111] tracking-wider uppercase mt-1 block font-mono">
                Dewan Redaksi
              </span>
            </div>

            {/* TAB LINKS */}
            <nav className="p-4 space-y-3">
              <button
                onClick={() => setActiveTeacherTab("dashboard")}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border-3 transition-all cursor-pointer font-bold text-xs uppercase tracking-wider ${
                  activeTeacherTab === "dashboard"
                    ? "bg-[#18A558] text-[#FFFFFF] border-[#111111] shadow-[3px_3px_0px_#111111]"
                    : "bg-[#FFFFFF] text-[#111111] border-[#111111] shadow-[2px_2px_0px_rgba(0,0,0,0.15)] hover:bg-[#F2F2F2]"
                }`}
              >
                <LayoutDashboard className="h-4 w-4 text-inherit" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTeacherTab("members")}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border-3 transition-all cursor-pointer font-bold text-xs uppercase tracking-wider ${
                  activeTeacherTab === "members"
                    ? "bg-[#18A558] text-[#FFFFFF] border-[#111111] shadow-[3px_3px_0px_#111111]"
                    : "bg-[#FFFFFF] text-[#111111] border-[#111111] shadow-[2px_2px_0px_rgba(0,0,0,0.15)] hover:bg-[#F2F2F2]"
                }`}
              >
                <Users className="h-4 w-4 text-inherit" />
                Siswa Anggota
              </button>
              <button
                onClick={() => setActiveTeacherTab("periods")}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border-3 transition-all cursor-pointer font-bold text-xs uppercase tracking-wider ${
                  activeTeacherTab === "periods"
                    ? "bg-[#18A558] text-[#FFFFFF] border-[#111111] shadow-[3px_3px_0px_#111111]"
                    : "bg-[#FFFFFF] text-[#111111] border-[#111111] shadow-[2px_2px_0px_rgba(0,0,0,0.15)] hover:bg-[#F2F2F2]"
                }`}
              >
                <Calendar className="h-4 w-4 text-inherit" />
                Periode Tugas
              </button>
              <button
                onClick={() => setActiveTeacherTab("assignments")}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border-3 transition-all cursor-pointer font-bold text-xs uppercase tracking-wider ${
                  activeTeacherTab === "assignments"
                    ? "bg-[#18A558] text-[#FFFFFF] border-[#111111] shadow-[3px_3px_0px_#111111]"
                    : "bg-[#FFFFFF] text-[#111111] border-[#111111] shadow-[2px_2px_0px_rgba(0,0,0,0.15)] hover:bg-[#F2F2F2]"
                }`}
              >
                <BookOpen className="h-4 w-4 text-inherit" />
                Kelola Tugas
              </button>
            </nav>
          </div>

          {/* ASIDE FOOTER */}
          <div className="p-4 border-t-3 border-[#111111] space-y-3 bg-[#FAFAFA]">
            <div className="px-3 py-2 bg-[#FFFFFF] border-2 border-[#111111] flex items-center gap-2 text-[10px] font-bold font-mono text-[#111111] uppercase tracking-wider">
              <Laptop className="h-4 w-4 text-[#18A558]" />
              <span>Sesi Pengawas Aktif</span>
            </div>
            <button
              onClick={handleTeacherLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FFFFFF] hover:bg-[#111111] hover:text-[#FFFFFF] text-[#111111] border-3 border-[#111111] shadow-[3px_3px_0px_#111111] hover:shadow-[1px_1px_0px_#111111] transition-all font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              <LogOut className="h-4 w-4 text-inherit" />
              Keluar Sesi
            </button>
          </div>
        </aside>

        {/* MAIN PANEL CONTENT */}
        <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full overflow-x-hidden relative">
          <motion.div
            key={activeTeacherTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            {activeTeacherTab === "dashboard" && (
              <Dashboard token={teacherToken!} onNavigate={setActiveTeacherTab} currentTab={activeTeacherTab} />
            )}
            {activeTeacherTab === "members" && <Members token={teacherToken!} />}
            {activeTeacherTab === "periods" && <Periods token={teacherToken!} />}
            {activeTeacherTab === "assignments" && <Assignments token={teacherToken!} />}
          </motion.div>
        </main>
      </div>
    );
  }

  // 2. STUDENT LAND
  if (!student) {
    return (
      <div className="relative min-h-screen bg-[#F2F2F2]">
        <StudentVerify 
          onVerifySuccess={handleStudentVerifySuccess} 
          onAdminTrigger={() => navigate("/teacher/login")}
        />
      </div>
    );
  }

  // If student is logged in, show assignment list or submission screen
  if (selectedTaskId) {
    return (
      <TaskDetail
        taskId={selectedTaskId}
        token={studentToken!}
        onBack={() => setSelectedTaskId(null)}
      />
    );
  }

  return (
    <StudentTasks
      student={student}
      token={studentToken!}
      onLogout={handleStudentLogout}
      onSelectTask={(id) => setSelectedTaskId(id)}
    />
  );
}
