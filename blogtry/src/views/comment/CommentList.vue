<template>
  <common-list
    title="评论管理"
    :data="commentList"
    :loading="loading"
    :total="total"
    :show-create="false"
    v-model:page="queryParams.page"
    v-model:page-size="queryParams.page_size"
    @refresh="fetchComments"
    @update:page="handlePageChange"
    @update:pageSize="handlePageSizeChange"
  >
    <template #extra>
      <el-tabs v-model="activeTab" class="comment-tabs" @tab-change="handleTabChange">
        <el-tab-pane name="active">
          <template #label>
            <span class="comment-tab-label">正常评论</span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="trash">
          <template #label>
            <span class="comment-tab-label"><el-icon><Delete /></el-icon>回收站</span>
          </template>
        </el-tab-pane>
      </el-tabs>
    </template>

    <el-table-column label="用户信息" width="180" align="center">
      <template #default="{ row }">
        <div style="display: flex; align-items: center; gap: 8px">
          <el-avatar :size="40" :src="row.user.avatar" style="flex-shrink: 0">
            <el-icon>
              <User />
            </el-icon>
          </el-avatar>
          <div style="flex: 1; min-width: 0; overflow: hidden; text-align: left">
            <div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
              {{ row.user.nickname }}
            </div>
            <div style="font-size: 12px; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
              {{ row.user.email }}
            </div>
          </div>
        </div>
      </template>
    </el-table-column>

    <el-table-column label="评论内容" min-width="300">
      <template #default="{ row }">
        <div style="line-height: 1.6; display: flex; align-items: center; gap: 8px">
          <span>{{ row.content }}</span>
          <el-tag v-if="row.deleted_at" type="danger" size="small">已删除</el-tag>
          <el-tag v-if="row.parent_id" type="info" size="small">子评论</el-tag>
        </div>
      </template>
    </el-table-column>

    <el-table-column label="评论来源" width="220" align="center">
      <template #default="{ row }">
        <div style="display: flex; align-items: center; gap: 8px">
          <el-tag v-if="row.target.type !== 'article'" type="success" size="small">
            {{ getTargetTypeText(row.target.type) }}
          </el-tag>
          <el-tooltip :content="row.target.title" placement="top">
            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; flex: 1">
              {{ row.target.title }}
            </div>
          </el-tooltip>
        </div>
      </template>
    </el-table-column>

    <el-table-column label="评论时间" width="180" align="center">
      <template #default="{ row }">
        {{ formatDateTime(row.created_at) }}
      </template>
    </el-table-column>

    <el-table-column label="状态" width="100" align="center">
      <template #default="{ row }">
        <el-switch
          v-model="row.status"
          :active-value="1"
          :inactive-value="0"
          inline-prompt
          active-text="显示"
          inactive-text="隐藏"
          :disabled="Boolean(row.deleted_at)"
          @change="handleStatusChange(row)"
        />
      </template>
    </el-table-column>

    <el-table-column label="操作" width="220" align="center" fixed="right">
      <template #default="{ row }">
        <el-button v-if="!row.deleted_at" type="primary" link size="small" @click="openReplyDialog(row)">
          回复
        </el-button>
        <el-button v-if="row.deleted_at" type="success" link size="small" @click="handleRestore(row.id)">
          恢复
        </el-button>
        <el-button v-else type="danger" link size="small" @click="handleDelete(row.id)">
          删除
        </el-button>
      </template>
    </el-table-column>
  </common-list>

  <el-dialog v-model="replyDialogVisible" title="回复评论" width="500px" destroy-on-close>
    <div v-if="replyingComment" class="reply-info">
      <div class="info-row">
        <span class="label">评论来源：</span>
        <span class="value">
          <el-tag v-if="replyingComment.target.type !== 'article'" type="success" size="small">
            {{ getTargetTypeText(replyingComment.target.type) }}
          </el-tag>
          {{ replyingComment.target.title }}
        </span>
      </div>
      <div class="info-row">
        <span class="label">评论时间：</span>
        <span class="value">{{ formatDateTime(replyingComment.created_at) }}</span>
      </div>
      <el-divider style="margin: 12px 0" />
      <div class="reply-to">
        回复 <span class="nickname">{{ replyingComment.user.nickname }}</span>：
      </div>
      <div class="original-content">{{ replyingComment.content }}</div>
    </div>
    <el-form :model="replyForm" label-width="80px" style="margin-top: 16px">
      <el-form-item label="回复内容">
        <el-input
          v-model="replyForm.content"
          type="textarea"
          :rows="4"
          placeholder="请输入回复内容..."
          show-word-limit
          maxlength="500"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="replyDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="replying" @click="handleReply">提交回复</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, User } from '@element-plus/icons-vue'
