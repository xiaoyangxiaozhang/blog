<template>
  <common-list title="文章列表" :data="articleList" :loading="loading" :total="total" v-model:page="queryParams.page"
    v-model:page-size="queryParams.page_size" create-text="新增文章" @create="handleCreate" @refresh="fetchArticles"
    @update:page="handlePageChange" @update:pageSize="handlePageSizeChange">
    <!-- 表格列定义 -->
    <template #toolbar-after>
      <el-button v-if="!isMobile" @click="categoryDialogVisible = true">
        分类管理
      </el-button>
      <el-button v-if="!isMobile" @click="tagDialogVisible = true">
        标签管理
      </el-button>
      <el-dropdown v-if="isMobile" trigger="click">
        <el-button>管理<el-icon><ArrowDown /></el-icon></el-button>
        <template #dropdown><el-dropdown-menu>
          <el-dropdown-item @click="categoryDialogVisible = true">分类管理</el-dropdown-item>
          <el-dropdown-item @click="tagDialogVisible = true">标签管理</el-dropdown-item>
        </el-dropdown-menu></template>
      </el-dropdown>
    </template>
    <!-- 弹窗组件 -->
    <template #extra>
      <category-manager v-model="categoryDialogVisible" />
      <tag-manager v-model="tagDialogVisible" />
    </template>
    <template #filters>
      <form class="article-filters" @submit.prevent="handleSearch">
        <el-input v-model="keyword" placeholder="搜索文章标题" aria-label="搜索文章标题" clearable @clear="handleSearch" maxlength="200">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="publishStatus" aria-label="文章发布状态" @change="handleSearch">
          <el-option label="全部文章" value="all" />
          <el-option label="已发布" value="published" />
          <el-option label="草稿" value="draft" />
        </el-select>
        <el-button native-type="submit" :disabled="loading">搜索</el-button>
      </form>
      <div class="article-result-count" aria-live="polite">共 {{ total }} 篇文章</div>
      <el-alert v-if="articleStore.articleError" :title="articleStore.articleError" type="error" :closable="false" show-icon />
    </template>
    <template v-if="isMobile" #content>
      <div v-if="articleList.length" class="mobile-articles">
        <article v-for="article in articleList" :key="article.id" class="mobile-article">
          <div class="article-heading">
            <div class="article-heading-text">
              <div class="article-status">
                <el-tag :type="article.is_publish ? 'success' : 'warning'" size="small">{{ article.is_publish ? '已发布' : '草稿' }}</el-tag>
                <el-tag v-if="article.is_top" size="small">置顶</el-tag>
                <el-tag v-if="article.is_essence" type="info" size="small">精选</el-tag>
              </div>
              <button type="button" class="article-title" @click="openReader(article.id)">{{ article.title }}</button>
            </div>
            <el-image v-if="article.cover" class="article-cover" :src="article.cover" :alt="article.title + '的封面'" fit="cover" />
          </div>
          <div class="article-meta">
            <span>{{ article.category?.name || '未分类' }}</span>
            <span v-if="article.publish_time || article.update_time">{{ article.is_publish ? '发布于' : '更新于' }} {{ formatDate(article.is_publish ? article.publish_time : article.update_time) }}</span>
          </div>
          <div v-if="article.tags?.length" class="article-tags">
            <span v-for="tag in article.tags" :key="tag.id">#{{ tag.name }}</span>
          </div>
          <div class="article-stats"><span>{{ article.view_count || 0 }} 次浏览</span><span>{{ article.comment_count || 0 }} 条评论</span></div>
          <div class="article-actions">
            <el-button @click="openReader(article.id)">查看正文</el-button>
            <el-button @click="handleEdit(article.id)">编辑</el-button>
            <el-dropdown trigger="click">
              <el-button aria-label="更多文章操作">更多<el-icon><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openExportDialog(article.id)">导出文章</el-dropdown-item>
                  <el-dropdown-item divided @click="handleDelete(article.id)">删除文章</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </article>
      </div>
      <el-empty v-else :description="articleStore.articleError ? '加载失败，请点击刷新重试' : '暂无符合条件的文章'" :image-size="80" />
    </template>
    <el-table-column label="封面" width="120" align="center">
      <template #default="{ row }">
        <el-image :src="row.cover" fit="cover" style="width: 80px; height: 50px; border-radius: 4px" />
      </template>
    </el-table-column>
    <el-table-column label="标题" min-width="300">
      <template #default="{ row }">
        <span>{{ row.title }}</span>
        <el-tag v-if="row.is_top" type="primary" size="small" style="margin-left: 8px">置顶</el-tag>
        <el-tag v-if="row.is_essence" type="success" size="small" style="margin-left: 8px">精选</el-tag>
        <el-tag v-if="!row.is_publish" type="warning" size="small" style="margin-left: 8px">草稿</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="分类" width="120" align="center">
      <template #default="{ row }">
        {{ row.category?.name || '未分类' }}
      </template>
    </el-table-column>
     <el-table-column label="标签" width="200" align="center">
      <template #default="{ row }">
        <el-tag v-for="tag in row.tags" :key="tag.id" size="small" type="info" style="margin: 2px">
          {{ tag.name }}
        </el-tag>
        <span v-if="!row.tags?.length" style="color: #999">-</span>
      </template>
    </el-table-column>

    <el-table-column label="发布地点" width="120" align="center">
      <template #default="{ row }">
        <span v-if="row.location">{{ row.location }}</span>
        <span v-else style="color: #999">-</span>
      </template>
    </el-table-column>

    <el-table-column label="统计" width="140" align="center">
      <template #default="{ row }">
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 13px;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <el-icon size="14" style="color: var(--admin-brand);">
              <View />
            </el-icon>
            <span>{{ row.view_count || 0 }}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <el-icon size="14" style="color: #67c23a;">
              <ChatDotRound />
            </el-icon>
            <span>{{ row.comment_count || 0 }}</span>
          </div>
        </div>
      </template>
    </el-table-column>

    <el-table-column label="发布时间" width="180" align="center">
      <template #default="{ row }">
        <div v-if="row.publish_time" style="font-size: 13px; line-height: 1.8;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
            <el-icon size="13" style="color: #67c23a;">
              <Upload />
            </el-icon>
            <span>{{ formatDateTime(row.publish_time) }}</span>
          </div>
          <div v-if="row.update_time && row.update_time !== row.publish_time"
            style="display: flex; align-items: center; justify-content: center; gap: 4px;">
            <el-icon size="13" style="color: var(--admin-brand);">
              <EditPen />
            </el-icon>
            <span>{{ formatDateTime(row.update_time) }}</span>
          </div>
        </div>
        <span v-else style="color: #999">未发布</span>
      </template>
    </el-table-column>

    <el-table-column label="操作" width="220" align="center" fixed="right">
      <template #default="{ row }">
        <el-button type="primary" link size="small" @click="openReader(row.id)">查看</el-button>
        <el-button type="primary" link size="small" @click="handleEdit(row.id)">编辑</el-button>
        <el-button type="success" link size="small" @click="openExportDialog(row.id)">导出</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row.id)">删除</el-button>
      </template>
    </el-table-column>
      

   
  </common-list>
  <el-drawer v-model="readerVisible" title="查看文章" :size="isMobile ? '100%' : 'min(800px, 100%)'" class="article-reader"
    @closed="readerRequest.latestRequestId.value++">
    <el-skeleton v-if="readerRequest.loading.value" :rows="8" animated />
    <el-result v-else-if="readerError" icon="error" title="文章加载失败" :sub-title="readerError">
      <template #extra><el-button @click="openReader(readerId)">重试</el-button></template>
    </el-result>
    <article v-else-if="readerArticle" class="article-reader-content">
      <div class="article-status"><el-tag :type="readerArticle.is_publish ? 'success' : 'warning'">{{ readerArticle.is_publish ? '已发布' : '草稿预览' }}</el-tag></div>
      <h1>{{ readerArticle.title }}</h1>
      <div class="article-meta"><span>{{ readerArticle.category?.name || '未分类' }}</span><span v-if="readerArticle.publish_time || readerArticle.update_time">{{ formatDate(readerArticle.publish_time || readerArticle.update_time) }}</span></div>
      <el-image v-if="readerArticle.cover" class="reader-cover" :src="readerArticle.cover" alt="文章封面" fit="cover" />
      <div class="markdown-content" v-html="readerHtml"></div>
    </article>
    <template #footer>
      <el-button @click="readerVisible = false">关闭</el-button>
      <el-button v-if="readerArticle" type="primary" @click="handleEdit(readerArticle.id)">编辑文章</el-button>
    </template>
  </el-drawer>
  <el-dialog v-model="exportDialogVisible" title="导出文章" width="min(480px, calc(100vw - 24px))" :close-on-click-modal="false">
    <div class="export-options">
      <button type="button" v-for="option in exportOptions" :key="option.key" class="export-option" :disabled="option.loading" :class="{ disabled: option.loading }"
        @click="handleExport(option.key)">
        <div class="option-icon">
          <i :class="option.icon"></i>
        </div>
        <div class="option-content">
          <div class="option-title">{{ option.title }}</div>
          <div class="option-desc">{{ option.desc }}</div>
        </div>
        <el-icon v-if="option.loading" class="is-loading">
          <Loading />
        </el-icon>
      </button>
    </div>
  </el-dialog>
