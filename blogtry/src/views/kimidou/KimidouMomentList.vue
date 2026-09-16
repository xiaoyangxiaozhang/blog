<template>
  <common-list
    title="基米斗动态"
    :data="items"
    :loading="loading"
    :total="total"
    :show-create="canCreate"
    create-text="发布动态"
    v-model:page="query.page"
    v-model:page-size="query.page_size"
    @create="openCreate"
    @refresh="fetchItems"
    @update:page="fetchItems"
    @update:pageSize="fetchItems"
  >
    <template #extra>
      <el-alert
        v-if="!isAdmin && !canCreate"
        title="发帖资格待管理员同意"
        description="管理员开启发帖资格后，你就可以发布基米斗动态。"
        type="warning"
        :closable="false"
        show-icon
      />
      <el-tabs v-model="tab" @tab-change="handleTabChange">
        <el-tab-pane label="正常动态" name="active" />
        <el-tab-pane label="回收站" name="trash" />
      </el-tabs>
    </template>

    <el-table-column label="作者" min-width="150">
      <template #default="{ row }">
        <div class="author-cell">
          <el-avatar :src="row.author?.avatar" :size="34">{{ row.author?.nickname?.slice(0, 1) || '?' }}</el-avatar>
          <span>{{ row.author?.nickname || '已删除用户' }}</span>
          <el-tag v-if="row.author?.badge" size="small" effect="plain">{{ row.author.badge }}</el-tag>
        </div>
      </template>
    </el-table-column>

    <el-table-column label="内容" min-width="360">
      <template #default="{ row }">
        <div class="moment-content">{{ row.content.text || '（图片动态）' }}</div>
        <div v-if="row.content.images?.length" class="images">
          <el-image v-for="image in row.content.images.slice(0, 3)" :key="image" :src="image" fit="cover" />
          <span v-if="row.content.images.length > 3">+{{ row.content.images.length - 3 }}</span>
        </div>
      </template>
    </el-table-column>

    <el-table-column label="状态" width="100" align="center">
      <template #default="{ row }">
        <el-tag v-if="row.deleted_at" type="danger" size="small">已删除</el-tag>
        <el-tag v-else :type="row.is_publish ? 'success' : 'warning'" size="small">{{ row.is_publish ? '已发布' : '草稿' }}</el-tag>
      </template>
    </el-table-column>

    <el-table-column label="发布时间" width="180" align="center">
      <template #default="{ row }">{{ row.publish_time || '-' }}</template>
    </el-table-column>

    <el-table-column label="操作" width="150" align="center" fixed="right">
      <template #default="{ row }">
        <template v-if="tab === 'active'">
          <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
          <el-button type="danger" link size="small" @click="removeMoment(row.id)">删除</el-button>
        </template>
        <el-button v-else type="success" link size="small" @click="restoreMoment(row.id)">恢复</el-button>
      </template>
    </el-table-column>
  </common-list>

  <el-dialog v-model="dialogVisible" :title="editingId ? '编辑动态' : '发布动态'" width="560px" :close-on-click-modal="false">
    <el-form label-position="top">
      <el-form-item label="动态内容">
        <el-input v-model="contentText" type="textarea" :rows="6" maxlength="1000" show-word-limit placeholder="分享你和小猫的日常" />
      </el-form-item>
      <el-form-item label="图片（最多9张）">
        <input type="file" accept="image/*" multiple @change="handleFileChange" />
        <div class="selected-images">
          <div v-for="(image, index) in previewImages" :key="image" class="selected-image">
            <img :src="image" alt="待发布图片" />
            <el-button circle size="small" @click="removeImage(index)">×</el-button>
          </div>
        </div>
      </el-form-item>
      <el-form-item label="可见状态">
        <el-radio-group v-model="isPublish">
          <el-radio :value="true">公开</el-radio>
          <el-radio :value="false">草稿</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submitMoment">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import CommonList from '@/components/common/CommonList.vue'
import { useAuthStore } from '@/stores/auth'
import { uploadFile } from '@/api/file'
import {
  createKimidouMoment,
  deleteKimidouMoment,
  getKimidouMoments,
  restoreKimidouMoment,
  updateKimidouMoment
} from '@/api/kimidou'
import type { KimidouMoment, KimidouMomentPayload } from '@/types/kimidou'

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdminOrAbove())
const canCreate = computed(() => isAdmin.value || authStore.getUserInfo()?.can_post_moments === true)
const items = ref<KimidouMoment[]>([])
const loading = ref(false)
const saving = ref(false)
const total = ref(0)
const tab = ref<'active' | 'trash'>('active')
const query = ref({ page: 1, page_size: 10, is_deleted: false })
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const contentText = ref('')
const currentImages = ref<string[]>([])
const pendingFiles = ref<File[]>([])
const pendingPreviews = ref<string[]>([])
const isPublish = ref(true)
const previewImages = computed(() => [...currentImages.value, ...pendingPreviews.value])

