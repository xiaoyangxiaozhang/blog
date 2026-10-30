<template>
  <div class="quota-management">
    <el-card shadow="never" class="quota-panel">
      <div class="quota-toolbar">
        <div>
          <h2>额度管理</h2>
        </div>
        <div class="quota-actions">
          <router-link to="/settings?tab=chatbot">助手设置</router-link>
          <el-button :loading="loading" aria-label="刷新额度" @click="refresh">刷新</el-button>
        </div>
      </div>

      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="quota-error" />
      <p v-if="error && balance" class="quota-note">余额显示上次查询结果。</p>
      <el-alert v-if="usageError" :title="usageError" type="error" :closable="false" show-icon class="quota-error" />
      <p v-if="usageError && usage" class="quota-note">调用次数显示上次查询结果。</p>

      <dl class="quota-overview" :aria-busy="loading" aria-label="额度概览">
        <div class="quota-metric">
          <dt>可用余额</dt>
          <dd>{{ balance ? formatAmount(balance.available_balance) : '—' }}</dd>
        </div>
        <div v-for="item in usageItems" :key="item.label" class="quota-metric">
          <dt>{{ item.label }}</dt>
          <dd>{{ item.value }}</dd>
        </div>
      </dl>

      <CodexQuota ref="codexQuota" />
      <ProviderWallets ref="providerWallets" />

      <details class="quota-help">
        <summary>余额与统计说明</summary>
        <div class="quota-meta">
          <span v-if="balance">{{ balance.provider }} · {{ balance.model }}</span>
          <span v-if="balance">累计消费 {{ formatAmount(balance.total_spent) }} · 今日 {{ formatAmount(balance.today_spent) }}</span>
          <a href="https://bigmodel.cn/finance-center/finance/overview" target="_blank" rel="noopener noreferrer">智谱控制台 ↗</a>
        </div>
        <div class="quota-meta quota-dates">
          <span v-if="balance" :title="formatTime(balance.queried_at)">余额更新 {{ formatShortTime(balance.queried_at) }}</span>
          <span v-if="usage" :title="`次数更新：${formatTime(usage.queried_at)}`">统计日 {{ usage.date }} · {{ usage.timezone }}</span>
        </div>
        <p>余额为服务商账户钱包，同账户的其他 Key 可能共享余额；不包含资源包或 Coding Plan。消费显示“—”时，表示服务商暂未提供数据。</p>
        <p>次数统计已占用额度的全站公开聊天请求，生成失败也计入；不含后台试聊和评论助手。按显示时区的自然日重置，每日上限设为 0 时不限次数。</p>
      </details>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getChatbotBalance, getChatbotUsage } from '@/api/quota'
import type { ChatbotBalance, ChatbotUsage } from '@/api/quota'
import ProviderWallets from './ProviderWallets.vue'
import CodexQuota from './CodexQuota.vue'

const loading = ref(false)
const error = ref('')
const balance = ref<ChatbotBalance | null>(null)
const usage = ref<ChatbotUsage | null>(null)
const usageError = ref('')
const providerWallets = ref<InstanceType<typeof ProviderWallets> | null>(null)
const codexQuota = ref<InstanceType<typeof CodexQuota> | null>(null)
const usageItems = computed(() => [
  { label: '今日调用次数', value: usage.value ? usage.value.today_requests.toLocaleString('zh-CN') : '—' },
  { label: '每日上限', value: usage.value ? usage.value.daily_limit === 0 ? '不限' : usage.value.daily_limit.toLocaleString('zh-CN') : '—' },
  { label: '剩余次数', value: usage.value ? usage.value.remaining_requests === null ? '不限' : usage.value.remaining_requests.toLocaleString('zh-CN') : '—' }
])

const formatAmount = (value: string | null) => value === null ? '—' : `¥${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`
const formatTime = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })
const formatShortTime = (value: string) => new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

const refresh = async () => {
  if (loading.value) return
  loading.value = true
  error.value = ''
  usageError.value = ''
  try {
    const [walletResult, usageResult] = await Promise.allSettled([getChatbotBalance(), getChatbotUsage(), providerWallets.value?.refresh(), codexQuota.value?.refresh()])
    if (walletResult.status === 'fulfilled') balance.value = walletResult.value
    else error.value = walletResult.reason instanceof Error ? walletResult.reason.message : '余额查询失败，请稍后重试'
    if (usageResult.status === 'fulfilled') usage.value = usageResult.value
    else usageError.value = usageResult.reason instanceof Error ? usageResult.reason.message : '调用统计查询失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
</script>

<style scoped lang="scss">
.quota-panel, .quota-panel:hover { border: 0; box-shadow: none; }
.quota-toolbar, .quota-actions { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.quota-toolbar h2 { margin: 0; font-size: 20px; font-weight: 600; }
.quota-actions a, .quota-meta a { color: var(--el-color-primary); font-size: 13px; text-decoration: none; }
.quota-note, .quota-help { color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.7; }
.quota-error { margin-top: 14px; }
.quota-overview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 20px 0 0; }
.quota-metric { min-width: 0; padding: 16px; border-radius: 8px; background: color-mix(in srgb, var(--el-text-color-primary) 3%, transparent); }
.quota-metric dt { color: var(--el-text-color-secondary); font-size: 12px; }
.quota-metric dd { margin: 10px 0 0; font-size: clamp(20px, 2.2vw, 28px); font-weight: 500; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.quota-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 18px; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.7; }
.quota-meta, .quota-dates { margin-top: 8px; }
.quota-help { margin-top: 24px; }
.quota-help summary { cursor: pointer; width: fit-content; }
.quota-help summary:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 3px; }
.quota-help p { margin-top: 8px; max-width: 820px; }
@media (max-width: 600px) {
  .quota-toolbar, .quota-actions { gap: 12px; }
  .quota-actions a { font-size: 12px; }
  .quota-overview { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 20px; }
  .quota-metric { padding: 14px; }
}
</style>
