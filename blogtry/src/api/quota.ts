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
