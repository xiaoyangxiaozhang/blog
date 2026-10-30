import request from '@/utils/request'

export interface ChatbotBalance {
  provider: string
  model: string
  currency: 'CNY'
  available_balance: string
  total_spent: string | null
  today_spent: string | null
  queried_at: string
}

export function getChatbotBalance(): Promise<ChatbotBalance> {
  return request.get('/admin/chatbot/balance')
}

export interface ChatbotUsage {
  date: string
  timezone: string
  today_requests: number
  daily_limit: number
  remaining_requests: number | null
  queried_at: string
}

export function getChatbotUsage(): Promise<ChatbotUsage> {
  return request.get('/admin/chatbot/usage')
}
