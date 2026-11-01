import type { RecruitmentItem } from '@/api/recruitment'

export interface Deadline {
  at: number
  label: string
  source: string
  hasTime: boolean
  uncertainZone: boolean
}

export interface OverviewItem {
  mail: RecruitmentItem
  company: string
  action: string
  deadline: Deadline | null
  recent: boolean
  related: RecruitmentItem[]
}

const actionCategories = new Set(['测评', '笔试', '面试'])
const deadlineIntent = /截止|失效|有效期|最迟|latest by|deadline|complete.{0,40}by|20\d{2}.{0,40}(?:前完成|前作答|前参加|前提交|前进行|前反馈|前选择|前点击|前确认|之前完成|以前完成)/i
const deadlineLabel = /截止|失效|有效期|作答时间|考试时间|笔试时间|面试时间|面试日期|小时内|latest by|deadline|complete.{0,40}by|20\d{2}.{0,40}(?:前完成|前作答|前参加|前提交|前进行|前反馈|前选择|前点击|前确认|之前完成|以前完成)/i
const yearDate = /(20\d{2})\s*(?:年|[-/.])\s*(\d{1,2})\s*(?:月|[-/.])\s*(\d{1,2})\s*日?(?:\s*(?:周|星期)[一二三四五六日天])?(?:[\s,，]*(\d{1,2})[:：](\d{2})(?::(\d{2}))?)?/g
const englishDate = /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})(?:\s*\([^)]*\))?(?:[\s,，]*(\d{1,2}):(\d{2}))?/gi
const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

function chinaTime(year: number, month: number, day: number, hour: number, minute: number): number | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null
  const date = new Date(Date.UTC(year, month - 1, day, hour - 8, minute))
  const local = new Date(date.getTime() + 8 * 3600000)
  return local.getUTCFullYear() === year && local.getUTCMonth() === month - 1 && local.getUTCDate() === day ? date.getTime() : null
}

function datesInLine(line: string): { at: number, hasTime: boolean, english: boolean }[] {
  const dates: { at: number, hasTime: boolean, english: boolean }[] = []
  for (const match of line.matchAll(yearDate)) {
    const at = chinaTime(Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4] ?? 23), Number(match[5] ?? 59))
    if (at !== null) dates.push({ at, hasTime: Boolean(match[4]), english: false })
  }
  for (const match of line.matchAll(englishDate)) {
    const at = chinaTime(Number(match[3]), months.indexOf(match[2]!.toLowerCase()) + 1, Number(match[1]), Number(match[4] ?? 23), Number(match[5] ?? 59))
    if (at !== null) dates.push({ at, hasTime: Boolean(match[4]), english: true })
  }
  return dates
}

export function findDeadline(item: RecruitmentItem): Deadline | null {
  if (!actionCategories.has(item.category)) return null
  const lines = item.highlights ?? []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (!deadlineLabel.test(line)) continue
    let source = line
    let dates = datesInLine(line)
    if (!dates.length && lines[i + 1] && !deadlineLabel.test(lines[i + 1]!)) {
      source = `${line} ${lines[i + 1]}`
      dates = datesInLine(lines[i + 1]!)
    }
    if (!dates.length) {
      const relative = line.match(/(?:收到|收信|接收)(?:本)?(?:邮件|链接|通知)?(?:后(?:的)?|之内)?\s*(\d{1,3})\s*小时内/)
      const received = Date.parse(item.received_at)
      if (relative && Number.isFinite(received)) {
        return { at: received + Number(relative[1]) * 3600000, label: '按收信时间推算', source: line, hasTime: true, uncertainZone: false }
      }
      continue
    }
    // For a date range, the last date is the end. A single scheduled date is
    // labelled as an appointment, rather than claiming that it is a deadline.
    const chosen = dates[dates.length - 1]!
    const appointment = !deadlineIntent.test(source)
    const label = appointment ? (item.category === '面试' ? '面试时间' : '邮件所列时间') : '邮件截止时间'
    return { at: chosen.at, label, source, hasTime: chosen.hasTime,
      uncertainZone: chosen.english && !/UTC|GMT|北京时间|China Standard Time/i.test(source) }
  }
  return null
}

