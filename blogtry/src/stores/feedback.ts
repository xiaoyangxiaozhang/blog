import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Feedback, FeedbackStatus } from "@/types/feedback";
import type { PaginationQuery } from "@/types/request";
import { getFeedbackList, getFeedbackDetail, updateFeedback, deleteFeedback } from "@/api/feedback";
import { ElMessage } from "element-plus";

export const useFeedbackStore = defineStore('feedback', () => {
  // 状态
  const loading = ref(false)
  const feedbacks = ref<Feedback[]>([])
  const total = ref(0)
  const queryParams = ref<PaginationQuery>({ page: 1, page_size: 20 })
  const currentFeedback = ref<Feedback | null>(null)
  const dialogVisible = ref(false)
  const dialogTitle = computed(() => {
    return currentFeedback.value ? '编辑反馈' : '创建反馈'
  })

  // 方法
  const fetchFeedbacks = async () => {
    loading.value = true
    try {
      const result = await getFeedbackList(queryParams.value)
      feedbacks.value = result.list || []
      total.value = result.total
    } catch (error) {
      ElMessage.error('获取反馈列表失败')
    } finally {
      loading.value = false
    }
  }

  const handleUpdateFeedback = async (id: number, data: { status: FeedbackStatus; admin_reply: string }) => {
    try {
      await updateFeedback(id, data)
      ElMessage.success('更新反馈成功')
      await fetchFeedbacks()
      return true
    } catch (error) {
      ElMessage.error('更新反馈失败')
      return false
    }
  }

  const handleDeleteFeedback = async (id: number) => {
    try {
      await deleteFeedback(id)
      ElMessage.success('删除反馈成功')
      await fetchFeedbacks()
      return true
    } catch (error) {
      ElMessage.error('删除反馈失败')
      return false
    }
  }

  const getFeedbackById = (id: number) => {
    return feedbacks.value.find(f => f.id === id)
  }

  const fetchFeedbackDetail = async (id: number) => {
    loading.value = true
    try {
      const result = await getFeedbackDetail(id)
      currentFeedback.value = result
      return result
    } catch (error) {
      ElMessage.error('获取反馈详情失败')
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    // 状态
    loading,
    feedbacks,
    total,
    queryParams,
    currentFeedback,
    dialogVisible,
    dialogTitle,
    // 方法
    fetchFeedbacks,
    fetchFeedbackDetail,
    handleUpdateFeedback,
    handleDeleteFeedback,
    getFeedbackById
  }
})