</template>
<script setup lang="ts">
import type { Article } from '@/types/article'
import CommonList from '@/components/common/CommonList.vue'
import CategoryManager from '@/views/article/components/CategoryManager.vue'
import TagManager from '@/views/article/components/TagManager.vue'
import { useRouter } from 'vue-router'
import { Upload, EditPen, View, ChatDotRound, ArrowDown, Search, Loading } from '@element-plus/icons-vue'
import { ref, onMounted, computed, reactive } from 'vue'
import { useArticleStore } from '@/stores/article'
import { formatDateTime, formatDate } from '@/utils/date'
import { ElMessage, ElMessageBox } from 'element-plus'
import { downloadArticleZip, exportToWeChat, getArticle } from '@/api/article'
import { useMediaQuery } from '@vueuse/core'
import { useLatestRequest } from '@/composables/useLatestRequest'
import '@/assets/css/_prose.scss'

const router = useRouter()
const categoryDialogVisible = ref(false)
const tagDialogVisible = ref(false)
const isMobile = useMediaQuery('(max-width: 768px)')
const keyword = ref('')
const publishStatus = ref('all')
const appliedFilters = ref<{ keyword?: string; is_publish?: boolean }>({})
const readerVisible = ref(false)
const readerArticle = ref<Article | null>(null)
const readerError = ref('')
const readerId = ref(0)
const readerRequest = useLatestRequest()
const readerHtml = ref('')

