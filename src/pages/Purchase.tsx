import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ShoppingCart, TrendingUp, TrendingDown, Calendar, Search } from 'lucide-react'
import useStore from '@/store/useStore'
import { formatCurrency, generateId } from '@/utils/calculations'
import { format } from 'date-fns'
import type { DishCategory } from '@/types'

interface PurchaseItem {
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  isNewIngredient: boolean
  newUnit: string
}

export default function Purchase() {
  const { ingredients, purchaseRecords, addPurchaseRecords, addIngredient, updateIngredientPrice } = useStore()

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [items, setItems] = useState<PurchaseItem[]>([
    { ingredientId: '', ingredientName: '', quantity: 0, unit: '', unitPrice: 0, totalPrice: 0, isNewIngredient: false, newUnit: '斤' },
  ])
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)

  const addItem = () => {
    setItems([
      ...items,
      { ingredientId: '', ingredientName: '', quantity: 0, unit: '', unitPrice: 0, totalPrice: 0, isNewIngredient: false, newUnit: '斤' },
    ])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...items]
    const item = { ...updated[index] }

    if (field === 'ingredientId') {
      const strVal = String(value)
      if (strVal === '__new__') {
        item.isNewIngredient = true
        item.ingredientId = ''
        item.ingredientName = ''
        item.unit = ''
        item.unitPrice = 0
      } else {
        const ing = ingredients.find((i) => i.id === strVal)
        if (ing) {
          item.ingredientId = ing.id
          item.ingredientName = ing.name
          item.unit = ing.unit
          item.unitPrice = ing.currentPrice
          item.isNewIngredient = false
        }
      }
    } else if (field === 'ingredientName') {
      item.ingredientName = String(value)
    } else if (field === 'newUnit') {
      item.newUnit = String(value)
      if (item.isNewIngredient) item.unit = String(value)
    } else if (field === 'quantity') {
      item.quantity = Number(value)
    } else if (field === 'unitPrice') {
      item.unitPrice = Number(value)
    }

    item.totalPrice = item.quantity * item.unitPrice
    if (item.isNewIngredient) item.unit = item.newUnit

    updated[index] = item
    setItems(updated)
  }

  const grandTotal = items.reduce((sum, item) => sum + item.totalPrice, 0)

  const handleSubmit = () => {
    const validItems = items.filter((i) => i.ingredientName && i.quantity > 0 && i.unitPrice > 0)
    if (validItems.length === 0) return

    const records = validItems.map((item) => {
      let ingredientId = item.ingredientId

      if (item.isNewIngredient) {
        const id = generateId()
        addIngredient({
          name: item.ingredientName,
          unit: item.newUnit,
          currentPrice: item.unitPrice,
          lastPriceDate: date,
        })
        ingredientId = id
      } else {
        const existingIng = ingredients.find((i) => i.id === item.ingredientId)
        if (existingIng && item.unitPrice !== existingIng.currentPrice) {
          updateIngredientPrice(item.ingredientId, item.unitPrice)
        }
      }

      return {
        date,
        ingredientId: ingredientId || item.ingredientId,
        ingredientName: item.ingredientName,
        quantity: item.quantity,
        unit: item.unit || item.newUnit,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }
    })

    addPurchaseRecords(records)
    setItems([
      { ingredientId: '', ingredientName: '', quantity: 0, unit: '', unitPrice: 0, totalPrice: 0, isNewIngredient: false, newUnit: '斤' },
    ])
    setShowForm(false)
  }

  const filteredRecords = purchaseRecords
    .filter((r) => !searchTerm || r.ingredientName.includes(searchTerm))
    .sort((a, b) => b.date.localeCompare(a.date))

  const groupedRecords = filteredRecords.reduce<Record<string, typeof filteredRecords>>((groups, record) => {
    if (!groups[record.date]) groups[record.date] = []
    groups[record.date].push(record)
    return groups
  }, {})

  const getPriceChangeTag = (ingredientId: string) => {
    const ing = ingredients.find((i) => i.id === ingredientId)
    if (!ing || ing.previousPrice === undefined || ing.previousPrice === null) return null
    const change = ((ing.currentPrice - ing.previousPrice) / ing.previousPrice) * 100
    if (Math.abs(change) < 5) return null
    return change > 0 ? { label: `↑${Math.round(change)}%`, type: 'up' as const } : { label: `↓${Math.abs(Math.round(change))}%`, type: 'down' as const }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">采购管理</h1>
          <p className="text-gray-400 text-sm mt-1">记录每日采购，跟踪进价变化</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-brand-500/25"
        >
          <Plus size={18} />
          录入采购
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-800 rounded-xl p-6 border border-surface-700 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-surface-700 text-white px-3 py-2 rounded-lg border border-surface-600 text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 font-medium px-1">
                  <div className="col-span-4">食材</div>
                  <div className="col-span-2">数量</div>
                  <div className="col-span-2">单位</div>
                  <div className="col-span-2">单价(元)</div>
                  <div className="col-span-1">小计</div>
                  <div className="col-span-1"></div>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <select
                        value={item.isNewIngredient ? '__new__' : item.ingredientId}
                        onChange={(e) => updateItem(index, 'ingredientId', e.target.value)}
                        className="w-full bg-surface-700 text-white px-3 py-2 rounded-lg border border-surface-600 text-sm focus:outline-none focus:border-brand-500"
                      >
                        <option value="">选择食材...</option>
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>{ing.name}</option>
                        ))}
                        <option value="__new__">+ 新增食材</option>
                      </select>
                    </div>

                    {item.isNewIngredient && (
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="食材名称"
                          value={item.ingredientName}
                          onChange={(e) => updateItem(index, 'ingredientName', e.target.value)}
                          className="w-full bg-surface-700 text-white px-3 py-2 rounded-lg border border-surface-600 text-sm focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    )}

                    <div className={item.isNewIngredient ? 'col-span-2' : 'col-span-2'}>
                      <input
                        type="number"
                        placeholder="数量"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                        className="w-full bg-surface-700 text-white px-3 py-2 rounded-lg border border-surface-600 text-sm focus:outline-none focus:border-brand-500"
                        min="0"
                        step="0.1"
                      />
                    </div>

                    <div className="col-span-2">
                      {item.isNewIngredient ? (
                        <select
                          value={item.newUnit}
                          onChange={(e) => updateItem(index, 'newUnit', e.target.value)}
                          className="w-full bg-surface-700 text-white px-3 py-2 rounded-lg border border-surface-600 text-sm focus:outline-none focus:border-brand-500"
                        >
                          <option value="斤">斤</option>
                          <option value="公斤">公斤</option>
                          <option value="克">克</option>
                          <option value="两">两</option>
                          <option value="个">个</option>
                          <option value="瓶">瓶</option>
                          <option value="袋">袋</option>
                          <option value="盒">盒</option>
                          <option value="升">升</option>
                        </select>
                      ) : (
                        <span className="text-sm text-gray-300 px-2">{item.unit}</span>
                      )}
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="单价"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                        className="w-full bg-surface-700 text-white px-3 py-2 rounded-lg border border-surface-600 text-sm focus:outline-none focus:border-brand-500"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="col-span-1 text-sm text-brand-400 font-medium">
                      {item.totalPrice > 0 ? formatCurrency(item.totalPrice) : '--'}
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => removeItem(index)}
                        className="p-1.5 text-gray-500 hover:text-loss rounded transition-colors"
                        disabled={items.length <= 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-surface-700">
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300 transition-colors"
                >
                  <Plus size={16} />
                  添加一行
                </button>
                <div className="flex items-center gap-6">
                  <span className="text-gray-400 text-sm">
                    合计：<span className="text-white font-bold text-lg">{formatCurrency(grandTotal)}</span>
                  </span>
                  <button
                    onClick={handleSubmit}
                    className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-brand-500/25"
                  >
                    保存采购记录
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-surface-800 rounded-xl border border-surface-700">
        <div className="p-4 border-b border-surface-700 flex items-center gap-3">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="搜索食材..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-white text-sm focus:outline-none flex-1 placeholder-gray-500"
          />
        </div>

        {Object.keys(groupedRecords).length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
            <p>暂无采购记录</p>
            <p className="text-xs mt-1">点击"录入采购"开始记录</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-700">
            {Object.entries(groupedRecords).map(([date, records]) => (
              <div key={date}>
                <div className="px-4 py-2.5 bg-surface-700/50 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">{date}</span>
                  <span className="text-xs text-gray-500">
                    共 {formatCurrency(records.reduce((s, r) => s + r.totalPrice, 0))}
                  </span>
                </div>
                <div className="divide-y divide-surface-700/50">
                  {records.map((record) => {
                    const priceTag = getPriceChangeTag(record.ingredientId)
                    return (
                      <div key={record.id} className="px-4 py-3 flex items-center justify-between hover:bg-surface-700/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white">{record.ingredientName}</span>
                          {priceTag && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${priceTag.type === 'up' ? 'bg-loss/10 text-loss' : 'bg-profit/10 text-profit'}`}>
                              {priceTag.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-400">{record.quantity}{record.unit} × {formatCurrency(record.unitPrice)}</span>
                          <span className="text-white font-medium">{formatCurrency(record.totalPrice)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
