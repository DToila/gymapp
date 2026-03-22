#!/usr/bin/env python3
"""
Translation script to convert GymApp UI from English to European Portuguese.
"""

import os
import re
from pathlib import Path

# Comprehensive translation dictionary (English → Portuguese)
TRANSLATIONS = {
    # Common UI elements
    "Search": "Pesquisar",
    "Search...": "Pesquisar...",
    "Search by name": "Pesquisar por nome",
    "Search members...": "Pesquisar membros...",
    "Search class...": "Pesquisar aula...",
    "Password": "Palavra-passe",
    "Temporary Password (optional)": "Palavra-passe Temporária (opcional)",
    "Save": "Guardar",
    "Cancel": "Cancelar",
    "Submit": "Enviar",
    "Add": "Adicionar",
    "Edit": "Editar",
    "Delete": "Eliminar",
    "Back": "Voltar",
    "Download": "Descarregar",
    "Upload": "Carregar",
    "Loading": "A carregar",
    "Loading...": "A carregar...",
    # Note: "Error" and "Success" not translated to avoid conflicts with JS keywords
    "Loading login...": "A carregar login...",
    "Close": "Fechar",
    "Open": "Abrir",
    "Apply": "Aplicar",
    "Create": "Criar",
    "Update": "Atualizar",
    "Refresh": "Atualizar",
    "Retry": "Tentar novamente",
    "Try again": "Tenta novamente",
    "No results": "Nenhum resultado",
    "Something went wrong": "Algo deu errado",
    "Confirm": "Confirmar",
    "Yes": "Sim",
    "No": "Não",
    "OK": "OK",
    "Done": "Concluído",
    
    # Page titles and headings
    "Payments": "Pagamentos",
    "Members": "Membros",
    "Attendance": "Presenças",
    "Schedule": "Horário",
    "Dashboard": "Dashboard",
    "Leads": "Leads",
    "Settings": "Definições",
    "Sign in": "Entrar",
    "Sign up": "Registar",
    "Login": "Login",
    "Logout": "Sair",
    "Sign In": "Entrar",
    "Sign Up": "Registar",
    "Welcome": "Bem-vindo",
    
    # Dashboard KPIs and labels
    "Active Members": "Membros Ativos",
    "Active member": "membro ativo",
    "Unpaid": "Por Pagar",
    "Paid": "Pago",
    "Kids - Needs Attention": "Crianças - Precisa Atenção",
    "Pending Requests": "Pedidos Pendentes",
    "Unpaid (": "Por Pagar (",
    " people)": " pessoas)",
    "Recent Notes": "Notas Recentes",
    "Recent notes": "Notas recentes",
    "Upcoming Birthdays": "Próximos Aniversários",
    "Announcements": "Anúncios",
    "Behavior": "Comportamento",
    "Good behavior": "Bom comportamento",
    "Bad behavior": "Mau comportamento",
    "Neutral behavior": "Comportamento neutro",
    
    # Members Page
    "Adults": "Adultos",
    "Kids": "Crianças",
    "Status": "Estado",
    "Belt": "Cinto",
    "Amount": "Valor",
    "Member": "Membro",
    "Active": "Ativo",
    "Inactive": "Inativo",
    "Pending": "Pendente",
    "Unpaid": "Por Pagar",
    "All": "Todos",
    "Requests": "Pedidos",
    "Add Member": "Adicionar Membro",
    "Edit Member": "Editar Membro",
    "Delete Member": "Eliminar Membro",
    "Member name": "Nome do Membro",
    "Email address": "Endereço de Email",
    "Phone number": "Número de Telemóvel",
    "Date of Birth": "Data de Nascimento",
    "Age": "Idade",
    
    # Payments Page
    "Unpaid(Non-DD) and Direct Debit follow-up flow": "Fluxo de acompanhamento de Débito Direto e não-DD",
    "Unpaid (Non-DD)": "Por Pagar (Não-DD)",
    "Direct Debit": "Débito Direto",
    "DD": "DD",
    "Mark Paid": "Marcar como Pago",
    "Remind": "Lembrar",
    "Send reminder": "Enviar lembrete",
    "Amount Due": "Valor Devido",
    "Due Date": "Data de Vencimento",
    "Overdue": "Vencido",
    "Method": "Método",
    "Status": "Estado",
    "Success": "Sucesso",
    "Failed": "Falhado",
    "Couldn't load payments. Retry": "Não foi possível carregar pagamentos. Tenta novamente",
    "Payment marked as paid successfully.": "Pagamento marcado como pago com sucesso.",
    "Payment Methods": "Métodos de Pagamento",
    "Overdue Days": "Dias de Atraso",
    "Overdue 30+ days": "Atraso 30+ dias",
    "Overdue 60+ days": "Atraso 60+ dias",
    "All Methods": "Todos os Métodos",
    "All Overdue Days": "Todos os Dias de Atraso",
    "TPA": "TPA",
    "Transfer": "Transferência",
    "Cash": "Dinheiro",
    
    # Attendance Page
    # Note: "Date" keyword is NOT translated (it's the JS Date constructor)
    "Check In": "Entrada",
    "Check Out": "Saída",
    "Today": "Hoje",
    "Attendance": "Presenças",
    "Present": "Presente",
    "Absent": "Ausente",
    "Recent attendance": "Presenças recentes",
    "Checked in": "Entrou",
    
    # Settings Page
    "Staff": "Staff",
    "Admin": "Administrador",
    "Coach": "Professor",
    "Teacher": "Professor",
    "Student": "Aluno",
    "Profile": "Perfil",
    "Account": "Conta",
    "Academy Settings": "Definições da Academia",
    "Staff Management": "Gestão de Staff",
    "Invite Staff": "Convidar Staff",
    "Invite": "Convidar",
    "Invited staff": "Staff convidado",
    "Email address": "Endereço de Email",
    "Role": "Função",
    "Account created for": "Conta criada para",
    "with temporary password.": "com palavra-passe temporária.",
    "Temporary password updated for": "Palavra-passe temporária atualizada para",
    
    # Form fields and labels
    "Email": "Email",
    "Name": "Nome",
    "Phone": "Telemóvel",
    "Address": "Morada",
    "Date of Birth": "Data de Nascimento",
    "Belt Level": "Nível de Cinto",
    "Payment Type": "Tipo de Pagamento",
    "Monthly Fee": "Taxa Mensal",
    "Hourly Rate": "Taxa por Hora",
    "Family Discount": "Desconto Familiar",
    "Notes": "Notas",
    "Reference": "Referência",
    
    # Status values and badges
    "request": "pedido",
    "pending": "pendente",
    "active": "ativo",
    "inactive": "inativo",
    "paused": "pausado",
    "new": "novo",
    "Action required": "Ação necessária",
    "Action": "Ação",
    "Actions": "Ações",
    
    # Tab and Filter Names
    "Paid": "Pagos",
    "Unpaid": "Por Pagar",
    "DD": "DD",
    "DD Success": "Sucesso DD",
    "DD Failed": "Falhado DD",
    "Unmatched": "Não Correspondido",
    "Recent": "Recente",
    "Oldest": "Mais Antigo",
    "Name A-Z": "Nome A-Z",
    "Name Z-A": "Nome Z-A",
    "Belt": "Cinto",
    "Payment Method": "Método de Pagamento",
    
    # Modal and Dialog Text
    "Please confirm": "Por favor confirme",
    "Are you sure": "Tens a certeza",
    "Are you sure you want to delete this?": "Tens a certeza que queres eliminar isto?",
    "Are you sure you want to reset the paid counter to 0 for this month? This will delete all payments.": "Tens a certeza que queres repor o contador de pagos para 0 este mês? Isto eliminará todos os pagamentos.",
    
    # Others
    "View all": "Ver tudo",
    "+ 8 more unpaid": "+ 8 mais por pagar",
    "Processing image via API": "A processar imagem via API",
    "uploaded by": "carregado por",
}

def translate_file(file_path):
    """Translate a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply translations
        for english, portuguese in TRANSLATIONS.items():
            # Use word boundaries for better matching
            pattern = r'\b' + re.escape(english) + r'\b'
            content = re.sub(pattern, portuguese, content)
        
        # Only write if content changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main function to translate all relevant files."""
    base_path = Path("c:\\Users\\diogo\\OneDrive\\Documentos\\GymApp")
    src_path = base_path / "src"
    
    # Find all TSX files
    tsx_files = list(src_path.glob("**/*.tsx"))
    
    print(f"Found {len(tsx_files)} TSX files to process")
    
    translated = 0
    for file_path in tsx_files:
        if translate_file(file_path):
            translated += 1
            print(f"✓ Translated: {file_path.relative_to(base_path)}")
    
    print(f"\nCompleted: {translated} files updated")

if __name__ == "__main__":
    main()
