import { defineStore } from 'pinia'
import { ref,computed } from 'vue'
import type { Friend, FriendListData } from '@/types/friend'
import type { PaginationQuery } from '@/types/request'
import type { CreateFriendRequest, UpdateFriendRequest } from '@/types/friend'
import { getFriends, deleteFriend, getFriendDetail, createFriend, updateFriend } from '@/api/friend'
import { ElMessage } from 'element-plus'

export const useFriendStore = defineStore('friend', () => {
  const loading = ref(false)
  const friendList = ref<Friend[]>([])
  const total = ref(0)
  const queryParams = ref<PaginationQuery>({ page: 1, page_size: 20 })
  const currentFriend = ref<Friend>()
  const dialogVisible = ref(false)
  const dialogTitle = computed(() =>{
    return currentFriend.value ? '编辑友链' : '创建友链'
  })
  const fetchFriends = async () => {
    loading.value = true
    try {
      const [result] = await Promise.all([
        getFriends(queryParams.value),
        new Promise(resolve => setTimeout(resolve, 300))
      ])
      friendList.value = result.list || []
      total.value = result.total
    } catch {
      ElMessage.error('获取友链列表失败')
    } finally {
      loading.value = false
    }
  }
  
  const handleDelete = async (id: number) => {
    try {
      await deleteFriend(id)
      ElMessage.success('删除成功')
      await fetchFriends()
    } catch (error) {
      if (error instanceof Error) ElMessage.error(error.message)
    }
  }
  
  const handleCreateFriend = async (data: CreateFriendRequest) => {
    try {
      await createFriend(data)
      ElMessage.success('创建友链成功')
      await fetchFriends()
      return true
    } catch (error) {
      if (error instanceof Error) ElMessage.error(error.message)
      return false
    }
  }
  
  const handleUpdateFriend = async (id: number, data: UpdateFriendRequest) => {
    try {
      await updateFriend(id, data)
      ElMessage.success('更新友链成功')
      await fetchFriends()
      return true
    } catch (error) {
      if (error instanceof Error) ElMessage.error(error.message)
      return false
    }
  }
  
  return {
    loading,
    friendList,
    total,
    queryParams,
    fetchFriends,
    handleDelete,
    handleCreateFriend,
    handleUpdateFriend,
    currentFriend,
    dialogVisible,
    dialogTitle,
  }
})
