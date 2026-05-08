<template>
    <common-list title="访问日志" :data="visitList" :loading="loading" :total="total" :show-create="false"
        v-model:page="queryParams.page" v-model:page-size="queryParams.page_size" @refresh="fetchVisits"
        @update:page="fetchVisits" @update:pageSize="fetchVisits">
        <!-- 表格列 -->
        <el-table-column label="访客ID" width="150" align="center">
            <template #default="{ row }">
                <el-tooltip :content="row.visitor_id" placement="top">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                        {{ row.visitor_id.substring(0, 12) }}...
                    </div>
                </el-tooltip>
            </template>
        </el-table-column>

        <el-table-column label="IP地址" width="140" align="center" prop="ip" />

        <el-table-column label="访问页面" min-width="250">
            <template #default="{ row }">
                <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                    <el-tooltip :content="row.page_url" placement="top">
                        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                            {{ row.page_url }}
                        </div>
                    </el-tooltip>
                </div>
            </template>
        </el-table-column>

        <el-table-column label="地理位置" width="150" align="center" prop="location" />

        <el-table-column label="浏览器" width="140" align="center" prop="browser" />

        <el-table-column label="操作系统" width="120" align="center" prop="os" />

        <el-table-column label="来源" width="250" align="center">
            <template #default="{ row }">
                <el-tooltip v-if="row.referer" :content="row.referer" placement="top">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                        {{ row.referer }}
                    </div>
                </el-tooltip>
                <span v-else style="color: #999">-</span>
            </template>
        </el-table-column>

        <el-table-column label="访问时间" width="180" align="center">
            <template #default="{ row }">
                {{ formatDateTime(row.created_at) }}
            </template>
        </el-table-column>
    </common-list>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import CommonList from '@/components/common/CommonList.vue'
import type { Visit } from '@/types/stats'
import type { PaginationQuery } from '@/types/request'
import { getVisits } from '@/api/stats'
import { formatDateTime } from '@/utils/date'

const loading = ref(false)
const visitList = ref<Visit[]>([])
const total = ref(0)
const queryParams = ref<PaginationQuery>({ page: 1, page_size: 20 })

const fetchVisits = async () => {
    loading.value = true
    try {
        const [result] = await Promise.all([
            getVisits(queryParams.value),
            new Promise(resolve => setTimeout(resolve, 300))
        ])
        visitList.value = result.list
        total.value = result.total
    } catch {
        ElMessage.error('获取访问日志失败')
    } finally {
        loading.value = false
    }
}

onMounted(fetchVisits)
</script>
