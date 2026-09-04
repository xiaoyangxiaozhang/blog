<template>
  <common-list title="用户列表" :data="userList" :loading="loading" :total="total" :show-create="activeTab === 'active'" v-model:page="queryParams.page"
    v-model:page-size="queryParams.page_size" create-text="新增用户" @create="handleCreate" @refresh="fetchUsers"
    @update:page="handlePageChange" @update:pageSize="handlePageSizeChange">
    <template #extra>
      <el-tabs v-model="activeTab" class="user-tabs" @tab-change="handleTabChange">
        <el-tab-pane name="active">
          <template #label>
            <span class="user-tab-label">正常用户</span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="trash">
          <template #label>
            <span class="user-tab-label"><el-icon><Delete /></el-icon>回收站</span>
          </template>
        </el-tab-pane>
      </el-tabs>

      <!-- 用户表单对话框 -->
      <user-form-dialog v-model="dialogVisible" :edit-user="currentUser" @success="fetchUsers" />
    </template>

    <!-- 表格列 -->
    <el-table-column label="头像" width="100" align="center">
      <template #default="{ row }">
        <el-avatar v-if="row.avatar" :src="row.avatar" :size="40" />
        <el-avatar v-else :size="40">
          <el-icon>
            <User />
          </el-icon>
        </el-avatar>
      </template>
    </el-table-column>

    <el-table-column label="昵称" min-width="130">
      <template #default="{ row }">
        <div style="display: flex; align-items: center; gap: 8px">
          <span>{{ row.nickname }}</span>
          <el-tag v-if="row.badge" type="info" effect="plain" size="small">{{ row.badge }}</el-tag>
          <el-tag v-if="row.deleted_at" type="danger" size="small">已删除</el-tag>
        </div>
      </template>
    </el-table-column>

    <el-table-column label="邮箱" min-width="150" align="center">
      <template #default="{ row }">
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px">
          <span v-if="row.email">{{ row.email }}</span>
          <span v-else style="color: #999">-</span>
          <el-tag v-if="!row.is_enabled" type="danger" size="small">禁用</el-tag>
        </div>
      </template>
    </el-table-column>

    <el-table-column label="网站地址" min-width="150">
      <template #default="{ row }">
        <span v-if="row.website">{{ row.website }}</span>
        <span v-else style="color: #999">-</span>
      </template>
    </el-table-column>

    <el-table-column label="角色" width="120" align="center">
      <template #default="{ row }">
        <el-tag v-if="row.role === 'super_admin'" type="danger" size="small">超级管理员</el-tag>
        <el-tag v-else-if="row.role === 'admin'" type="warning" size="small">管理员</el-tag>
        <el-tag v-else-if="row.role === 'user'" type="success" size="small">普通用户</el-tag>
        <el-tag v-else type="info" size="small">访客</el-tag>
      </template>
    </el-table-column>

    <el-table-column label="登录方式" width="150" align="center">
      <template #default="{ row }">
        <div class="login-methods">
          <template v-if="row.has_password">
            <i class="ri-lock-password-fill"></i>
          </template>

          <template v-if="row.github_id">
            <i class="ri-github-fill"></i>
          </template>

          <template v-if="row.google_id">
            <i class="ri-google-fill"></i>
          </template>

          <template v-if="row.qq_id">
            <i class="ri-qq-fill"></i>
          </template>

          <template v-if="row.microsoft_id">
            <i class="ri-microsoft-fill"></i>
          </template>
        </div>
      </template>
    </el-table-column>

    <el-table-column label="最后登录" width="180" align="center">
      <template #default="{ row }">
        {{ formatDateTime(row.last_login) }}
      </template>
    </el-table-column>

    <el-table-column label="操作" width="180" align="center" fixed="right">
      <template #default="{ row }">
        <template v-if="activeTab === 'active' && canOperateUser(row)">
          <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row.id)">删除</el-button>
        </template>
        <el-button v-else-if="activeTab === 'trash' && canOperateUser(row)" type="success" link size="small"
          @click="handleRestore(row.id)">恢复</el-button>
      </template>
    </el-table-column>

  </common-list>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, User } from '@element-plus/icons-vue'
import CommonList from '@/components/common/CommonList.vue'
import type { User as UserType } from '@/types/user'
import { getUsers, deleteUser, restoreUser } from '@/api/user'
import type { UserListQuery } from '@/types/user'
import UserFormDialog from './components/UserFormDialog.vue'
import { formatDateTime } from '@/utils/date'
import { useAuthStore } from '@/stores/auth'
const userStore = useAuthStore()

const loading = ref(false)
const userList = ref<UserType[]>([])
const total = ref(0)
const activeTab = ref<'active' | 'trash'>('active')
const queryParams = ref<UserListQuery>({ page: 1, page_size: 20, is_deleted: false })

// 对话框相关
const dialogVisible = ref(false)
const currentUser = ref<UserType | null>(null)

const isManagedRole = (role: string) => role === 'admin' || role === 'super_admin'
const canOperateUser = (user: UserType) => userStore.isSuperAdmin() || !isManagedRole(user.role)

const fetchUsers = async () => {
  loading.value = true
  try {
    const [result] = await Promise.all([
      getUsers(queryParams.value),
      new Promise(resolve => setTimeout(resolve, 300))
    ])
    userList.value = result.list
    total.value = result.total
  } catch {
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  queryParams.value.page = page
  fetchUsers()
}

const handlePageSizeChange = (pageSize: number) => {
  queryParams.value.page_size = pageSize
  queryParams.value.page = 1
  fetchUsers()
}

const handleTabChange = (tab: string | number) => {
  activeTab.value = tab === 'trash' ? 'trash' : 'active'
  queryParams.value.is_deleted = activeTab.value === 'trash'
  queryParams.value.page = 1
  fetchUsers()
}

const handleCreate = () => {
  currentUser.value = null
  dialogVisible.value = true
}

const handleEdit = (user: UserType) => {
  if (!canOperateUser(user)) return
  currentUser.value = user
  dialogVisible.value = true
}

const handleDelete = async (id: number) => {
  const target = userList.value.find(user => user.id === id)
  if (target && !canOperateUser(target)) return

  try {
    await ElMessageBox.confirm('确定要删除这个用户吗？', '提示', { type: 'warning' })
    await deleteUser(id)
    ElMessage.success('删除成功')
    fetchUsers()
  } catch (error) {
    if (error !== 'cancel' && error instanceof Error) ElMessage.error(error.message)
  }
}

const handleRestore = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要恢复这个用户吗？', '提示', { type: 'info' })
    await restoreUser(id)
    ElMessage.success('恢复成功')
    fetchUsers()
  } catch (error) {
    if (error !== 'cancel' && error instanceof Error) ElMessage.error(error.message)
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.login-methods {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.login-methods i {
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
