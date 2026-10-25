<template>
  <section v-loading="loading" class="music-settings" aria-label="音乐歌单配置">
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-button v-if="!ready && !loading" @click="load">重新加载歌单</el-button>

    <div class="music-download-setting">
      <div>
        <label id="music-download-label" for="music-download-switch">允许下载伴奏</label>
        <p id="music-download-description">开启后，访客可在音乐面板下载歌曲。</p>
      </div>
      <el-switch id="music-download-switch" v-model="downloadEnabled" :disabled="locked" aria-labelledby="music-download-label" aria-describedby="music-download-description" />
    </div>

    <div class="music-list-toolbar">
      <el-button :disabled="locked || tracks.length >= 100" @click="add">添加歌曲</el-button>
      <el-button :disabled="locked || tracks.length >= 100" @click="batchInput?.click()">批量添加</el-button>
      <input ref="batchInput" type="file" accept=".mp3,audio/mpeg" multiple hidden :disabled="locked || tracks.length >= 100" aria-label="批量添加 MP3" @change="uploadBatch">
      <span class="music-count">{{ tracks.length }} / 100 首</span>
    </div>
    <p v-if="batchTotal" class="music-batch-status" role="status" aria-live="polite" aria-atomic="true">
      正在添加 {{ batchIndex }} / {{ batchTotal }}：{{ batchName }} · {{ uploadingKind === 'cover' ? '封面' : '音频' }} {{ uploadProgress }}%
    </p>
    <ol class="music-rows">
      <li v-for="(track, index) in tracks" :key="track.id" class="music-row">
        <div class="music-row-header">
          <button
            class="music-row-toggle"
            type="button"
            :aria-expanded="expandedId === track.id"
            :aria-controls="`music-details-${track.id}`"
            @click="expandedId = expandedId === track.id ? '' : track.id"
          >
            <el-image v-if="track.cover" class="music-row-cover" :src="coverUrl(track.cover)" fit="cover" alt="" lazy>
              <template #error><el-icon><Headset /></el-icon></template>
            </el-image>
            <span v-else class="music-row-cover music-cover-empty" aria-hidden="true"><el-icon><Headset /></el-icon></span>
            <span class="music-row-title">{{ track.title || '未命名歌曲' }}</span>
            <el-icon class="music-row-arrow" :class="{ 'is-open': expandedId === track.id }" aria-hidden="true"><ArrowRight /></el-icon>
          </button>
          <el-button
            class="music-preview-toggle"
            :icon="previewTrackId === track.id && (previewPlaying || previewLoading) ? VideoPause : VideoPlay"
            :disabled="loading || !ready || !track.src"
            :aria-label="`${previewTrackId === track.id && (previewPlaying || previewLoading) ? '暂停试听' : '试听'}${track.title || '未命名歌曲'}`"
            :title="previewTrackId === track.id && (previewPlaying || previewLoading) ? '暂停试听' : '试听'"
            :aria-pressed="previewTrackId === track.id && (previewPlaying || previewLoading)"
            :aria-busy="previewTrackId === track.id && previewLoading"
            @click="preview(track)"
          />
        </div>
        <div v-if="expandedId === track.id" :id="`music-details-${track.id}`" class="music-row-details">
          <div class="music-fields">
            <label :for="`music-title-${track.id}`">曲名</label>
            <el-input :id="`music-title-${track.id}`" v-model="track.title" :disabled="locked" maxlength="120" />
            <label :for="`music-artist-${track.id}`">歌手 / 说明</label>
            <el-input :id="`music-artist-${track.id}`" v-model="track.artist" :disabled="locked" maxlength="120" />
            <label :for="`music-src-${track.id}`">音频地址</label>
            <el-input :id="`music-src-${track.id}`" v-model="track.src" :disabled="locked" placeholder="https://… 或 /music/…" maxlength="2048" @input="track.duration = 0" />
            <label :for="`music-cover-${track.id}`">歌曲封面</label>
            <div class="music-cover-field">
              <el-image v-if="track.cover" class="music-cover-preview" :src="coverUrl(track.cover)" fit="cover" :alt="`${track.title || '歌曲'}封面`">
                <template #error><span>无法加载</span></template>
              </el-image>
              <el-input :id="`music-cover-${track.id}`" v-model="track.cover" :disabled="locked" placeholder="图片地址，可留空" maxlength="2048" clearable />
            </div>
          </div>
          <div class="music-row-actions">
            <label class="music-upload" :class="{ disabled: locked }">
              {{ uploadingId === track.id && uploadingKind === 'audio' ? `上传中 ${uploadProgress}%` : '上传音频' }}
              <input type="file" accept=".mp3,.wav,.ogg,.aac,.flac" :disabled="locked" :aria-label="`上传${track.title || '新歌曲'}的音频`" @change="uploadMedia($event, track, 'audio')">
            </label>
            <label class="music-upload" :class="{ disabled: locked }">
              {{ uploadingId === track.id && uploadingKind === 'cover' ? `上传中 ${uploadProgress}%` : '上传封面' }}
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" :disabled="locked" :aria-label="`上传${track.title || '新歌曲'}的封面`" @change="uploadMedia($event, track, 'cover')">
            </label>
            <el-button :icon="ArrowUp" :disabled="locked || index === 0" :aria-label="`上移${track.title || '歌曲'}`" @click="move(index, -1)" />
            <el-button :icon="ArrowDown" :disabled="locked || index === tracks.length - 1" :aria-label="`下移${track.title || '歌曲'}`" @click="move(index, 1)" />
            <el-button type="danger" plain :disabled="locked" @click="remove(track.id)">删除歌曲</el-button>
          </div>
        </div>
      </li>
    </ol>
    <p v-if="ready && !tracks.length" class="music-empty">歌单为空，添加歌曲后保存即可开启播放器。</p>
    <audio ref="previewAudio" :src="previewSrc || undefined" preload="none" hidden @pause="previewPlaying = false" @ended="stopPreview" @error="previewSrc && handlePreviewError()" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDown, ArrowRight, ArrowUp, Headset, VideoPause, VideoPlay } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getSettingGroup, updateSettingGroup } from '@/api/sysconfig'
