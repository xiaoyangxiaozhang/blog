import request from '@/utils/request'
import type {
  KimidouMoment,
  KimidouMomentListData,
  KimidouMomentPayload,
  KimidouMomentQuery
} from '@/types/kimidou'
import type { UserListData, UserListQuery, UpdateUserRequest, User } from '@/types/user'

export const getKimidouMoments = (params: KimidouMomentQuery): Promise<KimidouMomentListData> =>
  request.get('/admin/kimidou/moments', { params })

export const createKimidouMoment = (data: KimidouMomentPayload): Promise<KimidouMoment> =>
  request.post('/admin/kimidou/moments', data)

export const updateKimidouMoment = (id: number, data: KimidouMomentPayload): Promise<KimidouMoment> =>
  request.put(`/admin/kimidou/moments/${id}`, data)

export const deleteKimidouMoment = (id: number): Promise<void> =>
  request.delete(`/admin/kimidou/moments/${id}`)

export const restoreKimidouMoment = (id: number): Promise<void> =>
  request.put(`/admin/kimidou/moments/${id}/restore`)

export interface KimidouComment {
  id: number
  content: string
  status: number
  created_at: string
  deleted_at?: string
  target?: { type: string; key: string; title: string }
  user?: { id: number; nickname: string; email?: string; avatar?: string }
}

export interface KimidouCommentListData {
  list: KimidouComment[]
  total: number
  page: number
  page_size: number
}

export const getKimidouComments = (params: { page: number; page_size: number; is_deleted?: boolean }): Promise<KimidouCommentListData> =>
  request.get('/admin/kimidou/comments', { params })

export const toggleKimidouComment = (id: number): Promise<void> =>
  request.put(`/admin/kimidou/comments/${id}/toggle-status`)

export const deleteKimidouComment = (id: number): Promise<void> =>
  request.delete(`/admin/kimidou/comments/${id}`)

export const restoreKimidouComment = (id: number): Promise<void> =>
  request.put(`/admin/kimidou/comments/${id}/restore`)

export const getKimidouUsers = (params: UserListQuery): Promise<UserListData> =>
  request.get('/admin/kimidou/users', { params })

export const getKimidouUser = (id: number): Promise<User> =>
  request.get(`/admin/kimidou/users/${id}`)

export const updateKimidouUser = (id: number, data: UpdateUserRequest): Promise<User> =>
  request.put(`/admin/kimidou/users/${id}`, data)

export const deleteKimidouUser = (id: number): Promise<void> =>
  request.delete(`/admin/kimidou/users/${id}`)

export const restoreKimidouUser = (id: number): Promise<void> =>
  request.put(`/admin/kimidou/users/${id}/restore`)

export interface KimidouSettings {
  cover: string
}

export const getKimidouSettings = (): Promise<KimidouSettings> =>
  request.get('/admin/kimidou/settings/cover')

export const updateKimidouSettings = (data: KimidouSettings): Promise<void> =>
  request.patch('/admin/kimidou/settings/cover', data)
