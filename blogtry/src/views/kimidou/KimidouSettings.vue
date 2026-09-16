<template>
  <div class="kimidou-settings">
    <el-card>
      <template #header>
        <span>基米斗社区设置</span>
      </template>

      <el-form label-width="90px">
        <el-form-item label="社区封面">
          <ImageUploader
            ref="coverUploader"
            v-model="cover"
            upload-type="kimidou_cover"
            width="320px"
            height="180px"
            :disabled="loading || saving"
          />
          <el-input
            v-model="cover"
            class="cover-url-input"
            placeholder="也可以直接填写图片地址"
            clearable
            :disabled="loading || saving"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" :disabled="loading" @click="saveCover">
            保存封面
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ImageUploader from '@/components/common/ImageUploader.vue'
import { getKimidouSettings, updateKimidouSettings } from '@/api/kimidou'

const cover = ref('')
const loading = ref(false)
const saving = ref(false)
const coverUploader = ref<InstanceType<typeof ImageUploader>>()

const loadSettings = async () => {
  loading.value = true
  try {
    const settings = await getKimidouSettings()
    cover.value = settings.cover || ''
  } catch (error: any) {
    ElMessage.error(error.message || '获取社区设置失败')
  } finally {
    loading.value = false
  }
}

const saveCover = async () => {
  saving.value = true
  try {
    if (coverUploader.value?.getPendingCount()) {
      const uploaded = await coverUploader.value.uploadPendingFile()
      if (uploaded) cover.value = uploaded
    }
    await updateKimidouSettings({ cover: cover.value.trim() })
    cover.value = cover.value.trim()
    ElMessage.success('社区封面已保存')
  } catch (error: any) {
    ElMessage.error(error.message || '保存社区封面失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<style scoped>
.kimidou-settings {
  max-width: 760px;
}

.cover-url-input {
  display: block;
  width: 320px;
  margin-top: 12px;
}
</style>
