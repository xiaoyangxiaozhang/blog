<template>
  <common-list class="menu-list-page" title="菜单管理" :data="menuTree" :loading="loading" :show-pagination="false" create-text="新增菜单"
    @create="handleCreate" @refresh="fetchMenuTree" row-key="id"
    :tree-props="{ children: 'children', hasChildren: 'hasChildren' }" default-expand-all>
    <!-- 菜单类型切换器 -->
    <template #toolbar-before>
      <div class="menu-types" role="group" aria-label="菜单类型">
        <button v-for="option in menuTypeOptions" :key="option.value" type="button"
          :class="{ 'is-active': selectedType === option.value }" :aria-pressed="selectedType === option.value"
          @click="selectType(option.value)">{{ option.label }}</button>
      </div>
    </template>

    <template v-if="isMobile" #content>
      <div v-if="mobileMenus.length" class="menu-mobile-list" role="list" aria-label="菜单列表">
        <article v-for="item in mobileMenus" :key="item.row.id" class="menu-mobile-item" role="listitem">
          <div class="menu-mobile-main">
            <div class="menu-title">
              <i v-if="item.row.icon && isRemixIcon(item.row.icon)" :class="item.row.icon" class="menu-icon" aria-hidden="true"></i>
              <img v-else-if="item.row.icon" :src="item.row.icon" class="menu-icon-img" alt="" />
              <span>{{ item.row.title }}</span>
            </div>
            <span class="menu-sort">排序 {{ item.row.sort }}</span>
          </div>
          <p v-if="item.parent" class="menu-parent">子菜单 · {{ item.parent.title }}</p>
          <p class="menu-url">{{ item.row.url || '未设置链接' }}</p>
          <div class="menu-mobile-actions" :aria-label="`${item.row.title} 操作`">
            <el-button v-if="item.row.parent_id === null" link size="small" @click="handleAddChild(item.row)">新增子菜单</el-button>
            <el-button link size="small" @click="handleEdit(item.row)">编辑</el-button>
            <el-button class="menu-delete" link size="small" @click="handleDelete(item.row.id)">删除</el-button>
          </div>
        </article>
      </div>
      <el-empty v-else description="暂无菜单" :image-size="72" />
    </template>

    <!-- 表格列 -->
    <el-table-column label="菜单标题" min-width="200">
      <template #default="{ row }">
        <div class="menu-title">
          <!-- RemixIcon 图标 -->
          <i v-if="row.icon && isRemixIcon(row.icon)" :class="row.icon" class="menu-icon"></i>
          <!-- 图片图标 -->
          <img v-else-if="row.icon" :src="row.icon" class="menu-icon-img" alt="icon" />
          <span>{{ row.title }}</span>
        </div>
      </template>
    </el-table-column>

    <el-table-column label="链接地址" min-width="250">
      <template #default="{ row }">
        <span v-if="row.url">{{ row.url }}</span>
        <span v-else style="color: var(--admin-text-muted)">-</span>
      </template>
    </el-table-column>

    <el-table-column prop="sort" label="排序" width="100" align="center" />

    <el-table-column label="操作" width="180" align="center" fixed="right">
      <template #default="{ row }">
        <el-button v-if="row.parent_id === null" type="primary" link size="small" @click="handleAddChild(row)">
          新增子菜单
        </el-button>
        <el-button type="primary" link size="small" @click="handleEdit(row)">
          编辑
        </el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row.id)">
          删除
        </el-button>
      </template>
    </el-table-column>

    <!-- 额外内容 -->
    <template #extra>
      <menu-form-dialog v-model="dialogVisible" :edit-menu="currentMenu" :parent-menu="parentMenu"
        :current-type="selectedType" @success="fetchMenuTree" />
    </template>
  </common-list>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import CommonList from '@/components/common/CommonList.vue'
import type { MenuTreeNode } from '@/types/menu'
import { getMenuTree, deleteMenu } from '@/api/menu'
import MenuFormDialog from './components/MenuFormDialog.vue'

