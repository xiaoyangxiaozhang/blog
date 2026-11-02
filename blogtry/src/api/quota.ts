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

export interface ProviderWalletConfig {
  id: string
  name: string
  supported: boolean
  api_key_configured: boolean
  api_key_hint: string
  description: string
  console_url: string
}

export interface ProviderWalletAmount {
  currency: 'CNY' | 'USD'
  available_balance: string
  granted_balance?: string
  topped_up_balance?: string
  total_credits?: string
  total_spent?: string
}

export interface ProviderWalletBalance {
  provider: string
  balances: ProviderWalletAmount[]
  queried_at: string
}

export function getProviderWallets(): Promise<ProviderWalletConfig[]> {
  return request.get('/admin/quotas/wallets')
}

export function saveProviderWalletKey(provider: string, data: { api_key: string; clear?: boolean }): Promise<ProviderWalletConfig> {
  return request.patch(`/admin/quotas/wallets/${provider}`, data)
}

export function getProviderWalletBalance(provider: string): Promise<ProviderWalletBalance> {
  return request.get(`/admin/quotas/wallets/${provider}/balance`)
}

export interface CodexQuotaWindow {
  kind: 'primary' | 'secondary'
  used_percent: number | null
  duration_mins: number | null
  resets_at: number | null
}

export interface CodexTokenUsage {
  collected_at: string
  timezone: string
  days: Array<{
    date: string
    input_tokens: number
    cached_input_tokens: number
    output_tokens: number
    reasoning_output_tokens: number
    total_tokens: number
  }>
}

export interface CodexQuotaState {
  connected: boolean
  snapshot: {
    collected_at: string
    buckets: Array<{ id: string; name?: string; plan_type?: string; windows: CodexQuotaWindow[] }>
  } | null
  token_usage?: CodexTokenUsage | null
  last_attempt_at: string | null
  last_error: string
  stale: boolean
}

export function getCodexQuota(): Promise<CodexQuotaState> {
  return request.get('/admin/quotas/codex')
}

export interface OpenAIQuotaConfig {
  key_configured: boolean
  grant: number
  start_date: string
  expiry_date: string
}
export interface OpenAICost { cost: number; estimated_remaining: number; queried_at: string }
export function getOpenAIQuota(): Promise<OpenAIQuotaConfig> { return request.get('/admin/quotas/openai') }
export function saveOpenAIQuota(data: OpenAIQuotaConfig & { admin_key: string; clear?: boolean }): Promise<OpenAIQuotaConfig> { return request.patch('/admin/quotas/openai', data) }
export function getOpenAICost(): Promise<OpenAICost> { return request.get('/admin/quotas/openai/cost') }
