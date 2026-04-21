import React, { createContext, useContext, useState } from 'react'

interface User {
  id:    number
  nom:   string
  email: string
  role:  string
}

interface AuthContextType {
  user:     User | null
  login:    (email: string, password: string) => Promise<boolean>
  register: (nom: string, email: string, password: string) => Promise<boolean>
  logout:   () => void
}

const AuthContext = createContext<AuthContextType>({
  user:     null,
  login:    async () => false,
  register: async () => false,
  logout:   () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('syncfiles-user')
    return saved ? JSON.parse(saved) : null
  })

  async function login(email: string, password: string): Promise<boolean> {
    try {
      const result = await (window as any).electron?.login(email, password)
      if (result?.success) {
        setUser(result.user)
        localStorage.setItem('syncfiles-user', JSON.stringify(result.user))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  async function register(
    nom: string, email: string, password: string
  ): Promise<boolean> {
    try {
      const result = await (window as any).electron?.register(nom, email, password)
      if (result?.success) {
        setUser(result.user)
        localStorage.setItem('syncfiles-user', JSON.stringify(result.user))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('syncfiles-user')
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}