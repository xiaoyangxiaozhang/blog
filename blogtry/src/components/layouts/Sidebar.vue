<template>
  <div>
  <div class="sidebar" :class="{ 'is-collapse': isCollapse }">
    <div class="logo">
      <span class="logo-mark" aria-hidden="true">羊</span>
      <span v-show="!isCollapse" class="logo-label">小羊管理系统</span>
    </div>
    <el-menu class="admin-menu" :default-active="route.path" :collapse="isCollapse" background-color="transparent"
      text-color="var(--admin-text-muted)" active-text-color="var(--admin-brand)" router @select="handleMenuSelect">
      <el-menu-item index="/">
        <i class="ri-dashboard-2-line ri-lg"></i>
        <template #title><span>仪表盘</span></template>
      </el-menu-item>

      <el-sub-menu index="content">
        <template #title>
          <i class="ri-layout-2-line ri-lg"></i>
          <span>内容管理</span>
        </template>
        <el-menu-item index="/articles">
          <i class="ri-article-line ri-lg"></i>
          <template #title>文章管理</template>
        </el-menu-item>
        <el-menu-item index="/moments">
          <i class="ri-chat-3-line ri-lg"></i>
          <template #title>动态管理</template>
        </el-menu-item>
      </el-sub-menu>

      <el-sub-menu index="interaction">
        <template #title>
          <i class="ri-chat-2-line ri-lg"></i>
          <span>互动管理</span>
        </template>
        <el-menu-item index="/friends">
          <i class="ri-links-line ri-lg"></i>
          <template #title>友链管理</template>
        </el-menu-item>
        <el-menu-item index="/comments">
          <i class="ri-message-3-line ri-lg"></i>
          <template #title>评论管理</template>
        </el-menu-item>
        <el-menu-item index="/rssfeeds">
          <i class="ri-rss-line ri-lg"></i>
          <template #title>RSS订阅</template>
        </el-menu-item>
        <el-menu-item index="/feedback">
          <i class="ri-feedback-line ri-lg"></i>
          <template #title>反馈投诉</template>
        </el-menu-item>
      </el-sub-menu>

      <el-sub-menu index="management">
        <template #title>
          <i class="ri-admin-line ri-lg"></i>
          <span>系统管理</span>
        </template>
        <el-menu-item index="/users">
          <i class="ri-team-line ri-lg"></i>
          <template #title>用户管理</template>
        </el-menu-item>
        <el-menu-item index="/files">
          <i class="ri-folder-image-line ri-lg"></i>
          <template #title>文件管理</template>
        </el-menu-item>
        <el-menu-item index="/menus">
          <i class="ri-menu-line ri-lg"></i>
          <template #title>菜单管理</template>
        </el-menu-item>
        <el-menu-item index="/visits">
          <i class="ri-file-list-3-line ri-lg"></i>
          <template #title>访问日志</template>
        </el-menu-item>
        <el-menu-item index="/systems">
          <i class="ri-information-line ri-lg"></i>
          <template #title>系统信息</template>
        </el-menu-item>
        <el-menu-item index="/settings">
          <i class="ri-settings-3-line ri-lg"></i>
          <template #title>系统设置</template>
        </el-menu-item>
      </el-sub-menu>
    </el-menu>
  </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

defineProps<{
  isCollapse: boolean
}>()

const emit = defineEmits(['menu-click'])

// 菜单选择事件处理
const handleMenuSelect = () => {
  emit('menu-click')
}
</script>

<style scoped lang="scss">
.sidebar {
  height: 100%;
  padding: 0 10px;

  .logo {
    height: 64px;
    padding: 10px 8px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;

    .logo-mark {
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 34px;
      border-radius: var(--admin-radius-pill);
      background: var(--admin-brand);
      color: #ffffff;
      font-size: 17px;
      font-weight: 600;
      box-shadow: 0 0 24px var(--admin-brand-soft);
    }

    .logo-label {
      color: var(--admin-text);
      font-size: 15px;
      letter-spacing: 0.02em;
      font-weight: 600;
      white-space: nowrap;
    }
  }

  &.is-collapse {
    .logo {
      padding: 10px 4px;
      justify-content: center;
    }
  }

  :deep(.el-menu) {
    border-right: none;
    background: transparent;

    .el-menu-item,
    .el-sub-menu__title {
      height: 44px;
      margin: 4px 0;
      border-radius: var(--admin-radius-control);
      font-size: 14px;
      transition: background-color 180ms ease, color 180ms ease;

      i {
        width: 20px;
        margin-right: 10px;
        color: currentColor;
      }

      &:hover {
        background: var(--admin-brand-soft);
        color: var(--admin-text);
      }
    }

    .el-menu-item.is-active {
      background: var(--admin-brand-soft);
      color: var(--admin-brand);
      font-weight: 600;
    }

    .el-sub-menu .el-menu {
      background: transparent;
      padding: 2px 0 4px 14px;

      .el-menu-item {
        min-width: 0;
        padding-left: 28px !important;
        font-size: 13px;
      }
    }
  }
}
</style>
