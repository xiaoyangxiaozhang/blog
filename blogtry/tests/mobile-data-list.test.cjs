const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { createSSRApp, h, Fragment, createCommentVNode } = require('vue')
const { renderToString } = require('@vue/server-renderer')
const { ElTableColumn, ID_INJECTION_KEY } = require('element-plus')

const source = fs.readFileSync(path.join(__dirname, '../src/components/common/MobileDataList.vue'), 'utf8')
const script = compileScript(parse(source).descriptor, { id: 'mobile-data-list-test' }).content
const code = ts.transpileModule(script, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exportsObject = {}
vm.runInNewContext(code, { exports: exportsObject, require })
const MobileDataList = exportsObject.default
const render = (data, columns, props = {}) => {
  const app = createSSRApp({ render: () => h(MobileDataList, { data, ...props }, { default: () => columns }) })
  app.provide(ID_INJECTION_KEY, { prefix: 1, current: 0 })
  return renderToString(app)
}

test('mobile records preserve formatted cells and the original action target', async () => {
  const row = { id: 7, name: '<长文件名>', size: 2048 }
  let actionTarget
  const html = await render([row], [
    h(ElTableColumn, { label: '文件名', prop: 'name' }),
    h(ElTableColumn, { label: '大小' }, { default: ({ row }) => h('span', `${row.size / 1024} KB`) }),
    h(ElTableColumn, { label: '操作' }, { default: ({ row }) => {
      actionTarget = row
      return h('button', '删除')
    } })
  ])
  assert.match(html, /&lt;长文件名&gt;/)
  assert.match(html, /2 KB/)
  assert.match(html, /<button>删除<\/button>/)
  assert.equal(actionTarget, row)
})

test('conditional columns and menu children retain their labels and values', async () => {
  const html = await render([{ id: 1, title: '主菜单', meta: { sort: 0 }, children: [
    { id: 2, title: '子菜单', meta: { sort: 1 } }
  ] }], [h(Fragment, null, [
    h(ElTableColumn, { label: '标题', prop: 'title' }),
    createCommentVNode('hidden column'),
    h(ElTableColumn, { label: '排序', prop: 'meta.sort' })
  ])], { childrenKey: 'children' })
  assert.equal((html.match(/role="listitem"/g) || []).length, 2)
  assert.match(html, /所属菜单：主菜单/)
  assert.match(html, />子菜单</)
  assert.match(html, /<dd[^>]*>0<\/dd>/)
  assert.doesNotMatch(html, /hidden column/)
})

test('empty mobile lists have a readable empty state', async () => {
  assert.match(await render([], []), /暂无数据/)
})
