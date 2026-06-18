import { useState, useMemo } from 'react'
import { BarChart3, TrendingUp, Calendar, ShoppingBag, Download, FileText } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart
} from 'recharts'
import useStore from '@/store/useStore'
import { formatCurrency, formatPercent } from '@/utils/calculations'
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth, eachDayOfInterval, subDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'

type TabType = 'week' | 'month' | 'custom'

export default function Statistics() {
  const { dailySales, purchaseRecords, ingredients, dishes, dishIngredients } = useStore()

  const [tab, setTab] = useState<TabType>('week')
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'))

  const now = new Date()

  const getDateRange = useMemo(() => {
    let startDate: string
    let endDate: string
    if (tab === 'week') {
      startDate = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      endDate = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    } else if (tab === 'month') {
      startDate = format(startOfMonth(now), 'yyyy-MM-dd')
      endDate = format(endOfMonth(now), 'yyyy-MM-dd')
    } else {
      startDate = customStart
      endDate = customEnd
    }
    return { startDate, endDate }
  }, [tab, customStart, customEnd])

  const { startDate, endDate } = getDateRange

  const filteredSales = useMemo(
    () => dailySales.filter((s) => s.date >= startDate && s.date <= endDate),
    [dailySales, startDate, endDate]
  )

  const filteredPurchases = useMemo(
    () => purchaseRecords.filter((r) => r.date >= startDate && r.date <= endDate),
    [purchaseRecords, startDate, endDate]
  )

  const summary = useMemo(() => {
    const totalRevenue = filteredSales.reduce((s, r) => s + r.revenue, 0)
    const totalCost = filteredSales.reduce((s, r) => s + r.totalCost, 0)
    const totalProfit = filteredSales.reduce((s, r) => s + r.grossProfit, 0)
    const totalPurchase = filteredPurchases.reduce((s, r) => s + r.totalPrice, 0)
    const netProfit = totalProfit - 0
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    const totalPortions = filteredSales.reduce((s, r) => s + r.portionsSold, 0)
    return { totalRevenue, totalCost, totalProfit, totalPurchase, netProfit, overallMargin, totalPortions }
  }, [filteredSales, filteredPurchases])

  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) })
    return days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const daySales = filteredSales.filter((s) => s.date === dateStr)
      const dayPurchases = filteredPurchases.filter((r) => r.date === dateStr)
      const revenue = daySales.reduce((s, r) => s + r.revenue, 0)
      const profit = daySales.reduce((s, r) => s + r.grossProfit, 0)
      const purchaseTotal = dayPurchases.reduce((s, r) => s + r.totalPrice, 0)
      const margin = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0
      return {
        date: format(day, 'MM/dd'),
        fullDate: dateStr,
        revenue,
        profit,
        purchaseTotal,
        margin,
        netProfit: profit,
      }
    })
  }, [filteredSales, filteredPurchases, startDate, endDate])

  const dishRanking = useMemo(() => {
    const dishMap = new Map<string, { name: string; category: string; totalPortions: number; totalRevenue: number; totalProfit: number; totalCost: number }>()
    filteredSales.forEach((s) => {
      const existing = dishMap.get(s.dishId) || { name: s.dishName, category: s.category, totalPortions: 0, totalRevenue: 0, totalProfit: 0, totalCost: 0 }
      existing.totalPortions += s.portionsSold
      existing.totalRevenue += s.revenue
      existing.totalProfit += s.grossProfit
      existing.totalCost += s.totalCost
      dishMap.set(s.dishId, existing)
    })
    return Array.from(dishMap.entries())
      .map(([id, data]) => ({
        id,
        ...data,
        margin: data.totalRevenue > 0 ? Math.round((data.totalProfit / data.totalRevenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.totalProfit - a.totalProfit)
  }, [filteredSales])

  const ingredientPriceTrend = useMemo(() => {
    const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(now, 6 - i), 'yyyy-MM-dd'))
    return ingredients.map((ing) => {
      const records = purchaseRecords
        .filter((r) => r.ingredientId === ing.id && last7.includes(r.date))
        .sort((a, b) => a.date.localeCompare(b.date))
      return { name: ing.name, currentPrice: ing.currentPrice, records }
    }).filter((i) => i.records.length > 0)
  }, [ingredients, purchaseRecords])

  const handleExportReport = () => {
    const period = tab === 'week' ? '周报' : tab === 'month' ? '月报' : `${startDate}~${endDate}`
    const bestDish = dishRanking[0]
    const worstDish = dishRanking.length > 1 ? dishRanking[dishRanking.length - 1] : null

    let report = `═══════════════════════════════════════\n`
    report += `         味道管家 · 经营报表\n`
    report += `═══════════════════════════════════════\n\n`
    report += `报表类型：${period}\n`
    report += `生成时间：${format(new Date(), 'yyyy-MM-dd HH:mm')}\n\n`
    report += `───────────── 经营总览 ─────────────\n\n`
    report += `总营业额：  ${formatCurrency(summary.totalRevenue)}\n`
    report += `总成本：    ${formatCurrency(summary.totalCost)}\n`
    report += `毛利：      ${formatCurrency(summary.totalProfit)}\n`
    report += `毛利率：    ${formatPercent(summary.overallMargin)}\n`
    report += `采购支出：  ${formatCurrency(summary.totalPurchase)}\n`
    report += `净利润：    ${formatCurrency(summary.netProfit)}\n`
    report += `售出总份数：${summary.totalPortions}份\n\n`

    report += `───────────── 菜品排行 ─────────────\n\n`
    report += `排名  菜品          销量   营业额      毛利       毛利率\n`
    report += `──────────────────────────────────────\n`
    dishRanking.forEach((dish, i) => {
      const rank = String(i + 1).padStart(2, ' ')
      const name = dish.name.padEnd(8, '　')
      const portions = String(dish.totalPortions).padStart(3, ' ')
      const revenue = formatCurrency(dish.totalRevenue).padStart(8, ' ')
      const profit = formatCurrency(dish.totalProfit).padStart(8, ' ')
      const margin = formatPercent(dish.margin).padStart(6, ' ')
      report += `${rank}  ${name}  ${portions}份  ${revenue}  ${profit}  ${margin}\n`
    })

    if (bestDish) {
      report += `\n🏆 最赚菜品：${bestDish.name}（毛利 ${formatCurrency(bestDish.totalProfit)}）\n`
    }
    if (worstDish && worstDish.id !== bestDish?.id) {
      report += `⚠️ 最低毛利：${worstDish.name}（毛利率 ${formatPercent(worstDish.margin)}）\n`
    }

    report += `\n───────────── 每日明细 ─────────────\n\n`
    report += `日期        营业额      采购支出    毛利       毛利率\n`
    report += `──────────────────────────────────────\n`
    dailyData.filter(d => d.revenue > 0 || d.purchaseTotal > 0).forEach(d => {
      const date = d.fullDate.padEnd(10, ' ')
      const rev = formatCurrency(d.revenue).padStart(8, ' ')
      const purch = formatCurrency(d.purchaseTotal).padStart(8, ' ')
      const prof = formatCurrency(d.profit).padStart(8, ' ')
      const marg = formatPercent(d.margin).padStart(6, ' ')
      report += `${date}  ${rev}  ${purch}  ${prof}  ${marg}\n`
    })

    report += `\n═══════════════════════════════════════\n`
    report += `        报表由「味道管家」自动生成\n`
    report += `═══════════════════════════════════════\n`

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `经营报表_${period}_${format(new Date(), 'yyyyMMdd')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">统计分析</h1>
          <p className="text-gray-400 text-sm mt-1">经营复盘，数据驱动决策</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-800 rounded-lg border border-surface-700 p-1">
            {([['week', '周报'], ['month', '月报'], ['custom', '自定义']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${tab === key ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg text-sm font-medium transition-all border border-surface-600"
          >
            <Download size={16} />
            导出报表
          </button>
        </div>
      </div>

      {tab === 'custom' && (
        <div className="bg-surface-800 rounded-xl p-4 border border-surface-700 flex items-center gap-4 flex-wrap">
          <Calendar size={16} className="text-gray-400" />
          <span className="text-sm text-gray-400">日期范围：</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="bg-surface-700 text-white px-3 py-1.5 rounded-lg border border-surface-600 text-sm focus:outline-none focus:border-brand-500"
          />
          <span className="text-gray-500">至</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="bg-surface-700 text-white px-3 py-1.5 rounded-lg border border-surface-600 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">营业额</span>
            <TrendingUp size={16} className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalRevenue)}</p>
        </div>
        <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">毛利</span>
            <BarChart3 size={16} className="text-profit" />
          </div>
          <p className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(summary.totalProfit)}</p>
        </div>
        <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">毛利率</span>
            <TrendingUp size={16} className={summary.overallMargin >= 50 ? 'text-profit' : 'text-loss'} />
          </div>
          <p className={`text-2xl font-bold ${summary.overallMargin >= 50 ? 'text-profit' : 'text-loss'}`}>{formatPercent(summary.overallMargin)}</p>
        </div>
        <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">采购支出</span>
            <ShoppingBag size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalPurchase)}</p>
        </div>
        <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">净利润</span>
            <FileText size={16} className={summary.netProfit >= 0 ? 'text-profit' : 'text-loss'} />
          </div>
          <p className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(summary.netProfit)}</p>
        </div>
        <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">总份数</span>
            <Calendar size={16} className="text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{summary.totalPortions}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
          <h2 className="text-lg font-serif font-semibold text-white mb-4">毛利趋势</h2>
          {dailyData.some((d) => d.margin > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyData}>
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
          {dailyData.some((d) => d.revenue > 0 || d.purchaseTotal > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyData}>
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
        <h2 className="text-lg font-serif font-semibold text-white mb-4">菜品利润排行</h2>
        {dishRanking.length > 0 ? (
          <div className="space-y-2">
            {dishRanking.map((dish, index) => (
              <div key={dish.id} className="flex items-center gap-4 py-2.5 px-3 rounded-lg hover:bg-surface-700/50 transition-colors">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-brand-500 text-white' : 'bg-surface-600 text-gray-400'}`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{dish.name}</p>
                  <p className="text-xs text-gray-500">{dish.category} · {dish.totalPortions}份</p>
                </div>
                <div className="flex items-center gap-5 text-sm">
                  <div className="text-right min-w-[70px]">
                    <p className="text-xs text-gray-500">营业额</p>
                    <p className="text-gray-300">{formatCurrency(dish.totalRevenue)}</p>
                  </div>
                  <div className="text-right min-w-[70px]">
                    <p className="text-xs text-gray-500">毛利</p>
                    <p className={dish.totalProfit >= 0 ? 'text-profit' : 'text-loss'}>{formatCurrency(dish.totalProfit)}</p>
                  </div>
                  <div className="text-right min-w-[60px]">
                    <p className="text-xs text-gray-500">毛利率</p>
                    <p className={`font-medium ${dish.margin >= 50 ? 'text-profit' : 'text-loss'}`}>{formatPercent(dish.margin)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500 text-sm">所选日期范围内暂无销售数据</div>
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
