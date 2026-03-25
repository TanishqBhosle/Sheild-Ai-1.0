import axios, { type AxiosError } from 'axios'
import { fbAuth } from '../config/firebase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const user = fbAuth.currentUser
  if (user) {
    // Force-refresh so custom claims like `role` are up to date.
    // Without this, role changes can take effect only after the token naturally refreshes.
    const token = await user.getIdToken(true)
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, Promise.reject)

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await fbAuth.signOut()
      window.location.replace('/login')
    }
    return Promise.reject(error)
  }
)

export default api
