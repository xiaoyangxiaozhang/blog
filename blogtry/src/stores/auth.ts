import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types/user'

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const LEGACY_USER_INFO_KEY = 'userInfo'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const currentUser = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const userInfoPromise = ref<Promise<User | null> | null>(null)
  const userInfoRequestId = ref(0)
  const redirectingToLogin = ref(false)
  let refreshPromise: Promise<boolean> | null = null
  let restorePromise: Promise<boolean> | null = null
  let restoreAttempted = false

  const clearLegacyAuthStorage = (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(LEGACY_USER_INFO_KEY)
    localStorage.removeItem('user_info')
  }
  
  // 方法
  const getAccessToken = (): string | null => {
    return accessToken.value
  }
  
  const setTokens = (token: string): void => {
    redirectingToLogin.value = false
    restoreAttempted = true
    accessToken.value = token
    clearLegacyAuthStorage()
  }
  
  const setAccessToken = (token: string): void => {
    restoreAttempted = true
    accessToken.value = token
    clearLegacyAuthStorage()
  }
  
  const removeTokens = (): void => {
    accessToken.value = null
    clearLegacyAuthStorage()
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
  }
  
  const clearUserInfo = (): void => {
    currentUser.value = null
    userInfoRequestId.value += 1
    userInfoPromise.value = null
  }
  
  const getUserInfo = (): User | null => {
    return currentUser.value
  }
  
  const fetchUserInfo = async (): Promise<User | null> => {
    if (!checkAuth()) {
      clearUserInfo()
      return null
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

  const refreshAccessToken = async (): Promise<boolean> => {
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      clearLegacyAuthStorage()
      try {
        const { refreshToken } = await import('@/api/user')
        const data = await refreshToken()
        setAccessToken(data.access_token)
        return true
      } catch {
        accessToken.value = null
        return false
      } finally {
        refreshPromise = null
      }
    })()

    return refreshPromise
  }

  const restoreSession = async (): Promise<boolean> => {
    if (accessToken.value) return true
    if (restorePromise) return restorePromise
    if (restoreAttempted) return false

    restoreAttempted = true

    restorePromise = (async () => {
      try {
        if (!await refreshAccessToken()) {
          clearAuthState()
          return false
        }
        await fetchUserInfo()
        return true
      } catch {
        clearAuthState()
        return false
      } finally {
        restorePromise = null
      }
    })()

    return restorePromise
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
    refreshAccessToken,
    restoreSession,
    clearAuthState,
    redirectToLogin,
    logout
  }
})
