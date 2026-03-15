"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getMemberByEmail } from "../../lib/database";
import GBLogo from "@/components/GBLogo";

type UserType = "teacher" | "student" | null;

interface LoginProps {
  onLoginSuccess?: (userType: "teacher" | "student", studentId?: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const router = useRouter();
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
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        minHeight: '100vh',
        background: 'var(--bg)'
      }}>
        {/* LEFT COLUMN */}
        <div style={{
          backgroundImage: 'url(/jiu-jitsu-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 56px'
        }}>
          {/* Overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(160deg, rgba(204,0,0,0.1), rgba(0,0,0,0.95))'
          }} />

          {/* Top: GBLogo + Branding */}
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ marginBottom: '16px' }}>
              <GBLogo size={54} />
            </div>
            <div style={{ 
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              fontWeight: 'bold',
              color: 'white',
              letterSpacing: '4px',
              marginBottom: '8px'
            }}>
              GRACIE BARRA
            </div>
            <div style={{
              fontSize: '11px',
              letterSpacing: '3px',
              color: 'rgba(255, 255, 255, 0.35)'
            }}>
              CARNAXIDE & QUEIJAS
            </div>
          </div>

          {/* Bottom: Big Tagline */}
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '76px',
              fontWeight: 900,
              lineHeight: 1.1,
              color: 'white',
              letterSpacing: '-2px',
              marginBottom: '24px'
            }}>
              JIU JITSU<br />
              <span style={{ color: '#CC0000' }}>PARA</span><br />
              TODOS.
            </div>
            <div style={{
              fontSize: '11px',
              letterSpacing: '4px',
              color: 'rgba(255, 255, 255, 0.3)'
            }}>
              ARTES MARCIAIS · CARNAXIDE · EST. 2010
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{
          background: 'var(--bg)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 56px'
        }}>
          {/* Header */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{ marginBottom: '16px' }}>
              <GBLogo size={46} />
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '4px',
              color: 'var(--text)',
              marginBottom: '4px'
            }}>
              GRACIE BARRA / CARNAXIDE & QUEIJAS
            </div>
            <div style={{
              fontSize: '10px',
              color: 'var(--text-dim)',
              letterSpacing: '2px'
            }}>
              GYMAPP · SISTEMA DE GESTÃO
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '44px',
              fontWeight: 900,
              letterSpacing: '4px',
              color: 'var(--text)',
              marginBottom: '8px'
            }}>
              ACESSO
            </div>
            <div style={{
              fontSize: '13px',
              color: 'var(--text-muted)'
            }}>
              Seleciona o teu tipo de conta para continuar
            </div>
          </div>

          {/* Role Selector */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxWidth: '420px'
          }}>
            <button
              onClick={() => handleSelectUserType("teacher")}
              style={{
                width: '100%',
                padding: '22px 24px',
                background: 'white',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-display)',
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '4px',
                color: '#0a0a0a',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#CC0000';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#0a0a0a';
              }}
            >
              Professor
            </button>
            <button
              onClick={() => handleSelectUserType("student")}
              style={{
                width: '100%',
                padding: '22px 24px',
                background: 'white',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-display)',
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '4px',
                color: '#0a0a0a',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#CC0000';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#0a0a0a';
              }}
            >
              Aluno
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '1fr 1fr', 
      minHeight: '100vh',
      background: 'var(--bg)'
    }}>
      {/* LEFT COLUMN */}
      <div style={{
        backgroundImage: 'url(/jiu-jitsu-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 56px'
      }}>
        {/* Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(160deg, rgba(204,0,0,0.1), rgba(0,0,0,0.95))'
        }} />

        {/* Top: GBLogo + Branding */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ marginBottom: '16px' }}>
            <GBLogo size={54} />
          </div>
          <div style={{ 
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            fontWeight: 'bold',
            color: 'white',
            letterSpacing: '4px',
            marginBottom: '8px'
          }}>
            GRACIE BARRA
          </div>
          <div style={{
            fontSize: '11px',
            letterSpacing: '3px',
            color: 'rgba(255, 255, 255, 0.35)'
          }}>
            CARNAXIDE & QUEIJAS
          </div>
        </div>

        {/* Bottom: Big Tagline */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '76px',
            fontWeight: 900,
            lineHeight: 1.1,
            color: 'white',
            letterSpacing: '-2px',
            marginBottom: '24px'
          }}>
            JIU JITSU<br />
            <span style={{ color: '#CC0000' }}>PARA</span><br />
            TODOS.
          </div>
          <div style={{
            fontSize: '11px',
            letterSpacing: '4px',
            color: 'rgba(255, 255, 255, 0.3)'
          }}>
            ARTES MARCIAIS · CARNAXIDE · EST. 2010
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div style={{
        background: 'var(--bg)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '64px 56px',
        overflowY: 'auto'
      }}>
        {/* Back Button */}
        <button
          onClick={handleBackClick}
          style={{
            alignSelf: 'flex-start',
            background: 'none',
            border: 'none',
            color: '#CC0000',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '32px',
            transition: 'color 0.3s',
            fontFamily: 'var(--font-body)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#990000'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#CC0000'}
        >
          ← VOLTAR
        </button>

        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ marginBottom: '16px' }}>
            <GBLogo size={46} />
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '15px',
            fontWeight: 800,
            letterSpacing: '4px',
            color: 'var(--text)',
            marginBottom: '4px'
          }}>
            GRACIE BARRA / CARNAXIDE & QUEIJAS
          </div>
          <div style={{
            fontSize: '10px',
            color: 'var(--text-dim)',
            letterSpacing: '2px'
          }}>
            GYMAPP · SISTEMA DE GESTÃO
          </div>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '44px',
            fontWeight: 900,
            letterSpacing: '4px',
            color: 'var(--text)',
            marginBottom: '8px'
          }}>
            ACESSO
          </div>
          <div style={{
            fontSize: '13px',
            color: 'var(--text-muted)'
          }}>
            {userType === "teacher" ? "Introduz as tuas credenciais de professor" : "Introduz o teu email de aluno"}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Error Message */}
          {error && (
            <div style={{
              padding: '14px 16px',
              background: 'rgba(204, 0, 0, 0.1)',
              border: '1px solid rgba(204, 0, 0, 0.3)',
              color: '#FF6666',
              fontSize: '13px',
              marginBottom: '24px',
              fontFamily: 'var(--font-body)'
            }}>
              {error}
            </div>
          )}

          {/* Email Input */}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={userType === "teacher" ? "professor@gymapp.com" : "aluno@gymapp.com"}
            required
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '15px',
              marginBottom: '0',
              fontFamily: 'var(--font-body)',
              transition: 'border-color 0.3s'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#CC0000'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          />

          <button
            type="button"
            onClick={() => router.push('/register')}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: '11px',
              color: '#555',
              textAlign: 'center',
              marginTop: '12px',
              marginBottom: '16px',
              letterSpacing: '1px',
              fontFamily: 'var(--font-body)',
              textDecoration: 'none',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#777';
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#555';
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            Não tem conta? Criar conta
          </button>

          {/* Password Input - Only for Teacher */}
          {userType === "teacher" && (
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Introduz a tua password"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: '15px',
                  fontFamily: 'var(--font-body)',
                  transition: 'border-color 0.3s',
                  paddingRight: '40px'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#CC0000'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-dim)',
                  fontSize: '16px'
                }}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '16px',
              background: isLoading ? '#888888' : '#CC0000',
              color: 'white',
              fontFamily: 'var(--font-display)',
              fontSize: '15px',
              fontWeight: 900,
              letterSpacing: '5px',
              textTransform: 'uppercase',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              border: 'none',
              marginTop: '24px'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.background = '#990000';
            }}
            onMouseLeave={(e) => {
              if (!isLoading) e.currentTarget.style.background = '#CC0000';
            }}
          >
            {isLoading ? "A Entrar..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
