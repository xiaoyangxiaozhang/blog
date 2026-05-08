import request from "@/utils/request"
import type {
  Feedback,
  FeedbackListData,
  FeedbackUpdateRequest
} from "@/types/feedback"
import type { PaginationQuery } from "@/types/request"

/**
 * 获取反馈列表
 */
export function getFeedbackList(params: PaginationQuery): Promise<FeedbackListData> {
  return request.get("/admin/feedback", { params })
}

/**
 * 获取反馈详情
 */
export function getFeedbackDetail(id: number): Promise<Feedback> {
  return request.get(`/admin/feedback/${id}`)
}

/**
 * 更新反馈
 */
export function updateFeedback(id: number, data: FeedbackUpdateRequest): Promise<void> {
  return request.put(`/admin/feedback/${id}`, data)
}

/**
 * 删除反馈
 */
export function deleteFeedback(id: number): Promise<void> {
  return request.delete(`/admin/feedback/${id}`)
}