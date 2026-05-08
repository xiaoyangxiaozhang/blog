import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types/user'

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const LEGACY_USER_INFO_KEY = 'userInfo'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const currentUser = ref<User | null>(null)
  const userInfoPromise = ref<Promise<User | null> | null>(null)
  const userInfoRequestId = ref(0)
  const redirectingToLogin = ref(false)
  
  // 方法
  const getAccessToken = (): string | null => {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  }
  
  const getRefreshToken = (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }
  
  const setTokens = (accessToken: string, refreshToken: string): void => {
    // 登录成功后，设置accessToken和refreshToken
    redirectingToLogin.value = false
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
  
    // 登录成功后，设置accessToken
  const setAccessToken = (accessToken: string): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  }
  
  const removeTokens = (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
  
  const clearLegacyUserInfo = (): void => {
    localStorage.removeItem(LEGACY_USER_INFO_KEY)
  }
  
  const setUserInfo = (user: User | null): void => {
    // 处理后端返回的用户信息，确保所有必需字段都存在
    if (user) {
      // 确保avatar字段存在
      if (!user.avatar) {
        user.avatar = ''
      }
      // 确保其他必需字段存在
      if (!user.role) {
        user.role = 'user'
      }
      if (!user.is_enabled) {
        user.is_enabled = true
      }
      if (!user.last_login) {
        user.last_login = ''
      }
      if (!user.has_password) {
        user.has_password = false
      }
      if (!user.github_id) {
        user.github_id = ''
      }
      if (!user.google_id) {
        user.google_id = ''
      }
      if (!user.qq_id) {
        user.qq_id = ''
      }
      if (!user.microsoft_id) {
        user.microsoft_id = ''
      }
      if (!user.feishu_open_id) {
        user.feishu_open_id = ''
      }
    }
    currentUser.value = user
    clearLegacyUserInfo()
    // 缓存用户信息到localStorage
    if (user) {
      localStorage.setItem('user_info', JSON.stringify(user))
    } else {
      localStorage.removeItem('user_info')
    }
  }
  
  const clearUserInfo = (): void => {
    currentUser.value = null
    userInfoRequestId.value += 1
    userInfoPromise.value = null
    clearLegacyUserInfo()
    localStorage.removeItem('user_info')
  }
  
  const getUserInfo = (): User | null => {
    return currentUser.value
  }
  
  const fetchUserInfo = async (): Promise<User | null> => {
    if (!checkAuth()) {
      clearUserInfo()
      return null
    }

    // 先从localStorage中读取缓存的用户信息
    const cachedUserInfo = localStorage.getItem('user_info')
    if (cachedUserInfo) {
      try {
        const user = JSON.parse(cachedUserInfo)
        setUserInfo(user)
        return user
      } catch (error) {
        localStorage.removeItem('user_info')
      }
    }

    if (!userInfoPromise.value) {
      const requestId = ++userInfoRequestId.value

      userInfoPromise.value = import('@/api/user')
        .then(({ getProfile }) => {
          return getProfile()
        })
        .then((user) => {
          if (requestId !== userInfoRequestId.value || !checkAuth()) {
            return currentUser.value
          }

          setUserInfo(user)
          return user
        })
        .catch((error) => {
          console.error('获取用户信息失败:', error)
          if (requestId === userInfoRequestId.value) {
            clearUserInfo()
          }
          throw error
        })
        .finally(() => {
          if (requestId === userInfoRequestId.value) {
            userInfoPromise.value = null
          }
        })
    }

    return userInfoPromise.value
  }
  
  const ensureUserInfo = async (): Promise<User | null> => {
    if (currentUser.value) return currentUser.value
    return fetchUserInfo()
  }
  
  const getCurrentUserRole = (): string => {
    return currentUser.value?.role || ''
  }
  
  const isSuperAdmin = (): boolean => {
    return currentUser.value?.role === 'super_admin'
  }
  
  const checkAuth = (): boolean => {
    const token = getAccessToken()
    return token !== null && token !== ''
  }
  
  const clearAuthState = (): void => {
    removeTokens()
    clearUserInfo()
  }
  
  const redirectToLogin = (): void => {
    clearAuthState()

    if (window.location.pathname === '/login') {
      return
    }

    if (redirectingToLogin.value) return

    redirectingToLogin.value = true
    window.location.replace('/login')
  }
  
  const logout = (): void => {
    clearAuthState()
  }
  
  return {
    // 状态
    currentUser,
    // 方法
    getAccessToken,
    getRefreshToken,
    setTokens,
    setAccessToken,
    removeTokens,
    setUserInfo,
    clearUserInfo,
    getUserInfo,
    fetchUserInfo,
    ensureUserInfo,
    getCurrentUserRole,
    isSuperAdmin,
    checkAuth,
    clearAuthState,
    redirectToLogin,
    logout
  }
})
