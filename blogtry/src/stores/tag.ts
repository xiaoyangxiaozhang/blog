import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Tag } from '@/types/tag'
import { getTags, createTag, updateTag, deleteTag } from '@/api/tag'
import { ElMessage } from 'element-plus'

export const useTagStore = defineStore('tag', () => {
  // 状态
  const tags = ref<Tag[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdated = ref<number>(0)

  // Getters
  const tagOptions = computed(() => {
    return tags.value.map(tag => ({
      label: tag.name,
      value: tag.id
    }))
  })

  // 方法
  const fetchTags = async () => {
    loading.value = true
    error.value = null
    try {
      const result = await getTags()
      tags.value = result.list
      lastUpdated.value = Date.now()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取标签列表失败'
      ElMessage.error(error.value)
    } finally {
      loading.value = false
    }
  }

  const addTag = async (tag: Omit<Tag, 'id'>) => {
    loading.value = true
    error.value = null
    try {
      const newTag = await createTag(tag)
      tags.value.push(newTag)
      lastUpdated.value = Date.now()
      ElMessage.success('创建标签成功')
      return newTag
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建标签失败'
      ElMessage.error(error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateTagById = async (id: number, tag: Partial<Tag>) => {
    loading.value = true
    error.value = null
    try {
      const updatedTag = await updateTag(id, tag)
      const index = tags.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tags.value[index] = updatedTag
        lastUpdated.value = Date.now()
      }
      ElMessage.success('更新标签成功')
      return updatedTag
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新标签失败'
      ElMessage.error(error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteTagById = async (id: number) => {
    loading.value = true
    error.value = null
    try {
      await deleteTag(id)
      tags.value = tags.value.filter(t => t.id !== id)
      lastUpdated.value = Date.now()
      ElMessage.success('删除标签成功')
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除标签失败'
      ElMessage.error(error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getTagById = (id: number) => {
    return tags.value.find(t => t.id === id)
  }

  return {
    // 状态
    tags,
    loading,
    error,
    lastUpdated,
    // Getters
    tagOptions,
    // 方法
    fetchTags,
    addTag,
    updateTagById,
    deleteTagById,
    getTagById
  }
})