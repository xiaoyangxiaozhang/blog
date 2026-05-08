import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/css/main.scss'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

import 'remixicon/fonts/remixicon.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(ElementPlus)
app.use(router)
app.mount('#app')
