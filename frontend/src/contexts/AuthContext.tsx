import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authTokenStorage, login as apiLogin, me as apiMe, register as apiRegister } from '../api'

export type AuthUser = {
  id: string
  email: string
  role: string
  fullName?: string | null
}

type AuthContextValue = {
  token: string | null
  user: AuthUser | null
  loading: boolean
  login(email: string, password: string): Promise<void>
  register(email: string, password: string, fullName?: string): Promise<void>
  logout(): void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(authTokenStorage.get())
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function syncFromToken() {
      try {
        const t = authTokenStorage.get()
        setToken(t)
        if (!t) {
          setUser(null)
          return
        }
        const data = await apiMe()
        if (!active) return
        setUser(data)
      } catch {
        authTokenStorage.clear()
        if (active) {
          setToken(null)
          setUser(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void syncFromToken()
    const handler = () => void syncFromToken()
    window.addEventListener('ecopulse.auth', handler)
    return () => {
      active = false
      window.removeEventListener('ecopulse.auth', handler)
    }
  }, [])

  async function login(email: string, password: string) {
    const resp = await apiLogin(email, password)
    setToken(resp.accessToken)
    setUser(resp.user)
  }

  async function register(email: string, password: string, fullName?: string) {
    const resp = await apiRegister(email, password, fullName)
    setToken(resp.accessToken)
    setUser(resp.user)
  }

  function logout() {
    authTokenStorage.clear()
    setToken(null)
    setUser(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, loading, login, register, logout }),
    [token, user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
