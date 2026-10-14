import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthCall = err.config?.url?.includes('/api/auth/')
    if (err.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('nm_token')
      localStorage.removeItem('nm_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const errorMessage = (err, fallback = 'Something went wrong') => {
  const d = err.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x) => x.msg).join(', ')
  return fallback
}

export default api
