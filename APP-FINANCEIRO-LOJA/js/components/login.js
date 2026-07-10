// =============================================================================
// LOGIN — Tela de autenticação
// =============================================================================

function renderLogin() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="login-icon">💰</div>
          <h1>App Financeiro</h1>
          <p>Faça login para acessar o sistema</p>
        </div>
        <form id="loginForm" class="login-form">
          <div class="form-group">
            <label for="email">E-mail</label>
            <input type="email" id="email" placeholder="seu@email.com" required autocomplete="email">
          </div>
          <div class="form-group">
            <label for="password">Senha</label>
            <input type="password" id="password" placeholder="Sua senha" required autocomplete="current-password">
          </div>
          <div id="loginError" class="login-error"></div>
          <button type="submit" id="loginBtn" class="btn btn-primary btn-full">
            Entrar
          </button>
        </form>
        <div class="login-footer">
          <p>Não tem conta? <a href="#" id="showSignup">Criar conta</a></p>
        </div>
      </div>
    </div>
  `

  document.getElementById('loginForm').addEventListener('submit', handleLogin)
  document.getElementById('showSignup').addEventListener('click', (e) => {
    e.preventDefault()
    renderSignup()
  })
}

function renderSignup() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="login-icon">📝</div>
          <h1>Criar Conta</h1>
          <p>Cadastre-se para começar a usar</p>
        </div>
        <form id="signupForm" class="login-form">
          <div class="form-group">
            <label for="email">E-mail</label>
            <input type="email" id="email" placeholder="seu@email.com" required autocomplete="email">
          </div>
          <div class="form-group">
            <label for="password">Senha</label>
            <input type="password" id="password" placeholder="Mínimo 6 caracteres" required minlength="6" autocomplete="new-password">
          </div>
          <div id="loginError" class="login-error"></div>
          <button type="submit" id="signupBtn" class="btn btn-primary btn-full">
            Criar Conta
          </button>
        </form>
        <div class="login-footer">
          <p>Já tem conta? <a href="#" id="showLogin">Fazer login</a></p>
        </div>
      </div>
    </div>
  `

  document.getElementById('signupForm').addEventListener('submit', handleSignup)
  document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault()
    renderLogin()
  })
}

async function handleLogin(e) {
  e.preventDefault()
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  const errorEl = document.getElementById('loginError')
  const btn = document.getElementById('loginBtn')

  errorEl.textContent = ''
  btn.disabled = true
  btn.textContent = 'Entrando...'

  try {
    await signIn(email, password)
    navigate('/dashboard')
  } catch (err) {
    errorEl.textContent = err.message
    btn.disabled = false
    btn.textContent = 'Entrar'
  }
}

async function handleSignup(e) {
  e.preventDefault()
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  const errorEl = document.getElementById('loginError')
  const btn = document.getElementById('signupBtn')

  errorEl.textContent = ''
  btn.disabled = true
  btn.textContent = 'Criando...'

  try {
    await signUp(email, password)
    errorEl.style.color = '#22c55e'
    errorEl.textContent = 'Conta criada! Verifique seu e-mail para confirmar.'
    btn.disabled = false
    btn.textContent = 'Criar Conta'
  } catch (err) {
    errorEl.textContent = err.message
    btn.disabled = false
    btn.textContent = 'Criar Conta'
  }
}
