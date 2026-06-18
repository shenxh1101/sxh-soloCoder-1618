import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit3, Trash2, ChefHat, X, AlertTriangle, Check } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import useStore from '@/store/useStore'
import { calculateDishCost, formatCurrency, formatPercent, suggestPrice, generateId } from '@/utils/calculations'
import type { DishCategory, DishIngredient } from '@/types'

const CATEGORIES: DishCategory[] = ['小炒', '盖饭', '面条', '汤']
const CATEGORY_COLORS: Record<DishCategory, string> = {
  '小炒': 'from-red-500 to-orange-500',
  '盖饭': 'from-amber-500 to-yellow-500',
  '面条': 'from-blue-500 to-cyan-500',
  '汤': 'from-green-500 to-emerald-500',
}
const PIE_COLORS = ['#E8652E', '#2ECC71', '#3498DB', '#F39C12', '#9B59B6', '#1ABC9C', '#E74C3C', '#2C3E50']

export default function Recipes() {
  const { ingredients, dishes, dishIngredients, addDish, updateDish, deleteDish, setDishIngredients, addIngredient } = useStore()

  const [showAddDish, setShowAddDish] = useState(false)
  const [editingDishId, setEditingDishId] = useState<string | null>(null)
  const [newDishName, setNewDishName] = useState('')
  const [newDishCategory, setNewDishCategory] = useState<DishCategory>('小炒')
  const [newDishPrice, setNewDishPrice] = useState(0)
  const [newDishTargetMargin, setNewDishTargetMargin] = useState(50)

  const [editIngredients, setEditIngredients] = useState<DishIngredient[]>([])

  const getDishCost = (dishId: string) => {
    const recipeItems = dishIngredients.filter((di) => di.dishId === dishId)
    return calculateDishCost(recipeItems, ingredients)
  }

  const getDishCostBreakdown = (dishId: string) => {
    const recipeItems = dishIngredients.filter((di) => di.dishId === dishId)
    return recipeItems.map((di) => {
      const ing = ingredients.find((i) => i.id === di.ingredientId)
      const cost = di.quantity * (ing?.currentPrice || 0)
      return { name: di.ingredientName, value: Math.round(cost * 100) / 100 }
    }).filter((d) => d.value > 0)
  }

  const handleAddDish = () => {
    if (!newDishName.trim()) return
    addDish({
      name: newDishName.trim(),
      category: newDishCategory,
      sellingPrice: newDishPrice,
      targetMargin: newDishTargetMargin,
    })
    setNewDishName('')
    setNewDishPrice(0)
    setNewDishTargetMargin(50)
    setShowAddDish(false)
  }

  const startEditing = (dishId: string) => {
    setEditingDishId(dishId)
    setEditIngredients(dishIngredients.filter((di) => di.dishId === dishId))
  }

  const stopEditing = () => {
    if (editingDishId) {
      setDishIngredients(editingDishId, editIngredients)
    }
    setEditingDishId(null)
    setEditIngredients([])
  }

  const addRecipeIngredient = () => {
    if (!editingDishId) return
    setEditIngredients([
      ...editIngredients,
      {
        dishId: editingDishId,
        ingredientId: '',
        ingredientName: '',
        quantity: 0,
        unit: '斤',
      },
    ])
  }

  const updateRecipeIngredient = (index: number, field: string, value: string | number) => {
    const updated = [...editIngredients]
    const item = { ...updated[index] }

    if (field === 'ingredientId') {
      const strVal = String(value)
      const ing = ingredients.find((i) => i.id === strVal)
      if (ing) {
        item.ingredientId = ing.id
        item.ingredientName = ing.name
        item.unit = ing.unit
      }
    } else if (field === 'quantity') {
      item.quantity = Number(value)
    }

    updated[index] = item
    setEditIngredients(updated)
  }

  const removeRecipeIngredient = (index: number) => {
    setEditIngredients(editIngredients.filter((_, i) => i !== index))
  }

  const getSuggestions = () => {
    return dishes
      .map((dish) => {
        const recipeItems = dishIngredients.filter((di) => di.dishId === dish.id)
        return suggestPrice(dish, recipeItems, ingredients)
      })
      .filter((s) => s.priceIncrease > 0.5 || s.currentMargin < s.targetMargin - 5)
  }

  const suggestions = getSuggestions()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">菜品配方</h1>
          <p className="text-gray-400 text-sm mt-1">管理菜品配方，自动计算成本</p>
        </div>
        <button
          onClick={() => setShowAddDish(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-brand-500/25"
        >
          <Plus size={18} />
          添加菜品
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="bg-surface-800 rounded-xl p-5 border border-amber-500/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-amber-400" />
            <h2 className="text-base font-semibold text-amber-400">调价建议</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((s) => (
              <div key={s.dishId} className="bg-surface-700/50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">{s.dishName}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    当前成本 {formatCurrency(s.currentCost)} · 毛利率 {formatPercent(s.currentMargin)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-brand-400 font-bold">建议 ¥{s.suggestedPrice}</p>
                  <p className="text-xs text-loss">需涨价 {formatCurrency(s.priceIncrease)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAddDish && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-800 rounded-xl p-6 border border-brand-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-serif font-semibold text-white">添加菜品</h3>
                <button onClick={() => setShowAddDish(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">菜品名称</label>
                  <input
                    type="text"
                    value={newDishName}
                    onChange={(e) => setNewDishName(e.target.value)}
                    className="w-full bg-surface-700 text-white px-3 py-2 rounded-lg border border-surface-600 text-sm focus:outline-none focus:border-brand-500"
                    placeholder="如：宫保鸡丁"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">分类</label>
                  <select
                    value={newDishCategory}
                    onChange={(e) => setNewDishCategory(e.target.value as DishCategory)}
                    className="w-full bg-surface-700 text-white px-3 py-2 rounded-lg border border-surface-600 text-sm focus:outline-none focus:border-brand-500"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">售价(元)</label>
                  <input
                    type="number"
                    value={newDishPrice || ''}
                    onChange={(e) => setNewDishPrice(Number(e.target.value))}
                    className="w-full bg-surface-700 text-white px-3 py-2 rounded-lg border border-surface-600 text-sm focus:outline-none focus:border-brand-500"
                    min="0"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">目标毛利率(%)</label>
                  <input
                    type="number"
                    value={newDishTargetMargin}
                    onChange={(e) => setNewDishTargetMargin(Number(e.target.value))}
                    className="w-full bg-surface-700 text-white px-3 py-2 rounded-lg border border-surface-600 text-sm focus:outline-none focus:border-brand-500"
                    min="0"
                    max="99"
                    step="1"
                  />
                </div>
              </div>
              <button
                onClick={handleAddDish}
                disabled={!newDishName.trim()}
                className="px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-surface-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all"
              >
                确认添加
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {dishes.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          <ChefHat size={48} className="mx-auto mb-3 opacity-30" />
          <p>暂无菜品</p>
          <p className="text-xs mt-1">点击"添加菜品"开始配置</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {dishes.map((dish) => {
            const cost = getDishCost(dish.id)
            const margin = dish.sellingPrice > 0 ? ((dish.sellingPrice - cost) / dish.sellingPrice) * 100 : 0
            const breakdown = getDishCostBreakdown(dish.id)
            const recipeItems = dishIngredients.filter((di) => di.dishId === dish.id)
            const isEditing = editingDishId === dish.id

            return (
              <motion.div
                key={dish.id}
                layout
                className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden hover:border-surface-600 transition-all"
              >
                <div className={`h-1.5 bg-gradient-to-r ${CATEGORY_COLORS[dish.category]}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-serif font-semibold text-lg">{dish.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-600 text-gray-300">{dish.category}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">目标毛利率 {dish.targetMargin}%</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => isEditing ? stopEditing() : startEditing(dish.id)}
                        className="p-1.5 text-gray-400 hover:text-brand-400 rounded transition-colors"
                      >
                        {isEditing ? <Check size={16} /> : <Edit3 size={16} />}
                      </button>
                      <button
                        onClick={() => deleteDish(dish.id)}
                        className="p-1.5 text-gray-400 hover:text-loss rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-surface-700/50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-gray-500">成本</p>
                      <p className="text-sm font-bold text-white mt-0.5">{formatCurrency(cost)}</p>
                    </div>
                    <div className="bg-surface-700/50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-gray-500">售价</p>
                      <p className="text-sm font-bold text-brand-400 mt-0.5">{formatCurrency(dish.sellingPrice)}</p>
                    </div>
                    <div className="bg-surface-700/50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-gray-500">毛利率</p>
                      <p className={`text-sm font-bold mt-0.5 ${margin >= dish.targetMargin ? 'text-profit' : 'text-loss'}`}>
                        {formatPercent(margin)}
                      </p>
                    </div>
                  </div>

                  {breakdown.length > 0 && !isEditing && (
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={28} innerRadius={16}>
                              {breakdown.map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: '#262637', border: '1px solid #3A3A50', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                              formatter={(value: number) => [formatCurrency(value), '']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-1">
                        {recipeItems.map((ri, i) => {
                          const ing = ingredients.find((i) => i.id === ri.ingredientId)
                          const itemCost = ri.quantity * (ing?.currentPrice || 0)
                          return (
                            <div key={ri.ingredientId} className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">{ri.ingredientName} {ri.quantity}{ri.unit}</span>
                              <span className="text-gray-300">{formatCurrency(itemCost)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="space-y-2 mt-3 border-t border-surface-700 pt-3">
                      {editIngredients.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-5">
                            <select
                              value={item.ingredientId}
                              onChange={(e) => updateRecipeIngredient(idx, 'ingredientId', e.target.value)}
                              className="w-full bg-surface-700 text-white px-2 py-1.5 rounded border border-surface-600 text-xs focus:outline-none focus:border-brand-500"
                            >
                              <option value="">选择</option>
                              {ingredients.map((ing) => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                            </select>
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number"
                              value={item.quantity || ''}
                              onChange={(e) => updateRecipeIngredient(idx, 'quantity', Number(e.target.value))}
                              className="w-full bg-surface-700 text-white px-2 py-1.5 rounded border border-surface-600 text-xs focus:outline-none focus:border-brand-500"
                              placeholder="用量"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div className="col-span-3 text-xs text-gray-400">{item.unit}</div>
                          <div className="col-span-1">
                            <button onClick={() => removeRecipeIngredient(idx)} className="text-gray-500 hover:text-loss">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={addRecipeIngredient}
                        className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 mt-1"
                      >
                        <Plus size={14} /> 添加食材
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
