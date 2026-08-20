<template>
  <div class="dashboard">
   <!-- 顶部区域 -->
    <el-card class="top-card" shadow="hover" border-radius="30px">
      <div class="top-content">
        <!-- 左侧用户信息 -->
         <div class="profile-section">
          
            <el-avatar :src="userAvatar" class="avatar" :size="64" @error="handleAvatarError" />
           <div class="profile-info">
            <h2 class="greeting">{{ greeting }}，{{ nickName }}</h2>
            <p class="weather-info">{{ hitokoto }}</p>
          </div>
        </div>
        <!-- 右侧统计信息 -->
         <div class="stats-section" >
          <div class="stat-item">
            <div class="stat-label">文章</div>
            <div class="stat-value">{{ dashboardData.total_articles }}</div>
          </div>
          <div class="stat-divider"></div>
           <div class="stat-item">
            <div class="stat-label">友链</div>
            <div class="stat-value">{{ dashboardData.total_friends }}</div>
          </div>
          <div class="stat-divider"></div>
           <div class="stat-item">
            <div class="stat-label">动态</div>
            <div class="stat-value">{{ dashboardData.total_moments }}</div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 中间区域统计信息 -->
     
      <el-row :gutter="20" class="overview-cards">
        <el-col :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
         <el-card class="overview-card" shadow="hover">
           <div class="card-left">
            <div class="card-icon icon-purple">
              <el-icon>
                <View />
              </el-icon>
            </div>
          </div>
          <div class="card-right">
            <div class="card-title">总访问量</div>
            <div class="card-value">{{ formatNumber(dashboardData.total_views) }}</div>
            <div class="card-stats">
              <span class="today-value">今日:{{ dashboardData.today_views }}</span>
              <span class="growth-rate" :class="getGrowthClass(dashboardData.views_growth)">
                 <el-icon v-if="dashboardData.views_growth > 0">
                  <CaretTop />
                </el-icon>
                <el-icon v-else-if="dashboardData.views_growth < 0">
                  <CaretBottom />
                </el-icon>
                {{ Math.abs(dashboardData.views_growth) }}%
              </span>
            </div>
          </div>

         </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
        <el-card class="overview-card" shadow="hover">
          <div class="card-left">
            <div class="card-icon icon-blue">
              <el-icon>
                <User />
              </el-icon>
            </div>
          </div>
          <div class="card-right">
            <div class="card-title">访客量</div>
            <div class="card-value">{{ formatNumber(dashboardData.total_visitors) }}</div>
            <div class="card-stats">
              <span class="today-value">今日: {{ dashboardData.today_visitors }}</span>
              <span class="growth-rate" :class="getGrowthClass(dashboardData.visitors_growth)">
                <el-icon v-if="dashboardData.visitors_growth > 0">
                  <CaretTop />
                </el-icon>
                <el-icon v-else-if="dashboardData.visitors_growth < 0">
                  <CaretBottom />
                </el-icon>
                {{ Math.abs(dashboardData.visitors_growth) }}%
              </span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
        <el-card class="overview-card" shadow="hover">
          <div class="card-left">
            <div class="card-icon icon-green">
              <el-icon>
                <ChatDotRound />
              </el-icon>
            </div>
          </div>
          <div class="card-right">
            <div class="card-title">评论数</div>
            <div class="card-value">{{ formatNumber(dashboardData.total_comments) }}</div>
            <div class="card-stats">
              <span class="today-value">今日: {{ dashboardData.today_comments }}</span>
              <span class="growth-rate" :class="getGrowthClass(dashboardData.comments_growth)">
                <el-icon v-if="dashboardData.comments_growth > 0">
                  <CaretTop />
                </el-icon>
                <el-icon v-else-if="dashboardData.comments_growth < 0">
                  <CaretBottom />
                </el-icon>
                {{ Math.abs(dashboardData.comments_growth) }}%
              </span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
        <el-card class="overview-card" shadow="hover">
          <div class="card-left">
            <div class="card-icon icon-orange">
              <el-icon>
                <UserFilled />
              </el-icon>
            </div>
          </div>
          <div class="card-right">
            <div class="card-title">用户数</div>
            <div class="card-value">{{ formatNumber(dashboardData.total_users) }}</div>
            <div class="card-stats">
              <span class="today-value">今日: {{ dashboardData.today_users }}</span>
              <span class="growth-rate" :class="getGrowthClass(dashboardData.users_growth)">
                <el-icon v-if="dashboardData.users_growth > 0">
                  <CaretTop />
                </el-icon>
                <el-icon v-else-if="dashboardData.users_growth < 0">
                  <CaretBottom />
                </el-icon>
                {{ Math.abs(dashboardData.users_growth) }}%
              </span>
            </div>
          </div>
        </el-card>
      </el-col>


      </el-row>
    <!-- 图表1 -->
   <el-row :gutter="20" class="charts-section">
      <el-col :xs="24" :sm="24" :md="16" :lg="15" :xl="15">
        <el-card shadow="hover">
          <template #header>
            <div class="chart-header">
              <span>访问趋势</span>
              <el-radio-group v-model="trendType" size="small" @change="fetchTrendData">
                <el-radio-button value="daily">日</el-radio-button>
                <el-radio-button value="monthly">月</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="24" :md="8" :lg="9" :xl="9">
        <el-card shadow="hover">
          <template #header>
            <div class="chart-header">
              <span>分类统计</span>
            </div>
          </template>
          <div ref="pieChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>
    <!-- 图表2 -->
    <el-row :gutter="20" class="charts-section">
      <el-col :xs="24" :sm="24" :md="8" :lg="9" :xl="9">
        <el-card shadow="hover">
          <template #header>
            <div class="chart-header">
              <span>标签统计</span>
            </div>
          </template>
          <div ref="tagCloudRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="24" :md="16" :lg="15" :xl="15">
        <el-card shadow="hover">
          <template #header>
            <div class="chart-header">
              <span>文章贡献</span>
              <el-select v-model="selectedYear" size="small" style="width: 100px" @change="fetchContributionData">
                <el-option v-for="year in availableYears" :key="year" :label="year" :value="year" />
              </el-select>
            </div>
          </template>
          <div ref="calendarChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>
    <!-- 快捷访问-->
    <el-card class="quick-access-card" shadow="hover">
      <template #header>
        <div class="quick-access-header">
          <span>快捷访问</span>
        </div>
      </template>
      <div class="quick-access-content">
        <div class="quick-links">
          <div class="link-item" @click="openLink('')">
            <span class="link-text">主页</span>
            <el-icon class="link-icon">
              <Right />
            </el-icon>
          </div>
          <div class="link-item" @click="openLink('')">
            <span class="link-text">博客</span>
            <el-icon class="link-icon">
              <Right />
            </el-icon>
          </div>
          <div class="link-item" @click="openLink('')">
            <span class="link-text">GitHub</span>
            <el-icon class="link-icon">
              <Right />
            </el-icon>
          </div>
          <div class="link-item" @click="openLink('')">
            <span class="link-text">文档</span>
            <el-icon class="link-icon">
              <Right />
            </el-icon>
          </div>
        </div>
        <div class="quick-illustration">
          <img src="@/assets/img/dashboard.png" alt="dashboard">
        </div>
      </div>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { DashboardStats, TrendDataItem,CategoryStats,ArticleContribution,TagStats } from '@/types/stats'
