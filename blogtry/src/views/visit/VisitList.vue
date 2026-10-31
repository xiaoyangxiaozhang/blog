<template>
    <common-list title="访问日志" :data="visitList" :loading="loading" :total="total" :show-create="false"
        v-model:page="queryParams.page" v-model:page-size="queryParams.page_size" @refresh="fetchVisits"
        @update:page="fetchVisits" @update:pageSize="fetchVisits">
        <template v-if="isMobile" #content>
            <div v-if="visitList.length" class="visit-list" role="list" aria-label="访问记录">
                <article v-for="visit in visitList" :key="visit.id" class="visit-record" role="listitem">
                    <div class="visit-heading">
                        <strong class="visit-page">{{ visit.page_url || '未知页面' }}</strong>
                        <time :datetime="visit.created_at">{{ formatDateTime(visit.created_at) }}</time>
                    </div>
                    <p class="visit-context">
                        <span>{{ visit.location || '未知地区' }}</span>
                        <span v-if="visit.browser">{{ visit.browser }}</span>
                        <span v-if="visit.os">{{ visit.os }}</span>
                    </p>
                    <details class="visit-details">
                        <summary>访客详情</summary>
                        <dl>
                            <div><dt>访客 ID</dt><dd>{{ visit.visitor_id || '—' }}</dd></div>
                            <div><dt>IP 地址</dt><dd>{{ visit.ip || '—' }}</dd></div>
                            <div><dt>来源</dt><dd>{{ visit.referer || '—' }}</dd></div>
                        </dl>
                    </details>
                </article>
            </div>
            <el-empty v-else description="暂无访问记录" :image-size="72" />
        </template>

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
                <span v-else style="color: var(--admin-text-muted)">-</span>
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
import { useMediaQuery } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import CommonList from '@/components/common/CommonList.vue'
import type { Visit } from '@/types/stats'
import type { PaginationQuery } from '@/types/request'
import { getVisits } from '@/api/stats'
import { formatDateTime } from '@/utils/date'

const isMobile = useMediaQuery('(max-width: 768px)')
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


<style scoped lang="scss">
.visit-list { display: grid; gap: 10px; }
.visit-record { min-width: 0; padding: 14px 16px; border-radius: 10px; background: color-mix(in srgb, var(--admin-text) 3%, transparent); }
.visit-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.visit-page { min-width: 0; color: var(--admin-text); font-size: 14px; font-weight: 500; line-height: 1.5; overflow-wrap: anywhere; }
.visit-heading time { flex-shrink: 0; color: var(--admin-text-muted); font-size: 12px; line-height: 1.75; font-variant-numeric: tabular-nums; }
.visit-context { display: flex; flex-wrap: wrap; gap: 4px 10px; margin: 6px 0 0; color: var(--admin-text-secondary); font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.visit-context span + span::before { content: '·'; margin-right: 10px; color: var(--admin-text-muted); }
.visit-details { margin-top: 8px; color: var(--admin-text-muted); font-size: 12px; line-height: 1.6; }
.visit-details summary { width: fit-content; min-height: 44px; display: flex; align-items: center; cursor: pointer; }
.visit-details summary::after { content: '⌄'; margin-left: 5px; }
.visit-details[open] summary::after { transform: rotate(180deg); }
.visit-details summary:focus-visible { outline: 2px solid var(--admin-brand); outline-offset: 2px; }
.visit-details dl { display: grid; gap: 6px; margin: 4px 0 0; }
.visit-details dl div { display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 8px; }
.visit-details dt { color: var(--admin-text-muted); }
.visit-details dd { margin: 0; color: var(--admin-text-secondary); overflow-wrap: anywhere; }
@media (max-width: 420px) { .visit-heading { flex-wrap: wrap; gap: 2px 10px; } }
</style>
