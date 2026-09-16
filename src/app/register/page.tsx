"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toLocalDateKey } from "@/components/leads/leadAutomation";
import PublicTrialPicker from "@/components/register/PublicTrialPicker";
import AuthHero from "@/components/auth/AuthHero";

interface RegisterFormData {
  nome: string;
  dataNascimento: string;
  email: string;
  telemovel: string;
}

const initialForm: RegisterFormData = {
  nome: "",
  dataNascimento: "",
  email: "",
  telemovel: "",
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
  const [step, setStep] = useState<"form" | "booking" | "done">("form");
  const [bookingLeadId, setBookingLeadId] = useState<string | null>(null);
  const [bookingAge, setBookingAge] = useState<number | null>(null);
  const [showArrivalReminder, setShowArrivalReminder] = useState(false);

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
      };

      const response = await fetch("/api/public/register-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível enviar o pedido.");
      }

      setBookingLeadId(data.leadId);
      setBookingAge(age ?? 0);
      setStep("booking");
    } catch (submissionError: any) {
      console.error("Registration error:", submissionError);
      setError(submissionError?.message || "Não foi possível enviar o pedido. Tenta novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBooked = (session: { dateKey: string; startTime: string; endTime: string }) => {
    const dateLabel = new Date(`${session.dateKey}T00:00:00`).toLocaleDateString("pt-PT", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    });
    setSuccessMessage(
      `Pedido enviado e aula experimental marcada para ${dateLabel} às ${session.startTime}! Entraremos em contacto para confirmar.`
    );
    setShowArrivalReminder(true);
    setStep("done");
    setFormData(initialForm);
  };

  const handleSkipBooking = () => {
    setSuccessMessage("Pedido enviado! Entraremos em contacto em breve para marcar a aula experimental.");
    setShowArrivalReminder(false);
    setStep("done");
    setFormData(initialForm);
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#0b0b0b] lg:grid-cols-2">
      <AuthHero />

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
              <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">Pedido Enviado</h2>
            </div>
            <div className="mb-4 max-w-xl rounded-xl border border-[#1f4d33] bg-[#112117] px-4 py-3 text-sm text-green-300">
              {successMessage}
            </div>
            {showArrivalReminder ? (
              <div className="mb-4 max-w-xl rounded-xl border-2 border-[#c81d25] bg-[rgba(200,29,37,0.12)] px-5 py-4">
                <p className="text-lg font-black leading-snug text-white sm:text-xl">
                  Chega 10 minutos mais cedo e traz chinelos e uma garrafa de água.
                </p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="mt-2 rounded-xl bg-[#c81d25] px-4 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#a8141c]"
            >
              Voltar ao Login
            </button>
          </div>
        ) : step === "booking" && bookingLeadId ? (
          <PublicTrialPicker
            leadId={bookingLeadId}
            age={bookingAge ?? 0}
            onBooked={handleBooked}
            onSkip={handleSkipBooking}
          />
        ) : (
        <div>
        <div className="mb-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">Aluno Novo</p>
          <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">Nova Inscrição</h2>
        </div>

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

          <p className="text-xs text-zinc-500">
            Os restantes dados (NIF, morada, contacto de emergência, etc.) são preenchidos na academia, no dia da aula.
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-xl bg-[#c81d25] px-4 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#a8141c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "A Enviar..." : "Enviar e Marcar Aula Experimental"}
          </button>
        </form>
        </div>
        )}
      </div>
    </div>
  );
}
