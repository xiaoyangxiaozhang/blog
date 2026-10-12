<template>
  <div class="admin-layout">
    <el-container class="layout-container">
      <!-- 固定侧边栏 -->
      <el-aside v-if="!isMobile" :width="sidebarWidth" class="sidebar">
        <Sidebar :is-collapse="sidebarCollapsed" @menu-click="handleMenuClick" />
      </el-aside>

      <el-container>
        <el-header>
          <Header :layout-mode="layoutMode" :sidebar-collapsed="sidebarCollapsed" :mobile-menu-open="mobileMenuOpen"
            @toggle-sidebar="toggleSidebar" @toggle-mobile-menu="mobileMenuOpen = !mobileMenuOpen" />
        </el-header>
        <el-main>
          <div class="admin-main-shell">
            <router-view />
          </div>
        </el-main>
      </el-container>
    </el-container>
    <el-drawer v-if="isMobile" v-model="mobileMenuOpen" title="导航" direction="ltr"
      size="min(280px, calc(100vw - 44px))" class="mobile-navigation">
      <Sidebar :is-collapse="false" @menu-click="handleMenuClick" />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import Header from '@/components/layouts/Header.vue'
import Sidebar from '@/components/layouts/Sidebar.vue'

const sidebarCollapsed = ref(false)
const isMobile = useMediaQuery('(max-width: 768px)')
const mobileMenuOpen = ref(false)
watch(isMobile, () => { mobileMenuOpen.value = false })

const sidebarWidth = computed(() => {
  return sidebarCollapsed.value ? '64px' : '200px'
})

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const layoutMode = 'fixed'

const handleMenuClick = () => {
  mobileMenuOpen.value = false
}
</script>

<style scoped lang="scss">
.admin-layout {
  height: 100dvh;
  position: relative;
  background: var(--admin-bg);
  color: var(--admin-text);
}

.layout-container {
  height: 100%;
}

.sidebar {
  background-color: var(--admin-surface);
  border-right: 1px solid var(--admin-border);
  transition: width 0.25s ease;
  overflow: hidden;

}

.el-header {
  background: color-mix(in srgb, var(--bg-primary) 76%, transparent);
  border-bottom: 1px solid var(--border-color);
  backdrop-filter: blur(15px);
  padding: 0;
  height: 60px;
  position: relative;
  z-index: 10;
}

.el-container {
  height: 100%;
  min-width: 0;
}

.el-main {
  background: var(--home-surface);
  padding: 38px 40px 56px;
  overflow: auto;
  min-width: 0;

  .admin-main-shell {
    width: min(1120px, 100%);
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    padding: 16px 12px max(24px, env(safe-area-inset-bottom));
  }
}

:global(.mobile-navigation .el-drawer__body) { padding: 0; }
:global(.mobile-navigation .el-drawer__header) { margin-bottom: 0; }
:global(.mobile-navigation .el-drawer__close-btn) { width: 44px; height: 44px; }
</style>
