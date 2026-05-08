import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as momentApi from '@/api/moment'
import type { Moment, CreateMomentRequest, UpdateMomentRequest } from '@/types/moment'

export const useMomentStore = defineStore('moment', () => {
  // 状态
  const momentList = ref<Moment[]>([])
  const total = ref(0)
  const loading = ref(false)
  const currentMoment = ref<Moment | null>(null)
  const page = ref(1)
  const pageSize = ref(10)
  const dialogVisible = ref(false)
 
  // 对话框标题
  const dialogTitle = computed(() => {
    return currentMoment.value ? '编辑动态' : '新增动态'
  })
  // Getters
  const getMomentById = computed(() => {
    return (id: number) => {
      return momentList.value.find(moment => moment.id === id)
    }
  })

  // Actions
  async function fetchMoments() {
    loading.value = true
    try {
      const res = await momentApi.getMoments({ page: page.value, page_size: pageSize.value })
      momentList.value = res.list
      total.value = res.total
    } catch (error) {
      console.error('获取动态列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function createMoment(data: CreateMomentRequest) {
    loading.value = true
    try {
      await momentApi.createMoment(data)
      await fetchMoments()
      return true
    } catch (error) {
      console.error('创建动态失败:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  async function updateMoment(id: number, data: UpdateMomentRequest) {
    loading.value = true
    try {
      await momentApi.updateMoment(id, data)
      await fetchMoments()
      return true
    } catch (error) {
      console.error('更新动态失败:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteMoment(id: number) {
    loading.value = true
    try {
      await momentApi.deleteMoment(id)
      await fetchMoments()
      return true
    } catch (error) {
      console.error('删除动态失败:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  function setCurrentMoment(moment: Moment | null) {
    currentMoment.value = moment
  }

  function setPage(newPage: number) {
    page.value = newPage
  }

  function setPageSize(newPageSize: number) {
    pageSize.value = newPageSize
  }

  function setDialogVisible(visible: boolean) {
    dialogVisible.value = visible
  }
 

  return {
    // 状态
    momentList,
    total,
    loading,
    currentMoment,
    page,
    pageSize,
    dialogVisible,
    // Getters
    getMomentById,
    dialogTitle,
    // Actions
    fetchMoments,
    createMoment,
    updateMoment,
    deleteMoment,
    setCurrentMoment,
    setPage,
    setPageSize,
    setDialogVisible
  }
})