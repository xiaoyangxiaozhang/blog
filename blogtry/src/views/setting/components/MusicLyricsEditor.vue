<template>
  <section class="music-lyrics-editor" :aria-label="`${title}的歌词`">
    <div class="lyrics-heading"><strong>歌词与时间轴</strong><span v-if="record" role="status">{{ statusText }}</span></div>
    <p v-if="!saved" class="lyrics-note">保存歌单后自动处理歌词。</p>
    <template v-else>
      <p v-if="error" class="lyrics-error" role="alert">{{ error }} <button v-if="!record" type="button" @click="load">重新加载</button></p>
      <div v-if="loading && !record" class="lyrics-note" role="status">正在读取歌词…</div>
      <template v-if="record">
        <p v-if="record.message" class="lyrics-note" role="status">{{ record.message }}</p>
        <div class="lyrics-actions">
          <el-button :disabled="disabled || dirty || resolveAllowed === false" :title="resolveAllowed === false ? '请先保存歌单配置' : undefined" :loading="resolving" @click="resolve">重新匹配</el-button>
          <label class="lyrics-upload" :class="{ disabled }">导入 LRC<input type="file" accept=".lrc,text/plain" :disabled="disabled" :aria-label="`导入${title}的LRC歌词`" @change="importLRC"></label>
          <label v-if="!hasVocalSource || record.vocal_src" class="lyrics-upload" :class="{ disabled }">{{ uploading ? `上传人声 ${uploadProgress}%` : record.vocal_src ? '更换人声' : '补充人声' }}<input type="file" accept=".mp3,.wav,.flac,.m4a" :disabled="disabled" :aria-label="`上传${title}的对应人声`" @change="uploadVocal"></label>
        </div>
        <label :for="`music-lrc-${trackId}`">同步歌词</label>
        <el-input :id="`music-lrc-${trackId}`" v-model="lrc" type="textarea" :rows="5" :disabled="disabled" :maxlength="256 * 1024" placeholder="[00:12.30] 歌词内容" />
        <details v-if="record.plain_text && !lrc"><summary>查看内嵌文本</summary><pre>{{ record.plain_text }}</pre></details>
        <div class="lyrics-offset">
          <label :for="`music-offset-${trackId}`">整体偏移（毫秒）</label>
          <el-input-number :id="`music-offset-${trackId}`" v-model="offset" :min="-120000" :max="120000" :step="100" :precision="0" :disabled="disabled" controls-position="right" />
          <el-button text :disabled="disabled || !offset" @click="offset = 0">归零</el-button>
        </div>
        <p class="lyrics-note">正值让歌词延后，负值提前。只调整歌词，音频原文件不变。</p>
        <div v-if="lines.length" class="lyrics-preview">
          <el-button :disabled="!active" @click="$emit('preview')">{{ previewPlaying ? '暂停试听' : '试听校准' }}</el-button>
          <template v-if="previewActive">
            <label class="lyrics-seek"><span>{{ formatTime(currentTime) }}</span><input type="range" aria-label="歌词校准播放进度" min="0" :max="duration || 1" step="0.1" :value="currentTime" @input="seek(Number(($event.target as HTMLInputElement).value))"><span>{{ formatTime(duration) }}</span></label>
          </template>
          <div class="lyrics-preview-lines" aria-label="歌词时间轴预览">
            <button v-for="(line, index) in lines" :key="index" type="button" :class="{ current: previewActive && index === activeLine }" :disabled="!previewActive" :aria-current="previewActive && index === activeLine ? 'true' : undefined" @click="seek(line.time)"><time>{{ formatTime(line.time) }}</time><span>{{ line.text }}</span></button>
          </div>
        </div>
        <div class="lyrics-save"><el-button type="primary" :disabled="disabled || !dirty" :loading="saving" @click="save">保存歌词</el-button><span v-if="dirty" class="lyrics-note">有未保存的歌词或偏移量</span></div>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getMusicLyrics, resolveMusicLyrics, saveMusicLyrics, type MusicLyricsRecord } from '@/api/music'
import { uploadFile } from '@/api/file'

