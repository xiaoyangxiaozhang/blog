<template>
  <div class="wangeditor-container">
    <div ref="editorRef" style="height: 500px; border: 1px solid var(--admin-border)"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { createEditor } from '@wangeditor/editor'
import '@wangeditor/editor/dist/css/style.css'
import { uploadFile } from '@/api/file'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const editorRef = ref<HTMLElement>()
let editor: any = null

const initEditor = () => {
  if (!editorRef.value) return

  // 配置编辑器
  const editorConfig = {
    placeholder: props.placeholder || '请输入内容...',
    MENU_CONF: {
      // 配置上传图片
      uploadImage: {
        // 自定义上传
        customUpload: async (file: File, insertFn: Function) => {
          try {
            // 调用上传 API
            const url = await uploadFile(file)
            // 插入图片
            insertFn(url)
          } catch (error) {
            console.error('上传图片失败:', error)
          }
        }
      }
    }
  }

  // 创建编辑器
  editor = createEditor({
    selector: editorRef.value,
    config: editorConfig,
    mode: 'default'
  })

  // 设置初始内容
  if (props.modelValue) {
    editor.setHtml(props.modelValue)
  }

  // 监听内容变化
  editor.on('change', () => {
    const html = editor?.getHtml() || ''
    emit('update:modelValue', html)
  })
}

// 监听 modelValue 变化
watch(() => props.modelValue, (newValue) => {
  if (editor && newValue !== editor.getHtml()) {
    editor.setHtml(newValue)
  }
})

onMounted(() => {
  initEditor()
})

onUnmounted(() => {
  if (editor) {
    editor.destroy()
    editor = null
  }
})
</script>

<style scoped>
.wangeditor-container {
  width: 100%;
}
</style>
