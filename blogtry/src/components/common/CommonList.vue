<template>
    <div class="common-list">
      <el-card>
        <!-- 顶部工具栏 -->
       <div class="toolbar">
        <h2>{{ title }}</h2>
        <!-- 前工具栏 -->
        <div class="actions">
            <slot name="toolbar-before"></slot>
            <el-button type="primary" v-if="showCreate"  @click="$emit('create')">{{ createText }}</el-button>
            <!-- 后工具栏自定义 -->
            <slot name="toolbar-after"></slot>
            <el-button class="refresh-btn"  @click="$emit('refresh')"><el-icon>
                <Refresh />
            </el-icon>
        </el-button>
        </div>
       </div>
       <slot name="extra"></slot>
       <!-- 表格容器 -->
       <div class="table-wrapper">
                <!-- 加载状态 -->
                <div v-if="loading" class="common-list-loading">
                    <el-skeleton :rows="5" animated />
                </div>
                <!-- 表格 - 完全由外部控制 -->
                <el-table v-else-if="!virtual" :data="data" border style="width: 100%; height: 100%" v-bind="$attrs">
                    <slot />
                </el-table>
                <el-table-v2
                    v-else-if="virtual"
                    :columns="virtualColumns"
                    :data="virtualData"
                    :width="700"
                    :height="400"
                    fixed
                    :row-height="rowHeight"
                    :header-height="headerHeight"
                />
            </div>
       <div class="pagination" v-if="showPagination">
        
            <el-pagination
                :current-page="page"
                :page-sizes="[10, 20, 30, 40]"
                :page-size="pageSize"
                layout="total, sizes, prev, pager, next, jumper"
                :total="total"
                @current-change="$emit('update:page', $event)"
                @size-change="$emit('update:pageSize', $event)"
            />
        
       </div>
      </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import type { Column } from 'element-plus'
const props=withDefaults(defineProps<{
    title: string
    data: any[]
    loading?: boolean
    total?: number
    page?: number
    pageSize?: number
    showPagination?: boolean
    showCreate?: boolean
    createText?: string
    // 虚拟表格列配置
    virtualColumns?: Column[]
    // 虚拟表格是否启用
    virtual?: boolean
    // 虚拟表格数据
    virtualData?: any[]
     // 虚拟表格宽高 (支持数字或传入'auto'自动计算)
    virtualWidth?: number
    virtualHeight?: number
    // 行高/表头高 (虚拟表格)
    rowHeight?: number
    headerHeight?: number
}>(), {
    loading: false,
    total: 0,
    page: 1,
    pageSize: 10,
    showPagination: true,
    showCreate: true,
    createText: '新增',
    virtual: false,
    virtualColumns: () => [],
    virtualWidth: 700,
    virtualHeight: 400,
    rowHeight: 48,
    headerHeight: 48,
})

defineEmits<{
    create: []
    refresh: []
    'update:page': [page: number]
    'update:pageSize': [size: number]
}>()
// 自动计算虚拟表格宽高 (如果传入 'auto' 或未传入具体数字)
const tableWrapperRef = ref<HTMLElement>()
const autoWidth = ref(700)
const autoHeight = ref(400)
let resizeObserver: ResizeObserver | null = null

const updateVirtualSize = () => {
  if (!tableWrapperRef.value) return
  const rect = tableWrapperRef.value.getBoundingClientRect()
  // 减去一点边距保证不出现滚动条嵌套
  autoWidth.value = rect.width - 2
  autoHeight.value = rect.height - 2
}

// 最终传给 el-table-v2 的宽高
const finalVirtualWidth = computed(() => {
  if (props.virtualWidth && props.virtualWidth > 0) return props.virtualWidth
  return autoWidth.value
})
const finalVirtualHeight = computed(() => {
  if (props.virtualHeight && props.virtualHeight > 0) return props.virtualHeight
  return autoHeight.value
})

onMounted(() => {
  if (props.virtual && (!props.virtualWidth || !props.virtualHeight)) {
    updateVirtualSize()
    if (tableWrapperRef.value) {
      resizeObserver = new ResizeObserver(() => updateVirtualSize())
      resizeObserver.observe(tableWrapperRef.value)
    }
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

// 如果 tableType 或 data 变化, 且使用自动宽高, 重新计算一次
watch(
  () => [props.virtual, props.data],
  () => {
    if (props.virtual && (!props.virtualWidth || !props.virtualHeight)) {
      updateVirtualSize()
    }
  },
  { flush: 'post' }
)
</script>

<style scoped lang="scss">
.common-list {
    height: 100%;

    :deep(.el-card) {
        height: 100%;
        display: flex;
        flex-direction: column;

        .el-card__body {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
    }

    .toolbar {
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;

        h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 500;
        }

        .actions {
            display: flex;
            gap: 12px;

            :deep(.el-button + .el-button) {
                margin-left: 0;
            }
        }

        @media (max-width: 767px) {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;

            h2 {
                font-size: 18px;
            }

            .actions {
                width: 100%;
                flex-wrap: wrap;

                .refresh-btn {
                    display: none;
                }
            }
        }
    }

    .table-wrapper {
        flex: 1;
        overflow: auto;
        position: relative;
    min-height: 200px; // 保证虚拟表格有最小高度
        :deep(.el-table__header th .cell) {
            text-align: center;
        }
    }

    .pagination {
        display: flex;
        justify-content: flex-end;
        padding-top: 12px;

        @media (max-width: 767px) {
            justify-content: center;
        }
    }
}
</style>
