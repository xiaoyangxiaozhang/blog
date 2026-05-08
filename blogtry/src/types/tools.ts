// 工具API类型定义

// 获取链接信息请求
export interface FetchLinkRequest {
  url: string
}

// 链接信息响应
export interface LinkInfo {
  url: string
  title: string
  description: string
  favicon: string
}

// 解析视频请求
export interface ParseVideoRequest {
  url: string
}

// 视频信息响应
export interface VideoInfo {
  platform: string
  video_id: string
}

// 下载图片请求
export interface DownloadImageRequest {
  url: string
}

// 下载图片响应
export interface DownloadImageResponse {
  content_type: string
  content_length: number
  data: string
}