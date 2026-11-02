<template>
  <section class="openai-quota" aria-label="OpenAI API 费用">
    <div class="heading"><h3>API 额度</h3><a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noopener noreferrer">官方账单 ↗</a></div>
    <div class="metrics" v-if="cost">
      <div><span>统计期费用</span><strong>{{ money(cost.cost) }}</strong></div>
      <div><span>估算剩余（非官方余额）</span><strong>{{ expired ? '已到期' : money(cost.estimated_remaining) }}</strong></div>
      <div><span>额度到期</span><strong>{{ config.expiry_date }}</strong></div>
    </div>
    <p v-if="cost" class="note">更新时间 {{ new Date(cost.queried_at).toLocaleString('zh-CN') }} · 估算值以官方账单为准</p>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <details class="config" :open="!config.key_configured">
      <summary>API 额度设置 <span>{{ config.key_configured ? '已配置' : '未配置' }}</span></summary>
      <p class="note">使用组织 Admin Key 查询费用。估算剩余 = 本期到账金额 − 起始日以来的组织费用（UTC），可能与官方余额不同。</p>
      <p class="note">Key 留空保留原值；额度周期变化时请更新金额和日期。</p>
      <div class="form">
        <label>Admin Key <el-input v-model="key" type="password" show-password autocomplete="new-password" :placeholder="config.key_configured ? '留空保留原 Key' : '输入组织 Admin Key'" /></label>
        <label>本期到账金额（USD） <el-input v-model.number="config.grant" type="number" min="0" /></label>
        <label>统计起始日（UTC） <el-input v-model="config.start_date" type="date" /></label>
        <label>额度到期日 <el-input v-model="config.expiry_date" type="date" /></label>
      </div>
      <div class="actions"><el-button type="primary" :loading="busy" @click="save(false)">保存并查询</el-button><el-button v-if="config.key_configured" text type="danger" :disabled="busy" @click="clearKey">清除 Key</el-button></div>
    </details>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOpenAIQuota, getOpenAICost, saveOpenAIQuota } from '@/api/quota'
import type { OpenAIQuotaConfig, OpenAICost } from '@/api/quota'
const config = ref<OpenAIQuotaConfig>({ key_configured: false, grant: 0, start_date: '', expiry_date: '' })
const expired = computed(() => !!config.value.expiry_date && new Date().toISOString().slice(0, 10) > config.value.expiry_date)
const key = ref('')
const cost = ref<OpenAICost | null>(null)
const error = ref('')
const busy = ref(false)
const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
const message = (e: unknown) => e instanceof Error ? e.message : 'OpenAI 费用查询失败'
async function refresh() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { config.value = await getOpenAIQuota(); cost.value = config.value.key_configured ? await getOpenAICost() : null }
  catch (e) { cost.value = null; error.value = message(e) }
  finally { busy.value = false }
}
async function save(clear: boolean) {
  if (busy.value) return
  busy.value = true; error.value = ''; cost.value = null
  try {
    config.value = await saveOpenAIQuota({ ...config.value, admin_key: clear ? '' : key.value, clear })
    key.value = ''; ElMessage.success(clear ? 'Admin Key 已清除' : '配置已保存')
    if (config.value.key_configured) cost.value = await getOpenAICost()
  } catch (e) { error.value = message(e) }
  finally { busy.value = false }
}
async function clearKey() {
  try { await ElMessageBox.confirm('确定清除 OpenAI Admin Key？', '清除 Key', { type: 'warning' }) } catch { return }
  await save(true)
}
defineExpose({ refresh })
</script>
<style scoped>
.openai-quota { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--el-border-color-lighter); }
.heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
h3 { margin: 0; font-size: 16px; }
a { color: var(--el-color-primary); font-size: 12px; text-decoration: none; }
.note { color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.7; }
.metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 12px 0; }
.metrics div { display: grid; gap: 8px; min-width: 0; padding: 18px 20px; border-radius: 12px; background: color-mix(in srgb, var(--el-text-color-primary) 3%, transparent); }
.metrics span, summary span { color: var(--el-text-color-secondary); font-size: 12px; }
.metrics strong { font-size: 20px; font-weight: 500; }
.config { margin-top: 20px; } summary { cursor: pointer; } summary span { margin-left: 8px; }
.form { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.form label { display: grid; gap: 6px; font-size: 12px; }
.actions { margin-top: 14px; }
@media (max-width: 600px) { .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } .metrics div { padding: 16px; } }
</style>
