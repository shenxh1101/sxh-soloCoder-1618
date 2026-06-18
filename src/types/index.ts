export type DishCategory = '小炒' | '盖饭' | '面条' | '汤'

export interface Ingredient {
  id: string
  name: string
  unit: string
  currentPrice: number
  lastPriceDate: string
  previousPrice?: number
}

export interface PurchaseRecord {
  id: string
  date: string
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
}

export interface Dish {
  id: string
  name: string
  category: DishCategory
  sellingPrice: number
  targetMargin: number
}

export interface DishIngredient {
  dishId: string
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: string
}

export interface DailySales {
  id: string
  date: string
  dishId: string
  dishName: string
  category: DishCategory
  portionsSold: number
  sellingPrice: number
  costPerPortion: number
  revenue: number
  totalCost: number
  grossProfit: number
  grossMargin: number
}

export interface PriceChangeAlert {
  ingredientId: string
  ingredientName: string
  oldPrice: number
  newPrice: number
  changePercent: number
  affectedDishes: string[]
}

export interface PriceSuggestion {
  dishId: string
  dishName: string
  currentCost: number
  currentPrice: number
  suggestedPrice: number
  targetMargin: number
  priceIncrease: number
  currentMargin: number
  marginGap: number
}

export interface IngredientStock {
  ingredientId: string
  ingredientName: string
  unit: string
  stock: number
  totalPurchased: number
  totalConsumed: number
  lowThreshold: number
  affectedDishes: string[]
}

export interface RestockSuggestion {
  ingredientId: string
  ingredientName: string
  unit: string
  currentStock: number
  dailyConsumption: number
  daysRemaining: number
  suggestedPurchase: number
  priority: 'high' | 'medium' | 'low'
  affectedHighSalesDishes: string[]
  estimatedCost: number
  consumingDishes: { dishName: string; dailyUsage: number; portions: number }[]
}

export type DishHealthCategory = 'star' | 'problem' | 'niche' | 'hidden' | 'normal'

export interface DishHealthAnalysis {
  dishId: string
  dishName: string
  category: DishHealthCategory
  categoryLabel: string
  totalPortions: number
  totalRevenue: number
  totalProfit: number
  margin: number
  avgDailyPortions: number
  suggestion: string
  detail: string
}

export interface PurchasePriorityItem {
  ingredientId: string
  ingredientName: string
  unit: string
  currentStock: number
  daysRemaining: number
  suggestedPurchase: number
  estimatedCost: number
  priority: 'high' | 'medium' | 'low'
  affectsHotDishes: boolean
  affectedHighSalesDishes: string[]
  consumingDishes: { dishName: string; dailyUsage: number; portions: number }[]
}
