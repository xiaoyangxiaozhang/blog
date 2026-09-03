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

    <div v-if="cropVisible" class="crop-dialog-mask" @click.self="cancelCrop">
      <section class="crop-dialog" role="dialog" aria-modal="true" aria-labelledby="crop-dialog-title">
        <div class="crop-dialog-header">
          <span id="crop-dialog-title">调整封面裁切</span>
          <span class="crop-dialog-tip">拖动图片，让主体保持在画面中心</span>
        </div>

        <div ref="cropStageRef" class="crop-stage" @pointerdown="startCropDrag">
          <img
            ref="cropImageRef"
            :src="cropSourceUrl"
            class="crop-image"
            :style="cropImageStyle"
            alt="封面裁切预览"
            draggable="false"
            @load="handleCropImageLoad"
          />
          <span class="crop-crosshair crop-crosshair-x" />
          <span class="crop-crosshair crop-crosshair-y" />
        </div>

        <div class="crop-dialog-actions">
          <el-button @click="cancelCrop">取消</el-button>
          <el-button type="primary" :loading="cropSaving" @click="confirmCrop">
            应用裁切
          </el-button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue'
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
  crop?: boolean // 是否在上传图片后提供 16:9 裁切
}

const props = withDefaults(defineProps<ImageUploaderProps>(), {
  uploadType: '图片',
  width: '120px',
  height: '120px',
  disabled: false,
  allowVideo: false,
  crop: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const pendingFile = ref<File | null>(null) // 待上传的文件
const previewUrl = ref<string>('') // 本地预览 URL
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadError = ref(false)
const cropVisible = ref(false)
const cropSourceUrl = ref('')
const cropStageRef = ref<HTMLElement | null>(null)
const cropImageRef = ref<HTMLImageElement | null>(null)
const cropSaving = ref(false)
const cropImageState = ref({
  width: 0,
  height: 0,
  scale: 1,
  left: 0,
  top: 0,
  stageWidth: 0,
  stageHeight: 0
})
const cropDragState = ref({
  startX: 0,
  startY: 0,
  startLeft: 0,
  startTop: 0
})

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

const cropImageStyle = computed(() => ({
  width: `${cropImageState.value.width}px`,
  height: `${cropImageState.value.height}px`,
  transform: `translate3d(${cropImageState.value.left}px, ${cropImageState.value.top}px, 0)`
}))

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const openCrop = async () => {
  if (!props.crop || !previewUrl.value) return

  cropSourceUrl.value = previewUrl.value
  cropVisible.value = true
  await nextTick()
  if (cropImageRef.value?.complete) {
    handleCropImageLoad()
  }
}

const handleCropImageLoad = () => {
  const stage = cropStageRef.value
  const image = cropImageRef.value
  if (!stage || !image?.naturalWidth || !image.naturalHeight) return

  const stageWidth = stage.clientWidth
  const stageHeight = stage.clientHeight
  const scale = Math.max(stageWidth / image.naturalWidth, stageHeight / image.naturalHeight)
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale

  cropImageState.value = {
    width,
    height,
    scale,
    left: (stageWidth - width) / 2,
    top: (stageHeight - height) / 2,
    stageWidth,
    stageHeight
  }
}

const startCropDrag = (event: PointerEvent) => {
  if (!cropImageState.value.width || event.button !== 0) return
  event.preventDefault()
  cropDragState.value = {
    startX: event.clientX,
    startY: event.clientY,
    startLeft: cropImageState.value.left,
    startTop: cropImageState.value.top
  }
  window.addEventListener('pointermove', handleCropDrag)
  window.addEventListener('pointerup', stopCropDrag)
}

const handleCropDrag = (event: PointerEvent) => {
  const state = cropImageState.value
  const drag = cropDragState.value
  const minLeft = state.stageWidth - state.width
  const minTop = state.stageHeight - state.height

  cropImageState.value.left = clamp(drag.startLeft + event.clientX - drag.startX, minLeft, 0)
  cropImageState.value.top = clamp(drag.startTop + event.clientY - drag.startY, minTop, 0)
}

const stopCropDrag = () => {
  window.removeEventListener('pointermove', handleCropDrag)
  window.removeEventListener('pointerup', stopCropDrag)
}

const resetCrop = () => {
  stopCropDrag()
  cropVisible.value = false
  cropSourceUrl.value = ''
  cropImageState.value = {
    width: 0,
    height: 0,
    scale: 1,
    left: 0,
    top: 0,
    stageWidth: 0,
    stageHeight: 0
  }
}

const cancelCrop = () => {
  if (cropSaving.value) return

  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  pendingFile.value = null
  uploadError.value = false
  uploadProgress.value = 0
  resetCrop()
}

const confirmCrop = async () => {
  const image = cropImageRef.value
  const state = cropImageState.value
  if (cropSaving.value || !image?.naturalWidth || !state.scale) return

  cropSaving.value = true
  try {
    const canvas = document.createElement('canvas')
    const targetWidth = 1920
    const targetHeight = 1080
    canvas.width = targetWidth
    canvas.height = targetHeight

    const context = canvas.getContext('2d')
    if (!context) throw new Error('无法创建 Canvas 上下文')

    const sourceWidth = state.stageWidth / state.scale
    const sourceHeight = state.stageHeight / state.scale
    const sourceX = clamp(-state.left / state.scale, 0, image.naturalWidth - sourceWidth)
    const sourceY = clamp(-state.top / state.scale, 0, image.naturalHeight - sourceHeight)
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    })
    if (!blob) throw new Error('无法生成裁切图片')

    const oldPreviewUrl = previewUrl.value
    const croppedFile = new File([blob], 'cover-cropped.jpg', { type: 'image/jpeg' })
    pendingFile.value = croppedFile
    previewUrl.value = URL.createObjectURL(croppedFile)
    if (oldPreviewUrl) URL.revokeObjectURL(oldPreviewUrl)
    resetCrop()
    ElMessage.success('封面裁切已应用')
  } catch (error: any) {
    ElMessage.error(error.message || '封面裁切失败')
  } finally {
    cropSaving.value = false
  }
}

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

  if (props.crop && file.type.startsWith('image/')) {
    void openCrop()
  }

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
  resetCrop()
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

