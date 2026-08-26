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

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void
  maxRetries?: number
  signal?: AbortSignal
}

interface ChunkUploadInitResponse {
  upload_id: string
  chunk_size: number
  total_chunks: number
  uploaded_chunks: number[]
  completed: boolean
  file?: UploadResponse
}

interface ChunkUploadResponse {
  upload_id: string
  chunk_index: number
  uploaded_chunks: number[]
  completed: boolean
  file?: UploadResponse
}

export const CHUNK_UPLOAD_THRESHOLD = 10 * 1024 * 1024
const DEFAULT_MAX_RETRIES = 3
const CHUNK_UPLOAD_STORAGE_PREFIX = 'blogtry:chunk-upload:'

const emitProgress = (onProgress: UploadOptions['onProgress'], loaded: number, total: number) => {
  if (!onProgress) return
  const safeTotal = Math.max(total, 1)
  const safeLoaded = Math.min(Math.max(loaded, 0), total)
  onProgress({
    loaded: safeLoaded,
    total,
    percentage: Math.round((safeLoaded / safeTotal) * 100)
  })
}

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    const error = new Error('上传已取消')
    error.name = 'AbortError'
    throw error
  }
}

const waitForRetry = async (attempt: number, signal?: AbortSignal) => {
  throwIfAborted(signal)
  await new Promise(resolve => window.setTimeout(resolve, Math.min(1000 * 2 ** attempt, 8000)))
  throwIfAborted(signal)
}

const getChunkUploadFile = (file?: UploadResponse): UploadResponse => {
  if (!file?.file_url) {
    throw new Error('上传完成但服务器未返回文件地址')
  }
  return file
}

const getChunkUploadStorageKey = (file: File, type: string) => {
  return `${CHUNK_UPLOAD_STORAGE_PREFIX}${encodeURIComponent(`${file.name}:${file.size}:${file.lastModified}:${type}`)}`
}

const getStoredUploadId = (key: string) => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const setStoredUploadId = (key: string, uploadId: string) => {
  try {
    window.localStorage.setItem(key, uploadId)
  } catch {
    // 隐私模式或存储空间不足时仍允许本次上传继续进行。
  }
}

const removeStoredUploadId = (key: string) => {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // 忽略不可用的本地存储。
  }
}

const uploadFileInChunks = async (file: File, type: string, options: UploadOptions): Promise<UploadResponse> => {
  const storageKey = getChunkUploadStorageKey(file, type)
  let uploadId = getStoredUploadId(storageKey)
  let status: ChunkUploadInitResponse | null = null

  if (uploadId) {
    try {
      status = await request.get(`/admin/files/chunk/${encodeURIComponent(uploadId)}`)
    } catch {
      removeStoredUploadId(storageKey)
      uploadId = null
    }
  }

  if (!status) {
    const createdStatus: ChunkUploadInitResponse = await request.post('/admin/files/chunk/init', {
      file_name: file.name,
      file_size: file.size,
      file_type: file.type || 'application/octet-stream',
      upload_type: type
    })
    status = createdStatus
    uploadId = createdStatus.upload_id
    setStoredUploadId(storageKey, uploadId)
  }

  if (!status || !uploadId) {
    throw new Error('无法创建大文件上传任务')
  }

  if (status.completed) {
    const result = getChunkUploadFile(status.file)
    removeStoredUploadId(storageKey)
    emitProgress(options.onProgress, file.size, file.size)
    return result
  }

  const chunkSize = status.chunk_size
  const uploadedChunks = new Set(status.uploaded_chunks || [])
  let uploadedBytes = 0
  uploadedChunks.forEach(index => {
    const start = index * chunkSize
    uploadedBytes += Math.max(0, Math.min(chunkSize, file.size - start))
  })
  emitProgress(options.onProgress, uploadedBytes, file.size)

  for (let index = 0; index < status.total_chunks; index += 1) {
    throwIfAborted(options.signal)
    if (uploadedChunks.has(index)) continue

    const start = index * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)
    let result: ChunkUploadResponse | null = null
    let lastError: unknown

    for (let attempt = 0; attempt <= (options.maxRetries ?? DEFAULT_MAX_RETRIES); attempt += 1) {
      try {
        result = await request.put(`/admin/files/chunk/${encodeURIComponent(uploadId)}/${index}`, chunk, {
          headers: { 'Content-Type': 'application/octet-stream' },
          timeout: 0,
          signal: options.signal,
          onUploadProgress: event => {
            emitProgress(options.onProgress, uploadedBytes + Math.min(event.loaded || 0, chunk.size), file.size)
          }
        })
        break
      } catch (error) {
        lastError = error
        throwIfAborted(options.signal)
        if (attempt >= (options.maxRetries ?? DEFAULT_MAX_RETRIES)) break
        await waitForRetry(attempt, options.signal)
      }
    }

    if (!result) {
      throw lastError || new Error(`第 ${index + 1} 个分片上传失败`)
    }

    uploadedChunks.add(index)
    uploadedBytes += chunk.size
    emitProgress(options.onProgress, uploadedBytes, file.size)
    if (result.completed) {
      const completedFile = getChunkUploadFile(result.file)
      removeStoredUploadId(storageKey)
      return completedFile
    }
  }

  const completedStatus: ChunkUploadInitResponse = await request.get(`/admin/files/chunk/${encodeURIComponent(uploadId)}`)
  const result = getChunkUploadFile(completedStatus.file)
  removeStoredUploadId(storageKey)
  emitProgress(options.onProgress, file.size, file.size)
  return result
}

/**
 * 上传文件
 * @param {File} file - 要上传的文件
 * @param {string} [type='image'] - 文件类型（默认为'image'）
 * @returns {Promise<UploadResponse>} 上传结果
 */
export async function uploadFile(file: File, type = 'image', options: UploadOptions = {}): Promise<UploadResponse> {
  if (file.size >= CHUNK_UPLOAD_THRESHOLD) {
    return uploadFileInChunks(file, type, options)
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);
  try {
    return await request.post("/admin/files", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: event => {
        emitProgress(options.onProgress, event.loaded || 0, file.size)
      }
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
