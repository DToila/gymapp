"use client";

import { useState } from "react";
import Login from "@/components/Login";
import TeacherDashboard from "@/components/TeacherDashboard";
import StudentDashboard from "@/components/StudentDashboard";

type UserType = "teacher" | "student" | null;

interface CurrentUser {
  type: UserType;
  studentId?: string;
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<CurrentUser>({ type: null });

  const handleLoginSuccess = (userType: "teacher" | "student", studentId?: string) => {
    setCurrentUser({ type: userType, studentId });
  };

  const handleLogout = () => {
    setCurrentUser({ type: null });
  };

  if (currentUser.type === "teacher") {
    return <TeacherDashboard onLogout={handleLogout} />;
  }

  if (currentUser.type === "student" && currentUser.studentId) {
    return <StudentDashboard studentId={currentUser.studentId} onLogout={handleLogout} />;
  }

  return <Login onLoginSuccess={handleLoginSuccess} />;
}
