<template>
  <div class="recruitment-page">
    <el-card shadow="never" class="recruitment-panel">
      <div class="toolbar">
        <div>
          <h2>招聘进展</h2>
          <p>汇总近 90 天收件箱中的招聘邮件，每分钟自动同步。</p>
        </div>
        <el-button v-if="state?.configured" :loading="syncing || state.scanning" @click="refreshNow">立即同步</el-button>
      </div>

      <el-alert v-if="!secureConnection" type="warning" :closable="false" show-icon
        title="请通过 HTTPS 管理后台和 HTTPS 接口连接邮箱，以保护授权码。" />
      <el-alert v-if="error" type="error" :title="error" :closable="false" show-icon />
      <el-alert v-if="state?.error" type="warning" :title="state.error" :closable="false" show-icon />

      <section v-if="!state?.configured" class="connect">
        <h3>连接 QQ 邮箱</h3>
        <p>在 QQ 邮箱设置中启用 IMAP/SMTP 并生成授权码。授权码加密保存在服务器上，提交后不会显示。</p>
        <el-form label-position="top" @submit.prevent="connect">
          <el-form-item label="QQ 邮箱地址">
            <el-input v-model.trim="email" autocomplete="username" placeholder="例如 123456@qq.com" />
          </el-form-item>
          <el-form-item label="邮箱授权码">
            <el-input v-model="code" type="password" autocomplete="off" show-password placeholder="输入 QQ 邮箱生成的授权码" />
          </el-form-item>
          <el-button native-type="submit" type="primary" :loading="connecting" :disabled="!secureConnection">连接邮箱</el-button>
        </el-form>
      </section>

      <template v-else>
        <div class="connection">
          <span>已连接 {{ state.email }}</span>
          <span v-if="state.scanning">正在同步…</span>
          <span v-else-if="state.updated_at">上次同步 {{ formatDate(state.updated_at) }}</span>
          <span v-else>等待首次同步</span>
          <el-button link type="danger" @click="disconnect">断开连接</el-button>
        </div>

        <el-alert type="info" :closable="false" show-icon
          title="按关键词筛选并摘录邮件原文，可能遗漏或分类不准确；截止时间及完成状态请以原邮件和招聘系统为准。" />

        <div class="filters" role="group" aria-label="筛选招聘信息">
          <button v-for="filter in filters" :key="filter" type="button" :class="{ active: selected === filter }"
            :aria-pressed="selected === filter" @click="selected = filter">{{ filter }}</button>
        </div>
        <div v-if="loading && !state.updated_at" class="empty">正在读取招聘邮件…</div>
        <div v-else-if="visibleItems.length === 0" class="empty">{{ state.scanning ? '正在同步，请稍候…' : '暂无匹配的招聘邮件' }}</div>
        <div v-else class="mail-list">
          <article v-for="item in visibleItems" :key="item.uid" class="mail-card">
            <div class="mail-heading">
              <span class="badge">{{ item.category }}</span>
              <span v-if="item.unread" class="unread">未读</span>
              <time :datetime="item.received_at">{{ formatDate(item.received_at) }}</time>
            </div>
            <h3>{{ item.subject || '无主题' }}</h3>
            <div class="sender">{{ item.from }}</div>
            <ul v-if="item.highlights.length">
              <li v-for="line in item.highlights" :key="line">{{ line }}</li>
            </ul>
            <p v-else class="no-highlights">未提取到关键内容，请查看原邮件。</p>
          </article>
        </div>
        <p class="note">仅展示收件箱中按主题或发件人识别出的邮件，最多 200 封。读取不会将邮件标为已读。</p>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { connectRecruitment, disconnectRecruitment, getRecruitment, syncRecruitment } from '@/api/recruitment'
import type { RecruitmentState } from '@/api/recruitment'

const state = ref<RecruitmentState | null>(null)
const loading = ref(false)
const connecting = ref(false)
const syncing = ref(false)
const error = ref('')
const email = ref('')
const code = ref('')
const selected = ref('全部')
const filters = ['全部', '测评', '笔试', '面试', '结果反馈', '简历与进展', '投递与进展']
const visibleItems = computed(() => selected.value === '全部'
  ? state.value?.items ?? [] : (state.value?.items ?? []).filter(item => item.category === selected.value))
