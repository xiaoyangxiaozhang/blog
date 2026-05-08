<template>
  <el-dialog v-model="visible" title="标签管理" width="800px" :align-center="true">
    <el-table :data="list" style="margin: 20px 0" max-height="350">
      <el-table-column prop="name" label="标签名称" />
      <el-table-column prop="description" label="描述" show-overflow-tooltip />
      <el-table-column prop="count" label="文章数" width="100" align="center" />
      <el-table-column label="操作" width="120" align="center">
        <template #header>
          <el-button type="primary" plain size="small" @click="openForm()">新增</el-button>
        </template>
        <template #default="{ row }">
          <el-button type="primary" link @click="openForm(row)">编辑</el-button>
          <el-button type="danger" link @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="formVisible" :title="current.id ? '编辑' : '新增'" width="400px" append-to-body>
      <el-form :model="current" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="current.name" placeholder="请输入标签名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="current.description" type="textarea" placeholder="请输入描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="save">确定</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { useArticleStore } from '@/stores/article'
import type { Tag } from '@/types/tag'

const props = defineProps<{ modelValue: boolean }>()

const emit = defineEmits(['update:modelValue'])

// 使用 article store
const articleStore = useArticleStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 计算属性
const list = computed(() => articleStore.tags)

const formVisible = ref(false)
const current = ref<Partial<Tag>>({ id: 0, name: '', description: '' })

// 加载标签列表
async function loadData() {
  const loading = ElLoading.service()
  try {
    await articleStore.fetchTags()
  } catch (err) {
    ElMessage.error('加载标签列表失败')
  } finally {
    loading.close()
  }
}

// 初始化加载数据
onMounted(() => {
  loadData()
})

// 打开表单
function openForm(row?: Tag) {
  if (row) {
    current.value = { ...row }
  } else {
    current.value = { id: 0, name: '', description: '' }
  }
  formVisible.value = true
}

async function remove(row: Tag) {
  try {
    await ElMessageBox.confirm('确定要删除这个标签吗？')
    await articleStore.deleteTagById(row.id)
    await loadData()
  } catch { }
}

async function save() {
  if (!current.value.name?.trim()) {
    return ElMessage.warning('请输入标签名称')
  }

  const loading = ElLoading.service()
  try {
    const tagData = {
      name: current.value.name.trim(),
      description: current.value.description || '',
      slug: current.value.slug || current.value.name.trim().toLowerCase().replace(/\s+/g, '-'),
      count: current.value.count || 0
    }
    
    if (current.value.id) {
      await articleStore.updateTagById(current.value.id, tagData)
    } else {
      await articleStore.addTag(tagData)
    }
    await loadData()
    formVisible.value = false
  } catch (err) {
    ElMessage.error('保存失败')
  } finally {
    loading.close()
  }
}
</script>
