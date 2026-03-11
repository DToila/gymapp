"use client";

import { useState } from "react";
import { getMemberByEmail } from "../../lib/database";

type UserType = "teacher" | "student" | null;

interface LoginProps {
  onLoginSuccess?: (userType: "teacher" | "student", studentId?: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [userType, setUserType] = useState<UserType>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSelectUserType = (type: "teacher" | "student") => {
    setUserType(type);
  };

  const handleBackClick = () => {
    setUserType(null);
    setEmail("");
    setPassword("");
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (userType === "student") {
        // For student login, find member by email
        const student = await getMemberByEmail(email);
        if (!student) {
          setError("Student profile not found. Please check your email.");
          setIsLoading(false);
          return;
        }
        if (onLoginSuccess) {
          onLoginSuccess("student", student.id);
        }
      } else {
        // Teacher login (keep existing behavior)
        setTimeout(() => {
          if (userType && onLoginSuccess) {
            onLoginSuccess(userType);
          }
        }, 500);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (userType === null) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left Side - Branding */}
            <div className="hidden md:flex flex-col justify-center items-start space-y-8">
              <div>
                <h1 className="text-5xl font-bold text-white mb-2">
                  GymApp
                </h1>
                <p className="text-xl text-dark-300">
                  Professional Membership Management System
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">
                      Easy Management
                    </h3>
                    <p className="text-dark-400">
                      Manage gym memberships with ease and efficiency
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">
                      Dual Access
                    </h3>
                    <p className="text-dark-400">
                      Separate portals for teachers and students
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">
                      Secure & Reliable
                    </h3>
                    <p className="text-dark-400">
                      Enterprise-grade security for your data
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Login Options */}
            <div className="flex flex-col space-y-4">
              <div className="text-center md:text-left mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Welcome
                </h2>
                <p className="text-dark-300">
                  Choose your role to get started
                </p>
              </div>

              {/* Teacher Card */}
              <button
                onClick={() => handleSelectUserType("teacher")}
                className="group relative overflow-hidden rounded-2xl border border-dark-700 bg-dark-800 hover:bg-dark-700 p-8 transition-all duration-300 hover:border-primary-600"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl">👨‍🏫</span>
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-white">
                      Login as Teacher
                    </h3>
                    <p className="text-dark-400">
                      Manage classes and member access
                    </p>
                  </div>
                </div>
              </button>

              {/* Student Card */}
              <button
                onClick={() => handleSelectUserType("student")}
                className="group relative overflow-hidden rounded-2xl border border-dark-700 bg-dark-800 hover:bg-dark-700 p-8 transition-all duration-300 hover:border-primary-600"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-white">
                      Login as Student
                    </h3>
                    <p className="text-dark-400">
                      View your membership details
                    </p>
                  </div>
                </div>
              </button>

              <div className="pt-4 text-center text-sm text-dark-400">
                <p>Need help? Contact support@gymapp.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={handleBackClick}
            className="inline-flex items-center space-x-2 text-primary-500 hover:text-primary-400 transition-colors mb-6"
          >
            <span className="text-xl">←</span>
            <span>Back</span>
          </button>

          <h1 className="text-3xl font-bold text-white mb-2">
            {userType === "teacher" ? "Teacher Login" : "Student Login"}
          </h1>
          <p className="text-dark-300">
            Enter your credentials to access your account
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-lg bg-red-600/20 border border-red-600/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-dark-200 mb-2"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 rounded-lg border border-dark-600 bg-dark-800 text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
            />
          </div>

          {/* Password Input - Only for Teacher */}
          {userType === "teacher" && (
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-dark-200 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-dark-600 bg-dark-800 text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
          )}

          {/* Remember Me & Forgot Password - Only for Teacher */}
          {userType === "teacher" && (
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-0"
                />
                <span className="text-sm text-dark-300">Remember me</span>
              </label>
              <a
                href="#"
                className="text-sm text-primary-500 hover:text-primary-400 transition-colors"
              >
                Forgot password?
              </a>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 mt-6"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>



        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-dark-700 text-center text-sm text-dark-400 space-y-2">
          <p>GymApp © 2024 All rights reserved</p>
          <div className="flex justify-center space-x-4">
            <a href="#" className="hover:text-primary-500 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary-500 transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
