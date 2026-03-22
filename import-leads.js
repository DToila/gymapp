#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="(.*)"/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  console.error('Found URL:', !!supabaseUrl, 'Found Key:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const leadsData = [
  { name: "Francisco Silva", contact_source: "Website", contact_date: "2025-10-22", phone: "911136294", email: "titianafelt@gmail.com", class_type: "GBK", notes: "RO?", status: "Por contactar", enrolled: false },
  { name: "Andre Lopes", contact_source: "Alunos GBCQ", contact_date: "2025-10-27", phone: "", email: "", class_type: "GB1", notes: "", status: "Por contactar", enrolled: false },
  { name: "Francisco Arriaga", contact_source: "Outros", contact_date: "2025-10-19", phone: "964299620", email: "", class_type: "GB1", notes: "amigo do Marco, sem contacto", next_contact_date: "2025-10-23", status: "Por contactar", enrolled: false },
  { name: "Matilde Lisboa Leilao", contact_source: "Outros", contact_date: "", phone: "", email: "", class_type: "GBK", notes: "", status: "Por contactar", enrolled: false },
  { name: "João Dinis Pereira Candeia", contact_source: "Alunos GBCQ", contact_date: "2025-11-14", phone: "917894474", email: "joaodinscandeias@gmail.com", class_type: "GB1", notes: "Amigo do Manuel Bonneville, vai resolver assuntos profissionais e logo volta", status: "Por contactar", enrolled: false },
  { name: "Rodrigo Cosma Oliveira", contact_source: "Alunos GBCQ", contact_date: "2025-11-11", phone: "", email: "", class_type: "GB1", notes: "Amigo do Manuel Bonneville", status: "Por contactar", enrolled: false },
  { name: "Vítor Dalhen Costa", contact_source: "Alunos GBCQ", contact_date: "2025-11-21", phone: "910268262", email: "dalbemcosta@gmail.com", class_type: "GB1", notes: "Amigo do Manuel Bonneville", status: "Por contactar", enrolled: false },
  { name: "Tiago Matias", contact_source: "Outros", contact_date: "2025-11-20", phone: "935145573", email: "", class_type: "GB1", notes: "Disse que só começaria", next_contact_date: "2026-01-31", status: "Por contactar", enrolled: false },
  { name: "Cássia da Silva e Fabiano", contact_source: "Instagram", contact_date: "2025-11-20", phone: "915386550", email: "", class_type: "GBK", notes: "Começar Tinida mala h", next_contact_date: "2025-11-24", status: "Por contactar", enrolled: false },
  { name: "João Maria Souza Martins", contact_source: "Instagram", contact_date: "2025-06-11", phone: "966940269", email: "joamartins@saluno.ai", class_type: "GB1", notes: "", status: "Por contactar", enrolled: false },
  { name: "Vasco Nunes Albano", contact_source: "Alunos GBCQ", contact_date: "2025-03-11", phone: "930506489", email: "vascoalbanos@gmail.com", class_type: "GB1", notes: "", next_contact_date: "2025-11-03", status: "Por contactar", enrolled: false },
  { name: "Anne Karoline", contact_source: "Outros", contact_date: "2025-11-19", phone: "925445432", email: "", class_type: "GB1", notes: "foi enviada mensagem", next_contact_date: "2025-11-22", status: "Por contactar", enrolled: false },
  { name: "Francisco Luis Gil Duarte", contact_source: "Outros", contact_date: "2025-11-11", phone: "968061064", email: "franciscoluisduarte@gmail.com", class_type: "GB1", notes: "Telefone da mãe, foi em", next_contact_date: "2025-12-28", status: "Por contactar", enrolled: false },
  { name: "Ricardo", contact_source: "Outros", contact_date: "", phone: "925106011", email: "", class_type: "GB1", notes: "Ligar em Dezembro", status: "Por contactar", enrolled: false },
  { name: "Amanda dos Santos Beavi", contact_source: "Outros", contact_date: "2025-10-10", phone: "931732506", email: "amandaboavida@gmail.com", class_type: "GB1", notes: "Contactar perto do fim de ano", status: "Por contactar", enrolled: false },
  { name: "Pedro e Yasmin Linhares", contact_source: "Outros", contact_date: "2025-11-27", phone: "910772892", email: "", class_type: "GBK", notes: "Ficaram de falar em casa", status: "Por contactar", enrolled: false },
  { name: "Mayara Guimaraes Silva", contact_source: "Instagram", contact_date: "2025-11-20", phone: "932585229", email: "mayara.entufa@gmail.com", class_type: "GB1", notes: "Vai iniciar no inicio do ano", next_contact_date: "2026-01-31", status: "Por contactar", enrolled: false },
  { name: "Matilde Cambeta", contact_source: "Alunos GBCQ", contact_date: "", phone: "911080181", email: "isabelabuquerque@gmail.com", class_type: "GBK", notes: "", status: "Por contactar", enrolled: false },
  { name: "Vasco Pinheiro Pinto", contact_source: "Outros", contact_date: "", phone: "965568647", email: "dmi.pinto@gmail.com", class_type: "GBK", notes: "Mulher Grávida, Ligar em", next_contact_date: "2026-01-31", status: "Por contactar", enrolled: false },
  { name: "Diogo Gomes", contact_source: "Outros", contact_date: "2025-10-16", phone: "914483624", email: "dvgomes@outlook.com", class_type: "GBK", notes: "partiu a perna, Ligar em", next_contact_date: "2026-01-31", status: "Por contactar", enrolled: false },
  { name: "Duarte Rodrigues", contact_source: "Outros", contact_date: "", phone: "916882021", email: "duarterodrigues91@gmail.com", class_type: "GB1", notes: "", next_contact_date: "2025-12-15", trial_date: "2025-12-15", status: "Inscrito", enrolled: true },
  { name: "Elsa Reis", contact_source: "Instagram", contact_date: "2026-03-12", phone: "", email: "", class_type: "GBK", notes: "contactar IG a ver se gostou da aula e", next_contact_date: "2026-11-03", status: "Por contactar", enrolled: false },
  { name: "Cláudia Silva", contact_source: "Alunos GBCQ", contact_date: "2026-03-12", phone: "918761567", email: "", class_type: "GB1", notes: "", status: "Por contactar", enrolled: false },
  { name: "Marco (art of fight)", contact_source: "Outros", contact_date: "2026-03-16", phone: "936631479", email: "", class_type: "GB1", notes: "virá com primo que já treina", next_contact_date: "2026-03-17", status: "Por contactar", enrolled: false },
];

async function importLeads() {
  try {
    console.log(`Starting import of ${leadsData.length} leads...`);

    // Normalize data
    const normalizedLeads = leadsData.map(lead => ({
      name: lead.name.trim(),
      contact_source: lead.contact_source || "Outros",
      contact_date: lead.contact_date || null,
      phone: lead.phone?.trim() || null,
      email: lead.email?.trim() || null,
      class_type: lead.class_type || "GB1",
      notes: lead.notes?.trim() || null,
      next_contact_date: lead.next_contact_date || null,
      followup_note: null,
      status: lead.status || "Por contactar",
      trial_date: lead.trial_date || null,
      enrolled: lead.enrolled || false,
      not_enrolled_reason: null,
      not_enrolled_reason_text: null,
    }));

    // Insert in batches of 10
    const batchSize = 10;
    let inserted = 0;

    for (let i = 0; i < normalizedLeads.length; i += batchSize) {
      const batch = normalizedLeads.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('leads')
        .insert(batch)
        .select();

      if (error) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        continue;
      }

      inserted += batch.length;
      console.log(`✓ Inserted ${inserted}/${normalizedLeads.length} leads`);
    }

    console.log(`\n✅ Import completed! ${inserted} leads added to Supabase.`);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

importLeads();
