<template>
  <div class="recruitment-page">
    <el-card shadow="never" class="recruitment-panel">
      <div class="toolbar">
        <h2>招聘进展</h2>
        <el-button v-if="state?.configured" :loading="syncing || state.scanning" @click="refreshNow">刷新</el-button>
      </div>

      <el-alert v-if="!secureConnection" type="warning" :closable="false" show-icon title="请通过 HTTPS 连接邮箱。" />
      <el-alert v-if="error" type="error" :title="error" :closable="false" show-icon />
      <el-alert v-if="state?.error" type="warning" :title="state.error" :closable="false" show-icon />

      <section v-if="!state?.configured" class="connect">
        <h3>连接 QQ 邮箱</h3>
        <p>输入 QQ 邮箱地址和 IMAP 授权码。</p>
        <el-form label-position="top" @submit.prevent="connect">
          <el-form-item label="QQ 邮箱地址"><el-input v-model.trim="email" autocomplete="username" placeholder="例如 123456@qq.com" /></el-form-item>
          <el-form-item label="邮箱授权码"><el-input v-model="code" type="password" autocomplete="off" show-password placeholder="输入 QQ 邮箱生成的授权码" /></el-form-item>
          <el-button native-type="submit" type="primary" :loading="connecting" :disabled="!secureConnection">连接邮箱</el-button>
        </el-form>
      </section>

      <template v-else>
        <div class="connection">
          <span class="connection-dot" aria-hidden="true"></span>
          <span>{{ state.scanning ? '正在同步' : state.updated_at ? `同步于 ${formatSync(state.updated_at)}` : '等待首次同步' }}</span>
          <el-button link @click="disconnect">断开</el-button>
        </div>
        <div v-if="!state.updated_at && state.scanning" class="empty">正在同步…</div>
        <template v-else>
          <div class="board" aria-label="招聘邮件看板">
            <section v-for="column in boardColumns" :key="column.key" class="board-column" :class="`board-column--${column.key}`">
              <div class="board-heading"><h3>{{ column.title }}</h3><span>{{ column.items.length }}</span></div>
              <div v-if="!column.items.length" class="board-empty">暂无通知</div>
              <div v-else class="board-list">
                <details v-for="entry in column.items" :key="entry.mail.uid" class="board-card">
                  <summary>
                    <div class="card-top"><strong>{{ entry.company }}</strong><span class="chevron" aria-hidden="true">›</span></div>
                    <p class="card-subject">{{ entry.mail.subject }}</p>
                    <div v-if="entry.deadline" class="card-time" :class="{ urgent: daysAway(entry.deadline.at) <= 2 }">
                      <span>{{ deadlineLabel(entry.deadline) }}</span><strong>{{ formatDeadline(entry.deadline) }}</strong><span>{{ deadlineHint(entry.deadline) }}</span>
                    </div>
                    <div v-else-if="column.key === 'progress'" class="card-meta"><span>{{ entry.action }}</span><time :datetime="entry.mail.received_at">{{ formatShort(entry.mail.received_at) }}</time></div>
                    <div v-else class="card-meta"><span>时间待确认</span><time :datetime="entry.mail.received_at">{{ formatShort(entry.mail.received_at) }}</time></div>
                  </summary>
                  <div class="card-detail">
                    <ul v-if="entry.mail.highlights.length"><li v-for="line in entry.mail.highlights" :key="line">{{ line }}</li></ul>
                    <p v-else>请查看原邮件。</p>
                    <div v-if="entry.related.length" class="related"><strong>同公司通知</strong><p v-for="mail in entry.related" :key="mail.uid">{{ formatShort(mail.received_at) }} · {{ mail.subject }}</p></div>
                  </div>
                </details>
              </div>
            </section>
          </div>

          <details v-if="overview.history.length" class="history">
            <summary>较早或时间已过 <span>{{ overview.history.length }}</span></summary>
            <div class="entry-list history-list"><details v-for="entry in overview.history" :key="entry.mail.uid" class="entry"><summary><span class="entry-name"><strong>{{ entry.company }}</strong><span class="category">{{ entry.mail.category }}</span></span><time>{{ entry.deadline ? formatDeadline(entry.deadline) : formatShort(entry.mail.received_at) }}</time><span class="chevron" aria-hidden="true">›</span></summary><div class="entry-detail"><p class="subject">{{ entry.mail.subject }}</p><ul><li v-for="line in entry.mail.highlights" :key="line">{{ line }}</li></ul></div></details></div>
          </details>
          <p class="note">时间与进度以原邮件为准 <a href="https://mail.qq.com/" target="_blank" rel="noopener noreferrer">打开 QQ 邮箱 ↗</a></p>
        </template>
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
import { buildOverview } from '@/utils/recruitmentOverview'
import type { Deadline } from '@/utils/recruitmentOverview'

