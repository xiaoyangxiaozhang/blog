<template>
  <common-list title="反馈投诉" :data="feedbackStore.feedbacks" :loading="feedbackStore.loading" :total="feedbackStore.total" :show-create="false"
    v-model:page="feedbackStore.queryParams.page" v-model:page-size="feedbackStore.queryParams.page_size" @refresh="fetchList"
    @update:page="fetchList" @update:pageSize="fetchList">
    <el-table-column label="工单号" width="150">
      <template #default="{ row }">
        <span>{{ row.ticket_no }}</span>
      </template>
    </el-table-column>

    <el-table-column label="类型" width="200">
      <template #default="{ row }">
        <el-tag :type="getReportTypeTagType(row.report_type)">
          {{ getReportTypeLabel(row.report_type) }}
        </el-tag>
      </template>
    </el-table-column>

    <el-table-column label="投诉地址" min-width="200">
      <template #default="{ row }">
        <span :title="row.report_url">
          {{ truncateUrl(row.report_url) }}
        </span>
      </template>
    </el-table-column>

    <el-table-column label="联系方式" width="200">
      <template #default="{ row }">
        <span v-if="row.email">{{ row.email }}</span>
      </template>
    </el-table-column>

    <el-table-column label="状态" width="120">
      <template #default="{ row }">
        <el-tag :type="getStatusTagType(row.status)">
          {{ getStatusLabel(row.status) }}
        </el-tag>
      </template>
    </el-table-column>

    <el-table-column label="反馈时间" width="180">
      <template #default="{ row }">
        {{ formatDateTime(row.feedback_time) }}
      </template>
    </el-table-column>

    <el-table-column label="操作" width="180" align="center" fixed="right">
      <template #default="{ row }">
        <el-button type="primary" size="small" text @click="handleView(row.id)">
          查看详情
        </el-button>
        <el-button type="danger" size="small" text @click="handleDelete(row.id)">
          删除
        </el-button>
      </template>
    </el-table-column>
  </common-list>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import CommonList from '@/components/common/CommonList.vue'
import { useFeedbackStore } from '@/stores/feedback'
import type { FeedbackStatus } from '@/types/feedback'
import { formatDateTime } from '@/utils/date'

const router = useRouter()
const feedbackStore = useFeedbackStore()

// 获取反馈列表
const fetchList = async () => {
  await feedbackStore.fetchFeedbacks()
}

const handleView = (id: number) => {
  router.push(`/feedback/${id}`)
}

// 删除反馈
const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除此反馈吗？', '提示', {
      type: 'warning'
    })
    await feedbackStore.handleDeleteFeedback(id)
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const getReportTypeLabel = (reportType: string) => {
  const labels: Record<string, string> = {
    'copyright': '版权侵权内容投诉',
    'inappropriate': '不当内容举报投诉',
    'summary': '文章摘要问题反馈',
    'suggestion': '功能建议优化反馈'
  }
  return labels[reportType] || reportType
}

const getReportTypeTagType = (reportType: string) => {
  const types: Record<string, any> = {
    'copyright': 'warning',
    'inappropriate': 'danger',
    'summary': 'info',
    'suggestion': 'success'
  }
  return types[reportType] || 'info'
}

const getStatusLabel = (status: FeedbackStatus) => {
  const labels: Record<FeedbackStatus, string> = {
    pending: '待处理',
    resolved: '已解决',
    closed: '已关闭'
  }
  return labels[status] || status
}

const getStatusTagType = (status: FeedbackStatus) => {
  const types: Record<FeedbackStatus, any> = {
    pending: 'warning',
    resolved: 'success',
    closed: 'info'
  }
  return types[status] || 'info'
}

const truncateUrl = (url: string) => {
  if (!url) return '无地址'
  if (url.length <= 60) return url
  return url.substring(0, 60) + '...'
}

onMounted(() => {
  fetchList()
})
</script>