import { uploadFile } from '@/api/file'
import { readMp3Metadata } from '@/utils/mp3Cover'

interface MusicTrack { id: string; title: string; artist: string; src: string; cover?: string; duration: number }
type Mp3Metadata = Awaited<ReturnType<typeof readMp3Metadata>>
const props = defineProps<{ readonly?: boolean; saving?: boolean }>()
const tracks = ref<MusicTrack[]>([])
const downloadEnabled = ref(false)
const loading = ref(false)
const ready = ref(false)
const error = ref('')
const uploadingId = ref('')
const uploadingKind = ref<'audio' | 'cover'>('audio')
const uploadProgress = ref(0)
const batchInput = ref<HTMLInputElement | null>(null)
const batchTotal = ref(0)
const batchIndex = ref(0)
const batchName = ref('')
const expandedId = ref('')
const previewAudio = ref<HTMLAudioElement | null>(null)
const previewSrc = ref('')
const previewTrackId = ref('')
const previewPlaying = ref(false)
const previewLoading = ref(false)
let previewAttempt = 0
const blogUrl = ref('')
const locked = computed(() => props.readonly || props.saving || loading.value || !ready.value || !!uploadingId.value || !!batchTotal.value)

async function load() {
  if (uploadingId.value || batchTotal.value) return
  loading.value = true
  error.value = ''
  stopPreview()
  expandedId.value = ''
  ready.value = false
  try {
    const settings = await getSettingGroup('blog')
    if (settings['blog.music_playlist'] === undefined) throw new Error('音乐配置尚未初始化，请先部署后端的歌单迁移。')
    const value: unknown = JSON.parse(settings['blog.music_playlist'])
    if (!Array.isArray(value) || value.some(item => !item || typeof item.id !== 'string' || typeof item.title !== 'string' || typeof item.artist !== 'string' || typeof item.src !== 'string')) {
      throw new Error('歌单配置格式无效，请检查后台数据。')
    }
    tracks.value = value.map(track => ({ ...track, cover: typeof track.cover === 'string' ? track.cover : '', duration: Number.isFinite(track.duration) ? track.duration : 0 }))
    downloadEnabled.value = settings['blog.music_download_enabled'] === 'true'
    ready.value = true
    const basic = await getSettingGroup('basic')
    blogUrl.value = basic['basic.blog_url'] || ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '加载歌单失败，请重试。'
  } finally { loading.value = false }
}

