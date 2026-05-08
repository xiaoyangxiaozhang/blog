import request from "@/utils/request";
import type { SettingGroupType } from "@/types/sysconfig";

// 获取指定分组的配置
export const getSettingGroup = (
  group: SettingGroupType
): Promise<Record<string, string>> => {
  return request.get(`/admin/settings/${group}`);
};

// 更新指定分组的配置
export const updateSettingGroup = (
  group: SettingGroupType,
  data: Record<string, string>
) => {
  return request.patch(`/admin/settings/${group}`, data);
};
