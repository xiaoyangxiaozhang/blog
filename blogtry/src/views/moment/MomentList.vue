<template>
  <div class="moment-list-page">
    <common-list title="动态列表" 
    :data="momentStore.momentList" 
    :loading="momentStore.loading" 
    :total="momentStore.total" 
    v-model:page="momentStore.page" 
    v-model:pageSize="momentStore.pageSize" 
     createText="新增动态"
     @create="handleCreate"
      @refresh="momentStore.fetchMoments"
    @update:page="momentStore.fetchMoments"
     @update:pageSize="momentStore.fetchMoments">
    
      
   
    <el-table-column label="内容" min-width="400">
      <template #default="{ row }">
        <div class="moment-content">
          <!-- 文本内容 -->
          <div v-if="row.content.text" class="text-content">
            {{ row.content.text }}
          </div>

          <!-- 图片 -->
          <div v-if="row.content.images?.length" class="images-content">
            <el-image v-for="(image, index) in row.content.images.slice(0, 3)" :key="index" :src="image" fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px; margin-right: 8px" />
            <span v-if="row.content.images.length > 3" class="more-images">
              +{{ row.content.images.length - 3 }}
            </span>
          </div>

          <!-- 所有标签（标签、视频、音乐、链接、位置） -->
          <div
            v-if="row.content.tags || row.content.video || row.content.music || row.content.link || row.content.location"
            class="tags-container">
            <!-- 标签 -->
            <el-tag v-if="row.content.tags" size="small" type="info">
              {{ row.content.tags }}
            </el-tag>

            <!-- 视频 -->
           <el-tag v-if="row.content.video" type="primary" size="small">
              <i class="ri-video-line"></i>
              {{ getVideoPlatformName(row.content.video.platform) }}
            </el-tag>

            <!-- 音乐 -->
            <el-tag v-if="row.content.music" type="success" size="small">
              <i class="ri-music-line"></i>
              {{ getMusicLabel(row.content.music) }}
            </el-tag>

            <!-- 链接 -->
            <el-tag v-if="row.content.link" size="small" type="warning">
              <i class="ri-link"></i>
              {{ row.content.link.title || row.content.link.url }}
            </el-tag>

            <!-- 位置 -->
            <el-tag v-if="row.content.location" type="danger" size="small">
              <i class="ri-map-pin-line"></i>
              {{ row.content.location }}
            </el-tag>
          </div>
        </div>
      </template>
    </el-table-column>
    <el-table-column label="状态" width="100" align="center">
      <template #default="{ row }">
        <el-tag :type="row.is_publish ? 'success' : 'warning'" size="small">
          {{ row.is_publish ? '已发布' : '草稿' }}
        </el-tag>
      </template>
    </el-table-column>

    <el-table-column label="发布时间" width="180" align="center">
      <template #default="{ row }">
        <div v-if="row.publish_time">
          {{ formatDateTime(row.publish_time) }}
        </div>
        <span v-else style="color: #999">-</span>
      </template>
    </el-table-column>

    <el-table-column label="操作" width="180" align="center" fixed="right">
      <template #default="{ row }">
        <el-button type="primary" link size="small" @click="handleEdit(row.id)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row.id)">删除</el-button>
      </template>
    </el-table-column>
    
    </common-list>

      <moment-form-dialog  v-model="momentStore.dialogVisible" :edit-moment="momentStore.currentMoment" />
  
  </div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue'
import CommonList from '@/components/common/CommonList.vue'
import { useMomentStore } from '@/stores/moment'
import { formatDateTime } from '@/utils/date'
import MomentFormDialog from '@/views/moment/components/MomentFormDialog.vue'

// 音乐平台和类型映射
const MUSIC_LABELS = {
  type: { search: '搜索', song: '单曲', album: '专辑', artist: '艺术家', playlist: '歌单' },
  server: { netease: '网易云', tencent: 'QQ音乐', kugou: '酷狗', xiami: '虾米', baidu: '百度', kuwo: '酷我' }
}
// 使用 Pinia store
const momentStore = useMomentStore()
// 获取视频平台名称
const getVideoPlatformName = (platform?: string) => {
  if (!platform) return '本地视频'
  const platformMap: Record<string, string> = {
    'bilibili': '哔哩哔哩',
    'youtube': 'YouTube'
  }
 
  return platformMap[platform.toLowerCase()] || '本地视频'
}
 const getMusicLabel = (music: any) => {
  const serverName = MUSIC_LABELS.server[music.server as keyof typeof MUSIC_LABELS.server] || music.server
  const typeName = MUSIC_LABELS.type[music.type as keyof typeof MUSIC_LABELS.type] || music.type
  return `${serverName} - ${typeName}`
}
const handleCreate = () => {
  momentStore.setCurrentMoment(null)
  momentStore.setDialogVisible(true)
}

const handleEdit = (id: number) => {
  const moment = momentStore.getMomentById(id)
  if (!moment) return
  momentStore.setCurrentMoment(moment)
  momentStore.setDialogVisible(true)
}

const handleDelete = async (id: number) => {
  await momentStore.deleteMoment(id)
}

onMounted(() => {
  momentStore.fetchMoments()
})
</script>
<style scoped lang="scss">
.moment-content {
  .text-content {
    margin-bottom: 8px;
    line-height: 1.5;
    color: var(--admin-text-secondary);
  }

  .images-content {
    display: flex;
    align-items: center;
    margin-bottom: 8px;

    .more-images {
      color: var(--admin-text-muted);
      font-size: 12px;
    }
  }

  .tags-container {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
  }
}
</style>
