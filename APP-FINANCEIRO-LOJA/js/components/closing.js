// =============================================================================
// CLOSING — Formulário de fechamento do dia (novo + edição)
// =============================================================================

let closingEditDate = null

async function renderClosing(editDate) {
  closingEditDate = editDate || null
  const isEdit = !!editDate

  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="page-header">
      <button class="btn btn-outline" onclick="navigate('/dashboard')">
        ← Voltar
      </button>
      <h1>${isEdit ? 'Editar Fechamento' : 'Novo Fechamento do Dia'}</h1>
    </div>

    <div class="closing-container">
      <div class="closing-date">
        <label for="closingDate"><strong>Data:</strong></label>
        <input type="date" id="closingDate" value="${editDate || todayStr()}" class="closing-date-input" onchange="updateDateDisplay()">
        <span class="closing-date-text" id="dateDisplay">${formatDateBR(editDate || todayStr())}</span>
      </div>

      <div class="closing-items">
        <h3>Itens do Fechamento</h3>
        <div id="itemsList">
          <div class="item-row">
            <input type="text" class="item-name" placeholder="Nome do item (ex: Salgados)">
            <input type="number" class="item-value" placeholder="Valor R$" step="0.01">
            <button class="btn-remove-item" onclick="removeItem(this)" title="Remover item">×</button>
          </div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="addItem()">
          + Adicionar Item
        </button>
      </div>

      <div class="closing-totals">
        <div class="total-row">
          <span>Soma dos itens:</span>
          <span id="calculatedTotal">R$ 0,00</span>
        </div>
        <div class="form-group">
          <label for="manualTotal">Faturamento total (opcional — digite se quiser definir manualmente)</label>
          <input type="number" id="manualTotal" placeholder="Deixe vazio para usar a soma dos itens" step="0.01">
        </div>
        <div id="inconsistencyInfo" class="inconsistency-info" style="display:none;"></div>
      </div>

      <div id="closingError" class="login-error"></div>

      <div class="closing-actions">
        <button class="btn btn-outline" onclick="navigate('/dashboard')">Cancelar</button>
        <button class="btn btn-primary" id="saveClosingBtn" onclick="saveClosing()">
          ${isEdit ? 'Atualizar Fechamento' : 'Salvar Fechamento'}
        </button>
      </div>
    </div>
  `

  document.getElementById('manualTotal').addEventListener('input', calculateInconsistency)
  document.querySelectorAll('.item-value').forEach(el => {
    el.addEventListener('input', calculateInconsistency)
  })

  if (isEdit) {
    await loadClosingForEdit(editDate)
  }
}

async function loadClosingForEdit(date) {
  const user = getUser()
  if (!user) return navigate('/login')

  try {
    const { data: items, error: itemsError } = await supabase
      .from('closing_items')
      .select('item_name, amount, is_inconsistency')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at')

    if (itemsError) throw itemsError

    const { data: closing, error: closingError } = await supabase
      .from('daily_closings')
      .select('manual_total, calculated_total, inconsistency')
      .eq('user_id', user.id)
      .eq('date', date)
      .single()

    if (closingError && closingError.code !== 'PGRST116') throw closingError

    const list = document.getElementById('itemsList')
    list.innerHTML = ''

    if (items && items.length > 0) {
      items.forEach(item => {
        const row = document.createElement('div')
        row.className = 'item-row'
        row.innerHTML = `
          <input type="text" class="item-name" value="${escapeHtml(item.item_name)}" placeholder="Nome do item">
          <input type="number" class="item-value" value="${Number(item.amount).toFixed(2)}" step="0.01">
          <button class="btn-remove-item" onclick="removeItem(this)" title="Remover item">×</button>
        `
        list.appendChild(row)
        row.querySelector('.item-value').addEventListener('input', calculateInconsistency)
      })
    } else {
      list.innerHTML = `
        <div class="item-row">
          <input type="text" class="item-name" placeholder="Nome do item (ex: Salgados)">
          <input type="number" class="item-value" placeholder="Valor R$" step="0.01">
          <button class="btn-remove-item" onclick="removeItem(this)" title="Remover item">×</button>
        </div>
      `
    }

    if (closing && closing.manual_total) {
      document.getElementById('manualTotal').value = Number(closing.manual_total).toFixed(2)
    }

    calculateInconsistency()
  } catch (err) {
    document.getElementById('closingError').textContent = 'Erro ao carregar dados: ' + err.message
  }
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function addItem() {
  const list = document.getElementById('itemsList')
  const row = document.createElement('div')
  row.className = 'item-row'
  row.innerHTML = `
    <input type="text" class="item-name" placeholder="Nome do item (ex: Salgados)">
    <input type="number" class="item-value" placeholder="Valor R$" step="0.01">
    <button class="btn-remove-item" onclick="removeItem(this)" title="Remover item">×</button>
  `
  list.appendChild(row)
  row.querySelector('.item-value').addEventListener('input', calculateInconsistency)
}

function removeItem(btn) {
  const row = btn.closest('.item-row')
  if (document.querySelectorAll('.item-row').length <= 1) return
  row.remove()
  calculateInconsistency()
}

function calculateInconsistency() {
  const values = document.querySelectorAll('.item-value')
  let sum = 0
  values.forEach(input => {
    const v = parseFloat(input.value) || 0
    sum += v
  })

  document.getElementById('calculatedTotal').textContent = formatCurrency(sum)

  const manualInput = document.getElementById('manualTotal')
  const manual = parseFloat(manualInput.value)
  const infoEl = document.getElementById('inconsistencyInfo')

  if (manualInput.value && !isNaN(manual)) {
    const diff = manual - sum
    if (Math.abs(diff) > 0.01) {
      infoEl.style.display = 'block'
      infoEl.innerHTML = `
        ⚠️ Diferença detectada de <strong>${formatCurrency(Math.abs(diff))}</strong>.<br>
        Será adicionado um item <strong>"Inconsistência de ${formatCurrency(Math.abs(diff))}"</strong>
        e o faturamento registrado será <strong>${formatCurrency(manual)}</strong>.
      `
    } else {
      infoEl.style.display = 'none'
    }
  } else {
    infoEl.style.display = 'none'
  }
}

async function saveClosing() {
  const user = getUser()
  if (!user) {
    navigate('/login')
    return
  }

  const btn = document.getElementById('saveClosingBtn')
  btn.disabled = true
  btn.textContent = 'Salvando...'

  const errorEl = document.getElementById('closingError')
  errorEl.textContent = ''

  const itemNames = document.querySelectorAll('.item-name')
  const itemValues = document.querySelectorAll('.item-value')
  const manualInput = document.getElementById('manualTotal')
  const manual = parseFloat(manualInput.value)

  let sum = 0
  const items = []

  for (let i = 0; i < itemNames.length; i++) {
    const name = itemNames[i].value.trim()
    const value = parseFloat(itemValues[i].value) || 0
    if (name && value !== 0) {
      sum += value
      items.push({ name, value })
    }
  }

  if (items.length === 0) {
    errorEl.textContent = 'Adicione pelo menos um item com valor válido.'
    btn.disabled = false
    btn.textContent = closingEditDate ? 'Atualizar Fechamento' : 'Salvar Fechamento'
    return
  }

  const date = document.getElementById('closingDate').value || todayStr()
  let finalTotal = sum
  let inconsistency = 0
  const hasManual = manualInput.value && !isNaN(manual)

  if (hasManual) {
    finalTotal = manual
    inconsistency = manual - sum
  }

  const closingItems = items.map(item => ({
    user_id: user.id,
    date,
    item_name: item.name,
    amount: item.value,
    is_inconsistency: false,
  }))

  if (hasManual && Math.abs(inconsistency) > 0.01) {
    closingItems.push({
      user_id: user.id,
      date,
      item_name: `Inconsistência de ${formatCurrency(Math.abs(inconsistency))}`,
      amount: Math.abs(inconsistency),
      is_inconsistency: true,
    })
  }

  const dailyClosing = {
    user_id: user.id,
    date,
    manual_total: hasManual ? manual : null,
    calculated_total: sum,
    inconsistency: hasManual ? inconsistency : 0,
  }

  try {
    if (closingEditDate) {
      const { error: delItemsError } = await supabase
        .from('closing_items')
        .delete()
        .eq('user_id', user.id)
        .eq('date', closingEditDate)

      if (delItemsError) throw delItemsError

      if (closingEditDate !== date) {
        const { error: delClosingError } = await supabase
          .from('daily_closings')
          .delete()
          .eq('user_id', user.id)
          .eq('date', closingEditDate)

        if (delClosingError) throw delClosingError

        const { error: delNewItemsError } = await supabase
          .from('closing_items')
          .delete()
          .eq('user_id', user.id)
          .eq('date', date)

        if (delNewItemsError) throw delNewItemsError
      }
    }

    const { error: itemsError } = await supabase
      .from('closing_items')
      .insert(closingItems)

    if (itemsError) throw itemsError

    const { error: closingError } = await supabase
      .from('daily_closings')
      .upsert(dailyClosing, { onConflict: 'user_id, date' })

    if (closingError) throw closingError

    navigate('/dashboard')
  } catch (err) {
    errorEl.textContent = 'Erro ao salvar: ' + err.message
    btn.disabled = false
    btn.textContent = closingEditDate ? 'Atualizar Fechamento' : 'Salvar Fechamento'
  }
}

function updateDateDisplay() {
  const input = document.getElementById('closingDate')
  const display = document.getElementById('dateDisplay')
  if (input && display) {
    const [y, m, d] = input.value.split('-')
    display.textContent = `${d}/${m}/${y}`
  }
}