const props = defineProps<{ trackId: string; title: string; saved: boolean; active: boolean; readonly?: boolean; audio: HTMLAudioElement | null; previewActive: boolean; previewPlaying: boolean; sourceOffset?: number; hasVocalSource?: boolean; resolveAllowed?: boolean }>()
defineEmits<{ preview: [] }>()
const record = ref<MusicLyricsRecord | null>(null)
const loading = ref(false)
const saving = ref(false)
const resolving = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const error = ref('')
const lrc = ref('')
const offset = ref(0)
const baselineLRC = ref('')
const baselineOffset = ref(0)
const currentTime = ref(0)
const duration = ref(0)
const dirty = computed(() => lrc.value !== baselineLRC.value || offset.value !== baselineOffset.value)
const disabled = computed(() => props.readonly || loading.value || saving.value || resolving.value || uploading.value)
const processing = computed(() => record.value?.status === 'pending' || record.value?.status === 'processing')
const statusText = computed(() => processing.value ? '处理中' : record.value?.status === 'ready' ? ({ embedded: '内嵌同步歌词', lrclib: '原曲 LRC', vocal: '人声生成', manual: '手动保存' }[record.value.source] || '已保存') : record.value?.status === 'needs_vocal' ? '等待人声' : record.value?.status === 'needs_setup' ? '对齐服务待配置' : record.value?.status === 'error' ? '处理失败' : '待处理')
let poll: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined
let request = 0

