const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '../src/utils/recruitmentOverview.ts'), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exportsForTest = {}
vm.runInNewContext(code, { exports: exportsForTest, Date, Set, Map })
const { findDeadline, buildOverview } = exportsForTest
const item = (category, highlights, subject = '测试招聘通知') => ({
  uid: 1, category, highlights, subject, from: '示例公司招聘 <test@example.com>',
  received_at: '2026-10-31T19:51:00+08:00', unread: false
})

test('extracts the end of a Chinese assessment time range', () => {
  const deadline = findDeadline(item('测评', ['【作答时间】', '2026年10月31日 周六 19:51-2026年11月15日 周日 19:51']))
  assert.equal(new Date(deadline.at).toISOString(), '2026-11-15T11:51:00.000Z')
  assert.equal(deadline.label, '邮件所列时间')
})

test('extracts explicit expiry without mistaking the invitation start for the end', () => {
  const deadline = findDeadline(item('测评', ['本次测评于2026年10月29日 17:17生效，于2026年11月05日 17:17失效。']))
  assert.equal(new Date(deadline.at).toISOString(), '2026-11-05T09:17:00.000Z')
})

test('extracts a deadline phrased as completing before a date', () => {
  const deadline = findDeadline(item('测评', ['请于2026年11月01日 23:59前完成测评。']))
  assert.equal(new Date(deadline.at).toISOString(), '2026-11-01T15:59:00.000Z')
  assert.equal(deadline.label, '邮件截止时间')
})

test('extracts a deadline for responding to a scheduling invitation', () => {
  const deadline = findDeadline(item('笔试', ['请您在2026-10-21 23:59:59前点击链接反馈场次。']))
  assert.equal(new Date(deadline.at).toISOString(), '2026-10-21T15:59:00.000Z')
})

test('marks English deadline with unknown timezone', () => {
  const deadline = findDeadline(item('测评', ['Please complete these assessments latest by 1 November 2026 (Sunday), 23:59 hrs.']))
  assert.equal(new Date(deadline.at).toISOString(), '2026-11-01T15:59:00.000Z')
  assert.equal(deadline.uncertainZone, true)
})

test('derives relative deadlines only when anchored to receipt', () => {
  const deadline = findDeadline(item('测评', ['请在收到本邮件后24小时内完成。']))
  assert.equal(new Date(deadline.at).toISOString(), '2026-11-01T11:51:00.000Z')
  assert.equal(deadline.label, '按收信时间推算')
  assert.equal(findDeadline(item('测评', ['2026年10月31日', '感谢您投递'])), null)
})

test('separates future, undated, past and progress without claiming completion', () => {
  const now = Date.parse('2026-11-01T10:00:00+08:00')
  const result = buildOverview([
    item('测评', ['2026年11月15日 19:51失效'], '近期测评'),
    item('面试', [], '面试邀请'),
    item('笔试', ['考试时间：2026年10月24日 12:00'], '旧笔试'),
    item('结果反馈', ['岗位不匹配'], '招聘反馈')
  ], now)
  assert.equal(result.upcoming.length, 1)
  assert.equal(result.undated.length, 1)
  assert.equal(result.history.length, 1)
  assert.equal(result.progress[0].action, '本次岗位未匹配')
})

test('groups undated notices with the same company and type without discarding them', () => {
  const now = Date.parse('2026-11-01T10:00:00+08:00')
  const first = item('测评', ['2026年11月05日 17:17失效'], '测评邀请')
  const second = { ...item('测评', [], '补充通知'), uid: 2 }
  const result = buildOverview([first, second], now)
  assert.equal(result.upcoming.length, 1)
  assert.equal(result.undated.length, 0)
  assert.equal(result.upcoming[0].related[0].subject, '补充通知')
})

test('groups duplicate reminders but keeps different assessments separate', () => {
  const now = Date.parse('2026-11-01T10:00:00+08:00')
  const first = item('测评', ['2026年11月05日 17:17失效'], 'Online Assessment')
  const reminder = { ...item('测评', ['2026年11月05日 17:17失效'], '[REMINDER] Online Assessment'), uid: 2 }
  const another = { ...item('测评', ['2026年11月05日 17:17失效'], 'Different Assessment'), uid: 3 }
  const result = buildOverview([first, reminder, another], now)
  assert.equal(result.upcoming.length, 2)
  assert.equal(result.upcoming[0].related.length, 1)
})

test('excludes github account notifications from recruiting progress', () => {
  const result = buildOverview([item('投递与进展', [], '[GitHub] A third-party OAuth application has been added')])
  assert.equal(result.progress.length, 0)
})
