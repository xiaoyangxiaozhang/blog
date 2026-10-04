import axios from 'axios'
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'

interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
}

type AuthRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean; _authSession?: number }

// 获取 API URL（优先使用运行时配置）
const getApiUrl = () => {
  // @ts-ignore
  return window.__APP_CONFIG__?.apiUrl || import.meta.env.VITE_API_URL || 'http://39.106.193.56:8080/api/v1'
}

// 创建 axios 实例
const request = axios.create({
  baseURL: getApiUrl(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
})

// 请求拦截器
request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const authStore = useAuthStore()
  ;(config as AuthRequestConfig)._authSession = authStore.getSessionVersion()
  // refresh接口只使用HttpOnly Cookie，不带Authorization header。
  if (config.url === '/auth/refresh') {
    return config
  }
  
  // 其他接口带上access token
  const token = authStore.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    if ((response.config as AuthRequestConfig)._authSession !== useAuthStore().getSessionVersion()) {
      return Promise.reject(new Error('登录会话已切换'))
    }
    // blob 类型直接返回
    if (response.config.responseType === 'blob') {
      return response.data
    }
    const { code, message, data } = response.data
    // 确保返回的数据不是null，至少返回空数组或空对象
    const safeData = data === null ? [] : data
    return code === 0 ? safeData : Promise.reject(new Error(message || '请求失败'))
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AuthRequestConfig | undefined
    const authStore = useAuthStore()
    if (!originalRequest || originalRequest._authSession !== authStore.getSessionVersion()) {
      return Promise.reject(error)
    }
    
    // 处理 blob 请求的错误响应（后端返回 JSON 错误）
    if (originalRequest.responseType === 'blob' && error.response?.data instanceof Blob) {
      const text = await (error.response.data as Blob).text()
      try {
        const json = JSON.parse(text)
        return Promise.reject(new Error(json.message || '请求失败'))
      } catch {
        return Promise.reject(error)
      }
    }
    
    // refresh 自身失败时直接交给调用方，不能再次触发 refresh。
    if (originalRequest.url === '/auth/refresh') {
      return Promise.reject(error)
    }

    // 处理401未授权 - 尝试刷新token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const version = authStore.getSessionVersion()
      // Store 已提供刷新请求复用；重试也必须属于原来的会话。
      const refreshed = await authStore.refreshAccessToken()
      if (version !== authStore.getSessionVersion()) return Promise.reject(error)
      if (!refreshed) {
        authStore.redirectToLogin()
        return Promise.reject(error)
      }
      return request(originalRequest)
    }
    
    // 其他错误直接返回
    return Promise.reject(error)
  }
)

export default request
