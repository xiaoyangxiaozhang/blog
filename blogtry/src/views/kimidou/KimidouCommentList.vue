<template>
  <common-list
    title="基米斗评论"
    :data="comments"
    :loading="loading"
    :total="total"
    :show-create="false"
    v-model:page="query.page"
    v-model:page-size="query.page_size"
    @refresh="fetchComments"
    @update:page="fetchComments"
    @update:pageSize="fetchComments"
  >
    <template #extra>
      <el-tabs v-model="tab" @tab-change="handleTabChange">
        <el-tab-pane label="正常评论" name="active" />
        <el-tab-pane label="回收站" name="trash" />
      </el-tabs>
    </template>
    <el-table-column label="评论内容" min-width="360"><template #default="{ row }"><span class="comment-text">{{ row.content }}</span></template></el-table-column>
    <el-table-column label="用户" min-width="150"><template #default="{ row }">{{ row.user?.nickname || '游客' }}</template></el-table-column>
    <el-table-column label="动态" width="130"><template #default="{ row }">#{{ row.target?.key || '-' }}</template></el-table-column>
    <el-table-column label="状态" width="100" align="center"><template #default="{ row }"><el-tag v-if="row.deleted_at" type="danger">已删除</el-tag><el-tag v-else :type="row.status ? 'success' : 'warning'">{{ row.status ? '显示' : '隐藏' }}</el-tag></template></el-table-column>
    <el-table-column label="操作" width="170" align="center" fixed="right">
      <template #default="{ row }">
        <template v-if="tab === 'active'">
          <el-button type="primary" link size="small" @click="toggleStatus(row)">{{ row.status ? '隐藏' : '显示' }}</el-button>
          <el-button type="danger" link size="small" @click="removeComment(row.id)">删除</el-button>
        </template>
        <el-button v-else type="success" link size="small" @click="restoreComment(row.id)">恢复</el-button>
      </template>
    </el-table-column>
  </common-list>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import CommonList from '@/components/common/CommonList.vue'
import {
  deleteKimidouComment,
  getKimidouComments,
  restoreKimidouComment,
  toggleKimidouComment,
  type KimidouComment
} from '@/api/kimidou'

const comments = ref<KimidouComment[]>([])
const loading = ref(false)
const total = ref(0)
const tab = ref<'active' | 'trash'>('active')
const query = reactive({ page: 1, page_size: 10, is_deleted: false })

const fetchComments = async () => {
  loading.value = true
  try {
    const result = await getKimidouComments(query)
    comments.value = result.list || []
    total.value = result.total || 0
  } catch (error: any) { ElMessage.error(error.message || '获取评论列表失败') }
  finally { loading.value = false }
}

const handleTabChange = () => { query.is_deleted = tab.value === 'trash'; query.page = 1; fetchComments() }
const toggleStatus = async (comment: KimidouComment) => {
  try { await toggleKimidouComment(comment.id); ElMessage.success(comment.status ? '评论已隐藏' : '评论已显示'); await fetchComments() }
  catch (error: any) { ElMessage.error(error.message || '更新评论状态失败') }
}
const removeComment = async (id: number) => {
  try { await ElMessageBox.confirm('删除后可在回收站恢复，确定继续吗？', '提示', { type: 'warning' }); await deleteKimidouComment(id); ElMessage.success('评论已删除'); await fetchComments() }
  catch (error: any) { if (error !== 'cancel') ElMessage.error(error.message || '删除评论失败') }
}
const restoreComment = async (id: number) => {
  try { await restoreKimidouComment(id); ElMessage.success('评论已恢复'); await fetchComments() }
  catch (error: any) { ElMessage.error(error.message || '恢复评论失败') }
}
onMounted(fetchComments)
</script>

<style scoped>
.comment-text { white-space: pre-wrap; line-height: 1.5; }
</style>
