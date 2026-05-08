import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Category } from '@/types/category'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/api/category'
import { ElMessage } from 'element-plus'

export const useCategoryStore = defineStore('category', () => {
  // 状态
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdated = ref<number>(0)

  // Getters
  const categoryOptions = computed(() => {
    return categories.value.map(category => ({
      label: category.name,
      value: category.id
    }))
  })

  // 方法
  const fetchCategories = async () => {
    loading.value = true
    error.value = null
    try {
      const result = await getCategories()
      categories.value = result.list
      lastUpdated.value = Date.now()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取分类列表失败'
      ElMessage.error(error.value)
    } finally {
      loading.value = false
    }
  }

  const addCategory = async (category: Omit<Category, 'id'>) => {
    loading.value = true
    error.value = null
    try {
      const newCategory = await createCategory(category)
      categories.value.push(newCategory)
      lastUpdated.value = Date.now()
      ElMessage.success('创建分类成功')
      return newCategory
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建分类失败'
      ElMessage.error(error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateCategoryById = async (id: number, category: Partial<Category>) => {
    loading.value = true
    error.value = null
    try {
      const updatedCategory = await updateCategory(id, category)
      const index = categories.value.findIndex(c => c.id === id)
      if (index !== -1) {
        categories.value[index] = updatedCategory
        lastUpdated.value = Date.now()
      }
      ElMessage.success('更新分类成功')
      return updatedCategory
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新分类失败'
      ElMessage.error(error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteCategoryById = async (id: number) => {
    loading.value = true
    error.value = null
    try {
      await deleteCategory(id)
      categories.value = categories.value.filter(c => c.id !== id)
      lastUpdated.value = Date.now()
      ElMessage.success('删除分类成功')
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除分类失败'
      ElMessage.error(error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getCategoryById = (id: number) => {
    return categories.value.find(c => c.id === id)
  }

  return {
    // 状态
    categories,
    loading,
    error,
    lastUpdated,
    // Getters
    categoryOptions,
    // 方法
    fetchCategories,
    addCategory,
    updateCategoryById,
    deleteCategoryById,
    getCategoryById
  }
})