onUnmounted(() => {
  stopCropDrag()
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
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
      object-position: center center;
      display: block;
    }

    .preview-media {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center center;
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

  .crop-dialog-mask {
    position: fixed;
    inset: 0;
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(0, 0, 0, 0.72);
  }

  .crop-dialog {
    width: min(680px, 100%);
    padding: 20px;
    border-radius: 12px;
    background: var(--admin-surface, #fff);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
  }

  .crop-dialog-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
    color: var(--admin-text, #303133);
    font-size: 16px;
    font-weight: 600;
  }

  .crop-dialog-tip {
    color: var(--admin-text-secondary, #909399);
    font-size: 12px;
    font-weight: 400;
  }

  .crop-stage {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    touch-action: none;
    cursor: grab;
    background: #111;

    &:active {
      cursor: grabbing;
    }
  }

  .crop-image {
    position: absolute;
    top: 0;
    left: 0;
    max-width: none;
    user-select: none;
    pointer-events: none;
  }

  .crop-crosshair {
    position: absolute;
    z-index: 1;
    pointer-events: none;
    background: rgba(255, 255, 255, 0.55);
  }

  .crop-crosshair-x {
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    transform: translateX(-50%);
  }

  .crop-crosshair-y {
    top: 50%;
    right: 0;
    left: 0;
    height: 1px;
    transform: translateY(-50%);
  }

  .crop-dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 16px;
  }

  @media (max-width: 560px) {
    .crop-dialog {
      padding: 14px;
    }

    .crop-dialog-header {
      display: block;
    }

    .crop-dialog-tip {
      display: block;
      margin-top: 6px;
    }
  }
}
</style>
