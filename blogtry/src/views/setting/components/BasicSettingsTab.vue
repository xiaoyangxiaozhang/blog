<template>
  <el-form :model="form" label-width="120px" class="setting-form">
    <el-divider content-position="left">站长信息</el-divider>

    <el-form-item label="站长姓名">
      <el-input v-model="form.author" placeholder="站长姓名" :disabled="loading" />
    </el-form-item>

    <el-form-item label="站长邮箱">
      <el-input v-model="form.author_email" placeholder="站长联系邮箱" :disabled="loading" />
    </el-form-item>

    <el-form-item label="站长简介">
      <el-input v-model="form.author_desc" type="textarea" :rows="3" placeholder="站长个人简介" :disabled="loading" />
    </el-form-item>

    <div class="image-row">
      <el-form-item label="站长头像">
        <ImageUploader ref="authorAvatarUploaderRef" v-model="form.author_avatar" upload-type="站长头像" width="120px"
          height="120px" :disabled="loading" />
      </el-form-item>

      <el-form-item label="站长形象">
        <ImageUploader ref="authorPhotoUploaderRef" v-model="form.author_photo" upload-type="站长形象" width="80px"
          height="120px" :disabled="loading" />
      </el-form-item>
    </div>

    <el-divider content-position="left">备案信息</el-divider>

    <el-form-item label="ICP备案号">
      <el-input v-model="form.icp" placeholder="ICP备案号" :disabled="loading" />
    </el-form-item>

    <el-form-item label="公安备案号">
      <el-input v-model="form.police_record" placeholder="公安备案号" :disabled="loading" />
    </el-form-item>

    <el-divider content-position="left">系统地址</el-divider>

    <el-form-item label="管理地址">
      <el-input v-model="form.admin_url" placeholder="例如 https://admin.your-site.com" :disabled="loading" />
    </el-form-item>

    <el-form-item label="博客地址">
      <el-input v-model="form.blog_url" placeholder="例如 https://blog.your-site.com" :disabled="loading" />
    </el-form-item>

    <el-form-item label="主页地址">
      <el-input v-model="form.home_url" placeholder="例如 https://your-site.com" :disabled="loading" />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ImageUploader from '@/components/common/ImageUploader.vue'

interface BasicForm {
  author: string
  author_email: string
  author_desc: string
  author_avatar: string
  author_photo: string
  icp: string
  police_record: string
  admin_url: string
  blog_url: string
  home_url: string
}

const form = defineModel<BasicForm>('form', { required: true })

defineProps<{
  loading?: boolean
}>()

// 图片上传器引用
const authorAvatarUploaderRef = ref<InstanceType<typeof ImageUploader>>()
const authorPhotoUploaderRef = ref<InstanceType<typeof ImageUploader>>()

// 暴露给父组件使用
defineExpose({
  authorAvatarUploaderRef,
  authorPhotoUploaderRef
})
</script>

<style lang="scss" scoped>
.setting-form {
  .image-row {
    display: flex;
    gap: 40px;

    .el-form-item {
      margin-bottom: 22px;
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .setting-form {
    .image-row {
      flex-direction: column;
      gap: 0;
    }
  }

  :deep(.el-form-item__label) {
    width: 100px !important;
    font-size: 13px;
  }
}
</style>
