<template>
  <section class="codex-quota" aria-label="Codex 额度看板">
    <div class="codex-heading">
      <h3>额度概览</h3>
      <span class="codex-status" :class="{ 'is-stale': state?.stale || state?.last_error || error, 'is-ready': status === '自动同步' }">{{ status }}</span>
    </div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="codex-error" />
    <p v-if="!state?.snapshot" class="codex-note">{{ loading ? '正在读取额度…' : error ? '暂时无法读取额度。' : state?.connected ? '等待本机首次同步。' : '尚未连接本机采集器。' }}</p>
    <p v-else-if="!windows.length" class="codex-note">账号暂未返回额度窗口。</p>
    <template v-else>
      <div class="codex-dashboard">
        <div class="codex-windows">
          <div v-for="(item,index) in windows" :key="`${item.id}:${item.kind}:${index}`" class="codex-window" :class="{ 'is-stale': state?.stale || state?.last_error || error }">
            <div class="codex-window-title">{{ item.id === 'codex' ? windowLabel(item.duration_mins, item.kind) : `${item.label} · ${windowLabel(item.duration_mins, item.kind)}` }}</div>
            <div class="codex-values">
              <strong v-if="item.used_percent !== null">{{ percent(100-item.used_percent) }}<small>%</small></strong>
              <strong v-else class="codex-unavailable">暂无数据</strong>
              <span v-if="item.used_percent !== null">剩余</span>
            </div>
            <div v-if="item.used_percent !== null" class="codex-track" role="progressbar" :aria-label="`${item.label} ${windowLabel(item.duration_mins,item.kind)}剩余比例`" :aria-valuenow="Math.max(0,Math.min(100,100-item.used_percent))" aria-valuemin="0" aria-valuemax="100">
              <span :style="{width: `${Math.max(0,Math.min(100,100-item.used_percent))}%`}"></span>
            </div>
            <div class="codex-window-meta">
              <span>{{ item.resets_at ? `${formatTime(item.resets_at*1000)} 重置` : '重置时间未知' }}</span>
            </div>
          </div>
        </div>
        <CodexQuotaHistory :snapshot="state.snapshot" />
      </div>
    </template>
    <section class="codex-token" aria-label="本机 Token 用量">
      <div class="codex-token-heading">
        <h4>Token 用量</h4>
        <span v-if="tokenDay">{{ tokenDay.date }} · {{ state?.token_usage?.timezone }} · {{ formatTime(state!.token_usage!.collected_at) }} 采集</span>
      </div>
      <div v-if="tokenDay" class="codex-token-metrics">
        <div><span>总计</span><strong>{{ formatTokens(tokenDay.total_tokens) }}</strong></div>
        <div><span>输入（含缓存）</span><strong>{{ formatTokens(tokenDay.input_tokens) }}</strong></div>
        <div><span>缓存输入</span><strong>{{ formatTokens(tokenDay.cached_input_tokens) }}</strong></div>
        <div><span>输出（含推理）</span><strong>{{ formatTokens(tokenDay.output_tokens) }}</strong></div>
      </div>
      <p v-else class="codex-token-empty">{{ state?.token_usage ? '暂无本机 Token 记录' : '本机 Token 用量尚未同步' }}</p>
      <p class="codex-token-note">本机日志统计，不代表完整账号用量。</p>
    </section>
    <div class="codex-footer">
      <time v-if="state?.snapshot" :datetime="state.snapshot.collected_at" :title="formatTime(state.snapshot.collected_at)">{{ shortTime(state.snapshot.collected_at) }} 同步 · 每 5 分钟更新</time>
      <a href="https://chatgpt.com/codex/settings/usage" target="_blank" rel="noopener noreferrer">用量面板 ↗</a>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed,onMounted,onBeforeUnmount,ref } from 'vue'
import { getCodexQuota } from '@/api/quota'
import type { CodexQuotaState } from '@/api/quota'
import CodexQuotaHistory from './CodexQuotaHistory.vue'

