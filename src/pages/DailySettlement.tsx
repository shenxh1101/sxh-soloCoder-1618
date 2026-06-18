import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, TrendingUp, TrendingDown, Trophy, AlertCircle, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import useStore from '@/store/useStore'
import type { DailySales } from '@/types'
import { calculateDishCost, formatCurrency, formatPercent } from '@/utils/calculations'
import { format } from 'date-fns'

export default function DailySettlement() {
  const { dishes, dishIngredients, ingredients, dailySales, addDailySalesBatch, deleteDailySales } = useStore()

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [salesInput, setSalesInput] = useState<Record<string, { portions: number; price: number }>>({})
  const [submitted, setSubmitted] = useState(false)

  const todaySales = dailySales.filter((s) => s.date === date)
  const hasSales = todaySales.length > 0

  const totalRevenue = todaySales.reduce((sum, s) => sum + s.revenue, 0)
  const totalCost = todaySales.reduce((sum, s) => sum + s.totalCost, 0)
  const totalProfit = todaySales.reduce((sum, s) => sum + s.grossProfit, 0)
  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  const bestDish = todaySales.length > 0
    ? todaySales.reduce((best, s) => (s.grossProfit > best.grossProfit ? s : best), todaySales[0])
    : null

  const worstDish = todaySales.length > 0
    ? todaySales.reduce((worst, s) => (s.grossMargin < worst.grossMargin ? s : worst), todaySales[0])
    : null

  const chartData = todaySales.map((s) => ({
    name: s.dishName,
    profit: Math.round(s.grossProfit * 100) / 100,
    margin: Math.round(s.grossMargin * 10) / 10,
    isBest: bestDish?.id === s.id,
    isWorst: worstDish?.id === s.id && s.grossMargin < 40,
  }))

  const handlePortionsChange = (dishId: string, portions: number) => {
    setSalesInput((prev) => ({
      ...prev,
      [dishId]: {
        portions,
        price: prev[dishId]?.price ?? dishes.find((d) => d.id === dishId)?.sellingPrice ?? 0,
      },
    }))
  }

  const handlePriceChange = (dishId: string, price: number) => {
    setSalesInput((prev) => ({
      ...prev,
      [dishId]: {
        portions: prev[dishId]?.portions ?? 0,
        price,
      },
    }))
  }

  const handleSubmit = () => {
    const entries = Object.entries(salesInput).filter(([, v]) => v.portions > 0)
    if (entries.length === 0) return

    const salesRecords = entries.map(([dishId, { portions, price }]) => {
      const dish = dishes.find((d) => d.id === dishId)
      if (!dish) return null
      const recipeItems = dishIngredients.filter((di) => di.dishId === dishId)
      const costPerPortion = calculateDishCost(recipeItems, ingredients)
      const revenue = portions * price
      const totalCostVal = portions * costPerPortion
      const grossProfit = revenue - totalCostVal
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

      return {
        date,
        dishId,
        dishName: dish.name,
        category: dish.category,
        portionsSold: portions,
        sellingPrice: price,
        costPerPortion,
        revenue,
        totalCost: totalCostVal,
        grossProfit,
        grossMargin,
      }
    }).filter(Boolean) as Omit<DailySales, 'id'>[]

    if (salesRecords.length > 0) {
      addDailySalesBatch(salesRecords)
      setSalesInput({})
      setSubmitted(true)
    }
  }

  const handleDeleteSale = (id: string) => {
    deleteDailySales(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">日终结算</h1>
          <p className="text-gray-400 text-sm mt-1">录入每日销售，查看利润报告</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setSubmitted(false) }}
            className="bg-surface-800 text-white px-3 py-2 rounded-lg border border-surface-700 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {!hasSales && (
        <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
          <h2 className="text-lg font-serif font-semibold text-white mb-4">录入销售</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 font-medium px-1">
              <div className="col-span-3">菜品</div>
              <div className="col-span-2">分类</div>
              <div className="col-span-2">成本/份</div>
              <div className="col-span-2">售出份数</div>
              <div className="col-span-2">售价</div>
              <div className="col-span-1">毛利/份</div>
            </div>

            {dishes.map((dish) => {
              const recipeItems = dishIngredients.filter((di) => di.dishId === dish.id)
              const cost = calculateDishCost(recipeItems, ingredients)
              const input = salesInput[dish.id] || { portions: 0, price: dish.sellingPrice }
              const profitPerPortion = input.price - cost

              return (
                <div key={dish.id} className="grid grid-cols-12 gap-2 items-center bg-surface-700/30 rounded-lg p-2.5">
                  <div className="col-span-3 text-sm text-white font-medium">{dish.name}</div>
                  <div className="col-span-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-600 text-gray-300">{dish.category}</span>
                  </div>
                  <div className="col-span-2 text-sm text-gray-300">{formatCurrency(cost)}</div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={input.portions || ''}
                      onChange={(e) => handlePortionsChange(dish.id, Number(e.target.value))}
                      className="w-full bg-surface-700 text-white px-2 py-1.5 rounded border border-surface-600 text-sm focus:outline-none focus:border-brand-500"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={input.price || ''}
                      onChange={(e) => handlePriceChange(dish.id, Number(e.target.value))}
                      className="w-full bg-surface-700 text-white px-2 py-1.5 rounded border border-surface-600 text-sm focus:outline-none focus:border-brand-500"
                      placeholder="0"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  <div className={`col-span-1 text-sm font-medium ${profitPerPortion >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatCurrency(profitPerPortion)}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-brand-500/25"
            >
              保存销售记录
            </button>
          </div>
        </div>
      )}

      {hasSales && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="bg-surface-800 rounded-xl p-5 border border-surface-700"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">总营业额</span>
                <DollarSign size={16} className="text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface-800 rounded-xl p-5 border border-surface-700"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">总成本</span>
                <Calculator size={16} className="text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalCost)}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-surface-800 rounded-xl p-5 border border-surface-700"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">总毛利</span>
                {totalProfit >= 0 ? <TrendingUp size={16} className="text-profit" /> : <TrendingDown size={16} className="text-loss" />}
              </div>
              <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(totalProfit)}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-surface-800 rounded-xl p-5 border border-surface-700"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">综合毛利率</span>
                {overallMargin >= 50 ? <TrendingUp size={16} className="text-profit" /> : <AlertCircle size={16} className="text-loss" />}
              </div>
              <p className={`text-2xl font-bold ${overallMargin >= 50 ? 'text-profit' : 'text-loss'}`}>{formatPercent(overallMargin)}</p>
            </motion.div>
          </div>

          {bestDish && worstDish && bestDish.id !== worstDish.id && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-surface-800 rounded-xl p-5 border border-profit/20">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={18} className="text-profit" />
                  <span className="text-sm font-medium text-profit">最赚菜品</span>
                </div>
                <p className="text-xl font-serif font-bold text-white">{bestDish.dishName}</p>
                <p className="text-sm text-gray-400 mt-1">毛利 {formatCurrency(bestDish.grossProfit)} · 毛利率 {formatPercent(bestDish.grossMargin)}</p>
              </div>
              <div className="bg-surface-800 rounded-xl p-5 border border-loss/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={18} className="text-loss" />
                  <span className="text-sm font-medium text-loss">最低毛利</span>
                </div>
                <p className="text-xl font-serif font-bold text-white">{worstDish.dishName}</p>
                <p className="text-sm text-gray-400 mt-1">毛利 {formatCurrency(worstDish.grossProfit)} · 毛利率 {formatPercent(worstDish.grossMargin)}</p>
              </div>
            </div>
          )}

          <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
            <h2 className="text-lg font-serif font-semibold text-white mb-4">菜品利润对比</h2>
            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E2E42" />
                  <XAxis dataKey="name" stroke="#666" tick={{ fill: '#999', fontSize: 12 }} />
                  <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#262637', border: '1px solid #3A3A50', borderRadius: '8px', color: '#fff' }}
                    formatter={(value: number, name: string) => [name === 'profit' ? formatCurrency(value) : `${value}%`, name === 'profit' ? '毛利' : '毛利率']}
                  />
                  <Bar dataKey="profit" name="profit" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.isBest ? '#2ECC71' : entry.isWorst ? '#E74C3C' : '#E8652E'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-surface-800 rounded-xl border border-surface-700">
            <div className="px-5 py-3 border-b border-surface-700">
              <h2 className="text-base font-serif font-semibold text-white">销售明细</h2>
            </div>
            <div className="divide-y divide-surface-700">
              {todaySales.map((sale) => (
                <div key={sale.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-700/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-white font-medium">{sale.dishName}</p>
                      <p className="text-xs text-gray-500">{sale.portionsSold}份 × {formatCurrency(sale.sellingPrice)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-300">{formatCurrency(sale.revenue)}</p>
                      <p className="text-xs text-gray-500">成本 {formatCurrency(sale.totalCost)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${sale.grossProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {formatCurrency(sale.grossProfit)}
                      </p>
                      <p className={`text-xs ${sale.grossMargin >= 50 ? 'text-profit' : 'text-loss'}`}>
                        {formatPercent(sale.grossMargin)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteSale(sale.id)}
                      className="text-gray-500 hover:text-loss text-xs transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => { todaySales.forEach((s) => deleteDailySales(s.id)); setSubmitted(false) }}
              className="text-sm text-gray-500 hover:text-loss transition-colors"
            >
              清除今日记录重新录入
            </button>
          </div>
        </>
      )}

      {!hasSales && dishes.length === 0 && (
        <div className="py-16 text-center text-gray-500">
          <Calculator size={48} className="mx-auto mb-3 opacity-30" />
          <p>暂无菜品</p>
          <p className="text-xs mt-1">请先在"菜品配方"中添加菜品</p>
        </div>
      )}
    </div>
  )
}

function DollarSign({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  )
}
