import type { Ingredient, DishIngredient, Dish, PriceSuggestion, IngredientStock, PurchaseRecord, DailySales } from '@/types'

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
