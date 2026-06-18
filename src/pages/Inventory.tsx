import { useState, useMemo } from 'react'
import { Package, AlertTriangle, TrendingDown, ChefHat, ShoppingCart, Clock, AlertCircle, ChevronDown, ChevronUp, DollarSign, Flame } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import useStore from '@/store/useStore'
import { calculateIngredientStocks, formatCurrency, calculateRestockSuggestions } from '@/utils/calculations'
import type { RestockSuggestion } from '@/types'

const PRIORITY_COLORS = {
  high: { bg: 'bg-loss/20', text: 'text-loss', border: 'border-loss/30', label: '紧急' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: '注意' },
  low: { bg: 'bg-profit/10', text: 'text-gray-400', border: 'border-surface-600', label: '充足' },
}

const DISH_HEALTH_COLORS: Record<string, string> = {
  star: 'text-profit',
  problem: 'text-loss',
  hidden: 'text-blue-400',
  niche: 'text-gray-400',
  normal: 'text-gray-300',
}

export default function Inventory() {
  const { ingredients, purchaseRecords, dailySales, dishes, dishIngredients } = useStore()

  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all')
  const [activeTab, setActiveTab] = useState<'stock' | 'restock' | 'priority'>('stock')
  const [lookbackDays, setLookbackDays] = useState<3 | 7 | 14>(7)
  const [expandedIngredient, setExpandedIngredient] = useState<string | null>(null)

  const stocks = useMemo(
    () => calculateIngredientStocks(ingredients, purchaseRecords, dailySales, dishIngredients, dishes),
    [ingredients, purchaseRecords, dailySales, dishIngredients, dishes]
  )

  const restockSuggestions = useMemo(
    () => calculateRestockSuggestions(ingredients, purchaseRecords, dailySales, dishIngredients, dishes, lookbackDays),
    [ingredients, purchaseRecords, dailySales, dishIngredients, dishes, lookbackDays]
  )

  const sortedRestockSuggestions = useMemo(() => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return [...restockSuggestions]
      .filter((s) => s.priority !== 'low' || s.suggestedPurchase > 0)
      .sort((a, b) => {
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        return a.daysRemaining - b.daysRemaining
      })
  }, [restockSuggestions])

  const purchasePriorityList = useMemo(() => {
    return sortedRestockSuggestions
      .filter((s) => s.suggestedPurchase > 0)
      .map((s) => ({
        ...s,
        affectsHotDishes: s.affectedHighSalesDishes.length > 0,
      }))
      .sort((a, b) => {
        if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority]
        if (a.affectsHotDishes !== b.affectsHotDishes) return a.affectsHotDishes ? -1 : 1
        return b.estimatedCost - a.estimatedCost
      })
  }, [sortedRestockSuggestions])

  const totalEstimatedCost = useMemo(
    () => purchasePriorityList.reduce((sum, s) => sum + s.estimatedCost, 0),
    [purchasePriorityList]
  )

  const lowStockItems = stocks.filter((s) => s.stock > 0 && s.stock <= s.lowThreshold)
  const outOfStockItems = stocks.filter((s) => s.stock <= 0)
  const alertCount = lowStockItems.length + outOfStockItems.length

  const filteredStocks = stocks.filter((s) => {
    if (filter === 'low') return s.stock > 0 && s.stock <= s.lowThreshold
    if (filter === 'out') return s.stock <= 0
    return true
  })

  const affectedDishNames = new Set<string>()
  outOfStockItems.forEach((item) => {
    item.affectedDishes.forEach((name) => affectedDishNames.add(name))
  })

  const highPriorityRestock = restockSuggestions.filter((s) => s.priority === 'high')
  const affectedHighSalesDishes = new Set<string>()
  highPriorityRestock.forEach((item) => {
    item.affectedHighSalesDishes.forEach((name) => affectedHighSalesDishes.add(name))
  })

  const chartData = stocks
    .filter((s) => s.totalPurchased > 0)
    .sort((a, b) => (a.stock / a.totalPurchased) - (b.stock / b.totalPurchased))
    .slice(0, 12)
    .map((s) => ({
      name: s.ingredientName,
      stock: Math.round(s.stock * 100) / 100,
      consumed: Math.round(s.totalConsumed * 100) / 100,
      ratio: s.totalPurchased > 0 ? Math.round((s.stock / s.totalPurchased) * 100) : 0,
    }))

  const priorityOrder = { high: 0, medium: 1, low: 2 }

  const renderRestockItem = (item: RestockSuggestion) => {
    const colors = PRIORITY_COLORS[item.priority]
    const isOut = item.currentStock <= 0
    const isExpanded = expandedIngredient === item.ingredientId
    return (
      <div key={item.ingredientId} className={`rounded-xl border ${colors.border} ${colors.bg} transition-all hover:bg-surface-700/40 overflow-hidden`}>
        <div
          className="p-4 cursor-pointer"
          onClick={() => setExpandedIngredient(isExpanded ? null : item.ingredientId)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className={colors.text} />
              <span className="text-sm font-semibold text-white">{item.ingredientName}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                {colors.label}
              </span>
              {item.affectedHighSalesDishes.length > 0 && (
                <span className="flex items-center gap-1 text-loss text-[10px] bg-loss/15 px-1.5 py-0.5 rounded-md border border-loss/30">
                  <Flame size={10} />
                  影响爆品
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-brand-400 font-medium">{formatCurrency(item.estimatedCost)}</span>
              {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 text-sm">
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Package size={12} />
                <span>当前库存</span>
              </div>
              <p className={`font-bold ${isOut ? 'text-loss' : 'text-white'}`}>
                {isOut ? '已耗尽' : `${item.currentStock.toFixed(1)}${item.unit}`}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <TrendingDown size={12} />
                <span>日均消耗</span>
              </div>
              <p className="text-white font-bold">{item.dailyConsumption.toFixed(2)}{item.unit}/天</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Clock size={12} />
                <span>还能撑</span>
              </div>
              <p className={`font-bold ${item.daysRemaining <= 1 ? 'text-loss' : item.daysRemaining <= 3 ? 'text-amber-400' : 'text-profit'}`}>
                {item.daysRemaining === Infinity ? '∞' : `${item.daysRemaining.toFixed(1)}天`}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <ShoppingCart size={12} />
                <span>建议采购</span>
              </div>
              <p className="text-brand-400 font-bold">{item.suggestedPurchase.toFixed(1)}{item.unit}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <DollarSign size={12} />
                <span>预计花费</span>
              </div>
              <p className="text-profit font-bold">{formatCurrency(item.estimatedCost)}</p>
            </div>
          </div>
        </div>

        {isExpanded && item.consumingDishes.length > 0 && (
          <div className="px-4 pb-4 border-t border-surface-600/50 pt-3">
            <p className="text-xs text-gray-400 mb-2">📊 消耗来源（近{lookbackDays}天）</p>
            <div className="space-y-1.5">
              {item.consumingDishes.map((d, i) => (
                <div key={i} className="flex items-center justify-between bg-surface-700/40 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <ChefHat size={12} className="text-gray-500" />
                    <span className="text-sm text-white">{d.dishName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-400">共售{d.portions}份</span>
                    <span className="text-gray-300 font-medium">日均{d.dailyUsage.toFixed(2)}{item.unit}</span>
                    <span className="text-brand-400 font-medium">占比{Math.round((d.dailyUsage / item.dailyConsumption) * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
            {item.affectedHighSalesDishes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-surface-600/30">
                <p className="text-xs text-loss mb-2">🔥 高销量菜品受影响：</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.affectedHighSalesDishes.map((name) => (
                    <span key={name} className="px-2 py-0.5 bg-loss/15 text-loss text-xs rounded-md border border-loss/30">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderPriorityItem = (item: any, index: number) => {
    const colors = PRIORITY_COLORS[item.priority]
    const isOut = item.currentStock <= 0
    const isExpanded = expandedIngredient === item.ingredientId
    return (
      <div key={item.ingredientId} className={`rounded-xl border ${colors.border} transition-all hover:bg-surface-700/40 overflow-hidden ${item.priority === 'high' ? 'bg-loss/10' : item.priority === 'medium' ? 'bg-amber-500/10' : 'bg-surface-700/20'}`}>
        <div
          className="p-4 cursor-pointer"
          onClick={() => setExpandedIngredient(isExpanded ? null : item.ingredientId)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-brand-500 text-white' : 'bg-surface-600 text-gray-400'}`}>
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{item.ingredientName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                    {colors.label}
                  </span>
                  {item.affectsHotDishes && (
                    <span className="flex items-center gap-1 text-loss text-[10px] bg-loss/15 px-1.5 py-0.5 rounded-md border border-loss/30">
                      <Flame size={10} />
                      影响爆品
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm flex-shrink-0">
              <div className="text-center min-w-[80px]">
                <p className="text-xs text-gray-500">还能撑</p>
                <p className={`font-bold ${item.daysRemaining <= 1 ? 'text-loss' : item.daysRemaining <= 3 ? 'text-amber-400' : 'text-profit'}`}>
                  {item.daysRemaining === Infinity ? '∞' : `${item.daysRemaining.toFixed(1)}天`}
                </p>
              </div>
              <div className="text-center min-w-[80px]">
                <p className="text-xs text-gray-500">建议采购</p>
                <p className="text-brand-400 font-bold">{item.suggestedPurchase.toFixed(1)}{item.unit}</p>
              </div>
              <div className="text-center min-w-[80px]">
                <p className="text-xs text-gray-500">预计花费</p>
                <p className="text-profit font-bold">{formatCurrency(item.estimatedCost)}</p>
              </div>
              {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>
          </div>
        </div>

        {isExpanded && item.consumingDishes.length > 0 && (
          <div className="px-4 pb-4 border-t border-surface-600/50 pt-3">
            <p className="text-xs text-gray-400 mb-2">📊 消耗来源（近{lookbackDays}天）</p>
            <div className="space-y-1.5">
              {item.consumingDishes.map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-surface-700/40 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <ChefHat size={12} className="text-gray-500" />
                    <span className="text-sm text-white">{d.dishName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-400">共售{d.portions}份</span>
                    <span className="text-gray-300 font-medium">日均{d.dailyUsage.toFixed(2)}{item.unit}</span>
                    <span className="text-brand-400 font-medium">占比{Math.round((d.dailyUsage / item.dailyConsumption) * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">食材库存</h1>
          <p className="text-gray-400 text-sm mt-1">采购入库 · 销售出库 · 低库存预警 · 智能补货</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-surface-800 rounded-lg border border-surface-700 px-3 py-1">
            <Clock size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400">时间窗口：</span>
            <div className="flex bg-surface-700 rounded-md p-0.5">
              {([3, 7, 14] as const).map((days) => (
                <button
                  key={days}
                  onClick={() => { setLookbackDays(days); setExpandedIngredient(null) }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${lookbackDays === days ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  近{days}天
                </button>
              ))}
            </div>
          </div>
          <div className="flex bg-surface-800 rounded-lg border border-surface-700 p-1">
            <button
              onClick={() => { setActiveTab('stock'); setExpandedIngredient(null) }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'stock' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              库存概览
            </button>
            <button
              onClick={() => { setActiveTab('restock'); setExpandedIngredient(null) }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === 'restock' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              补货建议
              {highPriorityRestock.length > 0 && (
                <span className="w-5 h-5 bg-loss text-white text-[10px] rounded-full flex items-center justify-center">
                  {highPriorityRestock.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('priority'); setExpandedIngredient(null) }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'priority' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              采购清单
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'stock' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">库存预警</span>
                <AlertTriangle size={16} className="text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-400">{alertCount}</p>
              <p className="text-xs text-gray-500 mt-1">{lowStockItems.length}低库存 · {outOfStockItems.length}已耗尽</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">受影响菜品</span>
                <ChefHat size={16} className="text-loss" />
              </div>
              <p className="text-2xl font-bold text-loss">{affectedDishNames.size}</p>
              <p className="text-xs text-gray-500 mt-1">因缺料可能无法出餐</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">食材种类</span>
                <Package size={16} className="text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">{ingredients.length}</p>
              <p className="text-xs text-gray-500 mt-1">共管理 {ingredients.length} 种食材</p>
            </div>
          </div>

          {affectedDishNames.size > 0 && (
            <div className="bg-surface-800 rounded-xl p-5 border border-loss/30">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={18} className="text-loss" />
                <span className="text-sm font-semibold text-loss">缺料菜品提醒</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from(affectedDishNames).map((name) => (
                  <span key={name} className="px-3 py-1 bg-loss/10 text-loss text-xs rounded-full border border-loss/20">
                    {name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">以上菜品因食材库存不足，可能无法正常出餐，请及时补货</p>
            </div>
          )}

          <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
            <h2 className="text-lg font-serif font-semibold text-white mb-4">库存消耗概览</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E2E42" />
                  <XAxis type="number" stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" stroke="#666" tick={{ fill: '#999', fontSize: 11 }} width={60} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#262637', border: '1px solid #3A3A50', borderRadius: '8px', color: '#fff' }}
                    formatter={(value: number, name: string) => [value.toFixed(2), name === 'stock' ? '剩余' : '已消耗']}
                  />
                  <Bar dataKey="stock" name="stock" fill="#2ECC71" radius={[0, 3, 3, 0]} stackId="a" />
                  <Bar dataKey="consumed" name="consumed" fill="#E8652E" radius={[0, 3, 3, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-500 text-sm">暂无库存数据</div>
            )}
          </div>

          <div className="bg-surface-800 rounded-xl border border-surface-700">
            <div className="p-4 border-b border-surface-700 flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-base font-serif font-semibold text-white">食材库存明细</h2>
              <div className="flex bg-surface-700 rounded-lg p-1">
                {([['all', '全部'], ['low', '低库存'], ['out', '已耗尽']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${filter === key ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {filteredStocks.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <Package size={48} className="mx-auto mb-3 opacity-30" />
                <p>暂无库存数据</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-700">
                {filteredStocks.map((item) => {
                  const isLow = item.stock > 0 && item.stock <= item.lowThreshold
                  const isOut = item.stock <= 0
                  const ratio = item.totalPurchased > 0 ? (item.stock / item.totalPurchased) * 100 : 0

                  return (
                    <div key={item.ingredientId} className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-700/30 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white font-medium">{item.ingredientName}</span>
                            {isOut && <span className="text-[10px] px-1.5 py-0.5 rounded bg-loss/10 text-loss">耗尽</span>}
                            {isLow && !isOut && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">偏低</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex-1 max-w-[120px] h-1.5 bg-surface-600 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isOut ? 'bg-loss' : isLow ? 'bg-amber-400' : 'bg-profit'}`}
                                style={{ width: `${Math.min(ratio, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{Math.round(ratio)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center min-w-[60px]">
                          <p className="text-xs text-gray-500">剩余</p>
                          <p className={`font-bold ${isOut ? 'text-loss' : isLow ? 'text-amber-400' : 'text-white'}`}>
                            {item.stock.toFixed(1)}<span className="text-xs font-normal text-gray-500 ml-0.5">{item.unit}</span>
                          </p>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <p className="text-xs text-gray-500">入库</p>
                          <p className="text-gray-300">{item.totalPurchased.toFixed(1)}</p>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <p className="text-xs text-gray-500">消耗</p>
                          <p className="text-gray-300">{item.totalConsumed.toFixed(1)}</p>
                        </div>
                        <div className="text-center min-w-[80px]">
                          <p className="text-xs text-gray-500">关联菜品</p>
                          <p className="text-gray-300 text-xs">{item.affectedDishes.length}道</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'restock' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-surface-800 rounded-xl p-5 border border-loss/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">紧急补货</span>
                <AlertTriangle size={16} className="text-loss" />
              </div>
              <p className="text-2xl font-bold text-loss">{highPriorityRestock.length}</p>
              <p className="text-xs text-gray-500 mt-1">库存已耗尽或仅够1天</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">影响爆品</span>
                <ChefHat size={16} className="text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-400">{affectedHighSalesDishes.size}</p>
              <p className="text-xs text-gray-500 mt-1">高销量菜品可能受影响</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">建议采购种类</span>
                <ShoppingCart size={16} className="text-brand-400" />
              </div>
              <p className="text-2xl font-bold text-brand-400">{sortedRestockSuggestions.length}</p>
              <p className="text-xs text-gray-500 mt-1">需补货的食材种类</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">预计采购金额</span>
                <DollarSign size={16} className="text-profit" />
              </div>
              <p className="text-2xl font-bold text-profit">{formatCurrency(totalEstimatedCost)}</p>
              <p className="text-xs text-gray-500 mt-1">按近{lookbackDays}天销量预估</p>
            </div>
          </div>

          {affectedHighSalesDishes.size > 0 && (
            <div className="bg-surface-800 rounded-xl p-5 border border-amber-500/30">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={18} className="text-amber-400" />
                <span className="text-sm font-semibold text-amber-400">高销量菜品缺料预警</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from(affectedHighSalesDishes).map((name) => (
                  <span key={name} className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-full border border-amber-500/30">
                    🔥 {name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">以上为近{lookbackDays}天销量最高的菜品，请优先补货对应食材</p>
            </div>
          )}

          <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif font-semibold text-white">智能补货建议</h2>
              <p className="text-xs text-gray-400">按近{lookbackDays}天销量预估，建议备足7天用量 · 点击展开查看消耗来源</p>
            </div>
            {sortedRestockSuggestions.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {sortedRestockSuggestions.map(renderRestockItem)}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500">
                <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
                <p>所有食材库存充足，暂无需补货</p>
              </div>
            )}
          </div>

          {sortedRestockSuggestions.length > 0 && (
            <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
              <h3 className="text-sm font-semibold text-white mb-3">📋 采购清单（一键复制）</h3>
              <div className="bg-surface-700/30 rounded-lg p-4 font-mono text-xs text-gray-300 whitespace-pre-line">
                {`采购日期：${new Date().toLocaleDateString('zh-CN')}\n`}
                {`参考周期：近${lookbackDays}天销售数据\n`}
                {`预计总花费：${formatCurrency(totalEstimatedCost)}\n\n`}
                {sortedRestockSuggestions
                  .filter((s) => s.suggestedPurchase > 0)
                  .map((s, i) => `${String(i + 1).padStart(2, ' ')}. ${s.ingredientName.padEnd(6, '　')}  ${s.suggestedPurchase.toFixed(1).padStart(5, ' ')}${s.unit}  约${formatCurrency(s.estimatedCost).padStart(8, ' ')}`)
                  .join('\n')}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'priority' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-surface-800 rounded-xl p-5 border border-loss/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">紧急采购</span>
                <AlertTriangle size={16} className="text-loss" />
              </div>
              <p className="text-2xl font-bold text-loss">
                {purchasePriorityList.filter((s) => s.priority === 'high').length}
              </p>
              <p className="text-xs text-gray-500 mt-1">必须今天采购</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">影响爆品</span>
                <Flame size={16} className="text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-400">
                {purchasePriorityList.filter((s) => s.affectsHotDishes).length}
              </p>
              <p className="text-xs text-gray-500 mt-1">涉及高销量菜品</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">采购总种类</span>
                <ShoppingCart size={16} className="text-brand-400" />
              </div>
              <p className="text-2xl font-bold text-brand-400">{purchasePriorityList.length}</p>
              <p className="text-xs text-gray-500 mt-1">种食材需要采购</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">预计总花费</span>
                <DollarSign size={16} className="text-profit" />
              </div>
              <p className="text-2xl font-bold text-profit">{formatCurrency(totalEstimatedCost)}</p>
              <p className="text-xs text-gray-500 mt-1">按当前进价估算</p>
            </div>
          </div>

          <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif font-semibold text-white">采购优先级清单</h2>
              <p className="text-xs text-gray-400">按紧急程度排序 · 点击展开查看哪些菜在消耗</p>
            </div>
            {purchasePriorityList.length > 0 ? (
              <div className="space-y-3">
                {purchasePriorityList.map(renderPriorityItem)}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500">
                <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
                <p>所有食材库存充足，暂无需采购</p>
              </div>
            )}
          </div>

          {purchasePriorityList.length > 0 && (
            <div className="bg-surface-800 rounded-xl p-5 border border-surface-700">
              <h3 className="text-sm font-semibold text-white mb-3">💰 采购预算明细</h3>
              <div className="bg-surface-700/30 rounded-lg p-4">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">紧急采购</span>
                    <span className="text-loss font-medium">
                      {formatCurrency(purchasePriorityList.filter((s) => s.priority === 'high').reduce((sum, s) => sum + s.estimatedCost, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">注意采购</span>
                    <span className="text-amber-400 font-medium">
                      {formatCurrency(purchasePriorityList.filter((s) => s.priority === 'medium').reduce((sum, s) => sum + s.estimatedCost, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">常规采购</span>
                    <span className="text-gray-300 font-medium">
                      {formatCurrency(purchasePriorityList.filter((s) => s.priority === 'low').reduce((sum, s) => sum + s.estimatedCost, 0))}
                    </span>
                  </div>
                </div>
                <div className="border-t border-surface-600 pt-3 flex justify-between">
                  <span className="text-white font-semibold">合计</span>
                  <span className="text-profit font-bold text-lg">{formatCurrency(totalEstimatedCost)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
