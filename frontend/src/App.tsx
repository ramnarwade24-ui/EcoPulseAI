import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Calculator from './pages/Calculator'
import ModelComparison from './pages/ModelComparison'
import Advisor from './pages/Advisor'
import CarbonBudget from './pages/CarbonBudget'
import GreenMode from './pages/GreenMode'
import Scheduler from './pages/Scheduler'
import Reports from './pages/Reports'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/comparison" element={<ModelComparison />} />
          <Route path="/advisor" element={<Advisor />} />
          <Route path="/budget" element={<CarbonBudget />} />
          <Route path="/green-mode" element={<GreenMode />} />
          <Route path="/scheduler" element={<Scheduler />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
