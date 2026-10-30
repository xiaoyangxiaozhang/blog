<template>
  <section class="provider-wallets" aria-label="其他服务商钱包">
    <h3>其他服务商钱包</h3>
    <p class="wallet-note">独立配置钱包查询 Key，保存后查询。各服务商、各币种的余额分别展示。</p>
    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon />
    <el-empty v-if="!wallets.length" :description="refreshing ? '正在读取钱包配置…' : '暂无钱包配置'" />

    <article v-for="wallet in wallets" :key="wallet.id" class="provider-wallet" :aria-label="wallet.name">
      <div class="wallet-heading">
        <h4>{{ wallet.name }}</h4>
        <el-tag :type="!wallet.supported ? 'info' : wallet.api_key_configured ? 'success' : 'warning'">
          {{ !wallet.supported ? '暂不支持自动查询' : wallet.api_key_configured ? '已配置' : '未配置' }}
        </el-tag>
      </div>
      <p class="wallet-note">{{ wallet.description }}</p>

      <template v-if="wallet.supported">
        <div class="wallet-key-row">
          <el-input
            v-model="keyInputs[wallet.id]"
            :aria-label="`${wallet.name} 钱包查询 Key`"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="wallet.api_key_configured ? `已配置 ${wallet.api_key_hint}，留空保留` : wallet.id === 'openrouter' ? '输入 Management Key' : '输入 API Key'"
            :disabled="refreshing || busy[wallet.id]"
          />
          <el-button :loading="busy[wallet.id]" :disabled="refreshing || !keyInputs[wallet.id]?.trim()" @click="save(wallet)">保存并查询</el-button>
          <el-button :disabled="refreshing || busy[wallet.id] || !wallet.api_key_configured" @click="query(wallet)">刷新余额</el-button>
          <el-button v-if="wallet.api_key_configured" type="danger" text :disabled="refreshing || busy[wallet.id]" @click="save(wallet, true)">清除 Key</el-button>
        </div>
        <el-alert v-if="errors[wallet.id]" :title="errors[wallet.id]" type="error" :closable="false" show-icon />
        <p v-if="errors[wallet.id] && balances[wallet.id]" class="wallet-note">以下为上次查询结果，余额尚未更新。</p>
        <template v-if="balances[wallet.id]">
          <p class="wallet-note">查询时间：{{ formatTime(balances[wallet.id]!.queried_at) }}</p>
          <div v-for="(amount, index) in balances[wallet.id]!.balances" :key="`${amount.currency}:${index}`" class="wallet-currency">
            <span class="wallet-unit">{{ amount.currency === 'CNY' ? '人民币（CNY）' : '美元（USD）' }}</span>
            <div class="wallet-metrics">
              <div v-for="metric in metrics(amount)" :key="metric.label" class="wallet-metric">
                <span>{{ metric.label }}</span>
                <strong :title="metric.value">{{ formatMoney(metric.value, amount.currency) }}</strong>
              </div>
            </div>
          </div>
        </template>
        <p v-else class="wallet-note">{{ wallet.api_key_configured ? '尚未获取余额。' : '保存 Key 后即可查询账户钱包。' }}</p>
      </template>
      <a :href="wallet.console_url" target="_blank" rel="noopener noreferrer">前往 {{ wallet.name }} 控制台</a>
    </article>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProviderWallets, getProviderWalletBalance, saveProviderWalletKey } from '@/api/quota'
import type { ProviderWalletAmount, ProviderWalletBalance, ProviderWalletConfig } from '@/api/quota'

