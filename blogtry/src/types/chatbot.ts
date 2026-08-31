export interface ChatbotDialogueExample {
  question: string
  answer: string
}

export interface ChatbotForm {
  enabled: boolean
  display_name: string
  avatar: string
  welcome: string
  base_url: string
  api_key: string
  api_key_configured: boolean
  api_key_hint: string
  model: string
  temperature: number
  tone: string
  suggestionsList: Array<{ value: string }>
  catchphrasesList: Array<{ value: string }>
  avoidPhrasesList: Array<{ value: string }>
  boundaries: string
  dialogueExamples: ChatbotDialogueExample[]
  knowledge_enabled: boolean
  max_history: number
  per_minute_limit: number
  per_day_limit: number
  global_daily_limit: number
  clear_api_key: boolean
}
