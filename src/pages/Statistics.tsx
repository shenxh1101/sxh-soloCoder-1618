import { useState, useMemo } from 'react'
import { BarChart3, TrendingUp, Calendar, Award, ShoppingBag } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Cell
} from 'recharts'
import useStore from '@/store/useStore'
import { formatCurrency, formatPercent } from '@/utils/calculations'
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth, eachDayOfInterval, subDays, subWeeks, subMonths } from 'date-fns'
import { zhCN } from 'date-fns/locale'

type TabType = 'week' | 'month'

export default function Statistics() {
  const { dailySales, purchaseRecords, ingredients, dishes, dishIngredients } = useStore()
  const [tab, setTab] = useState<TabType>('week')

  const now = new Date()

  const weekData = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

    return days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const daySales = dailySales.filter((s) => s.date === dateStr)
      const dayPurchases = purchaseRecords.filter((r) => r.date === dateStr)
      return {
        date: format(day, 'E', { locale: zhCN }),
        fullDate: dateStr,
        revenue: daySales.reduce((s, r) => s + r.revenue, 0),
        profit: daySales.reduce((s, r) => s + r.grossProfit, 0),
        purchaseTotal: dayPurchases.reduce((s, r) => s + r.totalPrice, 0),
        margin: daySales.reduce((s, r) => s + r.revenue, 0) > 0
          ? Math.round((daySales.reduce((s, r) => s + r.grossProfit, 0) / daySales.reduce((s, r) => s + r.revenue, 0)) * 1000) / 10
          : 0,
      }
    })
  }, [dailySales, purchaseRecords])

  const monthData = useMemo(() => {
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

    return days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const daySales = dailySales.filter((s) => s.date === dateStr)
      const dayPurchases = purchaseRecords.filter((r) => r.date === dateStr)
      return {
        date: format(day, 'd'),
        fullDate: dateStr,
        revenue: daySales.reduce((s, r) => s + r.revenue, 0),
        profit: daySales.reduce((s, r) => s + r.grossProfit, 0),
        purchaseTotal: dayPurchases.reduce((s, r) => s + r.totalPrice, 0),
        margin: daySales.reduce((s, r) => s + r.revenue, 0) > 0
          ? Math.round((daySales.reduce((s, r) => s + r.grossProfit, 0) / daySales.reduce((s, r) => s + r.revenue, 0)) * 1000) / 10
          : 0,
      }
    })
  }, [dailySales, purchaseRecords])

  const weekSummary = useMemo(() => {
    const totalRevenue = weekData.reduce((s, d) => s + d.revenue, 0)
    const totalProfit = weekData.reduce((s, d) => s + d.profit, 0)
    const totalPurchase = weekData.reduce((s, d) => s + d.purchaseTotal, 0)
    const bestDay = weekData.reduce((best, d) => d.revenue > best.revenue ? d : best, weekData[0])
    return { totalRevenue, totalProfit, totalPurchase, bestDay }
  }, [weekData])

  const monthSummary = useMemo(() => {
    const totalRevenue = monthData.reduce((s, d) => s + d.revenue, 0)
    const totalProfit = monthData.reduce((s, d) => s + d.profit, 0)
    const totalPurchase = monthData.reduce((s, d) => s + d.purchaseTotal, 0)
    return { totalRevenue, totalProfit, totalPurchase }
  }, [monthData])

  const dishRanking = useMemo(() => {
    const isWeek = tab === 'week'
    const startDate = isWeek ? format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') : format(startOfMonth(now), 'yyyy-MM-dd')
    const endDate = isWeek ? format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') : format(endOfMonth(now), 'yyyy-MM-dd')

    const filteredSales = dailySales.filter((s) => s.date >= startDate && s.date <= endDate)
    const dishMap = new Map<string, { name: string; category: string; totalPortions: number; totalRevenue: number; totalProfit: number }>()

    filteredSales.forEach((s) => {
      const existing = dishMap.get(s.dishId) || { name: s.dishName, category: s.category, totalPortions: 0, totalRevenue: 0, totalProfit: 0 }
      existing.totalPortions += s.portionsSold
      existing.totalRevenue += s.revenue
      existing.totalProfit += s.grossProfit
      dishMap.set(s.dishId, existing)
    })

    return Array.from(dishMap.entries())
      .map(([id, data]) => ({ id, ...data, margin: data.totalRevenue > 0 ? Math.round((data.totalProfit / data.totalRevenue) * 1000) / 10 : 0 }))
      .sort((a, b) => b.totalPortions - a.totalPortions)
  }, [dailySales, tab])

  const ingredientPriceTrend = useMemo(() => {
    const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(now, 6 - i), 'yyyy-MM-dd'))
    return ingredients.map((ing) => {
      const records = purchaseRecords
        .filter((r) => r.ingredientId === ing.id && last7.includes(r.date))
        .sort((a, b) => a.date.localeCompare(b.date))
      return { name: ing.name, currentPrice: ing.currentPrice, records }
    }).filter((i) => i.records.length > 0)
  }, [ingredients, purchaseRecords])

  const currentData = tab === 'week' ? weekData : monthData
  const currentSummary = tab === 'week' ? weekSummary : monthSummary
  const overallMargin = currentSummary.totalRevenue > 0
    ? Math.round((currentSummary.totalProfit / currentSummary.totalRevenue) * 1000) / 10
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">统计分析</h1>
          <p className="text-gray-400 text-sm mt-1">周报月报，掌握经营全貌</p>
        </div>
        <div className="flex bg-surface-800 rounded-lg border border-surface-700 p-1">
          <button
            onClick={() => setTab('week')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === 'week' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            周报
          </button>
          <button
            onClick={() => setTab('month')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === 'month' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            月报
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">{tab === 'week' ? '本周' : '本月'}营业额</span>
            <TrendingUp size={16} className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(currentSummary.totalRevenue)}</p>
        </div>
        <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">{tab === 'week' ? '本周' : '本月'}总利润</span>
            <BarChart3 size={16} className="text-profit" />
          </div>
          <p className={`text-2xl font-bold ${currentSummary.totalProfit >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(currentSummary.totalProfit)}</p>
        </div>
        <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">{tab === 'week' ? '本周' : '本月'}采购支出</span>
            <ShoppingBag size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(currentSummary.totalPurchase)}</p>
        </div>
        <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">综合毛利率</span>
            <Award size={16} className={overallMargin >= 50 ? 'text-profit' : 'text-loss'} />
          </div>
          <p className={`text-2xl font-bold ${overallMargin >= 50 ? 'text-profit' : 'text-loss'}`}>{formatPercent(overallMargin)}</p>
        </div>
      </div>

      {tab === 'week' && weekSummary.bestDay && (
        <div className="bg-surface-800 rounded-xl p-5 border border-profit/20">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={18} className="text-profit" />
            <span className="text-sm font-medium text-profit">最佳营业日</span>
          </div>
          <p className="text-xl font-serif font-bold text-white">{weekSummary.bestDay.date}</p>
          <p className="text-sm text-gray-400 mt-1">营业额 {formatCurrency(weekSummary.bestDay.revenue)} · 毛利 {formatCurrency(weekSummary.bestDay.profit)}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
          <h2 className="text-lg font-serif font-semibold text-white mb-4">毛利趋势</h2>
          {currentData.some((d) => d.margin > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={currentData}>
                <defs>
                  <linearGradient id="statMarginGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8652E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E8652E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E2E42" />
                <XAxis dataKey="date" stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 11 }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#262637', border: '1px solid #3A3A50', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: number) => [`${value}%`, '毛利率']}
                />
                <Area type="monotone" dataKey="margin" stroke="#E8652E" strokeWidth={2} fill="url(#statMarginGrad)" dot={{ fill: '#E8652E', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-500 text-sm">暂无数据</div>
          )}
        </div>

        <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
          <h2 className="text-lg font-serif font-semibold text-white mb-4">营业额 vs 采购支出</h2>
          {currentData.some((d) => d.revenue > 0 || d.purchaseTotal > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E2E42" />
                <XAxis dataKey="date" stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#262637', border: '1px solid #3A3A50', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name === 'revenue' ? '营业额' : '采购支出']}
                />
                <Bar dataKey="revenue" name="revenue" fill="#2ECC71" radius={[3, 3, 0, 0]} />
                <Bar dataKey="purchaseTotal" name="purchaseTotal" fill="#E8652E" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-500 text-sm">暂无数据</div>
          )}
        </div>
      </div>

      <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
        <h2 className="text-lg font-serif font-semibold text-white mb-4">
          {tab === 'week' ? '本周' : '本月'}菜品销量排行
        </h2>
        {dishRanking.length > 0 ? (
          <div className="space-y-2">
            {dishRanking.map((dish, index) => (
              <div key={dish.id} className="flex items-center gap-4 py-2.5 px-3 rounded-lg hover:bg-surface-700/50 transition-colors">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-brand-500 text-white' : 'bg-surface-600 text-gray-400'}`}>
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">{dish.name}</p>
                  <p className="text-xs text-gray-500">{dish.category}</p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-400">{dish.totalPortions}份</span>
                  <span className="text-gray-300">{formatCurrency(dish.totalRevenue)}</span>
                  <span className={`font-medium ${dish.margin >= 50 ? 'text-profit' : 'text-loss'}`}>{formatPercent(dish.margin)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500 text-sm">暂无销售数据</div>
        )}
      </div>

      {ingredientPriceTrend.length > 0 && (
        <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
          <h2 className="text-lg font-serif font-semibold text-white mb-4">食材进价追踪</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ingredientPriceTrend.map((item) => (
              <div key={item.name} className="bg-surface-700/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white font-medium">{item.name}</span>
                  <span className="text-sm text-brand-400 font-bold">{formatCurrency(item.currentPrice)}</span>
                </div>
                <div className="flex items-center gap-1">
                  {item.records.map((r, i) => (
                    <div key={i} className="flex-1 bg-surface-600 rounded-sm relative" style={{ height: '24px' }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-brand-500/60 rounded-sm"
                        style={{ height: `${Math.min((r.unitPrice / (item.currentPrice * 1.5)) * 100, 100)}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] text-gray-300">
                        {formatCurrency(r.unitPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
