<template>
  <common-list title="文件管理" :data="fileList" :loading="loading" :total="total" :show-create="false"
    v-model:page="query.page" v-model:page-size="query.page_size" @refresh="loadList" @update:page="loadList"
    @update:pageSize="loadList">
    <!-- 表格列 -->
    <el-table-column label="预览" width="80" align="center">
      <template #default="{ row }">
        <el-image v-if="isImage(row)" :src="row.file_url" fit="cover"
          style="width: 50px; height: 50px; border-radius: 4px" />
      </template>
    </el-table-column>

    <el-table-column label="文件名" min-width="180">
      <template #default="{ row }">
        <span style="margin-right: 8px;font-weight: 500">{{ row.file_name }}</span>
        <span style="font-size: 12px; color: #909399">{{ formatFileSize(row.file_size) }}</span>
      </template>
    </el-table-column>

    <el-table-column prop="original_name" label="原始文件名" min-width="200" show-overflow-tooltip />

    <el-table-column prop="file_type" label="类型" width="100" align="center" />

    <el-table-column label="状态" width="100" align="center">
      <template #default="{ row }">
        <el-tag :type="getStatusTagType(row.status)" size="small" effect="light">
          {{ getStatusText(row.status) }}
        </el-tag>
      </template>
    </el-table-column>

    <el-table-column prop="upload_type" label="用途" width="100" align="center" />

    <el-table-column label="上传时间" width="180" align="center">
      <template #default="{ row }">
        {{ formatDateTime(row.upload_time) }}
      </template>
    </el-table-column>

    <el-table-column label="操作" width="180" align="center" fixed="right">
      <template #default="{ row }">
        <el-button link type="primary" size="small" @click="copyUrl(row)">复制链接</el-button>
        <el-button link type="danger" size="small" @click="handleDelete(row.id)">删除</el-button>
      </template>
    </el-table-column>
  </common-list>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import CommonList from '@/components/common/CommonList.vue'
import { getFileList, deleteFile } from '@/api/file'
import type { FileInfo, FileListQuery } from '@/types/file'
import { formatDateTime } from '@/utils/date'

const query = reactive<FileListQuery>({ page: 1, page_size: 20 })
const fileList = ref<FileInfo[]>([])
const total = ref(0)
const loading = ref(false)
// 最新的请求ID，用于取消旧的请求
let latestRequestId = 0
const loadList = async () => {
  const requestId = ++latestRequestId
  const params = { ...query }
  loading.value = true
  try {
     const data = await getFileList(params)

    // 如果这不是最后一次请求，直接忽略返回结果
    if (requestId !== latestRequestId) return

    fileList.value = data.list
    total.value = data.total
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const copyUrl = async (file: FileInfo) => {
  try {
    await navigator.clipboard.writeText(file.file_url)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个文件吗？', '提示', { type: 'warning' })
    await deleteFile(id)
    ElMessage.success('删除成功')
    loadList()
  } catch (error) {
    if (error !== 'cancel' && error instanceof Error) ElMessage.error(error.message)
  }
}

const isImage = (file: FileInfo) => file.file_type?.startsWith('image/')

const formatFileSize = (size: number) => {
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}

const getStatusTagType = (status: number) => {
  return status === 1 ? 'success' : 'info'
}

const getStatusText = (status: number) => {
  return status === 1 ? '使用中' : '未使用'
}

onMounted(loadList)
</script>
