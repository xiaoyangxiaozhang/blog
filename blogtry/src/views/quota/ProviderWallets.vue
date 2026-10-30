<template>
  <section class="provider-wallets" aria-label="其他服务商钱包">
    <h3>其他钱包</h3>
    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon />
    <p v-if="!wallets.length" class="wallet-note">{{ refreshing ? '正在加载…' : '暂无钱包配置' }}</p>

    <article v-for="wallet in wallets" :key="wallet.id" class="provider-wallet" :aria-label="wallet.name">
      <div class="wallet-summary">
        <div class="wallet-identity">
          <h4>{{ wallet.name }}</h4>
          <span class="wallet-state" :class="{ 'is-configured': wallet.api_key_configured }" :title="wallet.description">
            {{ !wallet.supported ? '暂不支持' : wallet.api_key_configured ? '已配置' : '未配置' }}
          </span>
        </div>
        <div class="wallet-totals">
          <template v-if="balances[wallet.id]">
            <span v-for="(amount, index) in balances[wallet.id]!.balances" :key="`${amount.currency}:${index}`">
              <strong :title="amount.available_balance">{{ formatMoney(amount.available_balance, amount.currency) }}</strong>
              <small>{{ amount.currency }}</small>
            </span>
          </template>
          <span v-else class="wallet-note">{{ !wallet.supported ? '余额接口已停用' : wallet.api_key_configured ? '未查询' : '—' }}</span>
        </div>
        <div class="wallet-actions">
          <el-button
            v-if="wallet.supported"
            text
            size="small"
            :aria-label="`${wallet.name} 配置 Key`"
            :aria-expanded="editing === wallet.id"
            :aria-controls="`wallet-config-${wallet.id}`"
            @click="editing = editing === wallet.id ? '' : wallet.id"
          >{{ editing === wallet.id ? '收起' : '配置' }}</el-button>
          <el-button v-if="wallet.supported && wallet.api_key_configured" text size="small" :aria-label="`刷新 ${wallet.name} 余额`" :loading="busy[wallet.id]" :disabled="refreshing || busy[wallet.id]" @click="query(wallet)">
            <i v-if="!busy[wallet.id]" class="ri-refresh-line" aria-hidden="true"></i>
          </el-button>
          <a :href="wallet.console_url" :aria-label="`${wallet.name} 控制台`" target="_blank" rel="noopener noreferrer">控制台 ↗</a>
        </div>
      </div>

      <div v-if="wallet.supported && editing === wallet.id" :id="`wallet-config-${wallet.id}`" class="wallet-editor">
        <p class="wallet-note">{{ wallet.description }}</p>
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
          <el-button v-if="wallet.api_key_configured" type="danger" text :disabled="refreshing || busy[wallet.id]" @click="save(wallet, true)">清除 Key</el-button>
        </div>
      </div>
      <el-alert v-if="errors[wallet.id]" :title="errors[wallet.id]" type="error" :closable="false" show-icon class="wallet-error" />
      <p v-if="errors[wallet.id] && balances[wallet.id]" class="wallet-note">显示上次查询结果。</p>
      <details v-if="balances[wallet.id]" class="wallet-details">
        <summary>余额明细 <time :datetime="balances[wallet.id]!.queried_at" :title="formatTime(balances[wallet.id]!.queried_at)">{{ formatShortTime(balances[wallet.id]!.queried_at) }} 更新</time></summary>
        <div v-for="(amount, index) in balances[wallet.id]!.balances" :key="`${amount.currency}:${index}`" class="wallet-currency">
          <span class="wallet-unit">{{ amount.currency === 'CNY' ? '人民币（CNY）' : '美元（USD）' }}</span>
          <dl class="wallet-metrics">
            <div v-for="metric in metrics(amount)" :key="metric.label">
              <dt>{{ metric.label }}</dt>
              <dd :title="metric.value">{{ formatMoney(metric.value, amount.currency) }}</dd>
            </div>
          </dl>
        </div>
      </details>
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
const editing = ref('')
const errorMessage = (cause: unknown) => cause instanceof Error ? cause.message : '钱包查询失败，请稍后重试'
const formatTime = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })
const formatShortTime = (value: string) => new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
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
h3 { margin: 0 0 6px; font-size: 14px; font-weight: 500; }
.wallet-note { margin: 0; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.7; }
.provider-wallet { padding: 16px 0; }
.provider-wallet + .provider-wallet { border-top: 1px solid var(--el-fill-color-lighter); }
.wallet-summary { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(0, 1.2fr) auto; align-items: center; gap: 12px; }
.wallet-identity { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
h4 { margin: 0; font-size: 14px; font-weight: 500; }
.wallet-state { color: var(--el-text-color-secondary); font-size: 11px; }
.wallet-state.is-configured { color: var(--el-color-success); }
.wallet-totals { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 16px; min-width: 0; }
.wallet-totals > span { display: inline-flex; align-items: baseline; gap: 5px; }
.wallet-totals strong { font-size: 16px; font-weight: 500; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.wallet-totals small { color: var(--el-text-color-secondary); font-size: 11px; }
.wallet-actions { display: flex; align-items: center; gap: 6px; }
.wallet-actions .el-button + .el-button { margin-left: 0; }
.wallet-actions a { margin-left: 4px; white-space: nowrap; }
.wallet-editor { margin-top: 12px; padding: 14px; border-radius: 8px; background: var(--el-fill-color-lighter); }
.wallet-key-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.wallet-key-row .el-input { flex: 1 1 280px; }
.wallet-key-row .el-button + .el-button { margin-left: 0; }
.wallet-error { margin-top: 10px; }
.wallet-details { margin-top: 8px; font-size: 12px; color: var(--el-text-color-secondary); }
.wallet-details summary { cursor: pointer; width: fit-content; }
.wallet-details summary:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 3px; }
.wallet-details time { margin-left: 8px; }
.wallet-currency { margin-top: 12px; }
.wallet-unit { font-size: 12px; }
.wallet-metrics { display: flex; flex-wrap: wrap; gap: 10px 28px; margin-top: 8px; }
.wallet-metrics div { display: flex; align-items: baseline; gap: 8px; }
.wallet-metrics dt { font-size: 12px; }
.wallet-metrics dd { margin: 0; color: var(--el-text-color-primary); font-variant-numeric: tabular-nums; }
a { font-size: 12px; color: var(--el-color-primary); text-decoration: none; }
@media (max-width: 600px) {
  .wallet-summary { grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
  .wallet-totals { grid-column: 1; grid-row: 2; }
  .wallet-actions { grid-column: 2; grid-row: 1 / 3; gap: 2px; }
  .wallet-actions .el-button { min-height: 36px; padding: 8px; }
  .wallet-actions a { display: inline-flex; align-items: center; min-height: 36px; }
  .wallet-identity { gap: 4px 10px; }
  .wallet-key-row :deep(.el-input__wrapper) { min-height: 40px; }
  .wallet-key-row :deep(input) { font-size: 16px; }
}
</style>
