import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-surface-900 text-white font-sans">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
