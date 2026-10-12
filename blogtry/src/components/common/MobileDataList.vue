<script lang="ts">
import { defineComponent, Fragment, h, type PropType, type Slot, type VNode } from 'vue'
import { ElEmpty, ElTableColumn } from 'element-plus'

// Reuse the table's cells and handlers so mobile and desktop show the same data.
export default defineComponent({
  name: 'MobileDataList',
  props: {
    data: { type: Array as PropType<Record<string, any>[]>, required: true },
    childrenKey: { type: String, default: '' }
  },
  setup(props, { slots }) {
    const columnsFrom = (nodes: VNode[]): VNode[] => nodes.flatMap(node => {
      if (node.type === Fragment && Array.isArray(node.children)) {
        return columnsFrom(node.children as VNode[])
      }
      return node.type === ElTableColumn ? [node] : []
    })

    return () => {
      if (!props.data.length) return h(ElEmpty, { description: '暂无数据', imageSize: 72 })
      const columns = columnsFrom(slots.default?.() || [])
      const records: { row: Record<string, any>; parent?: Record<string, any> }[] = []
      const appendRows = (rows: Record<string, any>[], parent?: Record<string, any>) => {
        for (const row of rows) {
          records.push({ row, parent })
          if (props.childrenKey && Array.isArray(row[props.childrenKey])) {
            appendRows(row[props.childrenKey], row)
          }
        }
      }
      appendRows(props.data)

      return h('div', { class: 'mobile-data-list', role: 'list' }, records.map(({ row, parent }, index) =>
        h('div', { class: 'mobile-record', role: 'listitem', key: row.id ?? index }, [
          parent ? h('p', { class: 'mobile-parent' }, `所属菜单：${parent.title || parent.name || parent.id}`) : null,
          h('dl', {}, columns.map((column, columnIndex) => {
            const config = column.props || {}
            const cell = (column.children as { default?: Slot } | null)?.default
            const value = config.prop
              ? String(config.prop).split('.').reduce((value, key) => value?.[key], row)
              : undefined
            const actions = config.label === '操作'
            return h('div', {
              class: ['mobile-field', {
                'mobile-field--wide': columnIndex === 0 || Number(config['min-width'] ?? config.minWidth) >= 250 || actions,
                'mobile-field--actions': actions
              }],
              key: config.prop || config.label || columnIndex
            }, [
              h('dt', {}, config.label || ''),
              h('dd', {}, cell ? cell({ row, column: config, $index: index }) : String(value ?? '-'))
            ])
          }))
        ])
      ))
    }
  }
})
</script>

<style scoped lang="scss">
.mobile-record {
  padding: 18px 0;
  border-bottom: 1px solid var(--admin-border);
  &:first-child { padding-top: 4px; }
  &:last-child { border-bottom: 0; }
  dl { margin: 0; display: grid; gap: 10px; }
}
.mobile-parent {
  margin: 0 0 12px;
  color: var(--admin-text-muted);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.mobile-field {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  min-width: 0;
  dt { color: var(--admin-text-muted); font-size: 12px; line-height: 1.7; }
  dd { margin: 0; min-width: 0; color: var(--admin-text); font-size: 14px; line-height: 1.7; overflow-wrap: anywhere; }
  &--wide { grid-template-columns: minmax(0, 1fr); gap: 4px; }
  &--actions dd { display: flex; flex-wrap: wrap; gap: 8px; }
  :deep(.el-button) { min-height: 44px; min-width: 44px; margin: 0; padding: 8px 12px; }
  :deep(.el-switch) { min-height: 44px; }
  :deep(.el-link) { min-height: 44px; max-width: 100%; }
  :deep(.el-tag) { max-width: 100%; height: auto; white-space: normal; }
  :deep(.el-tag__content) { white-space: normal; overflow-wrap: anywhere; }
  :deep(.images), :deep(.images-content), :deep(.author-cell), :deep(.user-cell) { flex-wrap: wrap; }
  :deep(.moment-content), :deep(.comment-text) { -webkit-line-clamp: unset; max-height: none; overflow: visible; white-space: pre-wrap; }
  :deep(.el-image), :deep(.el-avatar) { flex-shrink: 0; }
  :deep([style*="text-overflow"]) { white-space: normal !important; overflow: visible !important; }
  :deep(a:focus-visible) { outline: 2px solid var(--admin-brand); outline-offset: 3px; }
}
</style>
