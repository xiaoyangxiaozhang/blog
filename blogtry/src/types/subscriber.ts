import type { PaginationQuery } from './request'

// 订阅者实体
export interface Subscriber {
    id: number
    email: string
    active: boolean
    created_at: string
    updated_at: string
}

// 订阅者查询参数
export interface SubscriberQuery extends PaginationQuery {}