import CommonList from '@/components/common/CommonList.vue'
import { useLatestRequest } from '@/composables/useLatestRequest'
import type { Comment, CommentQuery } from '@/types/comment'
import { getComments, deleteComment, restoreComment, toggleCommentStatus, createComment } from '@/api/comment'
import { formatDateTime } from '@/utils/date'

const loading = ref(false)
const commentList = ref<Comment[]>([])
const total = ref(0)
const activeTab = ref<'active' | 'trash'>('active')
const queryParams = ref<CommentQuery>({ page: 1, page_size: 20, is_deleted: false })

const replyDialogVisible = ref(false)
const replying = ref(false)
const replyingComment = ref<Comment | null>(null)
const replyForm = ref({
  content: ''
})

const commentRequest = useLatestRequest()

const fetchComments = async () => {
  loading.value = true
  try {
    await commentRequest.run(
      () => getComments({ ...queryParams.value }),
      {
        onSuccess: (result) => {
          commentList.value = result.list
          total.value = result.total
        },
        onError: () => {
          ElMessage.error('获取评论列表失败')
        }
      }
    )
  } catch {
    // Error message is handled in useLatestRequest callback for latest request only.
  } finally {
    loading.value = commentRequest.loading.value
  }
}

const handlePageChange = (page: number) => {
  queryParams.value.page = page
  fetchComments()
}

const handlePageSizeChange = (pageSize: number) => {
  queryParams.value.page_size = pageSize
  queryParams.value.page = 1
  fetchComments()
}

const handleTabChange = (tab: string | number) => {
  activeTab.value = tab === 'trash' ? 'trash' : 'active'
  queryParams.value.is_deleted = activeTab.value === 'trash'
  queryParams.value.page = 1
  fetchComments()
}

const handleStatusChange = async (comment: Comment) => {
  const statusText = comment.status === 1 ? '显示' : '隐藏'
  try {
    await toggleCommentStatus(comment.id)
    ElMessage.success(`已设置为${statusText}`)
  } catch (error) {
    comment.status = comment.status === 1 ? 0 : 1
    if (error instanceof Error) {
      ElMessage.error(error.message)
    } else {
      ElMessage.error('状态切换失败')
    }
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这条评论吗？', '提示', { type: 'warning' })
    await deleteComment(id)
    ElMessage.success('删除成功')
    fetchComments()
  } catch (error) {
    if (error !== 'cancel' && error instanceof Error) ElMessage.error(error.message)
  }
}

const handleRestore = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要恢复这条评论吗？', '提示', { type: 'info' })
    await restoreComment(id)
    ElMessage.success('恢复成功')
    fetchComments()
  } catch (error) {
    if (error !== 'cancel' && error instanceof Error) ElMessage.error(error.message)
  }
}

const openReplyDialog = (comment: Comment) => {
  replyingComment.value = comment
  replyForm.value.content = ''
  replyDialogVisible.value = true
}

const handleReply = async () => {
  if (!replyForm.value.content.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  if (!replyingComment.value) {
    ElMessage.error('评论信息错误')
    return
  }

  replying.value = true
  try {
    await createComment({
      content: replyForm.value.content,
      target_type: replyingComment.value.target.type,
      target_key: replyingComment.value.target.key,
      parent_id: replyingComment.value.id
    })
    ElMessage.success('回复成功')
    replyDialogVisible.value = false
    fetchComments()
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message)
    } else {
      ElMessage.error('回复失败')
    }
  } finally {
    replying.value = false
  }
}

const getTargetTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    page: '页面'
  }
  return typeMap[type] || type
}

onMounted(fetchComments)
</script>

<style scoped lang="scss">
.comment-tabs {
  margin-bottom: 12px;

  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }
}

.comment-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.reply-info {
  padding: 12px;
  background-color: var(--admin-surface-soft);
  border-radius: var(--admin-radius-control);
  border: 1px solid var(--admin-border);

  .info-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    font-size: 13px;

    &:last-child {
      margin-bottom: 0;
    }

    .label {
      color: var(--admin-text-muted);
      flex-shrink: 0;
    }

    .value {
      color: var(--admin-text-secondary);
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  .reply-to {
    font-size: 14px;
    color: var(--admin-text-secondary);
    margin-bottom: 8px;

    .nickname {
      color: var(--admin-brand);
      font-weight: 500;
    }
  }

  .original-content {
    font-size: 13px;
    color: var(--admin-text-muted);
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
}
</style>
