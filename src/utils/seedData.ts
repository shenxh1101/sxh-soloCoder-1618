import useStore from '@/store/useStore'
import { format, subDays } from 'date-fns'

export function seedDemoData() {
  const store = useStore.getState()

  if (store.ingredients.length > 0 || store.dishes.length > 0) return

  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const dayBefore = format(subDays(new Date(), 2), 'yyyy-MM-dd')

  const ingredientsData = [
    { name: '猪肉', unit: '斤', currentPrice: 18, lastPriceDate: today },
    { name: '鸡肉', unit: '斤', currentPrice: 13, lastPriceDate: yesterday },
    { name: '鸡蛋', unit: '斤', currentPrice: 6, lastPriceDate: dayBefore },
    { name: '豆腐', unit: '块', currentPrice: 2, lastPriceDate: today },
    { name: '白菜', unit: '斤', currentPrice: 2.5, lastPriceDate: yesterday },
    { name: '土豆', unit: '斤', currentPrice: 3, lastPriceDate: dayBefore },
    { name: '西红柿', unit: '斤', currentPrice: 4, lastPriceDate: today },
    { name: '面条', unit: '斤', currentPrice: 4, lastPriceDate: dayBefore },
    { name: '大米', unit: '斤', currentPrice: 3.5, lastPriceDate: dayBefore },
    { name: '食用油', unit: '斤', currentPrice: 8, lastPriceDate: dayBefore },
    { name: '酱油', unit: '瓶', currentPrice: 12, lastPriceDate: dayBefore },
    { name: '盐', unit: '袋', currentPrice: 3, lastPriceDate: dayBefore },
    { name: '葱', unit: '斤', currentPrice: 5, lastPriceDate: today },
    { name: '姜', unit: '斤', currentPrice: 8, lastPriceDate: dayBefore },
    { name: '蒜', unit: '斤', currentPrice: 7, lastPriceDate: dayBefore },
    { name: '排骨', unit: '斤', currentPrice: 28, lastPriceDate: yesterday },
    { name: '牛肉', unit: '斤', currentPrice: 38, lastPriceDate: today },
    { name: '青椒', unit: '斤', currentPrice: 5, lastPriceDate: dayBefore },
  ]

  ingredientsData.forEach((ing) => {
    store.addIngredient(ing)
  })

  const stateAfterIngredients = useStore.getState()
  const ingredientMap = new Map(stateAfterIngredients.ingredients.map((i) => [i.name, i.id]))

  const dishesData = [
    { name: '宫保鸡丁', category: '小炒' as const, sellingPrice: 28, targetMargin: 55 },
    { name: '鱼香肉丝', category: '小炒' as const, sellingPrice: 26, targetMargin: 55 },
    { name: '红烧排骨', category: '小炒' as const, sellingPrice: 38, targetMargin: 50 },
    { name: '西红柿炒蛋', category: '小炒' as const, sellingPrice: 18, targetMargin: 60 },
    { name: '青椒肉丝盖饭', category: '盖饭' as const, sellingPrice: 20, targetMargin: 55 },
    { name: '红烧肉盖饭', category: '盖饭' as const, sellingPrice: 22, targetMargin: 50 },
    { name: '土豆牛肉盖饭', category: '盖饭' as const, sellingPrice: 24, targetMargin: 50 },
    { name: '牛肉面', category: '面条' as const, sellingPrice: 18, targetMargin: 55 },
    { name: '排骨面', category: '面条' as const, sellingPrice: 16, targetMargin: 55 },
    { name: '紫菜蛋花汤', category: '汤' as const, sellingPrice: 8, targetMargin: 65 },
  ]

  const dishIdMap = new Map<string, string>()
  dishesData.forEach((dish) => {
    const id = store.addDish(dish)
    dishIdMap.set(dish.name, id)
  })

  const recipeData: [string, string, number][] = [
    ['宫保鸡丁', '鸡肉', 0.3],
    ['宫保鸡丁', '食用油', 0.05],
    ['宫保鸡丁', '酱油', 0.02],
    ['宫保鸡丁', '葱', 0.05],
    ['宫保鸡丁', '姜', 0.02],
    ['宫保鸡丁', '蒜', 0.02],
    ['鱼香肉丝', '猪肉', 0.25],
    ['鱼香肉丝', '食用油', 0.05],
    ['鱼香肉丝', '酱油', 0.02],
    ['鱼香肉丝', '葱', 0.05],
    ['红烧排骨', '排骨', 0.4],
    ['红烧排骨', '酱油', 0.03],
    ['红烧排骨', '姜', 0.03],
    ['红烧排骨', '食用油', 0.05],
    ['西红柿炒蛋', '西红柿', 0.3],
    ['西红柿炒蛋', '鸡蛋', 0.2],
    ['西红柿炒蛋', '食用油', 0.05],
    ['青椒肉丝盖饭', '猪肉', 0.2],
    ['青椒肉丝盖饭', '青椒', 0.15],
    ['青椒肉丝盖饭', '大米', 0.3],
    ['青椒肉丝盖饭', '食用油', 0.05],
    ['红烧肉盖饭', '猪肉', 0.25],
    ['红烧肉盖饭', '酱油', 0.03],
    ['红烧肉盖饭', '大米', 0.3],
    ['红烧肉盖饭', '姜', 0.02],
    ['土豆牛肉盖饭', '牛肉', 0.2],
    ['土豆牛肉盖饭', '土豆', 0.2],
    ['土豆牛肉盖饭', '大米', 0.3],
    ['土豆牛肉盖饭', '食用油', 0.05],
    ['牛肉面', '牛肉', 0.15],
    ['牛肉面', '面条', 0.3],
    ['牛肉面', '食用油', 0.03],
    ['牛肉面', '葱', 0.03],
    ['排骨面', '排骨', 0.2],
    ['排骨面', '面条', 0.3],
    ['排骨面', '葱', 0.03],
    ['紫菜蛋花汤', '鸡蛋', 0.1],
    ['紫菜蛋花汤', '盐', 0.01],
  ]

  const stateAfterDishes = useStore.getState()
  const currentIngredients = stateAfterDishes.ingredients

  recipeData.forEach(([dishName, ingredientName, quantity]) => {
    const dishId = dishIdMap.get(dishName)
    const ingredient = currentIngredients.find((i) => i.name === ingredientName)
    if (dishId && ingredient) {
      store.addDishIngredient({
        dishId,
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantity,
        unit: ingredient.unit,
      })
    }
  })

  const stateAfterRecipes = useStore.getState()
  const currentDishIngredients = stateAfterRecipes.dishIngredients
  const currentDishes = stateAfterRecipes.dishes
  const currentIngs = stateAfterRecipes.ingredients

  const salesDays = [dayBefore, yesterday, today]
  const portionsMap: Record<string, number[]> = {
    '宫保鸡丁': [8, 10, 12],
    '鱼香肉丝': [6, 7, 9],
    '红烧排骨': [5, 4, 6],
    '西红柿炒蛋': [12, 15, 14],
    '青椒肉丝盖饭': [10, 12, 11],
    '红烧肉盖饭': [8, 9, 7],
    '土豆牛肉盖饭': [6, 5, 8],
    '牛肉面': [15, 18, 20],
    '排骨面': [10, 12, 11],
    '紫菜蛋花汤': [8, 10, 9],
  }

  const allSales: Omit<import('@/types').DailySales, 'id'>[] = []

  salesDays.forEach((day, dayIdx) => {
    currentDishes.forEach((dish) => {
      const portions = portionsMap[dish.name]?.[dayIdx] || 0
      if (portions === 0) return
      const recipeItems = currentDishIngredients.filter((di) => di.dishId === dish.id)
      let costPerPortion = 0
      recipeItems.forEach((di) => {
        const ing = currentIngs.find((i) => i.id === di.ingredientId)
        if (ing) costPerPortion += di.quantity * ing.currentPrice
      })
      const revenue = portions * dish.sellingPrice
      const totalCost = portions * costPerPortion
      const grossProfit = revenue - totalCost
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

      allSales.push({
        date: day,
        dishId: dish.id,
        dishName: dish.name,
        category: dish.category,
        portionsSold: portions,
        sellingPrice: dish.sellingPrice,
        costPerPortion,
        revenue,
        totalCost,
        grossProfit,
        grossMargin,
      })
    })
  })

  store.addDailySalesBatch(allSales)

  const purchaseItems = [
    { ingredientName: '猪肉', quantity: 5, unit: '斤', unitPrice: 18 },
    { ingredientName: '鸡肉', quantity: 4, unit: '斤', unitPrice: 13 },
    { ingredientName: '牛肉', quantity: 3, unit: '斤', unitPrice: 38 },
    { ingredientName: '排骨', quantity: 3, unit: '斤', unitPrice: 28 },
    { ingredientName: '鸡蛋', quantity: 5, unit: '斤', unitPrice: 6 },
    { ingredientName: '西红柿', quantity: 3, unit: '斤', unitPrice: 4 },
    { ingredientName: '白菜', quantity: 4, unit: '斤', unitPrice: 2.5 },
    { ingredientName: '土豆', quantity: 5, unit: '斤', unitPrice: 3 },
    { ingredientName: '青椒', quantity: 2, unit: '斤', unitPrice: 5 },
    { ingredientName: '葱', quantity: 1, unit: '斤', unitPrice: 5 },
    { ingredientName: '面条', quantity: 10, unit: '斤', unitPrice: 4 },
    { ingredientName: '大米', quantity: 10, unit: '斤', unitPrice: 3.5 },
  ]

  const purchaseRecords = purchaseItems.map((item) => {
    const ing = currentIngs.find((i) => i.name === item.ingredientName)
    return {
      date: today,
      ingredientId: ing?.id || '',
      ingredientName: item.ingredientName,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
    }
  })

  store.addPurchaseRecords(purchaseRecords)
}
