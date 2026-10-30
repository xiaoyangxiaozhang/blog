<template>
  <div class="quota-management">
    <el-card shadow="never">
      <div class="quota-toolbar">
        <div>
          <h2>额度管理</h2>
          <p>查看模型服务商的钱包余额，以及聊天助手的站内每日调用额度。</p>
        </div>
        <el-button type="primary" :loading="loading" @click="refresh">刷新额度</el-button>
      </div>

      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="quota-error" />
      <p v-if="error && balance" class="quota-note">以下为上次查询结果，余额尚未更新。</p>

      <div v-loading="loading" :aria-busy="loading" class="quota-content">
        <template v-if="balance">
          <div class="quota-meta">
            <span>{{ balance.provider }} · {{ balance.model }}</span>
            <span>查询时间：{{ formatTime(balance.queried_at) }}</span>
          </div>
          <div class="quota-grid">
            <div v-for="item in amounts" :key="item.label" class="quota-amount">
              <span>{{ item.label }}</span>
              <strong>{{ formatAmount(item.value) }}</strong>
              <small v-if="item.value === null">服务商暂未提供</small>
              <small v-else>人民币（元）</small>
            </div>
          </div>
          <p class="quota-note">余额为智谱账户钱包余额，同账户的其他 API Key 可能共享该钱包。资源包、Coding Plan 和站内每日聊天次数不计入此余额。</p>
        </template>
        <el-empty v-else :description="loading ? '正在查询账户余额…' : '暂无余额数据'" />
      </div>

      <section class="quota-usage" aria-label="全站每日调用额度">
        <h3>全站每日调用额度</h3>
        <el-alert v-if="usageError" :title="usageError" type="error" :closable="false" show-icon class="quota-error" />
        <p v-if="usageError && usage" class="quota-note">以下为上次查询的调用统计，尚未更新。</p>
        <div v-loading="loading" class="quota-content">
          <template v-if="usage">
            <div class="quota-meta">
              <span>统计日期：{{ usage.date }}（{{ usage.timezone }}）</span>
              <span>查询时间：{{ formatTime(usage.queried_at) }}</span>
            </div>
            <div class="quota-grid">
              <div v-for="item in usageItems" :key="item.label" class="quota-amount">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.hint }}</small>
              </div>
            </div>
            <p class="quota-note">按全站公开聊天请求统计，失败请求也计入额度；不含后台试聊和评论助手。每日按上述服务端时区的自然日重置，上限设为 0 时不限次数。</p>
          </template>
          <el-empty v-else :description="loading ? '正在查询调用统计…' : '暂无调用统计'" />
        </div>
      </section>

      <ProviderWallets ref="providerWallets" />

      <div class="quota-links">
        <router-link to="/settings?tab=chatbot">配置聊天助手</router-link>
        <a href="https://bigmodel.cn/finance-center/finance/overview" target="_blank" rel="noopener noreferrer">前往智谱控制台</a>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getChatbotBalance, getChatbotUsage } from '@/api/quota'
import type { ChatbotBalance, ChatbotUsage } from '@/api/quota'
import ProviderWallets from './ProviderWallets.vue'

const loading = ref(false)
const error = ref('')
const balance = ref<ChatbotBalance | null>(null)
const usage = ref<ChatbotUsage | null>(null)
const usageError = ref('')
const providerWallets = ref<InstanceType<typeof ProviderWallets> | null>(null)
const amounts = computed(() => balance.value ? [
  { label: '可用余额', value: balance.value.available_balance },
  { label: '累计消费', value: balance.value.total_spent },
  { label: '今日消费', value: balance.value.today_spent }
] : [])
const usageItems = computed(() => usage.value ? [
  { label: '今日调用次数', value: usage.value.today_requests.toLocaleString('zh-CN'), hint: '次' },
  { label: '每日上限', value: usage.value.daily_limit === 0 ? '不限' : usage.value.daily_limit.toLocaleString('zh-CN'), hint: '全站每日' },
  { label: '剩余次数', value: usage.value.remaining_requests === null ? '不限' : usage.value.remaining_requests.toLocaleString('zh-CN'), hint: '次' }
] : [])

const formatAmount = (value: string | null) => value === null ? '暂无数据' : `¥${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`
const formatTime = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })

const refresh = async () => {
  if (loading.value) return
  loading.value = true
  error.value = ''
  usageError.value = ''
  try {
    const [walletResult, usageResult] = await Promise.allSettled([getChatbotBalance(), getChatbotUsage(), providerWallets.value?.refresh()])
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
.quota-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.quota-toolbar h2 { margin: 0 0 8px; font-size: 20px; }
.quota-toolbar p, .quota-note { margin: 0; color: var(--el-text-color-secondary); font-size: 13px; line-height: 1.7; }
.quota-error { margin-top: 20px; }
.quota-content { min-height: 180px; margin-top: 24px; }
.quota-meta { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px 16px; margin-bottom: 16px; color: var(--el-text-color-secondary); font-size: 13px; }
.quota-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px; }
.quota-amount { display: grid; gap: 12px; padding: 20px; border-radius: 8px; background: var(--el-fill-color-light); }
.quota-amount span { font-size: 14px; }
.quota-amount strong { font-size: clamp(18px, 2.5vw, 28px); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.quota-amount small { color: var(--el-text-color-secondary); }
.quota-links { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 24px; font-size: 14px; }
.quota-links a { color: var(--el-color-primary); }
.quota-usage { margin-top: 28px; }
.quota-usage h3 { margin: 0; font-size: 16px; }
@media (max-width: 600px) {
  .quota-toolbar { align-items: flex-start; flex-wrap: wrap; }
  .quota-grid { grid-template-columns: 1fr; }
}
</style>
