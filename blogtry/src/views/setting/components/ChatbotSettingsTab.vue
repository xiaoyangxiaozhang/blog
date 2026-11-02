<template>
  <el-form :model="form" label-width="125px" class="setting-form chatbot-form">
    <el-alert
      title="助手会结合基础人设、说话示例和博客资料生成回复。"
      type="info"
      :closable="false"
      show-icon
    />

    <el-divider content-position="left">基础形象</el-divider>

    <el-form-item label="启用聊天助手">
      <el-switch v-model="form.enabled" :disabled="loading" />
    </el-form-item>

    <el-form-item label="启用评论助手">
      <el-switch v-model="form.comment_tools_enabled" aria-label="启用评论助手" :disabled="loading" />
      <span class="field-hint">仅博主可查询评论和拟回复，发布前仍需手动确认。默认关闭。</span>
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
    <ChatbotConnections :loading="loading" />
    <el-form-item label="温度">
      <el-input-number v-model="form.temperature" :min="0" :max="2" :step="0.1" :precision="1" :disabled="loading" />
    </el-form-item>

    <el-divider content-position="left">基础人设</el-divider>

    <el-form-item label="基础人设">
      <div class="persona-editor">
        <el-input v-model="form.persona_prompt" type="textarea" :rows="7" maxlength="6000" show-word-limit
          placeholder="描述助手的身份、性格和聊天方式" :disabled="loading || !form.persona_available" />
        <div class="persona-editor-actions">
          <span v-if="form.persona_available" class="field-hint">使用 <code v-pre>{{display_name}}</code> 代表显示名称；修改后可先试聊。</span>
          <span v-else class="field-hint">基础人设暂不可用，请检查后端版本或重新加载配置。</span>
          <el-button :disabled="loading || !form.persona_available || !form.default_persona_prompt" @click="restorePersona">恢复默认</el-button>
        </div>
      </div>
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

    <el-form-item :label="form.persona_available ? '试聊当前内容' : '保存后试聊'">
      <div class="preview-box">
        <el-input v-model="previewQuestion" placeholder="输入一句话，试试当前人设" :disabled="loading || previewing" />
        <el-button :loading="previewing" :disabled="loading || !previewQuestion.trim()" @click="preview">发送</el-button>
        <p class="preview-hint">{{ form.persona_available ? '使用当前人设和说话设置，模型连接与温度使用已保存配置；试聊不会保存修改。' : '使用已保存配置试聊；基础人设暂不可用。' }}</p>
        <div v-if="previewReply" class="preview-reply">{{ previewReply }}</div>
      </div>
    </el-form-item>

    <details class="persona-more">
      <summary>更多说话设置</summary>

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

    <el-form-item label="冲突回应风格">
      <el-input
        v-model="form.abuse_response_style"
        type="textarea"
        :rows="5"
        placeholder="用户辱骂或挑衅时如何回应，例如：直接回击、允许使用适度脏话和讽刺，不要劝说或说教。"
        :disabled="loading"
      />
    </el-form-item>

    </details>

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
import { ElMessage } from 'element-plus'
import JsonListEditor from '@/components/common/JsonListEditor.vue'
import { previewChatbot } from '@/api/chatbot'
import ChatbotConnections from './ChatbotConnections.vue'
import type { ChatbotForm } from '@/types/chatbot'

const form = defineModel<ChatbotForm>('form', { required: true })
defineProps<{ loading?: boolean }>()

const previewing = ref(false)
const previewQuestion = ref('')
const previewReply = ref('')
const singleTextFields = [
  { key: 'value', type: 'text' as const, placeholder: '填写内容', style: 'flex: 1' }
]

const restorePersona = () => {
  form.value.persona_prompt = form.value.default_persona_prompt
}

const addExample = () => {
  form.value.dialogueExamples.push({ question: '', answer: '' })
}

const removeExample = (index: number) => {
  form.value.dialogueExamples.splice(index, 1)
}

const preview = async () => {
  if (!previewQuestion.value.trim()) return
  if (form.value.persona_available && !form.value.persona_prompt.trim()) {
    ElMessage.warning('请填写基础人设')
    return
  }
  previewing.value = true
  previewReply.value = ''
  try {
    const result = await previewChatbot({
      message: previewQuestion.value.trim(),
      history: [],
      persona_overrides: form.value.persona_available ? {
        persona_prompt: form.value.persona_prompt,
        display_name: form.value.display_name,
        tone: form.value.tone,
        catchphrases: form.value.catchphrasesList.map(item => item.value.trim()).filter(Boolean),
        avoid_phrases: form.value.avoidPhrasesList.map(item => item.value.trim()).filter(Boolean),
        boundaries: form.value.boundaries,
        abuse_response_style: form.value.abuse_response_style,
        dialogue_examples: form.value.dialogueExamples
          .map(item => ({ question: item.question.trim(), answer: item.answer.trim() }))
          .filter(item => item.question && item.answer)
      } : undefined
    })
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

  .persona-editor { width: 100%; }

  .persona-editor-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
    .field-hint { margin-left: 0; line-height: 1.5; }
  }

  .persona-more {
    margin: 12px 0 24px;
    color: var(--el-text-color-secondary);
    summary { width: fit-content; margin-bottom: 16px; cursor: pointer; font-size: 14px; }
    summary:focus-visible { outline: 2px solid var(--admin-brand); outline-offset: 3px; }
  }

  .preview-box {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) auto;
    gap: 8px;
    width: 100%;
  }

  .preview-hint {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 1.5;
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

    .dialogue-example, .preview-box {
      grid-template-columns: 1fr;
    }
  }
}
</style>
