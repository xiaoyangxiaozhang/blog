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
.mobile-data-list { display: grid; gap: 10px; }
.mobile-record {
  min-width: 0;
  padding: 14px 16px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--admin-text) 3%, transparent);
  dl { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 215px), 1fr)); gap: 6px 16px; }
}
.mobile-parent {
  margin: 0 0 8px;
  color: var(--admin-text-muted);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.mobile-field {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  min-width: 0;
  dt { color: var(--admin-text-muted); font-size: 12px; line-height: 1.7; }
  dd { margin: 0; min-width: 0; color: var(--admin-text); font-size: 14px; line-height: 1.7; overflow-wrap: anywhere; }
  &:has(dd:empty) { display: none; }
  &--wide { grid-column: 1 / -1; }
  &--actions { display: block; }
  &--actions dt { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  &--actions dd { display: flex; flex-wrap: wrap; gap: 4px 8px; }
  :deep(.el-button) { min-height: 44px; min-width: 44px; margin: 0; padding: 8px 12px; }
  :deep(.el-switch) { min-height: 44px; }
  :deep(.el-link) { min-height: 44px; max-width: 100%; }
  :deep(.el-tag) { max-width: 100%; height: auto; white-space: normal; background: color-mix(in srgb, currentColor 12%, transparent); border-color: transparent; }
  :deep(.el-tag__content) { white-space: normal; overflow-wrap: anywhere; }
  :deep(.images), :deep(.images-content), :deep(.author-cell), :deep(.user-cell) { flex-wrap: wrap; }
  :deep(.moment-content), :deep(.comment-text) { -webkit-line-clamp: unset; max-height: none; overflow: visible; white-space: pre-wrap; }
  :deep(.el-image), :deep(.el-avatar) { flex-shrink: 0; }
  :deep([style*="text-overflow"]) { white-space: normal !important; overflow: visible !important; }
  :deep(a:focus-visible) { outline: 2px solid var(--admin-brand); outline-offset: 3px; }
}
:global(:root[data-admin-theme='light']) .mobile-record :deep(.el-tag--primary) { color: color-mix(in srgb, var(--el-color-primary) 65%, #000); }
:global(:root[data-admin-theme='light']) .mobile-record :deep(.el-tag--success) { color: color-mix(in srgb, var(--el-color-success) 65%, #000); }
:global(:root[data-admin-theme='light']) .mobile-record :deep(.el-tag--warning) { color: color-mix(in srgb, var(--el-color-warning) 65%, #000); }
:global(:root[data-admin-theme='light']) .mobile-record :deep(.el-tag--danger) { color: color-mix(in srgb, var(--el-color-danger) 65%, #000); }
:global(:root[data-admin-theme='light']) .mobile-record :deep(.el-tag--info) { color: color-mix(in srgb, var(--el-color-info) 65%, #000); }
</style>
