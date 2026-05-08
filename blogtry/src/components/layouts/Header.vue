<template>
  <div class="header">
    <div class="left">
      <!-- 移动端：点击触发抽屉 -->
      <div class="toggle-sidebar mobile-only" @click="handleMobileToggle">
        <i class="ri-menu-line ri-lg"></i>
      </div>
      <!-- 桌面端：折叠按钮 -->
      <div class="toggle-sidebar desktop-only" @click="handleToggleSidebar">
        <i class="ri-menu-fold-3-line ri-lg" v-if="!sidebarCollapsed"></i>
        <i class="ri-menu-unfold-3-line ri-lg" v-else></i>
      </div>
    </div>
    <div class="right">
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
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, SwitchButton, ArrowDown } from '@element-plus/icons-vue'
import NotificationBell from '@/components/common/NotificationBell.vue'
import { logout as logoutApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import { getDefaultAvatar, resolveAvatarUrl } from '@/utils/avatar'

const router = useRouter()
const authStore = useAuthStore()
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
  padding: 0 20px;

  // 移动端减小内边距
  @media (max-width: 767px) {
    padding: 0 12px;
  }

  .left {
    display: flex;
    align-items: center;

    .toggle-sidebar {
      margin-right: 20px;
      font-size: 20px;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      transition: background-color 0.3s;

      &:hover {
        background-color: #f5f7fa;
      }

      // 移动端增大触摸区域
      @media (max-width: 767px) {
        margin-right: 12px;
        padding: 10px;
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

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background-color 0.3s;
      outline: none;

      &:hover {
        background-color: #f5f7fa;
      }

      &:focus {
        outline: none;
      }

      .nickname {
        font-size: 14px;
        color: #303133;
        font-weight: 500;
      }

      .arrow-icon {
        font-size: 12px;
        color: #909399;
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