const wallets = ref<ProviderWalletConfig[]>([])
const refreshing = ref(false)
const loadError = ref('')
const balances = reactive<Record<string, ProviderWalletBalance | undefined>>({})
const errors = reactive<Record<string, string>>({})
const busy = reactive<Record<string, boolean>>({})
const keyInputs = reactive<Record<string, string>>({})
const errorMessage = (cause: unknown) => cause instanceof Error ? cause.message : '钱包查询失败，请稍后重试'
const formatTime = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })
const formatMoney = (value: string, currency: string) => `${currency === 'USD' ? '$' : '¥'}${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 12 })}`
const metrics = (amount: ProviderWalletAmount) => [
  { label: '可用余额', value: amount.available_balance },
  { label: '赠送余额', value: amount.granted_balance },
  { label: '充值余额', value: amount.topped_up_balance },
  { label: '累计购买额度', value: amount.total_credits },
  { label: '累计消费', value: amount.total_spent }
].filter((item): item is { label: string; value: string } => item.value !== undefined)

const fetchBalance = async (wallet: ProviderWalletConfig) => {
  errors[wallet.id] = ''
  try {
    balances[wallet.id] = await getProviderWalletBalance(wallet.id)
  } catch (cause) {
    errors[wallet.id] = errorMessage(cause)
  }
}

const query = async (wallet: ProviderWalletConfig) => {
  if (refreshing.value || busy[wallet.id]) return
  busy[wallet.id] = true
  try { await fetchBalance(wallet) } finally { busy[wallet.id] = false }
}

const save = async (wallet: ProviderWalletConfig, clear = false) => {
  if (refreshing.value || busy[wallet.id]) return
  busy[wallet.id] = true
  try {
    if (clear) {
      try { await ElMessageBox.confirm(`清除 ${wallet.name} 的钱包查询 Key？`, '清除钱包 Key', { type: 'warning' }) }
      catch { return }
    }
    const updated = await saveProviderWalletKey(wallet.id, { api_key: clear ? '' : keyInputs[wallet.id] || '', clear })
    keyInputs[wallet.id] = ''
    const index = wallets.value.findIndex(item => item.id === wallet.id)
    if (index >= 0) wallets.value[index] = updated
    delete balances[wallet.id]
    delete errors[wallet.id]
    ElMessage.success({ message: clear ? '钱包 Key 已清除' : '钱包 Key 已保存', duration: 2500 })
    if (updated.api_key_configured) await fetchBalance(updated)
  } catch (cause) {
    errors[wallet.id] = errorMessage(cause)
  } finally {
    busy[wallet.id] = false
  }
}

const refresh = async () => {
  if (refreshing.value || Object.values(busy).some(Boolean)) return
  refreshing.value = true
  loadError.value = ''
  try {
    wallets.value = await getProviderWallets()
    for (const wallet of wallets.value) if (!wallet.api_key_configured) delete balances[wallet.id]
    await Promise.all(wallets.value.filter(wallet => wallet.supported && wallet.api_key_configured).map(fetchBalance))
  } catch (cause) {
    loadError.value = errorMessage(cause)
  } finally {
    refreshing.value = false
  }
}

defineExpose({ refresh })
</script>

<style scoped lang="scss">
.provider-wallets { margin-top: 28px; }
h3 { margin: 0 0 12px; font-size: 16px; }
.wallet-note { margin: 8px 0 12px; color: var(--el-text-color-secondary); font-size: 13px; line-height: 1.7; }
.provider-wallet { margin-top: 16px; padding: 20px; border-radius: 8px; background: var(--el-fill-color-light); }
.wallet-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
h4 { margin: 0; font-size: 15px; }
.wallet-key-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.wallet-key-row .el-input { flex: 1 1 280px; }
.wallet-key-row .el-button + .el-button { margin-left: 0; }
.wallet-unit { font-size: 13px; color: var(--el-text-color-secondary); }
.wallet-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 12px; margin: 12px 0 16px; }
.wallet-metric { display: grid; gap: 10px; padding: 16px; border-radius: 6px; background: var(--el-bg-color); }
.wallet-metric span { font-size: 13px; color: var(--el-text-color-secondary); }
.wallet-metric strong { font-size: 22px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
a { display: inline-block; margin-top: 12px; font-size: 13px; color: var(--el-color-primary); }
</style>