import { View, User, ChatDotRound, UserFilled, CaretTop, CaretBottom, Right } from '@element-plus/icons-vue'
import { getToday, getDaysAgo, getMonthsAgo, generateDateSeries, } from '@/utils/date'
import { getTrendData,getDashboardStats,getCategoryStats,getArticleContribution,getTagStats } from '@/api/stats'
import { getDefaultAvatar, resolveAvatarUrl } from '@/utils/avatar'
import * as echarts from 'echarts'
import 'echarts-wordcloud'
const authStore = useAuthStore()
const avatarLoadFailed = ref(false)
const rawAvatar = computed(() => authStore.getUserInfo()?.avatar || '')
const userAvatar = computed(() => {
  if (avatarLoadFailed.value) {
    return getDefaultAvatar()
  }

  return resolveAvatarUrl(rawAvatar.value)
})
const nickName = computed(() => authStore.getUserInfo()?.nickname || 'Admin')
const hitokoto = ref('加载中…')
const HITOKOTO_API = 'https://v1.hitokoto.cn/?c=i&encode=json'
const HITOKOTO_FALLBACK = '愿你今天也有好心情。'



watch(rawAvatar, () => {
  avatarLoadFailed.value = false
})

const dashboardData = ref<DashboardStats>({
  total_articles: 0,
  total_friends: 0,
  total_moments: 0,
  total_views: 0,
  total_visitors: 0,
  total_comments: 0,
  total_users: 0,
  today_views: 0,
  today_visitors: 0,
  today_comments: 0,
  today_users: 0,
  views_growth: 0,
  visitors_growth: 0,
  comments_growth: 0,
  users_growth: 0
})
// 获取仪表板数据

