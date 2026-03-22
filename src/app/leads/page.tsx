'use client';

import { useState, useRef, useEffect } from 'react';
import TeacherSidebar from '@/components/members/TeacherSidebar';
import { supabase } from '../../../lib/supabase';
import LeadsTable from '@/components/leads/LeadsTable';
import {
  Lead,
  LEAD_CLASS_TYPES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  NOT_ENROLLED_REASONS,
} from '@/components/leads/types';

const emptyLead = (): Lead => ({
  id: `lead-${Date.now()}`,
  name: '',
  contact_source: 'Website',
  contact_date: new Date().toISOString().slice(0, 10),
  phone: '',
  email: '',
  class_type: 'GB1',
  notes: '',
  next_contact_date: '',
  followup_note: '',
  status: 'Por contactar',
  trial_date: '',
  enrolled: false,
  not_enrolled_reason: undefined,
  not_enrolled_reason_text: '',
});

const todayKey = () => new Date().toISOString().slice(0, 10);

const applyLeadStatusRules = (lead: Lead): Lead => {
  if (lead.enrolled) {
    return {
      ...lead,
      status: 'Inscrito',
      not_enrolled_reason: undefined,
      not_enrolled_reason_text: '',
    };
  }

  if (!lead.enrolled && lead.not_enrolled_reason) {
    return { ...lead, status: 'Nao inscrito' };
  }

  return lead;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [followupFilter, setFollowupFilter] = useState<'all' | 'overdue'>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadDrawerOpen, setIsLeadDrawerOpen] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dedupeWarning, setDedupeWarning] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch leads on component mount
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setLeads(data || []);
      } catch (err) {
        console.error('Erro fetching leads:', err);
        setError(err instanceof Error ? err.message : 'Falhado to load leads');
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  const isOverdueFollowup = (lead: Lead) =>
    Boolean(lead.next_contact_date && lead.next_contact_date < todayKey());

  const filteredLeads = leads.filter((lead) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      lead.name.toLowerCase().includes(query) ||
      (lead.phone || '').toLowerCase().includes(query) ||
      (lead.email || '').toLowerCase().includes(query);

    const matchesFilter = followupFilter === 'all' ? true : isOverdueFollowup(lead);

    return matchesSearch && matchesFilter;
  });

  const openNewLead = () => {
    setFormError(null);
    setDedupeWarning(null);
    setIsCreatingLead(true);
    setSelectedLead(emptyLead());
    setIsLeadDrawerOpen(true);
    setIsDropdownOpen(false);
  };

  const openScanModal = () => {
    setScanError(null);
    setIsScanModalOpen(true);
    setIsDropdownOpen(false);
  };

  const closeScanModal = () => {
    setIsScanModalOpen(false);
    setScanError(null);
    setIsScanning(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const scanWelcomeForm = async (file: File) => {
    try {
      setIsScanning(true);
      setScanError(null);

      const base64Data = await fileToBase64(file);

      // Criar abort controller with 120 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      try {
        // Use server-side proxy to avoid CORS and keep API key secure
        const response = await fetch('/api/scan-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            fileBase64: base64Data,
            fileType: file.type.startsWith('image/') ? 'image' : 'pdf',
            mimeType: file.type,
            prompt: 'This is a Gracie Barra welcome form. Extract these fields and return ONLY valid JSON with no markdown: name, date_of_birth (YYYY-MM-DD), nif, phone, email, address, emergency_contact, how_they_found_us, parent_name (if minor). If a field is not visible or legible return null.',
          }),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falhado to process image');
        }

        const data = await response.json();

        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format from server');
        }

        // data is already parsed from the proxy
        const extractedData = data;

        const newLead = emptyLead();
        if (extractedData.name) newLead.name = extractedData.name;
        if (extractedData.phone) newLead.phone = extractedData.phone;
        if (extractedData.email) newLead.email = extractedData.email;

        setSelectedLead(newLead);
        setIsCreatingLead(true);
        setIsLeadDrawerOpen(true);
        closeScanModal();
        setIsScanning(false);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Image processing took too long (over 2 minutes). The form may be too complex. Try a cropped/closer photo of just the relevant fields.');
        }
        throw fetchError;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro processing image. Please try again.';
      setScanError(errorMessage);
      setIsScanning(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await scanWelcomeForm(file);
    }
  };

  const openEditLead = (lead: Lead) => {
    setFormError(null);
    setDedupeWarning(null);
    setIsCreatingLead(false);
    setSelectedLead({ ...lead });
    setIsLeadDrawerOpen(true);
  };

  const closeLeadDrawer = () => {
    setIsLeadDrawerOpen(false);
    setSelectedLead(null);
    setIsCreatingLead(false);
    setFormError(null);
    setDedupeWarning(null);
  };

  const updateLeadField = <K extends keyof Lead>(field: K, value: Lead[K]) => {
    setSelectedLead((prev) => {
      if (!prev) return prev;
      return applyLeadStatusRules({ ...prev, [field]: value });
    });
  };

  const checkDedupeWarning = (lead: Lead) => {
    const phone = (lead.phone || '').trim();
    const email = (lead.email || '').trim().toLowerCase();
    if (!phone && !email) {
      setDedupeWarning(null);
      return;
    }

    const duplicateLead = leads.find(
      (item) =>
        item.id !== lead.id &&
        ((phone && item.phone === phone) || (email && (item.email || '').toLowerCase() === email))
    );

    if (duplicateLead) {
      setDedupeWarning('Possivel duplicado encontrado por telefone ou email.');
      return;
    }

    setDedupeWarning(null);
  };

  const saveLead = async () => {
    if (!selectedLead) return;

    if (!selectedLead.name.trim()) {
      setFormError('Nome obrigatorio.');
      return;
    }

    const normalized = applyLeadStatusRules({
      ...selectedLead,
      name: selectedLead.name.trim(),
      phone: (selectedLead.phone || '').trim(),
      email: (selectedLead.email || '').trim(),
      notes: selectedLead.notes?.trim() || '',
      followup_note: selectedLead.followup_note?.trim() || '',
      not_enrolled_reason_text: selectedLead.not_enrolled_reason_text?.trim() || '',
      next_contact_date: selectedLead.next_contact_date || '',
      trial_date: selectedLead.trial_date || '',
    });

    checkDedupeWarning(normalized);

    try {
      setSaving(true);
      setFormError(null);

      if (isCreatingLead) {
        // Insert new lead
        const { data, error: insertError } = await supabase
          .from('leads')
          .insert([normalized])
          .select()
          .single();

        if (insertError) throw insertError;

        setLeads((prev) => [data, ...prev]);
      } else {
        // Atualizar existing lead
        const { error: updateError } = await supabase
          .from('leads')
          .update(normalized)
          .eq('id', normalized.id);

        if (updateError) throw updateError;

        setLeads((prev) => prev.map((item) => (item.id === normalized.id ? normalized : item)));
      }

      closeLeadDrawer();
    } catch (err) {
      console.error('Erro saving lead:', err);
      setFormError(err instanceof Error ? err.message : 'Falhado to save lead');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkImport = async () => {
    if (!importData.trim()) {
      setImportError('Cola dados em formato de tabela (nome, telefone, email, etc)');
      return;
    }

    try {
      setImporting(true);
      setImportError(null);

      // Parse pasted data (assumes tab-separated or comma-separated values)
      const lines = importData.trim().split('\n');
      const leadsToInsert: Lead[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;

        // Split by tab or comma
        const parts = line.split(/\t|,/).map((p) => p.trim()).filter(Boolean);
        if (parts.length < 1) continue;

        const lead: Lead = {
          id: `lead-${Date.now()}-${Math.random()}`,
          name: parts[0] || '',
          phone: parts[1] || '',
          email: parts[2] || '',
          contact_source: 'Outros',
          contact_date: new Date().toISOString().slice(0, 10),
          class_type: (parts[3] || 'GB1') as any,
          notes: parts[4] || '',
          next_contact_date: parts[5] || '',
          followup_note: '',
          status: 'Por contactar',
          trial_date: '',
          enrolled: false,
          not_enrolled_reason: undefined,
          not_enrolled_reason_text: '',
        };

        if (lead.name) {
          leadsToInsert.push(lead);
        }
      }

      if (leadsToInsert.length === 0) {
        setImportError('Nenhum lead válido encontrado nos dados');
        return;
      }

      // Bulk insert to Supabase
      const { error: insertError } = await supabase.from('leads').insert(leadsToInsert);

      if (insertError) throw insertError;

      // Reload leads
      const { data } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      setLeads(data || []);
      setImportData('');
      setIsImportModalOpen(false);
    } catch (err) {
      console.error('Erro importing leads:', err);
      setImportError(err instanceof Error ? err.message : 'Erro ao importar leads');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0b0b0b]">
      <TeacherSidebar ativo="leads" />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-[#222] bg-[#0d0d0d] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white">Leads</h1>
              <p className="mt-1 text-sm text-zinc-500">Gestao de contactos, follow-up, aula experimental e inscricao.</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="rounded-xl bg-[#c81d25] px-6 py-2.5 font-semibold text-white hover:bg-[#b01720] transition"
              >
                + Novo Lead
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#222] bg-[#121212] shadow-lg z-20">
                  <button
                    onClick={openNewLead}
                    className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#1a1a1a] transition border-b border-[#222] first:rounded-t-xl"
                  >
                    <p className="font-semibold">Preencher manualmente</p>
                    <p className="text-xs text-zinc-400 mt-1">Criar new lead preenchendo o formulario</p>
                  </button>
                  <button
                    onClick={openScanModal}
                    className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#1a1a1a] transition border-b border-[#222]"
                  >
                    <p className="font-semibold">Scan da folha de boas-vindas</p>
                    <p className="text-xs text-zinc-400 mt-1">Fotografe ou carregue a folha de boas-vindas</p>
                  </button>
                  <button
                    onClick={() => {
                      setIsImportModalOpen(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#1a1a1a] transition last:rounded-b-xl"
                  >
                    <p className="font-semibold">Importar Leads</p>
                    <p className="text-xs text-zinc-400 mt-1">Importar multiplos leads de um ficheiro ou planilha</p>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-5">
            <div className="mb-6 flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Pesquisar leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-[#222] bg-[#121212] px-4 py-2 text-white placeholder-zinc-500 focus:border-[#c81d25] focus:outline-none transition"
                />
              </div>
              <select
                value={followupFilter}
                onChange={(e) => setFollowupFilter(e.target.value as 'all' | 'overdue')}
                className="rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-sm text-white focus:border-[#c81d25] focus:outline-none whitespace-nowrap"
              >
                <option value="all">Todos os follow-ups</option>
                <option value="overdue">Follow-ups em atraso</option>
              </select>
            </div>

            <div className="rounded-2xl border border-[#222] bg-[#121212] overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#333] border-t-[#c81d25]"></div>
                    <p className="mt-4 text-zinc-400">Carregando leads...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-lg border border-[#7f1d1d] bg-[#1a0202] p-6">
                  <p className="text-[#fecaca] font-medium">Erro ao carregar leads:</p>
                  <p className="text-[#fca5a5] text-sm mt-1">{error}</p>
                </div>
              ) : (
                <LeadsTable leads={filteredLeads} onRowClick={openEditLead} />
              )}
            </div>
          </div>
        </div>
      </main>

      {isLeadDrawerOpen && selectedLead && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center" onClick={closeLeadDrawer}>
          <div
            className="max-h-[90vh] w-full max-w-[760px] overflow-y-auto rounded-2xl border border-[#222] bg-[#121212] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{isCreatingLead ? 'Novo Lead' : selectedLead.name}</h2>
              <button onClick={closeLeadDrawer} className="text-zinc-400 transition hover:text-white">
                X
              </button>
            </div>

            <div className="space-y-4">
              {formError ? (
                <div className="rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#fca5a5]">{formError}</div>
              ) : null}
              {dedupeWarning ? (
                <div className="rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-2 text-sm text-[#fcd34d]">{dedupeWarning}</div>
              ) : null}

              <div className="rounded-2xl border border-[#222] bg-[#0f0f0f] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Contacto</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Nome *</label>
                    <input
                      value={selectedLead.name}
                      onChange={(e) => updateLeadField('name', e.target.value)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Via de Contacto</label>
                    <select
                      value={selectedLead.contact_source}
                      onChange={(e) => updateLeadField('contact_source', e.target.value as Lead['contact_source'])}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    >
                      {LEAD_SOURCES.map((source) => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Data de Contacto</label>
                    <input
                      type="date"
                      value={selectedLead.contact_date}
                      onChange={(e) => updateLeadField('contact_date', e.target.value)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Numero de Telefone</label>
                    <input
                      value={selectedLead.phone || ''}
                      onChange={(e) => updateLeadField('phone', e.target.value)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">E-mail</label>
                    <input
                      type="email"
                      value={selectedLead.email || ''}
                      onChange={(e) => updateLeadField('email', e.target.value)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#222] bg-[#0f0f0f] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Acompanhamento</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Data Proximo Contacto</label>
                    <input
                      type="date"
                      value={selectedLead.next_contact_date || ''}
                      onChange={(e) => updateLeadField('next_contact_date', e.target.value)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Estado</label>
                    <select
                      value={selectedLead.status}
                      onChange={(e) => updateLeadField('status', e.target.value as Lead['status'])}
                      disabled={selectedLead.enrolled || Boolean(selectedLead.not_enrolled_reason)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none disabled:opacity-60"
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Followup</label>
                    <textarea
                      rows={3}
                      value={selectedLead.followup_note || ''}
                      onChange={(e) => updateLeadField('followup_note', e.target.value)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#222] bg-[#0f0f0f] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Aula Experimental</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Aula (idade)</label>
                    <select
                      value={selectedLead.class_type}
                      onChange={(e) => updateLeadField('class_type', e.target.value as Lead['class_type'])}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    >
                      {LEAD_CLASS_TYPES.map((classType) => (
                        <option key={classType} value={classType}>{classType}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Data Aula Experimental</label>
                    <input
                      type="date"
                      value={selectedLead.trial_date || ''}
                      onChange={(e) => updateLeadField('trial_date', e.target.value)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Observacoes</label>
                    <textarea
                      rows={3}
                      value={selectedLead.notes || ''}
                      onChange={(e) => updateLeadField('notes', e.target.value)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#222] bg-[#0f0f0f] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Resultado</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <label className="text-xs font-medium text-zinc-400">Inscrito (S/N)</label>
                    <button
                      type="button"
                      onClick={() => updateLeadField('enrolled', true)}
                      className={`rounded-xl border px-3 py-1.5 text-sm ${selectedLead.enrolled ? 'border-[#c81d25] bg-[#2a1113] text-white' : 'border-[#222] text-zinc-300'}`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => updateLeadField('enrolled', false)}
                      className={`rounded-xl border px-3 py-1.5 text-sm ${!selectedLead.enrolled ? 'border-[#c81d25] bg-[#2a1113] text-white' : 'border-[#222] text-zinc-300'}`}
                    >
                      Nao
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Motivo Nao Inscricao</label>
                    <select
                      value={selectedLead.not_enrolled_reason || ''}
                      onChange={(e) => updateLeadField('not_enrolled_reason', (e.target.value || undefined) as Lead['not_enrolled_reason'])}
                      disabled={selectedLead.enrolled}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none disabled:opacity-60"
                    >
                      <option value="">Selecionar motivo</option>
                      {NOT_ENROLLED_REASONS.map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Detalhes do motivo</label>
                    <input
                      value={selectedLead.not_enrolled_reason_text || ''}
                      onChange={(e) => updateLeadField('not_enrolled_reason_text', e.target.value)}
                      disabled={selectedLead.enrolled}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3 border-t border-[#222] pt-6">
                <button 
                  onClick={saveLead} 
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[#c81d25] px-4 py-2 font-semibold text-white hover:bg-[#b01720] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Guardando...' : 'Guardar Lead'}
                </button>
                <button onClick={closeLeadDrawer} className="flex-1 rounded-xl border border-[#222] px-4 py-2 font-semibold text-white hover:bg-[#161616] transition">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isScanModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50" onClick={closeScanModal}>
          <div
            className="w-full max-w-md rounded-2xl border border-[#222] bg-[#121212] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Scan da folha de boas-vindas</h2>
              <p className="mt-1 text-xs text-zinc-400">Carregue uma imagem da folha de boas-vindas para extrair dados automaticamente</p>
            </div>

            {scanError && (
              <div className="mb-4 rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#fca5a5]">
                {scanError}
              </div>
            )}

            <div className="mb-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isScanning}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="w-full rounded-xl border-2 border-dashed border-[#c81d25] bg-[#0d0d0d] px-4 py-8 text-center hover:bg-[#161616] transition disabled:opacity-60"
              >
                {isScanning ? (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#c81d25] border-t-transparent"></div>
                    <div>
                      <p className="text-white font-semibold">A processar imagem...</p>
                      <p className="text-xs text-zinc-400 mt-1">Isto pode levar alguns minutos</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-white font-semibold">Carregue uma imagem</p>
                    <p className="text-xs text-zinc-400 mt-2">Clique para selecionar ou arraste uma imagem aqui</p>
                  </div>
                )}
              </button>
            </div>

            <button
              onClick={closeScanModal}
              disabled={isScanning}
              className="w-full rounded-xl border border-[#222] px-4 py-2 font-semibold text-white hover:bg-[#161616] transition disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50" onClick={() => setIsImportModalOpen(false)}>
          <div
            className="w-full max-w-2xl rounded-2xl border border-[#222] bg-[#121212] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Importar Leads</h2>
              <p className="mt-1 text-xs text-zinc-400">Cole dados em formato de tabela (nome, telefone, email, aula, observações)</p>
            </div>

            {importError && (
              <div className="mb-4 rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#fca5a5]">
                {importError}
              </div>
            )}

            <div className="mb-6">
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                disabled={importing}
                placeholder="Nome&#10;Telefone&#10;Email&#10;Aula&#10;Observações&#10;...&#10;&#10;Pode colar dados do Excel/Google Sheets aqui."
                className="w-full h-48 rounded-xl border border-[#222] bg-[#0d0d0d] px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#c81d25] resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBulkImport}
                disabled={importing || !importData.trim()}
                className="flex-1 rounded-xl bg-[#c81d25] px-4 py-2 font-semibold text-white hover:bg-[#b01720] transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    A importar...
                  </>
                ) : (
                  <>📋 Importar</>
                )}
              </button>
              <button
                onClick={() => setIsImportModalOpen(false)}
                disabled={importing}
                className="flex-1 rounded-xl border border-[#222] px-4 py-2 font-semibold text-white hover:bg-[#161616] transition disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
