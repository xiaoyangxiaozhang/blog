<template>
  <div class="admin-layout">
    <!-- 移动端：checkbox 控制抽屉 -->
    <input type="checkbox" id="sidebar-toggle" class="sidebar-toggle">

    <el-container class="layout-container">
      <!-- 固定侧边栏 -->
      <el-aside :width="sidebarWidth" class="sidebar">
        <Sidebar :is-collapse="sidebarCollapsed" @menu-click="handleMenuClick" />
      </el-aside>

      <!-- 移动端遮罩层 -->
      <label for="sidebar-toggle" class="sidebar-overlay"></label>

      <el-container>
        <el-header>
          <Header :layout-mode="layoutMode" :sidebar-collapsed="sidebarCollapsed" @toggle-sidebar="toggleSidebar" />
        </el-header>
        <el-main>
          <div class="admin-main-shell">
            <router-view />
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Header from '@/components/layouts/Header.vue'
import Sidebar from '@/components/layouts/Sidebar.vue'

const sidebarCollapsed = ref(false)

const sidebarWidth = computed(() => {
  return sidebarCollapsed.value ? '64px' : '200px'
})

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const layoutMode = 'fixed'

const handleMenuClick = () => {
  // 移动端点击菜单后关闭抽屉
  const checkbox = document.getElementById('sidebar-toggle') as HTMLInputElement
  if (checkbox) {
    checkbox.checked = false
  }
}
</script>

<style scoped lang="scss">
.admin-layout {
  height: 100vh;
  position: relative;
  background: var(--admin-bg);
  color: var(--admin-text);
}

// 隐藏 checkbox
.sidebar-toggle {
  display: none;
}

.layout-container {
  height: 100%;
}

.sidebar {
  background-color: var(--admin-surface);
  border-right: 1px solid var(--admin-border);
  transition: width 0.25s ease;
  overflow: hidden;

  // 移动端抽屉效果
  @media (max-width: 768px) {
    position: fixed;
    left: -200px;
    top: 0;
    bottom: 0;
    width: 200px !important;
    z-index: 2000;
    transition: left 0.25s ease;
  }
}

// 移动端遮罩层
.sidebar-overlay {
  display: none;

  @media (max-width: 768px) {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.68);
    z-index: 1999;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
  }
}

// checkbox 选中时显示侧边栏
.sidebar-toggle:checked {
  @media (max-width: 768px) {
    ~.layout-container .sidebar {
      left: 0;
    }

    ~.layout-container .sidebar-overlay {
      opacity: 1;
      pointer-events: auto;
      cursor: pointer;
    }
  }
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
}

.el-main {
  background: var(--home-surface);
  padding: 38px 40px 56px;
  overflow: auto;

  .admin-main-shell {
    width: min(1120px, 100%);
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    padding: 28px 16px 40px;
  }
}
</style>
