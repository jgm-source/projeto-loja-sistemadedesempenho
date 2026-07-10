// =============================================================================
// FORECAST — Cálculo de previsão de faturamento futuro
// =============================================================================

async function calculateForecast(baseOffset, compareOffset) {
  const user = getUser()
  if (!user) return null

  const baseOff = baseOffset !== undefined ? baseOffset : 1
  const compOff = compareOffset !== undefined ? compareOffset : 0

  const base = getMonthRangeByOffset(baseOff)
  const compare = getMonthRangeByOffset(compOff)

  const [baseData, compareData] = await Promise.all([
    fetchMonthTotal(user.id, base.start, base.end),
    fetchMonthTotal(user.id, compare.start, compare.end),
  ])

  const baseTotal = baseData || 0
  const compareTotal = compareData || 0

  if (baseTotal === 0 || compareTotal === 0) {
    return {
      baseTotal,
      compareTotal,
      baseMonthName: getMonthName(base.year, base.month),
      compareMonthName: getMonthName(compare.year, compare.month),
      forecastMonthName: getNextMonthName(compare.year, compare.month),
      growthRate: 0,
      forecast: 0,
      trend: 'neutral',
      message: 'Dados insuficientes para calcular previsão.',
    }
  }

  const growthRate = (compareTotal - baseTotal) / baseTotal
  const forecast = compareTotal * (1 + growthRate)
  const trend = growthRate >= 0 ? 'up' : 'down'

  return {
    baseTotal,
    compareTotal,
    baseMonthName: getMonthName(base.year, base.month),
    compareMonthName: getMonthName(compare.year, compare.month),
    forecastMonthName: getNextMonthName(compare.year, compare.month),
    growthRate,
    forecast,
    trend,
    message:
      trend === 'up'
        ? `Crescimento de ${(growthRate * 100).toFixed(1)}% de ${getMonthName(base.year, base.month)} para ${getMonthName(compare.year, compare.month)}`
        : `Queda de ${(Math.abs(growthRate) * 100).toFixed(1)}% de ${getMonthName(base.year, base.month)} para ${getMonthName(compare.year, compare.month)}`,
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
