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

export interface ChatbotConnection {
  id: number
  name: string
  base_url: string
  model: string
  is_active: boolean
  api_key_configured: boolean
  api_key_hint: string
}

export interface ChatbotConnectionInput {
  name: string
  base_url: string
  model: string
  api_key: string
}

export function getChatbotConnections(): Promise<ChatbotConnection[]> {
  return request.get('/admin/chatbot/connections')
}
export function createChatbotConnection(data: ChatbotConnectionInput): Promise<ChatbotConnection> {
  return request.post('/admin/chatbot/connections', data)
}
export function updateChatbotConnection(id: number, data: ChatbotConnectionInput): Promise<ChatbotConnection> {
  return request.put(`/admin/chatbot/connections/${id}`, data)
}
export function activateChatbotConnection(id: number): Promise<void> {
  return request.post(`/admin/chatbot/connections/${id}/activate`)
}
export function deleteChatbotConnection(id: number): Promise<void> {
  return request.delete(`/admin/chatbot/connections/${id}`)
}
export function testChatbotConnection(id: number): Promise<void> {
  return request.post(`/admin/chatbot/connections/${id}/test`)
}
