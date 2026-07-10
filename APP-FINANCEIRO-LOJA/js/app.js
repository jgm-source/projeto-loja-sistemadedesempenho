// =============================================================================
// APP — Router SPA e inicialização
// =============================================================================

const routes = {
  '/login': renderLogin,
  '/dashboard': renderDashboard,
  '/closing': renderClosing,
}

function parseHash() {
  const hash = window.location.hash.slice(1)
  const [path, queryString] = hash.split('?')
  const params = {}
  if (queryString) {
    queryString.split('&').forEach(pair => {
      const [key, value] = pair.split('=')
      params[decodeURIComponent(key)] = decodeURIComponent(value || '')
    })
  }
  return { path: path || '/login', params }
}

function navigate(path) {
  const [basePath] = path.split('?')

  if (basePath === '/login' && getUser()) {
    path = '/dashboard'
  } else if (basePath !== '/login' && !getUser()) {
    path = '/login'
  }

  window.location.hash = path

  const { path: parsedPath, params } = parseHash()
  renderRoute(parsedPath, params)
}

function renderRoute(path, params) {
  const renderFn = routes[path]
  if (renderFn) {
    if (path === '/closing') {
      renderFn(params.date || null)
    } else {
      renderFn()
    }
  } else {
    navigate('/dashboard')
  }
}

function initRouter() {
  const { path, params } = parseHash()
  renderRoute(path, params)

  window.addEventListener('hashchange', () => {
    const { path: newPath, params: newParams } = parseHash()
    renderRoute(newPath, newParams)
  })
}

window.addEventListener('DOMContentLoaded', async () => {
  if (typeof supabase === 'undefined') {
    document.getElementById('app').innerHTML = `
      <div class="setup-warning">
        <h2>⚠️ Configuração Necessária</h2>
        <p>Edite o arquivo <code>js/supabase.js</code> com as credenciais do seu projeto Supabase.</p>
        <p>Você precisa das chaves: <strong>SUPABASE_URL</strong> e <strong>SUPABASE_ANON_KEY</strong>.</p>
      </div>
    `
    return
  }

  await initAuth()
  initRouter()
})

window.navigate = navigate
window.handleLogout = handleLogout
window.addItem = addItem
window.removeItem = removeItem
window.saveClosing = saveClosing
window.loadDashboardData = loadDashboardData
window.calculateInconsistency = calculateInconsistency
window.editClosing = editClosing
window.deleteClosing = deleteClosing
window.updateDateDisplay = updateDateDisplay
