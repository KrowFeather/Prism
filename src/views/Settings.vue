<template>
  <div class="settings-page">
    <h2 class="page-title">设置</h2>
    <div class="page-content">
      <el-card class="settings-card" shadow="hover">
        <el-divider content-position="left">
          <h3 class="section-title">账户信息</h3>
        </el-divider>
        <div class="info-item">
          <span class="info-label">学号：</span>
          <el-tag type="info">{{ loginInfo?.username || '未登录' }}</el-tag>
        </div>

        <el-divider content-position="left">
          <h3 class="section-title">服务器配置</h3>
        </el-divider>
        <el-form>
          <el-form-item label="API 地址">
            <el-input
              v-model="apiUrl"
              placeholder="http://localhost:5000"
              clearable
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveSettings">保存设置</el-button>
          </el-form-item>
        </el-form>

        <el-divider content-position="left">
          <h3 class="section-title">外观设置</h3>
        </el-divider>
        <el-form>
          <el-form-item label="暗色模式">
            <el-switch
              v-model="isDarkMode"
              @change="handleThemeChange"
              active-text="开启"
              inactive-text="关闭"
            />
          </el-form-item>
        </el-form>

        <el-divider content-position="left">
          <h3 class="section-title">操作</h3>
        </el-divider>
        <el-button type="danger" @click="handleLogout">退出登录</el-button>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { connectionStatus } from '../composables/useConnectionStatus'
import { isDarkMode, setTheme } from '../composables/useTheme'

const router = useRouter()
const loginInfo = ref<any>(null)
const apiUrl = ref('http://localhost:5000')

onMounted(() => {
  const stored = localStorage.getItem('loginInfo')
  if (stored) {
    loginInfo.value = JSON.parse(stored)
  }
  
  const storedApiUrl = localStorage.getItem('apiUrl')
  if (storedApiUrl) {
    apiUrl.value = storedApiUrl
  }
  
  // 初始化暗色模式状态（从 useTheme 中读取）
  // isDarkMode 是响应式的，会自动同步
})

function saveSettings() {
  localStorage.setItem('apiUrl', apiUrl.value)
  ElMessage.success('设置已保存')
}

function handleThemeChange(value: boolean) {
  setTheme(value)
  ElMessage.success(value ? '已切换到暗色模式' : '已切换到亮色模式')
}

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    localStorage.removeItem('loginInfo')
    connectionStatus.value = 'disconnected'
    ElMessage.success('已退出登录')
    router.push('/')
  } catch {
    // 用户取消
  }
}
</script>

<style scoped>
.settings-page {
  padding: 20px;
  min-height: 100%;
  box-sizing: border-box;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 24px 0;
}

.page-content {
  max-width: 600px;
  margin: 0 auto;
}

.settings-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e40af;
  margin: 0;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}

.info-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

</style>

<style>
/* 暗色模式样式 - 纯黑色系 */
.dark-theme .page-title {
  background: linear-gradient(135deg, #ffffff, #e0e0e0);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.dark-theme .settings-card {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
}

.dark-theme .section-title {
  color: #e0e0e0 !important;
}

.dark-theme .info-label {
  color: #d0d0d0 !important;
}
</style>

