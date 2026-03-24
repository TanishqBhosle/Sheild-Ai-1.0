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
    const token = await user.getIdToken(false)
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