const isMobile = useMediaQuery('(max-width: 768px)')
const loading = ref(false)
const menuTree = ref<MenuTreeNode[]>([])
const selectedType = ref<string>('aggregate')
const dialogVisible = ref(false)
const currentMenu = ref<MenuTreeNode | null>(null)
const parentMenu = ref<MenuTreeNode | null>(null)

// 菜单类型选项
const menuTypeOptions = [
  { label: '聚合', value: 'aggregate' },
  { label: '导航', value: 'navigation' },
  { label: '页脚', value: 'footer' }
]

const mobileMenus = computed(() => {
  const items: { row: MenuTreeNode; parent?: MenuTreeNode }[] = []
  const append = (nodes: MenuTreeNode[], parent?: MenuTreeNode) => {
    for (const row of nodes) {
      items.push({ row, parent })
      if (row.children?.length) append(row.children, row)
    }
  }
  append(menuTree.value)
  return items
})

// 判断是否是 RemixIcon 图标类名
const isRemixIcon = (icon: string) => {
  return icon && icon.startsWith('ri-')
}

// 获取菜单树
const fetchMenuTree = async () => {
  loading.value = true
  try {
    const data = await getMenuTree(selectedType.value)
    menuTree.value = data
  } catch (error) {
    ElMessage.error('获取菜单列表失败')
  } finally {
    loading.value = false
  }
}

// 菜单类型切换
const selectType = (type: string) => {
  if (selectedType.value === type) return
  selectedType.value = type
  fetchMenuTree()
}

// 新增菜单
const handleCreate = () => {
  currentMenu.value = null
  parentMenu.value = null
  dialogVisible.value = true
}

// 新增子菜单
const handleAddChild = (menu: MenuTreeNode) => {
  currentMenu.value = null
  parentMenu.value = menu
  dialogVisible.value = true
}

// 查找父菜单
const findParentMenu = (parentId: number | null): MenuTreeNode | null => {
  if (!parentId) return null

  for (const menu of menuTree.value) {
    if (menu.id === parentId) {
      return menu
    }
  }
  return null
}

// 编辑菜单
const handleEdit = (menu: MenuTreeNode) => {
  currentMenu.value = menu
  // 如果是子菜单，查找并设置父菜单
  parentMenu.value = menu.parent_id ? findParentMenu(menu.parent_id) : null
  dialogVisible.value = true
}

// 查找菜单节点
const findMenuNode = (id: number, nodes: MenuTreeNode[] = menuTree.value): MenuTreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    if (node.children && node.children.length > 0) {
      const found = findMenuNode(id, node.children)
      if (found) return found
    }
  }
  return null
}

// 删除菜单
const handleDelete = async (id: number) => {
  try {
    const menuNode = findMenuNode(id)
    const hasChildren = menuNode?.children && menuNode.children.length > 0

    if (hasChildren) {
      // 有子菜单，询问如何处理
      const result = await ElMessageBox.confirm(
        `包含 ${menuNode.children?.length} 个子菜单。`,
        '提示',
        {
          distinguishCancelAndClose: true,
          confirmButtonText: '保留子菜单',
          cancelButtonText: '全部删除',
          type: 'warning'
        }
      ).then(() => 'upgrade' as const).catch((action) => {
        if (action === 'cancel') return 'delete' as const
        throw 'close'
      })

      await deleteMenu(id, { children_action: result })
      ElMessage.success('删除成功')
      fetchMenuTree()
    } else {
      // 无子菜单，直接删除
      await ElMessageBox.confirm('确定要删除此菜单吗？', '提示', {
        type: 'warning'
      })
      await deleteMenu(id)
      ElMessage.success('删除成功')
      fetchMenuTree()
    }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      if (error instanceof Error) {
        ElMessage.error(error.message)
      }
    }
  }
}

