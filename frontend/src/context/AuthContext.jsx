import { createContext, useContext, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nm_user'))
    } catch {
      return null
    }
  })

  const authenticate = async (mode, email, password) => {
    const { data } = await api.post(`/api/auth/${mode}`, { email, password })
    localStorage.setItem('nm_token', data.access_token)
    localStorage.setItem('nm_user', JSON.stringify(data.user))
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('nm_token')
    localStorage.removeItem('nm_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login: (e, p) => authenticate('login', e, p),
        register: (e, p) => authenticate('register', e, p),
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
