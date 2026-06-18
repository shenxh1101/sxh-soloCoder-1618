import { Link } from 'react-router-dom'
import { ShoppingCart, Calculator, ChefHat, TrendingUp, DollarSign, Package, ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import useStore from '@/store/useStore'
import { calculateDishCost, formatCurrency, formatPercent } from '@/utils/calculations'
import { format, subDays } from 'date-fns'

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4 },
  }),
}

export default function Dashboard() {
  const { ingredients, purchaseRecords, dishes, dishIngredients, dailySales } = useStore()

  const today = format(new Date(), 'yyyy-MM-dd')

  const todayPurchases = purchaseRecords.filter((r) => r.date === today)
  const todayPurchaseTotal = todayPurchases.reduce((sum, r) => sum + r.totalPrice, 0)

  const todaySales = dailySales.filter((s) => s.date === today)
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.revenue, 0)
  const todayProfit = todaySales.reduce((sum, s) => sum + s.grossProfit, 0)
  const todayMargin = todayRevenue > 0 ? (todayProfit / todayRevenue) * 100 : 0

  const dishProfits = dishes.map((dish) => {
    const recipeItems = dishIngredients.filter((di) => di.dishId === dish.id)
    const cost = calculateDishCost(recipeItems, ingredients)
    const margin = dish.sellingPrice > 0 ? ((dish.sellingPrice - cost) / dish.sellingPrice) * 100 : 0
    return { name: dish.name, margin, profit: dish.sellingPrice - cost }
  })
  const bestDish = dishProfits.length > 0
    ? dishProfits.reduce((best, d) => (d.profit > best.profit ? d : best), dishProfits[0])
    : null

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
    const daySales = dailySales.filter((s) => s.date === date)
    const revenue = daySales.reduce((sum, s) => sum + s.revenue, 0)
    const profit = daySales.reduce((sum, s) => sum + s.grossProfit, 0)
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0
    return { date: format(new Date(date), 'MM/dd'), margin: Math.round(margin * 10) / 10, profit }
  })

  const overviewCards = [
    {
      label: '今日采购',
      value: formatCurrency(todayPurchaseTotal),
      icon: ShoppingCart,
      color: 'from-brand-500 to-brand-600',
      link: '/purchase',
    },
    {
      label: '今日营业额',
      value: formatCurrency(todayRevenue),
      icon: DollarSign,
      color: 'from-blue-500 to-blue-600',
      link: '/daily',
    },
    {
      label: '今日毛利率',
      value: formatPercent(todayMargin),
      icon: TrendingUp,
      color: todayMargin >= 50 ? 'from-profit to-emerald-600' : 'from-loss to-red-600',
      link: '/daily',
    },
    {
      label: '最赚菜品',
      value: bestDish ? bestDish.name : '--',
      icon: ChefHat,
      color: 'from-amber-500 to-amber-600',
      link: '/recipes',
    },
  ]

  const recentSales = dailySales
    .filter((s) => s.date === today)
    .sort((a, b) => b.grossProfit - a.grossProfit)

  const priceAlerts = ingredients
    .filter((i) => i.previousPrice !== undefined && i.previousPrice !== null)
    .map((i) => {
      const change = ((i.currentPrice - i.previousPrice!) / i.previousPrice!) * 100
      return { ...i, change: Math.round(change * 10) / 10 }
    })
    .filter((i) => Math.abs(i.change) >= 10)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">今日概览</h1>
          <p className="text-gray-400 text-sm mt-1">{format(new Date(), 'yyyy年MM月dd日 EEEE')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {overviewCards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <Link
                to={card.link}
                className="block bg-surface-800 rounded-xl p-5 border border-surface-700 hover:border-brand-500/30 transition-all duration-300 hover:-translate-y-0.5 group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-400 text-xs font-medium">{card.label}</p>
                    <p className="text-2xl font-bold text-white mt-2">{card.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                    <Icon size={20} className="text-white" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-brand-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>查看详情</span>
                  <ArrowUpRight size={12} />
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-800 rounded-xl p-6 border border-surface-700">
          <h2 className="text-lg font-serif font-semibold text-white mb-4">近7日毛利趋势</h2>
          {last7Days.some((d) => d.margin > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="marginGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8652E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E8652E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E2E42" />
                <XAxis dataKey="date" stroke="#666" tick={{ fill: '#999', fontSize: 12 }} />
                <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 12 }} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#262637',
                    border: '1px solid #3A3A50',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: number) => [`${value}%`, '毛利率']}
                />
                <Area
                  type="monotone"
                  dataKey="margin"
                  stroke="#E8652E"
                  strokeWidth={2}
                  fill="url(#marginGradient)"
                  dot={{ fill: '#E8652E', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#E8652E' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Package size={48} className="mx-auto mb-3 opacity-30" />
                <p>暂无销售数据</p>
                <p className="text-xs mt-1">录入今日销售后即可查看趋势</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
            <h2 className="text-lg font-serif font-semibold text-white mb-4">快捷入口</h2>
            <div className="space-y-3">
              <Link
                to="/purchase"
                className="flex items-center gap-3 p-3 rounded-lg bg-surface-700/50 hover:bg-brand-500/10 border border-transparent hover:border-brand-500/30 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center">
                  <ShoppingCart size={18} className="text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">录入采购</p>
                  <p className="text-xs text-gray-500">记录今日采购食材</p>
                </div>
              </Link>
              <Link
                to="/daily"
                className="flex items-center gap-3 p-3 rounded-lg bg-surface-700/50 hover:bg-brand-500/10 border border-transparent hover:border-brand-500/30 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Calculator size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">日终结算</p>
                  <p className="text-xs text-gray-500">录入销售、查看利润</p>
                </div>
              </Link>
              <Link
                to="/recipes"
                className="flex items-center gap-3 p-3 rounded-lg bg-surface-700/50 hover:bg-brand-500/10 border border-transparent hover:border-brand-500/30 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <ChefHat size={18} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">菜品配方</p>
                  <p className="text-xs text-gray-500">管理菜品与成本</p>
                </div>
              </Link>
            </div>
          </div>

          {priceAlerts.length > 0 && (
            <div className="bg-surface-800 rounded-xl p-6 border border-loss/30">
              <h2 className="text-lg font-serif font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp size={18} className="text-loss" />
                进价变动提醒
              </h2>
              <div className="space-y-2">
                {priceAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{alert.name}</span>
                    <span className={alert.change > 0 ? 'text-loss' : 'text-profit'}>
                      {alert.change > 0 ? '↑' : '↓'} {Math.abs(alert.change)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {recentSales.length > 0 && (
        <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
          <h2 className="text-lg font-serif font-semibold text-white mb-4">今日菜品利润排行</h2>
          <div className="space-y-2">
            {recentSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-300">{sale.dishName}</span>
                  <span className="text-xs text-gray-500">×{sale.portionsSold}份</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">{formatCurrency(sale.revenue)}</span>
                  <span className={`text-sm font-medium ${sale.grossMargin >= 50 ? 'text-profit' : 'text-loss'}`}>
                    {formatPercent(sale.grossMargin)}
                  </span>
                  <span className={`text-sm font-bold ${sale.grossProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatCurrency(sale.grossProfit)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
