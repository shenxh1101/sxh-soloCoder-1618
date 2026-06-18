import type { Ingredient, DishIngredient, Dish, PriceSuggestion, IngredientStock, PurchaseRecord, DailySales, RestockSuggestion, DishCategory } from '@/types'

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
  lookbackDays: number = 7
): RestockSuggestion[] {
  const stocks = calculateIngredientStocks(ingredients, purchaseRecords, dailySales, dishIngredients, dishes)

  const uniqueDates = Array.from(new Set(dailySales.map((s) => s.date))).sort()
  const recentDates = uniqueDates.slice(-lookbackDays)
  const daysWithSales = recentDates.length

  const dishTotalPortions = new Map<string, number>()
  dailySales
    .filter((s) => recentDates.includes(s.date))
    .forEach((s) => {
      dishTotalPortions.set(s.dishId, (dishTotalPortions.get(s.dishId) || 0) + s.portionsSold)
    })

  const highSalesDishIds = Array.from(dishTotalPortions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)
  const highSalesDishNames = new Set(
    highSalesDishIds.map((id) => dishes.find((d) => d.id === id)?.name || '')
  )

  return stocks.map((stock) => {
    let dailyConsumption = 0
    if (daysWithSales > 0) {
      dailyConsumption = stock.totalConsumed / daysWithSales
    }

    const daysRemaining = dailyConsumption > 0 ? stock.stock / dailyConsumption : 999
    const targetStock = dailyConsumption * 7
    const suggestedPurchase = Math.max(0, Math.round((targetStock - stock.stock) * 10) / 10)

    let priority: 'high' | 'medium' | 'low' = 'low'
    if (stock.stock <= 0 || daysRemaining <= 1) {
      priority = 'high'
    } else if (daysRemaining <= 3) {
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
    }
  })
}
