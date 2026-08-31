<template>
  <el-dialog
    :title="friendStore.dialogTitle"
    v-model="friendStore.dialogVisible"
     width="600px" :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="友链名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入友链名称" clearable />
      </el-form-item>

      <el-form-item label="链接地址" prop="url">
        <el-input v-model="formData.url" placeholder="请输入链接地址，如：https://example.com" clearable>
          <template #append>
            <el-button type="primary" @click="handleParseLink" :disabled="!formData.url || parseLoading">
              {{ parseLoading ? '解析中...' : '解析' }}
            </el-button>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="友链描述" prop="description">
        <el-input v-model="formData.description" type="textarea" :rows="3" placeholder="请输入友链描述" clearable />
      </el-form-item>

      <el-form-item label="RSS地址" prop="rss_url">
        <el-input v-model="formData.rss_url" placeholder="请输入RSS订阅地址，如：https://example.com/feed" clearable />
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="9">
          <el-form-item label="友链头像" prop="avatar">
            <ImageUploader ref="avatarUploaderRef" v-model="formData.avatar" upload-type="友情链接A" width="120px"
              height="120px" />
          </el-form-item>
        </el-col>

        <el-col :span="15">
          <el-form-item label="网站截图" prop="screenshot">
            <ImageUploader ref="screenshotUploaderRef" v-model="formData.screenshot" upload-type="友情链接S" width="213px"
              height="120px" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="友链类型" prop="type_id">
            <el-select v-model="formData.type_id" placeholder="请选择友链类型" style="width: 100%">
              <el-option v-for="type in friendTypeOptions" :key="type.id" :label="type.name" :value="type.id">
                <span>{{ type.name }}</span>
                <el-tag v-if="!type.is_visible" size="small" type="info" style="margin-left: 8px">已隐藏</el-tag>
              </el-option>
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="排序值" prop="sort">
            <el-input-number v-model="formData.sort" :min="1" :max="10" placeholder="排序值，范围1-10，数值越大排序越靠前"
              style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 只有编辑时才显示状态控制 -->
      <el-row v-if="isEdit" :gutter="20">
        <el-col :span="8">
          <el-form-item label="已失效">
            <el-switch v-model="formData.is_invalid" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="待审核">
            <el-switch v-model="formData.is_pending" />
          </el-form-item>
        </el-col>
      </el-row>

    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading"
          :disabled="!!(parseLoading || (formData.url && !formData.avatar && !formData.screenshot))">
          确定
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>
  <script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useFriendStore } from '@/stores/friend'
import type { Friend, CreateFriendRequest, UpdateFriendRequest } from '@/types/friend'
import { ElMessage, type FormRules, } from 'element-plus'
import request from '@/utils/request'
import ImageUploader from '@/components/common/ImageUploader.vue'
import { fetchLinkInfo } from '@/api/tools'
import { getFriendTypes } from '@/api/friend'


const friendStore = useFriendStore()
// 表单引用
const formRef = ref()
// 友链头像上传器引用
const avatarUploaderRef = ref<InstanceType<typeof ImageUploader>>()
// 友链截图上传器引用
const screenshotUploaderRef = ref<InstanceType<typeof ImageUploader>>()

// 表单数据
const formData = ref<Friend & { ignoreCheck?: boolean }>({
  id: 0,
  name: '',
  url: '',
  description: '',
  rss_url: '',
  avatar: '',
  screenshot: '',
  type_id: 0,
  sort: 1,
  is_invalid: false,
  is_pending: false,
  accessible: 0,
  ignoreCheck: false
})

// 加载状态
const parseLoading = ref(false)
const submitLoading = ref(false)

// 友链类型选项
interface FriendType {
  id: number
  name: string
  is_visible: boolean
}
const friendTypeOptions = ref<FriendType[]>([])

// 是否为编辑模式
const isEdit = ref(false)

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入友链名称', trigger: 'blur' },
    { min: 1, max: 50, message: '友链名称长度为1-50个字符', trigger: 'blur' }
  ],
  url: [
    { required: true, message: '请输入链接地址', trigger: 'blur' },
    {
      pattern: /^https?:\/\/.+/,
      message: '请输入正确的链接地址，必须以http://或https://开头',
      trigger: 'blur'
    },
    { max: 255, message: '链接地址长度不能超过255个字符', trigger: 'blur' }
  ],
  description: [
    { max: 500, message: '描述长度不能超过500个字符', trigger: 'blur' }
  ],
  type_id: [
    { required: true, message: '请选择友链类型', trigger: 'change' }
  ],
  sort: [
    { required: true, message: '请输入排序值', trigger: 'blur' },
    { type: 'number', min: 1, max: 10, message: '排序值必须在 1-10 之间', trigger: 'blur' }
  ]
}