const fetchItems = async () => {
  loading.value = true
  try {
    const result = await getKimidouMoments(query.value)
    items.value = result.list || []
    total.value = result.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '获取基米斗动态失败')
  } finally {
    loading.value = false
  }
}

const handleTabChange = () => {
  query.value.is_deleted = tab.value === 'trash'
  query.value.page = 1
  fetchItems()
}

const clearPending = () => {
  pendingPreviews.value.forEach(url => URL.revokeObjectURL(url))
  pendingFiles.value = []
  pendingPreviews.value = []
}

const resetEditor = () => {
  clearPending()
  editingId.value = null
  contentText.value = ''
  currentImages.value = []
  isPublish.value = true
}

const openCreate = () => {
  if (!canCreate.value) {
    ElMessage.warning('管理员尚未开启你的发帖资格')
    return
  }
  resetEditor()
  dialogVisible.value = true
}

const openEdit = (item: KimidouMoment) => {
  resetEditor()
  editingId.value = item.id
  contentText.value = item.content.text || ''
  currentImages.value = [...(item.content.images || [])]
  isPublish.value = item.is_publish
  dialogVisible.value = true
}

const handleFileChange = (event: Event) => {
  const files = Array.from((event.target as HTMLInputElement).files || [])
  const remaining = 9 - previewImages.value.length
  if (files.length > remaining) ElMessage.warning('动态最多保留9张图片')
  files.slice(0, Math.max(remaining, 0)).forEach(file => {
    pendingFiles.value.push(file)
    pendingPreviews.value.push(URL.createObjectURL(file))
  })
}

const removeImage = (index: number) => {
  if (index < currentImages.value.length) {
    currentImages.value.splice(index, 1)
    return
  }
  const pendingIndex = index - currentImages.value.length
  const preview = pendingPreviews.value[pendingIndex]
  if (preview) URL.revokeObjectURL(preview)
  pendingPreviews.value.splice(pendingIndex, 1)
  pendingFiles.value.splice(pendingIndex, 1)
}

const submitMoment = async () => {
  if (!contentText.value.trim() && previewImages.value.length === 0) {
    ElMessage.warning('请填写文字或选择图片')
    return
  }
  saving.value = true
  try {
    const images = [...currentImages.value]
    for (const file of pendingFiles.value) {
      const result = await uploadFile(file, 'cat_moment')
      images.push(result.file_url)
    }
    const payload: KimidouMomentPayload = {
      content: { text: contentText.value.trim(), images },
      is_publish: isPublish.value
    }
    if (editingId.value) await updateKimidouMoment(editingId.value, payload)
    else await createKimidouMoment(payload)
    ElMessage.success(editingId.value ? '动态已更新' : '动态已发布')
    dialogVisible.value = false
    resetEditor()
    await fetchItems()
  } catch (error: any) {
    ElMessage.error(error.message || '保存动态失败')
  } finally {
    saving.value = false
  }
}

const removeMoment = async (id: number) => {
  try {
    await ElMessageBox.confirm('删除后可在回收站恢复，确定继续吗？', '提示', { type: 'warning' })
    await deleteKimidouMoment(id)
    ElMessage.success('动态已删除')
    await fetchItems()
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error(error.message || '删除失败')
  }
}

const restoreMoment = async (id: number) => {
  try {
    await restoreKimidouMoment(id)
    ElMessage.success('动态已恢复')
    await fetchItems()
  } catch (error: any) {
    ElMessage.error(error.message || '恢复失败')
  }
}

onMounted(fetchItems)
onBeforeUnmount(clearPending)
</script>

<style scoped lang="scss">
.author-cell { display: flex; align-items: center; gap: 8px; }
.moment-content { white-space: pre-wrap; line-height: 1.5; }
.images, .selected-images { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.images .el-image { width: 48px; height: 48px; border-radius: 6px; }
.selected-image { position: relative; width: 88px; height: 88px; }
.selected-image img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }
.selected-image .el-button { position: absolute; top: 2px; right: 2px; }
</style>
