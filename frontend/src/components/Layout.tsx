import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { StickyBudgetBanner } from './StickyBudgetBanner'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/calculator', label: 'Calculator' },
  { to: '/comparison', label: 'Model Comparison' },
  { to: '/advisor', label: 'Advisor' },
  { to: '/budget', label: 'Carbon Budget' },
  { to: '/green-mode', label: 'Green Mode' },
  { to: '/reports', label: 'Reports' }
]

export default function Layout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  function onLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-sm font-bold tracking-wide text-emerald-400">
            EcoPulse AI
          </Link>
          <nav className="hidden gap-2 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  'rounded-lg px-3 py-2 text-sm ' +
                  (isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="hidden text-right md:block">
                <div className="text-xs font-semibold text-slate-200">{user.fullName || user.email}</div>
                <div className="text-[11px] text-slate-500">{user.role}</div>
              </div>
            ) : null}
            <button
              onClick={onLogout}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <StickyBudgetBanner />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-900 py-6">
        <div className="mx-auto max-w-6xl px-4 text-xs text-slate-500">
          EcoPulse AI © {new Date().getFullYear()} – Green Intelligence Monitor
        </div>
      </footer>
    </div>
  )
}
