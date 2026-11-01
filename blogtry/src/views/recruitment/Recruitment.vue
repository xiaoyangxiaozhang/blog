<template>
  <div class="recruitment-page">
    <el-card shadow="never" class="recruitment-panel">
      <div class="toolbar">
        <div>
          <h2>招聘进展</h2>
          <p>重要时间与最新反馈，一眼掌握。</p>
        </div>
        <el-button v-if="state?.configured" :loading="syncing || state.scanning" @click="refreshNow">立即同步</el-button>
      </div>

      <el-alert v-if="!secureConnection" type="warning" :closable="false" show-icon title="请通过 HTTPS 管理后台和 HTTPS 接口连接邮箱，以保护授权码。" />
      <el-alert v-if="error" type="error" :title="error" :closable="false" show-icon />
      <el-alert v-if="state?.error" type="warning" :title="state.error" :closable="false" show-icon />

      <section v-if="!state?.configured" class="connect">
        <h3>连接 QQ 邮箱</h3>
        <p>在 QQ 邮箱设置中启用 IMAP/SMTP 并生成授权码。授权码加密保存在服务器上，提交后不会显示。</p>
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
          <span class="connection-email">{{ state.email }}</span>
          <el-button link @click="disconnect">断开</el-button>
        </div>
        <div v-if="!state.updated_at && state.scanning" class="empty">正在整理招聘信息，请稍候…</div>
        <template v-else>
          <div class="overview" aria-label="招聘概览">
            <div class="metric metric-urgent"><span>7 天内有时间安排</span><strong>{{ withinWeek }}</strong><small>测评、笔试及面试</small></div>
            <div class="metric"><span>时间待确认</span><strong>{{ overview.undated.length }}</strong><small>近期收到的邀请</small></div>
            <div class="metric"><span>招聘进展</span><strong>{{ overview.progress.length }}</strong><small>近 90 天的投递与反馈</small></div>
          </div>

          <section class="focus-section">
            <div class="section-heading"><div><h3>近期关注</h3><p>按邮件中的时间排序，完成情况请自行确认。</p></div><span>{{ focusItems.length }} 项</span></div>
            <div v-if="!focusItems.length" class="empty compact">近期没有识别到待关注的邀请。</div>
            <div v-else class="focus-list">
              <article v-for="entry in shownFocus" :key="entry.mail.uid" class="focus-card">
                <div class="focus-main">
                  <div class="company-line"><span class="category">{{ entry.mail.category }}</span><strong>{{ entry.company }}</strong><span v-if="entry.mail.unread" class="unread">未读</span></div>
                  <p class="action-label">{{ entry.action }}</p>
                  <div class="due" :class="{ urgent: entry.deadline && daysAway(entry.deadline.at) <= 2 }">
                    <template v-if="entry.deadline"><span>{{ entry.deadline.label }}</span><strong>{{ formatDeadline(entry.deadline) }}</strong><em>{{ deadlineHint(entry.deadline) }}</em></template>
                    <template v-else><span>时间</span><strong>待确认</strong><em>邮件未提取到明确时间</em></template>
                  </div>
                </div>
                <details class="source-details"><summary>查看邮件线索</summary><p class="subject">{{ entry.mail.subject }}</p><ul v-if="entry.mail.highlights.length"><li v-for="line in entry.mail.highlights" :key="line">{{ line }}</li></ul><p v-else>请在 QQ 邮箱中搜索邮件主题查看详情。</p></details>
                <details v-if="entry.related.length" class="source-details related"><summary>另有 {{ entry.related.length }} 封同公司通知，确认是否属于同一事项</summary><p v-for="mail in entry.related" :key="mail.uid">{{ formatShort(mail.received_at) }} · {{ mail.subject }}</p></details>
              </article>
            </div>
            <button v-if="focusItems.length > 6" class="more" type="button" @click="showAllFocus = !showAllFocus">{{ showAllFocus ? '收起' : `查看其余 ${focusItems.length - 6} 项` }}</button>
          </section>

          <section class="progress-section">
            <div class="section-heading"><div><h3>最近进展</h3><p>来自投递确认、简历和结果反馈。</p></div><span>{{ overview.progress.length }} 条</span></div>
            <div v-if="!overview.progress.length" class="empty compact">暂未识别到招聘反馈。</div>
            <div v-else class="progress-list">
              <details v-for="entry in shownProgress" :key="entry.mail.uid" class="progress-row">
                <summary><span class="progress-icon" aria-hidden="true">↗</span><span class="progress-content"><strong>{{ entry.company }}</strong><small>{{ entry.action }}</small></span><time :datetime="entry.mail.received_at">{{ formatShort(entry.mail.received_at) }}</time></summary>
                <div class="progress-detail"><p>{{ entry.mail.subject }}</p><ul v-if="entry.mail.highlights.length"><li v-for="line in entry.mail.highlights" :key="line">{{ line }}</li></ul></div>
              </details>
            </div>
            <button v-if="overview.progress.length > 4" class="more" type="button" @click="showAllProgress = !showAllProgress">{{ showAllProgress ? '收起' : `查看其余 ${overview.progress.length - 4} 条` }}</button>
          </section>

          <details v-if="overview.history.length" class="history">
            <summary>较早或时间已过的邀请 <span>{{ overview.history.length }}</span></summary>
            <div class="history-list"><details v-for="entry in overview.history" :key="entry.mail.uid" class="progress-row"><summary><span class="progress-content"><strong>{{ entry.company }}</strong><small>{{ entry.action }} · {{ entry.deadline ? formatDeadline(entry.deadline) : formatShort(entry.mail.received_at) }}</small></span></summary><div class="progress-detail"><p>{{ entry.mail.subject }}</p><ul><li v-for="line in entry.mail.highlights" :key="line">{{ line }}</li></ul></div></details></div>
          </details>
          <p class="note">根据近 90 天邮件的主题和关键句整理，最多 200 封，可能遗漏或误判。时间与实际完成状态请以原邮件和招聘系统为准。<a href="https://mail.qq.com/" target="_blank" rel="noopener noreferrer">打开 QQ 邮箱 ↗</a></p>
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
const showAllFocus = ref(false)
const showAllProgress = ref(false)
const now = ref(Date.now())
const overview = computed(() => buildOverview(state.value?.items ?? [], now.value))
const focusItems = computed(() => [...overview.value.upcoming, ...overview.value.undated])
const shownFocus = computed(() => showAllFocus.value ? focusItems.value : focusItems.value.slice(0, 6))
const shownProgress = computed(() => showAllProgress.value ? overview.value.progress : overview.value.progress.slice(0, 4))
const withinWeek = computed(() => overview.value.upcoming.filter(entry => entry.deadline && entry.deadline.at - now.value <= 7 * 86400000).length)
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
function deadlineHint(deadline: Deadline) {
  const days = daysAway(deadline.at)
  const timing = days === 0 ? '今天' : days === 1 ? '明天' : `${days} 天后`
  const notes = [timing]
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
.recruitment-page { max-width: 1160px; margin: 0 auto; }
.recruitment-panel { border-radius: 16px; }
.toolbar, .connection, .section-heading, .company-line, .due { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.toolbar { justify-content: space-between; margin-bottom: 20px; }
.toolbar h2 { margin: 0 0 6px; font-size: 22px; }
.toolbar p, .section-heading p, .connect p, .note { margin: 0; color: var(--el-text-color-secondary); line-height: 1.6; font-size: 13px; }
.el-alert { margin-bottom: 16px; }
.connect { max-width: 460px; padding: 8px 0 16px; }
.connect h3 { margin: 0 0 8px; }
.connect p { margin-bottom: 20px; }
.connection { color: var(--el-text-color-secondary); font-size: 12px; margin-bottom: 20px; }
.connection-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--el-color-success); }
.connection-email { margin-left: auto; }
.overview { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 32px; }
.metric { display: flex; flex-direction: column; gap: 7px; padding: 17px 18px; border: 1px solid var(--el-border-color-lighter); border-radius: 12px; background: var(--el-fill-color-blank); }
.metric span, .metric small { color: var(--el-text-color-secondary); font-size: 12px; }
.metric strong { font-size: 29px; line-height: 1; font-weight: 650; color: var(--el-text-color-primary); }
.metric-urgent strong { color: var(--el-color-primary); }
.section-heading { justify-content: space-between; margin-bottom: 15px; }
.section-heading h3 { margin: 0 0 3px; font-size: 17px; }
.section-heading > span { color: var(--el-text-color-secondary); font-size: 12px; }
.focus-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.focus-card { min-width: 0; border: 1px solid var(--el-border-color-lighter); border-radius: 12px; background: var(--el-fill-color-blank); }
.focus-main { padding: 16px 16px 12px; }
.company-line strong { font-size: 15px; overflow-wrap: anywhere; }
.category { font-size: 12px; color: var(--el-color-primary); background: var(--el-color-primary-light-9); border-radius: 6px; padding: 3px 7px; }
.unread { font-size: 11px; color: var(--el-color-danger); }
.action-label { margin: 9px 0 12px; color: var(--el-text-color-secondary); font-size: 13px; }
.due { gap: 7px; padding: 10px 12px; border-radius: 8px; background: var(--el-fill-color-light); }
.due span, .due em { font-size: 12px; color: var(--el-text-color-secondary); font-style: normal; }
.due strong { font-size: 15px; color: var(--el-text-color-primary); }
.due.urgent { background: var(--el-color-warning-light-9); }
.due.urgent strong, .due.urgent em { color: var(--el-color-warning-dark-2); }
.source-details { border-top: 1px solid var(--el-border-color-lighter); padding: 9px 16px; font-size: 12px; color: var(--el-text-color-secondary); }
.source-details summary, .history > summary { cursor: pointer; }
.source-details .subject, .progress-detail p { color: var(--el-text-color-primary); font-weight: 600; }
.source-details ul, .progress-detail ul { padding-left: 18px; line-height: 1.6; overflow-wrap: anywhere; }
.progress-section { margin-top: 34px; }
.progress-list { border: 1px solid var(--el-border-color-lighter); border-radius: 12px; overflow: hidden; }
.progress-row + .progress-row { border-top: 1px solid var(--el-border-color-lighter); }
.progress-row > summary { display: flex; align-items: center; gap: 12px; padding: 13px 16px; cursor: pointer; list-style: none; }
.progress-row > summary::-webkit-details-marker { display: none; }
.progress-icon { display: grid; place-items: center; flex: 0 0 30px; height: 30px; border-radius: 8px; background: var(--el-fill-color-light); color: var(--el-text-color-secondary); }
.progress-content { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 3px; }
.progress-content strong { font-size: 14px; overflow-wrap: anywhere; }
.progress-content small, .progress-row time { color: var(--el-text-color-secondary); font-size: 12px; }
.progress-detail { padding: 0 16px 12px 58px; color: var(--el-text-color-secondary); font-size: 12px; }
.more { padding: 10px 0 0; border: 0; background: none; color: var(--el-color-primary); cursor: pointer; font-size: 13px; }
.history { margin-top: 30px; padding: 14px 16px; border: 1px solid var(--el-border-color-lighter); border-radius: 12px; color: var(--el-text-color-secondary); font-size: 13px; }
.history > summary span { margin-left: 5px; }
.history-list { margin-top: 12px; }
.empty { padding: 45px 0; text-align: center; color: var(--el-text-color-secondary); }
.empty.compact { padding: 24px; border: 1px dashed var(--el-border-color); border-radius: 12px; font-size: 13px; }
.note { margin-top: 24px; }
.note a { margin-left: 8px; color: var(--el-color-primary); white-space: nowrap; }
@media (max-width: 600px) { .overview { gap: 7px; } .metric { padding: 13px 10px; } .metric strong { font-size: 24px; } .metric small { display: none; } .focus-list { grid-template-columns: 1fr; } .connection-email { margin-left: 0; } .progress-detail { padding-left: 16px; } }
</style>
