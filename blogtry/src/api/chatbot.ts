import request from '@/utils/request'

export function getChatbotConfig(): Promise<Record<string, string>> {
  return request.get('/admin/chatbot/config')
}

export function updateChatbotConfig(data: Record<string, string>): Promise<void> {
  return request.patch('/admin/chatbot/config', data)
}

export function testChatbotConfig(data: { base_url: string; api_key: string; model: string }): Promise<void> {
  return request.post('/admin/chatbot/test', data)
}

export interface ChatbotPreviewResponse {
  reply: string
  sources: Array<{ title: string; slug: string; url: string }>
}

export function previewChatbot(data: {
  message: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  persona_overrides?: {
    persona_prompt: string
    display_name: string
    tone: string
    catchphrases: string[]
    avoid_phrases: string[]
    boundaries: string
    abuse_response_style: string
    dialogue_examples: Array<{ question: string; answer: string }>
  }
}): Promise<ChatbotPreviewResponse> {
  return request.post('/admin/chatbot/preview', {
    session_id: 'admin-preview',
    message: data.message,
    history: data.history,
    persona_overrides: data.persona_overrides,
    page_context: { path: '/admin/settings', article_slug: '' }
  })
}
