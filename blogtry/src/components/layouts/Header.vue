<template>
  <div class="header">
    <div class="left">
      <!-- 移动端：点击触发抽屉 -->
      <button type="button" class="toggle-sidebar mobile-only" aria-label="打开导航" @click="handleMobileToggle">
        <i class="ri-menu-line ri-lg"></i>
      </button>
      <!-- 桌面端：折叠按钮 -->
      <button type="button" class="toggle-sidebar desktop-only" aria-label="折叠导航" @click="handleToggleSidebar">
        <i class="ri-menu-fold-3-line ri-lg" v-if="!sidebarCollapsed"></i>
        <i class="ri-menu-unfold-3-line ri-lg" v-else></i>
      </button>
      <div class="header-context">
        <span class="header-title">管理工作台</span>
        <span class="header-subtitle">内容与站点运营</span>
      </div>
    </div>
    <div class="right">
      <button
        type="button"
        class="theme-toggle"
        :title="themeButtonTitle"
        :aria-label="themeButtonTitle"
        @click="toggleTheme"
      >
        <i :class="theme === 'midnight-blue' ? 'ri-moon-line' : 'ri-sun-line'"></i>
      </button>
      <NotificationBell />
      <el-dropdown trigger="click">
        <span class="user-info">
          <el-avatar :src="userAvatar" @error="handleAvatarError" />
          <span class="nickname hide-on-mobile">{{ nickname }}</span>
          <el-icon class="arrow-icon"><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item disabled>
              <el-icon><User /></el-icon>
              <span>{{ nickname }}</span>
            </el-dropdown-item>
            <el-dropdown-item divided @click="handleLogout">
              <el-icon><SwitchButton /></el-icon>
              <span>退出登录</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, SwitchButton, ArrowDown } from '@element-plus/icons-vue'
import NotificationBell from '@/components/common/NotificationBell.vue'
import { logout as logoutApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import { getDefaultAvatar, resolveAvatarUrl } from '@/utils/avatar'

const router = useRouter()
const authStore = useAuthStore()
type ThemeMode = 'midnight-blue' | 'blue-white'

const theme = ref<ThemeMode>('midnight-blue')
const nickname = computed(() => authStore.getUserInfo()?.nickname || 'Admin')
const avatarLoadFailed = ref(false)
const rawAvatar = computed(() => authStore.getUserInfo()?.avatar || '')
const userAvatar = computed(() => {
  if (avatarLoadFailed.value) {
    return getDefaultAvatar()
  }

  return resolveAvatarUrl(rawAvatar.value)
})

watch(rawAvatar, () => {
  avatarLoadFailed.value = false
})

const themeButtonTitle = computed(() =>
  theme.value === 'midnight-blue' ? '切换到蓝白主题' : '切换到纯黑主题'
)

const applyTheme = (nextTheme: ThemeMode) => {
  theme.value = nextTheme

  const root = document.documentElement
  root.setAttribute('data-theme', nextTheme)
  root.setAttribute('data-admin-theme', nextTheme === 'blue-white' ? 'light' : 'dark')

  const isLight = nextTheme === 'blue-white'
  const elementTheme: Record<string, string> = isLight
    ? {
        '--el-bg-color': '#ffffff',
        '--el-bg-color-page': '#ffffff',
        '--el-bg-color-overlay': '#ffffff',
        '--el-fill-color': '#fafafa',
        '--el-fill-color-light': 'rgba(0, 0, 0, 0.04)',
        '--el-fill-color-lighter': 'rgba(0, 0, 0, 0.02)',
        '--el-fill-color-blank': '#ffffff',
        '--el-text-color-primary': '#000000',
        '--el-text-color-regular': '#555555',
        '--el-text-color-secondary': '#666666',
        '--el-text-color-placeholder': '#94a3b8',
        '--el-border-color': 'rgba(0, 0, 0, 0.08)',
        '--el-border-color-light': 'rgba(0, 0, 0, 0.06)',
        '--el-border-color-lighter': 'rgba(0, 0, 0, 0.04)',
        '--el-color-primary': '#3b82f6',
        '--el-color-primary-dark-2': '#2563eb'
      }
    : {
        '--el-bg-color': '#171717',
        '--el-bg-color-page': '#0e0e0e',
        '--el-bg-color-overlay': '#171717',
        '--el-fill-color': '#151515',
        '--el-fill-color-light': 'rgba(255, 255, 255, 0.06)',
        '--el-fill-color-lighter': 'rgba(255, 255, 255, 0.04)',
        '--el-fill-color-blank': '#171717',
        '--el-text-color-primary': '#ffffff',
        '--el-text-color-regular': '#cccccc',
        '--el-text-color-secondary': '#999999',
        '--el-text-color-placeholder': '#737373',
        '--el-border-color': 'rgba(255, 255, 255, 0.08)',
        '--el-border-color-light': 'rgba(255, 255, 255, 0.06)',
        '--el-border-color-lighter': 'rgba(255, 255, 255, 0.04)',
        '--el-color-primary': '#8183ff',
        '--el-color-primary-dark-2': '#6b6de6'
      }

  Object.entries(elementTheme).forEach(([property, value]) => root.style.setProperty(property, value))
  localStorage.setItem('blog-color-theme', nextTheme)
  window.dispatchEvent(new CustomEvent('admin-theme-change', { detail: nextTheme }))
}

const toggleTheme = () => {
  applyTheme(theme.value === 'midnight-blue' ? 'blue-white' : 'midnight-blue')
}

onMounted(() => {
  const savedTheme = localStorage.getItem('blog-color-theme') as ThemeMode | null
  applyTheme(savedTheme === 'blue-white' ? 'blue-white' : 'midnight-blue')
})

// 接收 props
interface Props {
  layoutMode: 'drawer' | 'fixed'
  sidebarCollapsed: boolean
}

defineProps<Props>()

// 定义事件
const emit = defineEmits(['toggle-sidebar'])

const handleToggleSidebar = () => {
  emit('toggle-sidebar')
}

const handleMobileToggle = () => {
  // 找到移动端的 sidebar-toggle checkbox 并切换状态
  const checkbox = document.getElementById('sidebar-toggle') as HTMLInputElement
  if (checkbox) {
    checkbox.checked = !checkbox.checked
  }
}

const handleAvatarError = () => {
  avatarLoadFailed.value = true
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })

    try {
      await logoutApi()
    } catch (error) {
      console.error('登出 API 调用失败:', error)
    }

    authStore.clearAuthState()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch {}
}
</script>