onMounted(() => {
  fetchMenuTree()
})
</script>

<style scoped lang="scss">
.menu-list-page :deep(.el-card) { --el-card-bg-color: var(--admin-surface); --el-card-border-color: var(--admin-border-soft); color: var(--admin-text); }
.menu-list-page :deep(.refresh-btn) { --el-button-bg-color: transparent; --el-button-text-color: var(--admin-text-secondary); --el-button-border-color: var(--admin-border-soft); }
.menu-list-page :deep(.toolbar .actions > .el-button--primary) {
  --el-button-bg-color: var(--admin-brand-soft);
  --el-button-border-color: transparent;
  --el-button-text-color: var(--admin-text);
  --el-button-hover-bg-color: var(--admin-brand-soft);
  --el-button-hover-border-color: transparent;
  --el-button-hover-text-color: var(--admin-text);
  --el-button-active-bg-color: var(--admin-brand-soft);
  --el-button-active-border-color: transparent;
}

.menu-types {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--admin-text) 5%, transparent);
  button {
    min-height: 36px;
    padding: 0 14px;
    border: 0;
    border-radius: 7px;
    color: var(--admin-text-secondary);
    background: transparent;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
  }
  button:not(.is-active):hover { background: var(--admin-border-soft); }
  button.is-active { color: var(--admin-text); background: var(--admin-surface-elevated); box-shadow: 0 1px 3px rgba(0, 0, 0, .12); }
  button:focus-visible { outline: 2px solid var(--admin-brand); outline-offset: 2px; }
}
.menu-mobile-list { display: grid; gap: 10px; }
.menu-mobile-item { min-width: 0; padding: 14px 16px 10px; border-radius: 10px; background: color-mix(in srgb, var(--admin-text) 3%, transparent); }
.menu-mobile-main { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.menu-mobile-main .menu-title { min-width: 0; font-size: 15px; font-weight: 500; overflow-wrap: anywhere; }
.menu-sort, .menu-parent, .menu-url { color: var(--admin-text-muted); font-size: 12px; line-height: 1.5; }
.menu-sort { flex-shrink: 0; font-variant-numeric: tabular-nums; }
.menu-parent { margin: 6px 0 0; }
.menu-url { margin: 6px 0 0; overflow-wrap: anywhere; }
.menu-mobile-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 14px; margin-top: 6px; }
.menu-mobile-actions :deep(.el-button) { min-height: 44px; padding: 0 2px; margin: 0; color: var(--admin-text-secondary); font-size: 13px; }
.menu-mobile-actions :deep(.el-button:hover) { color: var(--admin-brand); }
.menu-mobile-actions :deep(.menu-delete) { color: var(--el-color-danger); }
@media (max-width: 768px) {
  .menu-types { max-width: 100%; }
  .menu-types button { min-height: 38px; padding: 0 8px; }
  .menu-list-page :deep(.toolbar .actions > .el-button--primary) { padding: 0 12px; font-size: 13px; }
}

.menu-title {
  display: flex;
  align-items: center;

  .menu-icon {
    margin-right: 8px;
    font-size: 16px;
    color: var(--admin-text-secondary);
  }

  .menu-icon-img {
    width: 16px;
    height: 16px;
    margin-right: 8px;
    object-fit: contain;
    vertical-align: middle;
  }
}

// 树形表格样式优化
:deep(.el-table) {
  .el-table__expand-icon {
    font-size: 14px;
    color: var(--admin-text-secondary);

    &.el-table__expand-icon--expanded {
      transform: rotate(90deg);
    }
  }

  .el-table__indent {
    padding-left: 20px;
  }

  .el-table__placeholder {
    display: inline-block;
    width: 20px;
  }

  // 确保树形结构有正确的缩进
  .el-table__body {
    .el-table__row {
      .el-table__cell {
        &:first-child {
          .cell {
            display: flex;
            align-items: center;
          }
        }
      }
    }
  }
}
</style>
