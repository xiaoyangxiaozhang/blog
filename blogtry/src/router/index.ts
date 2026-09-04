// 引入路由模块
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }

  },
 
  {
    path: '/',
    // name: 'home',
    component: () => import('@/layouts/AdminLayout.vue'),
    children:[
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '仪表盘', requiresAuth: true }

      },
      
      {
        path: '/articles',
        name: 'articles',
        component: () => import('@/views/article/ArticleList.vue'),
        meta: { title: '文章列表', requiresAuth: true }
      },
      {
        path: '/moments',
        name: 'moments',
        component: () => import('@/views/moment/MomentList.vue'),
        meta: { title: '动态列表', requiresAuth: true }
      },
      {
        path: '/friends',
        name: 'friends',
        component: () => import('@/views/friend/FriendList.vue'),
        meta: { title: '友链管理', requiresAuth: true }
      },
      {
        path: '/comments',
        name: 'comments',
        component: () => import('@/views/comment/CommentList.vue'),
        meta: { title: '评论列表', requiresAuth: true }
      },
      {
        path: '/rssfeeds',
        name: 'rssfeeds',
        component: () => import('@/views/rssfeed/RssFeedList.vue'),
        meta: { title: 'RSS订阅管理', requiresAuth: true }
      },
      {
        path: '/feedback',
        name: 'feedback',
        component: () => import('@/views/feedback/FeedBackList.vue'),
        meta: { title: '投诉反馈列表', requiresAuth: true }
      },
      {
        path: '/feedback/:id',
        name: 'feedbackDetail',
        component: () => import('@/views/feedback/FeedBackDetail.vue'),
        meta: { title: '投诉反馈详情', requiresAuth: true }
      },
      {
        path: '/files',
        name: 'files',
        component: () => import('@/views/file/FileList.vue'),
        meta: { title: '文件列表', requiresAuth: true }
      },
      {
        path: '/settings',
        name: 'settings',
        component: () => import('@/views/setting/Setting.vue'),
        meta: { title: '系统设置', requiresAuth: true }
      },
      {
        path: '/systems',
        name: 'systems',
        component: () => import('@/views/system/System.vue'),
        meta: { title: '系统通知', requiresAuth: true }
      },
      {
        path: '/users',
        name: 'users',
        component: () => import('@/views/user/UserList.vue'),
        meta: { title: '用户管理', requiresAuth: true }
      },
      {
        path: '/menus',
        name: 'menus',
        component: () => import('@/views/menu/MenuList.vue'),
        meta: { title: '菜单管理', requiresAuth: true }
      },
      {
        path: '/visits',
        name: 'visits',
        component: () => import('@/views/visit/VisitList.vue'),
        meta: { title: '访问管理', requiresAuth: true }
      }
     

      
    ]
  },
  {
    path: '/articles/create',
    name: 'ArticleCreate',
    component: () => import('@/views/article/ArticleForm.vue'),
    meta: { title: '创建文章', requiresAuth: true }
  },
  {
    path: '/articles/edit/:id',
    name: 'ArticleEdit',
    component: () => import('@/views/article/ArticleForm.vue'),
    meta: { title: '编辑文章', requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})
router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresSuperAdmin = to.matched.some(record => record.meta.requiresSuperAdmin)
  if (!authStore.checkAuth()) {
    await authStore.restoreSession()
  }
  const isAuthenticated = authStore.checkAuth()

  if (to.path === '/login') {
    if (!isAuthenticated) return true

    try {
      await authStore.ensureUserInfo()
      return '/'
    } catch {
      return true
    }
  }

  if (requiresAuth && !isAuthenticated) {
    return '/login'
  }

  if (requiresAuth) {
    try {
      await authStore.ensureUserInfo()
    } catch {
      return '/login'
    }
  }

  // 如果需要超级管理员权限，必须确保用户信息已获取
  if (requiresSuperAdmin) {
    try {
      await authStore.ensureUserInfo()
      if (!authStore.isSuperAdmin()) {
        return '/'
      }
    } catch {
      return '/login'
    }
  }

  return true
})
export default router
