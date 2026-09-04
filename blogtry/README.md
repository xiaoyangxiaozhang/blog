# 1.components

## 1.layouts

### 1.Siderbar.vue

侧边栏

![image-20260412110948807](C:\Users\xiao\AppData\Roaming\Typora\typora-user-images\image-20260412110948807.png)

### 2.header.vue

顶部栏

## 2.common

### 1.Notification.vue

顶部的铃铛，信息通知小窗口

#### 1. 智能轮询策略（解决：轮询与用户操作冲突）

##### 难点

定时刷新未读消息时，若用户正在查看通知弹窗，强制刷新会导致列表跳动、内容错乱，严重破坏操作体验；需要在**实时性**和**用户操作连贯性**之间做平衡。

##### 亮点

设计**弹窗状态感知的智能轮询机制**：仅当通知弹窗**关闭**时，才执行未读数刷新；弹窗**打开**时暂停轮询逻辑，既保证消息实时提醒，又不干扰用户查看操作，体验极致流畅。

辑，既保证消息实时提醒，又不干扰用户查看操作，体验极致流畅。

##### 核心代码

```typescript
onMounted(() => {
  // 每30秒轮询一次未读数量
  timer = window.setInterval(() => {
    // 🔥 关键：仅弹窗关闭时更新，打开时不刷新（避免冲突）
    if (!visible.value) {
      getNotifications({ page: 1, page_size: 1 }).then(res => {
        // 仅更新未读徽章数字，不刷新列表
        previousUnreadCount = res.unread_count || 0
        unreadCount.value = res.unread_count || 0
      })
    }
  }, 30000)
})
```

#### 2. 请求防重机制（解决：重复请求 / 加载 BUG）

##### 难点

滚动快速触底、多次点击铃铛，会瞬间触发多次接口请求，导致数据重复、列表错乱、接口性能浪费；新手极易出现并发请求问题。

##### 亮点

采用 **`loading` 锁 + 分页状态** 双重防重策略：强制阻塞重复请求，只有当上一次请求完成后，才能发起下一次，同时结合分页开关控制加载终止，保证数据稳定、接口调用安全。

##### 核心代码

```typescript
const loadNotifications = async (reset = false) => {
  // 🔥 关键1：loading锁 → 防止重复发起请求
  // 🔥 关键2：hasMore判断 → 无更多数据时停止加载
  if (loading.value || (!reset && !hasMore.value)) return

  loading.value = true // 开启请求锁
  try {
    const res = await getNotifications({ page: currentPage.value, page_size: 20 })
    // 数据处理逻辑
  } catch (error) { /* 异常处理 */ } 
  finally {
    loading.value = false // 释放请求锁
  }
}
```

# 2.api

### 1.user.ts

![image-20260412112906856](C:\Users\xiao\AppData\Roaming\Typora\typora-user-images\image-20260412112906856.png)

@紧接的是注释，调用api在ts需要定义数据的类型

# 3.utils（工具函数）

### 1auth.ts

它负责**全程管理用户的登录状态**：

存 token、取 token、存用户信息、查是否登录、拉取用户信息、跳登录页、退出登录。

 accessToken = ref<string | null>(null) // 仅保存在当前页面内存

 // Refresh Token 由后端写入 HttpOnly Cookie，前端 JavaScript 不可读取

 currentUser = ref<User | null>(null) // 存当前登录的用户信息

### 2.date.ts

**基础配置（全局统一）**

集成中文国际化、相对时间 / 自定义解析插件，定义**前后端统一的日期格式 `YYYY-MM-DD HH:mm:ss`**，避免项目中格式混乱。

**日期格式化（页面展示专用）**

- 标准格式化：完整日期时间、纯日期（无时间）展示；
- **智能友好时间**：动态显示「刚刚 / 分钟前 / 小时前 / 天前 / 月日 / 年月日」，适配社交、列表页的人性化时间展示；
- 空值 / 无效日期统一兜底返回 `-`，界面更整洁。

**前后端日期交互（核心能力）**

- 解析后端返回的日期字符串 → 前端可用的 Date 对象；
- 转换前端 Date 对象 → 后端要求的标准格式字符串；
- 日期有效性校验，避免非法日期报错。

**快捷日期计算**

一键获取**今日日期、N 天前、N 月前**日期，快速实现时间筛选、数据统计的日期范围需求。

**高级日期序列生成**

按**天 / 月**生成连续的日期数组（支持最小数量限制），专门适配**图表（如访问趋势）、报表**的 X 轴日期序列需求。

# 4.views

## 1.Dashboard.vue

仪表盘绘制，后台主页

#### 一、亮点
##### 1. 响应式布局设计
亮点 ：采用 Element Plus 的栅格系统实现响应式布局，在不同屏幕尺寸下自动调整布局。 代码 ：

```
<el-row :gutter="20" 
class="overview-cards">
  <el-col :xs="24" :sm="12" 
  :md="12" :lg="6" :xl="6">
    <!-- 卡片内容 -->
  </el-col>
  <!-- 其他卡片 -->
</el-row>
```
分析 ：通过 :xs 、 :sm 、 :md 、 :lg 、 :xl 等属性，实现了在不同屏幕尺寸下的自适应布局，提升了用户体验。

##### 2. 实时用户信息展示
亮点 ：使用计算属性动态获取用户信息和头像，实现实时更新。 代码 ：

