import request from '@/utils/request'
import type { RssArticleQuery, RssArticleListData } from '@/types/rssfeed'

/**
 * 获取RSS文章列表
 */
export const getRssArticles = async (params?: RssArticleQuery): Promise<RssArticleListData> => {
  return request.get('/admin/rssfeed', { params })
}

/**
 * 标记文章已读
 */
export const markRssArticleRead = async (id: number): Promise<void> => {
  await request.put(`/admin/rssfeed/${id}/read`)
}

/**
 * 全部标记已读
 */
export const markAllRssArticlesRead = async (): Promise<{ affected: number }> => {
  return request.put('/admin/rssfeed/read-all')
}
