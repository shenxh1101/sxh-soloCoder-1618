import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, ChefHat, Calculator, BarChart3, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/purchase', label: '采购管理', icon: ShoppingCart },
  { path: '/recipes', label: '菜品配方', icon: ChefHat },
  { path: '/daily', label: '日终结算', icon: Calculator },
  { path: '/stats', label: '统计分析', icon: BarChart3 },
]

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const navContent = (
    <nav className="flex flex-col gap-1 px-3 mt-4">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.path)
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
              active
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                : 'text-gray-400 hover:text-white hover:bg-surface-700'
            )}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-surface-800 rounded-lg text-white shadow-lg"
      >
        <Menu size={24} />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-surface-900 border-r border-surface-700 z-50 transition-transform duration-300',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center">
              <ChefHat size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-serif font-bold text-lg leading-tight">味道管家</h1>
              <p className="text-gray-500 text-xs">采购·成本·利润</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        {navContent}
      </aside>
    </>
  )
}
