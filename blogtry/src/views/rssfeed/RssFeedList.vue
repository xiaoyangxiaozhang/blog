<template>
  <common-list title="RSS订阅" :data="articleList" :loading="loading" :total="total" v-model:page="queryParams.page"
    v-model:page-size="queryParams.page_size" :show-create="false" @refresh="fetchArticles"
    @update:page="fetchArticles" @update:pageSize="fetchArticles">
    <!-- 额外按钮 -->
    <template #toolbar-after>
      <el-button type="primary" @click="openSubscriberDialog">
        本站订阅
      </el-button>
      <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99" class="unread-badge">
        <el-button type="success" :disabled="unreadCount === 0" @click="handleMarkAllRead"
          :v-if="authStore.isSuperAdmin">
          全部已读
        </el-button>
      </el-badge>
    </template>

    <!-- 表格列 -->
    <el-table-column label="状态" width="80" align="center">
      <template #default="{ row }">
        <el-tag :type="row.is_read ? 'info' : 'danger'" size="small">
          {{ row.is_read ? '已读' : '未读' }}
        </el-tag>
      </template>
    </el-table-column>

    <el-table-column label="文章标题" min-width="300">
      <template #default="{ row }">
        <a :href="row.link" target="_blank" class="article-link" :class="{ read: row.is_read }">
          {{ row.title }}
        </a>
      </template>
    </el-table-column>

    <el-table-column label="来源" width="180">
      <template #default="{ row }">
        <a :href="row.friend_url" target="_blank" class="friend-link">
          {{ row.friend_name }}
        </a>
      </template>
    </el-table-column>

    <el-table-column label="发布时间" width="180" align="center">
      <template #default="{ row }">
        <span v-if="row.published_at">{{ formatDateTime(row.published_at) }}</span>
        <span v-else style="color: #999">-</span>
      </template>
    </el-table-column>

    <el-table-column label="抓取时间" width="180" align="center">
      <template #default="{ row }">
        {{ formatDateTime(row.created_at) }}
      </template>
    </el-table-column>

    <el-table-column label="操作" width="120" align="center" fixed="right">
      <template #default="{ row }">
        <el-button v-if="!row.is_read && authStore.isSuperAdmin" type="primary" link size="small"
          @click="handleMarkRead(row)">
          标记已读
        </el-button>
        <span v-else style="color: #999">-</span>
      </template>
    </el-table-column>
  </common-list>

  <!-- 本站订阅弹窗 -->
  <el-dialog v-model="subscriberDialogVisible" title="本站订阅者" width="700px" destroy-on-close>
    <el-table :data="subscriberList" v-loading="subscriberLoading" border style="width: 100%">
      <el-table-column label="邮箱地址" min-width="240">
        <template #default="{ row }">
          <div style="display: flex; align-items: center; gap: 8px">
            <el-icon size="16" color="#409eff">
              <Message />
            </el-icon>
            <span>{{ row.email }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.active ? 'success' : 'info'" size="small">
            {{ row.active ? '活跃' : '已退订' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="订阅时间" width="170" align="center">
        <template #default="{ row }">
          {{ formatDateTime(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" align="center">
        <template #default="{ row }">
          <el-button type="danger" link size="small" @click="handleDeleteSubscriber(row.id)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
      <el-pagination v-model:current-page="subscriberQuery.page" v-model:page-size="subscriberQuery.page_size"
        :total="subscriberTotal" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next"
        @current-change="fetchSubscribers" @size-change="fetchSubscribers" />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Message } from '@element-plus/icons-vue'
import CommonList from '@/components/common/CommonList.vue'
import type { RssArticle, RssArticleQuery } from '@/types/rssfeed'
import type { Subscriber } from '@/types/subscriber'
import { getRssArticles, markRssArticleRead, markAllRssArticlesRead } from '@/api/rssfeed'
import { getSubscribers, deleteSubscriber } from '@/api/subscriber'
import { formatDateTime } from '@/utils/date'

import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
 

const loading = ref(false)
const articleList = ref<RssArticle[]>([])
const total = ref(0)
const unreadCount = ref(0)
const queryParams = ref<RssArticleQuery>({ page: 1, page_size: 20 })

/**
 * 获取RSS文章列表
 */
const fetchArticles = async () => {
  loading.value = true
  try {
    const result = await getRssArticles(queryParams.value)
    articleList.value = result.list
    total.value = result.total
    unreadCount.value = result.unread_count
  } catch {
    ElMessage.error('获取RSS文章列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 标记单篇文章已读
 */
const handleMarkRead = async (article: RssArticle) => {
  try {
    await markRssArticleRead(article.id)
    article.is_read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    ElMessage.success('已标记为已读')
  } catch {
    ElMessage.error('操作失败')
  }
}

/**
 * 全部标记已读
 */
const handleMarkAllRead = async () => {
  try {
    await ElMessageBox.confirm('确定要将所有未读文章标记为已读吗？', '提示', { type: 'warning' })
    const result = await markAllRssArticlesRead()
    ElMessage.success(`已标记 ${result.affected} 篇文章为已读`)
    fetchArticles()
  } catch (error) {
    if (error !== 'cancel' && error instanceof Error) {
      ElMessage.error(error.message)
    }
  }
}

// 订阅者相关
const subscriberDialogVisible = ref(false)
const subscriberLoading = ref(false)
const subscriberList = ref<Subscriber[]>([])
const subscriberTotal = ref(0)
const subscriberQuery = reactive({ page: 1, page_size: 10 })

/**
 * 打开订阅者弹窗
 */
const openSubscriberDialog = () => {
  subscriberDialogVisible.value = true
  subscriberQuery.page = 1
  fetchSubscribers()
}

/**
 * 获取订阅者列表
 */
const fetchSubscribers = async () => {
  subscriberLoading.value = true
  try {
    const result = await getSubscribers(subscriberQuery)
    subscriberList.value = result.list
    subscriberTotal.value = result.total
  } catch {
    ElMessage.error('获取订阅者列表失败')
  } finally {
    subscriberLoading.value = false
  }
}

/**
 * 删除订阅者
 */
const handleDeleteSubscriber = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除该订阅者吗？此操作不可恢复。', '提示', { type: 'warning' })
    await deleteSubscriber(id)
    ElMessage.success('删除成功')
    fetchSubscribers()
  } catch (error) {
    if (error !== 'cancel' && error instanceof Error) ElMessage.error(error.message)
  }
}

onMounted(fetchArticles)
</script>

<style scoped>
.article-link {
  color: var(--el-color-primary);
  text-decoration: none;
  transition: color 0.2s;
}

.article-link:hover {
  text-decoration: underline;
}

.article-link.read {
  color: var(--el-text-color-regular);
}

.friend-link {
  color: var(--el-text-color-secondary);
  text-decoration: none;
}

.friend-link:hover {
  color: var(--el-color-primary);
  text-decoration: underline;
}
</style>
