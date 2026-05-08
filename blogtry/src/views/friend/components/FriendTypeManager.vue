<template>
  <el-dialog v-model="visible" title="友链类型管理" width="550px" :align-center="true">
    <el-table :data="list" style="margin: 20px 0" max-height="350">
      <el-table-column prop="name" label="类型名称" min-width="60" />
      <el-table-column prop="sort" label="排序" width="60" align="center" />
      <el-table-column prop="is_visible" label="展示" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.is_visible ? 'success' : 'info'" size="small">
            {{ row.is_visible ? '展示' : '隐藏' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="count" label="友链数" width="100" align="center" />
      <el-table-column label="操作" width="150" align="center">
        <template #header>
          <el-button type="primary" plain size="small" @click="openForm()">新增</el-button>
        </template>
        <template #default="{ row }">
          <el-button type="primary" link @click="openForm(row)">编辑</el-button>
          <el-button type="danger" link @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="formVisible" :title="current.id ? '编辑类型' : '新增类型'" width="450px" append-to-body>
      <el-form :model="current" label-width="80px">
        <el-form-item label="类型名称" required>
          <el-input v-model="current.name" placeholder="请输入类型名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="排序">
              <el-input-number v-model="current.sort" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="展示">
              <el-switch v-model="current.is_visible" active-text="展示" inactive-text="隐藏" />
            </el-form-item>
          </el-col>
        </el-row>
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
import { getFriendTypes, createFriendType, updateFriendType, deleteFriendType } from '@/api/friend'
import type { FriendType } from '@/types/friend'
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'success'])

// 暴露方法给父组件调用
defineExpose({
  refreshData: loadData
})

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const list = ref<FriendType[]>([])

const formVisible = ref(false)
const current = ref<Partial<FriendType>>({
  id: 0,
  name: '',
  sort: 5,
  is_visible: true,
  count: 0
})

// 初始化加载数据
onMounted(() => {
  loadData()
})

// 加载友链类型列表
async function loadData() {
  const loading = ElLoading.service()
  try {
    const res = await getFriendTypes()
    list.value = res.list
  } catch (err) {
    ElMessage.error('加载友链类型列表失败')
  } finally {
    loading.close()
  }
}

// 打开表单
function openForm(row?: FriendType) {
  if (row) {
    current.value = { ...row }
  } else {
    current.value = {
      id: 0,
      name: '',
      sort: 5,
      is_visible: true,
      count: 0
    }
  }
  formVisible.value = true
}

// 删除友链类型
async function remove(row: FriendType) {
  try {
    await ElMessageBox.confirm(
      '删除类型后，关联的友链type_id会被设置为NULL。确定要删除这个类型吗？',
      '提示',
      { type: 'warning' }
    )
    await deleteFriendType(row.id)
    await loadData()
    emit('success') // 通知父组件刷新
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

// 保存友链类型
async function save() {
  if (!current.value.name?.trim()) {
    return ElMessage.warning('请输入类型名称')
  }

  const loading = ElLoading.service()
  try {
    if (current.value.id) {
      // 编辑类型
      await updateFriendType(current.value.id, {
        name: current.value.name,
        sort: current.value.sort,
        is_visible: current.value.is_visible
      })
    } else {
      // 新增类型
      await createFriendType({
        name: current.value.name,
        sort: current.value.sort,
        is_visible: current.value.is_visible
      })
    }
    await loadData()
    formVisible.value = false
    emit('success') // 通知父组件刷新
    ElMessage.success('保存成功')
  } catch (err) {
    ElMessage.error('保存失败')
  } finally {
    loading.close()
  }
}
</script>
