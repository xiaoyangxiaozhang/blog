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
        path: '/kimidou/moments',
        name: 'kimidouMoments',
        component: () => import('@/views/kimidou/KimidouMomentList.vue'),
        meta: { title: '我的动态', requiresAuth: true, module: 'kimidou', minimumRole: 'user' }
      },
      {
        path: '/kimidou/profile',
        name: 'kimidouProfile',
        component: () => import('@/views/kimidou/KimidouProfile.vue'),
        meta: { title: '个人资料', requiresAuth: true, module: 'kimidou', minimumRole: 'user' }
      },
      {
        path: '/kimidou/users',
        name: 'kimidouUsers',
        component: () => import('@/views/kimidou/KimidouUserList.vue'),
        meta: { title: '用户管理', requiresAuth: true, module: 'kimidou', minimumRole: 'admin' }
      },
      {
        path: '/kimidou/comments',
        name: 'kimidouComments',
        component: () => import('@/views/kimidou/KimidouCommentList.vue'),
        meta: { title: '评论管理', requiresAuth: true, module: 'kimidou', minimumRole: 'admin' }
      },
      {
        path: '/kimidou/settings',
        name: 'kimidouSettings',
        component: () => import('@/views/kimidou/KimidouSettings.vue'),
        meta: { title: '社区设置', requiresAuth: true, module: 'kimidou', minimumRole: 'admin' }
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
      return authStore.isSuperAdmin() ? '/' : '/kimidou/moments'
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

  if (requiresAuth && !authStore.isSuperAdmin() && to.meta.module !== 'kimidou') {
    return '/kimidou/moments'
  }

  const minimumRole = to.meta.minimumRole
  if (requiresAuth && typeof minimumRole === 'string' && !authStore.canAccessRole(minimumRole)) {
    return authStore.isSuperAdmin() ? '/' : '/kimidou/moments'
  }

  // 如果需要超级管理员权限，必须确保用户信息已获取
  if (requiresSuperAdmin) {
    try {
      await authStore.ensureUserInfo()
      if (!authStore.isSuperAdmin()) {
        return authStore.isSuperAdmin() ? '/' : '/kimidou/moments'
      }
    } catch {
      return '/login'
    }
  }

  return true
})
export default router
