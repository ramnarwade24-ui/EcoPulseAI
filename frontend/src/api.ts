import axios from 'axios'

// Dev: talk directly to Spring on localhost:8080.
// Prod (nginx container / hosted): use same-origin /api and let nginx proxy it.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api')

export const authTokenStorage = {
  get(): string | null {
    return localStorage.getItem('ecopulse.token')
  },
  set(token: string) {
    localStorage.setItem('ecopulse.token', token)
    window.dispatchEvent(new Event('ecopulse.auth'))
  },
  clear() {
    localStorage.removeItem('ecopulse.token')
    window.dispatchEvent(new Event('ecopulse.auth'))
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000
})

api.interceptors.request.use((config) => {
  const token = authTokenStorage.get()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    const status = err?.response?.status
    if (status === 401) {
      authTokenStorage.clear()
    }
    return Promise.reject(err)
  }
)

export type AuthResponse = {
  accessToken: string
  user: { id: string; email: string; role: string; fullName?: string | null }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
  authTokenStorage.set(data.accessToken)
  return data
}

export async function register(email: string, password: string, fullName?: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', { email, password, fullName })
  authTokenStorage.set(data.accessToken)
  return data
}

export async function me() {
  const { data } = await api.get('/auth/me')
  return data
}
