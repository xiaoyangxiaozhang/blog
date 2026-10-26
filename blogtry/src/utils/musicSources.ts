export const musicModes = ['original', 'instrumental', 'vocal'] as const
export type MusicMode = typeof musicModes[number]
export const musicModeLabels: Record<MusicMode, string> = { original: '原曲', instrumental: '伴奏', vocal: '人声' }
export interface MusicSource { src: string; duration: number; offset_ms: number }
export interface MusicTrack { id: string; title: string; artist: string; src: string; cover?: string; duration: number; sources: Record<MusicMode, MusicSource> }

const hint = /(?:[\s_·•|-]*(伴奏|人声|原曲|instrumental|vocals?|original)(?:版)?|\s*[(（]\s*(伴奏|人声|原曲|instrumental|vocals?|original)(?:版)?\s*[)）])\s*$/i
export function cleanMusicName(value: string) { return value.normalize('NFKC').trim().replace(hint, '').trim() }
function detectedMode(value: string): MusicMode | undefined {
  const match = value.normalize('NFKC').trim().match(hint)
  const label = (match?.[1] || match?.[2] || '').toLowerCase()
  return /伴奏|instrumental/.test(label) ? 'instrumental' : /人声|vocal/.test(label) ? 'vocal' : /原曲|original/.test(label) ? 'original' : undefined
}
export function normalizeMusicTrack(track: Omit<MusicTrack, 'sources'> & { sources?: Partial<Record<MusicMode, Partial<MusicSource>>> }): MusicTrack {
  const sources = Object.fromEntries(musicModes.map(mode => [mode, { src: '', duration: 0, offset_ms: 0, ...track.sources?.[mode] }])) as Record<MusicMode, MusicSource>
  if (!musicModes.some(mode => sources[mode].src) && track.src) {
    const mode = detectedMode(track.title) || detectedMode(track.artist) || 'instrumental'
    sources[mode] = { src: track.src, duration: track.duration || 0, offset_ms: 0 }
  }
  return { ...track, sources }
}
export function defaultMusicMode(track: MusicTrack): MusicMode { return (['instrumental', 'original', 'vocal'] as const).find(mode => track.sources[mode].src.trim()) || 'original' }
export function syncMusicDefault(track: MusicTrack) { const source = track.sources[defaultMusicMode(track)]; track.src = source.src.trim(); track.duration = source.duration || 0 }
export function musicUploadInfo(file: File, metadata: { title: string; artist: string } | null) {
  const filename = file.name.replace(/\.[^.]+$/, '')
  const parts = filename.split(' - ')
  let title = metadata?.title || (parts.length > 1 ? parts.slice(1).join(' - ') : filename)
  let artist = metadata?.artist || (parts.length > 1 ? parts[0]! : '')
  const mode = detectedMode(filename) || detectedMode(title) || detectedMode(artist) || 'original'
  if (title.includes(' - ')) {
    const prefix = title.slice(0, title.indexOf(' - '))
    if (!artist || cleanMusicName(prefix) === cleanMusicName(artist)) { artist ||= prefix; title = title.slice(title.indexOf(' - ') + 3) }
  }
  return { title: cleanMusicName(title).slice(0, 120), artist: cleanMusicName(artist).slice(0, 120), mode }
}
export function musicGroupKey(value: string) { return cleanMusicName(value).replace(/\s+/g, '').toLowerCase() }
export function findMusicGroup(tracks: MusicTrack[], title: string, artist: string): MusicTrack | undefined {
  const candidates = tracks.filter(track => musicGroupKey(track.title) === musicGroupKey(title))
  const singer = musicGroupKey(artist)
  const exact = candidates.filter(track => singer && musicGroupKey(track.artist) === singer)
  if (exact.length) return exact[0]
  // 缺少歌手时仅接受唯一候选，避免同名曲被错误归并。
  return candidates.length === 1 && (!singer || !musicGroupKey(candidates[0]!.artist)) ? candidates[0] : undefined
}
