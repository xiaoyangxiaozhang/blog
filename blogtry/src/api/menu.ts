import request from '@/utils/request'
import type { MenuTreeNode, CreateMenuRequest, UpdateMenuRequest, MenuResponse } from '@/types/menu'

/**
 * 获取菜单树
 */
export function getMenuTree(type?: string): Promise<MenuTreeNode[]> {
  return request.get('/admin/menus', {
    params: { type }
  })
}

/**
 * 创建菜单
 */
export function createMenu(data: CreateMenuRequest): Promise<MenuResponse> {
  return request.post('/admin/menus', data)
}

/**
 * 获取菜单详情
 */
export function getMenuDetail(id: number): Promise<MenuResponse> {
  return request.get(`/admin/menus/${id}`)
}

/**
 * 更新菜单
 */
export function updateMenu(id: number, data: UpdateMenuRequest): Promise<MenuResponse> {
  return request.put(`/admin/menus/${id}`, data)
}

/**
 * 删除菜单
 */
export function deleteMenu(id: number, data?: { children_action?: 'delete' | 'upgrade' }): Promise<void> {
  return request.delete(`/admin/menus/${id}`, { data })
}