const openReader = async (id: number) => {
  readerId.value = id
  readerArticle.value = null
  readerHtml.value = ''
  readerError.value = ''
  readerVisible.value = true
  try {
    await readerRequest.run(async () => {
      const [article, markdown] = await Promise.all([getArticle(id), import('@/utils/markdown')])
      return { article, html: markdown.renderMarkdown(article.content || '') }
    }, {
      onSuccess: result => { readerArticle.value = result.article; readerHtml.value = result.html },
      onError: error => { readerError.value = error instanceof Error ? error.message : '请稍后重试' }
    })
  } catch { /* 错误显示在查看面板中 */ }
}

// 使用 article store
const articleStore = useArticleStore()

// 计算属性
const articleList = computed(() => articleStore.articles)
const total = computed(() => articleStore.articleTotal)
const loading = computed(() => articleStore.articleLoading)
const queryParams = ref({
  page: articleStore.articlePage,
  page_size: articleStore.articlePageSize
})

const fetchArticles = async () => {
  try {
    await articleStore.fetchArticles({ ...queryParams.value, ...appliedFilters.value })
  } catch { /* 保留列表与错误提示，支持刷新重试 */ }
}

const handleSearch = async () => {
  appliedFilters.value = {
    keyword: keyword.value.trim() || undefined,
    is_publish: publishStatus.value === 'all' ? undefined : publishStatus.value === 'published'
  }
  queryParams.value.page = 1
  await fetchArticles()
}

const handlePageChange = async (page: number) => {
  queryParams.value.page = page
  await fetchArticles()
}

