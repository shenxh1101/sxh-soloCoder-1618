import type {
  Ingredient, DishIngredient, Dish, PriceSuggestion, IngredientStock,
  PurchaseRecord, DailySales, RestockSuggestion, DishCategory,
  DishHealthAnalysis, DishHealthCategory
} from '@/types'
import { format } from 'date-fns'

export function calculateDishCost(
  dishIngredients: DishIngredient[],
  ingredients: Ingredient[]
): number {
  return dishIngredients.reduce((total, di) => {
    const ingredient = ingredients.find((i) => i.id === di.ingredientId)
    if (!ingredient) return total
    return total + di.quantity * ingredient.currentPrice
  }, 0)
}

export function calculateGrossMargin(sellingPrice: number, cost: number): number {
  if (sellingPrice === 0) return 0
  return ((sellingPrice - cost) / sellingPrice) * 100
}

export function calculateGrossProfit(sellingPrice: number, cost: number): number {
  return sellingPrice - cost
}

export function suggestPrice(
  dish: Dish,
  dishIngredients: DishIngredient[],
  ingredients: Ingredient[]
): PriceSuggestion {
  const currentCost = calculateDishCost(dishIngredients, ingredients)
  const currentMargin = calculateGrossMargin(dish.sellingPrice, currentCost)
  const marginGap = Math.round((dish.targetMargin - currentMargin) * 10) / 10
  const suggestedPrice = dish.targetMargin >= 100
    ? dish.sellingPrice
    : currentCost / (1 - dish.targetMargin / 100)
  const priceIncrease = suggestedPrice - dish.sellingPrice

  return {
    dishId: dish.id,
    dishName: dish.name,
    currentCost,
    currentPrice: dish.sellingPrice,
    suggestedPrice: Math.ceil(suggestedPrice * 10) / 10,
    targetMargin: dish.targetMargin,
    priceIncrease: Math.round(priceIncrease * 100) / 100,
    currentMargin: Math.round(currentMargin * 10) / 10,
    marginGap,
  }
}

