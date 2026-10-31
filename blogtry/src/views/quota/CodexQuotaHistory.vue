<template>
  <section class="quota-history" aria-label="额度变化记录">
    <div class="history-heading">
      <div>
        <h4>额度变化</h4>
        <p>近 7 天 · 本浏览器记录</p>
      </div>
    </div>

    <div v-if="series.length" class="history-legend" aria-label="额度窗口">
      <span v-for="item in series" :key="item.key"><i :style="{ background: item.color }"></i>{{ item.label }}</span>
    </div>

    <div v-if="hasTimeline" class="history-chart">
      <svg viewBox="0 0 800 205" role="img" aria-label="额度剩余比例随时间变化，数据来自本浏览器记录的快照" preserveAspectRatio="none">
        <g class="history-grid">
          <line v-for="y in [18, 62, 106, 150]" :key="y" x1="42" :y1="y" x2="790" :y2="y" />
        </g>
        <g class="history-axis">
          <text x="0" y="22">100%</text>
          <text x="7" y="66">67%</text>
          <text x="7" y="110">33%</text>
          <text x="14" y="154">0%</text>
          <text x="42" y="183">{{ formatTime(firstTime) }}</text>
          <text x="790" y="183" text-anchor="end">{{ formatTime(lastTime) }}</text>
        </g>
        <g v-for="item in series" :key="item.key">
          <polyline v-for="(segment, index) in item.segments" :key="index" :points="segment" :stroke="item.color" fill="none" stroke-width="2" vector-effect="non-scaling-stroke" />
          <circle v-for="point in item.points" :key="point.at" :cx="point.x" :cy="point.y" r="4" :fill="item.color" stroke="var(--el-bg-color)" stroke-width="1.5" vector-effect="non-scaling-stroke">
            <title>{{ item.label }} · {{ formatTime(point.at) }} · 剩余 {{ formatPercent(point.remaining) }}%</title>
          </circle>
        </g>
      </svg>
    </div>
    <div v-else class="history-empty">
      {{ points.length ? '已记录首次额度，等待更多数据。' : '等待首次额度记录。' }}
    </div>
    <details class="history-note">
      <summary>记录说明</summary>
      <p>仅记录本浏览器打开页面时收到的额度快照，不代表 Token 用量或实际账单。重置时间未知、周期变化或采集间隔较长时不连线。</p>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { CodexQuotaState } from '@/api/quota'

type Reading = { key: string; label: string; remaining: number; reset: number | null }
type Point = { at: number; readings: Reading[] }
type ChartPoint = { at: number; remaining: number; reset: number | null; x: number; y: number }

const props = defineProps<{ snapshot: CodexQuotaState['snapshot'] }>()
const storageKey = 'codex-quota-history-v1'
const maxAge = 7 * 24 * 60 * 60 * 1000
const maxPoints = 2016
const maxGap = 30 * 60 * 1000
const colors = ['var(--el-color-primary)', 'var(--el-color-success)', 'var(--el-color-warning)', 'var(--el-color-danger)', 'var(--el-color-info)']
const points = ref<Point[]>([])
const ready = ref(false)

const windowLabel = (mins: number | null, kind: string) => mins === null ? (kind === 'primary' ? '主要窗口' : '附加窗口') : mins % 1440 === 0 ? `${mins / 1440} 天窗口` : mins % 60 === 0 ? `${mins / 60} 小时窗口` : `${mins} 分钟窗口`
const formatTime = (time: number) => new Date(time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
const formatPercent = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 1 })

function isReading(value: unknown): value is Reading {
  if (!value || typeof value !== 'object') return false
  const reading = value as Reading
  return typeof reading.key === 'string' && reading.key.length > 0 && reading.key.length <= 300 && typeof reading.label === 'string' && reading.label.length <= 300 && typeof reading.remaining === 'number' && Number.isFinite(reading.remaining) && reading.remaining >= 0 && reading.remaining <= 100 && (reading.reset === null || (typeof reading.reset === 'number' && Number.isFinite(reading.reset)))
}

function validPoints(raw: unknown): Point[] {
  if (!Array.isArray(raw)) return []
  const now = Date.now()
  const valid = raw.filter((entry): entry is Point => !!entry && typeof entry.at === 'number' && Number.isFinite(entry.at) && entry.at >= now - maxAge && entry.at <= now + 5 * 60 * 1000 && Array.isArray(entry.readings) && entry.readings.length > 0 && entry.readings.every(isReading))
  const unique = new Map<number, Point>()
  for (const point of valid) unique.set(point.at, point)
  return [...unique.values()].sort((a, b) => a.at - b.at).slice(-maxPoints)
}