const state = ref<RecruitmentState | null>(null)
const loading = ref(false)
const connecting = ref(false)
const syncing = ref(false)
const error = ref('')
const email = ref('')
const code = ref('')
const now = ref(Date.now())
const overview = computed(() => buildOverview(state.value?.items ?? [], now.value))
const focusItems = computed(() => [...overview.value.upcoming, ...overview.value.undated])
const boardColumns = computed(() => [
  { key: 'assessment', title: '测评', items: focusItems.value.filter(entry => entry.mail.category === '测评') },
  { key: 'exam', title: '笔试', items: focusItems.value.filter(entry => entry.mail.category === '笔试') },
  { key: 'interview', title: '面试', items: focusItems.value.filter(entry => entry.mail.category === '面试') },
  { key: 'progress', title: '招聘进展', items: overview.value.progress }
])
const secureConnection = computed(() => {
  const api = new URL(request.defaults.baseURL || '', window.location.href)
  return (window.isSecureContext && api.protocol === 'https:') ||
    (['localhost', '127.0.0.1'].includes(window.location.hostname) && ['localhost', '127.0.0.1'].includes(api.hostname))
})
const formatSync = (value: string) => new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
const formatShort = (value: string) => new Date(value).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'short', day: 'numeric' })
function formatDeadline(deadline: Deadline) {
  return new Date(deadline.at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', ...(deadline.hasTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}) })
}
function daysAway(timestamp: number) { return Math.floor((timestamp + 8 * 3600000) / 86400000) - Math.floor((now.value + 8 * 3600000) / 86400000) }
function deadlineLabel(deadline: Deadline) {
  if (deadline.label === '按收信时间推算') return '推算截止'
  return deadline.label === '邮件截止时间' ? '截止' : '时间'
}
function deadlineHint(deadline: Deadline) {
  const days = daysAway(deadline.at)
  const notes = [days === 0 ? '今天' : days === 1 ? '明天' : `${days}天后`]
  if (!deadline.hasTime) notes.push('时刻未注明')
  if (deadline.uncertainZone) notes.push('时区未注明')
  return notes.join(' · ')
}
let timer: ReturnType<typeof setInterval> | undefined

async function load() {
  if (!secureConnection.value || loading.value) return
  loading.value = true
  try { state.value = await getRecruitment(); error.value = '' }
  catch (err) { error.value = err instanceof Error ? err.message : '获取招聘邮件失败' }
  finally { loading.value = false }
}
async function connect() {
  if (!email.value || !code.value) { ElMessage.warning('请输入邮箱地址和授权码'); return }
  connecting.value = true
  try { await connectRecruitment(email.value, code.value); code.value = ''; ElMessage.success('邮箱连接成功，正在同步'); await load() }
  catch (err) { ElMessage.error(err instanceof Error ? err.message : '连接失败') }
  finally { connecting.value = false }
}
async function disconnect() {
  try { await ElMessageBox.confirm('断开后服务器会删除保存的邮箱授权码，停止同步。', '断开 QQ 邮箱', { confirmButtonText: '断开', cancelButtonText: '取消', type: 'warning' }) }
  catch { return }
  try { await disconnectRecruitment(); state.value = null; code.value = ''; await load(); ElMessage.success('已断开邮箱') }
  catch (err) { ElMessage.error(err instanceof Error ? err.message : '断开失败') }
}
async function refreshNow() {
  syncing.value = true
  try { await syncRecruitment(); await load(); ElMessage.success('正在同步') }
  catch (err) { ElMessage.error(err instanceof Error ? err.message : '同步失败') }
  finally { syncing.value = false }
}
onMounted(() => { void load(); timer = setInterval(() => { now.value = Date.now(); void load() }, 5000) })
onUnmounted(() => { if (timer) clearInterval(timer); code.value = '' })
</script>

<style scoped>
.recruitment-page { max-width: 1600px; margin: 0 auto; }
.recruitment-panel { border-radius: 14px; }
.toolbar, .connection, .entry > summary, .entry-name { display: flex; align-items: center; gap: 10px; }
.toolbar { justify-content: space-between; margin-bottom: 12px; }
.toolbar h2 { margin: 0; font-size: 20px; }
.el-alert { margin-bottom: 14px; }
.connect { max-width: 460px; padding: 12px 0; }
.connect h3 { margin: 0 0 8px; }
.connect p, .note { color: var(--el-text-color-secondary); font-size: 13px; }
.connect p { margin: 0 0 20px; }
.connection { color: var(--el-text-color-secondary); font-size: 12px; margin-bottom: 24px; }
.connection-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--el-color-success); }
.connection .el-button { margin-left: auto; }
.board { display: grid; grid-template-columns: repeat(4, minmax(220px, 1fr)); gap: 14px; overflow-x: auto; padding-bottom: 4px; }
.board-column { min-width: 0; padding: 12px; border: 1px solid var(--el-border-color-lighter); border-radius: 10px; background: var(--el-fill-color-light); }
.board-heading { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.board-heading::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--el-color-primary); }
.board-column--exam .board-heading::before { background: var(--el-color-warning); }
.board-column--interview .board-heading::before { background: var(--el-color-success); }
.board-column--progress .board-heading::before { background: var(--el-color-info); }
.board-heading h3 { margin: 0; font-size: 14px; }
.board-heading > span { color: var(--el-text-color-secondary); font-size: 12px; }
.board-list { display: grid; gap: 10px; align-content: start; max-height: 70vh; overflow-y: auto; }
.board-empty { padding: 18px 2px; color: var(--el-text-color-placeholder); font-size: 12px; }
.board-card { min-width: 0; background: var(--el-bg-color); border: 1px solid var(--el-border-color-lighter); border-radius: 8px; }
.board-card > summary { padding: 12px; cursor: pointer; list-style: none; }
.board-card > summary::-webkit-details-marker { display: none; }
.card-top, .card-meta { display: flex; justify-content: space-between; align-items: start; gap: 8px; }
.card-top strong { font-size: 14px; overflow-wrap: anywhere; }
.card-subject { margin: 8px 0; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.card-time, .card-meta { color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.5; }
.card-time { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 7px; }
.card-time strong { color: var(--el-text-color-primary); font-size: 13px; }
.card-time.urgent, .card-time.urgent strong { color: var(--el-color-warning-dark-2); }
.card-meta time { white-space: nowrap; }
.board-card[open] > summary .chevron { transform: rotate(90deg); }
.card-detail { padding: 0 12px 12px; border-top: 1px solid var(--el-border-color-lighter); color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.65; overflow-wrap: anywhere; }
.card-detail ul { padding-left: 18px; margin: 10px 0 0; }
.card-detail p { margin: 8px 0 0; }
.entry-list { border-top: 1px solid var(--el-border-color-lighter); }
.entry { border-bottom: 1px solid var(--el-border-color-lighter); }
.entry > summary { min-height: 52px; padding: 10px 2px; cursor: pointer; list-style: none; }
.entry > summary::-webkit-details-marker { display: none; }
.entry-name { flex: 1; min-width: 0; flex-wrap: wrap; }
.entry-name strong { font-size: 14px; overflow-wrap: anywhere; }
.category { color: var(--el-color-primary); background: var(--el-color-primary-light-9); border-radius: 5px; padding: 2px 7px; font-size: 12px; white-space: nowrap; }
.entry time { color: var(--el-text-color-secondary); font-size: 12px; white-space: nowrap; }
.chevron { color: var(--el-text-color-placeholder); font-size: 19px; }
.entry[open] > summary .chevron { transform: rotate(90deg); }
.entry-detail { padding: 0 18px 14px; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.65; overflow-wrap: anywhere; }
.entry-detail p { margin: 7px 0; }
.entry-detail .subject { color: var(--el-text-color-primary); font-weight: 600; }
.entry-detail ul { padding-left: 18px; margin: 8px 0; }
.related { margin-top: 12px; }
.related strong { color: var(--el-text-color-regular); }
.history { margin-top: 24px; color: var(--el-text-color-secondary); font-size: 13px; }
.history > summary { cursor: pointer; }
.history > summary span { color: var(--el-text-color-placeholder); margin-left: 5px; }
.history-list { margin-top: 10px; }
.empty { padding: 18px 0; color: var(--el-text-color-secondary); font-size: 13px; }
.note { margin: 26px 0 0; font-size: 12px; }
.note a { margin-left: 8px; color: var(--el-color-primary); white-space: nowrap; }
@media (max-width: 600px) {
  .board { grid-template-columns: repeat(4, minmax(240px, 75vw)); }
  .board-list { max-height: 60vh; }
  .entry > summary { gap: 7px; }
  .entry-name { gap: 6px; }
}
</style>
