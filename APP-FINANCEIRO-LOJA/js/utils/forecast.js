// =============================================================================
// FORECAST — Cálculo de previsão de faturamento futuro
// =============================================================================

async function calculateForecast() {
  const user = getUser()
  if (!user) return null

  const current = getMonthRange()
  const previous = getPreviousMonthRange()

  const [currentData, previousData] = await Promise.all([
    fetchMonthTotal(user.id, current.start, current.end),
    fetchMonthTotal(user.id, previous.start, previous.end),
  ])

  const currentTotal = currentData || 0
  const previousTotal = previousData || 0

  if (previousTotal === 0 || currentTotal === 0) {
    return {
      currentTotal,
      previousTotal,
      growthRate: 0,
      forecast: 0,
      trend: 'neutral',
      message: 'Dados insuficientes para calcular previsão.',
    }
  }

  const growthRate = (currentTotal - previousTotal) / previousTotal
  const forecast = currentTotal * (1 + growthRate)
  const trend = growthRate >= 0 ? 'up' : 'down'

  return {
    currentTotal,
    previousTotal,
    growthRate,
    forecast,
    trend,
    message:
      trend === 'up'
        ? `Crescimento de ${(growthRate * 100).toFixed(1)}% em relação ao mês anterior`
        : `Queda de ${(Math.abs(growthRate) * 100).toFixed(1)}% em relação ao mês anterior`,
  }
}

async function fetchMonthTotal(userId, startDate, endDate) {
  const { data, error } = await supabase
    .from('daily_closings')
    .select('calculated_total')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) {
    console.error('Erro ao buscar total do mês:', error)
    return null
  }

  return data.reduce((sum, row) => sum + Number(row.calculated_total), 0)
}
