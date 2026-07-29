"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import GBLogo from "@/components/GBLogo";

type HeardFromOption =
  | ""
  | "Website"
  | "Social Media"
  | "Outras academias GB"
  | "Alunos GBCQ"
  | "Visibilidade Rua"
  | "Flyer"
  | "Outro";

interface CompleteFormData {
  nif: string;
  sexo: "M" | "F";
  morada: string;
  codigoPostal: string;
  contactoEmergencia: string;
  comoSoube: HeardFromOption;
  nomePai: string;
  nomeMae: string;
}

const initialForm: CompleteFormData = {
  nif: "",
  sexo: "M",
  morada: "",
  codigoPostal: "",
  contactoEmergencia: "",
  comoSoube: "",
  nomePai: "",
  nomeMae: "",
};

const inputClass =
  "w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-[#c81d25]";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500";

type FoundLead = { id: string; name: string; age: number | null };

export default function CompleteRegistrationPage() {
  const router = useRouter();
  const [step, setStep] = useState<"lookup" | "form" | "done">("lookup");

  const [contact, setContact] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lead, setLead] = useState<FoundLead | null>(null);

  const [formData, setFormData] = useState<CompleteFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleFieldChange = <K extends keyof CompleteFormData>(field: K, value: CompleteFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLookup = async (event: FormEvent) => {
    event.preventDefault();
    setLookupError("");
    setIsLookingUp(true);

    try {
      const response = await fetch(`/api/public/find-lead?contact=${encodeURIComponent(contact.trim())}`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível procurar o registo.");
      }

      if (!data.found) {
        setLookupError("Não encontrámos nenhum registo com esse telefone ou email. Verifica se escreveste certo, ou fala com a receção.");
        return;
      }

      setLead(data.lead);
      setStep("form");
    } catch (err: any) {
      setLookupError(err?.message || "Não foi possível procurar o registo.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!lead) return;
    setError("");
    setIsSubmitting(true);

    try {
      const payload = {
        leadId: lead.id,
        nif: formData.nif.trim() || null,
        sexo: formData.sexo,
        morada: formData.morada.trim() || null,
        codigo_postal: formData.codigoPostal.trim() || null,
        contacto_emergencia: formData.contactoEmergencia.trim() || null,
        como_soube: formData.comoSoube || null,
        nome_pai: isUnder18(lead) ? formData.nomePai.trim() || null : null,
        nome_mae: isUnder18(lead) ? formData.nomeMae.trim() || null : null,
      };

      const response = await fetch("/api/public/complete-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível guardar os dados.");
      }

      setStep("done");
    } catch (submissionError: any) {
      setError(submissionError?.message || "Não foi possível guardar os dados. Tenta novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUnder18 = (l: FoundLead) => typeof l.age === "number" && l.age < 18;

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

        {step === "done" ? (
          <div>
            <div className="mb-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">Aluno Novo</p>
              <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">Dados Guardados</h2>
            </div>
            <div className="mb-4 max-w-xl rounded-xl border border-[#1f4d33] bg-[#112117] px-4 py-3 text-sm text-green-300">
              Obrigado, {lead?.name}! Os teus dados foram guardados. Boa aula!
            </div>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="mt-2 rounded-xl bg-[#c81d25] px-4 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#a8141c]"
            >
              Voltar ao Login
            </button>
          </div>
        ) : step === "form" && lead ? (
          <div>
            <div className="mb-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">Aluno Novo</p>
              <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">Olá, {lead.name}</h2>
              <p className="mt-1 text-sm text-zinc-400">Só faltam estes dados para completar o teu registo.</p>
            </div>

            {error ? (
              <div className="mb-4 rounded-xl border border-[#5b1f24] bg-[#2a1214] px-4 py-3 text-sm text-rose-300">{error}</div>
            ) : null}

            <form onSubmit={handleSubmit} className="grid max-w-xl gap-4">
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

              {isUnder18(lead) ? (
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
                {isSubmitting ? "A Guardar..." : "Guardar"}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">Aluno Novo</p>
              <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">Completar Inscrição</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Já marcaste a tua aula experimental? Escreve o telefone ou email que usaste para continuarmos o teu registo.
              </p>
            </div>

            {lookupError ? (
              <div className="mb-4 max-w-xl rounded-xl border border-[#5b1f24] bg-[#2a1214] px-4 py-3 text-sm text-rose-300">
                {lookupError}
              </div>
            ) : null}

            <form onSubmit={handleLookup} className="grid max-w-xl gap-4">
              <div>
                <label className={labelClass}>Telefone ou Email</label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={isLookingUp}
                className="mt-2 w-full rounded-xl bg-[#c81d25] px-4 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#a8141c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLookingUp ? "A Procurar..." : "Procurar"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
