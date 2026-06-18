import { useState, useMemo, useEffect } from 'react'
import { BarChart3, TrendingUp, Calendar, ShoppingBag, Download, FileText, PieChart, ChevronRight, AlertCircle, ChefHat, Heart, AlertTriangle, Star, TrendingDown, Zap } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts'
import useStore from '@/store/useStore'
import { formatCurrency, formatPercent, calculateCategoryStats, calculateDishHealth, type CategoryStats } from '@/utils/calculations'
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth, eachDayOfInterval, subDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { DishCategory, DishHealthCategory, DishHealthAnalysis } from '@/types'

type TabType = 'week' | 'month' | 'custom'

const CATEGORY_COLORS: Record<DishCategory, string> = {
  '小炒': '#E8652E',
  '盖饭': '#2ECC71',
  '面条': '#3498DB',
  '汤': '#9B59B6',
}

const HEALTH_CATEGORY_CONFIG: Record<DishHealthCategory, {
  label: string
  icon: any
  color: string
  bgColor: string
  borderColor: string
}> = {
  star: {
    label: '明星菜品',
    icon: Star,
    color: 'text-profit',
    bgColor: 'bg-profit/10',
    borderColor: 'border-profit/30',
  },
  problem: {
    label: '问题菜品',
    icon: AlertTriangle,
    color: 'text-loss',
    bgColor: 'bg-loss/10',
    borderColor: 'border-loss/30',
  },
  hidden: {
    label: '潜力菜品',
    icon: Zap,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  niche: {
    label: '待优化',
    icon: TrendingDown,
    color: 'text-gray-400',
    bgColor: 'bg-surface-700/50',
    borderColor: 'border-surface-600',
  },
  normal: {
    label: '表现正常',
    icon: Heart,
    color: 'text-gray-300',
    bgColor: 'bg-surface-700/30',
    borderColor: 'border-surface-600',
  },
}

export default function Statistics() {
  const { dailySales, purchaseRecords, ingredients, dishes, dishIngredients } = useStore()

  const [tab, setTab] = useState<TabType>('week')
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedCategory, setSelectedCategory] = useState<DishCategory | null>(null)
  const [dateWarning, setDateWarning] = useState<string | null>(null)

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
      if (customStart > customEnd) {
        startDate = customEnd
        endDate = customStart
      } else {
        startDate = customStart
        endDate = customEnd
      }
    }
    return { startDate, endDate }
  }, [tab, customStart, customEnd])

  const { startDate, endDate } = getDateRange

  useEffect(() => {
    if (tab === 'custom' && customStart && customEnd) {
      if (customStart > customEnd) {
        setDateWarning(`日期范围已自动纠正：${customEnd} 至 ${customStart}`)
      } else {
        setDateWarning(null)
      }
    } else {
      setDateWarning(null)
    }
  }, [customStart, customEnd, tab])

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
    const netProfit = totalProfit - totalPurchase
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
        netProfit: profit - purchaseTotal,
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

  const categoryStats = useMemo(
    () => calculateCategoryStats(filteredSales, dailySales),
    [filteredSales, dailySales]
  )

  const lookbackDays = useMemo(() => {
    const days = eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) })
    return Math.min(days.length, 30)
  }, [startDate, endDate])

  const dishHealth = useMemo(
    () => calculateDishHealth(filteredSales, dishes, dishIngredients, ingredients, lookbackDays),
    [filteredSales, dishes, dishIngredients, ingredients, lookbackDays]
  )

  const healthStats = useMemo(() => {
    const counts: Record<DishHealthCategory, number> = {
      star: 0,
      problem: 0,
      hidden: 0,
      niche: 0,
      normal: 0,
    }
    dishHealth.forEach((d) => {
      counts[d.category]++
    })
    return counts
  }, [dishHealth])

  const [healthFilter, setHealthFilter] = useState<DishHealthCategory | 'all'>('all')

  const filteredDishHealth = useMemo(() => {
    if (healthFilter === 'all') return dishHealth
    return dishHealth.filter((d) => d.category === healthFilter)
  }, [dishHealth, healthFilter])

  const pieChartData = useMemo(() => {
    return categoryStats.map((c) => ({
      name: c.category,
      value: c.totalRevenue,
      color: CATEGORY_COLORS[c.category],
    }))
  }, [categoryStats])

  const ingredientPriceTrend = useMemo(() => {
    const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(now, 6 - i), 'yyyy-MM-dd'))
    return ingredients.map((ing) => {
      const records = purchaseRecords
        .filter((r) => r.ingredientId === ing.id && last7.includes(r.date))
        .sort((a, b) => a.date.localeCompare(b.date))
      return { name: ing.name, currentPrice: ing.currentPrice, records }
    }).filter((i) => i.records.length > 0)
  }, [ingredients, purchaseRecords])

  const handleCustomStartChange = (value: string) => {
    setCustomStart(value)
  }

  const handleCustomEndChange = (value: string) => {
    setCustomEnd(value)
  }

  const handleExportReport = () => {
    const period = tab === 'week' ? '周报' : tab === 'month' ? '月报' : `${startDate}~${endDate}`
    const bestDish = dishRanking[0]
    const worstDish = dishRanking.length > 1 ? dishRanking[dishRanking.length - 1] : null

    let report = `═══════════════════════════════════════\n`
    report += `         味道管家 · 经营报表\n`
    report += `═══════════════════════════════════════\n\n`
    report += `报表类型：${period}\n`
    report += `日期范围：${startDate} 至 ${endDate}\n`
    report += `生成时间：${format(new Date(), 'yyyy-MM-dd HH:mm')}\n\n`
    report += `───────────── 经营总览 ─────────────\n\n`
    report += `总营业额：  ${formatCurrency(summary.totalRevenue)}\n`
    report += `总成本：    ${formatCurrency(summary.totalCost)}\n`
    report += `毛利：      ${formatCurrency(summary.totalProfit)}\n`
    report += `毛利率：    ${formatPercent(summary.overallMargin)}\n`
    report += `采购支出：  ${formatCurrency(summary.totalPurchase)}\n`
    report += `净利润：    ${formatCurrency(summary.netProfit)}\n`
    report += `售出总份数：${summary.totalPortions}份\n\n`

    report += `───────────── 菜品健康度 ─────────────\n\n`
    report += `明星菜品（高销量高毛利）：${healthStats.star}道\n`
    report += `问题菜品（高销量低毛利）：${healthStats.problem}道\n`
    report += `潜力菜品（低销量高毛利）：${healthStats.hidden}道\n`
    report += `待优化（低销量低毛利）：  ${healthStats.niche}道\n`
    report += `表现正常：                ${healthStats.normal}道\n\n`

    const problemDishes = dishHealth.filter((d) => d.category === 'problem')
    if (problemDishes.length > 0) {
      report += `⚠️  需要关注的菜品：\n`
      problemDishes.forEach((d) => {
        report += `  · ${d.dishName}：${d.suggestion}\n`
        report += `    ${d.detail}\n\n`
      })
    }

    const starDishes = dishHealth.filter((d) => d.category === 'star')
    if (starDishes.length > 0) {
      report += `🏆  重点推广菜品：\n`
      starDishes.forEach((d) => {
        report += `  · ${d.dishName}：${d.suggestion}\n`
        report += `    ${d.detail}\n\n`
      })
    }

    report += `───────────── 分类汇总 ─────────────\n\n`
    report += `分类    营业额      占比     毛利       毛利率   销量   占比\n`
    report += `──────────────────────────────────────\n`
    categoryStats.forEach((cat) => {
      const name = cat.category.padEnd(4, '　')
      const rev = formatCurrency(cat.totalRevenue).padStart(8, ' ')
      const revShare = formatPercent(cat.revenueShare).padStart(6, ' ')
      const profit = formatCurrency(cat.totalProfit).padStart(8, ' ')
      const margin = formatPercent(cat.margin).padStart(6, ' ')
      const portions = String(cat.totalPortions).padStart(4, ' ')
      const portShare = formatPercent(cat.portionsShare).padStart(6, ' ')
      report += `${name}  ${rev}  ${revShare}  ${profit}  ${margin}  ${portions}份  ${portShare}\n`
    })
    report += `\n`

    report += `───────────── 菜品排行 ─────────────\n\n`
    report += `排名  菜品          分类   销量   营业额      毛利       毛利率\n`
    report += `──────────────────────────────────────\n`
    dishRanking.forEach((dish, i) => {
      const rank = String(i + 1).padStart(2, ' ')
      const name = dish.name.padEnd(8, '　')
      const cat = dish.category.padEnd(4, '　')
      const portions = String(dish.totalPortions).padStart(3, ' ')
      const revenue = formatCurrency(dish.totalRevenue).padStart(8, ' ')
      const profit = formatCurrency(dish.totalProfit).padStart(8, ' ')
      const margin = formatPercent(dish.margin).padStart(6, ' ')
      report += `${rank}  ${name}  ${cat}  ${portions}份  ${revenue}  ${profit}  ${margin}\n`
    })

    if (bestDish) {
      report += `\n🏆 最赚菜品：${bestDish.name}（毛利 ${formatCurrency(bestDish.totalProfit)}）\n`
    }
    if (worstDish && worstDish.id !== bestDish?.id) {
      report += `⚠️ 最低毛利：${worstDish.name}（毛利率 ${formatPercent(worstDish.margin)}）\n`
    }

    report += `\n───────────── 每日明细 ─────────────\n\n`
    report += `日期        营业额      采购支出    毛利       净利润     毛利率\n`
    report += `──────────────────────────────────────\n`
    dailyData.filter(d => d.revenue > 0 || d.purchaseTotal > 0).forEach(d => {
      const date = d.fullDate.padEnd(10, ' ')
      const rev = formatCurrency(d.revenue).padStart(8, ' ')
      const purch = formatCurrency(d.purchaseTotal).padStart(8, ' ')
      const prof = formatCurrency(d.profit).padStart(8, ' ')
      const netProf = formatCurrency(d.netProfit).padStart(8, ' ')
      const marg = formatPercent(d.margin).padStart(6, ' ')
      report += `${date}  ${rev}  ${purch}  ${prof}  ${netProf}  ${marg}\n`
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

  const renderCategoryCard = (cat: CategoryStats) => {
    const isSelected = selectedCategory === cat.category
    return (
      <div
        key={cat.category}
        onClick={() => setSelectedCategory(isSelected ? null : cat.category)}
        className={`bg-surface-700/40 rounded-xl p-5 border cursor-pointer transition-all hover:bg-surface-700/60 ${
          isSelected ? 'border-brand-500' : 'border-surface-600'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.category] }} />
            <span className="text-sm font-semibold text-white">{cat.category}</span>
          </div>
          <ChevronRight size={16} className={`text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-gray-500">营业额</p>
            <p className="text-base font-bold text-white">{formatCurrency(cat.totalRevenue)}</p>
            <p className="text-xs text-gray-500 mt-0.5">占比 {formatPercent(cat.revenueShare)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">毛利</p>
            <p className="text-base font-bold text-profit">{formatCurrency(cat.totalProfit)}</p>
            <p className="text-xs text-gray-500 mt-0.5">毛利率 {formatPercent(cat.margin)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">销量</p>
            <p className="text-base font-bold text-white">{cat.totalPortions}份</p>
            <p className="text-xs text-gray-500 mt-0.5">占比 {formatPercent(cat.portionsShare)}</p>
          </div>
        </div>
      </div>
    )
  }

  const renderCategoryDishes = (cat: CategoryStats) => {
    if (selectedCategory !== cat.category) return null
    return (
      <div className="bg-surface-700/20 rounded-lg mt-2 p-3 space-y-2">
        <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-400 border-b border-surface-600/50">
          <span>菜品</span>
          <div className="flex gap-6">
            <span className="w-16 text-right">销量</span>
            <span className="w-20 text-right">营业额</span>
            <span className="w-20 text-right">毛利</span>
            <span className="w-16 text-right">毛利率</span>
          </div>
        </div>
        {cat.dishes.map((dish) => (
          <div key={dish.id} className="flex items-center justify-between px-3 py-2 hover:bg-surface-700/40 rounded-lg">
            <div className="flex items-center gap-2">
              <ChefHat size={14} className="text-gray-500" />
              <span className="text-sm text-white">{dish.name}</span>
            </div>
            <div className="flex gap-6 text-sm">
              <span className="w-16 text-right text-gray-300">{dish.totalPortions}份</span>
              <span className="w-20 text-right text-gray-300">{formatCurrency(dish.totalRevenue)}</span>
              <span className="w-20 text-right text-profit">{formatCurrency(dish.totalProfit)}</span>
              <span className={`w-16 text-right font-medium ${dish.margin >= 50 ? 'text-profit' : 'text-loss'}`}>
                {formatPercent(dish.margin)}
              </span>
            </div>
          </div>
        ))}
      </div>
    )
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
                onClick={() => { setTab(key); setSelectedCategory(null) }}
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
        <div className="bg-surface-800 rounded-xl p-4 border border-surface-700">
          <div className="flex items-center gap-4 flex-wrap">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-sm text-gray-400">日期范围：</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => handleCustomStartChange(e.target.value)}
              className="bg-surface-700 text-white px-3 py-1.5 rounded-lg border border-surface-600 text-sm focus:outline-none focus:border-brand-500"
            />
            <span className="text-gray-500">至</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => handleCustomEndChange(e.target.value)}
              className="bg-surface-700 text-white px-3 py-1.5 rounded-lg border border-surface-600 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          {dateWarning && (
            <div className="flex items-center gap-2 mt-3 text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              <span className="text-xs">{dateWarning}</span>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">当前查询：{startDate} 至 {endDate}</p>
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
          <p className="text-xs text-gray-500 mt-1">= 毛利 - 采购支出</p>
        </div>
        <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">总份数</span>
            <Calendar size={16} className="text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{summary.totalPortions}</p>
        </div>
      </div>

      {categoryStats.length > 0 && (
        <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif font-semibold text-white">分类经营分析</h2>
            <span className="text-xs text-gray-400">点击分类卡片查看明细</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="space-y-3">
              {categoryStats.map(renderCategoryCard)}
            </div>
            <div className="bg-surface-700/30 rounded-xl p-4 border border-surface-600">
              <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <PieChart size={14} className="text-brand-400" />
                营业额分布
              </h3>
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <RePieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#262637', border: '1px solid #3A3A50', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: number) => [formatCurrency(value), '营业额']}
                    />
                    <Legend
                      formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-gray-500 text-sm">暂无数据</div>
              )}
            </div>
          </div>
          {categoryStats.map(renderCategoryDishes)}
        </div>
      )}

      {/* 菜品健康度复盘 */}
      <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-serif font-semibold text-white flex items-center gap-2">
            <Heart size={18} className="text-brand-400" />
            菜品健康度复盘
          </h2>
          <span className="text-xs text-gray-400">基于 {lookbackDays} 天数据分析 · 辅助月底决策</span>
        </div>

        {/* 健康度分类统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {(['star', 'problem', 'hidden', 'niche', 'normal'] as DishHealthCategory[]).map((cat) => {
            const config = HEALTH_CATEGORY_CONFIG[cat]
            const Icon = config.icon
            const count = healthStats[cat]
            return (
              <button
                key={cat}
                onClick={() => setHealthFilter(healthFilter === cat ? 'all' : cat)}
                className={`p-3 rounded-lg border-2 transition-all ${healthFilter === cat ? `${config.bgColor} ${config.borderColor}` : 'bg-surface-700/30 border-transparent hover:bg-surface-700/50'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={16} className={config.color} />
                  <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                </div>
                <div className="text-2xl font-serif font-semibold text-white">{count}</div>
                <div className="text-xs text-gray-500">
                  {cat === 'star' && '高销量·高毛利'}
                  {cat === 'problem' && '高销量·低毛利'}
                  {cat === 'hidden' && '低销量·高毛利'}
                  {cat === 'niche' && '低销量·低毛利'}
                  {cat === 'normal' && '表现正常'}
                </div>
              </button>
            )
          })}
        </div>

        {/* 健康度明细列表 */}
        <div className="space-y-3">
          {filteredDishHealth.length > 0 ? (
            filteredDishHealth.map((dish) => {
              const config = HEALTH_CATEGORY_CONFIG[dish.category]
              const Icon = config.icon
              return (
                <div
                  key={dish.dishId}
                  className={`${config.bgColor} ${config.borderColor} border rounded-xl p-4`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={16} className={config.color} />
                        <h4 className="font-serif font-semibold text-white">{dish.dishName}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color} border ${config.borderColor}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3 text-sm">
                        <div>
                          <div className="text-gray-500">总销量</div>
                          <div className="text-white font-medium">{dish.totalPortions} 份</div>
                        </div>
                        <div>
                          <div className="text-gray-500">日均销量</div>
                          <div className="text-white font-medium">{dish.avgDailyPortions.toFixed(1)} 份</div>
                        </div>
                        <div>
                          <div className="text-gray-500">营业额</div>
                          <div className="text-white font-medium">{formatCurrency(dish.totalRevenue)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">毛利率</div>
                          <div className={`font-medium ${dish.margin >= 50 ? 'text-profit' : dish.margin >= 35 ? 'text-white' : 'text-loss'}`}>
                            {formatPercent(dish.margin)}
                          </div>
                        </div>
                      </div>
                      <div className="bg-surface-900/50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <div className="text-brand-400 font-medium text-sm">💡 建议：</div>
                          <div className="text-gray-300 text-sm flex-1">
                            <p className="mb-1">{dish.suggestion}</p>
                            <p className="text-gray-500 text-xs">{dish.detail}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              {healthFilter === 'all' ? '暂无菜品数据' : `当前筛选条件下无${HEALTH_CATEGORY_CONFIG[healthFilter as DishHealthCategory].label}`}
            </div>
          )}
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
                  formatter={(value: number, name: string) => [formatCurrency(value), name === 'revenue' ? '营业额' : name === 'purchaseTotal' ? '采购支出' : '净利润']}
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