const lines = computed(() => {
  const ownOffset = Number(lrc.value.match(/\[offset:\s*(-?\d+)\]/i)?.[1] || 0) / 1000
  return lrc.value.split(/\r?\n/).flatMap(line => {
    const text = line.replace(/\[[^\]]*\]/g, '').trim()
    if (!text) return []
    return [...line.matchAll(/\[(\d+):(\d{1,2}(?:[.:]\d{1,3})?)\]/g)].flatMap(stamp => {
      const seconds = Number(stamp[2]!.replace(':', '.'))
      return seconds < 60 ? [{ time: Math.max(0, Number(stamp[1]) * 60 + seconds - ownOffset + ((Number(offset.value) || 0) + (props.sourceOffset || 0)) / 1000), text }] : []
    })
  }).sort((a, b) => a.time - b.time)
})
const activeLine = computed(() => { for (let i = lines.value.length - 1; i >= 0; i--) if (lines.value[i]!.time <= currentTime.value) return i; return -1 })
function formatTime(value: number) { const seconds = Math.max(0, Math.floor(value || 0)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` }
function syncAudio() { currentTime.value = props.previewActive ? props.audio?.currentTime || 0 : 0; duration.value = Number.isFinite(props.audio?.duration) ? props.audio!.duration : 0 }
function seek(time: number) { if (props.previewActive && props.audio && Number.isFinite(time)) { props.audio.currentTime = Math.min(time, duration.value || time); syncAudio() } }
watch(() => props.audio, (audio, old) => {
  for (const name of ['timeupdate', 'seeked', 'loadedmetadata']) { old?.removeEventListener(name, syncAudio); audio?.addEventListener(name, syncAudio) }
  syncAudio()
}, { immediate: true })
watch(() => props.previewActive, syncAudio)
function apply(value: MusicLyricsRecord, overwrite = false) {
  const keepDraft = dirty.value && !overwrite
  record.value = value
  if (!keepDraft) { lrc.value = value.lrc || ''; offset.value = value.offset_ms || 0; baselineLRC.value = lrc.value; baselineOffset.value = offset.value }
}
function stopPolling() { clearTimeout(poll); controller?.abort(); ++request }
async function load() {
  if (!props.saved || !props.active) return
  clearTimeout(poll)
  controller?.abort()
  const attempt = ++request
  controller = new AbortController()
  loading.value = !record.value
  error.value = ''
  try {
    const value = await getMusicLyrics(props.trackId, controller.signal)
    if (attempt !== request) return
    apply(value)
    if (processing.value) poll = setTimeout(load, 2500)
  } catch (cause) { if (attempt === request) error.value = cause instanceof Error ? cause.message : '歌词读取失败' }
  finally { if (attempt === request) loading.value = false }
}
async function save() {
  if (disabled.value || !dirty.value) return
  stopPolling(); saving.value = true; error.value = ''
  try {
    const patch: { lrc?: string; offset_ms?: number } = {}
    if (lrc.value !== baselineLRC.value) patch.lrc = lrc.value
    if (offset.value !== baselineOffset.value) patch.offset_ms = Number(offset.value) || 0
    apply(await saveMusicLyrics(props.trackId, patch), true)
    ElMessage.success('歌词和偏移量已保存')
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '保存失败，请重试' }
  finally { saving.value = false; if (processing.value) void load() }
}
async function resolve() {
  if (disabled.value || dirty.value || props.resolveAllowed === false) return
  stopPolling(); resolving.value = true; error.value = ''
  try { apply(await resolveMusicLyrics(props.trackId)); ElMessage.success('已开始匹配，完成后自动保存') }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '无法开始匹配' }
  finally { resolving.value = false; void load() }
}
async function importLRC(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]; input.value = ''
  if (!file || disabled.value) return
  if (file.size > 256 * 1024) { error.value = 'LRC不能超过256KiB'; return }
  lrc.value = (await file.text()).replace(/^\uFEFF/, '')
  error.value = ''
}
async function uploadVocal(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]; input.value = ''
  if (!file || disabled.value) return
  if (!/\.(mp3|wav|flac|m4a)$/i.test(file.name) || file.size > 128 * 1024 * 1024) { error.value = '请选择128MiB以内的MP3、WAV、FLAC或M4A人声'; return }
  stopPolling(); uploading.value = true; error.value = ''; uploadProgress.value = 0
  try {
    const uploaded = await uploadFile(file, '音乐人声', { keepOriginal: true, onProgress: progress => { uploadProgress.value = progress.percentage } })
    apply(await saveMusicLyrics(props.trackId, { vocal_src: uploaded.file_url }))
    ElMessage.success('人声已关联，缺失的时间轴将自动生成')
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '人声上传失败' }
  finally { uploading.value = false; void load() }
}
watch([() => props.saved, () => props.active], ([saved, active]) => { stopPolling(); if (saved && active) void load() }, { immediate: true })
onBeforeUnmount(() => { stopPolling(); for (const name of ['timeupdate', 'seeked', 'loadedmetadata']) props.audio?.removeEventListener(name, syncAudio) })
</script>

<style scoped lang="scss">
.music-lyrics-editor { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--el-border-color-lighter); min-width: 0; font-size: 14px; }
.lyrics-heading { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; strong { font-weight: 500; } span { color: var(--el-text-color-regular); font-size: 12px; } }
.lyrics-actions, .lyrics-save { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 12px 0; :deep(.el-button) { margin: 0; min-height: 44px; } }
.music-lyrics-editor > label { display: block; margin: 14px 0 8px; }
.lyrics-note { color: var(--el-text-color-regular); font-size: 12px; line-height: 1.6; margin: 8px 0; }
.lyrics-error { color: var(--el-color-danger); line-height: 1.6; }
.lyrics-upload { display: inline-flex; align-items: center; position: relative; min-height: 44px; padding: 0 14px; border: 1px solid var(--el-border-color); border-radius: var(--el-border-radius-base); cursor: pointer; input { position: absolute; inset: 0; opacity: 0; width: 100%; cursor: pointer; } &.disabled { opacity: .5; cursor: not-allowed; } &:focus-within { outline: 2px solid var(--el-color-primary); outline-offset: 2px; } }
.lyrics-offset { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
.lyrics-offset :deep(.el-input-number) { width: 170px; }
details { margin: 12px 0; color: var(--el-text-color-regular); summary { cursor: pointer; min-height: 32px; } pre { font: inherit; white-space: pre-wrap; max-height: 180px; overflow: auto; line-height: 1.6; } }
.lyrics-preview { margin-top: 16px; }
.lyrics-seek { display: flex; align-items: center; gap: 10px; margin-top: 12px; font-size: 12px; font-variant-numeric: tabular-nums; input { flex: 1; min-width: 0; accent-color: var(--el-color-primary); min-height: 32px; } }
.lyrics-preview-lines { max-height: 160px; overflow: auto; margin-top: 12px; scrollbar-width: thin; button { display: flex; align-items: baseline; width: 100%; gap: 12px; border: 0; padding: 8px 4px; background: transparent; font: inherit; text-align: left; color: var(--el-text-color-regular); cursor: pointer; } button.current { color: var(--el-color-primary); background: var(--el-color-primary-light-9); } button:disabled { cursor: default; } time { flex: 0 0 38px; font-size: 12px; font-variant-numeric: tabular-nums; } span { overflow-wrap: anywhere; } }
.lyrics-upload:not(.disabled):active { background: var(--el-fill-color-light); }
.lyrics-preview-lines button:not(:disabled):active { background: var(--el-fill-color); }
.music-lyrics-editor button:focus-visible, .lyrics-seek input:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
@media (hover: hover) { .lyrics-preview-lines button:not(:disabled):hover { background: var(--el-fill-color-light); } .lyrics-upload:not(.disabled):hover { border-color: var(--el-color-primary); } }
</style>
