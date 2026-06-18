import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Purchase from '@/pages/Purchase'
import Recipes from '@/pages/Recipes'
import DailySettlement from '@/pages/DailySettlement'
import Statistics from '@/pages/Statistics'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/purchase" element={<Purchase />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/daily" element={<DailySettlement />} />
          <Route path="/stats" element={<Statistics />} />
        </Route>
      </Routes>
    </Router>
  )
}
