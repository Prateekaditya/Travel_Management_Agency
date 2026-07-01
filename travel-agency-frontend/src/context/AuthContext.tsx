import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Auth } from '../types'
import { AUTH_STORAGE_KEY, USER_ID } from '../constants'
import { setAuthToken } from '../api/client'

function readStoredAuth(): Auth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Auth | null
    return parsed?.idToken ? parsed : null
  } catch {
    return null
  }
}

interface AuthContextValue {
  auth: Auth | null
  isLoggedIn: boolean
  isAuthReady: boolean
  effectiveUserId: string
  showAuthMenu: boolean
  setShowAuthMenu: (v: boolean) => void
  handleLogout: () => void
  handleLogin: () => void
  updateUserName: (firstName: string, lastName: string) => void
  updateUserEmail: (newEmail: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<Auth | null>(() => {
    const storedAuth = readStoredAuth()
    setAuthToken(storedAuth?.idToken ?? null)
    return storedAuth
  })
  const [showAuthMenu, setShowAuthMenu] = useState(false)

  const isLoggedIn = Boolean(auth?.idToken)
  const effectiveUserId = auth?.userId || USER_ID

  useEffect(() => {
    setAuthToken(auth?.idToken ?? null)
  }, [auth])

  function handleLogout() {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem('idToken')
    setAuth(null)
    setShowAuthMenu(false)
  }

  function handleLogin() {
    const stored = readStoredAuth()
    // Set the token synchronously BEFORE calling setAuth so that any child
    // effects that fire immediately after the re-render (e.g. the pending-changes
    // poller in AppShell) already have a valid token and won't get a 403.
    setAuthToken(stored?.idToken ?? null)
    setAuth(stored)
  }

  function updateUserName(firstName: string, lastName: string) {
    if (!auth) return
    const updatedAuth = { ...auth, userName: `${firstName} ${lastName}` }
    setAuth(updatedAuth)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedAuth))
  }

  function updateUserEmail(newEmail: string) {
    if (!auth) return
    const updatedAuth = { ...auth, email: newEmail }
    setAuth(updatedAuth)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedAuth))
  }

  return (
    <AuthContext.Provider value={{
      auth, isLoggedIn, isAuthReady: true, effectiveUserId,
      showAuthMenu, setShowAuthMenu,
      handleLogout, handleLogin, updateUserName, updateUserEmail,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export type { Auth }
