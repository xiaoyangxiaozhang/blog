import request from '@/utils/request'

export interface RecruitmentItem {
  uid: number
  subject: string
  from: string
  received_at: string
  unread: boolean
  category: string
  highlights: string[]
}

export interface RecruitmentState {
  configured: boolean
  email?: string
  items: RecruitmentItem[]
  updated_at?: string
  error?: string
  scanning: boolean
}

export const getRecruitment = () => request.get<unknown, RecruitmentState>('/admin/recruitment-mail')
export const connectRecruitment = (email: string, authorization_code: string) =>
  request.put<unknown, void>('/admin/recruitment-mail', { email, authorization_code }, { timeout: 60000 })
export const disconnectRecruitment = () => request.delete<unknown, void>('/admin/recruitment-mail')
export const syncRecruitment = () => request.post<unknown, void>('/admin/recruitment-mail/sync')
