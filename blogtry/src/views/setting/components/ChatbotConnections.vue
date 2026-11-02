<template>
  <div class="connections">
    <div class="connections-heading">
      <div>
        <strong>模型配置</strong>
        <p>保存多套接口和密钥，启用后立即供助手使用。</p>
      </div>
      <el-button :disabled="loading || busy" @click="openCreate">添加配置</el-button>
    </div>
    <div v-if="loadError" class="connections-error" role="alert">
      模型配置加载失败，请检查后端版本或刷新页面。
      <el-button link @click="load">重试</el-button>
    </div>
    <div v-else-if="!items.length && !loadingList" class="connections-empty">暂无模型配置，添加后即可使用。</div>
    <div v-else class="connection-list">
      <div v-for="item in items" :key="item.id" class="connection-item">
        <div class="connection-info">
          <div class="connection-name"><strong>{{ item.name }}</strong><span v-if="item.is_active" class="active-label">使用中</span></div>
          <span class="connection-detail">{{ item.model || '未配置模型' }} · {{ item.api_key_configured ? `Key ${item.api_key_hint}` : '未配置 Key' }}</span>
          <span class="connection-address">{{ item.base_url || '未配置端点' }}</span>
        </div>
        <div class="connection-actions">
          <el-button v-if="!item.is_active" link type="primary" :disabled="loading || busy" @click="activate(item)">启用</el-button>
          <el-button link :disabled="loading || busy" @click="test(item)">测试</el-button>
          <el-button link :disabled="loading || busy" @click="openEdit(item)">编辑</el-button>
          <el-button v-if="!item.is_active" link type="danger" :disabled="loading || busy" @click="remove(item)">删除</el-button>
        </div>
      </div>
    </div>
    <el-dialog v-model="dialogOpen" :title="editing ? '编辑模型配置' : '添加模型配置'" width="520px" :close-on-click-modal="!busy">
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="配置名称"><el-input v-model="draft.name" maxlength="100" placeholder="例如：DeepSeek" :disabled="busy" /></el-form-item>
        <el-form-item label="API 端点"><el-input v-model="draft.base_url" placeholder="例如：https://api.deepseek.com" :disabled="busy" /></el-form-item>
        <el-form-item label="模型名称"><el-input v-model="draft.model" placeholder="例如：deepseek-chat" :disabled="busy" /></el-form-item>
        <el-form-item label="API Key">
          <el-input v-model="draft.api_key" type="password" show-password autocomplete="new-password" :placeholder="editing?.api_key_configured ? `已保存 ${editing.api_key_hint}，留空保持不变` : '输入 API Key'" :disabled="busy" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="busy" @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="busy" @click="save">保存配置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { activateChatbotConnection, createChatbotConnection, deleteChatbotConnection, getChatbotConnections, testChatbotConnection, updateChatbotConnection } from '@/api/chatbot'
import type { ChatbotConnection, ChatbotConnectionInput } from '@/api/chatbot'

defineProps<{ loading?: boolean }>()
const items = ref<ChatbotConnection[]>([])
const loadingList = ref(false)
const loadError = ref(false)
const busy = ref(false)
const dialogOpen = ref(false)
const editing = ref<ChatbotConnection | null>(null)
const draft = ref<ChatbotConnectionInput>({ name: '', base_url: '', model: '', api_key: '' })

const load = async () => {
  loadingList.value = true
  try { items.value = await getChatbotConnections(); loadError.value = false }
  catch { loadError.value = true }
  finally { loadingList.value = false }
}
const openCreate = () => {
  editing.value = null
  draft.value = { name: '', base_url: '', model: '', api_key: '' }
  dialogOpen.value = true
}
const openEdit = (item: ChatbotConnection) => {
  editing.value = item
  draft.value = { name: item.name, base_url: item.base_url, model: item.model, api_key: '' }
  dialogOpen.value = true
}
const save = async () => {
  if (!draft.value.name.trim() || !draft.value.base_url.trim() || !draft.value.model.trim() || (!editing.value?.api_key_configured && !draft.value.api_key.trim())) {
    ElMessage.warning('请填写配置名称、端点、模型名称和 API Key')
    return
  }
  busy.value = true
  try {
    if (editing.value) await updateChatbotConnection(editing.value.id, draft.value)
    else await createChatbotConnection(draft.value)
    draft.value.api_key = ''
    dialogOpen.value = false
    await load()
    ElMessage.success('模型配置已保存')
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '保存失败') }
  finally { busy.value = false }
}
const activate = async (item: ChatbotConnection) => {
  busy.value = true
  try { await activateChatbotConnection(item.id); await load(); ElMessage.success(`已启用 ${item.name}`) }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '切换失败') }
  finally { busy.value = false }
}
const test = async (item: ChatbotConnection) => {
  busy.value = true
  try { await testChatbotConnection(item.id); ElMessage.success(`${item.name} 连接成功`) }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '连接失败') }
  finally { busy.value = false }
}
const remove = async (item: ChatbotConnection) => {
  try { await ElMessageBox.confirm(`确定删除“${item.name}”吗？`, '删除配置', { type: 'warning' }) }
  catch { return }
  busy.value = true
  try { await deleteChatbotConnection(item.id); await load(); ElMessage.success('模型配置已删除') }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '删除失败') }
  finally { busy.value = false }
}
onMounted(load)
</script>

<style scoped>
.connections { margin: 12px 0 24px; color: var(--admin-text); }
.connections-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.connections-heading p { margin-top: 5px; font-size: 12px; color: var(--admin-text-muted); }
.connections-error, .connections-empty { color: var(--admin-text-muted); padding: 16px 0; }
.connection-list { border-radius: 10px; background: var(--admin-surface-soft); }
.connection-item { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; }
.connection-item + .connection-item { border-top: 1px solid var(--admin-border-soft); }
.connection-info { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.connection-name { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.active-label { color: var(--admin-brand); font-size: 12px; }
.connection-detail, .connection-address { color: var(--admin-text-muted); font-size: 12px; overflow-wrap: anywhere; }
.connection-actions { display: flex; flex-wrap: wrap; gap: 8px; flex-shrink: 0; }
.connection-actions :deep(.el-button + .el-button) { margin-left: 0; }
@media (max-width: 767px) {
  .connections-heading { align-items: flex-start; }
  .connection-item { align-items: flex-start; flex-direction: column; gap: 8px; }
  .connection-actions { gap: 14px; }
}
</style>
