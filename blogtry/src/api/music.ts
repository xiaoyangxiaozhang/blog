import request from '@/utils/request'

export interface MusicLyricsRecord {
  track_id: string
  plain_text: string
  lrc: string
  offset_ms: number
  source: string
  vocal_src: string
  status: string
  message: string
  updated_at: string
}

export const getMusicLyrics = (id: string, signal?: AbortSignal) => request.get<unknown, MusicLyricsRecord>(`/admin/music/${encodeURIComponent(id)}/lyrics`, { signal })
export const saveMusicLyrics = (id: string, data: { lrc?: string; offset_ms?: number; vocal_src?: string }) => request.put<unknown, MusicLyricsRecord>(`/admin/music/${encodeURIComponent(id)}/lyrics`, data)
export const resolveMusicLyrics = (id: string) => request.post<unknown, MusicLyricsRecord>(`/admin/music/${encodeURIComponent(id)}/lyrics/resolve`)
export const resolveAllMusicLyrics = () => request.post<unknown, { count: number }>('/admin/music/lyrics/resolve')
