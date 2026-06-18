import { useState, useMemo } from 'react'
import { Package, AlertTriangle, TrendingDown, ChefHat } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import useStore from '@/store/useStore'
import { calculateIngredientStocks, formatCurrency } from '@/utils/calculations'

export default function Inventory() {
  const { ingredients, purchaseRecords, dailySales, dishes, dishIngredients } = useStore()

  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all')

  const stocks = useMemo(
    () => calculateIngredientStocks(ingredients, purchaseRecords, dailySales, dishIngredients, dishes),
    [ingredients, purchaseRecords, dailySales, dishIngredients, dishes]
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">食材库存</h1>
          <p className="text-gray-400 text-sm mt-1">采购入库 · 销售出库 · 低库存预警</p>
        </div>
      </div>

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
    </div>
  )
}
