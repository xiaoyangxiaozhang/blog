<template>
  <div class="profile-page">
    <el-card>
      <template #header><span>基米斗个人资料</span></template>
      <el-form label-width="90px" :model="profile">
        <el-form-item label="头像">
          <ImageUploader ref="avatarUploader" v-model="profile.avatar" upload-type="avatar" width="96px" height="96px" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="profile.nickname" maxlength="32" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="个人网站">
          <el-input v-model="profile.website" maxlength="255" placeholder="https://example.com（可选）" />
        </el-form-item>
        <el-form-item label="发帖资格">
          <el-tag :type="profile.can_post_moments ? 'success' : 'info'">{{ profile.can_post_moments ? '已开启' : '未开启' }}</el-tag>
          <span class="hint">由基米斗管理员管理</span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="saveProfile">保存资料</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="security-card">
      <template #header><span>安全信息</span></template>
      <el-form label-width="90px" :model="passwordForm">
        <el-form-item v-if="profile.has_password" label="原密码"><el-input v-model="passwordForm.old_password" type="password" show-password /></el-form-item>
        <el-form-item label="新密码"><el-input v-model="passwordForm.new_password" type="password" show-password /></el-form-item>
        <el-form-item v-if="!profile.has_password" label="确认密码"><el-input v-model="passwordForm.confirm_password" type="password" show-password /></el-form-item>
        <el-form-item><el-button :loading="passwordSaving" @click="savePassword">修改密码</el-button></el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ImageUploader from '@/components/common/ImageUploader.vue'
import { changePassword, getProfile, setPassword, updateProfile } from '@/api/user'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const avatarUploader = ref<InstanceType<typeof ImageUploader>>()
const saving = ref(false)
const passwordSaving = ref(false)
const profile = reactive({ nickname: '', avatar: '', website: '', can_post_moments: false, has_password: false })
const passwordForm = reactive({ old_password: '', new_password: '', confirm_password: '' })

const loadProfile = async () => {
  try {
    const user = await getProfile()
    profile.nickname = user.nickname || ''
    profile.avatar = user.avatar || ''
    profile.website = user.website || ''
    profile.can_post_moments = user.can_post_moments === true
    profile.has_password = user.has_password === true
    authStore.setUserInfo(user)
  } catch (error: any) {
    ElMessage.error(error.message || '获取个人资料失败')
  }
}

const saveProfile = async () => {
  if (profile.nickname.trim().length < 2) {
    ElMessage.warning('昵称至少需要2个字符')
    return
  }
  saving.value = true
  try {
    if (avatarUploader.value?.getPendingCount()) {
      const uploaded = await avatarUploader.value.uploadPendingFile()
      if (uploaded) profile.avatar = uploaded
    }
    const user = await updateProfile({ nickname: profile.nickname.trim(), avatar: profile.avatar, website: profile.website.trim() })
    authStore.setUserInfo(user)
    ElMessage.success('资料已保存')
  } catch (error: any) {
    ElMessage.error(error.message || '保存资料失败')
  } finally {
    saving.value = false
  }
}

const savePassword = async () => {
  if (passwordForm.new_password.length < 6) {
    ElMessage.warning('新密码至少需要6个字符')
    return
  }
  if (!profile.has_password && passwordForm.new_password !== passwordForm.confirm_password) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  passwordSaving.value = true
  try {
    if (profile.has_password) {
      await changePassword({ old_password: passwordForm.old_password, new_password: passwordForm.new_password })
    } else {
      await setPassword({ password: passwordForm.new_password, confirm_password: passwordForm.confirm_password })
      profile.has_password = true
    }
    passwordForm.old_password = ''
    passwordForm.new_password = ''
    passwordForm.confirm_password = ''
    ElMessage.success('密码已修改，请重新登录')
  } catch (error: any) {
    ElMessage.error(error.message || '修改密码失败')
  } finally {
    passwordSaving.value = false
  }
}

onMounted(loadProfile)
</script>

<style scoped>
.profile-page { display: grid; gap: 18px; max-width: 760px; }
.security-card { max-width: 760px; }
.hint { margin-left: 10px; color: var(--admin-text-muted); font-size: 12px; }
</style>
