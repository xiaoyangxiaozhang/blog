// 分类实体
export interface Category {
  id: number
  name: string
  slug: string
  description: string
  count: number
  sort: number
}

// 分页数据
export interface CategoryListData {
  list: Category[]
  total: number
  page: number
  page_size: number
}