<style scoped lang="scss">
.header {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;

  // 移动端减小内边距
  @media (max-width: 767px) {
    padding: 0 12px;
  }

  .left {
    display: flex;
    align-items: center;

    .toggle-sidebar {
      margin-right: 14px;
      font-size: 20px;
      cursor: pointer;
      padding: 9px;
      border: 1px solid transparent;
      border-radius: var(--admin-radius-control);
      background: transparent;
      color: var(--admin-text-secondary);
      transition: background-color 180ms ease, color 180ms ease, border-color 180ms ease;

      &:hover {
        background: var(--admin-brand-soft);
        border-color: var(--admin-border);
        color: var(--admin-brand);
      }

      // 移动端增大触摸区域
      @media (max-width: 767px) {
        margin-right: 8px;
        padding: 10px;
      }
    }

    .header-context {
      display: flex;
      flex-direction: column;
      gap: 1px;

      .header-title {
        color: var(--admin-text);
        font-size: 14px;
        font-weight: 600;
      }

      .header-subtitle {
        color: var(--admin-text-muted);
        font-size: 11px;
      }

      @media (max-width: 560px) {
        .header-subtitle {
          display: none;
        }
      }
    }

    // 移动端显示/隐藏
    .mobile-only {
      display: none;
      @media (max-width: 768px) {
        display: block;
      }
    }

    .desktop-only {
      display: block;
      @media (max-width: 768px) {
        display: none;
      }
    }
  }

  .right {
    display: flex;
    align-items: center;

    .theme-toggle {
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-right: 4px;
      border: 1px solid transparent;
      border-radius: 999px;
      background: transparent;
      color: var(--header-action-color, var(--admin-text));
      cursor: pointer;
      font-size: 17px;
      transition: background 0.28s ease, color 0.28s ease, border-color 0.28s ease, transform 0.2s ease;

      &:hover {
        color: var(--brand-accent);
        background: var(--brand-accent-soft);
        border-color: var(--accent-border);
        transform: translateY(-1px);
      }
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 5px 8px;
      border-radius: var(--admin-radius-pill);
      transition: background-color 180ms ease;
      outline: none;

      &:hover {
        background-color: var(--admin-brand-soft);
      }

      &:focus {
        outline: none;
      }

      .nickname {
        font-size: 14px;
        color: var(--admin-text-secondary);
        font-weight: 500;
      }

      .arrow-icon {
        font-size: 12px;
        color: var(--admin-text-muted);
      }
    }
  }
}

.hide-on-mobile {
  @media (max-width: 768px) {
    display: none !important;
  }
}
</style>
