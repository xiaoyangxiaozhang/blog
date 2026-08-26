import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/css/main.scss'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

import 'remixicon/fonts/remixicon.css'

// 文章编辑页不经过 AdminLayout/Header，也需要在首次渲染前恢复主题属性，
// 否则 Markdown 预览会落回亮色样式，导致暗色背景上的文字对比度过低。
const savedTheme = localStorage.getItem('blog-color-theme')
const initialTheme = savedTheme === 'blue-white' ? 'blue-white' : 'midnight-blue'
document.documentElement.setAttribute('data-theme', initialTheme)
document.documentElement.setAttribute('data-admin-theme', initialTheme === 'blue-white' ? 'light' : 'dark')

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(ElementPlus)
app.use(router)
app.mount('#app')
