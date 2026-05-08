// 标签实体
export interface Tag {
  id: number
  name: string
  slug: string
  description: string
  count: number
}

// 分页数据
export interface TagListData {
  list: Tag[]
  total: number
  page: number
  page_size: number
}