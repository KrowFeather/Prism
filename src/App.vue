<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { connectionStatus, initConnectionStatus } from './composables/useConnectionStatus'

declare global {
  interface Window {
    windowControls: {
      minimize: () => void
      maximize: () => Promise<boolean>
      isMaximized: () => Promise<boolean>
      close: () => void
      onMaximized: (callback: () => void) => void
      onUnmaximized: (callback: () => void) => void
      removeMaximizedListeners: () => void
    }
  }
}

const route = useRoute()

// 检查是否已登录
const isLoggedIn = computed(() => {
  return !!localStorage.getItem('loginInfo')
})

// 检查是否在登录页面
const isLoginPage = computed(() => {
  return route.path === '/'
})

// 状态文本
const statusText = computed(() => {
  if (connectionStatus.value === 'reconnecting') {
    return 'reconnecting...'
  }
  return connectionStatus.value
})

// 状态颜色类
const statusClass = computed(() => {
  if (connectionStatus.value === 'connected') {
    return 'status-connected'
  } else if (connectionStatus.value === 'reconnecting') {
    return 'status-reconnecting'
  } else {
    return 'status-disconnected'
  }
})

// 监听登录状态变化
watch(isLoggedIn, (newVal) => {
  if (newVal) {
    initConnectionStatus()
  } else {
    connectionStatus.value = 'disconnected'
  }
})

const isMaximized = ref(false)

onMounted(() => {
  initConnectionStatus()
  checkMaximizedState()
  
  // 监听窗口最大化/还原事件
  if (window.windowControls) {
    if (typeof window.windowControls.onMaximized === 'function') {
      window.windowControls.onMaximized(() => {
        isMaximized.value = true
      })
    }
    if (typeof window.windowControls.onUnmaximized === 'function') {
      window.windowControls.onUnmaximized(() => {
        isMaximized.value = false
      })
    }
  }
})

// 组件卸载时清理监听器
onUnmounted(() => {
  if (window.windowControls && typeof window.windowControls.removeMaximizedListeners === 'function') {
    window.windowControls.removeMaximizedListeners()
  }
})

// 检查窗口最大化状态
async function checkMaximizedState() {
  if (window.windowControls && typeof window.windowControls.isMaximized === 'function') {
    isMaximized.value = await window.windowControls.isMaximized()
  }
}

function onMinimize() {
  if (window.windowControls && typeof window.windowControls.minimize === 'function') {
    window.windowControls.minimize()
  }
}

async function onMaximize() {
  if (window.windowControls && typeof window.windowControls.maximize === 'function') {
    await window.windowControls.maximize()
    // 更新状态
    setTimeout(() => {
      checkMaximizedState()
    }, 100)
  }
}

function onClose() {
  if (window.windowControls && typeof window.windowControls.close === 'function') {
    window.windowControls.close()
  }
}
</script>

<template>
  <div class="app-container">
    <div class="titlebar">
      <div class="title">Hexagon</div>
      <div class="title-controls">
        <button class="control-btn" type="button" @click="onMinimize" title="最小化">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button class="control-btn" type="button" @click="onMaximize" :title="isMaximized ? '还原' : '最大化'">
          <svg v-if="!isMaximized" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden>
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden>
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
          </svg>
        </button>
        <button class="control-btn close" type="button" @click="onClose" title="关闭">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
    <div class="content">
      <!-- 登录页面 -->
      <div v-if="isLoginPage" class="login-wrapper">
        <router-view />
      </div>
      
      <!-- 主页面（已登录） -->
      <div v-else-if="isLoggedIn" class="main-layout">
        <nav class="sidebar">
          <router-link to="/select-class" class="nav-item" active-class="active">
            <span class="nav-icon">📚</span>
            <span class="nav-text">开始选课</span>
          </router-link>
          <router-link to="/browse" class="nav-item" active-class="active">
            <span class="nav-icon">🔍</span>
            <span class="nav-text">浏览</span>
          </router-link>
          <router-link to="/settings" class="nav-item" active-class="active">
            <span class="nav-icon">⚙️</span>
            <span class="nav-text">设置</span>
          </router-link>
          <div class="status" :class="statusClass">
            <span class="status-dot"></span>
            <span class="status-text">Status: {{ statusText }}</span>
          </div>
        </nav>
        <main class="main-view">
          <router-view />
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg,
      rgba(236, 246, 255, 0.7) 0%,
      rgba(230, 245, 255, 0.7) 20%,
      rgba(225, 240, 255, 0.7) 40%,
      rgba(220, 238, 255, 0.7) 60%,
      rgba(208, 235, 255, 0.7) 80%,
      rgba(200, 232, 255, 0.7) 100%);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.1);
}

.titlebar {
  height: 36px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  padding: 0 16px;
  -webkit-app-region: drag;
  user-select: none;
  border-bottom: 1px solid rgba(200, 215, 235, 0.2);
  position: relative;
}

.titlebar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 36px;
  background: linear-gradient(90deg,
      rgba(147, 197, 253, 0.05) 0%,
      rgba(186, 230, 253, 0.05) 50%,
      rgba(147, 197, 253, 0.05) 100%);
  pointer-events: none;
}

.title {
  position: relative;
  color: #1e40af;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  opacity: 0.85;
  padding: 4px 0;
  background: linear-gradient(90deg, #1e40af, #3b82f6);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
}

.content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.sidebar {
  width: 200px;
  min-width: 200px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  border-right: 1px solid rgba(200, 215, 235, 0.3);
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: #64748b;
  text-decoration: none;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.nav-item.active {
  background: rgba(59, 130, 246, 0.15);
  color: #1e40af;
  border-left-color: #3b82f6;
  font-weight: 600;
}

.nav-icon {
  font-size: 18px;
}

.nav-text {
  font-size: 14px;
}

.main-view {
  flex: 1;
  min-width: 0;
  overflow: auto;
  background: transparent;
  height: 100%;
}

.login-container {
  width: 100%;
  max-width: 400px;
  padding: 20px;
}

.login-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 8px 0;
}

.login-subtitle {
  color: #64748b;
  font-size: 14px;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.9);
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: rgba(255, 255, 255, 1);
}

.form-input::placeholder {
  color: #94a3b8;
}

.error-message {
  padding: 10px 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  color: #dc2626;
  font-size: 13px;
  text-align: center;
}

.login-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #3b82f6, #1e40af);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  margin-top: 8px;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-controls {
  margin-left: auto;
  display: flex;
  gap: 6px;
  -webkit-app-region: no-drag;
  /* 使控件可点击 */
}

.control-btn {
  background: transparent;
  border: none;
  width: 34px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #0f172a;
  /* neutral dark */
  font-size: 14px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 120ms ease, color 120ms ease;
}

.control-btn:hover {
  background: rgba(15, 23, 42, 0.06);
}

.control-btn svg {
  display: block;
}

.control-btn.close {
  color: #374151;
  /* neutral gray */
}

.control-btn.close:hover {
  background: rgba(55, 65, 81, 0.06);
}

.status {
  margin-top: auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  border-top: 1px solid rgba(200, 215, 235, 0.3);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.status-text {
  font-weight: 500;
}

.status-connected .status-dot {
  background-color: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
}

.status-connected .status-text {
  color: #22c55e;
}

.status-disconnected .status-dot {
  background-color: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
}

.status-disconnected .status-text {
  color: #ef4444;
}

.status-reconnecting .status-dot {
  background-color: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.5);
  animation: pulse 1.5s ease-in-out infinite;
}

.status-reconnecting .status-text {
  color: #f59e0b;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>