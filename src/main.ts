import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { setupAxiosInterceptors, initConnectionStatus } from './composables/useConnectionStatus'

// 设置 axios 拦截器
setupAxiosInterceptors()
// 初始化连接状态
initConnectionStatus()

const app = createApp(App)

app.use(router)
app.use(ElementPlus)
app.mount('#app')