const handlePageSizeChange = async (pageSize: number) => {
  queryParams.value.page_size = pageSize
  queryParams.value.page = 1
  await fetchArticles()
}

const handleCreate = () => {
  router.push('/articles/create')
}

const handleEdit = (id: number) => router.push(`/articles/edit/${id}`)

const handleDelete = async (id: number) => {
  const article = articleList.value.find(item => item.id === id)
  try {
    await ElMessageBox.confirm(`确定删除「${article?.title || '这篇文章'}」吗？`, '删除文章', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
    })
  } catch { return }
  await articleStore.deleteArticleById(id)

  if (articleList.value.length === 0 && queryParams.value.page > 1) {
    queryParams.value.page -= 1
  }

  await fetchArticles()
}


const exportDialogVisible = ref(false)
const exportArticleId = ref<number>(0)

const exportOptions = reactive([
  { key: 'wechat', title: '导出到微信公众平台', desc: '推送到微信公众号草稿箱', icon: 'ri-wechat-line', loading: false },
  { key: 'markdown', title: '下载为 Markdown', desc: '下载含图片资源的完整文章', icon: 'ri-markdown-line', loading: false }
])

const openExportDialog = (id: number) => {
  exportArticleId.value = id
  exportDialogVisible.value = true
}

const handleExport = async (key: string) => {
  const option = exportOptions.find(o => o.key === key)
  if (!option || option.loading) return

  option.loading = true

  try {
    switch (key) {
      case 'wechat':
        await handleExportToWeChat()
        break
      case 'markdown':
        await handleDownloadMarkdown()
        break
    }
  } finally {
    option.loading = false
  }
}

// 导出到微信公众平台
const handleExportToWeChat = async () => {
  const result = await exportToWeChat(exportArticleId.value)
  
  if (result.success) {
    ElMessage.success('已导出到微信公众平台草稿箱')
  } else if (result.html) {
    await copyRichText(result.html)
    ElMessage.warning('推送失败，已复制到剪贴板')
  } else {
    ElMessage.error('导出失败')
  }
  
  if (result.warnings?.length) {
    result.warnings.forEach(w => ElMessage.warning(w))
  }
  exportDialogVisible.value = false
}

// 下载为 Markdown
const handleDownloadMarkdown = async () => {
  let waitingMessage: ReturnType<typeof ElMessage> | undefined
  const waitingTimer = setTimeout(() => {
    waitingMessage = ElMessage({
      message: '网络较慢或文件资源较大，请耐心等待...',
      type: 'info',
      duration: 0
    })
  }, 10000)

  try {
    const blob = await downloadArticleZip(exportArticleId.value)
    clearTimeout(waitingTimer)
    waitingMessage?.close()

    const article = articleList.value.find(a => a.id === exportArticleId.value)
    const filename = article ? `${article.title}.zip` : `article-${exportArticleId.value}.zip`
    downloadBlob(blob, filename)
    ElMessage.success('下载完成')
    exportDialogVisible.value = false
  } catch (error) {
    clearTimeout(waitingTimer)
    waitingMessage?.close()
    const errorMsg = error instanceof Error ? error.message : '下载失败，请稍后重试'
    ElMessage.error(errorMsg)
  }
}