function companyName(item: RecruitmentItem): string {
  const subject = item.subject || ''
  const from = (item.from || '').split('<')[0]!.trim().replace(/^["']|["']$/g, '')
  // Generic platform senders do not identify the hiring company.
  if (from && !/招聘助手|招聘小秘书|italent|maptq|support|noreply|no.reply|通知|前程无忧/i.test(from) && !from.includes('@')) {
    return from.replace(/招聘$/, '').trim()
  }
  const chineseCompany = subject.match(/(?:[：:])\s*([^，,：:【】\s]{2,24}?)(?:邀请|在线测评|招聘)/)
    || subject.match(/^([^【】,，:：\s]{2,24}?)(?:在线测评|邀请|招聘)/)
  if (chineseCompany?.[1]) return chineseCompany[1]
  const bracket = subject.match(/【([^】]{2,25})】/)
  if (bracket?.[1]) return bracket[1].split('招聘')[0] || bracket[1]
  const english = subject.match(/\bOCBC\b/i)
  if (english) return english[0].toUpperCase()
  return subject || '招聘邮件'
}

function actionLabel(item: RecruitmentItem): string {
  if (actionCategories.has(item.category)) return `${item.category}邀请`
  const text = (item.highlights ?? []).join(' ')
  if (/不匹配|无法为您提供|不能与您合作|无法进入下一个阶段/.test(text)) return '本次岗位未匹配'
  if (/通过.{0,6}笔试/.test(text)) return '已收到笔试通过通知'
  if (/已收到|收到您|收到你的/.test(text)) return '已收到投递'
  if (item.category === '简历与进展') return '简历信息待确认'
  return item.category === '结果反馈' ? '收到招聘反馈' : '招聘进展'
}

export function buildOverview(items: RecruitmentItem[], now = Date.now()) {
  const records: OverviewItem[] = items.filter(mail => !/\[github\]/i.test(mail.subject)).map(mail => ({
    mail, company: companyName(mail), action: actionLabel(mail), deadline: findDeadline(mail),
    recent: now - Date.parse(mail.received_at) <= 14 * 86400000, related: []
  }))
  const actions = records.filter(item => actionCategories.has(item.mail.category))
  const datedCandidates = actions.filter(item => item.deadline && item.deadline.at >= now)
    .sort((a, b) => a.deadline!.at - b.deadline!.at)
  const upcoming: OverviewItem[] = []
  const normalizedSubject = (subject: string) => subject.replace(/\[reminder\]|\[提醒\]|^re\s*:/gi, '').replace(/\s+/g, ' ').trim().toLowerCase()
  for (const item of datedCandidates) {
    const sameNotice = upcoming.find(other => other.company === item.company && other.mail.category === item.mail.category &&
      other.deadline?.at === item.deadline?.at && normalizedSubject(other.mail.subject) === normalizedSubject(item.mail.subject))
    if (sameNotice) sameNotice.related.push(item.mail)
    else upcoming.push(item)
  }
  const undated: OverviewItem[] = []
  const undatedCandidates = actions.filter(item => !item.deadline && item.recent)
    .sort((a, b) => Date.parse(b.mail.received_at) - Date.parse(a.mail.received_at))
  for (const item of undatedCandidates) {
    const existing = [...upcoming, ...undated].find(other =>
      other.company === item.company && other.mail.category === item.mail.category)
    if (existing) existing.related.push(item.mail)
    else undated.push(item)
  }
  const history = actions.filter(item => item.deadline ? item.deadline.at < now : !item.recent)
    .sort((a, b) => Date.parse(b.mail.received_at) - Date.parse(a.mail.received_at))
  const progress = records.filter(item => !actionCategories.has(item.mail.category))
    .sort((a, b) => Date.parse(b.mail.received_at) - Date.parse(a.mail.received_at))
  return { upcoming, undated, history, progress }
}
