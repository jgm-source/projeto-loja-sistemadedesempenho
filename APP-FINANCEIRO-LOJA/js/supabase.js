// =============================================================================
// SUPABASE — Inicialização do cliente
// =============================================================================
// Carrega credenciais de window.__SUPABASE_CONFIG (js/supabase.local.js)
// ou usa os valores padrão abaixo.
// =============================================================================

var SUPABASE_URL = 'https://blqeiqgwfeaahbgcsuod.supabase.co'
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscWVpcWd3ZmVhYWhiZ2NzdW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MjA4NDcsImV4cCI6MjA5OTE5Njg0N30.suZdIXEEH59boAsyKVmYQ9nw2xH5Lmyze5EQv_IWRTc'

if (window.__SUPABASE_CONFIG) {
  SUPABASE_URL = window.__SUPABASE_CONFIG.url || SUPABASE_URL
  SUPABASE_ANON_KEY = window.__SUPABASE_CONFIG.anonKey || SUPABASE_ANON_KEY
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '⚠️  Supabase não configurado. Crie js/supabase.local.js baseado em supabase.local.example.js'
  )
}

var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
