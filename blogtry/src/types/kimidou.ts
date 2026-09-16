import type { PaginationQuery } from '@/types/request'

export interface KimidouMomentContent {
  text?: string
  images?: string[]
}

export interface KimidouAuthor {
  id: number
  nickname: string
  avatar: string
  badge?: string
}

export interface KimidouMoment {
  id: number
  content: KimidouMomentContent
  is_publish: boolean
  publish_time?: string
  channel: 'site' | 'kimidou'
  user_id?: number
  author?: KimidouAuthor
  deleted_at?: string
}

export interface KimidouMomentListData {
  list: KimidouMoment[]
  total: number
  page: number
  page_size: number
}

export interface KimidouMomentQuery extends PaginationQuery {
  is_deleted?: boolean
}

export interface KimidouMomentPayload {
  content: KimidouMomentContent
  is_publish: boolean
  publish_time?: string
}
