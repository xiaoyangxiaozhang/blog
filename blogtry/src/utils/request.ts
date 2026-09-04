import axios from 'axios'
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'

interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
}

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

// 是否正在刷新token的标志
let isRefreshing = false
// 存储待重试的请求
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (reason?: any) => void
}> = []

// 处理队列中的请求
const processQueue = (error: any = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error)
    } else {
      promise.resolve()
    }
  })
  failedQueue = []
}

// 请求拦截器
request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // refresh接口只使用HttpOnly Cookie，不带Authorization header。
  if (config.url === '/auth/refresh') {
    return config
  }
  
  // 其他接口带上access token
  const authStore = useAuthStore()
  const token = authStore.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
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
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const authStore = useAuthStore()
    
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
      if (isRefreshing) {
        // 如果正在刷新，将请求加入队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => {
          return request(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // 清除当前失效的内存 token，再使用 HttpOnly Cookie 刷新。
        authStore.removeTokens()
        if (!await authStore.refreshAccessToken()) {
          processQueue(error)
          authStore.redirectToLogin()
          return Promise.reject(error)
        }
        
        // 处理队列中的请求
        processQueue()
        
        // 重试原请求
        return request(originalRequest)
      } catch (refreshError) {
        // 刷新失败，清空队列并跳转登录页
        processQueue(refreshError)
        authStore.redirectToLogin()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    
    // 其他错误直接返回
    return Promise.reject(error)
  }
)

export default request
