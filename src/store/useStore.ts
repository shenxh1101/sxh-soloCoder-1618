import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Ingredient, PurchaseRecord, Dish, DishIngredient, DailySales } from '@/types'
import { generateId } from '@/utils/calculations'

interface StoreState {
  ingredients: Ingredient[]
  purchaseRecords: PurchaseRecord[]
  dishes: Dish[]
  dishIngredients: DishIngredient[]
  dailySales: DailySales[]

  addIngredient: (ingredient: Omit<Ingredient, 'id' | 'previousPrice'>) => string
  updateIngredientPrice: (id: string, newPrice: number) => void
  deleteIngredient: (id: string) => void

  addPurchaseRecord: (record: Omit<PurchaseRecord, 'id'>) => void
  addPurchaseRecords: (records: Omit<PurchaseRecord, 'id'>[]) => void
  deletePurchaseRecord: (id: string) => void

  addDish: (dish: Omit<Dish, 'id'>) => string
  updateDish: (id: string, updates: Partial<Dish>) => void
  deleteDish: (id: string) => void

  addDishIngredient: (di: DishIngredient) => void
  updateDishIngredient: (dishId: string, ingredientId: string, updates: Partial<DishIngredient>) => void
  removeDishIngredient: (dishId: string, ingredientId: string) => void
  setDishIngredients: (dishId: string, ingredients: DishIngredient[]) => void

  addDailySales: (sales: Omit<DailySales, 'id'>) => void
  addDailySalesBatch: (sales: Omit<DailySales, 'id'>[]) => void
  deleteDailySales: (id: string) => void
  getSalesByDate: (date: string) => DailySales[]

  exportData: () => string
  importData: (json: string) => void
  clearAllData: () => void
}

const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ingredients: [],
      purchaseRecords: [],
      dishes: [],
      dishIngredients: [],
      dailySales: [],

      addIngredient: (ingredient) => {
        const id = generateId()
        set((state) => ({
          ingredients: [
            ...state.ingredients,
            { ...ingredient, id, previousPrice: undefined },
          ],
        }))
        return id
      },

      updateIngredientPrice: (id, newPrice) =>
        set((state) => ({
          ingredients: state.ingredients.map((ing) =>
            ing.id === id
              ? {
                  ...ing,
                  previousPrice: ing.currentPrice,
                  currentPrice: newPrice,
                  lastPriceDate: new Date().toISOString().split('T')[0],
                }
              : ing
          ),
        })),

      deleteIngredient: (id) =>
        set((state) => ({
          ingredients: state.ingredients.filter((i) => i.id !== id),
          dishIngredients: state.dishIngredients.filter((di) => di.ingredientId !== id),
        })),

      addPurchaseRecord: (record) =>
        set((state) => ({
          purchaseRecords: [...state.purchaseRecords, { ...record, id: generateId() }],
        })),

      addPurchaseRecords: (records) =>
        set((state) => ({
          purchaseRecords: [
            ...state.purchaseRecords,
            ...records.map((r) => ({ ...r, id: generateId() })),
          ],
        })),

      deletePurchaseRecord: (id) =>
        set((state) => ({
          purchaseRecords: state.purchaseRecords.filter((r) => r.id !== id),
        })),

      addDish: (dish) => {
        const id = generateId()
        set((state) => ({
          dishes: [...state.dishes, { ...dish, id }],
        }))
        return id
      },

      updateDish: (id, updates) =>
        set((state) => ({
          dishes: state.dishes.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),

      deleteDish: (id) =>
        set((state) => ({
          dishes: state.dishes.filter((d) => d.id !== id),
          dishIngredients: state.dishIngredients.filter((di) => di.dishId !== id),
          dailySales: state.dailySales.filter((s) => s.dishId !== id),
        })),

      addDishIngredient: (di) =>
        set((state) => ({
          dishIngredients: [...state.dishIngredients, di],
        })),

      updateDishIngredient: (dishId, ingredientId, updates) =>
        set((state) => ({
          dishIngredients: state.dishIngredients.map((di) =>
            di.dishId === dishId && di.ingredientId === ingredientId
              ? { ...di, ...updates }
              : di
          ),
        })),

      removeDishIngredient: (dishId, ingredientId) =>
        set((state) => ({
          dishIngredients: state.dishIngredients.filter(
            (di) => !(di.dishId === dishId && di.ingredientId === ingredientId)
          ),
        })),

      setDishIngredients: (dishId, ingredients) =>
        set((state) => ({
          dishIngredients: [
            ...state.dishIngredients.filter((di) => di.dishId !== dishId),
            ...ingredients,
          ],
        })),

      addDailySales: (sales) =>
        set((state) => ({
          dailySales: [...state.dailySales, { ...sales, id: generateId() }],
        })),

      addDailySalesBatch: (sales) =>
        set((state) => ({
          dailySales: [
            ...state.dailySales,
            ...sales.map((s) => ({ ...s, id: generateId() })),
          ],
        })),

      deleteDailySales: (id) =>
        set((state) => ({
          dailySales: state.dailySales.filter((s) => s.id !== id),
        })),

      getSalesByDate: (date) => {
        return get().dailySales.filter((s) => s.date === date)
      },

      exportData: () => {
        const state = get()
        return JSON.stringify(
          {
            ingredients: state.ingredients,
            purchaseRecords: state.purchaseRecords,
            dishes: state.dishes,
            dishIngredients: state.dishIngredients,
            dailySales: state.dailySales,
          },
          null,
          2
        )
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json)
          set({
            ingredients: data.ingredients || [],
            purchaseRecords: data.purchaseRecords || [],
            dishes: data.dishes || [],
            dishIngredients: data.dishIngredients || [],
            dailySales: data.dailySales || [],
          })
        } catch {
          console.error('导入数据失败：JSON格式无效')
        }
      },

      clearAllData: () =>
        set({
          ingredients: [],
          purchaseRecords: [],
          dishes: [],
          dishIngredients: [],
          dailySales: [],
        }),
    }),
    {
      name: 'restaurant-cost-manager',
    }
  )
)

export default useStore
