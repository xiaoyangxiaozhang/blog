<template>
  <div class="image-uploader">
    <div class="uploader-container" :style="{ width, height }">
      <el-upload class="uploader-box" :show-file-list="false" :http-request="handleUpload" :accept="accept" :disabled="disabled">
        <video v-if="imageUrl && isVideoPreview" :src="imageUrl" class="preview-media" muted loop autoplay playsinline />
        <img v-else-if="imageUrl" :src="imageUrl" class="preview-image" />
        <div v-else class="upload-placeholder">
          <el-icon :size="40">
            <Plus />
          </el-icon>
        </div>
      </el-upload>

      <div v-if="imageUrl && !disabled" class="delete-btn" @click.stop="handleDelete" title="删除">
        <el-icon>
          <Delete />
        </el-icon>
      </div>

      <div v-if="uploading || uploadError" class="upload-progress" @click.stop>
        <div class="upload-progress-track">
          <div class="upload-progress-bar" :style="{ width: `${uploadProgress}%` }" />
        </div>
        <span v-if="uploadError" class="upload-progress-error">上传失败</span>
        <span v-else>上传中 {{ uploadProgress }}%</span>
        <button v-if="uploadError" type="button" class="retry-upload" @click="retryUpload">重试</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, type UploadRequestOptions } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { uploadFile, type UploadProgress } from '@/api/file'

export interface ImageUploaderProps {
  modelValue?: string // 图片 URL
  uploadType?: string // 上传用途（如：用户头像、文章封面）
  width?: string // 宽度
  height?: string // 高度
  disabled?: boolean
  allowVideo?: boolean // 是否允许上传视频并预览视频
}

const props = withDefaults(defineProps<ImageUploaderProps>(), {
  uploadType: '图片',
  width: '120px',
  height: '120px',
  disabled: false,
  allowVideo: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const pendingFile = ref<File | null>(null) // 待上传的文件
const previewUrl = ref<string>('') // 本地预览 URL
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadError = ref(false)

const accept = computed(() => props.allowVideo ? 'image/*,video/*' : 'image/*')
const isVideoPreview = computed(() => {
  if (pendingFile.value?.type.startsWith('video/')) return true
  return /\.(mp4|webm|ogg|mov|m4v)(?:$|[?#])/i.test(props.modelValue || '')
})

// 图片 URL（本地预览或已上传）
const imageUrl = computed(() => {
  // 如果有本地预览，优先显示本地预览
  if (previewUrl.value) return previewUrl.value
  return props.modelValue || ''
})

// 上传处理（延迟上传：只做本地预览）
const handleUpload = async (options: UploadRequestOptions): Promise<void> => {
  if (props.disabled) {
    return Promise.resolve()
  }

  const file = options.file as File

  // 验证文件类型
  const isAllowed = file.type.startsWith('image/') || (props.allowVideo && file.type.startsWith('video/'))
  if (!isAllowed) {
    ElMessage.error(props.allowVideo ? '请选择图片或视频文件' : '请选择图片文件')
    return Promise.reject()
  }

  // 清理旧的预览 URL
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }

  // 保存文件和创建本地预览
  pendingFile.value = file
  previewUrl.value = URL.createObjectURL(file)
  uploadError.value = false
  uploadProgress.value = 0

  return Promise.resolve()
}

// 删除文件
const handleDelete = () => {
  if (props.disabled) return

  // 清理本地预览
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  pendingFile.value = null
  uploading.value = false
  uploadError.value = false
  uploadProgress.value = 0
  emit('update:modelValue', '')
}

const handleProgress = (progress: UploadProgress) => {
  uploadProgress.value = progress.percentage
}

// 暴露上传方法供父组件调用
const uploadPendingFile = async (): Promise<string | null> => {
  if (props.disabled || !pendingFile.value) return null

  uploading.value = true
  uploadError.value = false
  uploadProgress.value = 0
  const loading = ElMessage.info({ message: '正在上传...', duration: 0 })
  try {
    const result = await uploadFile(pendingFile.value, props.uploadType, { onProgress: handleProgress })
    uploadProgress.value = 100

    // 清理本地预览
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = ''
    }
    pendingFile.value = null

    // 更新值
    emit('update:modelValue', result.file_url)
    return result.file_url
  } catch (error: any) {
    uploadError.value = true
    ElMessage.error(error.message || '上传失败')
    throw error
  } finally {
    loading.close()
    uploading.value = false
  }
}

const retryUpload = () => {
  void uploadPendingFile().catch(() => undefined)
}

// 获取待上传文件数量
const getPendingCount = () => {
  return pendingFile.value ? 1 : 0
}

// 设置待上传文件
const setPendingFile = (file: File) => {
  pendingFile.value = file
}

// 暴露方法给父组件
defineExpose({
  uploadPendingFile,
  getPendingCount,
  setPendingFile
})
</script>

<style scoped lang="scss">
.image-uploader {
  display: inline-block;

  .uploader-container {
    position: relative;
    display: inline-block;

    .delete-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 10;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 4px;
      transition: all 0.2s;

      .el-icon {
        color: #fff;
        font-size: 16px;
      }

      &:hover {
        background: rgba(245, 108, 108, 0.9);
        transform: scale(1.1);
      }
    }

    .upload-progress {
      position: absolute;
      right: 6px;
      bottom: 6px;
      left: 6px;
      z-index: 12;
      padding: 7px 8px;
      color: #fff;
      font-size: 12px;
      background: rgba(0, 0, 0, 0.72);
      border-radius: 4px;
    }

    .upload-progress-track {
      width: 100%;
      height: 4px;
      margin-bottom: 5px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 4px;
    }

    .upload-progress-bar {
      height: 100%;
      background: var(--el-color-primary);
      transition: width 0.15s ease;
    }

    .upload-progress-error {
      color: #fca5a5;
    }

    .retry-upload {
      margin-left: 8px;
      padding: 0;
      color: #93c5fd;
      font-size: 12px;
      background: transparent;
      border: 0;
      cursor: pointer;
    }
  }

  .uploader-box {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border: 1px dashed var(--el-border-color);
    border-radius: 6px;
    overflow: hidden;
    transition: var(--el-transition-duration-fast);

    &:hover {
      border-color: var(--el-color-primary);
    }

    :deep(.el-upload) {
      width: 100%;
      height: 100%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .preview-media {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .upload-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #8c939d;
      text-align: center;
    }
  }
}
</style>
