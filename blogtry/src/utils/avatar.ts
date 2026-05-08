const DEFAULT_AVATAR =
  'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

const getApiUrl = (): string => {
  // @ts-expect-error runtime injected config
  return window.__APP_CONFIG__?.apiUrl || import.meta.env.VITE_API_URL || 'http://39.106.193.56:8080/api/v1'
}

const getAssetBaseUrl = (): string => {
  try {
    return new URL(getApiUrl()).origin
  } catch {
    return window.location.origin
  }
}

export const getDefaultAvatar = (): string => DEFAULT_AVATAR

export const resolveAvatarUrl = (avatar?: string | null): string => {
  if (!avatar) {
    return DEFAULT_AVATAR
  }

  const trimmedAvatar = avatar.trim()
  if (!trimmedAvatar) {
    return DEFAULT_AVATAR
  }

  if (/^https?:\/\//i.test(trimmedAvatar)) {
    return trimmedAvatar
  }

  if (trimmedAvatar.startsWith('//')) {
    return `${window.location.protocol}${trimmedAvatar}`
  }

  const normalizedPath = trimmedAvatar.startsWith('/') ? trimmedAvatar : `/${trimmedAvatar}`
  return `${getAssetBaseUrl()}${normalizedPath}`
}