function add() {
  if (locked.value || tracks.value.length >= 100) return
  const id = crypto.randomUUID()
  tracks.value.push({ id, title: '', artist: '', src: '', cover: '', duration: 0 })
  revealTrack(id)
}
function revealTrack(id: string, field = 'title') {
  expandedId.value = id
  nextTick(() => document.getElementById(`music-${field}-${id}`)?.focus())
}
function move(index: number, offset: number) {
  const [track] = tracks.value.splice(index, 1)
  if (track) tracks.value.splice(index + offset, 0, track)
}
function remove(id: string) {
  tracks.value = tracks.value.filter(track => track.id !== id)
  if (expandedId.value === id) expandedId.value = ''
  if (previewTrackId.value === id) stopPreview()
}
function validSource(src: string) {
  if (!src || /[\\\u0000-\u001f\u007f]/.test(src)) return false
  if (src.startsWith('/') && !src.startsWith('//')) return true
  try {
    const url = new URL(src)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
  } catch { return false }
}
function coverUrl(src: string) {
  if (!validSource(src)) return ''
  try { return src.startsWith('/') ? new URL(src, blogUrl.value).href : src } catch { return '' }
}
async function preview(track: MusicTrack) {
  const attempt = ++previewAttempt
  if (previewTrackId.value === track.id && (previewPlaying.value || previewLoading.value)) {
    previewAudio.value?.pause()
    previewPlaying.value = false
    previewLoading.value = false
    return
  }
  try {
    const source = track.src.trim()
    if (!validSource(source)) throw new Error('请填写有效的音频直链或站内地址。')
    const url = source.startsWith('/') ? new URL(source, blogUrl.value).href : source
    if (previewTrackId.value !== track.id || previewSrc.value !== url) {
      previewAudio.value?.pause()
      previewTrackId.value = track.id
      previewSrc.value = url
    }
    previewPlaying.value = false
    previewLoading.value = true
    error.value = ''
    await nextTick()
    if (attempt !== previewAttempt || !previewAudio.value) return
    await previewAudio.value.play()
    if (attempt === previewAttempt) {
      previewPlaying.value = true
      previewLoading.value = false
    }
  } catch {
    if (attempt === previewAttempt) handlePreviewError()
  }
}
function stopPreview() {
  ++previewAttempt
  previewAudio.value?.pause()
  previewTrackId.value = ''
  previewSrc.value = ''
  previewPlaying.value = false
  previewLoading.value = false
}
function handlePreviewError() {
  stopPreview()
  error.value = '试听失败，请检查音频地址是否可访问，以及基本配置中的博客地址。'
}
async function uploadMedia(event: Event, track: MusicTrack, kind: 'audio' | 'cover') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || locked.value) return
  const isCover = kind === 'cover'
  const supported = isCover ? /\.(jpe?g|png|webp|gif)$/i : /\.(mp3|wav|ogg|aac|flac)$/i
  if (!supported.test(file.name)) { error.value = isCover ? '请选择 JPG、PNG、WebP 或 GIF 图片。' : '请选择支持的音频格式。'; return }
  uploadingId.value = track.id
  uploadingKind.value = kind
  uploadProgress.value = 0
  error.value = ''
  try {
    if (isCover) {
      const result = await uploadFile(file, '音乐封面', { keepOriginal: false, onProgress: progress => { uploadProgress.value = progress.percentage } })
      track.cover = result.file_url
    } else if (!await uploadAudio(file, track)) {
      ElMessage.warning('音频已上传，部分歌曲信息或封面未能自动添加，可手动补充后保存。')
      return
    }
    ElMessage.success(`${isCover ? '封面' : '音频和歌曲信息'}已上传，保存配置后生效`)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '上传失败，请重试。'
  } finally { uploadingId.value = '' }
}
function uploadTrackInfo(file: File, metadata: Mp3Metadata | null) {
  const name = file.name.replace(/\.[^.]+$/, '')
  const separator = name.indexOf(' - ')
  return {
    title: (metadata?.title || (separator > 0 ? name.slice(separator + 3) : name)).trim().slice(0, 120),
    artist: (metadata?.artist || (separator > 0 ? name.slice(0, separator) : '')).trim().slice(0, 120)
  }
}
function normalizeTrackName(value: string) {
  return value.normalize('NFKC').replace(/(?:\s*\(\s*伴奏\s*\)|[\s·_-]+伴奏)\s*$/, '').replace(/\s+/g, '').toLowerCase()
}
function hasTrack(title: string, artist: string) {
  const name = normalizeTrackName(title)
  const singer = normalizeTrackName(artist)
  return !!name && tracks.value.some(track => {
    const existingSinger = normalizeTrackName(track.artist)
    return !!track.src.trim() && normalizeTrackName(track.title) === name && (!singer || !existingSinger || singer === existingSinger)
  })
}
async function uploadAudio(file: File, track: MusicTrack, preparedMetadata?: Mp3Metadata | null): Promise<boolean> {
  uploadingKind.value = 'audio'
  uploadProgress.value = 0
  const result = await uploadFile(file, 'music', { keepOriginal: true, onProgress: progress => { uploadProgress.value = progress.percentage } })
  track.src = result.file_url
  track.duration = 0
  try {
    const metadata = preparedMetadata === undefined ? await readMp3Metadata(file) : preparedMetadata
    const info = uploadTrackInfo(file, metadata)
    if (!track.title.trim()) track.title = info.title
    if (!track.artist.trim()) track.artist = info.artist
    if (!track.cover?.trim() && metadata?.cover) {
      uploadingKind.value = 'cover'
      uploadProgress.value = 0
      const result = await uploadFile(metadata.cover, '音乐封面', { keepOriginal: false, onProgress: progress => { uploadProgress.value = progress.percentage } })
      track.cover = result.file_url
    }
    return metadata !== null
  } catch {
    const info = uploadTrackInfo(file, null)
    if (!track.title.trim()) track.title = info.title
    if (!track.artist.trim()) track.artist = info.artist
    return false
  }
}
async function uploadBatch(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length || locked.value) return
  if (files.some(file => !/\.mp3$/i.test(file.name))) { error.value = '批量添加请选择 MP3 文件。'; return }
  error.value = ''
  batchTotal.value = files.length
  let added = 0
  let skipped = 0
  let overLimit = 0
  let incomplete = 0
  const failed: string[] = []
  try {
    for (const [index, file] of files.entries()) {
      batchIndex.value = index + 1
      batchName.value = file.name
      uploadingId.value = ''
      uploadingKind.value = 'audio'
      uploadProgress.value = 0
      let metadata: Mp3Metadata | null = null
      try { metadata = await readMp3Metadata(file) } catch { /* 标签损坏时仍按文件名识别并允许上传。 */ }
      const info = uploadTrackInfo(file, metadata)
      if (hasTrack(info.title, info.artist)) { skipped++; continue }
      if (tracks.value.length >= 100) { overLimit++; continue }
      const track: MusicTrack = { id: crypto.randomUUID(), ...info, src: '', cover: '', duration: 0 }
      uploadingId.value = track.id
      try {
        if (!await uploadAudio(file, track, metadata)) incomplete++
        tracks.value.push(track)
        added++
      } catch {
        failed.push(file.name)
      }
    }
    const summary = `已添加 ${added} 首${skipped ? `，跳过 ${skipped} 首重复歌曲` : ''}`
    const messages: string[] = []
    if (failed.length) messages.push(`${failed.length} 首上传失败：${failed.join('、')}，可重新选择失败文件。`)
    if (overLimit) messages.push(`歌单最多 100 首，另有 ${overLimit} 首未添加。`)
    if (messages.length) error.value = `${messages.join('')}${summary}${added ? '，保存配置后生效。' : '。'}`
    if (incomplete) ElMessage.warning(`${summary}，其中 ${incomplete} 首的歌曲信息或封面需手动补充，保存配置后生效。`)
    else if (added) ElMessage.success(`${summary}，保存配置后生效`)
    else if (skipped && !messages.length) ElMessage.info(`所选歌曲已在歌单中，跳过 ${skipped} 首重复歌曲`)
  } finally {
    uploadingId.value = ''
    batchTotal.value = 0
  }
}
async function save() {
  if (props.readonly || !ready.value || loading.value || uploadingId.value || batchTotal.value) { ElMessage.warning('请等待歌单加载或文件上传完成'); return }
  const payload = tracks.value.map(track => ({ ...track, title: track.title.trim(), artist: track.artist.trim(), src: track.src.trim(), cover: track.cover?.trim() || '' }))
  const invalid = payload.findIndex(track => !track.title || !validSource(track.src))
  if (invalid >= 0) {
    const track = payload[invalid]!
    revealTrack(track.id, track.title ? 'src' : 'title')
    error.value = `请补全第${invalid + 1}首歌曲的曲名和有效音频地址。`
    return
  }
  const invalidCover = payload.findIndex(track => track.cover && !validSource(track.cover))
  if (invalidCover >= 0) {
    revealTrack(payload[invalidCover]!.id, 'cover')
    error.value = `第${invalidCover + 1}首歌曲的封面地址无效，请填写图片直链或站内地址。`
    return
  }
  try {
    await updateSettingGroup('blog', {
      'blog.music_playlist': JSON.stringify(payload),
      'blog.music_download_enabled': String(downloadEnabled.value)
    })
    tracks.value = payload
    error.value = ''
    ElMessage.success('歌单已保存，博客重新加载后生效')
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '保存歌单失败，请重试。' }
}
onMounted(load)
onBeforeUnmount(stopPreview)
defineExpose({ load, save })
</script>