```
const DEFAULT_AVATAR = 'https://
cube.elemecdn.com/3/7c/
3ea6beec64369c2642b92c6726f1epng.
png'
const nickName = computed(() => 
getUserInfo()?.nickname || 'Admin')
const userAvatar = computed(() => 
getUserInfo()?.avatar || 
DEFAULT_AVATAR)
```
分析 ：通过 computed 计算属性和 getUserInfo() 函数，实现了用户信息的实时展示，当用户信息变化时，页面会自动更新。

##### 3. 数据可视化图表
亮点 ：集成 ECharts 实现多种数据可视化图表，包括趋势图、饼图、标签云等。 代码 ：

```
const renderTrendChart = () => {
  if (!trendChart) return

  // 图表配置
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    // 其他配置...
  }

  trendChart.setOption(option)
}
```
分析 ：使用 ECharts 实现了多种数据可视化图表，提升了数据展示的直观性和美观度。

##### 4. 防抖处理
亮点 ：实现了窗口 resize 事件的防抖处理，优化性能。 代码 ：

```
let resizeTimer: number | null = 
null
// 防抖 resize
const handleResize = () => {
  if (resizeTimer) clearTimeout
  (resizeTimer)
  resizeTimer = window.setTimeout
  (() => {
    trendChart?.resize()
    pieChart?.resize()
    tagCloud?.resize()
    calendarChart?.resize()
  }, 300)
}
```
分析 ：通过防抖处理，避免了窗口 resize 事件触发过于频繁导致的性能问题。

##### 5. 动态数据获取
亮点 ：实现了多种数据的动态获取和更新，包括仪表板数据、趋势数据、分类统计等。 代码 ：

```
// 获取仪表板数据
const fetchDashboardData = async () 
=> {
  try {
    dashboardData.value = await 
    getDashboardStats()
  } catch (error) {
    console.error('获取仪表板数据失败
    ', error)
  }
}
```
分析 ：通过异步函数和 API 调用，实现了数据的动态获取和更新，确保数据的实时性。

#### 二、难点
##### 1. 图表初始化和销毁
难点 ：需要在组件挂载时初始化图表，在组件卸载时销毁图表，避免内存泄漏。 代码 ：

```
onMounted(async () => {
  await fetchDashboardData()
  await nextTick()
  initAllCharts()
  // 其他数据获取...
})

onUnmounted(() => {
  window.removeEventListener
  ('resize', handleResize)
  if (resizeTimer) clearTimeout
  (resizeTimer)

  trendChart?.dispose()
  pieChart?.dispose()
  tagCloud?.dispose()
  calendarChart?.dispose()
  trendChart = null
  pieChart = null
  tagCloud = null
  calendarChart = null
})
```
分析 ：需要正确处理图表的生命周期，避免内存泄漏和重复初始化的问题。

##### 2. 数据处理和转换
难点 ：需要对从 API 获取的数据进行处理和转换，以适应图表的需求。 代码 ：

```
const renderTrendChart = () => {
  // ...
  const dataMap = new Map<string, { 
  pv: number; uv: number }>()
  trendData.value.forEach(item => {
    dataMap.set(item.date, { pv: 
    item.pv_count, uv: item.
    uv_count })
  })

  const pvData = allDates.map(date 
  => dataMap.get(date)?.pv || 0)
  const uvData = allDates.map(date 
  => dataMap.get(date)?.uv || 0)
  // ...
}
```
分析 ：需要对 API 返回的数据进行处理和转换，以适应不同图表的数据源格式要求。

##### 3. 响应式断点处理
难点 ：需要处理不同屏幕尺寸下的布局和样式调整。 代码 ：

```
// 移动端优化（<992px）
@media (max-width: 991px) {
  // 禁用移动端的 hover 效果
  :deep(.el-card.
  is-hover-shadow:hover) {
    box-shadow: 0 2px 12px 0 rgba
    (0, 0, 0, 0.1);
  }
  // 其他样式调整...
}

// 小屏幕优化（<768px）
@media (max-width: 767px) {
  // 样式调整...
}
```
分析 ：需要使用媒体查询处理不同屏幕尺寸下的布局和样式调整，确保在各种设备上都有良好的显示效果。

##### 4. 异步数据加载和错误处理
难点 ：需要处理异步数据加载过程中的状态管理和错误处理。 代码 ：

```
const fetchDashboardData = async () 
=> {
  try {
    dashboardData.value = await 
    getDashboardStats()
  } catch (error) {
    console.error('获取仪表板数据失败
    ', error)
  }
}
```
分析 ：需要处理异步数据加载过程中的错误，确保页面在数据加载失败时不会崩溃，并给出适当的错误提示。

##### 5. 性能优化
难点 ：需要优化页面的性能，尤其是在数据量较大或图表较多的情况下。 代码 ：

```
// 防抖 resize
const handleResize = () => {
  if (resizeTimer) clearTimeout
  (resizeTimer)
  resizeTimer = window.setTimeout
  (() => {
    trendChart?.resize()
    pieChart?.resize()
    tagCloud?.resize()
    calendarChart?.resize()
  }, 300)
}
```
分析 ：通过防抖处理、合理的组件结构和数据处理方式，优化页面性能，确保页面加载和交互的流畅性。
