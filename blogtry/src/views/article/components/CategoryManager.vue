<template>
  <el-dialog v-model="visible" title="分类管理" width="800px" :align-center="true">
    <el-table :data="list" style="margin: 20px 0" max-height="350">
      <el-table-column prop="name" label="分类名称" />
      <el-table-column prop="description" label="描述" show-overflow-tooltip />
      <el-table-column prop="count" label="文章数" width="100" align="center" />
      <el-table-column prop="sort" label="排序" width="100" align="center" />
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
          <el-input v-model="current.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="current.description" type="textarea" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="current.sort" :min="0" />
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
import type { Category } from '@/types/category'
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue'])

// 使用 article store
const articleStore = useArticleStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 计算属性
const list = computed(() => articleStore.categories)

const formVisible = ref(false)
const current = ref<Partial<Category>>({ id: 0, name: '', description: '', sort: 0 })

// 初始化加载数据
onMounted(() => {
  loadData()
})

// 加载分类列表
async function loadData() {
  const loading = ElLoading.service()
  try {
    await articleStore.fetchCategories()
  } catch (err) {
    ElMessage.error('加载分类列表失败')
  } finally {
    loading.close()
  }
}

// 打开表单
function openForm(row?: Category) {
  if (row) {
    current.value = { ...row }
  } else {
    current.value = { id: 0, name: '', description: '', sort: 0 }
  }
  formVisible.value = true
}

async function remove(row: Category) {
  try {
    await ElMessageBox.confirm('确定要删除这个分类吗？')
    await articleStore.deleteCategoryById(row.id)
    await loadData()
  } catch { }
}

async function save() {
  if (!current.value.name?.trim()) {
    return ElMessage.warning('请输入分类名称')
  }

  const loading = ElLoading.service()
  try {
    const categoryData = {
      name: current.value.name.trim(),
      description: current.value.description || '',
      sort: current.value.sort || 0,
      slug: current.value.slug || current.value.name.trim().toLowerCase().replace(/\s+/g, '-'),
      count: current.value.count || 0
    }
    
    if (current.value.id) {
      await articleStore.updateCategoryById(current.value.id, categoryData)
    } else {
      await articleStore.addCategory(categoryData)
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
