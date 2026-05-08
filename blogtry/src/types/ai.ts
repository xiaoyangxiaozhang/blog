// AI功能请求类型
export interface AISummaryRequest {
    content: string
}

export interface AIAISummaryRequest {
    content: string
}

export interface AITitleRequest {
    content: string
}

// AI功能响应类型
export interface AISummaryResponse {
    summary: string
}

export interface AIAISummaryResponse {
    summary: string
}

export interface AITitleResponse {
    title: string
}