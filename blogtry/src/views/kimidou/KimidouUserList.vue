<template>
  <common-list
    title="基米斗用户"
    :data="users"
    :loading="loading"
    :total="total"
    :show-create="false"
    v-model:page="query.page"
    v-model:page-size="query.page_size"
    @refresh="fetchUsers"
    @update:page="fetchUsers"
    @update:pageSize="fetchUsers"
  >
    <template #extra>
      <el-tabs v-model="tab" @tab-change="handleTabChange">
        <el-tab-pane label="正常用户" name="active" />
        <el-tab-pane label="回收站" name="trash" />
      </el-tabs>
    </template>

    <el-table-column label="用户" min-width="190">
      <template #default="{ row }">
        <div class="user-cell">
          <el-avatar :src="row.avatar" :size="36">{{ row.nickname?.slice(0, 1) || '?' }}</el-avatar>
          <div><div>{{ row.nickname || '-' }}</div><small>{{ row.email || '无邮箱' }}</small></div>
        </div>
      </template>
    </el-table-column>
    <el-table-column label="网站" min-width="180"><template #default="{ row }">{{ row.website || '-' }}</template></el-table-column>
    <el-table-column label="发帖资格" width="120" align="center">
      <template #default="{ row }"><el-switch :model-value="row.can_post_moments" :disabled="tab === 'trash'" @change="togglePosting(row, $event)" /></template>
    </el-table-column>
    <el-table-column label="账号状态" width="120" align="center">
      <template #default="{ row }">
        <el-tag :type="row.is_enabled ? 'success' : 'danger'">{{ row.is_enabled ? '启用' : '禁用' }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="160" align="center" fixed="right">
      <template #default="{ row }">
        <template v-if="tab === 'active'">
          <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
          <el-button type="danger" link size="small" @click="removeUser(row.id)">删除</el-button>
        </template>
        <el-button v-else type="success" link size="small" @click="restoreUser(row.id)">恢复</el-button>
      </template>
    </el-table-column>
  </common-list>

  <el-dialog v-model="dialogVisible" title="编辑基米斗用户" width="520px">
    <el-form v-if="editingUser" label-width="90px" :model="editingUser">
      <el-form-item label="邮箱"><el-input v-model="editingUser.email" /></el-form-item>
      <el-form-item label="昵称"><el-input v-model="editingUser.nickname" maxlength="32" /></el-form-item>
      <el-form-item label="头像 URL"><el-input v-model="editingUser.avatar" /></el-form-item>
      <el-form-item label="网站"><el-input v-model="editingUser.website" /></el-form-item>
      <el-form-item label="发帖资格"><el-switch v-model="editingUser.can_post_moments" /></el-form-item>
      <el-form-item label="账号状态"><el-switch v-model="editingUser.is_enabled" active-text="启用" inactive-text="禁用" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveUser">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import CommonList from '@/components/common/CommonList.vue'
import {
  deleteKimidouUser,
  getKimidouUsers,
  restoreKimidouUser,
  updateKimidouUser
} from '@/api/kimidou'
import type { User, UpdateUserRequest } from '@/types/user'

const users = ref<User[]>([])
const loading = ref(false)
const saving = ref(false)
const total = ref(0)
const tab = ref<'active' | 'trash'>('active')
const query = reactive({ page: 1, page_size: 10, is_deleted: false })
const dialogVisible = ref(false)
const editingUser = ref<User | null>(null)

const fetchUsers = async () => {
  loading.value = true
  try {
    const result = await getKimidouUsers(query)
    users.value = result.list || []
    total.value = result.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '获取用户列表失败')
  } finally { loading.value = false }
}

const handleTabChange = () => {
  query.is_deleted = tab.value === 'trash'
  query.page = 1
  fetchUsers()
}

const openEdit = (user: User) => {
  editingUser.value = { ...user }
  dialogVisible.value = true
}

const saveUser = async () => {
  if (!editingUser.value) return
  if (editingUser.value.nickname.trim().length < 2) { ElMessage.warning('昵称至少需要2个字符'); return }
  saving.value = true
  try {
    const payload: UpdateUserRequest = {
      email: editingUser.value.email,
      nickname: editingUser.value.nickname.trim(),
      avatar: editingUser.value.avatar,
      website: editingUser.value.website,
      is_enabled: editingUser.value.is_enabled,
      can_post_moments: editingUser.value.can_post_moments
    }
    await updateKimidouUser(editingUser.value.id, payload)
    dialogVisible.value = false
    ElMessage.success('用户资料已更新')
    await fetchUsers()
  } catch (error: any) { ElMessage.error(error.message || '更新用户失败') }
  finally { saving.value = false }
}

const togglePosting = async (user: User, value: string | number | boolean) => {
  try {
    await updateKimidouUser(user.id, { can_post_moments: Boolean(value) })
    user.can_post_moments = Boolean(value)
    ElMessage.success(Boolean(value) ? '已开启发帖资格' : '已关闭发帖资格')
  } catch (error: any) { ElMessage.error(error.message || '更新发帖资格失败') }
}

const removeUser = async (id: number) => {
  try {
    await ElMessageBox.confirm('删除后可在回收站恢复，确定继续吗？', '提示', { type: 'warning' })
    await deleteKimidouUser(id)
    ElMessage.success('用户已删除')
    await fetchUsers()
  } catch (error: any) { if (error !== 'cancel') ElMessage.error(error.message || '删除用户失败') }
}

const restoreUser = async (id: number) => {
  try { await restoreKimidouUser(id); ElMessage.success('用户已恢复'); await fetchUsers() }
  catch (error: any) { ElMessage.error(error.message || '恢复用户失败') }
}

onMounted(fetchUsers)
</script>

<style scoped>
.user-cell { display: flex; align-items: center; gap: 10px; }
.user-cell small { color: var(--admin-text-muted); }
</style>
