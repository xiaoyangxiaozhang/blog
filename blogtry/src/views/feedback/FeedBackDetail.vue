<template>
  <div class="feedback-detail-page">
    <el-card v-loading="feedbackStore.loading">
      <template #header>
        <div class="card-header">
          <span class="title">反馈详情 #{{ feedbackStore.currentFeedback?.ticket_no }}</span>
          <el-button @click="handleBack">返回列表</el-button>
        </div>
      </template>

      <div v-if="feedbackStore.currentFeedback" class="feedback-detail">
        <!-- 基本信息 -->
        <el-descriptions title="基本信息" :column="2" border>
          <el-descriptions-item label="工单号">
            {{ feedbackStore.currentFeedback.ticket_no }}
          </el-descriptions-item>

          <el-descriptions-item label="举报URL">
            <a :href="feedbackStore.currentFeedback.report_url" target="_blank" class="url-link">
              {{ feedbackStore.currentFeedback.report_url }}
            </a>
          </el-descriptions-item>

          <el-descriptions-item label="举报类型">
            <el-tag :type="getReportTypeTagType(feedbackStore.currentFeedback.report_type)">
              {{ getReportTypeLabel(feedbackStore.currentFeedback.report_type) }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(feedbackStore.currentFeedback.status)">
              {{ getStatusLabel(feedbackStore.currentFeedback.status) }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="联系邮箱">
            {{ feedbackStore.currentFeedback.email || '未填写' }}
          </el-descriptions-item>

          <el-descriptions-item label="IP地址">
            {{ feedbackStore.currentFeedback.ip }}
          </el-descriptions-item>

          <el-descriptions-item label="反馈时间">
            {{ formatDate(feedbackStore.currentFeedback.feedback_time) }}
          </el-descriptions-item>

          <el-descriptions-item label="回复时间">
            {{ feedbackStore.currentFeedback.reply_time ? formatDate(feedbackStore.currentFeedback.reply_time) : '未回复' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 反馈内容 - 根据类型显示不同的字段 -->
        <div class="content-section">
          <h3 class="section-title">反馈详情</h3>
          <div class="content-box">
            <div v-if="feedbackStore.currentFeedback.form_content" class="form-content">
              <!-- 版权侵权内容投诉 -->
              <template v-if="feedbackStore.currentFeedback.report_type === 'copyright'">
                <div v-if="feedbackStore.currentFeedback.form_content.description" class="form-field">
                  <strong>侵权说明:</strong>
                  <div class="field-value">{{ feedbackStore.currentFeedback.form_content.description }}</div>
                </div>

                <div class="form-field">
                  <strong>权利人证明文件:</strong>
                  <div class="field-value">
                    <div v-if="getCopyrightProofFiles(feedbackStore.currentFeedback.form_content).length" class="attachment-list">
                      <div v-for="(file, index) in getCopyrightProofFiles(feedbackStore.currentFeedback.form_content)" :key="index"
                        class="attachment-item">
                        <el-link :href="file" target="_blank" type="primary">
                          <i class="el-icon-paperclip"></i>
                          {{ getFileName(file) }}
                        </el-link>
                      </div>
                    </div>
                    <span v-else class="empty-text">未上传</span>
                  </div>
                </div>

                <div class="form-field">
                  <strong>侵权内容证明:</strong>
                  <div class="field-value">
                    <div v-if="getCopyrightInfringementFiles(feedbackStore.currentFeedback.form_content).length" class="attachment-list">
                      <div v-for="(file, index) in getCopyrightInfringementFiles(feedbackStore.currentFeedback.form_content)" :key="index"
                        class="attachment-item">
                        <el-link :href="file" target="_blank" type="primary">
                          <i class="el-icon-paperclip"></i>
                          {{ getFileName(file) }}
                        </el-link>
                      </div>
                    </div>
                    <span v-else class="empty-text">未上传</span>
                  </div>
                </div>
              </template>

              <!-- 不当内容举报投诉 -->
              <template v-else-if="feedbackStore.currentFeedback.report_type === 'inappropriate'">
                <div v-if="feedbackStore.currentFeedback.form_content.reason" class="form-field">
                  <strong>投诉原因:</strong>
                  <div class="field-value">{{ feedbackStore.currentFeedback.form_content.reason }}</div>
                </div>

                <div v-if="feedbackStore.currentFeedback.form_content.description" class="form-field">
                  <strong>投诉内容:</strong>
                  <div class="field-value">{{ feedbackStore.currentFeedback.form_content.description }}</div>
                </div>

                <div class="form-field">
                  <strong>证据截图:</strong>
                  <div class="field-value">
                    <div v-if="feedbackStore.currentFeedback.form_content.attachmentFiles?.length" class="attachment-list">
                      <div v-for="(file, index) in feedbackStore.currentFeedback.form_content.attachmentFiles" :key="index"
                        class="attachment-item">
                        <el-link :href="file" target="_blank" type="primary">
                          <i class="el-icon-paperclip"></i>
                          {{ getFileName(file) }}
                        </el-link>
                      </div>
                    </div>
                    <span v-else class="empty-text">未上传</span>
                  </div>
                </div>
              </template>

              <!-- 文章摘要问题反馈 -->
              <template v-else-if="feedbackStore.currentFeedback.report_type === 'summary'">
                <div v-if="feedbackStore.currentFeedback.form_content.reason" class="form-field">
                  <strong>问题类型:</strong>
                  <div class="field-value">{{ feedbackStore.currentFeedback.form_content.reason }}</div>
                </div>

                <div v-if="feedbackStore.currentFeedback.form_content.description" class="form-field">
                  <strong>反馈内容:</strong>
                  <div class="field-value">{{ feedbackStore.currentFeedback.form_content.description }}</div>
                </div>

                <div class="form-field">
                  <strong>相关截图:</strong>
                  <div class="field-value">
                    <div v-if="feedbackStore.currentFeedback.form_content.attachmentFiles?.length" class="attachment-list">
                      <div v-for="(file, index) in feedbackStore.currentFeedback.form_content.attachmentFiles" :key="index"
                        class="attachment-item">
                        <el-link :href="file" target="_blank" type="primary">
                          <i class="el-icon-paperclip"></i>
                          {{ getFileName(file) }}
                        </el-link>
                      </div>
                    </div>
                    <span v-else class="empty-text">未上传</span>
                  </div>
                </div>
              </template>

              <!-- 功能建议优化反馈 -->
              <template v-else-if="feedbackStore.currentFeedback.report_type === 'suggestion'">
                <div v-if="feedbackStore.currentFeedback.form_content.description" class="form-field">
                  <strong>功能描述:</strong>
                  <div class="field-value">{{ feedbackStore.currentFeedback.form_content.description }}</div>
                </div>

                <div v-if="feedbackStore.currentFeedback.form_content.reason" class="form-field">
                  <strong>使用场景:</strong>
                  <div class="field-value">{{ feedbackStore.currentFeedback.form_content.reason }}</div>
                </div>

                <div class="form-field">
                  <strong>相关附件:</strong>
                  <div class="field-value">
                    <div v-if="feedbackStore.currentFeedback.form_content.attachmentFiles?.length" class="attachment-list">
                      <div v-for="(file, index) in feedbackStore.currentFeedback.form_content.attachmentFiles" :key="index"
                        class="attachment-item">
                        <el-link :href="file" target="_blank" type="primary">
                          <i class="el-icon-paperclip"></i>
                          {{ getFileName(file) }}
                        </el-link>
                      </div>
                    </div>
                    <span v-else class="empty-text">未上传</span>
                  </div>
                </div>
              </template>

              <!-- 未知类型的通用显示 -->
              <template v-else>
                <div v-if="feedbackStore.currentFeedback.form_content.description" class="form-field">
                  <strong>详细描述:</strong>
                  <div class="field-value">{{ feedbackStore.currentFeedback.form_content.description }}</div>
                </div>

                <div v-if="feedbackStore.currentFeedback.form_content.reason" class="form-field">
                  <strong>原因/类型:</strong>
                  <div class="field-value">{{ feedbackStore.currentFeedback.form_content.reason }}</div>
                </div>

                <div v-if="feedbackStore.currentFeedback.form_content.attachmentFiles?.length" class="form-field">
                  <strong>附件文件:</strong>
                  <div class="field-value">
                    <div class="attachment-list">
                      <div v-for="(file, index) in feedbackStore.currentFeedback.form_content.attachmentFiles" :key="index"
                        class="attachment-item">
                        <el-link :href="file" target="_blank" type="primary">
                          <i class="el-icon-paperclip"></i>
                          {{ getFileName(file) }}
                        </el-link>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
            <div v-else class="empty-content">
              暂无详细内容
            </div>
          </div>
        </div>

        <!-- 管理员回复 -->
        <div class="content-section">
          <h3 class="section-title">管理员回复</h3>
          <div class="content-box" v-if="feedbackStore.currentFeedback.admin_reply">
            <pre>{{ feedbackStore.currentFeedback.admin_reply }}</pre>
          </div>
          <el-empty v-else description="暂无回复" :image-size="80" />
        </div>

        <!-- 处理表单 -->
        <el-divider />

        <div class="process-section">
          <h3 class="section-title">处理反馈</h3>
          <el-form :model="form" label-width="100px" @submit.prevent="handleSubmit">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio-button value="resolved">已解决</el-radio-button>
                <el-radio-button value="closed">已关闭</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="管理员回复">
              <el-input v-model="form.admin_reply" type="textarea" :rows="8" placeholder="请输入回复内容..." />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="handleSubmit" :loading="submitting">
                保存
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 技术信息 -->
        <el-divider />
        <div class="content-section">
          <h3 class="section-title">技术信息</h3>
          <div class="content-box tech-info">
            <div><strong>User Agent:</strong></div>
            <div>{{ feedbackStore.currentFeedback.user_agent }}</div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useFeedbackStore } from '@/stores/feedback'
import type { Feedback, FeedbackStatus, ReportType } from '@/types/feedback'
import { formatDate } from '@/utils/date'

const route = useRoute()
const router = useRouter()
const feedbackStore = useFeedbackStore()
const submitting = ref(false)
const feedbackId = ref(Number(route.params.id))
const form = ref<{
  status: FeedbackStatus
  admin_reply: string
}>({
  status: 'resolved',
  admin_reply: ''
})

/**
 * 获取反馈详情
 */
const fetchDetail = async () => {
  const result = await feedbackStore.fetchFeedbackDetail(feedbackId.value)
  if (!result) {
    handleBack()
  }
}

/**
 * 提交更新
 */
const handleSubmit = async () => {
  submitting.value = true
  try {
    const success = await feedbackStore.handleUpdateFeedback(feedbackId.value, form.value)
    if (success) {
      // 清空表单
      form.value.status = 'resolved'
      form.value.admin_reply = ''
      // 刷新详情
      await fetchDetail()
    }
  } catch (error) {
    ElMessage.error('更新失败')
  } finally {
    submitting.value = false
  }
}

const handleBack = () => {
  router.push('/feedback')
}

const getReportTypeLabel = (reportType: ReportType) => {
  const labels: Record<string, string> = {
    'copyright': '版权侵权内容投诉',
    'inappropriate': '不当内容举报投诉',
    'summary': '文章摘要问题反馈',
    'suggestion': '功能建议优化反馈'
  }
  return labels[reportType] || reportType
}

const getReportTypeTagType = (reportType: ReportType) => {
  const types: Record<string, any> = {
    'copyright': 'warning',
    'inappropriate': 'danger',
    'summary': 'info',
    'suggestion': 'success'
  }
  return types[reportType] || 'info'
}

const getStatusLabel = (status: FeedbackStatus) => {
  const labels: Record<FeedbackStatus, string> = {
    pending: '待处理',
    resolved: '已解决',
    closed: '已关闭'
  }
  return labels[status] || status
}

const getStatusTagType = (status: FeedbackStatus) => {
  const types: Record<FeedbackStatus, any> = {
    pending: 'warning',
    resolved: 'success',
    closed: 'info'
  }
  return types[status] || 'info'
}

/**
 * 从URL中提取文件名
 */
const getFileName = (url: string) => {
  if (!url) return '未命名文件'
  try {
    const parts = url.split('/')
    const fileName = parts[parts.length - 1]
    return fileName ? decodeURIComponent(fileName) : '未命名文件'
  } catch {
    return url
  }
}

/**
 * 获取版权侵权的权利人证明文件
 */
const getCopyrightProofFiles = (content: any) => {
  if (!content.attachmentFiles?.length) return []

  try {
    const meta = JSON.parse(content.reason || '{}')
    const proofCount = meta.proofCount || 0
    return content.attachmentFiles.slice(0, proofCount)
  } catch {
    // 如果解析失败，默认前一半是权利人证明
    const half = Math.ceil(content.attachmentFiles.length / 2)
    return content.attachmentFiles.slice(0, half)
  }
}

/**
 * 获取版权侵权的侵权内容证明文件
 */
const getCopyrightInfringementFiles = (content: any) => {
  if (!content.attachmentFiles?.length) return []

  try {
    const meta = JSON.parse(content.reason || '{}')
    const proofCount = meta.proofCount || 0
    return content.attachmentFiles.slice(proofCount)
  } catch {
    // 如果解析失败，默认后一半是侵权证据
    const half = Math.ceil(content.attachmentFiles.length / 2)
    return content.attachmentFiles.slice(half)
  }
}

onMounted(() => {
  fetchDetail()
})
</script>

<style scoped lang="scss">
.feedback-detail-page {

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title {
      font-size: 18px;
      font-weight: 600;
      color: var(--admin-text);
    }
  }

  .feedback-detail {
    .content-section {
      margin-top: 24px;

      .section-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--admin-text);
        margin-bottom: 12px;
      }

      .content-box {
        padding: 16px;
        background-color: var(--admin-surface-soft);
        border-radius: var(--admin-radius-control);
        border: 1px solid var(--admin-border);

        pre {
          margin: 0;
          font-family: inherit;
          white-space: pre-wrap;
          word-wrap: break-word;
          line-height: 1.6;
          color: var(--admin-text-secondary);
        }

        .form-content {
          .form-field {
            margin-bottom: 16px;

            &:last-child {
              margin-bottom: 0;
            }

            strong {
              color: var(--admin-text);
              display: block;
              margin-bottom: 8px;
              font-size: 14px;
            }

            .field-value {
              color: var(--admin-text-secondary);
              line-height: 1.6;

              .empty-text {
                color: var(--admin-text-muted);
                font-style: italic;
              }

              .attachment-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
              }

              .attachment-item {
                .el-link {
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                }
              }
            }
          }
        }

        .empty-content {
          color: var(--admin-text-muted);
          text-align: center;
          font-style: italic;
        }
      }
    }

    .url-link {
      color: var(--admin-brand);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    .tech-info {
      .field-value {
        margin-top: 8px;
        font-family: monospace;
        font-size: 12px;
        color: var(--admin-text-secondary);
        word-break: break-all;
      }
    }

    .process-section {
      margin-top: 24px;

      .section-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--admin-text);
        margin-bottom: 16px;
      }
    }
  }
}
</style>
