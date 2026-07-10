// =============================================================================
// SUPABASE — Inicialização do cliente
// =============================================================================
// ATENÇÃO: Configure as variáveis abaixo com as credenciais do seu projeto.
// Obtenha em: Settings > API > Project URL / anon public key
// =============================================================================

const SUPABASE_URL = 'https://blqeiqgwfeaahbgcsuod.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscWVpcWd3ZmVhYWhiZ2NzdW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MjA4NDcsImV4cCI6MjA5OTE5Njg0N30.suZdIXEEH59boAsyKVmYQ9nw2xH5Lmyze5EQv_IWRTc'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '⚠️  Supabase não configurado. Edite js/supabase.js com suas credenciais.'
  )
}

var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