// 下载 Blob 文件
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 复制到剪贴板（纯文本）
const copyToClipboard = async (text: string) => {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text)
  } else {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

// 复制富文本到剪贴板（HTML 格式）
const copyRichText = async (html: string) => {
  try {
    // 使用 Clipboard API 写入富文本
    const blob = new Blob([html], { type: 'text/html' })
    const clipboardItem = new ClipboardItem({
      'text/html': blob,
      'text/plain': new Blob([html], { type: 'text/plain' })
    })
    await navigator.clipboard.write([clipboardItem])
  } catch {
    // 降级方案：通过临时元素复制
    const container = document.createElement('div')
    container.innerHTML = html
    container.style.position = 'fixed'
    container.style.left = '-9999px'
    container.style.whiteSpace = 'pre-wrap'
    document.body.appendChild(container)

    const range = document.createRange()
    range.selectNodeContents(container)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)

    // 使用现代 Clipboard API 替代已弃用的 execCommand
    await navigator.clipboard.writeText(container.innerText)
    selection?.removeAllRanges()
    document.body.removeChild(container)
  }
}
// 初始化数据
onMounted(async () => {
  await articleStore.initialize()
  await fetchArticles()
})
</script>
<style scoped>
.article-filters { display: grid; grid-template-columns: minmax(0, 1fr) 140px auto; gap: 10px; margin: 8px 0 12px; }
.article-result-count { margin-bottom: 12px; font-size: 13px; color: var(--admin-text-muted); }
.mobile-article { padding: 20px 0; border-bottom: 1px solid var(--admin-border-soft); }
.mobile-article:first-child { padding-top: 4px; }
.article-heading { display: flex; align-items: flex-start; gap: 12px; }
.article-heading-text { flex: 1; min-width: 0; }
.article-status { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.article-title { display: block; width: 100%; min-height: 44px; border: 0; background: transparent; color: var(--admin-text); text-align: left; font: inherit; font-size: 16px; font-weight: 600; line-height: 1.55; overflow-wrap: anywhere; cursor: pointer; }
.article-cover { width: 80px; height: 72px; flex: 0 0 80px; border-radius: 8px; }
.article-meta, .article-stats { display: flex; flex-wrap: wrap; gap: 6px 14px; color: var(--admin-text-muted); font-size: 12px; line-height: 1.65; }
.article-meta { margin: 10px 0; }
.article-tags { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-bottom: 8px; color: var(--admin-text-secondary); font-size: 12px; overflow-wrap: anywhere; }
.article-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.article-actions :deep(.el-button) { min-height: 44px; margin: 0; padding: 0 14px; }
.article-actions :deep(.el-icon) { margin-left: 6px; }
.article-reader-content { max-width: 680px; margin: 0 auto; min-width: 0; }
.article-reader-content h1 { font-size: 24px; line-height: 1.45; overflow-wrap: anywhere; color: var(--admin-text); }
.reader-cover { width: 100%; max-height: 280px; border-radius: 10px; margin: 8px 0 20px; }
.article-reader-content :deep(.markdown-content) { overflow-wrap: anywhere; font-size: 16px; line-height: 1.8; }
.article-reader-content :deep(.markdown-content pre), .article-reader-content :deep(.markdown-content table) { max-width: 100%; overflow-x: auto; }
:global(.article-reader .el-drawer__header) { margin-bottom: 16px; }
:global(.article-reader .el-drawer__close-btn) { width: 44px; height: 44px; }
:global(.article-reader .el-drawer__footer) { border-top: 1px solid var(--admin-border); padding-bottom: max(16px, env(safe-area-inset-bottom)); }
:global(.article-reader .el-drawer__footer .el-button) { min-height: 44px; }
button:focus-visible { outline: 2px solid var(--admin-brand); outline-offset: 2px; }
@media (max-width: 768px) {
  .article-filters { grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
  .article-filters > .el-input { grid-column: 1 / -1; }
  .article-filters :deep(.el-input__wrapper), .article-filters :deep(.el-select__wrapper), .article-filters :deep(.el-button) { min-height: 44px; }
  .article-filters :deep(input) { font-size: 16px; }
  .article-reader-content h1 { font-size: 22px; }
}
.export-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.export-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-control);
  cursor: pointer;
  background: var(--admin-surface);
  text-align: left;
  font: inherit;
  width: 100%;
  transition: border-color 0.2s, background-color 0.2s;
}

.export-option:hover {
  border-color: var(--admin-brand);
  background: var(--admin-brand-soft);
}

.export-option.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.option-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: var(--admin-radius-control);
  font-size: 20px;
  color: #67c23a;
}

.export-option:nth-child(1) .option-icon {
  color: #07c160;
}

.export-option:nth-child(2) .option-icon {
  color: var(--admin-text-muted);
}

.option-content {
  flex: 1;
  min-width: 0;
}

.option-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--admin-text);
  margin-bottom: 4px;
}

.option-desc {
  font-size: 12px;
  color: var(--admin-text-muted);
}
</style>