// 监听 currentFriend 变化
watch(() => friendStore.currentFriend, (newFriend) => {
  if (newFriend) {
    formData.value = { ...newFriend }
    isEdit.value = true
  } else {
    // 重置表单
    formData.value = {
      id: 0,
      name: '',
      url: '',
      description: '',
      rss_url: '',
      avatar: '',
      screenshot: '',
      type_id: 0,
      sort: 1,
      is_invalid: false,
      is_pending: false,
      accessible: 0
    }
    isEdit.value = false
  }
}, { immediate: true })

interface PreviewImageInfo {
  blobUrl: string
  file: File
}
// 下载预览图片
const downloadPreviewImage = async (url: string, filename: string): Promise<PreviewImageInfo | null> => {
  try {
    // 使用更长的超时时间（60秒）下载图片
    const response = await request.post('/admin/tools/download-image', { url }, { timeout: 60000 })

    // 简化：直接使用base64创建Blob
    const blob = await fetch(`data:image/png;base64,${response.data}`).then(res => res.blob());

    // 获取content-type
    const headerContentType = response.headers?.['content-type']
    const contentType = typeof headerContentType === 'string' ? headerContentType : 'image/png'

    // 创建File对象
    const file = new File([blob], filename, { type: contentType });

    // 创建Blob URL用于显示
    const blobUrl = URL.createObjectURL(blob);

    return { blobUrl, file };
  } catch (error) {
    console.error('下载图片失败:', error);
    return null;
  }
}
// 解析链接
const handleParseLink = async () => {
  if (!formData.value.url) {
    ElMessage.warning('请输入链接地址');
    return;
  }

  try {
    parseLoading.value = true;
    const result = await fetchLinkInfo({ url: formData.value.url });

    // 更新表单数据
    formData.value = {
      ...formData.value,
      name: result.title || formData.value.name,
      description: result.description || formData.value.description
    };

    // 下载并设置favicon（如果存在）
    if (result.favicon && avatarUploaderRef.value) {
      const previewInfo = await downloadPreviewImage(result.favicon, 'avatar.png');
      if (previewInfo) {
        formData.value.avatar = previewInfo.blobUrl;
        avatarUploaderRef.value.setPendingFile?.(previewInfo.file);
      }
    }

    ElMessage.success('解析成功');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '解析失败');
  } finally {
    parseLoading.value = false;
  }
}
// 重置表单数据
const resetFormData = () => {
  formData.value = {
    id: 0,
    name: '',
    url: '',
    description: '',
    rss_url: '',
    avatar: '',
    screenshot: '',
    type_id: 0,
    sort: 1,
    is_invalid: false,
    is_pending: false,
    accessible: 0
  }
  isEdit.value = false
}

// 处理提交
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    submitLoading.value = true
    // 上传待处理的图片（头像和截图）
    for (const [uploader, field] of [
      [avatarUploaderRef.value, 'avatar'],
      [screenshotUploaderRef.value, 'screenshot']
    ] as const) {
      if (!uploader || !(uploader.getPendingCount() > 0 ||
        (formData.value[field] && formData.value[field].startsWith('blob:')))) continue;

      try {
        const uploadedUrl = await uploader.uploadPendingFile();
        if (uploadedUrl) {
          formData.value[field] = uploadedUrl;
        }
      } catch (error: any) {
        submitLoading.value = false;
        ElMessage.error(error.message || `${field === 'avatar' ? '头像' : '截图'}上传失败`);
        return;
      }
    }

    let success = false
    if (isEdit.value && friendStore.currentFriend) {
      // 编辑友链
      const updateData: UpdateFriendRequest = {
        name: formData.value.name,
        url: formData.value.url,
        description: formData.value.description,
        avatar: formData.value.avatar,
        screenshot: formData.value.screenshot,
        sort: formData.value.sort,
        type_id: formData.value.type_id ?? undefined,
        is_invalid: formData.value.is_invalid,
        is_pending: formData.value.is_pending,
        rss_url: formData.value.rss_url,
        accessible: formData.value.ignoreCheck ? -1 : 0
      }
      success = await friendStore.handleUpdateFriend(friendStore.currentFriend.id, updateData)
    } else {
      // 新增友链
      const createData: CreateFriendRequest = {
        name: formData.value.name,
        url: formData.value.url,
        description: formData.value.description,
        avatar: formData.value.avatar,
        screenshot: formData.value.screenshot,
        sort: formData.value.sort,
        type_id: formData.value.type_id!,
        rss_url: formData.value.rss_url
      }
      success = await friendStore.handleCreateFriend(createData)
    }

    if (success) {
      resetFormData()
      friendStore.dialogVisible = false
    }
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message)
    }
  } finally {
    submitLoading.value = false
  }
}

// 取消操作
const handleCancel = () => {
  resetFormData()
  friendStore.dialogVisible = false
}

// 加载友链类型列表
const loadFriendTypes = async () => {
  try {
    const res = await getFriendTypes()
    friendTypeOptions.value = res.list
  } catch (error) {
    console.error('加载友链类型失败:', error)
  }
}
// 初始化
onMounted(() => {
  // 可以在这里加载友链类型选项
  loadFriendTypes()

})
</script>