export function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function getPriceChangePercent(oldPrice: number, newPrice: number): number {
  if (oldPrice === 0) return 0
  return ((newPrice - oldPrice) / oldPrice) * 100
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

export function calculateIngredientStocks(
  ingredients: Ingredient[],
  purchaseRecords: PurchaseRecord[],
  dailySales: DailySales[],
  dishIngredients: DishIngredient[],
  dishes: Dish[]
): IngredientStock[] {
  return ingredients.map((ing) => {
    const totalPurchased = purchaseRecords
      .filter((r) => r.ingredientId === ing.id)
      .reduce((sum, r) => sum + r.quantity, 0)

    let totalConsumed = 0
    dailySales.forEach((sale) => {
      const recipeItems = dishIngredients.filter((di) => di.dishId === sale.dishId)
      const usedInDish = recipeItems.find((di) => di.ingredientId === ing.id)
      if (usedInDish) {
        totalConsumed += usedInDish.quantity * sale.portionsSold
      }
    })

    const stock = Math.max(0, Math.round((totalPurchased - totalConsumed) * 1000) / 1000)
    const affectedDishes = dishIngredients
      .filter((di) => di.ingredientId === ing.id)
      .map((di) => {
        const dish = dishes.find((d) => d.id === di.dishId)
        return dish ? dish.name : ''
      })
      .filter(Boolean)

    const lowThreshold = Math.max(1, totalPurchased / 7)

    return {
      ingredientId: ing.id,
      ingredientName: ing.name,
      unit: ing.unit,
      stock,
      totalPurchased: Math.round(totalPurchased * 100) / 100,
      totalConsumed: Math.round(totalConsumed * 100) / 100,
      lowThreshold: Math.round(lowThreshold * 100) / 100,
      affectedDishes,
    }
  })
}

export interface CategoryStats {
  category: DishCategory
  totalRevenue: number
  totalProfit: number
  totalPortions: number
  revenueShare: number
  profitShare: number
  portionsShare: number
  margin: number
  dishes: { id: string; name: string; totalRevenue: number; totalProfit: number; totalPortions: number; margin: number }[]
}

export function calculateCategoryStats(
  filteredSales: DailySales[],
  allSales: DailySales[]
): CategoryStats[] {
  const categoryMap = new Map<DishCategory, {
    totalRevenue: number
    totalProfit: number
    totalPortions: number
    dishes: Map<string, { name: string; totalRevenue: number; totalProfit: number; totalPortions: number; totalCost: number }>
  }>()

  const totalRevenueAll = filteredSales.reduce((s, r) => s + r.revenue, 0)
  const totalProfitAll = filteredSales.reduce((s, r) => s + r.grossProfit, 0)
  const totalPortionsAll = filteredSales.reduce((s, r) => s + r.portionsSold, 0)

  filteredSales.forEach((sale) => {
    const cat = categoryMap.get(sale.category) || {
      totalRevenue: 0,
      totalProfit: 0,
      totalPortions: 0,
      dishes: new Map(),
    }
    cat.totalRevenue += sale.revenue
    cat.totalProfit += sale.grossProfit
    cat.totalPortions += sale.portionsSold

    const dish = cat.dishes.get(sale.dishId) || {
      name: sale.dishName,
      totalRevenue: 0,
      totalProfit: 0,
      totalPortions: 0,
      totalCost: 0,
    }
    dish.totalRevenue += sale.revenue
    dish.totalProfit += sale.grossProfit
    dish.totalPortions += sale.portionsSold
    dish.totalCost += sale.totalCost
    cat.dishes.set(sale.dishId, dish)

    categoryMap.set(sale.category, cat)
  })

  const categories: DishCategory[] = ['小炒', '盖饭', '面条', '汤']
  return categories
    .filter((cat) => categoryMap.has(cat))
    .map((category) => {
      const data = categoryMap.get(category)!
      const revenueShare = totalRevenueAll > 0 ? (data.totalRevenue / totalRevenueAll) * 100 : 0
      const profitShare = totalProfitAll > 0 ? (data.totalProfit / totalProfitAll) * 100 : 0
      const portionsShare = totalPortionsAll > 0 ? (data.totalPortions / totalPortionsAll) * 100 : 0
      const margin = data.totalRevenue > 0 ? (data.totalProfit / data.totalRevenue) * 100 : 0

      const dishes = Array.from(data.dishes.entries()).map(([id, d]) => ({
        id,
        name: d.name,
        totalRevenue: d.totalRevenue,
        totalProfit: d.totalProfit,
        totalPortions: d.totalPortions,
        margin: d.totalRevenue > 0 ? Math.round((d.totalProfit / d.totalRevenue) * 1000) / 10 : 0,
      }))

      return {
        category,
        totalRevenue: data.totalRevenue,
        totalProfit: data.totalProfit,
        totalPortions: data.totalPortions,
        revenueShare: Math.round(revenueShare * 10) / 10,
        profitShare: Math.round(profitShare * 10) / 10,
        portionsShare: Math.round(portionsShare * 10) / 10,
        margin: Math.round(margin * 10) / 10,
        dishes,
      }
    })
}

export function calculateRestockSuggestions(
  ingredients: Ingredient[],
  purchaseRecords: PurchaseRecord[],
  dailySales: DailySales[],
  dishIngredients: DishIngredient[],
  dishes: Dish[],
  lookbackDays: number = 7,
  endDate?: string
): RestockSuggestion[] {
  const stocks = calculateIngredientStocks(ingredients, purchaseRecords, dailySales, dishIngredients, dishes)

  const effectiveEndDate = endDate || format(new Date(), 'yyyy-MM-dd')
  const end = new Date(effectiveEndDate)
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(start.getDate() - lookbackDays + 1)
  start.setHours(0, 0, 0, 0)

  const naturalDaysInWindow = lookbackDays

  const recentDateSet = new Set<string>()
  for (let i = 0; i < lookbackDays; i++) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    recentDateSet.add(format(d, 'yyyy-MM-dd'))
  }

  const dishPortionsInWindow = new Map<string, number>()
  dailySales
    .filter((s) => recentDateSet.has(s.date))
    .forEach((s) => {
      dishPortionsInWindow.set(s.dishId, (dishPortionsInWindow.get(s.dishId) || 0) + s.portionsSold)
    })

  const highSalesDishIds = Array.from(dishPortionsInWindow.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)
  const highSalesDishNames = new Set(
    highSalesDishIds.map((id) => dishes.find((d) => d.id === id)?.name || '')
  )

  const dishAvgDailyPortions = new Map<string, number>()
  dishPortionsInWindow.forEach((portions, dishId) => {
    dishAvgDailyPortions.set(dishId, portions / naturalDaysInWindow)
  })

  const ingredientDailyConsumption = new Map<string, number>()
  const ingredientConsumingDishes = new Map<string, { dishName: string; dailyUsage: number; portions: number }[]>()

  dishIngredients.forEach((di) => {
    const avgDailyPortions = dishAvgDailyPortions.get(di.dishId) || 0
    const totalPortions = dishPortionsInWindow.get(di.dishId) || 0
    if (avgDailyPortions <= 0) return

    const dailyUsage = avgDailyPortions * di.quantity
    const current = ingredientDailyConsumption.get(di.ingredientId) || 0
    ingredientDailyConsumption.set(di.ingredientId, current + dailyUsage)

    const dish = dishes.find((d) => d.id === di.dishId)
    if (dish) {
      const consumingList = ingredientConsumingDishes.get(di.ingredientId) || []
      consumingList.push({
        dishName: dish.name,
        dailyUsage: Math.round(dailyUsage * 1000) / 1000,
        portions: totalPortions,
      })
      ingredientConsumingDishes.set(di.ingredientId, consumingList)
    }
  })

  return stocks.map((stock) => {
    const ingredient = ingredients.find((i) => i.id === stock.ingredientId)
    const dailyConsumption = ingredientDailyConsumption.get(stock.ingredientId) || 0
    const consumingDishes = ingredientConsumingDishes.get(stock.ingredientId) || []

    const daysRemaining = dailyConsumption > 0 ? stock.stock / dailyConsumption : 999
    const targetStock = dailyConsumption * 7
    const suggestedPurchase = Math.max(0, Math.round((targetStock - stock.stock) * 10) / 10)
    const estimatedCost = Math.round(suggestedPurchase * (ingredient?.currentPrice || 0) * 100) / 100

    let priority: 'high' | 'medium' | 'low' = 'low'
    if (stock.stock <= 0 || (dailyConsumption > 0 && daysRemaining <= 1)) {
      priority = 'high'
    } else if (dailyConsumption > 0 && daysRemaining <= 3) {
      priority = 'medium'
    }

    const affectedHighSalesDishes = stock.affectedDishes.filter((name) => highSalesDishNames.has(name))

    return {
      ingredientId: stock.ingredientId,
      ingredientName: stock.ingredientName,
      unit: stock.unit,
      currentStock: stock.stock,
      dailyConsumption: Math.round(dailyConsumption * 1000) / 1000,
      daysRemaining: dailyConsumption > 0 ? Math.round(daysRemaining * 10) / 10 : Infinity,
      suggestedPurchase,
      priority,
      affectedHighSalesDishes,
      estimatedCost,
      consumingDishes: consumingDishes.sort((a, b) => b.dailyUsage - a.dailyUsage),
    }
  })
}

