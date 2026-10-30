<template>
  <section class="codex-quota" aria-label="Codex 额度看板">
    <div class="codex-heading">
      <h3>Codex <span>本机账号</span></h3>
      <span class="codex-status" :class="{ 'is-stale': state?.stale || state?.last_error || error }">{{ status }}</span>
    </div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="codex-error" />
    <p v-if="!state?.snapshot" class="codex-note">{{ loading ? '正在读取额度…' : error ? '暂时无法读取额度。' : state?.connected ? '等待本机首次同步。' : '尚未连接本机采集器。' }}</p>
    <p v-else-if="!windows.length" class="codex-note">账号暂未返回额度窗口。</p>
    <div v-else class="codex-windows">
      <div v-for="(item,index) in windows" :key="`${item.id}:${item.kind}:${index}`" class="codex-window" :class="{ 'is-stale': state?.stale || state?.last_error || error }">
        <div class="codex-window-title">
          <span>{{ item.label }} <small v-if="item.plan_type">· {{ item.plan_type }}</small></span>
          <span>{{ windowLabel(item.duration_mins, item.kind) }}</span>
        </div>
        <div class="codex-values">
          <strong>{{ item.used_percent === null ? '暂无数据' : `${percent(100-item.used_percent)}%` }} <small v-if="item.used_percent !== null">剩余</small></strong>
          <span v-if="item.used_percent !== null">已用 {{ percent(item.used_percent) }}%</span>
        </div>
        <div v-if="item.used_percent !== null" class="codex-track" role="progressbar" :aria-label="`${item.label} ${windowLabel(item.duration_mins,item.kind)}已用比例`" :aria-valuenow="item.used_percent" aria-valuemin="0" aria-valuemax="100">
          <span :style="{width: `${Math.max(0,Math.min(100,item.used_percent))}%`}"></span>
        </div>
        <p class="codex-reset">{{ item.resets_at ? `${formatTime(item.resets_at*1000)} 重置` : '暂未提供重置时间' }}</p>
      </div>
    </div>
    <div class="codex-footer">
      <time v-if="state?.snapshot" :datetime="state.snapshot.collected_at" :title="formatTime(state.snapshot.collected_at)">{{ shortTime(state.snapshot.collected_at) }} 同步</time>
      <span>本机每 5 分钟采集</span>
      <a href="https://chatgpt.com/codex/settings/usage" target="_blank" rel="noopener noreferrer">用量面板 ↗</a>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed,onMounted,onBeforeUnmount,ref } from 'vue'
import { getCodexQuota } from '@/api/quota'
import type { CodexQuotaState } from '@/api/quota'

const state=ref<CodexQuotaState|null>(null)
const loading=ref(false)
const error=ref('')
let timer:ReturnType<typeof setInterval>|undefined
const windows=computed(()=>state.value?.snapshot?.buckets.flatMap(bucket=>bucket.windows.map(window=>({...window,id:bucket.id,label:bucket.name||(bucket.id==='codex'?'Codex':bucket.id),plan_type:bucket.plan_type})))||[])
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
.codex-quota{margin-top:26px;padding:18px 0;border-top:1px solid var(--el-fill-color-lighter);border-bottom:1px solid var(--el-fill-color-lighter)}
.codex-heading,.codex-window-title,.codex-values,.codex-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
h3{margin:0;font-size:14px;font-weight:500}h3 span{margin-left:8px;font-size:12px;color:var(--el-text-color-secondary);font-weight:400}
.codex-status,.codex-note,.codex-footer,.codex-reset{color:var(--el-text-color-secondary);font-size:12px}.codex-status.is-stale{color:var(--el-color-warning)}
.codex-note{margin-top:12px}.codex-error{margin-top:12px}.codex-windows{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:20px;margin-top:16px}
.codex-window-title{font-size:12px;color:var(--el-text-color-secondary)}.codex-window-title small{font-size:11px}.codex-values{margin-top:10px;font-size:12px;color:var(--el-text-color-secondary)}
.codex-values strong{font-size:24px;font-weight:500;color:var(--el-text-color-primary);font-variant-numeric:tabular-nums}.codex-values strong small{font-size:12px;font-weight:400}
.codex-track{height:5px;margin-top:10px;border-radius:99px;overflow:hidden;background:var(--el-fill-color-light)}.codex-track span{display:block;height:100%;border-radius:inherit;background:var(--el-color-primary);transition:width .2s ease}
.codex-window.is-stale .codex-track span{background:var(--el-text-color-secondary)}.codex-reset{margin:8px 0 0}.codex-footer{justify-content:flex-start;margin-top:12px;gap:6px 16px}.codex-footer a{color:var(--el-color-primary);text-decoration:none}
</style>
