<template>
  <el-form :model="form" label-width="125px" class="setting-form chatbot-form">
    <el-alert
      title="这是博主的聊天助手。它会使用关于页资料、已发布文章和下方语气样本，用博主的第一人称交流。"
      type="info"
      :closable="false"
      show-icon
    />

    <el-divider content-position="left">基础形象</el-divider>

    <el-form-item label="启用聊天助手">
      <el-switch v-model="form.enabled" :disabled="loading" />
    </el-form-item>

    <el-form-item label="显示名称">
      <el-input v-model="form.display_name" placeholder="留空时使用基本配置中的站长姓名" :disabled="loading" />
    </el-form-item>

    <el-form-item label="聊天头像">
      <el-input v-model="form.avatar" placeholder="留空时使用站长头像或站长形象" :disabled="loading" />
    </el-form-item>

    <el-form-item label="欢迎语">
      <el-input v-model="form.welcome" type="textarea" :rows="3" :disabled="loading" />
    </el-form-item>

    <el-divider content-position="left">独立模型配置</el-divider>

    <el-form-item label="API 端点">
      <el-input v-model="form.base_url" placeholder="例如 https://api.deepseek.com" :disabled="loading" />
    </el-form-item>

    <el-form-item label="API Key">
      <el-input
        v-model="form.api_key"
        type="password"
        show-password
        autocomplete="new-password"
        :placeholder="form.api_key_configured ? `已配置 ${form.api_key_hint}，留空保持不变` : '输入聊天机器人专用 API Key'"
        :disabled="loading"
      >
        <template #append>
          <el-button v-if="form.api_key_configured" :disabled="loading" @click="clearApiKey">清除</el-button>
        </template>
      </el-input>
    </el-form-item>

    <el-form-item label="模型名称">
      <el-input v-model="form.model" placeholder="例如 deepseek-chat" :disabled="loading" />
    </el-form-item>

    <el-form-item label="温度">
      <el-input-number v-model="form.temperature" :min="0" :max="2" :step="0.1" :precision="1" :disabled="loading" />
    </el-form-item>

    <el-form-item label=" " class="test-row">
      <el-button :loading="testing" :disabled="loading" @click="testConnection">测试连接</el-button>
      <span class="field-hint">聊天模型 API Key 与文章摘要、标题生成配置完全独立。</span>
    </el-form-item>

    <el-form-item label="保存后试聊">
      <div class="preview-box">
        <el-input v-model="previewQuestion" placeholder="先保存配置，再输入一句话试聊" :disabled="loading || previewing" />
        <el-button :loading="previewing" :disabled="loading || !previewQuestion.trim()" @click="preview">发送</el-button>
        <div v-if="previewReply" class="preview-reply">{{ previewReply }}</div>
      </div>
    </el-form-item>

    <el-divider content-position="left">说话风格</el-divider>

    <el-form-item label="整体语气">
      <el-input v-model="form.tone" type="textarea" :rows="5" placeholder="例如：像朋友聊天，真诚、直接、偶尔开玩笑，少用客服话术。" :disabled="loading" />
    </el-form-item>

    <el-form-item label="常用表达">
      <JsonListEditor v-model="form.catchphrasesList" :fields="singleTextFields" :default-item="{ value: '' }" :disabled="loading" />
    </el-form-item>

    <el-form-item label="避免表达">
      <JsonListEditor v-model="form.avoidPhrasesList" :fields="singleTextFields" :default-item="{ value: '' }" :disabled="loading" />
    </el-form-item>

    <el-form-item label="回答边界">
      <el-input v-model="form.boundaries" type="textarea" :rows="5" placeholder="哪些内容不能猜测或公开，遇到不确定信息如何回答。" :disabled="loading" />
    </el-form-item>

    <el-form-item label="对话示例">
      <div class="dialogue-examples">
        <div v-for="(item, index) in form.dialogueExamples" :key="index" class="dialogue-example">
          <el-input v-model="item.question" placeholder="访客问题" :disabled="loading" />
          <el-input v-model="item.answer" type="textarea" :rows="2" placeholder="你通常会怎么回答" :disabled="loading" />
          <el-button type="danger" plain :disabled="loading" @click="removeExample(index)">删除</el-button>
        </div>
        <el-button plain :disabled="loading" @click="addExample">添加对话示例</el-button>
      </div>
    </el-form-item>

    <el-divider content-position="left">知识与额度</el-divider>

    <el-form-item label="使用文章知识">
      <el-switch v-model="form.knowledge_enabled" :disabled="loading" />
      <span class="field-hint">启用后会引用当前文章或相关已发布文章。</span>
    </el-form-item>

    <el-form-item label="最大历史消息">
      <el-input-number v-model="form.max_history" :min="0" :max="20" :disabled="loading" />
    </el-form-item>

    <el-form-item label="每分钟/IP">
      <el-input-number v-model="form.per_minute_limit" :min="0" :max="100" :disabled="loading" />
    </el-form-item>

    <el-form-item label="每天/IP">
      <el-input-number v-model="form.per_day_limit" :min="0" :max="1000" :disabled="loading" />
    </el-form-item>

    <el-form-item label="全站每日">
      <el-input-number v-model="form.global_daily_limit" :min="0" :max="100000" :disabled="loading" />
    </el-form-item>

    <el-form-item label="推荐问题">
      <JsonListEditor v-model="form.suggestionsList" :fields="singleTextFields" :default-item="{ value: '' }" :disabled="loading" />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import JsonListEditor from '@/components/common/JsonListEditor.vue'
