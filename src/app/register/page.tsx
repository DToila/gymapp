"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GBLogo from "@/components/GBLogo";
import { supabase } from "../../../lib/supabase";

type HeardFromOption =
  | ""
  | "Website"
  | "Social Media"
  | "Outras academias GB"
  | "Alunos GBCQ"
  | "Visibilidade Rua"
  | "Flyer"
  | "Outro";

interface RegisterFormData {
  nome: string;
  dataNascimento: string;
  nif: string;
  sexo: "M" | "F";
  email: string;
  telemovel: string;
  morada: string;
  codigoPostal: string;
  contactoEmergencia: string;
  comoSoube: HeardFromOption;
  comoSoubeOutro: string;
  nomePai: string;
  nomeMae: string;
}

const initialForm: RegisterFormData = {
  nome: "",
  dataNascimento: "",
  nif: "",
  sexo: "M",
  email: "",
  telemovel: "",
  morada: "",
  codigoPostal: "",
  contactoEmergencia: "",
  comoSoube: "",
  comoSoubeOutro: "",
  nomePai: "",
  nomeMae: "",
};

const getAge = (dateOfBirth: string): number | null => {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
};

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isUnder18 = useMemo(() => {
    const age = getAge(formData.dataNascimento);
    return age !== null && age < 18;
  }, [formData.dataNascimento]);

  const handleFieldChange = <K extends keyof RegisterFormData>(field: K, value: RegisterFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const registrationNotes = [
        `Sexo: ${formData.sexo}`,
        `Morada: ${formData.morada.trim() || '-'}`,
        `Código Postal: ${formData.codigoPostal.trim() || '-'}`,
        `Contacto de Emergência: ${formData.contactoEmergencia.trim() || '-'}`,
        `Como soube da GBCQ: ${formData.comoSoube || '-'}`,
        formData.comoSoube === "Outro" ? `Como soube (outro): ${formData.comoSoubeOutro.trim() || '-'}` : null,
        isUnder18 ? `Nome do Pai: ${formData.nomePai.trim() || '-'}` : null,
        isUnder18 ? `Nome da Mãe: ${formData.nomeMae.trim() || '-'}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const payload: any = {
        name: formData.nome.trim(),
        date_of_birth: formData.dataNascimento || null,
        nif: formData.nif.trim() || null,
        email: formData.email.trim(),
        phone: formData.telemovel.trim() || null,
        status: "pendente",
        belt_level: "White Cinto",
        family_discount: false,
        fee: 0,
        payment_type: "Dinheiro",
        ref: registrationNotes || null,
      };

      const { error: insertError } = await supabase.from("members").insert([payload]);

      if (insertError) {
        throw insertError;
      }

      setSuccessMessage("Pedido enviado! Entraremos em contacto em breve.");
      setFormData(initialForm);
    } catch (submissionError: any) {
      console.error("Registration error:", submissionError);
      setError(submissionError?.message || "Não foi possível enviar o pedido. Tenta novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const commonInputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    background: "#111111",
    border: "1px solid #2a2a2a",
    color: "#f0f0f0",
    fontSize: "13px",
    fontFamily: '"Barlow", sans-serif',
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    color: "#888888",
    marginBottom: "6px",
    letterSpacing: "1px",
    textTransform: "uppercase",
    fontWeight: 600,
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        minHeight: "100vh",
        background: "#0a0a0a",
      }}
    >
      <div
        style={{
          backgroundImage: "url(/jiu-jitsu-bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 56px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(160deg, rgba(204,0,0,0.1), rgba(0,0,0,0.95))",
          }}
        />

        <div style={{ position: "relative", zIndex: 10 }}>
          <div style={{ marginBottom: "16px" }}>
            <GBLogo size={54} />
          </div>
          <div
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: "14px",
              fontWeight: 700,
              color: "white",
              letterSpacing: "4px",
              marginBottom: "8px",
            }}
          >
            GRACIE BARRA
          </div>
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "3px",
              color: "rgba(255, 255, 255, 0.35)",
            }}
          >
            CARNAXIDE E QUEIJAS
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 10 }}>
          <div
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: "76px",
              fontWeight: 900,
              lineHeight: 1.1,
              color: "white",
              letterSpacing: "-2px",
              marginBottom: "24px",
            }}
          >
            JIU JITSU
            <br />
            <span style={{ color: "#CC0000" }}>PARA</span>
            <br />
            TODOS.
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#0a0a0a",
          borderLeft: "1px solid #2a2a2a",
          display: "flex",
          flexDirection: "column",
          padding: "64px 56px",
          overflowY: "auto",
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{
            alignSelf: "flex-start",
            background: "none",
            border: "none",
            color: "#CC0000",
            fontSize: "14px",
            cursor: "pointer",
            marginBottom: "24px",
            fontFamily: '"Barlow", sans-serif',
            padding: 0,
          }}
        >
          ← Voltar
        </button>

        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: "42px",
              fontWeight: 900,
              letterSpacing: "4px",
              color: "#f0f0f0",
              margin: 0,
            }}
          >
            NOVA INSCRIÇÃO
          </h1>
        </div>

        {successMessage && (
          <div
            style={{
              padding: "12px 14px",
              background: "rgba(204,0,0,0.1)",
              border: "1px solid rgba(204,0,0,0.4)",
              color: "#f0f0f0",
              marginBottom: "16px",
              fontSize: "13px",
            }}
          >
            {successMessage}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "12px 14px",
              background: "rgba(255,0,0,0.1)",
              border: "1px solid rgba(255,0,0,0.35)",
              color: "#ff8a8a",
              marginBottom: "16px",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Nome</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleFieldChange("nome", e.target.value)}
              required
              style={commonInputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Data de Nascimento</label>
            <input
              type="date"
              value={formData.dataNascimento}
              onChange={(e) => handleFieldChange("dataNascimento", e.target.value)}
              required
              style={commonInputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>NIF</label>
            <input
              type="text"
              value={formData.nif}
              onChange={(e) => handleFieldChange("nif", e.target.value)}
              required
              style={commonInputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Sexo</label>
            <div style={{ display: "flex", gap: "18px", alignItems: "center", color: "#f0f0f0", fontSize: "13px" }}>
              <label style={{ display: "flex", gap: "6px", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="sexo"
                  value="M"
                  checked={formData.sexo === "M"}
                  onChange={(e) => handleFieldChange("sexo", e.target.value as "M" | "F")}
                  style={{ accentColor: "#CC0000" }}
                />
                M
              </label>
              <label style={{ display: "flex", gap: "6px", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="sexo"
                  value="F"
                  checked={formData.sexo === "F"}
                  onChange={(e) => handleFieldChange("sexo", e.target.value as "M" | "F")}
                  style={{ accentColor: "#CC0000" }}
                />
                F
              </label>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              required
              style={commonInputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Telemóvel</label>
            <input
              type="text"
              value={formData.telemovel}
              onChange={(e) => handleFieldChange("telemovel", e.target.value)}
              required
              style={commonInputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Morada</label>
            <input
              type="text"
              value={formData.morada}
              onChange={(e) => handleFieldChange("morada", e.target.value)}
              required
              style={commonInputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Código Postal</label>
            <input
              type="text"
              value={formData.codigoPostal}
              onChange={(e) => handleFieldChange("codigoPostal", e.target.value)}
              required
              style={commonInputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Contacto de Emergência</label>
            <input
              type="text"
              value={formData.contactoEmergencia}
              onChange={(e) => handleFieldChange("contactoEmergencia", e.target.value)}
              required
              style={commonInputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Como soubeste da GBCQ</label>
            <select
              value={formData.comoSoube}
              onChange={(e) => handleFieldChange("comoSoube", e.target.value as HeardFromOption)}
              style={commonInputStyle}
            >
              <option value="">Selecionar (opcional)</option>
              <option value="Website">Website</option>
              <option value="Social Media">Social Media</option>
              <option value="Outras academias GB">Outras academias GB</option>
              <option value="Alunos GBCQ">Alunos GBCQ</option>
              <option value="Visibilidade Rua">Visibilidade Rua</option>
              <option value="Flyer">Flyer</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          {formData.comoSoube === "Outro" && (
            <div>
              <label style={labelStyle}>Outro (opcional)</label>
              <input
                type="text"
                value={formData.comoSoubeOutro}
                onChange={(e) => handleFieldChange("comoSoubeOutro", e.target.value)}
                style={commonInputStyle}
              />
            </div>
          )}

          {isUnder18 && (
            <>
              <div>
                <label style={labelStyle}>Nome do Pai</label>
                <input
                  type="text"
                  value={formData.nomePai}
                  onChange={(e) => handleFieldChange("nomePai", e.target.value)}
                  required
                  style={commonInputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Nome da Mãe</label>
                <input
                  type="text"
                  value={formData.nomeMae}
                  onChange={(e) => handleFieldChange("nomeMae", e.target.value)}
                  required
                  style={commonInputStyle}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "14px 16px",
              background: isSubmitting ? "#6a6a6a" : "#CC0000",
              color: "white",
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: "16px",
              fontWeight: 800,
              letterSpacing: "4px",
              textTransform: "uppercase",
              border: "1px solid #CC0000",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              marginTop: "8px",
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.background = "#990000";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.background = "#CC0000";
              }
            }}
          >
            {isSubmitting ? "A ENVIAR..." : "ENVIAR PEDIDO"}
          </button>
        </form>
      </div>
    </div>
  );
}
