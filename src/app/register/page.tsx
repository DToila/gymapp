"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import GBLogo from "@/components/GBLogo";
import { supabase } from "../../../lib/supabase";
import { toLocalDateKey } from "@/components/leads/leadAutomation";

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

const inputClass =
  "w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-[#c81d25]";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500";

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
      const age = getAge(formData.dataNascimento);

      const payload: any = {
        name: formData.nome.trim(),
        contact_source: "Website",
        contact_date: toLocalDateKey(new Date()),
        email: formData.email.trim(),
        phone: formData.telemovel.trim() || null,
        class_type: isUnder18 ? "GBK" : "GB1",
        age: age ?? null,
        status: "Por contactar",
        enrolled: false,
        nif: formData.nif.trim() || null,
        sexo: formData.sexo,
        morada: formData.morada.trim() || null,
        codigo_postal: formData.codigoPostal.trim() || null,
        contacto_emergencia: formData.contactoEmergencia.trim() || null,
        como_soube: formData.comoSoube || null,
        nome_pai: isUnder18 ? formData.nomePai.trim() || null : null,
        nome_mae: isUnder18 ? formData.nomeMae.trim() || null : null,
        notes:
          formData.comoSoube === "Outro" && formData.comoSoubeOutro.trim()
            ? `Como soube (outro): ${formData.comoSoubeOutro.trim()}`
            : null,
      };

      const { error: insertError } = await supabase.from("leads").insert([payload]);

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

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#0b0b0b] lg:grid-cols-2">
      {/* ── Photo hero ── */}
      <div className="relative flex min-h-[260px] flex-col justify-between overflow-hidden p-8 sm:p-10 lg:min-h-screen lg:p-14">
        <Image
          src="/Gracie%20Barra.jpg"
          alt="Gracie Barra"
          fill
          priority
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, rgba(200,29,37,0.12) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.92) 100%)' }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <GBLogo size={44} />
          <div>
            <p className="text-sm font-bold tracking-[0.2em] text-white">GRACIE BARRA</p>
            <p className="text-xs tracking-[0.18em] text-white/45">CARNAXIDE &amp; QUEIJAS</p>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-black leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            JIU JITSU
            <br />
            <span className="text-[#c81d25]">PARA</span>
            <br />
            TODOS.
          </h1>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex flex-col p-6 sm:p-10 lg:p-14">
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="mb-6 self-start text-sm font-medium text-[#c81d25] transition hover:text-[#ef3a43]"
        >
          ← Voltar
        </button>

        <div className="mb-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">Aluno Novo</p>
          <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">Nova Inscrição</h2>
        </div>

        {successMessage ? (
          <div className="mb-4 rounded-xl border border-[#1f4d33] bg-[#112117] px-4 py-3 text-sm text-green-300">
            {successMessage}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-[#5b1f24] bg-[#2a1214] px-4 py-3 text-sm text-rose-300">{error}</div>
        ) : null}

        <form onSubmit={handleSubmit} className="grid max-w-xl gap-4">
          <div>
            <label className={labelClass}>Nome</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleFieldChange("nome", e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Data de Nascimento</label>
              <input
                type="date"
                value={formData.dataNascimento}
                onChange={(e) => handleFieldChange("dataNascimento", e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>NIF</label>
              <input
                type="text"
                value={formData.nif}
                onChange={(e) => handleFieldChange("nif", e.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Sexo</label>
            <div className="flex items-center gap-5 text-sm text-zinc-200">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="sexo"
                  value="M"
                  checked={formData.sexo === "M"}
                  onChange={(e) => handleFieldChange("sexo", e.target.value as "M" | "F")}
                  className="accent-[#c81d25]"
                />
                M
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="sexo"
                  value="F"
                  checked={formData.sexo === "F"}
                  onChange={(e) => handleFieldChange("sexo", e.target.value as "M" | "F")}
                  className="accent-[#c81d25]"
                />
                F
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Telemóvel</label>
              <input
                type="text"
                value={formData.telemovel}
                onChange={(e) => handleFieldChange("telemovel", e.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Morada</label>
              <input
                type="text"
                value={formData.morada}
                onChange={(e) => handleFieldChange("morada", e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Código Postal</label>
              <input
                type="text"
                value={formData.codigoPostal}
                onChange={(e) => handleFieldChange("codigoPostal", e.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Contacto de Emergência</label>
            <input
              type="text"
              value={formData.contactoEmergencia}
              onChange={(e) => handleFieldChange("contactoEmergencia", e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Como soubeste da GBCQ</label>
            <select
              value={formData.comoSoube}
              onChange={(e) => handleFieldChange("comoSoube", e.target.value as HeardFromOption)}
              className={inputClass}
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

          {formData.comoSoube === "Outro" ? (
            <div>
              <label className={labelClass}>Outro (opcional)</label>
              <input
                type="text"
                value={formData.comoSoubeOutro}
                onChange={(e) => handleFieldChange("comoSoubeOutro", e.target.value)}
                className={inputClass}
              />
            </div>
          ) : null}

          {isUnder18 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Nome do Pai</label>
                <input
                  type="text"
                  value={formData.nomePai}
                  onChange={(e) => handleFieldChange("nomePai", e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Nome da Mãe</label>
                <input
                  type="text"
                  value={formData.nomeMae}
                  onChange={(e) => handleFieldChange("nomeMae", e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-xl bg-[#c81d25] px-4 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#a8141c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "A Enviar..." : "Enviar Pedido"}
          </button>
        </form>
      </div>
    </div>
  );
}
