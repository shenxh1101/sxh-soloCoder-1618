import type { Ingredient, DishIngredient, Dish, PriceSuggestion } from '@/types'

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
  const suggestedPrice = dish.targetMargin >= 1
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
