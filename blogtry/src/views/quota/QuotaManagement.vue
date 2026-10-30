<template>
  <div class="quota-management">
    <el-card shadow="never">
      <div class="quota-toolbar">
        <div>
          <h2>额度管理</h2>
          <p>查看聊天助手所用模型账户的余额与消费。</p>
        </div>
        <el-button type="primary" :loading="loading" @click="refresh">刷新余额</el-button>
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

      <div class="quota-links">
        <router-link to="/settings?tab=chatbot">配置聊天助手</router-link>
        <a href="https://bigmodel.cn/finance-center/finance/overview" target="_blank" rel="noopener noreferrer">前往智谱控制台</a>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getChatbotBalance } from '@/api/quota'
import type { ChatbotBalance } from '@/api/quota'

const loading = ref(false)
const error = ref('')
const balance = ref<ChatbotBalance | null>(null)
const amounts = computed(() => balance.value ? [
  { label: '可用余额', value: balance.value.available_balance },
  { label: '累计消费', value: balance.value.total_spent },
  { label: '今日消费', value: balance.value.today_spent }
] : [])

const formatAmount = (value: string | null) => value === null ? '暂无数据' : `¥${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`
const formatTime = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })

const refresh = async () => {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    balance.value = await getChatbotBalance()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '余额查询失败，请稍后重试'
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
@media (max-width: 600px) {
  .quota-toolbar { align-items: flex-start; flex-wrap: wrap; }
  .quota-grid { grid-template-columns: 1fr; }
}
</style>