const trendType = ref<'daily' | 'monthly'>('daily')
// 趋势数据
const trendData = ref<TrendDataItem[]>([])
// 分类统计数据
const categoryData = ref<CategoryStats[]>([])
const tagData = ref<TagStats[]>([])
const contributionData = ref<ArticleContribution[]>([])
const selectedYear = ref(new Date().getFullYear())
const trendChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()
const tagCloudRef = ref<HTMLElement>()
const calendarChartRef = ref<HTMLElement>()

// 图表实例
let trendChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null
let tagCloud: echarts.ECharts | null = null
let calendarChart: echarts.ECharts | null = null

const CHART_COLORS = ['#8183ff', '#49b1f5', '#67c23a', '#e6a23c', '#f56c6c', '#a78bfa', '#22d3ee', '#fb7185', '#34d399']

const chartTheme = () => {
  const light = document.documentElement.getAttribute('data-theme') === 'blue-white'
  return {
    text: light ? '#555555' : '#cccccc',
    muted: light ? '#666666' : '#999999',
    grid: light ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
    surface: light ? '#ffffff' : '#171717'
  }
}

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 9) return '早安'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 17) return '下午好'
  if (hour < 19) return '傍晚好'
  if (hour < 22) return '晚上好'
  return '夜深了'
})
const fetchDashboardData = async () => {
  try {
    dashboardData.value = await getDashboardStats()
  } catch (error) {
    console.error('获取仪表板数据失败', error)
  }
}
// 获取随机一言
const fetchHitokoto = async () => {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(HITOKOTO_API, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`一言接口返回 HTTP ${response.status}`)
    }

    const data = await response.json() as { hitokoto?: string }
    const sentence = data.hitokoto?.trim()

    if (!sentence) {
      throw new Error('一言接口没有返回有效内容')
    }

    hitokoto.value = sentence
  } catch (error) {
    console.error('获取一言失败:', error)
    hitokoto.value = HITOKOTO_FALLBACK
  } finally {
    window.clearTimeout(timeoutId)
  }
}
// 生成可用年份
const availableYears = computed(() => {
  const currentYear = new Date().getFullYear()
  const startYear = 2024
  const years: number[] = []

  // 从当前年份倒序到2024年
  for (let year = currentYear; year >= startYear; year--) {
    years.push(year)
  }

  return years
})
// 格式化数字
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}
// 打开链接
const openLink = (url: string) => {
  window.open(url, '_blank')
}
const getGrowthClass=(growth:number)=>{
  if(growth>0){
    return 'growth-up'
  }else if(growth<0){
    return 'growth-down'
  }
  return 'neutral'
}
// 防抖
const handleAvatarError = () => {
  avatarLoadFailed.value = true
}
let resizeTimer: number | null = null
const handleResize = () => {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => {
    trendChart?.resize()
    pieChart?.resize()
    tagCloud?.resize()
    calendarChart?.resize()
  }, 300)
}
// 初始化所有图表
const initAllCharts = () => {
  if (trendChartRef.value) trendChart = echarts.init(trendChartRef.value)
  if (pieChartRef.value) pieChart = echarts.init(pieChartRef.value)
  if (tagCloudRef.value) tagCloud = echarts.init(tagCloudRef.value)
  if (calendarChartRef.value) calendarChart = echarts.init(calendarChartRef.value)

  window.addEventListener('resize', handleResize)
}
// 获取趋势数据
const fetchTrendData = async () => {
  const endDate = getToday()
  const startDate = trendType.value === 'daily' ? getDaysAgo(6) : getMonthsAgo(6)

  try {
    console.log('开始获取趋势数据:', { start_date: startDate, end_date: endDate, type: trendType.value })
    const data = await getTrendData({ start_date: startDate, end_date: endDate, type: trendType.value })
    console.log('获取趋势数据成功:', data)
    trendData.value = data
    renderTrendChart()
    console.log('渲染趋势图完成')
  } catch (error) {
    console.error('获取趋势数据失败', error)
  }
}
const renderTrendChart=()=>{
  if(!trendChart){return}
 const endDate = getToday()
  const startDate = trendType.value === 'daily' ? getDaysAgo(6) : getMonthsAgo(6)
  const format = trendType.value === 'daily' ? 'YYYY-MM-DD' : 'YYYY-MM'
  const unit = trendType.value === 'daily' ? 'day' : 'month'
  const allDates = generateDateSeries(startDate, endDate, unit, format, 7)

  const dataMap = new Map<string, { pv: number; uv: number }>()
  // 确保trendData.value是数组
  const safeTrendData = Array.isArray(trendData.value) ? trendData.value : []
  safeTrendData.forEach(item => {
    dataMap.set(item.date, { pv: item.pv_count, uv: item.uv_count })
  })

    const pvData = allDates.map(date => dataMap.get(date)?.pv || 0)
    const uvData = allDates.map(date => dataMap.get(date)?.uv || 0)
  const option = {
    textStyle: { color: chartTheme().text },
    tooltip: {
      trigger: 'axis',
      textStyle: { color: chartTheme().text },
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['浏览量', '访客量'],
      bottom: 0,
      textStyle: { color: chartTheme().text }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '60px',
      top: '40px',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: allDates,
      axisLabel: { color: chartTheme().muted },
      axisLine: { lineStyle: { color: chartTheme().grid } }
    },
    yAxis: [
      {
        type: 'value',
        name: '浏览量',
        position: 'left',
        axisLabel: { color: chartTheme().muted, formatter: '{value}' },
        axisLine: { lineStyle: { color: chartTheme().grid } },
        splitLine: { lineStyle: { color: chartTheme().grid } }
      },
      {
        type: 'value',
        name: '访客量',
        position: 'right',
        axisLabel: { color: chartTheme().muted, formatter: '{value}' },
        axisLine: { lineStyle: { color: chartTheme().grid } },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '浏览量',
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        data: pvData,
        itemStyle: {
          color: '#8183ff'
        },
        lineStyle: {
          width: 2
        },
        symbolSize: 6
      },
      {
        name: '访客量',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: uvData,
        itemStyle: {
          color: '#49b1f5'
        },
        lineStyle: {
          width: 2
        },
        symbolSize: 6
      }
    ]
  }

  trendChart.setOption(option)
} 
// 获取分类统计数据
const fetchCategoryData = async () => {
  try{
    categoryData.value = await getCategoryStats()
    renderPieChart()
  }catch(error){
    console.error('获取分类统计数据失败', error)
  }
 }
 const renderPieChart = () => {
  if (!pieChart) return

  const option = {
    textStyle: { color: chartTheme().text },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { fontSize: 12, color: chartTheme().text },
      formatter: (name: string) => {
        const item = categoryData.value.find(d => d.name === name)
        return `${name} (${item?.count || 0})`
      }
    },
    series: [
      {
        name: '文章分类',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: chartTheme().surface,
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 18,
            fontWeight: 'bold',
            color: chartTheme().text,
            formatter: '{b}\n{c}篇'
          }
        },
        labelLine: {
          show: false
        },
        data: categoryData.value.map((item, index) => ({
          value: item.count,
          name: item.name,
          itemStyle: {
            color: CHART_COLORS[index % CHART_COLORS.length]
          }
        }))
      }
    ]
  }

  pieChart.setOption(option)
}
const fetchTagData = async () => {
  try {
    tagData.value = await getTagStats()
    renderTagCloud()
  } catch (error) {
    console.error('获取标签统计数据失败', error)
  }
}
const renderTagCloud = () => {
  if (!tagCloud) return

  const option = {
    textStyle: { color: chartTheme().text },
    tooltip: {
      formatter: '{b}: {c}篇'
    },
    series: [{
      type: 'wordCloud',
      shape: 'circle',
      sizeRange: [14, 35],
      rotationRange: [0, 0],
      gridSize: 5,
      drawOutOfBound: false,
      textStyle: {
        fontFamily: 'sans-serif',
        fontWeight: '500',
        color: function () {
          return CHART_COLORS[Math.floor(Math.random() * CHART_COLORS.length)]
        }
      },
      data: tagData.value.map(item => ({
        name: item.name,
        value: item.count
      }))
    }]
  }

  tagCloud.setOption(option)
}
// 获取文章贡献数据
const fetchContributionData =async()=>{
  try {
    // 调用API时传入year参数，获取指定年份的数据
    const data = await getArticleContribution({ year: selectedYear.value })
    contributionData.value = data || []
    // 等待响应式数据更新完成后再渲染图表
    await nextTick()
    renderCalendarChart()
  } catch (error) {
    console.error('获取文章贡献数据失败', error)
    contributionData.value = []
    if (calendarChart) {
      calendarChart.clear()
    }
  }
}
// 渲染文章贡献日历图表
const renderCalendarChart = () => {
  if (!calendarChart) return

  // 确保数据为数组，即使为空也显示日历网格
  const chartData = contributionData.value || []

  // 计算最大值，如果没有数据则设为1（避免visualMap显示异常）
  const maxCount = chartData.length > 0
    ? Math.max(...chartData.map(item => item.count), 1)
    : 1

  const option = {
    textStyle: { color: chartTheme().text },
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        return `${params.data[0]}<br/>文章数: ${params.data[1]}篇`
      }
    },
    visualMap: {
      min: 0,
      max: maxCount,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      top: 20,
      textStyle: { color: chartTheme().text }
    },
    calendar: {
      range: selectedYear.value,
      left: 55,
      right: 10,
      top: 130,
      bottom: 80,
      cellSize: 12,
      monthLabel: {
        fontSize: 11,
        nameMap: 'cn',
        color: chartTheme().muted
      },
      dayLabel: {
        fontSize: 11,
        nameMap: 'cn',
        color: chartTheme().muted
      }
    },
    series: {
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data: chartData.map(item => [item.date, item.count])
    }
  }

  // 使用 notMerge: true 确保完全替换配置
  calendarChart.setOption(option, { notMerge: true })
}

