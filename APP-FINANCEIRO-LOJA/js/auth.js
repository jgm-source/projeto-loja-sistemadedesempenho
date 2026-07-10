// =============================================================================
// AUTH — Autenticação com Supabase
// =============================================================================

let currentUser = null

async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  currentUser = session?.user ?? null

  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user ?? null
  })
}

function getUser() {
  return currentUser
}

async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
}

async function signUp(email, password) {
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  return true
}

async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}
