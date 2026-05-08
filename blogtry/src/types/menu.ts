// 菜单类型
export type MenuType = 'aggregate' | 'navigation' | 'footer'

// 菜单树节点
export interface MenuTreeNode {
  id: number
  title: string
  type: MenuType
  url: string
  icon: string
  sort: number
  is_enabled: boolean
  parent_id: number | null
  children?: MenuTreeNode[]
}

// 创建菜单请求
export interface CreateMenuRequest {
  title: string
  type: MenuType
  url?: string
  icon?: string
  sort?: number
  is_enabled?: boolean
  parent_id?: number | null
}

// 更新菜单请求
export interface UpdateMenuRequest {
  title: string
  type: MenuType
  url?: string
  icon?: string
  sort?: number
  is_enabled?: boolean
  parent_id?: number | null
}

// 菜单响应
export interface MenuResponse {
  id: number
  title: string
  type: MenuType
  url: string
  icon: string
  sort: number
  is_enabled: boolean
  parent_id: number | null
}
