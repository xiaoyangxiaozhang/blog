import request from "@/utils/request";
import type {
  NotificationListData,
  NotificationQueryParams
} from "@/types/notification";

/**
 * 获取管理员通知列表
 * @param params 查询参数
 * @returns Promise<NotificationListData>
 */
export function getNotifications(params: NotificationQueryParams): Promise<NotificationListData> {
  return request.get("/admin/notifications", { params });
}

/**
 * 标记单条已读
 * @param id 通知ID
 * @returns Promise<void>
 */
export function markAsRead(id: number): Promise<void> {
  return request.put(`/admin/notifications/${id}/read`);
}

/**
 * 全部标记已读
 * @returns Promise<void>
 */
export function markAllAsRead(): Promise<void> {
  return request.put("/admin/notifications/read-all");
}