import { previewChatbot, testChatbotConfig } from '@/api/chatbot'
import type { ChatbotForm } from '@/types/chatbot'

const form = defineModel<ChatbotForm>('form', { required: true })
defineProps<{ loading?: boolean }>()

const testing = ref(false)
const previewing = ref(false)
const previewQuestion = ref('')
const previewReply = ref('')
const singleTextFields = [
  { key: 'value', type: 'text' as const, placeholder: '填写内容', style: 'flex: 1' }
]

const clearApiKey = async () => {
  try {
    await ElMessageBox.confirm('清除后聊天机器人将无法调用模型，确定继续吗？', '清除 API Key', { type: 'warning' })
    form.value.api_key = ''
    form.value.clear_api_key = true
    form.value.api_key_configured = false
    form.value.api_key_hint = ''
  } catch {
    // 用户取消操作。
  }
}

const addExample = () => {
  form.value.dialogueExamples.push({ question: '', answer: '' })
}

const removeExample = (index: number) => {
  form.value.dialogueExamples.splice(index, 1)
}

const testConnection = async () => {
  if (!form.value.base_url || !form.value.model) {
    ElMessage.warning('请先填写 API 端点和模型名称')
    return
  }
  if (!form.value.api_key && !form.value.api_key_configured) {
    ElMessage.warning('请先填写聊天机器人 API Key')
    return
  }
  testing.value = true
  try {
    await testChatbotConfig({
      base_url: form.value.base_url,
      api_key: form.value.api_key,
      model: form.value.model
    })
    ElMessage.success('聊天机器人连接成功')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '连接失败')
  } finally {
    testing.value = false
  }
}

const preview = async () => {
  if (!previewQuestion.value.trim()) return
  previewing.value = true
  previewReply.value = ''
  try {
    const result = await previewChatbot({ message: previewQuestion.value.trim(), history: [] })
    previewReply.value = result.reply || '模型没有返回内容。'
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '试聊失败')
  } finally {
    previewing.value = false
  }
}
</script>

<style scoped lang="scss">
.chatbot-form {
  .field-hint {
    margin-left: 12px;
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }

  .test-row :deep(.el-form-item__content) {
    display: flex;
    align-items: center;
  }

  .preview-box {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) auto;
    gap: 8px;
    width: 100%;
  }

  .preview-reply {
    grid-column: 1 / -1;
    padding: 10px 12px;
    border-radius: 6px;
    color: var(--el-text-color-primary);
    background: var(--el-fill-color-light);
    white-space: pre-wrap;
    line-height: 1.6;
  }

  .dialogue-examples {
    width: 100%;
  }

  .dialogue-example {
    display: grid;
    grid-template-columns: minmax(180px, 0.8fr) minmax(240px, 1.5fr) auto;
    gap: 8px;
    align-items: start;
    margin-bottom: 12px;
  }
}

@media (max-width: 768px) {
  .chatbot-form {
    .field-hint {
      display: block;
      margin: 8px 0 0;
    }

    .dialogue-example {
      grid-template-columns: 1fr;
    }
  }
}
</style>