export function calculateDishHealth(
  filteredSales: DailySales[],
  dishes: Dish[],
  dishIngredients: DishIngredient[],
  ingredients: Ingredient[],
  lookbackDays: number
): DishHealthAnalysis[] {
  const uniqueDates = Array.from(new Set(filteredSales.map((s) => s.date))).sort()
  const daysInWindow = Math.min(uniqueDates.length, lookbackDays)

  const dishStats = new Map<string, {
    name: string
    category: string
    totalPortions: number
    totalRevenue: number
    totalProfit: number
    totalCost: number
  }>()

  filteredSales.forEach((s) => {
    const existing = dishStats.get(s.dishId) || {
      name: s.dishName,
      category: s.category,
      totalPortions: 0,
      totalRevenue: 0,
      totalProfit: 0,
      totalCost: 0,
    }
    existing.totalPortions += s.portionsSold
    existing.totalRevenue += s.revenue
    existing.totalProfit += s.grossProfit
    existing.totalCost += s.totalCost
    dishStats.set(s.dishId, existing)
  })

  const allPortions = Array.from(dishStats.values()).map((d) => d.totalPortions)
  const allMargins = Array.from(dishStats.values()).map((d) => d.totalRevenue > 0 ? (d.totalProfit / d.totalRevenue) * 100 : 0)
  const avgPortions = allPortions.length > 0 ? allPortions.reduce((a, b) => a + b, 0) / allPortions.length : 0
  const avgMargin = allMargins.length > 0 ? allMargins.reduce((a, b) => a + b, 0) / allMargins.length : 0

  const results: DishHealthAnalysis[] = []

  dishStats.forEach((stats, dishId) => {
    const dish = dishes.find((d) => d.id === dishId)
    if (!dish) return

    const margin = stats.totalRevenue > 0 ? Math.round((stats.totalProfit / stats.totalRevenue) * 1000) / 10 : 0
    const avgDailyPortions = daysInWindow > 0 ? stats.totalPortions / daysInWindow : 0
    const priceSuggestion = suggestPrice(dish, dishIngredients.filter((di) => di.dishId === dishId), ingredients)
    const needsPriceIncrease = priceSuggestion.marginGap > 0 && priceSuggestion.priceIncrease > 0

    let category: DishHealthCategory = 'normal'
    let categoryLabel = '表现正常'
    let suggestion = '继续观察'
    let detail = ''

    const isHighSales = stats.totalPortions >= avgPortions * 0.8
    const isLowSales = stats.totalPortions < avgPortions * 0.5
    const isHighMargin = margin >= avgMargin + 5
    const isLowMargin = margin < avgMargin - 5

    if (isHighSales && isHighMargin) {
      category = 'star'
      categoryLabel = '明星菜品'
      suggestion = '重点推广，可考虑小幅涨价'
      detail = `销量远高于平均（日均${avgDailyPortions.toFixed(1)}份），毛利率${formatPercent(margin)}表现优秀，是店铺核心收入来源`
    } else if (isHighSales && isLowMargin) {
      category = 'problem'
      categoryLabel = '问题菜品'
      suggestion = needsPriceIncrease ? '建议涨价' : '优化配方降低成本'
      detail = `销量很高（日均${avgDailyPortions.toFixed(1)}份）但毛利率仅${formatPercent(margin)}，低于平均水平${formatPercent(avgMargin - margin)}，${needsPriceIncrease ? `建议售价从${formatCurrency(dish.sellingPrice)}上调至${formatCurrency(priceSuggestion.suggestedPrice)}` : '需要检查食材采购成本或调整配方用量'}`
    } else if (isLowSales && isHighMargin) {
      category = 'hidden'
      categoryLabel = '潜力菜品'
      suggestion = '可做套餐搭配或促销推广'
      detail = `毛利率${formatPercent(margin)}表现优秀，但销量偏低（日均${avgDailyPortions.toFixed(1)}份），可能是定价或知名度问题，可尝试与爆款搭配销售`
    } else if (isLowSales && isLowMargin) {
      category = 'niche'
      categoryLabel = '待优化'
      suggestion = '考虑下架或重新定位'
      detail = `销量（日均${avgDailyPortions.toFixed(1)}份）和毛利率（${formatPercent(margin)}）双低，投入产出比不理想，建议评估是否继续保留`
    } else if (needsPriceIncrease) {
      category = 'problem'
      categoryLabel = '需调价'
      suggestion = '建议涨价'
      detail = `当前毛利率${formatPercent(margin)}低于目标${formatPercent(dish.targetMargin)}，建议售价从${formatCurrency(dish.sellingPrice)}上调至${formatCurrency(priceSuggestion.suggestedPrice)}，涨价${formatCurrency(priceSuggestion.priceIncrease)}`
    }

    results.push({
      dishId,
      dishName: stats.name,
      category,
      categoryLabel,
      totalPortions: stats.totalPortions,
      totalRevenue: stats.totalRevenue,
      totalProfit: stats.totalProfit,
      margin,
      avgDailyPortions: Math.round(avgDailyPortions * 10) / 10,
      suggestion,
      detail,
    })
  })

  return results.sort((a, b) => {
    const categoryOrder: Record<DishHealthCategory, number> = {
      problem: 0,
      star: 1,
      hidden: 2,
      niche: 3,
      normal: 4,
    }
    return categoryOrder[a.category] - categoryOrder[b.category]
  })
}

