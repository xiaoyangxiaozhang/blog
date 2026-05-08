import request from "@/utils/request";
import type { FileInfo, FileListData, FileListQuery } from "@/types/file";

/**
 * 上传文件响应接口
 */
export interface UploadResponse {
  file_url: string
  file_name: string
  file_size: number
}

/**
 * 上传文件
 * @param {File} file - 要上传的文件
 * @param {string} [type='image'] - 文件类型（默认为'image'）
 * @returns {Promise<UploadResponse>} 上传结果
 */
export async function uploadFile(file: File, type = 'image'): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);
  try {
    return await request.post("/admin/files", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  } catch (error: any) {
    // 尝试从响应中提取详细错误信息
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}

/**
 * 获取文件列表
 * @param {FileListQuery} params - 查询参数
 * @returns {Promise<FileListData>} 文件列表
 */
export function getFileList(params: FileListQuery): Promise<FileListData> {
  return request.get("/admin/files", { params });
}

/**
 * 删除文件
 * @param {number} id - 文件ID
 * @returns {Promise<void>} 
 */
export function deleteFile(id: number): Promise<void> {
  return request.delete(`/admin/files/${id}`);
}
