// RSS文章实体
export interface RssArticle {
  id: number
  friend_id: number
  friend_name: string
  friend_url: string
  title: string
  link: string
  description: string
  published_at?: string
  is_read: boolean
  created_at: string
}

// RSS文章列表查询参数
export interface RssArticleQuery {
  page?: number
  page_size?: number
}

// RSS文章列表响应数据
export interface RssArticleListData {
  list: RssArticle[]
  total: number
  page: number
  page_size: number
  unread_count: number
}