<style scoped lang="scss">
.music-settings { max-width: 960px; }
.music-download-setting {
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  padding: 16px 0; border-bottom: 1px solid var(--el-border-color-lighter);
  label { font-size: 14px; font-weight: 500; cursor: pointer; }
  p { margin: 6px 0 0; font-size: 13px; color: var(--el-text-color-regular); line-height: 1.5; }
  :deep(.el-switch) { flex-shrink: 0; min-height: 44px; }
}
.music-rows { list-style: none; padding: 0; margin: 16px 0; }
.music-row { border-bottom: 1px solid var(--el-border-color-lighter); }
.music-row-header { display: flex; align-items: center; gap: 12px; }
.music-row-toggle {
  display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; min-height: 76px;
  border: 0; padding: 10px 0; background: transparent; color: var(--el-text-color-primary); text-align: left; font: inherit; cursor: pointer;
  &:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
  &:active { opacity: .7; }
}
.music-row-cover { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; flex: 0 0 48px; border-radius: 6px; color: var(--el-text-color-secondary); background: var(--el-fill-color-light); }
.music-row-cover :deep(.el-image__error) { color: inherit; background: transparent; }
.music-cover-empty { font-size: 20px; }
.music-row-title { flex: 1; min-width: 0; font-size: 15px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.music-row-arrow { flex-shrink: 0; color: var(--el-text-color-secondary); &.is-open { transform: rotate(90deg); } }
.music-preview-toggle { width: 44px; min-height: 44px; margin: 0; border: 0; background: transparent; font-size: 24px; }
.music-row-details { padding: 10px 0 20px 62px; }
.music-fields { display: grid; grid-template-columns: 86px minmax(0, 1fr); gap: 12px; align-items: center; }
.music-fields label { font-size: 14px; }
.music-cover-field { display: flex; align-items: center; gap: 12px; min-width: 0; }
.music-cover-preview { width: 56px; height: 56px; flex: 0 0 56px; border-radius: 6px; font-size: 11px; }
.music-row-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 16px 0 0 98px; }
.music-row-actions :deep(.el-button) { margin: 0; min-width: 44px; min-height: 44px; }
.music-upload { position: relative; display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; border: 1px solid var(--el-border-color); border-radius: var(--el-border-radius-base); font-size: 14px; cursor: pointer; }
.music-upload input { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; }
.music-upload:focus-within { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
.music-upload:active { opacity: .7; }
.music-upload.disabled { opacity: .5; cursor: not-allowed; }
.music-empty { padding: 24px 0; }
.music-list-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.music-list-toolbar :deep(.el-button) { margin: 0; min-height: 44px; }
.music-count { margin-left: auto; color: var(--el-text-color-regular); font-size: 13px; }
.music-batch-status { margin: 12px 0; color: var(--el-text-color-regular); font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
@media (hover: hover) and (pointer: fine) { .music-row-toggle:hover .music-row-title { color: var(--el-color-primary); } }
@media (max-width: 600px) {
  .music-settings :deep(.el-button), .music-fields :deep(.el-input__wrapper) { min-height: 44px; }
  .music-fields { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .music-fields label:not(:first-child) { margin-top: 8px; }
  .music-row-actions { margin-left: 0; }
  .music-row-details { padding-left: 0; }
}
</style>
