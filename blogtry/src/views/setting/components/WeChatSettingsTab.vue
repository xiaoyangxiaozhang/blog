<template>
  <el-form :model="form" label-width="120px" class="setting-form">
    <el-divider content-position="left">微信公众号</el-divider>

    <el-form-item label="AppID">
      <el-input v-model="form.app_id" placeholder="请输入公众号 AppID" :disabled="loading" />
    </el-form-item>

    <el-form-item label="AppSecret">
      <el-input v-model="form.app_secret" placeholder="请输入公众号 AppSecret" type="password" show-password
        :disabled="loading" autocomplete="off" />
    </el-form-item>

    <el-form-item label="API 地址">
      <el-input v-model="form.token_url" placeholder="可选，留空使用默认地址 api.weixin.qq.com" :disabled="loading" />
    </el-form-item>

    <el-divider content-position="left">基米斗小程序</el-divider>

    <el-form-item label="小程序 AppID">
      <el-input v-model="form.mini_app_id" placeholder="请输入微信小程序 AppID" :disabled="loading" />
    </el-form-item>

    <el-form-item label="小程序 Secret">
      <el-input v-model="form.mini_app_secret" placeholder="请输入微信小程序 AppSecret" type="password" show-password
        :disabled="loading" autocomplete="off" />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
interface WeChatForm {
  app_id: string
  app_secret: string
  token_url: string
  mini_app_id: string
  mini_app_secret: string
}

const form = defineModel<WeChatForm>('form', { required: true })

defineProps<{
  loading?: boolean
}>()
</script>

<style lang="scss" scoped>
// 移动端适配
@media (max-width: 768px) {
  :deep(.el-form-item__label) {
    width: 100px !important;
    font-size: 13px;
  }
}
</style>