const state=ref<CodexQuotaState|null>(null)
const loading=ref(false)
const error=ref('')
let timer:ReturnType<typeof setInterval>|undefined
const windows=computed(()=>state.value?.snapshot?.buckets.flatMap(bucket=>bucket.windows.map(window=>({...window,id:bucket.id,label:bucket.name||(bucket.id==='codex'?'Codex':bucket.id),plan_type:bucket.plan_type})))||[])
const tokenDay=computed(()=>state.value?.token_usage?.days?.reduce((latest, day)=>!latest || day.date > latest.date ? day : latest, undefined as NonNullable<CodexQuotaState['token_usage']>['days'][number] | undefined))
const formatTokens=(value:number)=>value.toLocaleString('zh-CN')
const status=computed(()=>error.value?'读取失败':state.value?.last_error?(state.value.snapshot?'同步失败，显示上次数据':'同步失败'):!state.value?.connected?'未连接':!state.value.snapshot?'等待同步':state.value.stale?'数据已过期':'自动同步')
const percent=(value:number)=>Math.max(0,Math.min(100,value)).toLocaleString('zh-CN',{maximumFractionDigits:1})
const windowLabel=(mins:number|null,kind:string)=>mins===null?(kind==='primary'?'主要窗口':'附加窗口'):mins%1440===0?`${mins/1440} 天窗口`:mins%60===0?`${mins/60} 小时窗口`:`${mins} 分钟窗口`
const formatTime=(value:string|number)=>new Date(value).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})
const shortTime=(value:string)=>new Date(value).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})
const refresh=async()=>{
  if(loading.value)return
  loading.value=true;error.value=''
  try{state.value=await getCodexQuota()}catch(cause){error.value=cause instanceof Error?cause.message:'Codex 额度读取失败'}finally{loading.value=false}
}
onMounted(()=>{timer=setInterval(()=>{if(!document.hidden)refresh()},60000)})
onBeforeUnmount(()=>clearInterval(timer))
defineExpose({refresh})
</script>

<style scoped>
.codex-quota { margin-top: 24px; }
.codex-heading, .codex-window-meta, .codex-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
h3 { margin: 0; font-size: 16px; font-weight: 600; }
.codex-status, .codex-note, .codex-footer { color: var(--el-text-color-secondary); font-size: 12px; }
.codex-status { display: inline-flex; align-items: center; gap: 6px; }
.codex-status::before { width: 6px; height: 6px; border-radius: 50%; background: var(--el-text-color-placeholder); content: ''; }
.codex-status.is-ready::before { background: var(--el-color-success); }
.codex-status.is-stale { color: var(--el-color-warning); }
.codex-status.is-stale::before { background: var(--el-color-warning); }
.codex-note, .codex-error { margin-top: 12px; }
.codex-dashboard { display: grid; grid-template-columns: minmax(250px, 0.8fr) minmax(0, 1.2fr); align-items: stretch; gap: 12px; margin-top: 12px; }
.codex-windows { display: grid; grid-template-columns: 1fr; align-content: start; gap: 12px; }
.codex-window { min-width: 0; padding: 20px; border-radius: 12px; background: color-mix(in srgb, var(--el-text-color-primary) 3%, transparent); }
.codex-window-title { color: var(--el-text-color-secondary); font-size: 13px; }
.codex-values { display: flex; align-items: baseline; gap: 8px; margin-top: 14px; color: var(--el-text-color-secondary); font-size: 12px; }
.codex-values strong { color: var(--el-text-color-primary); font-size: clamp(32px, 3vw, 42px); line-height: 1; font-weight: 500; font-variant-numeric: tabular-nums; letter-spacing: -0.03em; }
.codex-values strong small { margin-left: 2px; font-size: .45em; font-weight: 400; }
.codex-values strong.codex-unavailable { font-size: 20px; letter-spacing: 0; }
.codex-track { height: 6px; margin-top: 19px; border-radius: 99px; overflow: hidden; background: color-mix(in srgb, var(--el-text-color-primary) 9%, transparent); }
.codex-track span { display: block; height: 100%; border-radius: inherit; background: var(--el-color-primary); transition: width .2s ease; }
.codex-window.is-stale .codex-track span { background: var(--el-text-color-secondary); }
.codex-window-meta { margin-top: 12px; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.5; font-variant-numeric: tabular-nums; }
.codex-token { margin-top: 12px; padding: 18px 20px; border-radius: 12px; background: color-mix(in srgb, var(--el-text-color-primary) 3%, transparent); }
.codex-token-heading { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.codex-token-heading h4 { margin: 0; font-size: 14px; font-weight: 500; }
.codex-token-heading > span, .codex-token-empty, .codex-token-note { color: var(--el-text-color-secondary); font-size: 12px; }
.codex-token-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
.codex-token-metrics div { min-width: 0; }
.codex-token-metrics span, .codex-token-metrics strong { display: block; }
.codex-token-metrics span { color: var(--el-text-color-secondary); font-size: 12px; }
.codex-token-metrics strong { margin-top: 6px; font-size: 17px; font-weight: 500; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.codex-token-empty { margin: 14px 0 0; }
.codex-token-note { margin: 14px 0 0; line-height: 1.5; }
.codex-footer { justify-content: flex-start; margin-top: 16px; gap: 6px 16px; }
.codex-footer a { color: var(--el-color-primary); text-decoration: none; }
@media (max-width: 800px) { .codex-dashboard { grid-template-columns: minmax(0, 1fr); } .codex-windows { grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)); } }
@media (max-width: 600px) { .codex-window { padding: 18px; } .codex-token { padding: 18px; } .codex-token-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { .codex-track span { transition: none; } }
</style>