const handleThemeChange = () => {
  window.requestAnimationFrame(() => {
    renderTrendChart()
    renderPieChart()
    renderTagCloud()
    renderCalendarChart()
  })
}
onMounted(async () => {
  // 清除缓存的用户信息，强制从后端获取
  authStore.clearUserInfo()
  window.addEventListener('admin-theme-change', handleThemeChange)
  // 先获取用户信息
  await authStore.fetchUserInfo()
  await fetchDashboardData()
  await nextTick()
  // 延迟初始化图表，确保DOM完全渲染
  setTimeout(() => {
    initAllCharts()
    // 初始化后再获取数据
    fetchContributionData()
    fetchTagData()
    fetchTrendData()
    fetchCategoryData()
    fetchHitokoto()
  }, 100)
})
onUnmounted(() => {
  window.removeEventListener('admin-theme-change', handleThemeChange)
  window.removeEventListener('resize', handleResize)
  if (resizeTimer) clearTimeout(resizeTimer)

  trendChart?.dispose()
  pieChart?.dispose()
  tagCloud?.dispose()
  calendarChart?.dispose()
  trendChart = null
  pieChart = null
  tagCloud = null
  calendarChart = null
})
</script>
<style scoped lang="scss">
.dashboard {

  // 顶部区域
  .top-card {
    margin-bottom: 10px;
    border-radius: var(--admin-radius-card) !important;
    :deep(.el-card__body) {
      padding: 24px;
    }

    .top-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 40px;

      .profile-section {
        display: flex;
        align-items: center;
        gap: 20px;
        flex: 1;

        .avatar {
          flex-shrink: 0;
        }

        .profile-info {
          flex: 1;

          .greeting {
            font-size: 18px;
            font-weight: 600;
            color: var(--admin-text);
            margin: 0 0 8px 0;
          }

          .weather-info {
            font-size: 14px;
            color: var(--admin-text-muted);
            margin: 0;
          }
        }
      }

      .stats-section {
        display: flex;
        align-items: center;
        gap: 40px;
        margin-right: 20px;

        .stat-item {
          text-align: center;

          .stat-label {
            font-size: 14px;
            color: var(--admin-text-muted);
            margin-bottom: 8px;
          }

          .stat-value {
            font-size: 28px;
            font-weight: bold;
            color: var(--admin-text);
          }
        }

        .stat-divider {
          width: 1px;
          height: 40px;
          background-color: var(--admin-border);
        }
      }
    }
  }

  // 概况卡片
  .overview-cards {
    .el-col {
      margin-bottom: 20px;
    }

    .overview-card {
      transition: all 0.3s;
      border-radius: var(--admin-radius-card) !important;
      :deep(.el-card__body) {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .card-left {
        .card-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;

          &.icon-purple {
            background-color: var(--admin-brand-soft);
            color: var(--admin-brand);
          }

          &.icon-blue {
            background-color: rgba(73, 177, 245, 0.12);
            color: #49b1f5;
          }

          &.icon-green {
            background-color: rgba(103, 194, 58, 0.12);
            color: #67c23a;
          }

          &.icon-orange {
            background-color: rgba(230, 162, 60, 0.12);
            color: #e6a23c;
          }
        }
      }

      .card-right {
        flex: 1;
        min-width: 0;

        .card-title {
          font-size: 13px;
          color: var(--admin-text-muted);
          margin-bottom: 4px;
        }

        .card-value {
          font-size: 24px;
          font-weight: bold;
          color: var(--admin-text);
          line-height: 1.2;
          margin-bottom: 4px;
        }

        .card-stats {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;

          .today-value {
            color: var(--admin-text-muted);
          }

          .growth-rate {
            display: flex;
            align-items: center;
            gap: 2px;
            font-weight: 600;

            &.positive,
            &.growth-up {
              color: #67c23a;
            }

            &.negative,
            &.growth-down {
              color: #f56c6c;
            }

            &.neutral {
              color: var(--admin-text-muted);
            }

            .el-icon {
              font-size: 12px;
            }
          }
        }
      }
    }
  }

  // 图表区域
  .charts-section {
    .el-col {
      margin-bottom: 20px;
    }

    .chart-header {
      height: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      font-size: 15px;
    }

    .chart-container {
      width: 100%;
      height: 320px;
      min-width: 300px;
      min-height: 300px;
    }

      .empty-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--admin-text-muted);

      p {
        margin-top: 16px;
        font-size: 14px;
      }
    }
  }

  // 快捷访问
  .quick-access-card {
    :deep(.el-card__body) {
      padding: 24px;
    }

    .quick-access-header {
      font-weight: 600;
      font-size: 15px;
    }

    .quick-access-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 40px;
      padding: 0 50px;

      .quick-links {
        flex: 1;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        max-width: 500px;

        .link-item {
          padding: 16px 20px;
          background: var(--admin-surface-soft);
          border: 1px solid var(--admin-border-soft);
          border-radius: var(--admin-radius-control);
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: background 0.2s;

          &:hover {
            background: var(--admin-brand-soft);
          }

          .link-text {
            font-size: 15px;
            font-weight: 500;
            color: var(--admin-text-secondary);
          }

          .link-icon {
            font-size: 16px;
            color: var(--admin-text-muted);
          }
        }
      }

      .quick-illustration {
        flex-shrink: 0;
        width: 350px;
        height: 240px;
        display: flex;
        align-items: center;
        justify-content: center;

        img {
          height: 100%;
        }
      }
    }
  }

  // 移动端优化（<992px）
  @media (max-width: 991px) {

    // 禁用移动端的 hover 效果
    :deep(.el-card.is-hover-shadow:hover) {
      box-shadow: none;
    }

    .top-card {
      :deep(.el-card__body) {
        padding: 16px;
      }

      .top-content {
        flex-direction: column;
        gap: 16px;

        .profile-section {
          .profile-info {
            .greeting {
              font-size: 16px;
            }

            .weather-info {
              font-size: 13px;
            }
          }
        }

        .stats-section {
          width: 100%;
          justify-content: space-around;
          margin-right: 0;
        }
      }
    }

    .overview-cards {
      .el-col {
        margin-bottom: 12px;
      }
    }

    .charts-section {
      margin-top: 8px;

      .chart-container {
        height: 280px;
      }
    }

    .quick-access-card {
      :deep(.el-card__body) {
        padding: 16px;
      }

      .quick-access-content {
        flex-direction: column;
        padding: 0 20px;
        gap: 24px;

        .quick-links {
          max-width: 100%;
          grid-template-columns: repeat(2, 1fr);
        }

        .quick-illustration {
          display: none;
        }
      }
    }
  }

  // 小屏幕优化（<768px）
  @media (max-width: 767px) {
    .top-content {
      .stats-section {
        .stat-item {
          .stat-label {
            font-size: 12px;
          }

          .stat-value {
            font-size: 20px;
          }
        }

        .stat-divider {
          height: 30px;
        }
      }
    }

    .overview-card {
      .card-left {
        .card-icon {
          width: 50px;
          height: 50px;

          .el-icon {
            font-size: 24px;
          }
        }
      }

      .card-right {
        .card-value {
          font-size: 20px;
        }
      }
    }

    .charts-section {
      margin-top: 8px;

      .chart-container {
        height: 240px;
      }
    }
  }
}
</style>
