// =============================================================================
// DASHBOARD — Tela principal com cards, cálculos e gráfico
// =============================================================================

let forecastBaseOffset = 1
let forecastCompareOffset = 0

function renderDashboard() {
  if (window._chartInstance) {
    window._chartInstance.destroy()
    window._chartInstance = null
  }

  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="dashboard-header">
      <div>
        <h1>Dashboard</h1>
        <p class="dashboard-subtitle">Resumo financeiro da sua loja</p>
      </div>
      <div class="dashboard-actions">
        <button class="btn btn-primary" onclick="navigate('/closing')">
          + Novo Fechamento
        </button>
        <button class="btn btn-outline theme-toggle" onclick="toggleTheme()">🌙</button>
        <button class="btn btn-outline" onclick="handleLogout()">Sair</button>
      </div>
    </div>

    <div class="cards-grid" id="dashboardCards">
      <div class="card card-loading">
        <div class="card-skeleton"></div>
      </div>
      <div class="card card-loading">
        <div class="card-skeleton"></div>
      </div>
      <div class="card card-loading">
        <div class="card-skeleton"></div>
      </div>
      <div class="card card-loading">
        <div class="card-skeleton"></div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card" id="forecastCard">
        <h3>📈 Previsão de Faturamento</h3>
        <div class="forecast-loading">Calculando...</div>
      </div>
      <div class="card" id="chartCard">
        <h3>📊 Dias da Semana — Volume de Faturamento</h3>
        <canvas id="weekdayChart" height="250"></canvas>
      </div>
    </div>

    <div class="closings-table-section" id="closingsTableSection">
      <div class="card card-loading">
        <div class="card-skeleton" style="height:40px"></div>
      </div>
    </div>
  `

  loadDashboardData()
}

async function loadDashboardData() {
  const user = getUser()
  if (!user) return navigate('/login')

  const today = todayStr()
  const week = getWeekRange()
  const month = getMonthRange()

  try {
    const [
      todayData,
      weekData,
      monthData,
      weekdayData,
      forecastData,
    ] = await Promise.all([
      fetchDayTotal(user.id, today),
      fetchPeriodData(user.id, week.start, week.end),
      fetchPeriodData(user.id, month.start, month.end),
      fetchWeekdayVolume(user.id, month.start, month.end),
      calculateForecast(forecastBaseOffset, forecastCompareOffset),
    ])

    updateCards(todayData, weekData, monthData)
    updateForecast(forecastData)
    updateChart(weekdayData)
    const closingsData = await fetchAllClosings(user.id)

    updateCards(todayData, weekData, monthData)
    updateForecast(forecastData)
    updateChart(weekdayData)
    updateClosingsTable(closingsData)
  } catch (err) {
    console.error('Erro ao carregar dashboard:', err)

    const isMissingTable = err.message && (
      err.message.includes('relation') ||
      err.message.includes('does not exist') ||
      err.message.includes('42P01') ||
      err.message.includes('PGRST')
    )

    if (isMissingTable) {
      document.getElementById('dashboardCards').innerHTML = `
        <div class="card card-error" style="grid-column:1/-1">
          <h3>⚙️ Configure o Banco de Dados</h3>
          <p>As tabelas do sistema ainda não foram criadas no Supabase.</p>
          <p style="margin-top:8px;font-size:0.875rem;">
            1. Acesse o <strong>SQL Editor</strong> no painel do Supabase<br>
            2. Copie e execute o conteúdo do arquivo <strong>database/schema.sql</strong>
          </p>
          <button class="btn btn-outline btn-sm" onclick="loadDashboardData()" style="margin-top:12px">
            Tentar novamente
          </button>
        </div>
      `
      document.getElementById('forecastCard').innerHTML = '<h3>📈 Previsão de Faturamento</h3><p class="chart-empty">Aguardando configuração do banco.</p>'
      document.getElementById('chartCard').innerHTML = '<h3>📊 Dias da Semana</h3><p class="chart-empty">Aguardando configuração do banco.</p>'
    } else {
      document.getElementById('dashboardCards').innerHTML = `
        <div class="card card-error" style="grid-column:1/-1">
          <h3>Erro ao carregar dados</h3>
          <p>${err.message}</p>
          <button class="btn btn-outline btn-sm" onclick="loadDashboardData()">Tentar novamente</button>
        </div>
      `
    }
  }
}

async function fetchDayTotal(userId, date) {
  const { data, error } = await supabase
    .from('daily_closings')
    .select('calculated_total, manual_total, inconsistency')
    .eq('user_id', userId)
    .eq('date', date)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
    ? {
        total: Number(data.calculated_total),
        manualTotal: data.manual_total ? Number(data.manual_total) : null,
        inconsistency: Number(data.inconsistency),
      }
    : null
}

async function fetchPeriodData(userId, start, end) {
  const { data, error } = await supabase
    .from('daily_closings')
    .select('date, calculated_total')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)
    .order('date')

  if (error) throw error

  const total = data.reduce((sum, row) => sum + Number(row.calculated_total), 0)
  const count = data.length
  return { total, count, days: data }
}

async function fetchWeekdayVolume(userId, start, end) {
  const { data, error } = await supabase
    .from('closing_items')
    .select('date, amount, is_inconsistency')
    .eq('user_id', userId)
    .eq('is_inconsistency', false)
    .gte('date', start)
    .lte('date', end)

  if (error) throw error

  const volumeByDay = [0, 0, 0, 0, 0, 0, 0]

  data.forEach(row => {
    const d = new Date(row.date + 'T12:00:00')
    const dayIndex = d.getDay()
    volumeByDay[dayIndex] += Number(row.amount)
  })

  return volumeByDay
}

function updateCards(todayData, weekData, monthData) {
  const cardsGrid = document.getElementById('dashboardCards')

  const todayTotal = todayData ? todayData.total : 0
  const todayInconsistency = todayData ? todayData.inconsistency : 0

  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  cardsGrid.innerHTML = `
    <div class="card card-today">
      <div class="card-icon">📅</div>
      <div class="card-content">
        <h3>Faturamento Hoje</h3>
        <p class="card-value">${formatCurrency(todayTotal)}</p>
        ${todayInconsistency !== 0
          ? `<p class="card-note">Inconsistência: ${formatCurrency(todayInconsistency)}</p>`
          : '<p class="card-note">Nenhum fechamento hoje</p>'}
      </div>
    </div>

    <div class="card card-week">
      <div class="card-icon">📆</div>
      <div class="card-content">
        <h3>Esta Semana</h3>
        <p class="card-value">${formatCurrency(weekData.total)}</p>
        <p class="card-note">
          Média diária: ${formatCurrency(weekData.count > 0 ? weekData.total / weekData.count : 0)}
          ${weekData.count > 0 ? `(${weekData.count} dias)` : ''}
        </p>
      </div>
    </div>

    <div class="card card-month">
      <div class="card-icon">📊</div>
      <div class="card-content">
        <h3>Este Mês</h3>
        <p class="card-value">${formatCurrency(monthData.total)}</p>
        <p class="card-note">
          Média diária: ${formatCurrency(daysInMonth > 0 ? monthData.total / daysInMonth : 0)}
        </p>
        <p class="card-note">
          Média semanal: ${formatCurrency(daysInMonth > 0 ? (monthData.total / daysInMonth) * 7 : 0)}
        </p>
      </div>
    </div>

    <div class="card card-bestday">
      <div class="card-icon">🏆</div>
      <div class="card-content">
        <h3>Melhor Dia</h3>
        ${monthData.days.length > 0
          ? (() => {
              const best = monthData.days.reduce((max, d) =>
                Number(d.calculated_total) > Number(max.calculated_total) ? d : max
              )
              return `
                <p class="card-value">${formatCurrency(best.calculated_total)}</p>
                <p class="card-note">${formatDateBR(best.date)}</p>
              `
            })()
          : '<p class="card-note">Sem dados no mês</p>'}
      </div>
    </div>
  `
}

function getForecastMonthOptions() {
  const options = []
  for (let i = 0; i <= 11; i++) {
    const range = getMonthRangeByOffset(i)
    const label = i === 0 ? `Este mês (${getMonthName(range.year, range.month)})` : i === 1 ? `Mês anterior (${getMonthName(range.year, range.month)})` : getMonthName(range.year, range.month)
    options.push({ value: i, label })
  }
  return options
}

function updateForecast(data) {
  const card = document.getElementById('forecastCard')
  const monthOptions = getForecastMonthOptions()

  const selectsHtml = `
    <div class="forecast-selectors">
      <div class="forecast-selector">
        <label for="forecastBaseSelect">Mês base:</label>
        <select id="forecastBaseSelect" onchange="onForecastChange()">
          ${monthOptions.map(o => `
            <option value="${o.value}" ${Number(o.value) === forecastBaseOffset ? 'selected' : ''}>${o.label}</option>
          `).join('')}
        </select>
      </div>
      <div class="forecast-selector">
        <label for="forecastCompareSelect">Comparar com:</label>
        <select id="forecastCompareSelect" onchange="onForecastChange()">
          ${monthOptions.map(o => `
            <option value="${o.value}" ${Number(o.value) === forecastCompareOffset ? 'selected' : ''}>${o.label}</option>
          `).join('')}
        </select>
      </div>
    </div>
  `

  if (!data || data.trend === 'neutral') {
    card.innerHTML = `
      <div class="forecast-header">
        <h3>📈 Previsão de Faturamento</h3>
      </div>
      ${selectsHtml}
      <p class="forecast-neutral">${data ? data.message : 'Sem dados suficientes'}</p>
    `
    return
  }

  const trendClass = data.trend === 'up' ? 'forecast-up' : 'forecast-down'
  const trendIcon = data.trend === 'up' ? '📈' : '📉'

  card.innerHTML = `
    <div class="forecast-header">
      <h3>📈 Previsão de Faturamento</h3>
    </div>
    ${selectsHtml}
    <div class="forecast-details ${trendClass}">
      <p class="forecast-message">${trendIcon} ${data.message}</p>
      <div class="forecast-values">
        <div>
          <span class="forecast-label">${data.baseMonthName}</span>
          <span class="forecast-value">${formatCurrency(data.baseTotal)}</span>
        </div>
        <div>
          <span class="forecast-label">${data.compareMonthName}</span>
          <span class="forecast-value">${formatCurrency(data.compareTotal)}</span>
        </div>
        <div class="forecast-divider"></div>
        <div>
          <span class="forecast-label">Previsão: ${data.forecastMonthName}</span>
          <span class="forecast-value forecast-highlight">${formatCurrency(data.forecast)}</span>
        </div>
      </div>
    </div>
  `
}

async function onForecastChange() {
  const baseSelect = document.getElementById('forecastBaseSelect')
  const compareSelect = document.getElementById('forecastCompareSelect')
  if (!baseSelect || !compareSelect) return

  forecastBaseOffset = Number(baseSelect.value)
  forecastCompareOffset = Number(compareSelect.value)

  const card = document.getElementById('forecastCard')
  const monthOptions = getForecastMonthOptions()
  card.innerHTML = `
    <div class="forecast-header">
      <h3>📈 Previsão de Faturamento</h3>
    </div>
    <div class="forecast-selectors">
      <div class="forecast-selector">
        <label for="forecastBaseSelect">Mês base:</label>
        <select id="forecastBaseSelect" onchange="onForecastChange()">
          ${monthOptions.map(o => `
            <option value="${o.value}" ${Number(o.value) === forecastBaseOffset ? 'selected' : ''}>${o.label}</option>
          `).join('')}
        </select>
      </div>
      <div class="forecast-selector">
        <label for="forecastCompareSelect">Comparar com:</label>
        <select id="forecastCompareSelect" onchange="onForecastChange()">
          ${monthOptions.map(o => `
            <option value="${o.value}" ${Number(o.value) === forecastCompareOffset ? 'selected' : ''}>${o.label}</option>
          `).join('')}
        </select>
      </div>
    </div>
    <p class="forecast-loading">Calculando...</p>
  `

  const data = await calculateForecast(forecastBaseOffset, forecastCompareOffset)
  updateForecast(data)
}

function updateChart(weekdayData) {
  if (window._chartInstance) {
    window._chartInstance.destroy()
    window._chartInstance = null
  }

  if (!weekdayData || weekdayData.every(v => v === 0)) {
    document.getElementById('chartCard').innerHTML = `
      <h3>📊 Dias da Semana — Volume de Faturamento</h3>
      <p class="chart-empty">Sem dados suficientes para exibir o gráfico.</p>
    `
    return
  }

  const ctx = document.getElementById('weekdayChart').getContext('2d')

  window._chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [
        'Domingo', 'Segunda', 'Terça',
        'Quarta', 'Quinta', 'Sexta', 'Sábado',
      ],
      datasets: [{
        label: 'Faturamento',
        data: weekdayData,
        backgroundColor: [
          '#ef4444', '#f97316', '#eab308',
          '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899',
        ],
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => 'R$ ' + value.toFixed(0),
          },
          grid: {
            color: 'rgba(0,0,0,0.06)',
          },
        },
        x: {
          grid: { display: false },
        },
      },
    },
  })
}

async function handleLogout() {
  await signOut()
  navigate('/login')
}

async function fetchAllClosings(userId) {
  const { data, error } = await supabase
    .from('daily_closings')
    .select('date, calculated_total, manual_total, inconsistency')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(50)

  if (error) throw error
  return data || []
}

function updateClosingsTable(closings) {
  const section = document.getElementById('closingsTableSection')

  if (!closings.length) {
    section.innerHTML = `
      <div class="card">
        <h3>📋 Fechamentos Anteriores</h3>
        <p class="chart-empty">Nenhum fechamento registrado ainda.</p>
      </div>
    `
    return
  }

  const rows = closings.map(c => `
    <tr>
      <td>${formatDateBR(c.date)}</td>
      <td>${formatCurrency(Number(c.calculated_total))}</td>
      <td>${c.manual_total ? formatCurrency(Number(c.manual_total)) : '-'}</td>
      <td>${Number(c.inconsistency) !== 0 ? formatCurrency(Number(c.inconsistency)) : '-'}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-outline" onclick="editClosing('${c.date}')">✏️</button>
        <button class="btn btn-sm btn-outline btn-danger" onclick="deleteClosing('${c.date}')">🗑️</button>
      </td>
    </tr>
  `).join('')

  section.innerHTML = `
    <div class="card">
      <div class="table-header">
        <h3>📋 Fechamentos Anteriores</h3>
        <span class="table-count">${closings.length} registro(s)</span>
      </div>
      <div class="table-wrapper">
        <table class="closings-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Total Itens</th>
              <th>Faturamento</th>
              <th>Inconsistência</th>
              <th class="actions-cell">Ações</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `
}

function editClosing(date) {
  navigate('/closing?date=' + date)
}

async function deleteClosing(date) {
  if (!confirm(`Tem certeza que deseja excluir o fechamento de ${formatDateBR(date)}?`)) return

  const user = getUser()
  if (!user) return navigate('/login')

  try {
    const { error: itemsError } = await supabase
      .from('closing_items')
      .delete()
      .eq('user_id', user.id)
      .eq('date', date)

    if (itemsError) throw itemsError

    const { error: closingError } = await supabase
      .from('daily_closings')
      .delete()
      .eq('user_id', user.id)
      .eq('date', date)

    if (closingError) throw closingError

    loadDashboardData()
  } catch (err) {
    alert('Erro ao excluir: ' + err.message)
    loadDashboardData()
  }
}