function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(points.value)) } catch { /* local history is optional */ }
}

function recordSnapshot() {
  if (!ready.value || !props.snapshot) return
  const at = Date.parse(props.snapshot.collected_at)
  if (!Number.isFinite(at)) return
  const readings: Reading[] = []
  for (const bucket of props.snapshot.buckets) {
    for (const window of bucket.windows) {
      if (typeof window.used_percent !== 'number' || !Number.isFinite(window.used_percent) || window.used_percent < 0 || window.used_percent > 100) continue
      const label = windowLabel(window.duration_mins, window.kind)
      readings.push({
        key: JSON.stringify([bucket.id, window.kind, window.duration_mins]),
        label: bucket.id === 'codex' ? label : `${bucket.name || bucket.id} · ${label}`,
        remaining: 100 - window.used_percent,
        reset: typeof window.resets_at === 'number' && Number.isFinite(window.resets_at) ? window.resets_at : null
      })
    }
  }
  if (!readings.length || !readings.every(isReading)) return
  const next = validPoints([...points.value, { at, readings }])
  if (JSON.stringify(next) !== JSON.stringify(points.value)) {
    points.value = next
    persist()
  }
}

onMounted(() => {
  try { points.value = validPoints(JSON.parse(localStorage.getItem(storageKey) || '[]')) } catch { points.value = [] }
  ready.value = true
  recordSnapshot()
})
watch(() => props.snapshot, recordSnapshot, { deep: true })

const firstTime = computed(() => points.value[0]?.at ?? 0)
const lastTime = computed(() => points.value[points.value.length - 1]?.at ?? 0)
const hasTimeline = computed(() => points.value.length > 1 && lastTime.value > firstTime.value)
const series = computed(() => {
  const byKey = new Map<string, { key: string; label: string; points: ChartPoint[] }>()
  const span = Math.max(1, lastTime.value - firstTime.value)
  for (const point of points.value) {
    for (const reading of point.readings) {
      if (!byKey.has(reading.key)) byKey.set(reading.key, { key: reading.key, label: reading.label, points: [] })
      const entry = byKey.get(reading.key)!
      entry.label = reading.label
      entry.points.push({ at: point.at, remaining: reading.remaining, reset: reading.reset, x: 42 + (point.at - firstTime.value) / span * 748, y: 150 - reading.remaining / 100 * 132 })
    }
  }
  return [...byKey.values()].map((entry, index) => {
    const segments: string[] = []
    let current: ChartPoint[] = []
    for (const point of entry.points) {
      const previous = current[current.length - 1]
      if (previous && (point.reset === null || previous.reset === null || point.reset !== previous.reset || (previous.at < previous.reset * 1000 && point.at >= previous.reset * 1000) || point.at - previous.at > maxGap)) {
        if (current.length > 1) segments.push(current.map(p => `${p.x},${p.y}`).join(' '))
        current = []
      }
      current.push(point)
    }
    if (current.length > 1) segments.push(current.map(p => `${p.x},${p.y}`).join(' '))
    return { ...entry, segments, color: colors[index % colors.length] }
  })
})
</script>

<style scoped>
.quota-history { min-width: 0; padding: 20px; border-radius: 12px; background: color-mix(in srgb, var(--el-text-color-primary) 3%, transparent); }
.history-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
h4 { margin: 0; font-size: 14px; font-weight: 500; }
.history-heading p, .history-note { margin: 6px 0 0; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.6; }
.history-note summary { cursor: pointer; width: fit-content; }
.history-note summary:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 3px; }
.history-note p { margin: 6px 0 0; }
.history-legend { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 17px; color: var(--el-text-color-secondary); font-size: 12px; }
.history-legend span { display: inline-flex; align-items: center; gap: 6px; }
.history-legend i { width: 7px; height: 7px; border-radius: 50%; }
.history-chart { margin-top: 12px; overflow-x: auto; }
.history-chart svg { display: block; width: 100%; min-width: 420px; height: 205px; overflow: visible; }
.history-grid line { stroke: var(--el-border-color-lighter); stroke-width: 1; }
.history-axis { fill: var(--el-text-color-secondary); font-size: 11px; font-variant-numeric: tabular-nums; }
.history-empty { display: grid; place-items: center; min-height: 120px; padding: 16px 0; text-align: center; color: var(--el-text-color-secondary); font-size: 13px; line-height: 1.6; }
.history-note { margin-top: 12px; }
@media (max-width: 600px) { .quota-history { padding: 18px; } }
</style>