const secureConnection = computed(() => {
  const api = new URL(request.defaults.baseURL || '', window.location.href)
  return (window.isSecureContext && api.protocol === 'https:') ||
    (['localhost', '127.0.0.1'].includes(window.location.hostname) && ['localhost', '127.0.0.1'].includes(api.hostname))
})
const formatDate = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })
let timer: ReturnType<typeof setInterval> | undefined

async function load() {
  if (!secureConnection.value) return
  if (loading.value) return
  loading.value = true
  try {
    state.value = await getRecruitment()
    error.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : '获取招聘邮件失败'
  } finally { loading.value = false }
}

async function connect() {
  if (!email.value || !code.value) { ElMessage.warning('请输入邮箱地址和授权码'); return }
  connecting.value = true
  try {
    await connectRecruitment(email.value, code.value)
    code.value = ''
    ElMessage.success('邮箱连接成功，正在同步')
    await load()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '连接失败')
  } finally { connecting.value = false }
}

async function disconnect() {
  try {
    await ElMessageBox.confirm('断开后服务器会删除保存的邮箱授权码，停止同步。', '断开 QQ 邮箱', {
      confirmButtonText: '断开', cancelButtonText: '取消', type: 'warning'
    })
  } catch { return }
  try {
    await disconnectRecruitment()
    state.value = null
    code.value = ''
    await load()
    ElMessage.success('已断开邮箱')
  } catch (err) { ElMessage.error(err instanceof Error ? err.message : '断开失败') }
}

async function refreshNow() {
  syncing.value = true
  try {
    await syncRecruitment()
    await load()
    ElMessage.success('正在同步')
  } catch (err) { ElMessage.error(err instanceof Error ? err.message : '同步失败') }
  finally { syncing.value = false }
}

onMounted(() => { void load(); timer = setInterval(() => { void load() }, 5000) })
onUnmounted(() => { if (timer) clearInterval(timer); code.value = '' })
</script>

<style scoped>
.recruitment-page { max-width: 1100px; margin: 0 auto; }
.recruitment-panel { border-radius: 16px; }
.toolbar, .connection, .mail-heading { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.toolbar { justify-content: space-between; margin-bottom: 20px; }
.toolbar h2 { margin: 0 0 8px; font-size: 22px; }
.toolbar p, .connect p, .note { margin: 0; color: var(--el-text-color-secondary); line-height: 1.6; font-size: 13px; }
.el-alert { margin-bottom: 16px; }
.connect { max-width: 460px; padding: 8px 0 16px; }
.connect h3 { margin: 0 0 8px; }
.connect p { margin-bottom: 20px; }
.connection { margin-bottom: 18px; color: var(--el-text-color-secondary); font-size: 13px; }
.connection span:first-child { color: var(--el-text-color-primary); font-weight: 600; }
.filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 22px 0 18px; }
.filters button { border: 1px solid var(--el-border-color); background: transparent; color: var(--el-text-color-regular); border-radius: 20px; padding: 6px 13px; cursor: pointer; }
.filters button.active { color: var(--el-color-primary); border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
.mail-list { display: grid; gap: 12px; }
.mail-card { border: 1px solid var(--el-border-color-lighter); border-radius: 12px; padding: 16px; }
.mail-card h3 { font-size: 16px; margin: 10px 0 5px; line-height: 1.45; }
.mail-heading { font-size: 12px; color: var(--el-text-color-secondary); }
.mail-heading time { margin-left: auto; }
.badge { color: var(--el-color-primary); background: var(--el-color-primary-light-9); padding: 3px 8px; border-radius: 6px; }
.unread { color: var(--el-color-danger); }
.sender, .no-highlights { color: var(--el-text-color-secondary); font-size: 13px; }
.mail-card ul { margin: 12px 0 0; padding-left: 20px; color: var(--el-text-color-regular); line-height: 1.65; font-size: 14px; overflow-wrap: anywhere; }
.no-highlights { margin-bottom: 0; }
.empty { text-align: center; padding: 50px 0; color: var(--el-text-color-secondary); }
.note { margin-top: 18px; }
@media (max-width: 600px) { .recruitment-panel { border-radius: 10px; } .mail-card { padding: 12px; } .mail-heading time { margin-left: 0; } }
</style>
